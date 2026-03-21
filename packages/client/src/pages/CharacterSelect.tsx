import { useState } from "react";
import { useNavigate } from "react-router";
import { Shield, Hammer, BookOpen } from "lucide-react";

interface Character {
  id: string;
  name: string;
  faction: string;
  skills: string[];
  lastPlayed: string;
}

interface Faction {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  specialty: string;
}

const mockCharacters: Character[] = [
  {
    id: "1",
    name: "Kael Darkwater",
    faction: "Ironwright Compact",
    skills: ["Melee Combat", "Armourcraft", "Metalworking"],
    lastPlayed: "2 hours ago",
  },
];

const factions: Faction[] = [
  {
    id: "ironwright",
    name: "Ironwright Compact",
    icon: <Hammer className="w-6 h-6" />,
    description:
      "Master smiths and engineers who believe in the power of crafted steel.",
    specialty: "Crafting & Durability",
  },
  {
    id: "veilkeepers",
    name: "Veilkeepers",
    icon: <BookOpen className="w-6 h-6" />,
    description:
      "Scholars and mystics who seek to understand the nature of the shards.",
    specialty: "Lore & Anomalies",
  },
  {
    id: "ashenguard",
    name: "Ashen Guard",
    icon: <Shield className="w-6 h-6" />,
    description:
      "Warriors sworn to protect the Refuge and hunt the most dangerous creatures.",
    specialty: "Combat & Survival",
  },
];

export default function CharacterSelect() {
  const [isCreating, setIsCreating] = useState(false);
  const [newCharName, setNewCharName] = useState("");
  const [selectedFaction, setSelectedFaction] = useState<string>("");
  const navigate = useNavigate();

  const handleEnterRefuge = () => {
    navigate("/refuge");
  };

  const handleCreateCharacter = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/refuge");
  };

  return (
    <div className="min-h-screen bg-[#0A0B0F] flex">
      {/* Left panel - Character list */}
      <div className="w-[40%] bg-[#12131A] border-r border-[#2A2B35] p-8 overflow-y-auto">
        <h2
          className="text-[#C9A84C] mb-6"
          style={{ fontFamily: "var(--font-serif)", fontSize: "1.5rem" }}
        >
          Your Shardwalkers
        </h2>

        <div className="space-y-4">
          {mockCharacters.map((char) => (
            <div
              key={char.id}
              className="bg-[#1C1D27] border border-[#2A2B35] rounded-lg p-4 hover:border-[#C9A84C] transition-colors"
            >
              <h3
                className="text-[#C9A84C] mb-2"
                style={{ fontFamily: "var(--font-serif)", fontSize: "1.25rem" }}
              >
                {char.name}
              </h3>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-[#8A8B95]" />
                <span
                  className="text-[#8A8B95] text-sm"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  {char.faction}
                </span>
              </div>
              <div className="flex gap-2 mb-3 flex-wrap">
                {char.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2 py-1 bg-[#0A0B0F] text-[#8A8B95] text-xs rounded"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
              <p
                className="text-[#4A4B55] text-xs mb-3"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Last played: {char.lastPlayed}
              </p>
              <button
                onClick={handleEnterRefuge}
                className="w-full bg-[#C9A84C] hover:bg-[#B89840] text-[#0A0B0F] font-medium py-2 rounded transition-colors"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Enter Refuge
              </button>
            </div>
          ))}

          <button
            onClick={() => setIsCreating(true)}
            className="w-full border-2 border-dashed border-[#2A2B35] hover:border-[#C9A84C] text-[#8A8B95] hover:text-[#C9A84C] py-6 rounded-lg transition-colors"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            + New Shardwalker
          </button>
        </div>
      </div>

      {/* Right panel - Character creation */}
      <div className="flex-1 p-8 overflow-y-auto">
        {isCreating ? (
          <div className="max-w-3xl mx-auto">
            <h2
              className="text-[#C9A84C] mb-6"
              style={{ fontFamily: "var(--font-serif)", fontSize: "1.5rem" }}
            >
              Create New Shardwalker
            </h2>

            <form onSubmit={handleCreateCharacter} className="space-y-6">
              <div>
                <label
                  htmlFor="charName"
                  className="block text-[#8A8B95] text-sm mb-2"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Character Name
                </label>
                <input
                  id="charName"
                  type="text"
                  value={newCharName}
                  onChange={(e) => setNewCharName(e.target.value)}
                  className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-4 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none transition-colors"
                  style={{ fontFamily: "var(--font-sans)" }}
                  required
                />
              </div>

              <div>
                <label
                  className="block text-[#8A8B95] text-sm mb-4"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Choose Your Faction
                </label>
                <div className="grid gap-4">
                  {factions.map((faction) => (
                    <div
                      key={faction.id}
                      onClick={() => setSelectedFaction(faction.id)}
                      className={`bg-[#1C1D27] border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedFaction === faction.id
                          ? "border-[#C9A84C]"
                          : "border-[#2A2B35] hover:border-[#3A7D7B]"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="text-[#C9A84C] mt-1">{faction.icon}</div>
                        <div className="flex-1">
                          <h3
                            className="text-[#E8E0D0] mb-2"
                            style={{
                              fontFamily: "var(--font-serif)",
                              fontSize: "1.125rem",
                            }}
                          >
                            {faction.name}
                          </h3>
                          <p
                            className="text-[#8A8B95] text-sm mb-2"
                            style={{ fontFamily: "var(--font-sans)" }}
                          >
                            {faction.description}
                          </p>
                          <p
                            className="text-[#C9A84C] text-xs"
                            style={{ fontFamily: "var(--font-sans)" }}
                          >
                            Specialty: {faction.specialty}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="flex-1 border border-[#2A2B35] hover:bg-[#1C1D27] text-[#8A8B95] hover:text-[#E8E0D0] py-3 rounded transition-colors"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newCharName || !selectedFaction}
                  className="flex-1 bg-[#C9A84C] hover:bg-[#B89840] text-[#0A0B0F] font-medium py-3 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p
              className="text-[#4A4B55] italic text-center"
              style={{ fontFamily: "var(--font-serif)", fontSize: "1.125rem" }}
            >
              Select an existing character or create a new one.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
