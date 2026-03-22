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
    <div className="min-h-screen bg-bg-primary flex">
      {/* Left panel - Character list */}
      <div className="w-[40%] bg-bg-panel border-r border-border-muted p-8 overflow-y-auto">
        <h2
          className="text-accent-gold mb-6 font-serif"
          style={{ fontSize: "1.5rem" }}
        >
          Your Shardwalkers
        </h2>

        <div className="space-y-4">
          {mockCharacters.map((char) => (
            <div
              key={char.id}
              className="bg-bg-elevated border border-border-muted rounded-lg p-4 hover:border-accent-gold transition-colors"
            >
              <h3
                className="text-accent-gold mb-2 font-serif"
                style={{ fontSize: "1.25rem" }}
              >
                {char.name}
              </h3>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-text-secondary" />
                <span className="text-text-secondary text-sm font-sans">
                  {char.faction}
                </span>
              </div>
              <div className="flex gap-2 mb-3 flex-wrap">
                {char.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2 py-1 bg-bg-primary text-text-secondary text-xs rounded font-sans"
                  >
                    {skill}
                  </span>
                ))}
              </div>
              <p className="text-text-disabled text-xs mb-3 font-sans">
                Last played: {char.lastPlayed}
              </p>
              <button
                onClick={handleEnterRefuge}
                className="w-full bg-accent-gold hover:bg-accent-gold/90 text-bg-primary font-medium py-2 rounded transition-colors font-sans"
              >
                Enter Refuge
              </button>
            </div>
          ))}

          <button
            onClick={() => setIsCreating(true)}
            className="w-full border-2 border-dashed border-border-muted hover:border-accent-gold text-text-secondary hover:text-accent-gold py-6 rounded-lg transition-colors font-sans"
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
              className="text-accent-gold mb-6 font-serif"
              style={{ fontSize: "1.5rem" }}
            >
              Create New Shardwalker
            </h2>

            <form onSubmit={handleCreateCharacter} className="space-y-6">
              <div>
                <label
                  htmlFor="charName"
                  className="block text-text-secondary text-sm mb-2 font-sans"
                >
                  Character Name
                </label>
                <input
                  id="charName"
                  type="text"
                  value={newCharName}
                  onChange={(e) => setNewCharName(e.target.value)}
                  className="w-full bg-bg-elevated border border-border-muted rounded px-4 py-2 text-text-primary focus:border-accent-gold focus:outline-none transition-colors font-sans"
                  required
                />
              </div>

              <div>
                <label className="block text-text-secondary text-sm mb-4 font-sans">
                  Choose Your Faction
                </label>
                <div className="grid gap-4">
                  {factions.map((faction) => (
                    <div
                      key={faction.id}
                      onClick={() => setSelectedFaction(faction.id)}
                      className={`bg-bg-elevated border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedFaction === faction.id
                          ? "border-accent-gold"
                          : "border-border-muted hover:border-interactive"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="text-accent-gold mt-1">{faction.icon}</div>
                        <div className="flex-1">
                          <h3
                            className="text-text-primary mb-2 font-serif"
                            style={{ fontSize: "1.125rem" }}
                          >
                            {faction.name}
                          </h3>
                          <p className="text-text-secondary text-sm mb-2 font-sans">
                            {faction.description}
                          </p>
                          <p className="text-accent-gold text-xs font-sans">
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
                  className="flex-1 border border-border-muted hover:bg-bg-elevated text-text-secondary hover:text-text-primary py-3 rounded transition-colors font-sans"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newCharName || !selectedFaction}
                  className="flex-1 bg-accent-gold hover:bg-accent-gold/90 text-bg-primary font-medium py-3 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-sans"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p
              className="text-text-disabled italic text-center font-serif"
              style={{ fontSize: "1.125rem" }}
            >
              Select an existing character or create a new one.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
