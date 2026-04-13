import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { Settings, LogOut, Dices, Skull } from "lucide-react";
import { useAppContext } from "../store";
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

function sanitizeName(raw: string): string {
  const alpha = raw.replace(/[^a-zA-Z]/g, "");
  if (alpha.length === 0) return "";
  return alpha.charAt(0).toUpperCase() + alpha.slice(1).toLowerCase();
}

export default function CharacterSelect() {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();

  const [characters, setCharacters] = useState<CharacterSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newCharName, setNewCharName] = useState(generateRandomName);
  const [selectedZone, setSelectedZone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const token = state.token!;

  const loadCharacters = useCallback(async () => {
    setError(null);
    try {
      const chars = await fetchCharacters(token);
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
      await createCharacter(token, { name, startingZoneSlug: selectedZone });
      // Reload full list to get complete character data (topSkills, startingZoneName, etc.)
      const chars = await fetchCharacters(token);
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
      const selected = await selectCharacter(token, char.id);
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
      await deleteCharacter(token, charId);
      setCharacters((prev) => prev.filter((c) => c.id !== charId));
      setDeleteConfirm(null);
      if (characters.length <= 1) setIsCreating(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete character.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    if (state.token) {
      try {
        await apiLogout(state.token);
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
            {state.username ?? state.email ?? "Unknown"}
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
          {characters.map((char) => (
            <div
              key={char.id}
              className="bg-bg-elevated border border-border-muted rounded-lg p-4 hover:border-accent-gold transition-colors"
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

              {(char.topSkills?.length ?? 0) > 0 && (
                <div className="flex gap-2 mb-2 flex-wrap">
                  {char.topSkills.map((skill) => (
                    <span
                      key={skill.name}
                      className="px-2 py-0.5 bg-bg-primary text-text-secondary text-xs rounded font-sans"
                    >
                      {skill.name} {skill.level}
                    </span>
                  ))}
                </div>
              )}

              {char.lastPlayedAt && (
                <p className="text-text-disabled text-xs mb-3 font-sans">
                  Last played: {new Date(char.lastPlayedAt).toLocaleDateString()}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handleSelect(char)}
                  disabled={submitting}
                  className="flex-1 bg-accent-gold hover:bg-accent-gold/90 text-bg-primary font-medium py-2 rounded transition-colors disabled:opacity-50 font-sans"
                >
                  Enter World
                </button>
                <button
                  onClick={() => handleDelete(char.id)}
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
          ))}

          <button
            onClick={() => {
              setIsCreating(true);
              setNewCharName(generateRandomName());
              setDeleteConfirm(null);
            }}
            className="w-full border-2 border-dashed border-border-muted hover:border-accent-gold text-text-secondary hover:text-accent-gold py-6 rounded-lg transition-colors font-sans"
          >
            + New Character
          </button>
        </div>
      </div>

      {/* Right panel — Character creation */}
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
        ) : (
          <div className="flex items-center justify-center h-full">
            <p
              className="text-text-disabled italic text-center font-serif"
              style={{ fontSize: "1.125rem" }}
            >
              Select a character or create a new one.
            </p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
