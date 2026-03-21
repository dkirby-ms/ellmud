import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  Eye,
  Volume2,
  Sword,
  ArrowLeft,
} from "lucide-react";
import InventoryOverlay from "../components/InventoryOverlay";
import ExtractionOverlay from "../components/ExtractionOverlay";
import ChatPanel from "../components/ChatPanel";
import { ReconnectionOverlay } from "../components/ReconnectionOverlay";
import { useAppContext } from "../store.js";
import { useShardConnection } from "../hooks/useShardConnection.js";
import { useCountdown } from "../hooks/useCountdown.js";
import type { CombatAction } from "@ellmud/shared";

export default function ShardExploration() {
  const navigate = useNavigate();
  const { state } = useAppContext();
  const {
    handleCommand: sendCommand,
    handleExitClick,
    handleCombatAction: sendCombatAction,
    sendChatMessage,
    extraction,
    reconnection,
  } = useShardConnection();

  const [command, setCommand] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const narrativeRef = useRef<HTMLDivElement>(null);

  // Derive collapse timer from server state, with client-side countdown
  const collapseTime = useCountdown(state.collapseTimer ?? 0);
  const collapseTimerMax = state.collapseTimerMax ?? 900;

  // Derive room info from server state
  const currentRoom = state.roomHeader?.roomName ?? "Connecting...";
  const exits = state.roomHeader?.exits ?? [];

  // Auto-scroll narrative on new messages
  useEffect(() => {
    if (narrativeRef.current) {
      narrativeRef.current.scrollTop = narrativeRef.current.scrollHeight;
    }
  }, [state.messages]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getCollapseColor = () => {
    if (collapseTimerMax <= 0) return "#E8E0D0";
    const percentage = (collapseTime / collapseTimerMax) * 100;
    if (percentage > 50) return "#E8E0D0";
    if (percentage > 25) return "#B8860B";
    return "#8B2500";
  };

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!command.trim()) return;

      setCommandHistory((prev) => [...prev, command]);
      setHistoryIndex(-1);
      sendCommand(command);
      setCommand("");
    },
    [command, sendCommand]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex =
          historyIndex === -1
            ? commandHistory.length - 1
            : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCommand(commandHistory[newIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setCommand("");
        } else {
          setHistoryIndex(newIndex);
          setCommand(commandHistory[newIndex]);
        }
      }
    }
  };

  const handleCombatAction = (action: string) => {
    const actionMap: Record<string, CombatAction> = {
      strike: "strike",
      "heavy strike": "heavy_strike",
      dodge: "dodge",
      block: "block",
      "use item": "use_item",
      flee: "flee",
      observe: "observe",
    };
    const mapped = actionMap[action.toLowerCase()];
    if (mapped) {
      sendCombatAction(mapped);
    }
  };

  // Map connection status for display
  const connectionIndicator = () => {
    switch (state.connectionStatus) {
      case "connected":
        return (
          <span className="text-[#2D6B4F] text-xs" style={{ fontFamily: "var(--font-mono)" }}>
            ● Connected
          </span>
        );
      case "connecting":
        return (
          <span className="text-[#B8860B] text-xs" style={{ fontFamily: "var(--font-mono)" }}>
            ○ Connecting...
          </span>
        );
      default:
        return (
          <span className="text-[#8B2500] text-xs" style={{ fontFamily: "var(--font-mono)" }}>
            ● Disconnected
          </span>
        );
    }
  };

  // Enemy status derived from real combat data
  const enemyStatus = state.enemyStatus;

  return (
    <div className="h-screen bg-[#0A0B0F] flex flex-col">
      {/* Top bar */}
      <div className="bg-[#12131A] border-b border-[#2A2B35] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/refuge")}
            className="text-[#8A8B95] hover:text-[#C9A84C] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span
            className="text-[#8A8B95] text-sm"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            {state.playerId ?? "Unknown"}
          </span>
          <span className="text-[#4A4B55]">|</span>
          <div className="flex items-center gap-2">
            <div className="w-20 h-2 bg-[#1C1D27] rounded-full overflow-hidden">
              <div className="h-full w-[75%] bg-gradient-to-r from-[#2D6B4F] to-[#8B2500]"></div>
            </div>
            <span
              className="text-[#8A8B95] text-xs"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Healthy
            </span>
          </div>
          {connectionIndicator()}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Narrative Panel (70%) */}
        <div className="w-[70%] flex flex-col bg-[#0A0B0F]">
          {/* Room header */}
          <div className="bg-[#12131A] border-b border-[#2A2B35] px-6 py-3 flex items-center justify-between">
            <h2
              className="text-[#C9A84C]"
              style={{ fontFamily: "var(--font-serif)", fontSize: "1.125rem" }}
            >
              {currentRoom}
            </h2>
            <div className="flex items-center gap-2">
              <span
                className="text-[#8A8B95] text-xs"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Shard Stability
              </span>
              <div className="w-32 h-1.5 bg-[#1C1D27] rounded-full overflow-hidden">
                <div
                  className="h-full transition-all"
                  style={{
                    width: collapseTimerMax > 0 ? `${(collapseTime / collapseTimerMax) * 100}%` : "100%",
                    backgroundColor: getCollapseColor(),
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* Narrative text — render from real AppContext messages */}
          <div
            ref={narrativeRef}
            className="flex-1 overflow-y-auto px-8 py-6 space-y-6"
          >
            {state.messages.map((msg) => (
              <div key={msg.id}>
                {msg.type === "header" && (
                  <div>
                    <h3
                      className="text-[#C9A84C] mb-3"
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: "1.25rem",
                      }}
                    >
                      {msg.text}
                    </h3>
                    <div className="h-px bg-[#C9A84C] opacity-20 mt-4"></div>
                  </div>
                )}

                {msg.type === "room" && (
                  <div>
                    <p
                      className="text-[#E8E0D0] mb-3 max-w-[70ch]"
                      style={{
                        fontFamily: "var(--font-serif)",
                        lineHeight: 1.7,
                        fontSize: "1rem",
                      }}
                    >
                      {msg.text}
                    </p>
                    {exits.length > 0 && (
                      <p
                        className="text-[#3A7D7B] text-sm"
                        style={{ fontFamily: "var(--font-sans)" }}
                      >
                        Exits:{" "}
                        {exits.map((exit, j) => (
                          <span key={j}>
                            <button
                              onClick={() => handleExitClick(exit)}
                              className="hover:text-[#C9A84C] transition-colors underline"
                            >
                              [{exit}]
                            </button>
                            {j < exits.length - 1 && " "}
                          </span>
                        ))}
                      </p>
                    )}
                    <div className="h-px bg-[#C9A84C] opacity-20 mt-4"></div>
                  </div>
                )}

                {msg.type === "combat" && (
                  <p
                    className="text-[#E8E0D0] max-w-[70ch]"
                    style={{
                      fontFamily: "var(--font-serif)",
                      lineHeight: 1.7,
                      fontSize: "1rem",
                    }}
                  >
                    {msg.text}
                  </p>
                )}

                {msg.type === "trace" && (
                  <p
                    className="text-[#8A8B95] italic pl-6 max-w-[70ch] flex items-start gap-2"
                    style={{
                      fontFamily: "var(--font-serif)",
                      lineHeight: 1.7,
                      fontSize: "0.95rem",
                    }}
                  >
                    <Eye className="w-4 h-4 mt-1 flex-shrink-0" />
                    <span>{msg.text}</span>
                  </p>
                )}

                {msg.type === "sound" && (
                  <p
                    className="text-[#8A8B95] italic pl-6 max-w-[70ch] flex items-start gap-2"
                    style={{
                      fontFamily: "var(--font-serif)",
                      lineHeight: 1.7,
                      fontSize: "0.95rem",
                    }}
                  >
                    <Volume2 className="w-4 h-4 mt-1 flex-shrink-0" />
                    <span>{msg.text}</span>
                  </p>
                )}

                {msg.type === "system" && (
                  <p
                    className="text-[#4A4B55] text-sm"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {msg.text}
                  </p>
                )}

                {msg.type === "speech" && (
                  <p
                    className="text-[#E8E0D0] max-w-[70ch]"
                    style={{
                      fontFamily: "var(--font-serif)",
                      lineHeight: 1.7,
                      fontSize: "1rem",
                    }}
                  >
                    "{msg.text}"
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar (30%) */}
        <div className="w-[30%] bg-[#12131A] border-l border-[#2A2B35] flex flex-col">
          {/* Character Status */}
          <div className="p-4 border-b border-[#2A2B35]">
            <h3
              className="text-[#8A8B95] text-xs mb-3"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              STATUS
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span
                    className="text-[#4A4B55] text-xs"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Health
                  </span>
                  <span
                    className="text-[#2D6B4F] text-xs"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    Healthy
                  </span>
                </div>
                <div className="h-2 bg-[#1C1D27] rounded-full overflow-hidden">
                  <div className="h-full w-[75%] bg-gradient-to-r from-[#2D6B4F] to-[#8B2500]"></div>
                </div>
              </div>

              <div>
                <span
                  className="text-[#4A4B55] text-xs"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Stance
                </span>
                <p
                  className="text-[#E8E0D0] text-sm"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {state.pendingCombatAction ?? "Cautious"}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Inventory */}
          <div className="p-4 border-b border-[#2A2B35]">
            <h3
              className="text-[#8A8B95] text-xs mb-3"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              QUICK INVENTORY
            </h3>
            <div className="space-y-2 text-sm">
              {state.inventory.length > 0 ? (
                state.inventory.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <Sword className="w-4 h-4 text-[#8A8B95]" />
                    <span
                      className="text-[#E8E0D0]"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      {item.name}
                    </span>
                  </div>
                ))
              ) : (
                <p
                  className="text-[#4A4B55] text-xs"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  No items carried
                </p>
              )}
            </div>
          </div>

          {/* Enemy Status (during combat) */}
          {enemyStatus && (
            <div className="p-4 border-b border-[#2A2B35]">
              <h3
                className="text-[#8B2500] text-xs mb-3"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                ENEMY
              </h3>
              <div className="space-y-2">
                <p
                  className="text-[#E8E0D0] text-sm"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {enemyStatus.name}
                </p>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span
                      className="text-[#4A4B55] text-xs"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Health
                    </span>
                    <span
                      className="text-xs"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color:
                          enemyStatus.hpTier === "Near Death"
                            ? "#8B2500"
                            : enemyStatus.hpTier === "Badly Wounded"
                            ? "#B8860B"
                            : enemyStatus.hpTier === "Wounded"
                            ? "#B8860B"
                            : "#2D6B4F",
                      }}
                    >
                      {enemyStatus.hpTier}
                    </span>
                  </div>
                  <div className="h-2 bg-[#1C1D27] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#8B2500] to-[#2D6B4F] transition-all"
                      style={{
                        width: enemyStatus.maxHp > 0
                          ? `${(enemyStatus.hp / enemyStatus.maxHp) * 100}%`
                          : "0%",
                      }}
                    ></div>
                  </div>
                </div>
                {enemyStatus.telegraphedAction && (
                  <p
                    className="text-[#B8860B] text-xs italic"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    Telegraphing: {enemyStatus.telegraphedAction}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Collapse Timer */}
          <div className="p-4 border-b border-[#2A2B35]">
            <h3
              className="text-[#8A8B95] text-xs mb-2"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              COLLAPSE TIMER
            </h3>
            <div
              className="text-3xl font-bold"
              style={{
                fontFamily: "var(--font-mono)",
                color: getCollapseColor(),
              }}
            >
              {state.collapseTimer != null ? formatTime(collapseTime) : "--:--"}
            </div>
            {state.shardState === "destabilising" && (
              <p
                className="text-[#8B2500] text-xs mt-2"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Destabilising
              </p>
            )}
            {state.shardState && (
              <p
                className="text-[#4A4B55] text-xs mt-1"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                Shard: {state.shardState}
              </p>
            )}
          </div>

          {/* Sound Cues */}
          <div className="p-4 border-b border-[#2A2B35]">
            <h3
              className="text-[#8A8B95] text-xs mb-3"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              SOUND CUES
            </h3>
            <div className="space-y-2">
              {state.soundCues.length > 0 ? (
                state.soundCues.slice(-5).map((cue) => (
                  <p
                    key={cue.id}
                    className="text-[#8A8B95] text-xs italic"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    {cue.text}
                  </p>
                ))
              ) : (
                <p
                  className="text-[#4A4B55] text-xs"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Silence.
                </p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="p-4">
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => sendCommand("look")}
                className="px-2 py-1 text-[#8A8B95] hover:bg-[#1C1D27] hover:text-[#E8E0D0] rounded text-xs transition-colors"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Look
              </button>
              <button
                onClick={() => sendCommand("listen")}
                className="px-2 py-1 text-[#8A8B95] hover:bg-[#1C1D27] hover:text-[#E8E0D0] rounded text-xs transition-colors"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Listen
              </button>
              <button
                onClick={() => setInventoryOpen(true)}
                className="px-2 py-1 text-[#8A8B95] hover:bg-[#1C1D27] hover:text-[#E8E0D0] rounded text-xs transition-colors"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Inventory
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Combat Action Bar */}
      {state.inCombat && (
        <div className="bg-[#1C1D27] border-t-2 border-[#8B2500] px-6 py-3">
          <div className="flex items-center justify-center gap-2">
            <span
              className="text-[#8B2500] text-sm mr-4"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              ⚔ COMBAT — Tick {state.combatTick}
            </span>
            {[
              "Strike",
              "Heavy Strike",
              "Dodge",
              "Block",
              "Use Item",
              "Flee",
              "Observe",
            ].map((action, i) => (
              <button
                key={action}
                onClick={() => handleCombatAction(action)}
                disabled={state.pendingCombatAction != null}
                className={`px-3 py-1 bg-[#12131A] hover:bg-[#C9A84C] hover:text-[#0A0B0F] text-[#E8E0D0] rounded text-sm transition-colors border border-[#2A2B35] ${
                  state.pendingCombatAction != null ? "opacity-50 cursor-not-allowed" : ""
                }`}
                style={{ fontFamily: "var(--font-sans)" }}
              >
                <span className="text-[#8A8B95] mr-1 text-xs">{i + 1}</span>
                {action}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Command Input */}
      <div className="bg-[#12131A] border-t border-[#2A2B35] px-6 py-4">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <span
            className="text-[#C9A84C] text-lg"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            &gt;
          </span>
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              state.connectionStatus === "connected"
                ? "Type a command..."
                : "Connecting to shard..."
            }
            disabled={state.connectionStatus !== "connected"}
            className="flex-1 bg-transparent text-[#E8E0D0] placeholder-[#4A4B55] focus:outline-none disabled:opacity-50"
            style={{ fontFamily: "var(--font-mono)", fontSize: "1rem" }}
            autoFocus
          />
        </form>
      </div>

      {/* Inventory Overlay */}
      <InventoryOverlay
        isOpen={inventoryOpen}
        onClose={() => setInventoryOpen(false)}
      />

      {/* Extraction Overlay */}
      <ExtractionOverlay
        state={extraction.status}
        progress={extraction.progress}
      />

      {/* Chat Panel */}
      <ChatPanel
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        context="shard"
        onSendMessage={sendChatMessage}
      />

      {/* Reconnection Overlay */}
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
