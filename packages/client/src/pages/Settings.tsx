import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  User,
  Monitor,
  BookOpen,
  Volume2,
  Keyboard,
  Accessibility,
  LogOut,
} from "lucide-react";
import { logout as apiLogout } from "../services/api";
import { useAppContext } from "../store";

type SettingCategory =
  | "account"
  | "display"
  | "narration"
  | "audio"
  | "keybinds"
  | "accessibility";

const categories: {
  id: SettingCategory;
  label: string;
  icon: React.ReactNode;
}[] = [
  { id: "account", label: "Account", icon: <User className="w-4 h-4" /> },
  { id: "display", label: "Display", icon: <Monitor className="w-4 h-4" /> },
  {
    id: "narration",
    label: "Narration",
    icon: <BookOpen className="w-4 h-4" />,
  },
  { id: "audio", label: "Audio", icon: <Volume2 className="w-4 h-4" /> },
  {
    id: "keybinds",
    label: "Keybinds",
    icon: <Keyboard className="w-4 h-4" />,
  },
  {
    id: "accessibility",
    label: "Accessibility",
    icon: <Accessibility className="w-4 h-4" />,
  },
];

export default function Settings() {
  const { state, dispatch } = useAppContext();
  const [activeCategory, setActiveCategory] =
    useState<SettingCategory>("narration");
  const [fontSize, setFontSize] = useState(() =>
    Number(localStorage.getItem("ellmud_fontSize") ?? 16)
  );
  const [verbosity, setVerbosity] = useState(() =>
    localStorage.getItem("ellmud_verbosity") ?? "standard"
  );
  const [narrationStyle, setNarrationStyle] = useState(() =>
    localStorage.getItem("ellmud_narrationStyle") ?? "default"
  );
  const [loggingOut, setLoggingOut] = useState(false);
  const navigate = useNavigate();

  // Persist display preferences to localStorage
  useEffect(() => {
    localStorage.setItem("ellmud_fontSize", String(fontSize));
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem("ellmud_verbosity", verbosity);
  }, [verbosity]);

  useEffect(() => {
    localStorage.setItem("ellmud_narrationStyle", narrationStyle);
  }, [narrationStyle]);

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    try {
      if (state.token) {
        await apiLogout(state.token);
      }
    } catch {
      // Server may be unreachable — still clear local state
    } finally {
      dispatch({ type: "LOGOUT" });
      navigate("/");
    }
  }, [state.token, dispatch, navigate]);

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Top bar */}
      <div className="bg-bg-panel border-b border-border-muted px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/zone")}
            className="text-text-secondary hover:text-accent-gold transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1
            className="text-accent-gold font-serif"
            style={{ fontSize: "1.25rem" }}
          >
            Settings
          </h1>
        </div>
      </div>

      <div className="flex h-[calc(100vh-60px)]">
        {/* Left sidebar - Categories */}
        <div className="w-64 bg-bg-panel border-r border-border-muted p-4">
          <div className="space-y-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded transition-colors ${
                  activeCategory === cat.id
                    ? "bg-bg-elevated text-accent-gold"
                    : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
                } font-sans`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right content */}
        <div className="flex-1 p-8 overflow-y-auto">
          {/* Account */}
          {activeCategory === "account" && (
            <div className="max-w-2xl">
              <h2
                className="text-accent-gold mb-6 font-serif"
                style={{ fontSize: "1.5rem" }}
              >
                Account Settings
              </h2>
              <div className="space-y-6">
                <div>
                  <label
                    className="block text-text-secondary text-sm mb-2 font-sans"
                  >
                    Username
                  </label>
                  <input
                    type="text"
                    value={state.username ?? "Unknown"}
                    readOnly
                    className="w-full bg-bg-elevated border border-border-muted rounded px-4 py-2 text-text-primary font-sans"
                  />
                </div>
                <div>
                  <label
                    className="block text-text-secondary text-sm mb-2 font-sans"
                  >
                    Player ID
                  </label>
                  <input
                    type="text"
                    value={state.playerId ?? "Unknown"}
                    readOnly
                    className="w-full bg-bg-elevated border border-border-muted rounded px-4 py-2 text-text-disabled font-mono text-xs"
                  />
                </div>
                <div>
                  <label
                    className="block text-text-secondary text-sm mb-2 font-sans"
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="your.email@example.com"
                    className="w-full bg-bg-elevated border border-border-muted rounded px-4 py-2 text-text-primary focus:border-accent-gold focus:outline-none font-sans"
                  />
                </div>

                <div className="pt-4 border-t border-border-muted">
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="flex items-center gap-2 px-6 py-3 bg-danger/20 border border-danger/40 text-danger hover:bg-danger/30 rounded transition-colors disabled:opacity-50 font-sans"
                  >
                    <LogOut className="w-4 h-4" />
                    {loggingOut ? "Logging out..." : "Logout"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Display */}
          {activeCategory === "display" && (
            <div className="max-w-2xl">
              <h2
                className="text-accent-gold mb-6 font-serif"
                style={{ fontSize: "1.5rem" }}
              >
                Display Settings
              </h2>
              <div className="space-y-6">
                <div>
                  <label
                    className="block text-text-secondary text-sm mb-2 font-sans"
                  >
                    Narrative Font Size
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="12"
                      max="24"
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span
                      className="text-text-primary w-12 font-mono"
                    >
                      {fontSize}px
                    </span>
                  </div>
                </div>

                <div>
                  <label
                    className="block text-text-secondary text-sm mb-2 font-sans"
                  >
                    Panel Layout
                  </label>
                  <div className="flex gap-4">
                    <button
                      className="flex-1 px-4 py-2 bg-bg-elevated border border-accent-gold text-text-primary rounded font-sans"
                    >
                      Sidebar Right
                    </button>
                    <button
                      className="flex-1 px-4 py-2 bg-bg-panel border border-border-muted text-text-secondary hover:border-interactive rounded font-sans"
                    >
                      Sidebar Left
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label
                    className="text-text-secondary text-sm font-sans"
                  >
                    High Contrast Mode
                  </label>
                  <button
                    className="w-12 h-6 bg-border-muted rounded-full relative transition-colors font-sans"
                  >
                    <div className="w-4 h-4 bg-text-secondary rounded-full absolute left-1 top-1"></div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Narration */}
          {activeCategory === "narration" && (
            <div className="max-w-2xl">
              <h2
                className="text-accent-gold mb-6 font-serif"
                style={{ fontSize: "1.5rem" }}
              >
                Narration Settings
              </h2>
              <div className="space-y-6">
                <div>
                  <label
                    className="block text-text-secondary text-sm mb-3 font-sans"
                  >
                    Verbosity
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-start gap-3 p-4 bg-bg-panel border border-border-muted rounded hover:border-interactive cursor-pointer">
                      <input
                        type="radio"
                        name="verbosity"
                        value="terse"
                        checked={verbosity === "terse"}
                        onChange={(e) => setVerbosity(e.target.value)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p
                          className="text-text-primary mb-1 font-sans"
                        >
                          Terse
                        </p>
                        <p
                          className="text-text-secondary text-sm font-serif"
                          style={{ lineHeight: 1.5 }}
                        >
                          "Dark room. Water ankle-deep. Exits north, east."
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-4 bg-bg-panel border border-accent-gold rounded cursor-pointer">
                      <input
                        type="radio"
                        name="verbosity"
                        value="standard"
                        checked={verbosity === "standard"}
                        onChange={(e) => setVerbosity(e.target.value)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p
                          className="text-text-primary mb-1 font-sans"
                        >
                          Standard
                        </p>
                        <p
                          className="text-text-secondary text-sm font-serif"
                          style={{ lineHeight: 1.5 }}
                        >
                          "The chamber is dark, water pooling at your feet. Passages lead north and east."
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-4 bg-bg-panel border border-border-muted rounded hover:border-interactive cursor-pointer">
                      <input
                        type="radio"
                        name="verbosity"
                        value="verbose"
                        checked={verbosity === "verbose"}
                        onChange={(e) => setVerbosity(e.target.value)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p
                          className="text-text-primary mb-1 font-sans"
                        >
                          Verbose
                        </p>
                        <p
                          className="text-text-secondary text-sm font-serif"
                          style={{ lineHeight: 1.5 }}
                        >
                          "You find yourself in a darkened chamber. Brackish water pools around your boots, cold and still. The walls show signs of ancient stonework, now crumbling. Two passages beckon..."
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <label
                    className="block text-text-secondary text-sm mb-3 font-sans"
                  >
                    Narration Style
                  </label>
                  <select
                    value={narrationStyle}
                    onChange={(e) => setNarrationStyle(e.target.value)}
                    className="w-full bg-bg-elevated border border-border-muted rounded px-4 py-2 text-text-primary focus:border-accent-gold focus:outline-none font-sans"
                  >
                    <option value="default">Default</option>
                    <option value="gothic">Gothic</option>
                    <option value="noir">Noir</option>
                    <option value="clinical">Clinical</option>
                  </select>
                  <p className="text-text-disabled text-xs mt-2 font-sans">
                    Premium styles available with subscription
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Audio */}
          {activeCategory === "audio" && (
            <div className="max-w-2xl">
              <h2
                className="text-accent-gold mb-6 font-serif"
                style={{ fontSize: "1.5rem" }}
              >
                Audio Settings
              </h2>
              <p className="text-text-secondary font-sans">
                Audio features coming soon...
              </p>
            </div>
          )}

          {/* Keybinds */}
          {activeCategory === "keybinds" && (
            <div className="max-w-2xl">
              <h2
                className="text-accent-gold mb-6 font-serif"
                style={{ fontSize: "1.5rem" }}
              >
                Keybinds
              </h2>
              <div className="space-y-3">
                {[
                  { action: "Strike", key: "1" },
                  { action: "Heavy Strike", key: "2" },
                  { action: "Dodge", key: "3" },
                  { action: "Block", key: "4" },
                  { action: "Use Item", key: "5" },
                  { action: "Flee", key: "6" },
                  { action: "Observe", key: "7" },
                ].map((bind) => (
                  <div
                    key={bind.action}
                    className="flex items-center justify-between p-3 bg-bg-panel border border-border-muted rounded"
                  >
                    <span
                      className="text-text-primary font-sans"
                    >
                      {bind.action}
                    </span>
                    <div
                      className="px-3 py-1 bg-bg-elevated border border-border-muted rounded text-accent-gold min-w-[40px] text-center font-mono"
                    >
                      {bind.key}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Accessibility */}
          {activeCategory === "accessibility" && (
            <div className="max-w-2xl">
              <h2
                className="text-accent-gold mb-6 font-serif"
                style={{ fontSize: "1.5rem" }}
              >
                Accessibility
              </h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className="text-text-primary mb-1 font-sans"
                    >
                      Screen Reader Mode
                    </p>
                    <p
                      className="text-text-secondary text-sm font-sans"
                    >
                      Optimizes text output for screen readers
                    </p>
                  </div>
                  <button
                    className="w-12 h-6 bg-border-muted rounded-full relative transition-colors font-sans"
                  >
                    <div className="w-4 h-4 bg-text-secondary rounded-full absolute left-1 top-1"></div>
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className="text-text-primary mb-1 font-sans"
                    >
                      Disable Color-Dependent Information
                    </p>
                    <p
                      className="text-text-secondary text-sm font-sans"
                    >
                      Uses text labels instead of color coding
                    </p>
                  </div>
                  <button
                    className="w-12 h-6 bg-border-muted rounded-full relative transition-colors font-sans"
                  >
                    <div className="w-4 h-4 bg-text-secondary rounded-full absolute left-1 top-1"></div>
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className="text-text-primary mb-1 font-sans"
                    >
                      Reduce Animations
                    </p>
                    <p
                      className="text-text-secondary text-sm font-sans"
                    >
                      Minimizes motion effects throughout the UI
                    </p>
                  </div>
                  <button
                    className="w-12 h-6 bg-border-muted rounded-full relative transition-colors font-sans"
                  >
                    <div className="w-4 h-4 bg-text-secondary rounded-full absolute left-1 top-1"></div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
