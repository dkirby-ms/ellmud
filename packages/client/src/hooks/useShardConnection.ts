/**
 * useShardConnection — Manages the Colyseus room connection lifecycle for shard exploration.
 *
 * Extracted from the old GameScreen.tsx pattern. Handles:
 * - Connecting to a shard room with auth token
 * - Wiring all message handlers (narrate, room header, shard state, combat, room switch, extraction)
 * - Command dispatch via sendRawCommand
 * - Reconnection via useReconnection hook
 * - Cleanup on unmount
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAppContext, getHpTier, type TerminalMessage } from '../store.js';
import { connect, switchRoom, sendRawCommand, sendCommand } from '../services/connection.js';
import { useReconnection } from './useReconnection.js';
import type {
  NarrateMessage,
  RoomHeaderMessage,
  ShardStateMessage,
  CombatResultMessage,
  RoomSwitchMessage,
  ExtractionMessage,
  CombatAction,
} from '@ellmud/shared';
import type { Room } from '@colyseus/sdk';
import type { MessageHandlers } from '../services/connection.js';

let msgCounter = 0;
function nextMsgId(): string {
  return `msg-${++msgCounter}`;
}

export interface ExtractionState {
  status: 'in-progress' | 'success' | 'death' | null;
  progress: number;
  narration: string | null;
}

export interface UseShardConnectionResult {
  /** Send a raw text command to the server */
  handleCommand: (input: string) => void;
  /** Send a directional movement command */
  handleExitClick: (direction: string) => void;
  /** Send a combat action */
  handleCombatAction: (action: CombatAction) => void;
  /** Send a chat message (proximity say) */
  sendChatMessage: (text: string) => void;
  /** Current extraction state */
  extraction: ExtractionState;
  /** Reconnection state for overlay */
  reconnection: ReturnType<typeof useReconnection>;
}

const INITIAL_EXTRACTION: ExtractionState = { status: null, progress: 0, narration: null };

