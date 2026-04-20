import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  Settings,
  LogOut,
  Dices,
  Skull,
  Shield,
  Sword,
  Heart,
  Crosshair,
  Shirt,
} from "lucide-react";
import { useAppStore } from "../store";
import {
  fetchCharacters,
  createCharacter,
  selectCharacter,
  deleteCharacter,
  logout as apiLogout,
  ApiError,
} from "../services/api";
import type { CharacterSummary } from "@ellmud/shared";
import { generateRandomName } from "../utils/name-generator";

const STARTING_ZONES = [
  {
    slug: "the-reliquary",
    name: "The Reliquary",
    faction: "Kindari",
    desc: "Wake among the preservers. The Kindari guard the memory of Antoine Fournier in vaulted halls of salvaged tech and carefully maintained urns.",
  },
  {
    slug: "the-bloom-observatory",
    name: "The Bloom Observatory",
    faction: "Bloom Tenders",
    desc: "Wake among the watchers. The Bloom Tenders study the mutant algae that freed you, reading its patterns from observation towers above the flooded streets.",
  },
  {
    slug: "the-carrion-court",
    name: "The Carrion Court",
    faction: "Krewe Calliope",
    desc: "Wake among the revelers. Krewe Calliope keeps the old carnival traditions alive with dark processions through the ruins.",
  },
];

type BaseStatKey = keyof NonNullable<CharacterSummary["baseStats"]>;
const STAT_LABELS: { key: BaseStatKey; label: string; icon: typeof Heart }[] = [
  { key: "maxHp", label: "Max HP", icon: Heart },
  { key: "unarmed", label: "Unarmed", icon: Sword },
  { key: "oneHanded", label: "One-Handed", icon: Sword },
  { key: "twoHanded", label: "Two-Handed", icon: Sword },
  { key: "ranged", label: "Ranged", icon: Crosshair },
  { key: "shieldBlock", label: "Shield Block", icon: Shield },
  { key: "dodge", label: "Dodge", icon: Crosshair },
  { key: "armour", label: "Armour", icon: Shield },
];

const EQUIPMENT_SLOT_LABELS: Record<string, { label: string; icon: typeof Sword }> = {
  mainHand: { label: "Main Hand", icon: Sword },
  offHand: { label: "Off Hand", icon: Shield },
  head: { label: "Head", icon: Shield },
  chest: { label: "Chest", icon: Shirt },
  legs: { label: "Legs", icon: Shirt },
  feet: { label: "Feet", icon: Shirt },
};

function sanitizeName(raw: string): string {
  const alpha = raw.replace(/[^a-zA-Z]/g, "");
  if (alpha.length === 0) return "";
  return alpha.charAt(0).toUpperCase() + alpha.slice(1).toLowerCase();
}

// ─── Character Detail Panel ───────────────────────────────────────────────

