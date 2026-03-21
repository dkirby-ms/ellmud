import { useEffect, useCallback, useRef } from 'react';
import { useAppContext, getHpTier, type TerminalMessage } from '../store.js';
import { connect, switchRoom, sendRawCommand } from '../services/connection.js';
import { logout } from '../services/api.js';
import { Terminal } from './Terminal.js';
import { CommandInput } from './CommandInput.js';
import { ShardSidebar } from './ShardSidebar.js';
import { CombatOverlay } from './CombatOverlay.js';
import { ReconnectionOverlay } from './ReconnectionOverlay.js';
import { useReconnection } from '../hooks/useReconnection.js';
import type {
  NarrateMessage,
  RoomHeaderMessage,
  ShardStateMessage,
  CombatResultMessage,
  RoomSwitchMessage,
} from '@ellmud/shared';
import type { Room } from '@colyseus/sdk';

let msgCounter = 0;
function nextMsgId(): string {
  return `msg-${++msgCounter}`;
}

export function GameScreen(): React.JSX.Element {
  const { state, dispatch } = useAppContext();
  const roomRef = useRef<Room | null>(null);
  const switchingRef = useRef(false);
  const soundCueCounterRef = useRef(0);

  const addMessage = useCallback((text: string, type: TerminalMessage['type']) => {
    dispatch({
      type: 'ADD_MESSAGE',
      message: { id: nextMsgId(), text, type, timestamp: Date.now() },
    });
  }, [dispatch]);

  // Build message handlers as a stable reference for room switching
  const handlersRef = useRef<import('../services/connection.js').MessageHandlers | null>(null);

  // Reconnection logic
  const reconnection = useReconnection({
    maxAttempts: 5,
    baseDelayMs: 2000,
    onReconnect: async () => {
      if (!state.token || !handlersRef.current) return false;
      try {
        dispatch({ type: 'SET_CONNECTION_STATUS', status: 'connecting' });
        const room = await connect(state.token, 'refuge', handlersRef.current);
        roomRef.current = room;
        dispatch({ type: 'SET_ROOM', room });
        addMessage('Reconnected to the Refuge.', 'system');
        return true;
      } catch {
        return false;
      }
    },
    onReturnToRefuge: () => {
      roomRef.current?.leave();
      roomRef.current = null;
      dispatch({ type: 'LOGOUT' });
    },
  });

  const reconnectionRef = useRef(reconnection);
  reconnectionRef.current = reconnection;

  useEffect(() => {
    if (!state.token) return;

    let disposed = false;

    const handlers: import('../services/connection.js').MessageHandlers = {
      onNarrate: (msg: NarrateMessage) => {
        if (!disposed) {
          addMessage(msg.text, msg.type);
          if (msg.type === 'sound') {
            dispatch({
              type: 'ADD_SOUND_CUE',
              cue: { id: `sc-${++soundCueCounterRef.current}`, text: msg.text, timestamp: msg.timestamp },
            });
          }
        }
      },
      onRoomHeader: (msg: RoomHeaderMessage) => {
        if (!disposed) {
          dispatch({ type: 'SET_ROOM_HEADER', header: msg });
          addMessage(`\n── ${msg.roomName} ──`, 'header');
          if (msg.exits.length > 0) {
            addMessage(`Exits: ${msg.exits.join(', ')}`, 'header');
          }
        }
      },
      onShardState: (msg: ShardStateMessage) => {
        if (!disposed) {
          dispatch({ type: 'SET_SHARD_STATE', state: msg.state, collapseTimer: msg.collapseTimer });
          addMessage(`[Shard: ${msg.state}${msg.collapseTimer ? ` — ${msg.collapseTimer}s remaining` : ''}]`, 'system');
        }
      },
      onCombatResult: (msg: CombatResultMessage) => {
        if (!disposed) {
          dispatch({ type: 'SET_COMBAT_STATE', inCombat: true });
          dispatch({ type: 'SET_COMBAT_TICK', tick: msg.tick });
          dispatch({ type: 'SET_PENDING_COMBAT_ACTION', action: null });

          for (const r of msg.results) {
            const dmg = r.damage != null ? ` (${r.damage} dmg)` : '';
            addMessage(
              `${r.actorName} → ${r.action}${r.targetName ? ` → ${r.targetName}` : ''}${dmg}`,
              'combat',
            );

            // Update enemy status from combat results (non-player targets)
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
            // Track enemy actors with self-reported HP
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

        // Clear shard state when returning to refuge
        if (msg.target === 'refuge') {
          dispatch({ type: 'SET_SHARD_STATE', state: null as unknown as import('@ellmud/shared').ShardState });
          dispatch({ type: 'SET_COMBAT_STATE', inCombat: false });
        }

        switchRoom(currentRoom, msg.target, state.token, handlers, msg.options)
          .then((newRoom) => {
            if (!disposed) {
              roomRef.current = newRoom;
              dispatch({ type: 'SET_ROOM', room: newRoom });
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
        // Don't show disconnect messages during a room switch
        if (!disposed && !switchingRef.current) {
          dispatch({ type: 'SET_CONNECTION_STATUS', status: 'disconnected' });
          roomRef.current = null;
          if (code >= 4000) {
            addMessage(`Disconnected (code ${code}). You may need to log in again.`, 'system');
          } else {
            addMessage('Connection lost. Attempting to reconnect...', 'system');
            reconnectionRef.current.reportDisconnect();
          }
        }
      },
    };

    handlersRef.current = handlers;
    dispatch({ type: 'SET_CONNECTION_STATUS', status: 'connecting' });

    connect(state.token, 'refuge', handlers).then((room) => {
      if (!disposed) {
        roomRef.current = room;
        dispatch({ type: 'SET_ROOM', room });
        addMessage('Connected to the Refuge.', 'system');
        reconnectionRef.current.reportConnected();
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

  const handleLogout = useCallback(async () => {
    if (state.token) {
      try { await logout(state.token); } catch { /* best effort */ }
    }
    roomRef.current?.leave();
    roomRef.current = null;
    dispatch({ type: 'LOGOUT' });
  }, [state.token, dispatch]);

  const inShard = state.shardState != null;

  return (
    <div className="game-screen">
      <div className="game-header">
        <span className="game-title">⌁ Ellmud</span>
        {state.roomHeader && (
          <span className="room-info">
            {state.roomHeader.roomName}
            {state.shardState && <span className="shard-badge">{state.shardState}</span>}
          </span>
        )}
        <span className={`connection-status status-${state.connectionStatus}`}>
          {state.connectionStatus}
        </span>
        <button className="logout-button" onClick={handleLogout} type="button">
          Logout
        </button>
      </div>

      <div className={`game-body ${inShard ? 'game-body--with-sidebar' : ''}`}>
        <div className="game-main">
          <Terminal messages={state.messages} />
          <CombatOverlay />
        </div>
        {inShard && <ShardSidebar />}
      </div>

      <CommandInput
        onCommand={handleCommand}
        disabled={state.connectionStatus !== 'connected'}
      />

      <ReconnectionOverlay
        state={reconnection.overlayState}
        attempt={reconnection.attempt}
        maxAttempts={5}
        elapsedSeconds={reconnection.elapsedSeconds}
        onReconnect={reconnection.reconnectNow}
        onCancel={reconnection.cancel}
        onReturnToRefuge={reconnection.returnToRefuge}
      />
    </div>
  );
}
