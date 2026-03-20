import { useEffect, useCallback, useRef } from 'react';
import { useAppContext, type TerminalMessage } from '../store.js';
import { connect, sendRawCommand } from '../services/connection.js';
import { logout } from '../services/api.js';
import { Terminal } from './Terminal.js';
import { CommandInput } from './CommandInput.js';
import type {
  NarrateMessage,
  RoomHeaderMessage,
  ShardStateMessage,
  CombatResultMessage,
} from '@ellmud/shared';
import type { Room } from '@colyseus/sdk';

let msgCounter = 0;
function nextMsgId(): string {
  return `msg-${++msgCounter}`;
}

export function GameScreen(): React.JSX.Element {
  const { state, dispatch } = useAppContext();
  const roomRef = useRef<Room | null>(null);

  const addMessage = useCallback((text: string, type: TerminalMessage['type']) => {
    dispatch({
      type: 'ADD_MESSAGE',
      message: { id: nextMsgId(), text, type, timestamp: Date.now() },
    });
  }, [dispatch]);

  useEffect(() => {
    if (!state.token) return;

    let disposed = false;
    dispatch({ type: 'SET_CONNECTION_STATUS', status: 'connecting' });

    connect(state.token, 'refuge', {
      onNarrate: (msg: NarrateMessage) => {
        if (!disposed) addMessage(msg.text, msg.type);
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
          dispatch({ type: 'SET_SHARD_STATE', state: msg.state });
          addMessage(`[Shard: ${msg.state}${msg.collapseTimer ? ` — ${msg.collapseTimer}s remaining` : ''}]`, 'system');
        }
      },
      onCombatResult: (msg: CombatResultMessage) => {
        if (!disposed) {
          for (const r of msg.results) {
            const dmg = r.damage != null ? ` (${r.damage} dmg)` : '';
            addMessage(
              `${r.actorName} → ${r.action}${r.targetName ? ` → ${r.targetName}` : ''}${dmg}`,
              'combat',
            );
          }
          if (msg.combatEnded) {
            addMessage('— Combat ended —', 'system');
          }
        }
      },
      onError: (code: number, message: string) => {
        if (!disposed) {
          addMessage(`[Error ${code}: ${message}]`, 'system');
          dispatch({ type: 'SET_ERROR', error: message });
        }
      },
      onLeave: (code: number) => {
        if (!disposed) {
          dispatch({ type: 'SET_CONNECTION_STATUS', status: 'disconnected' });
          roomRef.current = null;
          if (code >= 4000) {
            addMessage(`Disconnected (code ${code}). You may need to log in again.`, 'system');
          } else {
            addMessage('Connection lost. Attempting to reconnect...', 'system');
          }
        }
      },
    }).then((room) => {
      if (!disposed) {
        roomRef.current = room;
        dispatch({ type: 'SET_ROOM', room });
        addMessage('Connected to the Refuge.', 'system');
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

      <Terminal messages={state.messages} />

      <CommandInput
        onCommand={handleCommand}
        disabled={state.connectionStatus !== 'connected'}
      />
    </div>
  );
}
