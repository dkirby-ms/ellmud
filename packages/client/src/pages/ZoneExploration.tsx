import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router";
import {
  Eye,
  Volume2,
  ArrowLeft,
  Settings,
  Users,
  Skull,
} from "lucide-react";
import CombinedStashLoadout from "../components/CombinedStashLoadout";
import ChatPanel from "../components/ChatPanel";
import { ReconnectionOverlay } from "../components/ReconnectionOverlay";
import { FullMapOverlay } from "../components/map/FullMapOverlay.js";
import AnsiText from "../components/AnsiText.js";
import { StatusPanel } from "../components/StatusPanel.js";
import PermadeathOverlay from "../components/PermadeathOverlay.js";
import "../components/map/map.css";
import MudPrompt from "../components/MudPrompt.js";
import SettingsModal from "../components/SettingsModal.js";
import WhoListModal from "../components/WhoListModal.js";
import HelpModal from "../components/HelpModal.js";
import { useAuthStore } from "../store/auth.js";
import { useTerminalStore } from "../store/terminal.js";
import { useCombatStore } from "../store/combat.js";
import { useConnectionStore } from "../store/connection.js";
import { useZoneConnection } from "../hooks/useZoneConnection.js";
import { useAutoScroll } from "../hooks/useAutoScroll.js";
import { useExplorationMap } from "../hooks/useExplorationMap.js";
import { useMapToggle } from "../hooks/useMapToggle.js";
import { useDirectionKeys } from "../hooks/useDirectionKeys.js";
import { shouldTreatAsSpeedwalk, parseSpeedwalk } from "../utils/speedwalk.js";
import { fetchSpawnZone } from "../services/api.js";
import type { CombatAction } from "@ellmud/shared";

