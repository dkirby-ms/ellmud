import { useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  Eye,
  Volume2,
  Sword,
  ArrowLeft,
} from "lucide-react";
import CombinedStashLoadout from "../components/CombinedStashLoadout";
import ExtractionOverlay from "../components/ExtractionOverlay";
import ChatPanel from "../components/ChatPanel";
import { ReconnectionOverlay } from "../components/ReconnectionOverlay";
import CompassControl from "../components/CompassControl";
import { MinimapWidget } from "../components/map/MinimapWidget.js";
import { FullMapOverlay } from "../components/map/FullMapOverlay.js";
import "../components/map/map.css";
import MudPrompt from "../components/MudPrompt.js";
import { useAppContext } from "../store.js";
import { useShardConnection } from "../hooks/useShardConnection.js";
import { useAutoScroll } from "../hooks/useAutoScroll.js";
import { useExplorationMap } from "../hooks/useExplorationMap.js";
import { useMapToggle } from "../hooks/useMapToggle.js";
import type { CombatAction } from "@ellmud/shared";

export default function ShardExploration() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useAppContext();

  // Derive zone mode from route path
  const isZone = location.pathname === "/refuge";
  const roomName = isZone ? "zone:the-refuge" : "shard";

  const {
    handleCommand: sendCommand,
    handleExitClick,
    handleCombatAction: sendCombatAction,
    sendChatMessage,
    extraction,
    reconnection,
    roomRef,
  } = useShardConnection(roomName);

  const mapState = useExplorationMap(roomRef.current);
  const { isMapOpen, toggleMap, closeMap } = useMapToggle();

  const [command, setCommand] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const narrativeRef = useAutoScroll(state.messages);

  // Derive room info from server state
  const currentRoom = state.roomHeader?.roomName ?? "Connecting...";
  const zoneName = state.roomHeader?.zoneName;
  const roomType = state.roomHeader?.roomType;

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

  // ─── Sound Cue Direction Highlighting ──────────────────────────────────
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
          {!isZone && (
            <button
              onClick={() => navigate("/refuge")}
              className="text-text-secondary hover:text-accent-gold transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
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
              {roomType && (
                <span
                  className={`ml-2 text-xs font-sans font-semibold px-1.5 py-0.5 rounded ${
                    roomType === 'boss' ? 'text-danger bg-danger/10'
                    : roomType === 'extraction' ? 'text-success bg-success/10'
                    : roomType === 'entry' ? 'text-interactive bg-interactive/10'
                    : 'text-text-disabled bg-bg-elevated'
                  }`}
                >
                  {roomType.toUpperCase()}
                </span>
              )}
              {zoneName && (
                <span className="text-text-secondary font-sans text-xs ml-2 font-normal">
                  — {zoneName}
                </span>
              )}
            </h2>
          </div>

          {/* Narrative text — render from real AppContext messages */}
          <div
            ref={narrativeRef}
            className="flex-1 overflow-y-auto px-6 py-4 space-y-1 narrative-scroll narrative-terminal"
          >
            {state.messages.map((msg) => (
              <div key={msg.id}>
                {msg.type === "header" && (
                  <div>
                    <h3
                      className="ansi-bright-yellow ansi-bold mb-1"
                      style={{ fontSize: "0.9375rem" }}
                    >
                      {msg.text}
                    </h3>
                    <div className="h-px bg-accent-gold opacity-20 mt-1"></div>
                  </div>
                )}

                {msg.type === "room" && (
                  <div>
                    <p className="mud-room-desc max-w-[80ch]">
                      {msg.text}
                    </p>
                    <div className="h-px bg-accent-gold opacity-10 mt-1"></div>
                  </div>
                )}

                {msg.type === "combat" && (
                  <p
                    data-combat-type={msg.combatSubtype ?? 'default'}
                    className={`max-w-[80ch] ${
                      msg.combatSubtype === 'hit_dealt' ? 'mud-damage ansi-bold'
                      : msg.combatSubtype === 'hit_taken' ? 'mud-critical'
                      : msg.combatSubtype === 'dodge' ? 'mud-dodge'
                      : msg.combatSubtype === 'defeated' ? 'ansi-bright-red ansi-bold'
                      : msg.combatSubtype === 'flee' ? 'ansi-yellow ansi-italic'
                      : msg.combatSubtype === 'combat_end' ? 'ansi-cyan ansi-italic'
                      : 'ansi-white'
                    }`}
                  >
                    {msg.text}
                  </p>
                )}

                {msg.type === "trace" && (
                  <p
                    className="ansi-dim pl-4 max-w-[80ch] flex items-start gap-2"
                  >
                    <Eye className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>{msg.text}</span>
                  </p>
                )}

                {msg.type === "sound" && (
                  <p
                    className="mud-sound pl-4 max-w-[80ch] flex items-start gap-2"
                  >
                    <Volume2 className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>{msg.text}</span>
                  </p>
                )}

                {msg.type === "system" && (
                  <p className="mud-system">
                    {msg.text}
                  </p>
                )}

                {msg.type === "speech" && (
                  <p className="mud-speech max-w-[80ch]">
                    &ldquo;{msg.text}&rdquo;
                  </p>
                )}
              </div>
            ))}

            {/* MUD-style status prompt — sticky at bottom of scroll */}
            <MudPrompt />
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

          {/* Compass Navigation */}
          <CompassControl onNavigate={handleExitClick} />

          {/* Minimap */}
          <div className="px-4 py-2 flex justify-center">
            <MinimapWidget
              visitedRooms={mapState.visitedRooms}
              ghostRooms={mapState.ghostRooms}
              positions={mapState.positions}
              currentRoomId={mapState.currentRoomId}
              onToggleFullMap={toggleMap}
            />
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
                : isZone ? "Connecting to the Refuge..." : "Connecting to shard..."
            }
            disabled={state.connectionStatus !== "connected"}
            className="flex-1 bg-transparent text-text-primary placeholder:text-text-disabled focus:outline-none disabled:opacity-50 font-mono"
            style={{ fontSize: "1rem" }}
            autoFocus
          />
        </form>
      </div>

      {/* Equipment Overlay */}
      {inventoryOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setInventoryOpen(false)}
          />
          <div className="relative w-[65%] bg-bg-panel shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-bg-panel border-b border-border-muted px-4 py-2 flex items-center justify-between z-10">
              <span className="mud-exits" style={{ fontSize: '0.9rem' }}>EQUIPMENT</span>
              <button
                onClick={() => setInventoryOpen(false)}
                className="text-text-secondary hover:text-accent-gold transition-colors text-sm font-mono"
              >
                [X]
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <CombinedStashLoadout room={roomRef.current} inShard={!isZone} />
            </div>
          </div>
        </div>
      )}

      {/* Full Map Overlay */}
      <FullMapOverlay
        visitedRooms={mapState.visitedRooms}
        ghostRooms={mapState.ghostRooms}
        positions={mapState.positions}
        currentRoomId={mapState.currentRoomId}
        isOpen={isMapOpen}
        onClose={closeMap}
      />

      {/* Extraction Overlay */}
      <ExtractionOverlay
        state={extraction.status}
        progress={extraction.progress}
        onReturnToRefuge={() => {
          // Navigate directly to refuge and let useShardConnection handle the reconnection
          navigate('/refuge');
        }}
      />

      {/* Chat Panel */}
      <ChatPanel
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        context={isZone ? "refuge" : "shard"}
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
