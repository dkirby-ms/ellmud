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
    if (collapseTimerMax <= 0) return "var(--color-text-primary)";
    const percentage = (collapseTime / collapseTimerMax) * 100;
    if (percentage > 50) return "var(--color-text-primary)";
    if (percentage > 25) return "var(--color-warning)";
    return "var(--color-danger)";
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

  const combatActions: { label: string; action: CombatAction }[] = [
    { label: "Strike", action: "strike" },
    { label: "Heavy Strike", action: "heavy_strike" },
    { label: "Dodge", action: "dodge" },
    { label: "Block", action: "block" },
    { label: "Use Item", action: "use_item" },
    { label: "Skill", action: "skill" },
    { label: "Flee", action: "flee" },
    { label: "Observe", action: "observe" },
  ];

  const handleCombatAction = (action: CombatAction) => {
    sendCombatAction(action);
  };

  // Map connection status for display
  const connectionIndicator = () => {
    switch (state.connectionStatus) {
      case "connected":
        return (
          <span className="text-success text-xs font-mono">
            ● Connected
          </span>
        );
      case "connecting":
        return (
          <span className="text-warning text-xs font-mono">
            ○ Connecting...
          </span>
        );
      default:
        return (
          <span className="text-danger text-xs font-mono">
            ● Disconnected
          </span>
        );
    }
  };

  // Enemy status derived from real combat data
  const enemyStatus = state.enemyStatus;

  // ─── HP State Helpers ──────────────────────────────────────────────────
  const hpPercent = state.playerMaxHp > 0 ? state.playerHp / state.playerMaxHp : 0;
  const healthState = hpPercent > 0.6
    ? { label: 'Healthy', color: 'text-success', barColor: 'bg-success', pulse: false }
    : hpPercent >= 0.25
    ? { label: 'Wounded', color: 'text-warning', barColor: 'bg-warning', pulse: false }
    : { label: 'Critical', color: 'text-danger', barColor: 'bg-danger', pulse: true };

  // ─── Stability ─────────────────────────────────────────────────────────
  const stability = state.roomHeader?.stability ?? 1;

  // ─── Sound Cue Direction Highlighting ──────────────────────────────────
  const DIRECTIONS = ['north', 'south', 'east', 'west', 'above', 'below'];
  const highlightDirections = (text: string) => {
    const directionRegex = /\b(north|south|east|west|above|below)\b/gi;
    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    let match;
    while ((match = directionRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      parts.push(<span key={match.index} className="text-interactive">{match[0]}</span>);
      lastIndex = directionRegex.lastIndex;
    }
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    return parts.length > 0 ? parts : [text];
  };

  // ─── Auto-complete ─────────────────────────────────────────────────────
  const KNOWN_COMMANDS = [
    'strike', 'heavy strike', 'dodge', 'block', 'use item', 'skill', 'flee', 'observe',
    'look', 'listen', 'go', 'inventory', 'help', 'say', 'shout', 'whisper', 'extract',
  ];
  const autoCompleteHint = command.trim()
    ? KNOWN_COMMANDS.find(cmd => cmd.startsWith(command.trim().toLowerCase())) ?? null
    : null;

  return (
    <div className="h-screen bg-bg-primary flex flex-col">
      {/* Top bar */}
      <div className="bg-bg-panel border-b border-border-muted px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/refuge")}
            className="text-text-secondary hover:text-accent-gold transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-text-secondary text-sm font-sans">
            {state.playerId ?? "Unknown"}
          </span>
          <span className="text-text-disabled">|</span>
          <div className="flex items-center gap-2">
            <div className="w-20 h-2 bg-bg-elevated rounded-full overflow-hidden">
              <div
                className={`h-full ${healthState.barColor}`}
                style={{ width: `${hpPercent * 100}%` }}
              ></div>
            </div>
            <span className={`${healthState.color} text-xs font-mono`}>
              {Math.round(hpPercent * 100)}%
            </span>
          </div>
          {connectionIndicator()}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Narrative Panel (70%) */}
        <div className="w-[70%] flex flex-col bg-bg-primary">
          {/* Room header */}
          <div className="bg-bg-panel border-b border-border-muted px-6 py-3 flex items-center justify-between">
            <h2
              className="text-accent-gold font-serif"
              style={{ fontSize: "1.125rem" }}
            >
              {currentRoom}
            </h2>
            <div className="flex items-center gap-2 flex-1">
              <span className="text-text-secondary text-xs font-sans">
                Shard Stability
              </span>
              <div className="flex-1 h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${stability * 100}%`,
                    backgroundColor: stability > 0.5 ? 'var(--color-text-primary)' : stability > 0.25 ? 'var(--color-warning)' : 'var(--color-danger)',
                  }}
                ></div>
              </div>
              {stability < 0.25 && (
                <span className="text-danger animate-pulse text-xs font-bold font-sans whitespace-nowrap">
                  COLLAPSE IMMINENT
                </span>
              )}
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
                      className="text-accent-gold mb-3 font-serif"
                      style={{ fontSize: "1.25rem" }}
                    >
                      {msg.text}
                    </h3>
                    <div className="h-px bg-accent-gold opacity-20 mt-4"></div>
                  </div>
                )}

                {msg.type === "room" && (
                  <div>
                    <p
                      className="text-text-primary mb-3 max-w-[70ch] font-serif"
                      style={{ lineHeight: 1.7, fontSize: "1rem" }}
                    >
                      {msg.text}
                    </p>
                    {exits.length > 0 && (
                      <p className="text-interactive text-sm font-sans">
                        Exits:{" "}
                        {exits.map((exit, j) => (
                          <span key={j}>
                            <button
                              onClick={() => handleExitClick(exit)}
                              className="hover:text-accent-gold transition-colors underline"
                            >
                              [{exit}]
                            </button>
                            {j < exits.length - 1 && " "}
                          </span>
                        ))}
                      </p>
                    )}
                    <div className="h-px bg-accent-gold opacity-20 mt-4"></div>
                  </div>
                )}

                {msg.type === "combat" && (
                  <p
                    data-combat-type={msg.combatSubtype ?? 'default'}
                    className={`max-w-[70ch] font-serif ${
                      msg.combatSubtype === 'hit_dealt' ? 'text-accent-gold'
                      : msg.combatSubtype === 'hit_taken' ? 'text-danger'
                      : msg.combatSubtype === 'dodge' ? 'text-text-secondary'
                      : msg.combatSubtype === 'defeated' ? 'text-danger font-bold'
                      : msg.combatSubtype === 'flee' ? 'text-warning'
                      : msg.combatSubtype === 'combat_end' ? 'text-interactive italic'
                      : 'text-text-primary'
                    }`}
                    style={{ lineHeight: 1.7, fontSize: "1rem" }}
                  >
                    {msg.text}
                  </p>
                )}

                {msg.type === "trace" && (
                  <p
                    className="text-text-secondary italic pl-6 max-w-[70ch] flex items-start gap-2 font-serif"
                    style={{ lineHeight: 1.7, fontSize: "0.95rem" }}
                  >
                    <Eye className="w-4 h-4 mt-1 flex-shrink-0" />
                    <span>{msg.text}</span>
                  </p>
                )}

                {msg.type === "sound" && (
                  <p
                    className="text-text-secondary italic pl-6 max-w-[70ch] flex items-start gap-2 font-serif"
                    style={{ lineHeight: 1.7, fontSize: "0.95rem" }}
                  >
                    <Volume2 className="w-4 h-4 mt-1 flex-shrink-0" />
                    <span>{msg.text}</span>
                  </p>
                )}

                {msg.type === "system" && (
                  <p
                    className="text-text-disabled text-sm font-mono"
                  >
                    {msg.text}
                  </p>
                )}

                {msg.type === "speech" && (
                  <p
                    className="text-text-primary max-w-[70ch] font-serif"
                    style={{ lineHeight: 1.7, fontSize: "1rem" }}
                  >
                    "{msg.text}"
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar (30%) */}
        <div className="w-[30%] bg-bg-panel border-l border-border-muted flex flex-col">
          {/* Character Status */}
          <div className="p-4 border-b border-border-muted">
            <h3
              className="text-text-secondary text-xs mb-3 font-sans"
            >
              STATUS
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span
                    className="text-text-disabled text-xs font-sans"
                  >
                    Health
                  </span>
                  <span
                    className={`${healthState.color} text-xs font-mono ${healthState.pulse ? 'animate-pulse' : ''}`}
                  >
                    {healthState.label}
                  </span>
                </div>
                <div className="h-2 bg-bg-elevated rounded-full overflow-hidden">
                  <div
                    className={`h-full ${healthState.barColor}`}
                    style={{ width: `${hpPercent * 100}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <span
                  className="text-text-disabled text-xs font-sans"
                >
                  Stance
                </span>
                <p
                  className="text-text-primary text-sm font-mono"
                >
                  {state.pendingCombatAction ?? "Cautious"}
                </p>
              </div>
            </div>
          </div>

          {/* Status Effects (Gap #11) */}
          {state.statusEffects && state.statusEffects.length > 0 && (
            <div className="p-4 border-b border-border-muted" data-testid="status-effects">
              <h3 className="text-text-secondary text-xs mb-3 font-sans">STATUS EFFECTS</h3>
              <div className="flex flex-wrap gap-2">
                {state.statusEffects.map((effect) => (
                  <span
                    key={effect.id}
                    data-effect={effect.id}
                    className={`text-xs font-mono px-2 py-0.5 rounded border border-border-muted ${
                      ['bleeding', 'poisoned', 'burning'].includes(effect.id.toLowerCase())
                        ? 'text-danger'
                        : 'text-warning'
                    }`}
                  >
                    {effect.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Quick Inventory */}
          <div className="p-4 border-b border-border-muted">
            <h3
              className="text-text-secondary text-xs mb-3 font-sans"
            >
              QUICK INVENTORY
            </h3>
            <div className="space-y-2 text-sm">
              {state.inventory.length > 0 ? (
                state.inventory.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <Sword className="w-4 h-4 text-text-secondary" />
                    <span className="text-text-primary font-serif">
                      {item.name}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-text-disabled text-xs font-sans">
                  No items carried
                </p>
              )}
            </div>
          </div>

          {/* Enemy Status (during combat) */}
          {enemyStatus && (
            <div className="p-4 border-b border-border-muted">
              <h3
                className="text-danger text-xs mb-3 font-sans"
              >
                ENEMY
              </h3>
              <div className="space-y-2">
                <p className="text-text-primary text-sm font-serif">
                  {enemyStatus.name}
                </p>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span
                      className="text-text-disabled text-xs font-sans"
                    >
                      Health
                    </span>
                    <span
                      className="text-xs font-mono"
                      style={{
                        color:
                          enemyStatus.hpTier === "Near Death"
                            ? "var(--color-danger)"
                            : enemyStatus.hpTier === "Badly Wounded"
                            ? "var(--color-warning)"
                            : enemyStatus.hpTier === "Wounded"
                            ? "var(--color-warning)"
                            : "var(--color-success)",
                      }}
                    >
                      {enemyStatus.hpTier}
                    </span>
                  </div>
                  <div className="h-2 bg-bg-elevated rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-danger to-success transition-all"
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
                    className="text-warning text-xs italic font-serif"
                  >
                    Telegraphing: {enemyStatus.telegraphedAction}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Collapse Timer */}
          <div className="p-4 border-b border-border-muted">
            <h3
              className="text-text-secondary text-xs mb-2 font-sans"
            >
              COLLAPSE TIMER
            </h3>
            <div
              className="text-3xl font-bold font-mono"
              style={{ color: getCollapseColor() }}
            >
              {state.collapseTimer != null ? formatTime(collapseTime) : "--:--"}
            </div>
            {state.shardState === "destabilising" && (
              <p className="text-danger text-xs mt-2 font-sans">
                Destabilising
              </p>
            )}
            {state.shardState && (
              <p className="text-text-disabled text-xs mt-1 font-mono">
                Shard: {state.shardState}
              </p>
            )}
          </div>

          {/* Sound Cues */}
          <div className="p-4 border-b border-border-muted">
            <h3
              className="text-text-secondary text-xs mb-3 font-sans"
            >
              SOUND CUES
            </h3>
            <div className="space-y-2">
              {state.soundCues.length > 0 ? (
                state.soundCues.slice(-5).map((cue) => (
                  <p
                    key={cue.id}
                    data-sound-cue={cue.id}
                    className="text-text-secondary text-xs italic font-serif"
                  >
                    <span>{highlightDirections(cue.text)}</span>
                  </p>
                ))
              ) : (
                <p className="text-text-disabled text-xs font-sans">
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
                className="px-2 py-1 text-text-secondary hover:bg-bg-elevated hover:text-text-primary rounded text-xs transition-colors font-sans"
              >
                Look
              </button>
              <button
                onClick={() => sendCommand("listen")}
                className="px-2 py-1 text-text-secondary hover:bg-bg-elevated hover:text-text-primary rounded text-xs transition-colors font-sans"
              >
                Listen
              </button>
              <button
                onClick={() => setInventoryOpen(true)}
                className="px-2 py-1 text-text-secondary hover:bg-bg-elevated hover:text-text-primary rounded text-xs transition-colors font-sans"
              >
                Inventory
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Combat Action Bar */}
      {state.inCombat && (
        <div className="bg-bg-elevated border-t-2 border-danger px-6 py-3">
          <div className="flex items-center justify-center gap-2">
            <span
              className="text-danger text-sm mr-2 font-sans"
            >
              ⚔ COMBAT — Tick {state.combatTick}
            </span>
            <div
              data-testid="tick-timer-bar"
              role="progressbar"
              aria-valuenow={state.combatTick}
              aria-valuemin={0}
              aria-valuemax={10}
              className="w-24 h-1.5 bg-bg-elevated rounded-full overflow-hidden mr-4"
            >
              <div
                className="h-full bg-danger transition-all"
                style={{ width: `${Math.min(state.combatTick * 10, 100)}%` }}
              ></div>
            </div>
            {combatActions.map(({ label, action }, i) => (
              <button
                key={action}
                onClick={() => handleCombatAction(action)}
                disabled={state.pendingCombatAction != null}
                className={`px-3 py-1 bg-bg-panel hover:bg-accent-gold hover:text-bg-primary text-text-primary rounded text-sm transition-colors border border-border-muted ${
                  state.pendingCombatAction != null ? "opacity-50 cursor-not-allowed" : ""
                } font-sans`}
              >
                <span className="text-text-secondary mr-1 text-xs">{i + 1}</span>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Command Input */}
      <div className="bg-bg-panel border-t border-border-muted px-6 py-4">
        {autoCompleteHint && (
          <div data-testid="autocomplete-hint" className="text-text-disabled text-xs font-mono mb-1 px-6">
            {autoCompleteHint}
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <span
            className="text-accent-gold text-lg font-mono"
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
            className="flex-1 bg-transparent text-text-primary placeholder:text-text-disabled focus:outline-none disabled:opacity-50 font-mono"
            style={{ fontSize: "1rem" }}
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