export default function ZoneExploration() {
  const navigate = useNavigate();
  const _location = useLocation();
  const { zoneId } = useParams<{ zoneId?: string }>();
  const token = useAuthStore(s => s.token);
  const messages = useTerminalStore(s => s.messages);
  const connectionStatus = useConnectionStore(s => s.connectionStatus);
  const inCombat = useCombatStore(s => s.inCombat);
  const roomHeader = useTerminalStore(s => s.roomHeader);
  const username = useAuthStore(s => s.username);
  const email = useAuthStore(s => s.email);
  const combatTick = useCombatStore(s => s.combatTick);
  const pendingCombatAction = useCombatStore(s => s.pendingCombatAction);
  const terminalDispatch = useTerminalStore(s => s.dispatch);

  // Derive zone mode: /zone (hub) vs /zone/:zoneId (specific zone)
  const isHub = !zoneId;
  const [spawnTarget, setSpawnTarget] = useState<string | null>(null);

  // Resolve the player's faction hub via /api/spawn-zone
  useEffect(() => {
    if (!isHub || !token) return;
    fetchSpawnZone(token)
      .then(res => setSpawnTarget(res.target))
      .catch(() => setSpawnTarget('zone:the-refuge'));
  }, [isHub, token]);

  const roomName = isHub ? (spawnTarget ?? '') : 'zone';

  const {
    handleCommand: sendCommand,
    handleExitClick,
    handleCombatAction: sendCombatAction,
    sendChatMessage,
    overlay,
    dismissOverlay,
    reconnection,
    roomRef,
    helpData,
    clearHelpData,
  } = useZoneConnection(roomName);

  const mapState = useExplorationMap(roomRef.current);
  const { isMapOpen, toggleMap, closeMap } = useMapToggle();

  const [command, setCommand] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showWho, setShowWho] = useState(false);
  const { containerRef: narrativeRef, bottomRef } = useAutoScroll(messages);

  // ─── Focus persistence across zone transitions ───────────────────────────────
  const inputRef = useRef<HTMLInputElement>(null);
  const compassRef = useRef<HTMLDivElement>(null);
  const speedwalkAbortRef = useRef(false);

  // Track which UI area had focus before a zone switch so we can restore it.
  // "compass" = a compass button was focused; "prompt" = the command input.
  const lastFocusAreaRef = useRef<'compass' | 'prompt'>('prompt');

  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as Node | null;
      if (compassRef.current?.contains(target)) {
        lastFocusAreaRef.current = 'compass';
      } else if (inputRef.current && inputRef.current === target) {
        lastFocusAreaRef.current = 'prompt';
      }
    };
    document.addEventListener('focusin', handleFocusIn);
    return () => document.removeEventListener('focusin', handleFocusIn);
  }, []);

  // Restore focus after zone switches (input is disabled while connecting).
  // If the compass had focus, re-focus the first available compass button
  // instead of stealing focus to the prompt.
  useEffect(() => {
    if (connectionStatus === "connected") {
      requestAnimationFrame(() => {
        if (lastFocusAreaRef.current === 'compass') {
          const btn = compassRef.current?.querySelector<HTMLButtonElement>(
            'button:not([disabled])',
          );
          if (btn) {
            btn.focus();
            return;
          }
        }
        inputRef.current?.focus();
      });
    }
  }, [connectionStatus]);

  // Phase 1: Arrow key / numpad direction shortcuts (only when input is not focused)
  useDirectionKeys({
    onMove: handleExitClick,
    inputRef,
    enabled: connectionStatus === "connected",
  });

  // Abort any active speedwalk when combat starts
  useEffect(() => {
    if (inCombat) {
      speedwalkAbortRef.current = true;
    }
  }, [inCombat]);

  // Logout handler

  // Derive room info from server state
  const currentRoom = roomHeader?.roomName ?? "Connecting...";
  const zoneName = roomHeader?.zoneName;
  const roomType = roomHeader?.roomType;
  const roomSlug = roomHeader?.roomSlug;

  const speedwalkMsgCounter = useRef(0);

  const addSystemMessage = useCallback(
    (text: string) => {
      terminalDispatch({
        type: "ADD_MESSAGE",
        message: {
          id: `sw-${++speedwalkMsgCounter.current}`,
          text,
          type: "system",
          timestamp: Date.now(),
        },
      });
    },
    [terminalDispatch]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = command.trim();
      if (!trimmed) return;

      setCommandHistory((prev) => [...prev, command]);
      setHistoryIndex(-1);
      setCommand("");

      // Phase 2: Speedwalk detection — only for multi-move sequences.
      // Single direction letters (n/s/e/w/u/d) fall through to normal
      // command handling so they don't trigger false "Speedwalk" messages.
      if (shouldTreatAsSpeedwalk(trimmed)) {
        if (inCombat) {
          addSystemMessage("Speedwalk blocked — you are in combat!");
          return;
        }

        const result = parseSpeedwalk(trimmed);
        if (!result.ok) return;

        // Execute each move sequentially with a small delay so the server
        // can process each one and the response echoes back.
        speedwalkAbortRef.current = false;
        const moves = result.moves;
        addSystemMessage(`Speedwalk: ${moves.length} moves (${trimmed})`);
        let i = 0;

        const step = () => {
          if (speedwalkAbortRef.current || i >= moves.length) return;
          handleExitClick(moves[i]);
          i++;
          if (i < moves.length) {
            setTimeout(step, 150);
          }
        };

        step();
        return;
      }

      sendCommand(command);
    },
    [command, sendCommand, handleExitClick, inCombat]
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
    switch (connectionStatus) {
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

  // ─── Auto-complete ─────────────────────────────────────────────────────
  const KNOWN_COMMANDS = [
    'strike', 'heavy strike', 'dodge', 'block', 'use item', 'skill', 'flee', 'observe',
    'look', 'listen', 'go', 'inventory', 'help', 'say', 'shout', 'whisper', 'extract',
  ];
  const autoCompleteHint = command.trim()
    ? KNOWN_COMMANDS.find(cmd => cmd.startsWith(command.trim().toLowerCase())) ?? null
    : null;

  // Click anywhere in the narrative to focus the command input
  const handleNarrativeClick = useCallback(() => {
    if (window.getSelection()?.toString()) return;
    inputRef.current?.focus();
  }, []);

  return (
    <div className="h-screen bg-bg-primary flex flex-col">
      {/* Top bar */}
      <div className="bg-bg-panel border-b border-border-muted px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {!isHub && (
            <button
              onClick={() => navigate("/zone")}
              className="text-text-secondary hover:text-accent-gold transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <span className="text-text-secondary text-sm font-sans">
            {username ?? email ?? "Unknown"}
          </span>
          <button
            onClick={() => navigate("/hall-of-fame")}
            className="text-text-secondary hover:text-accent-gold transition-colors"
            title="Hall of Fame"
          >
            <Skull className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="text-text-secondary hover:text-accent-gold transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowWho(true)}
            className="text-text-secondary hover:text-accent-gold transition-colors"
            title="Who's online"
          >
            <Users className="w-4 h-4" />
          </button>
          <span className="text-text-disabled">|</span>
          {connectionIndicator()}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Narrative Panel (70%) */}
        <div className="w-[70%] flex flex-col min-h-0 bg-bg-primary">
          {/* Room header */}
          <div className="bg-bg-panel border-b border-border-muted px-6 py-3 flex items-center justify-between">
            <h2
              className="text-accent-gold font-serif"
              style={{ fontSize: "1.125rem" }}
            >
              {currentRoom}
              {roomSlug && (
                <span className="text-text-disabled font-mono text-xs ml-2 font-normal">
                  [{roomSlug}]
                </span>
              )}
              {roomType && (
                <span
                  className={`ml-2 text-xs font-sans font-semibold px-1.5 py-0.5 rounded ${
                    roomType === 'boss' ? 'text-danger bg-danger/10'
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

          {/* Narrative text — render from real store messages */}
          <div
            ref={narrativeRef}
            onClick={handleNarrativeClick}
            className="flex-1 overflow-y-auto px-6 py-4 space-y-1 narrative-scroll narrative-terminal narrative-clickable"
            role="log"
            aria-label="Game narrative"
          >
            {messages.map((msg) => (
              <div key={msg.id}>
                {msg.type === "header" && (
                  <div>
                    <h3
                      className="ansi-bright-yellow ansi-bold mb-1"
                      style={{ fontSize: "0.9375rem" }}
                    >
                      <AnsiText text={msg.text} />
                    </h3>
                    <div className="h-px bg-accent-gold opacity-20 mt-1"></div>
                  </div>
                )}

                {msg.type === "room" && (
                  <div>
                    <p className="mud-room-desc max-w-[80ch]">
                      <AnsiText text={msg.text} />
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
                    <AnsiText text={msg.text} />
                  </p>
                )}

                {msg.type === "trace" && (
                  <p
                    className="ansi-dim pl-4 max-w-[80ch] flex items-start gap-2"
                  >
                    <Eye className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span><AnsiText text={msg.text} /></span>
                  </p>
                )}

                {msg.type === "sound" && (
                  <p
                    className="mud-sound pl-4 max-w-[80ch] flex items-start gap-2"
                  >
                    <Volume2 className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span><AnsiText text={msg.text} /></span>
                  </p>
                )}

                {msg.type === "system" && (
                  <p className="mud-system">
                    <AnsiText text={msg.text} />
                  </p>
                )}

                {msg.type === "speech" && (
                  <p className="mud-speech max-w-[80ch]">
                    &ldquo;<AnsiText text={msg.text} />&rdquo;
                  </p>
                )}

                {msg.type === "ambient" && (
                  <p className="ansi-dim ansi-italic max-w-[80ch]">
                    <AnsiText text={msg.text} />
                  </p>
                )}

                {msg.type === "awareness" && (
                  <p
                    className="ansi-dim pl-4 max-w-[80ch] flex items-start gap-2"
                  >
                    <Eye className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span><AnsiText text={msg.text} /></span>
                  </p>
                )}
              </div>
            ))}
            <div ref={bottomRef} aria-hidden="true" />
          </div>

          {/* MUD-style status prompt + inline command input */}
          <div className="command-input-line">
            <MudPrompt />
            {autoCompleteHint && (
              <div data-testid="autocomplete-hint" className="text-text-disabled text-xs font-mono px-6 py-0.5">
                {autoCompleteHint}
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex items-center gap-2 px-6 py-2">
              <span
                className="text-accent-gold text-lg font-mono"
                aria-hidden="true"
              >
                &gt;
              </span>
              <input
                ref={inputRef}
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  connectionStatus === "connected"
                    ? "Type a command..."
                    : isHub ? "Connecting to stronghold..." : "Connecting to instance..."
                }
                disabled={connectionStatus !== "connected"}
                className="flex-1 bg-transparent text-text-primary placeholder:text-text-disabled focus:outline-none disabled:opacity-50 font-mono"
                style={{ fontSize: "1rem" }}
                autoFocus
                tabIndex={1}
                aria-label="Command input"
              />
            </form>
          </div>
        </div>

        {/* Sidebar (30%) — Status Panel */}
        <StatusPanel
          compassRef={compassRef}
          onNavigate={handleExitClick}
          onSendCommand={sendCommand}
          onOpenInventory={() => setInventoryOpen(true)}
          mapState={mapState}
          onToggleFullMap={toggleMap}
        />
      </div>

      {/* Combat Action Bar */}
      {inCombat && (
        <div className="bg-bg-elevated border-t-2 border-danger px-6 py-3">
          <div className="flex items-center justify-center gap-2">
            <span
              className="text-danger text-sm mr-2 font-sans"
            >
              ⚔ COMBAT — Tick {combatTick}
            </span>
            <div
              data-testid="tick-timer-bar"
              role="progressbar"
              aria-valuenow={combatTick}
              aria-valuemin={0}
              aria-valuemax={10}
              className="w-24 h-1.5 bg-bg-elevated rounded-full overflow-hidden mr-4"
            >
              <div
                className="h-full bg-danger transition-all"
                style={{ width: `${Math.min(combatTick * 10, 100)}%` }}
              ></div>
            </div>
            {combatActions.map(({ label, action }, i) => (
              <button
                key={action}
                onClick={() => handleCombatAction(action)}
                disabled={pendingCombatAction != null}
                className={`px-3 py-1 bg-bg-panel hover:bg-accent-gold hover:text-bg-primary text-text-primary rounded text-sm transition-colors border border-border-muted ${
                  pendingCombatAction != null ? "opacity-50 cursor-not-allowed" : ""
                } font-sans`}
              >
                <span className="text-text-secondary mr-1 text-xs">{i + 1}</span>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

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
              <CombinedStashLoadout room={roomRef.current} inZone={!isHub} />
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

      {/* Death Overlay (normal death) */}
      {overlay.status === 'death' && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
          <div className="text-center">
            <p className="text-danger text-lg mb-4">{overlay.narration}</p>
            <button
              onClick={() => {
                dismissOverlay();
                navigate('/zone');
              }}
              className="px-4 py-2 bg-bg-elevated text-text-primary rounded hover:bg-bg-surface"
            >
              Return to Hub
            </button>
          </div>
        </div>
      )}

      {/* Permadeath Overlay */}
      {overlay.status === 'permadeath' && overlay.permadeathData && (
        <PermadeathOverlay
          data={overlay.permadeathData}
          onDismiss={dismissOverlay}
        />
      )}

      {/* Chat Panel */}
      <ChatPanel
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        context={isHub ? "hub" : "zone"}
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
        onReturnToHub={reconnection.returnToHub}
      />

      {/* Settings Modal */}
      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Who List Modal */}
      <WhoListModal
        open={showWho}
        onClose={() => setShowWho(false)}
      />

      {/* Help Modal */}
      <HelpModal
        data={helpData}
        onClose={clearHelpData}
      />
    </div>
  );
}