export function useShardConnection(): UseShardConnectionResult {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const roomRef = useRef<Room | null>(null);
  const switchingRef = useRef(false);
  const soundCueCounterRef = useRef(0);
  const [extraction, setExtraction] = useState<ExtractionState>(INITIAL_EXTRACTION);

  const addMessage = useCallback((text: string, type: TerminalMessage['type'], combatSubtype?: TerminalMessage['combatSubtype']) => {
    dispatch({
      type: 'ADD_MESSAGE',
      message: { id: nextMsgId(), text, type, timestamp: Date.now(), combatSubtype },
    });
  }, [dispatch]);

  const handlersRef = useRef<MessageHandlers | null>(null);
  const extractionHandlerRef = useRef<((msg: ExtractionMessage) => void) | null>(null);

  const reconnection = useReconnection({
    maxAttempts: 5,
    baseDelayMs: 2000,
    onReconnect: async () => {
      if (!state.token || !handlersRef.current) return false;
      try {
        dispatch({ type: 'SET_CONNECTION_STATUS', status: 'connecting' });
        const room = await connect(state.token, 'shard', handlersRef.current);
        roomRef.current = room;
        if (extractionHandlerRef.current) {
          room.onMessage('extraction_state', extractionHandlerRef.current);
        }
        dispatch({ type: 'SET_ROOM', room });
        addMessage('Reconnected to the shard.', 'system');
        return true;
      } catch {
        return false;
      }
    },
    onReturnToRefuge: () => {
      roomRef.current?.leave();
      roomRef.current = null;
      navigate('/refuge');
    },
  });

  const reconnectionRef = useRef(reconnection);
  reconnectionRef.current = reconnection;

  useEffect(() => {
    if (!state.token) return;

    let disposed = false;

    const handlers: MessageHandlers = {
      onNarrate: (msg: NarrateMessage) => {
        if (disposed) return;
        let combatSubtype: TerminalMessage['combatSubtype'];
        if (msg.type === 'combat' && msg.combatEvent) {
          const { eventType, actorId, targetId } = msg.combatEvent;
          if (eventType === 'strike') {
            combatSubtype = actorId === state.playerId ? 'hit_dealt'
              : targetId === state.playerId ? 'hit_taken'
              : 'hit_dealt';
          } else if (eventType === 'dodge') {
            combatSubtype = 'dodge';
          } else if (eventType === 'defeated') {
            combatSubtype = 'defeated';
          } else if (eventType === 'flee') {
            combatSubtype = 'flee';
          } else if (eventType === 'combat_end') {
            combatSubtype = 'combat_end';
          }
        }
        addMessage(msg.text, msg.type, combatSubtype);
        if (msg.type === 'sound') {
          dispatch({
            type: 'ADD_SOUND_CUE',
            cue: { id: `sc-${++soundCueCounterRef.current}`, text: msg.text, timestamp: msg.timestamp },
          });
        }
      },
      onRoomHeader: (msg: RoomHeaderMessage) => {
        if (disposed) return;
        dispatch({ type: 'SET_ROOM_HEADER', header: msg });
        addMessage(`\n── ${msg.roomName} ──`, 'header');
        if (msg.exits.length > 0) {
          addMessage(`Exits: ${msg.exits.join(', ')}`, 'header');
        }
      },
      onShardState: (msg: ShardStateMessage) => {
        if (disposed) return;
        dispatch({ type: 'SET_SHARD_STATE', state: msg.state, collapseTimer: msg.collapseTimer });
        addMessage(`[Shard: ${msg.state}${msg.collapseTimer ? ` — ${msg.collapseTimer}s remaining` : ''}]`, 'system');
      },
      onCombatResult: (msg: CombatResultMessage) => {
        if (disposed) return;
        dispatch({ type: 'SET_COMBAT_STATE', inCombat: true });
        dispatch({ type: 'SET_COMBAT_TICK', tick: msg.tick });
        dispatch({ type: 'SET_PENDING_COMBAT_ACTION', action: null });

        for (const r of msg.results) {
          const dmg = r.damage != null ? ` (${r.damage} dmg)` : '';
          addMessage(
            `${r.actorName} → ${r.action}${r.targetName ? ` → ${r.targetName}` : ''}${dmg}`,
            'combat',
          );

          if (r.targetId && r.targetId !== state.playerId && r.newHp != null && r.maxHp != null) {
            dispatch({
              type: 'SET_ENEMY_STATUS',
              status: {
                name: r.targetName ?? 'Unknown',
                hp: r.newHp,
                maxHp: r.maxHp,
                hpTier: getHpTier(r.newHp, r.maxHp),
                telegraphedAction: null,
              },
            });
          }
          if (r.actorId !== state.playerId && r.newHp != null && r.maxHp != null) {
            dispatch({
              type: 'SET_ENEMY_STATUS',
              status: {
                name: r.actorName,
                hp: r.newHp,
                maxHp: r.maxHp,
                hpTier: getHpTier(r.newHp, r.maxHp),
                telegraphedAction: null,
              },
            });
          }
        }

        if (msg.combatEnded) {
          addMessage('— Combat ended —', 'system');
          dispatch({ type: 'SET_COMBAT_STATE', inCombat: false });
        }
      },
      onRoomSwitch: (msg: RoomSwitchMessage) => {
        if (disposed || switchingRef.current) return;
        switchingRef.current = true;

        const currentRoom = roomRef.current;
        if (!currentRoom || !state.token) {
          switchingRef.current = false;
          return;
        }

        addMessage('The world shifts around you...', 'system');
        dispatch({ type: 'SET_CONNECTION_STATUS', status: 'connecting' });

        if (msg.target === 'refuge') {
          dispatch({ type: 'SET_SHARD_STATE', state: null as unknown as import('@ellmud/shared').ShardState });
          dispatch({ type: 'SET_COMBAT_STATE', inCombat: false });
          setExtraction((prev) => ({
            status: 'success',
            progress: 100,
            narration: prev.narration ?? msg.reason,
          }));
        }

        switchRoom(currentRoom, msg.target, state.token, handlers, msg.options)
          .then((newRoom) => {
            if (!disposed) {
              roomRef.current = newRoom;
              dispatch({ type: 'SET_ROOM', room: newRoom });
              newRoom.onMessage('extraction_state', handleExtraction);
              addMessage(`Connected to ${msg.target === 'refuge' ? 'the Refuge' : 'shard'}.`, 'system');
            } else {
              newRoom.leave();
            }
          })
          .catch((err: Error) => {
            if (!disposed) {
              dispatch({ type: 'SET_CONNECTION_STATUS', status: 'error' });
              addMessage(`Failed to switch rooms: ${err.message}`, 'system');
            }
          })
          .finally(() => {
            switchingRef.current = false;
          });
      },
      onError: (code: number, message: string) => {
        if (!disposed) {
          addMessage(`[Error ${code}: ${message}]`, 'system');
          dispatch({ type: 'SET_ERROR', error: message });
        }
      },
      onLeave: (code: number) => {
        if (!disposed && !switchingRef.current) {
          dispatch({ type: 'SET_CONNECTION_STATUS', status: 'disconnected' });
          roomRef.current = null;
          if (code >= 4000) {
            addMessage(`Disconnected (code ${code}). You may need to log in again.`, 'system');
            setExtraction({ status: 'death', progress: 0, narration: null });
          } else {
            addMessage('Connection lost. Attempting to reconnect...', 'system');
            reconnectionRef.current.reportDisconnect();
          }
        }
      },
    };

    handlersRef.current = handlers;

    // Extraction state handler — co-located with other handler definitions
    const handleExtraction = (msg: ExtractionMessage) => {
      if (disposed) return;
      switch (msg.state) {
        case 'started':
          setExtraction({ status: 'in-progress', progress: 0, narration: msg.narration });
          addMessage(msg.narration, 'system');
          break;
        case 'progress': {
          const progress = msg.totalTicks && msg.ticksRemaining != null
            ? ((msg.totalTicks - msg.ticksRemaining) / msg.totalTicks) * 100
            : 0;
          setExtraction({ status: 'in-progress', progress, narration: msg.narration });
          addMessage(msg.narration, 'system');
          break;
        }
        case 'completed':
          setExtraction({ status: 'success', progress: 100, narration: msg.narration });
          addMessage(msg.narration, 'system');
          if (!switchingRef.current) {
            handlers.onRoomSwitch({
              target: 'refuge',
              reason: 'extraction_complete',
            });
          }
          break;
        case 'interrupted':
          setExtraction(INITIAL_EXTRACTION);
          addMessage(msg.narration, 'system');
          break;
      }
    };
    extractionHandlerRef.current = handleExtraction;

    dispatch({ type: 'SET_CONNECTION_STATUS', status: 'connecting' });

    connect(state.token, 'shard', handlers).then((room) => {
      if (!disposed) {
        roomRef.current = room;
        dispatch({ type: 'SET_ROOM', room });
        addMessage('Connected to the shard.', 'system');
        reconnectionRef.current.reportConnected();
        room.onMessage('extraction_state', handleExtraction);
      } else {
        room.leave();
      }
    }).catch((err: Error) => {
      if (!disposed) {
        dispatch({ type: 'SET_CONNECTION_STATUS', status: 'error' });
        addMessage(`Failed to connect: ${err.message}`, 'system');
      }
    });

    return () => {
      disposed = true;
      roomRef.current?.leave();
      roomRef.current = null;
    };
  }, [state.token, dispatch, addMessage]);

  const handleCommand = useCallback((input: string) => {
    const room = roomRef.current;
    if (!room) {
      addMessage('Not connected to server.', 'system');
      return;
    }
    addMessage(`> ${input}`, 'system');
    sendRawCommand(room, input);
  }, [addMessage]);

  const handleExitClick = useCallback((direction: string) => {
    const room = roomRef.current;
    if (!room) return;
    addMessage(`> go ${direction}`, 'system');
    sendRawCommand(room, `go ${direction}`);
  }, [addMessage]);

  const handleCombatAction = useCallback((action: CombatAction) => {
    const room = roomRef.current;
    if (!room) return;
    addMessage(`> ${action}`, 'system');
    sendCommand(room, action);
    dispatch({ type: 'SET_PENDING_COMBAT_ACTION', action });
  }, [addMessage, dispatch]);

  const sendChatMessage = useCallback((text: string) => {
    const room = roomRef.current;
    if (!room) return;
    sendRawCommand(room, text);
  }, []);

  return {
    handleCommand,
    handleExitClick,
    handleCombatAction,
    sendChatMessage,
    extraction,
    reconnection,
  };
}
