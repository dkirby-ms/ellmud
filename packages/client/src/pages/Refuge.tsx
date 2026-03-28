import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router";
import {
  Shield,
  Hammer,
  ShoppingCart,
  Users,
  FileText,
  Map,
  Settings,
  Send,
  Wrench,
} from "lucide-react";
import { useAppContext, type TerminalMessage } from "../store";
import CompassControl from "../components/CompassControl";
import { connect, sendRawCommand } from "../services/connection";
import { useReconnection } from "../hooks/useReconnection";
import { useAutoScroll } from "../hooks/useAutoScroll";
import { ReconnectionOverlay } from "../components/ReconnectionOverlay";
import { logout } from "../services/api";
import ShardboardTab from "../components/ShardboardTab";
import CombinedStashLoadout from "../components/CombinedStashLoadout";
import type {
  NarrateMessage,
  RoomHeaderMessage,
  ShardStateMessage,
  CombatResultMessage,
  RoomSwitchMessage,
  LoadoutUpdateMessage,
  StashUpdateMessage,
} from "@ellmud/shared";
import type { Room } from "@colyseus/sdk";
import type { MessageHandlers } from "../services/connection";

type TabType =
  | "equipment"
  | "crafting"
  | "marketplace"
  | "factions"
  | "contracts"
  | "shardboard";

const tabs: { id: TabType; icon: React.ReactNode; label: string }[] = [
  { id: "equipment", icon: <Shield className="w-5 h-5" />, label: "Equipment" },
  { id: "crafting", icon: <Hammer className="w-5 h-5" />, label: "Crafting" },
  {
    id: "marketplace",
    icon: <ShoppingCart className="w-5 h-5" />,
    label: "Marketplace",
  },
  { id: "factions", icon: <Users className="w-5 h-5" />, label: "Factions" },
  {
    id: "contracts",
    icon: <FileText className="w-5 h-5" />,
    label: "Contracts",
  },
  { id: "shardboard", icon: <Map className="w-5 h-5" />, label: "Shardboard" },
];

let msgCounter = 0;
function nextMsgId(): string {
  return `refuge-msg-${++msgCounter}`;
}

