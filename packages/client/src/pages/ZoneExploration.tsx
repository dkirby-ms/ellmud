import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router";
import {
  Eye,
  Volume2,
  Sword,
  ArrowLeft,
  LogOut,
} from "lucide-react";
import CombinedStashLoadout from "../components/CombinedStashLoadout";
import ChatPanel from "../components/ChatPanel";
import { ReconnectionOverlay } from "../components/ReconnectionOverlay";
import CompassControl from "../components/CompassControl";
import { MinimapWidget } from "../components/map/MinimapWidget.js";
import { FullMapOverlay } from "../components/map/FullMapOverlay.js";
import AnsiText from "../components/AnsiText.js";
import { EquipmentSilhouette } from "../components/EquipmentSilhouette.js";
import { RoomOccupants } from "../components/RoomOccupants.js";
import { CombatHUD } from "../components/CombatHUD.js";
import "../components/map/map.css";
import MudPrompt from "../components/MudPrompt.js";
import { useAppContext, type StatusEffect } from "../store.js";
import { useZoneConnection } from "../hooks/useZoneConnection.js";
import { useAutoScroll } from "../hooks/useAutoScroll.js";
import { useExplorationMap } from "../hooks/useExplorationMap.js";
import { useMapToggle } from "../hooks/useMapToggle.js";
import { useVersion } from "../hooks/useVersion.js";
import { useDirectionKeys } from "../hooks/useDirectionKeys.js";
import { isSpeedwalk, parseSpeedwalk } from "../utils/speedwalk.js";
import { logout as apiLogout, fetchSpawnZone } from "../services/api.js";
import type { CombatAction } from "@ellmud/shared";

// ─── Status Effect Classifier ────────────────────────────────────────────────

const DEBUFF_KEYWORDS = ['bleeding', 'poisoned', 'burning', 'weakened', 'slowed', 'stunned', 'confused', 'cursed', 'blind', 'fear', 'zone-sick'];
const BUFF_KEYWORDS = ['haste', 'strength', 'shield', 'regeneration', 'regen', 'blessed', 'fortified', 'empowered', 'protect', 'harden'];

function getEffectType(effect: StatusEffect): 'buff' | 'debuff' | 'neutral' {
  const name = effect.name.toLowerCase();
  if (DEBUFF_KEYWORDS.some(d => name.includes(d))) return 'debuff';
  if (BUFF_KEYWORDS.some(b => name.includes(b))) return 'buff';
  return 'neutral';
}

