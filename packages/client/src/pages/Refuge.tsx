import { useState } from "react";
import { useNavigate, Link } from "react-router";
import {
  Package,
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
import ShardboardTab from "../components/ShardboardTab";
import StashTab from "../components/StashTab";
import LoadoutTab from "../components/LoadoutTab";

type TabType =
  | "stash"
  | "loadout"
  | "crafting"
  | "marketplace"
  | "factions"
  | "contracts"
  | "shardboard";

const tabs: { id: TabType; icon: React.ReactNode; label: string }[] = [
  { id: "stash", icon: <Package className="w-5 h-5" />, label: "Stash" },
  { id: "loadout", icon: <Shield className="w-5 h-5" />, label: "Loadout" },
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

const ambientEvents = [
  "A hooded merchant sets up shop near the eastern gate.",
  "Rain begins to fall across the Refuge.",
  "Distant thunder echoes from the north.",
  "A group of Shardwalkers return, bloodied but alive.",
  "The market square grows quiet as dusk approaches.",
];

const nearbyPlayers = [
  { name: "Valeria Shade", faction: "Veilkeepers" },
  { name: "Thorn Ironhand", faction: "Ironwright Compact" },
  { name: "Whisper", faction: "Ashen Guard" },
];

export default function Refuge() {
  const [activeTab, setActiveTab] = useState<TabType>("shardboard");
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState([
    { speaker: "System", message: "Welcome to the Refuge.", isSystem: true },
    {
      speaker: "Valeria Shade",
      message: "Anyone heading to the Ashen Reach tonight?",
      isSystem: false,
    },
  ]);
  const navigate = useNavigate();

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    setChatMessages([
      ...chatMessages,
      { speaker: "You", message: chatMessage, isSystem: false },
    ]);
    setChatMessage("");
  };

  return (
    <div className="h-screen bg-[#0A0B0F] flex flex-col">
      {/* Top bar */}
      <div className="bg-[#12131A] border-b border-[#2A2B35] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1
            className="text-[#C9A84C] tracking-wider"
            style={{ fontFamily: "var(--font-serif)", fontSize: "1.25rem" }}
          >
            ELLMUD
          </h1>
          <div className="flex items-center gap-2">
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
            <span className="text-[#4A4B55]">|</span>
            <span
              className="text-[#8A8B95] text-sm"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              The Refuge
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/admin"
            className="text-[#8A8B95] hover:text-[#C9A84C] transition-colors"
            title="Admin Panel"
          >
            <Wrench className="w-5 h-5" />
          </Link>
          <button
            onClick={() => navigate("/settings")}
            className="text-[#8A8B95] hover:text-[#C9A84C] transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left column - Navigation */}
        <div className="w-[25%] bg-[#12131A] border-r border-[#2A2B35] flex flex-col">
          <div className="p-4 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded transition-colors ${
                  activeTab === tab.id
                    ? "bg-[#1C1D27] text-[#C9A84C]"
                    : "text-[#8A8B95] hover:bg-[#1C1D27] hover:text-[#E8E0D0]"
                }`}
                style={{ fontFamily: "var(--font-sans)" }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Ambient Events */}
          <div className="flex-1 p-4 overflow-y-auto">
            <h3
              className="text-[#8A8B95] text-sm mb-3"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              Ambient Events
            </h3>
            <div className="space-y-3">
              {ambientEvents.map((event, i) => (
                <p
                  key={i}
                  className="text-[#4A4B55] text-xs italic"
                  style={{ fontFamily: "var(--font-serif)", lineHeight: 1.6 }}
                >
                  {event}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* Center column - Content */}
        <div className="flex-1 bg-[#0A0B0F] overflow-y-auto">
          {activeTab === "shardboard" && <ShardboardTab />}
          {activeTab === "stash" && <StashTab />}
          {activeTab === "loadout" && <LoadoutTab />}
          {activeTab === "crafting" && (
            <div className="p-8">
              <h2
                className="text-[#C9A84C] mb-4"
                style={{ fontFamily: "var(--font-serif)", fontSize: "1.5rem" }}
              >
                Crafting
              </h2>
              <p
                className="text-[#8A8B95]"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Crafting system coming soon...
              </p>
            </div>
          )}
          {activeTab === "marketplace" && (
            <div className="p-8">
              <h2
                className="text-[#C9A84C] mb-4"
                style={{ fontFamily: "var(--font-serif)", fontSize: "1.5rem" }}
              >
                Marketplace
              </h2>
              <p
                className="text-[#8A8B95]"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Marketplace coming soon...
              </p>
            </div>
          )}
          {activeTab === "factions" && (
            <div className="p-8">
              <h2
                className="text-[#C9A84C] mb-4"
                style={{ fontFamily: "var(--font-serif)", fontSize: "1.5rem" }}
              >
                Factions
              </h2>
              <p
                className="text-[#8A8B95]"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Faction details coming soon...
              </p>
            </div>
          )}
          {activeTab === "contracts" && (
            <div className="p-8">
              <h2
                className="text-[#C9A84C] mb-4"
                style={{ fontFamily: "var(--font-serif)", fontSize: "1.5rem" }}
              >
                Contracts
              </h2>
              <p
                className="text-[#8A8B95]"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Contracts coming soon...
              </p>
            </div>
          )}
        </div>

        {/* Right column - Social & Chat */}
        <div className="w-[25%] bg-[#12131A] border-l border-[#2A2B35] flex flex-col">
          <div className="p-4 border-b border-[#2A2B35]">
            <h3
              className="text-[#8A8B95] text-sm mb-3"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              Players Nearby
            </h3>
            <div className="space-y-2">
              {nearbyPlayers.map((player, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#2D6B4F]"></div>
                  <div className="flex-1">
                    <p
                      className="text-[#E8E0D0] text-sm"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      {player.name}
                    </p>
                    <p
                      className="text-[#4A4B55] text-xs"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      {player.faction}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {chatMessages.map((msg, i) => (
                <div key={i}>
                  {msg.isSystem ? (
                    <p
                      className="text-[#4A4B55] text-xs"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {msg.message}
                    </p>
                  ) : (
                    <div>
                      <p
                        className="text-[#8A8B95] text-xs mb-1"
                        style={{ fontFamily: "var(--font-sans)" }}
                      >
                        {msg.speaker}
                      </p>
                      <p
                        className="text-[#E8E0D0] text-sm"
                        style={{ fontFamily: "var(--font-serif)" }}
                      >
                        "{msg.message}"
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <form
              onSubmit={handleSendMessage}
              className="p-4 border-t border-[#2A2B35]"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Type message..."
                  className="flex-1 bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] text-sm focus:border-[#3A7D7B] focus:outline-none transition-colors placeholder-[#4A4B55]"
                  style={{ fontFamily: "var(--font-sans)" }}
                />
                <button
                  type="submit"
                  className="text-[#8A8B95] hover:text-[#C9A84C] transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}