export default function Refuge() {
  const { state, dispatch } = useAppContext();
  const [activeTab, setActiveTab] = useState<TabType>("shardboard");
  const [chatMessage, setChatMessage] = useState("");
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const roomRef = useRef<Room | null>(null);
  const switchingRef = useRef(false);
  const handlersRef = useRef<MessageHandlers | null>(null);
  const { containerRef: chatScrollRef, bottomRef: chatBottomRef } = useAutoScroll(state.messages);

  const addMessage = useCallback(
    (text: string, type: TerminalMessage["type"]) => {
      dispatch({
        type: "ADD_MESSAGE",
        message: { id: nextMsgId(), text, type, timestamp: Date.now() },
      });
    },
    [dispatch],
  );

  // Reconnection logic
  const reconnection = useReconnection({
    maxAttempts: 5,
    baseDelayMs: 2000,
    onReconnect: async () => {
      if (!state.token || !handlersRef.current) return false;
      try {
        dispatch({ type: "SET_CONNECTION_STATUS", status: "connecting" });
        const room = await connect(
          state.token,
          "zone:the-refuge",
          handlersRef.current,
          state.activeCharacter?.id,
        );
        roomRef.current = room;
        dispatch({ type: "SET_ROOM", room });
        addMessage("Reconnected to the Refuge.", "system");
        return true;
      } catch {
        return false;
      }
    },
    onReturnToRefuge: () => {
      roomRef.current?.leave();
      roomRef.current = null;
      dispatch({ type: "LOGOUT" });
    },
  });

  const reconnectionRef = useRef(reconnection);
  reconnectionRef.current = reconnection;

  // Connect to refuge room on mount
  useEffect(() => {
    if (!state.token) return;

    let disposed = false;

    const handlers: MessageHandlers = {
      onNarrate: (msg: NarrateMessage) => {
        if (!disposed) {
          addMessage(msg.text, msg.type);
        }
      },
      onRoomHeader: (msg: RoomHeaderMessage) => {
        if (!disposed) {
          dispatch({ type: "SET_ROOM_HEADER", header: msg });
        }
      },
      onShardState: (msg: ShardStateMessage) => {
        if (!disposed) {
          dispatch({
            type: "SET_SHARD_STATE",
            state: msg.state,
            collapseTimer: msg.collapseTimer,
          });
        }
      },
      onCombatResult: (msg: CombatResultMessage) => {
        if (!disposed) {
          for (const r of msg.results) {
            addMessage(`${r.actorName} → ${r.action}`, "combat");
          }
        }
      },
      onRoomSwitch: (msg: RoomSwitchMessage) => {
        if (disposed || switchingRef.current) return;
        switchingRef.current = true;

        addMessage("The world shifts around you...", "system");

        // Clear stale messages so the target page starts fresh
        dispatch({ type: "CLEAR_MESSAGES" });

        // Leave refuge room — the target page will establish its own connection
        roomRef.current?.leave();
        roomRef.current = null;
        dispatch({ type: "SET_CONNECTION_STATUS", status: "disconnected" });

        if (msg.target === "shard") {
          navigateRef.current("/shard/live", {
            state: { fromRefuge: true, options: msg.options },
          });
        }

        switchingRef.current = false;
      },
      onLoadoutUpdate: (msg: LoadoutUpdateMessage) => {
        if (!disposed) {
          dispatch({ type: "SET_LOADOUT", slots: msg.slots });
        }
      },
      onStashUpdate: (msg: StashUpdateMessage) => {
        if (!disposed) {
          dispatch({ type: "SET_STASH_ITEMS", items: msg.items });
        }
      },
      onError: (code: number, message: string) => {
        if (!disposed) {
          addMessage(`[Error ${code}: ${message}]`, "system");
          dispatch({ type: "SET_ERROR", error: message });
        }
      },
      onLeave: (code: number) => {
        if (!disposed && !switchingRef.current) {
          dispatch({ type: "SET_CONNECTION_STATUS", status: "disconnected" });
          roomRef.current = null;
          if (code >= 4000) {
            addMessage(
              `Disconnected (code ${code}). You may need to log in again.`,
              "system",
            );
          } else {
            addMessage(
              "Connection lost. Attempting to reconnect...",
              "system",
            );
            reconnectionRef.current.reportDisconnect();
          }
        }
      },
    };

    handlersRef.current = handlers;
    dispatch({ type: "SET_CONNECTION_STATUS", status: "connecting" });

    connect(state.token, "zone:the-refuge", handlers, state.activeCharacter?.id)
      .then((room) => {
        if (!disposed) {
          roomRef.current = room;
          dispatch({ type: "SET_ROOM", room });
          reconnectionRef.current.reportConnected();
        } else {
          room.leave();
        }
      })
      .catch((err: Error) => {
        if (!disposed) {
          dispatch({ type: "SET_CONNECTION_STATUS", status: "error" });
          addMessage(`Failed to connect: ${err.message}`, "system");
        }
      });

    return () => {
      disposed = true;
      if (roomRef.current) {
        roomRef.current.leave();
        roomRef.current = null;
      }
    };
  }, [state.token, dispatch, addMessage]);

  // Send chat message as command
  const handleSendMessage = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!chatMessage.trim() || !roomRef.current) return;
      sendRawCommand(roomRef.current, chatMessage);
      setChatMessage("");
    },
    [chatMessage],
  );

  // Enter shard via server command
  const handleEnterShard = useCallback(() => {
    if (!roomRef.current) return;
    sendRawCommand(roomRef.current, "enter shard");
  }, []);

  const handleLogout = useCallback(async () => {
    if (state.token) {
      try {
        await logout(state.token);
      } catch {
        /* best effort */
      }
    }
    roomRef.current?.leave();
    roomRef.current = null;
    dispatch({ type: "LOGOUT" });
  }, [state.token, dispatch]);

  const handleNavigate = useCallback(
    (direction: string) => {
      if (!roomRef.current) return;
      addMessage(`> go ${direction}`, "system");
      sendRawCommand(roomRef.current, `go ${direction}`);
    },
    [addMessage],
  );

  // Derive display data from real state
  const locationName = state.roomHeader?.roomName ?? "The Refuge";
  const isConnected = state.connectionStatus === "connected";

  // Ambient events: 'sound' and 'room' type messages
  const ambientEvents = state.messages
    .filter((m) => m.type === "sound" || m.type === "room")
    .slice(-8);

  // Chat messages: all messages for the feed
  const chatMessages = state.messages.slice(-100);

  // Connection status indicator color
  const statusColor =
    state.connectionStatus === "connected"
      ? "var(--color-success)"
      : state.connectionStatus === "connecting"
        ? "var(--color-warning)"
        : "var(--color-danger)";

  return (
    <div className="h-screen bg-bg-primary flex flex-col">
      {/* Top bar */}
      <div className="bg-bg-panel border-b border-border-muted px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1
            className="text-accent-gold tracking-wider font-serif"
            style={{ fontSize: "1.25rem" }}
          >
            ELLMUD
          </h1>
          <div className="flex items-center gap-2">
            <span className="text-text-secondary text-sm font-sans">
              {state.playerId ?? "Unknown"}
            </span>
            <span className="text-text-disabled">|</span>
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: statusColor }}
                title={state.connectionStatus}
              />
              <span
                className="text-text-secondary text-xs font-mono"
              >
                {state.connectionStatus === "connected"
                  ? "Online"
                  : state.connectionStatus === "connecting"
                    ? "Connecting..."
                    : "Offline"}
              </span>
            </div>
            <span className="text-text-disabled">|</span>
            <span className="text-text-secondary text-sm font-sans">
              {locationName}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/admin"
            className="text-text-secondary hover:text-accent-gold transition-colors"
            title="Admin Panel"
          >
            <Wrench className="w-5 h-5" />
          </Link>
          <button
            onClick={() => navigate("/settings")}
            className="text-text-secondary hover:text-accent-gold transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={handleLogout}
            className="text-text-secondary hover:text-danger transition-colors text-sm font-sans"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left column - Navigation */}
        <div className="w-[25%] bg-bg-panel border-r border-border-muted flex flex-col">
          <div className="p-4 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded transition-colors ${
                  activeTab === tab.id
                    ? "bg-bg-elevated text-accent-gold"
                    : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
                } font-sans`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Compass navigation */}
          <CompassControl onNavigate={handleNavigate} />

          {/* Ambient Events — real server narrate messages */}
          <div className="flex-1 p-4 overflow-y-auto">
            <h3
              className="text-text-secondary text-sm mb-3 font-sans"
            >
              Ambient Events
            </h3>
            <div className="space-y-1 narrative-terminal rounded" style={{ padding: '0.5rem' }}>
              {ambientEvents.length === 0 ? (
                <p className="mud-sound">
                  The Refuge hums with quiet activity...
                </p>
              ) : (
                ambientEvents.map((event) => (
                  <p
                    key={event.id}
                    className="mud-sound"
                  >
                    {event.text}
                  </p>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Center column - Content */}
        <div className="flex-1 bg-bg-primary overflow-y-auto">
          {activeTab === "shardboard" && (
            <ShardboardTab onEnterShard={handleEnterShard} />
          )}
          {activeTab === "equipment" && (
            <CombinedStashLoadout room={roomRef.current} />
          )}
          {activeTab === "crafting" && (
            <div className="p-8">
              <h2
                className="text-accent-gold mb-4 font-serif"
                style={{ fontSize: "1.5rem" }}
              >
                Crafting
              </h2>
              <p className="text-text-secondary font-sans">
                Crafting system coming soon...
              </p>
            </div>
          )}
          {activeTab === "marketplace" && (
            <div className="p-8">
              <h2
                className="text-accent-gold mb-4 font-serif"
                style={{ fontSize: "1.5rem" }}
              >
                Marketplace
              </h2>
              <p className="text-text-secondary font-sans">
                Marketplace coming soon...
              </p>
            </div>
          )}
          {activeTab === "factions" && (
            <div className="p-8">
              <h2
                className="text-accent-gold mb-4 font-serif"
                style={{ fontSize: "1.5rem" }}
              >
                Factions
              </h2>
              <p className="text-text-secondary font-sans">
                Faction details coming soon...
              </p>
            </div>
          )}
          {activeTab === "contracts" && (
            <div className="p-8">
              <h2
                className="text-accent-gold mb-4 font-serif"
                style={{ fontSize: "1.5rem" }}
              >
                Contracts
              </h2>
              <p className="text-text-secondary font-sans">
                Contracts coming soon...
              </p>
            </div>
          )}
        </div>

        {/* Right column - Social & Chat */}
        <div className="w-[25%] bg-bg-panel border-l border-border-muted flex flex-col">
          <div className="p-4 border-b border-border-muted">
            <h3
              className="text-text-secondary text-sm mb-3 font-sans"
            >
              Players Nearby
            </h3>
            <div className="space-y-2">
              {isConnected ? (
                <p className="text-text-disabled text-xs font-sans">
                  Player presence updates coming soon...
                </p>
              ) : (
                <p className="text-text-disabled text-xs font-sans">
                  Not connected
                </p>
              )}
            </div>
          </div>

          {/* Chat — real WebSocket messages */}
          <div className="flex-1 flex flex-col min-h-0">
            <div ref={chatScrollRef} className="flex-1 p-4 overflow-y-auto space-y-1 narrative-scroll narrative-terminal">
              {chatMessages.length === 0 && (
                <p className="mud-system">
                  {isConnected
                    ? "Connected. Type a command below."
                    : "Connecting to the Refuge..."}
                </p>
              )}
              {chatMessages.map((msg) => (
                <div key={msg.id}>
                  {msg.type === "system" || msg.type === "header" ? (
                    <p className="mud-system">
                      {msg.text}
                    </p>
                  ) : msg.type === "speech" ? (
                    <p className="mud-speech">
                      &ldquo;{msg.text}&rdquo;
                    </p>
                  ) : msg.type === "combat" ? (
                    <p className="mud-damage">
                      ⚔ {msg.text}
                    </p>
                  ) : (
                    <p className="mud-room-desc">
                      {msg.text}
                    </p>
                  )}
                </div>
              ))}
              <div ref={chatBottomRef} aria-hidden="true" />
            </div>

            <form
              onSubmit={handleSendMessage}
              className="p-4 border-t border-border-muted"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder={
                    isConnected ? "Type a command..." : "Connecting..."
                  }
                  disabled={!isConnected}
                  className="flex-1 bg-bg-elevated border border-border-muted rounded px-3 py-2 text-text-primary text-sm focus:border-interactive focus:outline-none transition-colors placeholder:text-text-disabled disabled:opacity-50 font-mono"
                />
                <button
                  type="submit"
                  disabled={!isConnected}
                  className="text-text-secondary hover:text-accent-gold transition-colors disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Reconnection overlay */}
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