export default function ZoneExploration() {
  const navigate = useNavigate();
  const _location = useLocation();
  const { zoneId } = useParams<{ zoneId?: string }>();
  const { state, dispatch } = useAppContext();
  const version = useVersion();

  // Derive zone mode: /zone (hub) vs /zone/:zoneId (specific zone)
  const isHub = !zoneId;
  const [spawnTarget, setSpawnTarget] = useState<string | null>(null);

  // Resolve the player's faction hub via /api/spawn-zone
  useEffect(() => {
    if (!isHub || !state.token) return;
    fetchSpawnZone(state.token)
      .then(res => setSpawnTarget(res.target))
      .catch(() => setSpawnTarget('zone:the-refuge'));
  }, [isHub, state.token]);

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
  } = useZoneConnection(roomName);

  const mapState = useExplorationMap(roomRef.current);
  const { isMapOpen, toggleMap, closeMap } = useMapToggle();

  const [command, setCommand] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const { containerRef: narrativeRef, bottomRef } = useAutoScroll(state.messages);

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
    if (state.connectionStatus === "connected") {
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
  }, [state.connectionStatus]);

  // Phase 1: Arrow key / numpad direction shortcuts (only when input is not focused)
  useDirectionKeys({
    onMove: handleExitClick,
    inputRef,
    enabled: state.connectionStatus === "connected",
  });

  // Abort any active speedwalk when combat starts
  useEffect(() => {
    if (state.inCombat) {
      speedwalkAbortRef.current = true;
    }
  }, [state.inCombat]);

  // Logout handler
  const handleLogout = useCallback(async () => {
    if (state.token) {
      try {
        await apiLogout(state.token);
      } catch {
        /* best effort */
      }
    }
    roomRef.current?.leave();
    dispatch({ type: "LOGOUT" });
    navigate("/");
  }, [state.token, dispatch, navigate, roomRef]);

  // Derive room info from server state
  const currentRoom = state.roomHeader?.roomName ?? "Connecting...";
  const zoneName = state.roomHeader?.zoneName;
  const roomType = state.roomHeader?.roomType;
  const roomSlug = state.roomHeader?.roomSlug;

  const speedwalkMsgCounter = useRef(0);

  const addSystemMessage = useCallback(
    (text: string) => {
      dispatch({
        type: "ADD_MESSAGE",
        message: {
          id: `sw-${++speedwalkMsgCounter.current}`,
          text,
          type: "system",
          timestamp: Date.now(),
        },
      });
    },
    [dispatch]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = command.trim();
      if (!trimmed) return;

      setCommandHistory((prev) => [...prev, command]);
      setHistoryIndex(-1);
      setCommand("");

      // Phase 2: Speedwalk detection
      if (isSpeedwalk(trimmed)) {
        if (state.inCombat) {
          addSystemMessage("Speedwalk blocked — you are in combat!");
          return;
        }

        const result = parseSpeedwalk(trimmed);
        if (!result.ok) {
          addSystemMessage(result.error);
          return;
        }

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
    [command, sendCommand, handleExitClick, state.inCombat]
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

  // ─── HP / Stamina State Helpers ─────────────────────────────────────────
  const hpPercent = state.playerMaxHp > 0 ? state.playerHp / state.playerMaxHp : 0;
  const staminaPercent = state.playerMaxStamina > 0 ? state.playerStamina / state.playerMaxStamina : 0;
  const healthState = hpPercent > 0.6
    ? { label: 'Healthy', color: 'text-success', barColor: 'bg-success', barClass: 'status-bar-hp-healthy', numericClass: 'status-numeric-hp-healthy', pulse: false }
    : hpPercent >= 0.3
    ? { label: 'Wounded', color: 'text-warning', barColor: 'bg-warning', barClass: 'status-bar-hp-wounded', numericClass: 'status-numeric-hp-wounded', pulse: false }
    : { label: 'Critical', color: 'text-danger', barColor: 'bg-danger', barClass: 'status-bar-hp-critical', numericClass: 'status-numeric-hp-critical', pulse: true };

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
            {state.username ?? state.email ?? "Unknown"}
          </span>
          <button
            onClick={handleLogout}
            className="text-text-secondary hover:text-danger transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
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

          {/* Narrative text — render from real AppContext messages */}
          <div
            ref={narrativeRef}
            onClick={handleNarrativeClick}
            className="flex-1 overflow-y-auto px-6 py-4 space-y-1 narrative-scroll narrative-terminal narrative-clickable"
            role="log"
            aria-label="Game narrative"
          >
            {state.messages.map((msg) => (
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
                  state.connectionStatus === "connected"
                    ? "Type a command..."
                    : isHub ? "Connecting to stronghold..." : "Connecting to instance..."
                }
                disabled={state.connectionStatus !== "connected"}
                className="flex-1 bg-transparent text-text-primary placeholder:text-text-disabled focus:outline-none disabled:opacity-50 font-mono"
                style={{ fontSize: "1rem" }}
                autoFocus
                tabIndex={1}
                aria-label="Command input"
              />
            </form>
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
              {/* HP Bar */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-text-disabled text-xs font-sans">Health</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`${healthState.color} text-xs font-mono ${healthState.pulse ? 'animate-pulse' : ''}`}
                    >
                      {healthState.label}
                    </span>
                    <span className={`text-xs font-mono ${healthState.numericClass}`}>
                      {state.playerHp}/{state.playerMaxHp}
                    </span>
                  </div>
                </div>
                <div
                  className="status-bar"
                  role="progressbar"
                  aria-label={`Health: ${state.playerHp} of ${state.playerMaxHp}`}
                  aria-valuenow={state.playerHp}
                  aria-valuemin={0}
                  aria-valuemax={state.playerMaxHp}
                >
                  <div
                    className={`status-bar-fill ${healthState.barClass}`}
                    style={{ width: `${hpPercent * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Stamina Bar */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-text-disabled text-xs font-sans">Stamina</span>
                  <span className="text-xs font-mono status-numeric-stamina">
                    {state.playerStamina}/{state.playerMaxStamina}
                  </span>
                </div>
                <div
                  className="status-bar"
                  role="progressbar"
                  aria-label={`Stamina: ${state.playerStamina} of ${state.playerMaxStamina}`}
                  aria-valuenow={state.playerStamina}
                  aria-valuemin={0}
                  aria-valuemax={state.playerMaxStamina}
                >
                  <div
                    className="status-bar-fill status-bar-stamina"
                    style={{ width: staminaPercent > 0 ? `${staminaPercent * 100}%` : '0%' }}
                  ></div>
                </div>
              </div>

              {/* Stance */}
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

          {/* Status Effects */}
          {state.statusEffects && state.statusEffects.length > 0 && (
            <div className="p-4 border-b border-border-muted" data-testid="status-effects">
              <h3 className="text-text-secondary text-xs mb-3 font-sans">STATUS EFFECTS</h3>
              <div className="flex flex-wrap gap-1.5">
                {state.statusEffects.map((effect) => {
                  const type = getEffectType(effect);
                  return (
                    <span
                      key={effect.id}
                      data-effect={effect.id}
                      className={`status-pill status-pill-${type} ${
                        type === 'debuff' ? 'text-danger' : type === 'buff' ? 'text-success' : 'text-text-secondary'
                      }`}
                    >
                      {effect.name}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Room Occupants */}
          <div className="p-4 border-b border-border-muted">
            <RoomOccupants 
              creatures={state.roomOccupants.creatures}
              players={state.roomOccupants.players}
            />
          </div>

          {/* Equipment Silhouette */}
          <div className="p-4 border-b border-border-muted">
            <EquipmentSilhouette loadout={state.loadout} />
          </div>

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

          {/* Combat HUD (during combat) */}
          {state.inCombat && (
            <div className="p-4 border-b border-border-muted">
              <CombatHUD
                enemyStatus={enemyStatus}
                availableTargets={
                  state.roomOccupants.creatures
                    .filter((c) => c.aggressive)
                    .map((c) => ({
                      id: c.id,
                      name: c.name,
                      hp: 100,
                      maxHp: 100,
                    }))
                }
              />
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

          {/* Compass + Minimap */}
          <div className="flex items-center justify-center gap-4 px-4 py-2">
            <CompassControl ref={compassRef} onNavigate={handleExitClick} />
            <div className="h-16 border-l border-border-muted" />
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

          {/* Version indicator */}
          <div className="mt-auto px-4 py-2 text-right">
            <span
              className="text-[10px] font-mono opacity-30 hover:opacity-70 transition-opacity cursor-default select-none"
              style={{ color: 'var(--color-text-disabled, #555)' }}
              title={`v${version.version} — Built: ${version.buildTime}`}
              aria-label={`Version ${version.version}, built ${version.buildTime}`}
              tabIndex={0}
            >
              v{version.version}
            </span>
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

      {/* Death Overlay */}
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

      {/* Chat Panel */}
      <ChatPanel
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        context={isHub ? "refuge" : "zone"}
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
