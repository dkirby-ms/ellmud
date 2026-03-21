import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import {
  Eye,
  Volume2,
  Package,
  Sword,
  Shield as ShieldIcon,
  ArrowLeft,
  MessageSquare,
} from "lucide-react";
import InventoryOverlay from "../components/InventoryOverlay";
import ExtractionOverlay from "../components/ExtractionOverlay";
import ChatPanel from "../components/ChatPanel";

interface NarrativeEntry {
  type: "room" | "combat" | "trace" | "sound" | "system" | "speech";
  content: string;
  room?: string;
  exits?: string[];
  timestamp?: number;
}

const initialNarrative: NarrativeEntry[] = [
  {
    type: "room",
    content:
      "The stairwell descends into brackish water. Your torch sputters, casting long shadows across the walls. Something has been carved into the stone above the waterline — recent, by the look of it. The air smells of iron and rot.",
    room: "Flooded Antechamber",
    exits: ["north", "east"],
  },
  {
    type: "trace",
    content: "You notice faint boot prints leading east, still damp.",
  },
  {
    type: "sound",
    content: "Scraping metal — from the north",
  },
];

export default function ShardExploration() {
  const { shardId } = useParams();
  const navigate = useNavigate();
  const [narrative, setNarrative] = useState<NarrativeEntry[]>(initialNarrative);
  const [command, setCommand] = useState("");
  const [inCombat, setInCombat] = useState(false);
  const [combatTick, setCombatTick] = useState(0);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [extractionState, setExtractionState] = useState<
    "in-progress" | "success" | "death" | null
  >(null);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [enemyStatus, setEnemyStatus] = useState<{
    name: string;
    hp: string;
    telegraphed?: string;
  } | null>(null);
  const narrativeRef = useRef<HTMLDivElement>(null);

  const [collapseTime, setCollapseTime] = useState(900); // 15 minutes in seconds
  const [currentRoom] = useState("Flooded Antechamber");
  const [soundCues, setSoundCues] = useState<
    { text: string; direction: string; id: number }[]
  >([{ text: "Scraping metal", direction: "north", id: 1 }]);
  const [autoComplete, setAutoComplete] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      setCollapseTime((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (narrativeRef.current) {
      narrativeRef.current.scrollTop = narrativeRef.current.scrollHeight;
    }
  }, [narrative]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getCollapseColor = () => {
    const percentage = (collapseTime / 900) * 100;
    if (percentage > 50) return "#E8E0D0";
    if (percentage > 25) return "#B8860B";
    return "#8B2500";
  };

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;

    setCommandHistory([...commandHistory, command]);
    setHistoryIndex(-1);

    // Mock command processing
    const cmd = command.toLowerCase().trim();

    if (cmd === "north" || cmd === "go north") {
      setNarrative([
        ...narrative,
        {
          type: "room",
          content:
            "You wade through the murky water, pushing north. The corridor opens into a larger chamber. Rusted chains hang from the ceiling, swaying gently despite the still air. To the west, you glimpse movement — something pale and hunched.",
          room: "Chain Chamber",
          exits: ["south", "west"],
        },
      ]);
    } else if (cmd === "east" || cmd === "go east") {
      setNarrative([
        ...narrative,
        {
          type: "room",
          content:
            "Following the boot prints, you move east. The passage narrows. Water drips from above, echoing in the darkness. Ahead, the path splits.",
          room: "Narrow Passage",
          exits: ["west", "northeast", "southeast"],
        },
      ]);
    } else if (cmd === "look" || cmd === "l") {
      setNarrative([
        ...narrative,
        {
          type: "system",
          content:
            "You take a moment to survey your surroundings carefully. Nothing new catches your eye.",
        },
      ]);
    } else if (cmd === "listen") {
      setNarrative([
        ...narrative,
        {
          type: "sound",
          content: "Distant footsteps — east, fading",
        },
      ]);
    } else if (cmd === "attack" || cmd.startsWith("combat")) {
      setInCombat(true);
      setNarrative([
        ...narrative,
        {
          type: "combat",
          content:
            "A drowned revenant lurches from the shadows! Its waterlogged form moves with unnatural speed.",
        },
      ]);
    } else if (cmd === "extract") {
      navigate("/refuge");
    } else {
      setNarrative([
        ...narrative,
        {
          type: "system",
          content: `Command not recognized: "${command}"`,
        },
      ]);
    }

    setCommand("");
  };

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
    setNarrative([
      ...narrative,
      {
        type: "combat",
        content: `You ${action}. The revenant staggers back, dark water streaming from its wounds. It prepares to strike again.`,
      },
    ]);
  };

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
            Kael Darkwater
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
                    width: `${(collapseTime / 900) * 100}%`,
                    backgroundColor: getCollapseColor(),
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* Narrative text */}
          <div
            ref={narrativeRef}
            className="flex-1 overflow-y-auto px-8 py-6 space-y-6"
          >
            {narrative.map((entry, i) => (
              <div key={i}>
                {entry.type === "room" && (
                  <div>
                    <h3
                      className="text-[#C9A84C] mb-3"
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: "1.25rem",
                      }}
                    >
                      {entry.room}
                    </h3>
                    <p
                      className="text-[#E8E0D0] mb-3 max-w-[70ch]"
                      style={{
                        fontFamily: "var(--font-serif)",
                        lineHeight: 1.7,
                        fontSize: "1rem",
                      }}
                    >
                      {entry.content}
                    </p>
                    {entry.exits && (
                      <p
                        className="text-[#3A7D7B] text-sm"
                        style={{ fontFamily: "var(--font-sans)" }}
                      >
                        Exits:{" "}
                        {entry.exits.map((exit, j) => (
                          <span key={j}>
                            <button
                              onClick={() => setCommand(`go ${exit}`)}
                              className="hover:text-[#C9A84C] transition-colors underline"
                            >
                              [{exit}]
                            </button>
                            {j < entry.exits!.length - 1 && " "}
                          </span>
                        ))}
                      </p>
                    )}
                    <div className="h-px bg-[#C9A84C] opacity-20 mt-4"></div>
                  </div>
                )}

                {entry.type === "combat" && (
                  <p
                    className="text-[#E8E0D0] max-w-[70ch]"
                    style={{
                      fontFamily: "var(--font-serif)",
                      lineHeight: 1.7,
                      fontSize: "1rem",
                    }}
                  >
                    {entry.content}
                  </p>
                )}

                {entry.type === "trace" && (
                  <p
                    className="text-[#8A8B95] italic pl-6 max-w-[70ch] flex items-start gap-2"
                    style={{
                      fontFamily: "var(--font-serif)",
                      lineHeight: 1.7,
                      fontSize: "0.95rem",
                    }}
                  >
                    <Eye className="w-4 h-4 mt-1 flex-shrink-0" />
                    <span>{entry.content}</span>
                  </p>
                )}

                {entry.type === "sound" && (
                  <p
                    className="text-[#8A8B95] italic pl-6 max-w-[70ch] flex items-start gap-2"
                    style={{
                      fontFamily: "var(--font-serif)",
                      lineHeight: 1.7,
                      fontSize: "0.95rem",
                    }}
                  >
                    <Volume2 className="w-4 h-4 mt-1 flex-shrink-0" />
                    <span>{entry.content}</span>
                  </p>
                )}

                {entry.type === "system" && (
                  <p
                    className="text-[#4A4B55] text-sm"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {entry.content}
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
                  Cautious
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
              <div className="flex items-center gap-2">
                <Sword className="w-4 h-4 text-[#8A8B95]" />
                <span
                  className="text-[#E8E0D0]"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  Corroded Halberd
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldIcon className="w-4 h-4 text-[#8A8B95]" />
                <span
                  className="text-[#E8E0D0]"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  Ironbound Chestplate
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span
                  className="text-[#8A8B95] text-xs"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Healing Salve (3)
                </span>
                <button
                  className="text-[#3A7D7B] hover:text-[#C9A84C] text-xs"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Use
                </button>
              </div>
            </div>
          </div>

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
              {formatTime(collapseTime)}
            </div>
            {collapseTime < 225 && (
              <p
                className="text-[#8B2500] text-xs mt-2"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Destabilising
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
              {soundCues.map((cue) => (
                <p
                  key={cue.id}
                  className="text-[#8A8B95] text-xs italic"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {cue.text} — from the {cue.direction}
                </p>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="p-4">
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setCommand("look")}
                className="px-2 py-1 text-[#8A8B95] hover:bg-[#1C1D27] hover:text-[#E8E0D0] rounded text-xs transition-colors"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Look
              </button>
              <button
                onClick={() => setCommand("listen")}
                className="px-2 py-1 text-[#8A8B95] hover:bg-[#1C1D27] hover:text-[#E8E0D0] rounded text-xs transition-colors"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Listen
              </button>
              <button
                onClick={() => setCommand("inventory")}
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
      {inCombat && (
        <div className="bg-[#1C1D27] border-t-2 border-[#8B2500] px-6 py-3">
          <div className="flex items-center justify-center gap-2">
            <span
              className="text-[#8B2500] text-sm mr-4"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              ⚔ COMBAT
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
                onClick={() => handleCombatAction(action.toLowerCase())}
                className="px-3 py-1 bg-[#12131A] hover:bg-[#C9A84C] hover:text-[#0A0B0F] text-[#E8E0D0] rounded text-sm transition-colors border border-[#2A2B35]"
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
        <form onSubmit={handleCommand} className="flex items-center gap-2">
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
            placeholder="Type a command..."
            className="flex-1 bg-transparent text-[#E8E0D0] placeholder-[#4A4B55] focus:outline-none"
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
        state={extractionState}
        progress={extractionProgress}
      />

      {/* Chat Panel */}
      <ChatPanel
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        context="shard"
      />
    </div>
  );
}