function CharacterDetailPanel({ char }: { char: CharacterSummary }) {
  const baseStats = char.baseStats;
  const equipment = char.equipment;
  const statPointsAvailable = char.statPointsAvailable;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h2
          className="text-accent-gold font-serif mb-1"
          style={{ fontSize: "1.75rem" }}
        >
          {char.name}
        </h2>
        <p className="text-text-secondary text-sm font-sans">
          📍 {char.startingZoneName}
          {char.factionName && (
            <span className="text-text-disabled ml-2">— {char.factionName}</span>
          )}
        </p>
      </div>

      {/* Stats Section */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h3
            className="text-text-primary font-serif"
            style={{ fontSize: "1.125rem" }}
          >
            Base Stats
          </h3>
          {(statPointsAvailable ?? 0) > 0 && (
            <span className="px-2 py-0.5 bg-accent-gold/20 text-accent-gold text-xs rounded font-sans font-medium">
              {statPointsAvailable} points available
            </span>
          )}
        </div>
        {baseStats ? (
          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
            {STAT_LABELS.map(({ key, label, icon: Icon }) => (
              <div
                key={key}
                className="flex items-center justify-between bg-bg-elevated border border-border-muted rounded px-3 py-2"
              >
                <span className="flex items-center gap-2 text-text-secondary text-sm font-sans">
                  <Icon className="w-3.5 h-3.5 text-text-disabled" />
                  {label}
                </span>
                <span className="text-accent-gold font-sans text-sm font-medium tabular-nums">
                  {baseStats[key] ?? 0}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-text-disabled text-sm italic font-sans">
            Stats not yet available.
          </p>
        )}
      </section>

      {/* Equipment Section */}
      <section>
        <h3
          className="text-text-primary font-serif mb-4"
          style={{ fontSize: "1.125rem" }}
        >
          Equipment
        </h3>
        {equipment ? (
          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
            {Object.entries(EQUIPMENT_SLOT_LABELS).map(
              ([slot, { label, icon: Icon }]) => {
                const item = equipment[slot];
                return (
                  <div
                    key={slot}
                    className="flex items-center justify-between bg-bg-elevated border border-border-muted rounded px-3 py-2"
                  >
                    <span className="flex items-center gap-2 text-text-secondary text-sm font-sans">
                      <Icon className="w-3.5 h-3.5 text-text-disabled" />
                      {label}
                    </span>
                    {item ? (
                      <span className="text-accent-gold text-sm font-sans">
                        {item.name}
                      </span>
                    ) : (
                      <span className="text-text-disabled text-sm italic font-sans">
                        Empty
                      </span>
                    )}
                  </div>
                );
              },
            )}
          </div>
        ) : (
          <p className="text-text-disabled text-sm italic font-sans">
            Equipment not yet available.
          </p>
        )}
      </section>

      {/* Skills Section (moved from card pills) */}
      {(char.topSkills?.length ?? 0) > 0 && (
        <section>
          <h3
            className="text-text-primary font-serif mb-4"
            style={{ fontSize: "1.125rem" }}
          >
            Trained Skills
          </h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
            {char.topSkills.map((skill) => (
              <div
                key={skill.name}
                className="flex items-center justify-between bg-bg-elevated border border-border-muted rounded px-3 py-2"
              >
                <span className="text-text-secondary text-sm font-sans">
                  {skill.name}
                </span>
                <span className="text-accent-gold font-sans text-sm font-medium tabular-nums">
                  {skill.level}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────

export default function CharacterSelect() {
  const token = useAppStore(s => s.token);
  const username = useAppStore(s => s.username);
  const email = useAppStore(s => s.email);
  const dispatch = useAppStore(s => s.dispatch);
  const navigate = useNavigate();

  const [characters, setCharacters] = useState<CharacterSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newCharName, setNewCharName] = useState(generateRandomName);
  const [selectedZone, setSelectedZone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [highlightedCharId, setHighlightedCharId] = useState<string | null>(null);


  const highlightedChar = characters.find((c) => c.id === highlightedCharId) ?? null;

  const loadCharacters = useCallback(async () => {
    setError(null);
    try {
      const chars = await fetchCharacters(token!);
      setCharacters(chars);
      if (chars.length === 0) setIsCreating(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load characters.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadCharacters();
  }, [loadCharacters]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = sanitizeName(newCharName);
    if (name.length < 2 || !selectedZone) return;

    setSubmitting(true);
    setError(null);
    try {
      await createCharacter(token!, { name, startingZoneSlug: selectedZone });
      const chars = await fetchCharacters(token!);
      setCharacters(chars);
      setNewCharName(generateRandomName());
      setSelectedZone("");
      setIsCreating(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create character.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelect = async (char: CharacterSummary) => {
    setSubmitting(true);
    setError(null);
    try {
      const selected = await selectCharacter(token!, char.id);
      dispatch({ type: "SET_ACTIVE_CHARACTER", character: selected });
      navigate("/zone");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to select character.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (charId: string) => {
    if (deleteConfirm !== charId) {
      setDeleteConfirm(charId);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await deleteCharacter(token!, charId);
      setCharacters((prev) => prev.filter((c) => c.id !== charId));
      setDeleteConfirm(null);
      if (highlightedCharId === charId) setHighlightedCharId(null);
      if (characters.length <= 1) setIsCreating(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete character.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    if (token) {
      try {
        await apiLogout(token);
      } catch {
        /* best effort */
      }
    }
    dispatch({ type: "LOGOUT" });
    navigate("/");
  };

  // ─── Loading State ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <p className="text-text-secondary italic font-serif text-lg animate-pulse">
          Searching the ledger...
        </p>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      {/* Top bar */}
      <div className="bg-bg-panel border-b border-border-muted px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
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
            onClick={() => navigate("/settings")}
            className="text-text-secondary hover:text-accent-gold transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={handleLogout}
            className="text-text-secondary hover:text-danger transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex">
      {/* Left panel — Character list */}
      <div className="w-[40%] bg-bg-panel border-r border-border-muted p-8 overflow-y-auto">
        <h2
          className="text-accent-gold mb-6 font-serif"
          style={{ fontSize: "1.5rem" }}
        >
          Your Characters
        </h2>

        {error && (
          <div
            className="text-danger text-sm px-4 py-2 bg-danger/10 border border-danger/30 rounded font-sans mb-4"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="space-y-4">
          {characters.map((char) => {
            const isHighlighted = highlightedCharId === char.id;
            return (
              <div
                key={char.id}
                onClick={() => {
                  setHighlightedCharId(char.id);
                  setIsCreating(false);
                  setDeleteConfirm(null);
                }}
                className={`bg-bg-elevated border rounded-lg p-4 cursor-pointer transition-all ${
                  isHighlighted
                    ? "border-accent-gold shadow-[0_0_12px_rgba(212,175,55,0.25)]"
                    : "border-border-muted hover:border-accent-gold/50"
                }`}
              >
                <h3
                  className="text-accent-gold mb-1 font-serif"
                  style={{ fontSize: "1.25rem" }}
                >
                  {char.name}
                </h3>
                <p className="text-text-secondary text-sm font-sans mb-1">
                  📍 {char.startingZoneName}
                </p>
                {char.factionName && (
                  <p className="text-text-disabled text-xs font-sans mb-1">
                    {char.factionName}
                  </p>
                )}

                {char.lastPlayedAt && (
                  <p className="text-text-disabled text-xs font-sans mb-1">
                    Last played: {new Date(char.lastPlayedAt).toLocaleDateString()}
                  </p>
                )}

                {typeof char.totalRuns === "number" && (
                  <p className="text-text-disabled text-xs font-sans mb-3">
                    Total runs: {char.totalRuns}
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(char);
                    }}
                    disabled={submitting}
                    className="flex-1 bg-accent-gold hover:bg-accent-gold/90 text-bg-primary font-medium py-2 rounded transition-colors disabled:opacity-50 font-sans"
                  >
                    Enter World
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(char.id);
                    }}
                    disabled={submitting}
                    className={`px-3 py-2 rounded transition-colors font-sans text-sm ${
                      deleteConfirm === char.id
                        ? "bg-danger text-white"
                        : "border border-border-muted text-text-secondary hover:text-danger hover:border-danger"
                    }`}
                  >
                    {deleteConfirm === char.id ? "Confirm?" : "Delete"}
                  </button>
                </div>
              </div>
            );
          })}

          <button
            onClick={() => {
              setIsCreating(true);
              setHighlightedCharId(null);
              setNewCharName(generateRandomName());
              setDeleteConfirm(null);
            }}
            className="w-full border-2 border-dashed border-border-muted hover:border-accent-gold text-text-secondary hover:text-accent-gold py-6 rounded-lg transition-colors font-sans"
          >
            + New Character
          </button>
        </div>
      </div>

      {/* Right panel — Detail / Creation / Placeholder */}
      <div className="flex-1 p-8 overflow-y-auto">
        {isCreating ? (
          <div className="max-w-3xl mx-auto">
            <h2
              className="text-accent-gold mb-6 font-serif"
              style={{ fontSize: "1.5rem" }}
            >
              Create New Character
            </h2>

            <form onSubmit={handleCreate} className="space-y-6">
              <div>
                <label
                  htmlFor="charName"
                  className="block text-text-secondary text-sm mb-2 font-sans"
                >
                  Character Name{" "}
                  <span className="text-text-disabled">(letters only)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    id="charName"
                    type="text"
                    value={newCharName}
                    onChange={(e) => setNewCharName(sanitizeName(e.target.value))}
                    placeholder="Vex"
                    minLength={2}
                    maxLength={24}
                    className="flex-1 bg-bg-elevated border border-border-muted rounded px-4 py-2 text-text-primary focus:border-accent-gold focus:outline-none transition-colors font-sans"
                    disabled={submitting}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setNewCharName(generateRandomName())}
                    disabled={submitting}
                    className="px-3 py-2 bg-bg-elevated border border-border-muted rounded text-text-secondary hover:text-accent-gold hover:border-accent-gold transition-colors disabled:opacity-50"
                    title="Generate random name"
                  >
                    <Dices className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-text-secondary text-sm mb-4 font-sans">
                  Where Do You Wake Up?
                </label>
                <div className="grid gap-4">
                  {STARTING_ZONES.map((z) => (
                    <div
                      key={z.slug}
                      onClick={() => !submitting && setSelectedZone(z.slug)}
                      className={`bg-bg-elevated border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedZone === z.slug
                          ? "border-accent-gold"
                          : "border-border-muted hover:border-interactive"
                      }`}
                    >
                      <h3
                        className="text-text-primary mb-1 font-serif"
                        style={{ fontSize: "1.125rem" }}
                      >
                        🧭 {z.name}
                      </h3>
                      <p className="text-text-disabled text-xs font-sans mb-1">
                        {z.faction}
                      </p>
                      <p className="text-text-secondary text-sm font-sans">
                        {z.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                {characters.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="flex-1 border border-border-muted hover:bg-bg-elevated text-text-secondary hover:text-text-primary py-3 rounded transition-colors font-sans"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={newCharName.length < 2 || !selectedZone || submitting}
                  className="flex-1 bg-accent-gold hover:bg-accent-gold/90 text-bg-primary font-medium py-3 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-sans"
                >
                  {submitting ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        ) : highlightedChar ? (
          <CharacterDetailPanel char={highlightedChar} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p
              className="text-text-disabled italic text-center font-serif"
              style={{ fontSize: "1.125rem" }}
            >
              Select a character to view details, or create a new one.
            </p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
