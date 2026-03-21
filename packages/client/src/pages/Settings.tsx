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
    <div className="min-h-screen bg-[#0A0B0F]">
      {/* Top bar */}
      <div className="bg-[#12131A] border-b border-[#2A2B35] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/refuge")}
            className="text-[#8A8B95] hover:text-[#C9A84C] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1
            className="text-[#C9A84C]"
            style={{ fontFamily: "var(--font-serif)", fontSize: "1.25rem" }}
          >
            Settings
          </h1>
        </div>
      </div>

      <div className="flex h-[calc(100vh-60px)]">
        {/* Left sidebar - Categories */}
        <div className="w-64 bg-[#12131A] border-r border-[#2A2B35] p-4">
          <div className="space-y-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded transition-colors ${
                  activeCategory === cat.id
                    ? "bg-[#1C1D27] text-[#C9A84C]"
                    : "text-[#8A8B95] hover:bg-[#1C1D27] hover:text-[#E8E0D0]"
                }`}
                style={{ fontFamily: "var(--font-sans)" }}
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
                className="text-[#C9A84C] mb-6"
                style={{ fontFamily: "var(--font-serif)", fontSize: "1.5rem" }}
              >
                Account Settings
              </h2>
              <div className="space-y-6">
                <div>
                  <label
                    className="block text-[#8A8B95] text-sm mb-2"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Player ID
                  </label>
                  <input
                    type="text"
                    value={state.playerId ?? "Unknown"}
                    readOnly
                    className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-4 py-2 text-[#4A4B55]"
                    style={{ fontFamily: "var(--font-sans)" }}
                  />
                </div>
                <div>
                  <label
                    className="block text-[#8A8B95] text-sm mb-2"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="your.email@example.com"
                    className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-4 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                    style={{ fontFamily: "var(--font-sans)" }}
                  />
                </div>

                <div className="pt-4 border-t border-[#2A2B35]">
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="flex items-center gap-2 px-6 py-3 bg-[#8B2500]/20 border border-[#8B2500]/40 text-[#8B2500] hover:bg-[#8B2500]/30 rounded transition-colors disabled:opacity-50"
                    style={{ fontFamily: "var(--font-sans)" }}
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
                className="text-[#C9A84C] mb-6"
                style={{ fontFamily: "var(--font-serif)", fontSize: "1.5rem" }}
              >
                Display Settings
              </h2>
              <div className="space-y-6">
                <div>
                  <label
                    className="block text-[#8A8B95] text-sm mb-2"
                    style={{ fontFamily: "var(--font-sans)" }}
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
                      className="text-[#E8E0D0] w-12"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {fontSize}px
                    </span>
                  </div>
                </div>

                <div>
                  <label
                    className="block text-[#8A8B95] text-sm mb-2"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Panel Layout
                  </label>
                  <div className="flex gap-4">
                    <button
                      className="flex-1 px-4 py-2 bg-[#1C1D27] border border-[#C9A84C] text-[#E8E0D0] rounded"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Sidebar Right
                    </button>
                    <button
                      className="flex-1 px-4 py-2 bg-[#12131A] border border-[#2A2B35] text-[#8A8B95] hover:border-[#3A7D7B] rounded"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Sidebar Left
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label
                    className="text-[#8A8B95] text-sm"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    High Contrast Mode
                  </label>
                  <button
                    className="w-12 h-6 bg-[#2A2B35] rounded-full relative transition-colors"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    <div className="w-4 h-4 bg-[#8A8B95] rounded-full absolute left-1 top-1"></div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Narration */}
          {activeCategory === "narration" && (
            <div className="max-w-2xl">
              <h2
                className="text-[#C9A84C] mb-6"
                style={{ fontFamily: "var(--font-serif)", fontSize: "1.5rem" }}
              >
                Narration Settings
              </h2>
              <div className="space-y-6">
                <div>
                  <label
                    className="block text-[#8A8B95] text-sm mb-3"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Verbosity
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-start gap-3 p-4 bg-[#12131A] border border-[#2A2B35] rounded hover:border-[#3A7D7B] cursor-pointer">
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
                          className="text-[#E8E0D0] mb-1"
                          style={{ fontFamily: "var(--font-sans)" }}
                        >
                          Terse
                        </p>
                        <p
                          className="text-[#8A8B95] text-sm"
                          style={{
                            fontFamily: "var(--font-serif)",
                            lineHeight: 1.5,
                          }}
                        >
                          "Dark room. Water ankle-deep. Exits north, east."
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-4 bg-[#12131A] border border-[#C9A84C] rounded cursor-pointer">
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
                          className="text-[#E8E0D0] mb-1"
                          style={{ fontFamily: "var(--font-sans)" }}
                        >
                          Standard
                        </p>
                        <p
                          className="text-[#8A8B95] text-sm"
                          style={{
                            fontFamily: "var(--font-serif)",
                            lineHeight: 1.5,
                          }}
                        >
                          "The chamber is dark, water pooling at your feet. Passages lead north and east."
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-4 bg-[#12131A] border border-[#2A2B35] rounded hover:border-[#3A7D7B] cursor-pointer">
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
                          className="text-[#E8E0D0] mb-1"
                          style={{ fontFamily: "var(--font-sans)" }}
                        >
                          Verbose
                        </p>
                        <p
                          className="text-[#8A8B95] text-sm"
                          style={{
                            fontFamily: "var(--font-serif)",
                            lineHeight: 1.5,
                          }}
                        >
                          "You find yourself in a darkened chamber. Brackish water pools around your boots, cold and still. The walls show signs of ancient stonework, now crumbling. Two passages beckon..."
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <label
                    className="block text-[#8A8B95] text-sm mb-3"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Narration Style
                  </label>
                  <select
                    value={narrationStyle}
                    onChange={(e) => setNarrationStyle(e.target.value)}
                    className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-4 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    <option value="default">Default</option>
                    <option value="gothic">Gothic</option>
                    <option value="noir">Noir</option>
                    <option value="clinical">Clinical</option>
                  </select>
                  <p
                    className="text-[#4A4B55] text-xs mt-2"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
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
                className="text-[#C9A84C] mb-6"
                style={{ fontFamily: "var(--font-serif)", fontSize: "1.5rem" }}
              >
                Audio Settings
              </h2>
              <p
                className="text-[#8A8B95]"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Audio features coming soon...
              </p>
            </div>
          )}

          {/* Keybinds */}
          {activeCategory === "keybinds" && (
            <div className="max-w-2xl">
              <h2
                className="text-[#C9A84C] mb-6"
                style={{ fontFamily: "var(--font-serif)", fontSize: "1.5rem" }}
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
                    className="flex items-center justify-between p-3 bg-[#12131A] border border-[#2A2B35] rounded"
                  >
                    <span
                      className="text-[#E8E0D0]"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      {bind.action}
                    </span>
                    <div
                      className="px-3 py-1 bg-[#1C1D27] border border-[#2A2B35] rounded text-[#C9A84C] min-w-[40px] text-center"
                      style={{ fontFamily: "var(--font-mono)" }}
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
                className="text-[#C9A84C] mb-6"
                style={{ fontFamily: "var(--font-serif)", fontSize: "1.5rem" }}
              >
                Accessibility
              </h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className="text-[#E8E0D0] mb-1"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Screen Reader Mode
                    </p>
                    <p
                      className="text-[#8A8B95] text-sm"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Optimizes text output for screen readers
                    </p>
                  </div>
                  <button
                    className="w-12 h-6 bg-[#2A2B35] rounded-full relative transition-colors"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    <div className="w-4 h-4 bg-[#8A8B95] rounded-full absolute left-1 top-1"></div>
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className="text-[#E8E0D0] mb-1"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Disable Color-Dependent Information
                    </p>
                    <p
                      className="text-[#8A8B95] text-sm"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Uses text labels instead of color coding
                    </p>
                  </div>
                  <button
                    className="w-12 h-6 bg-[#2A2B35] rounded-full relative transition-colors"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    <div className="w-4 h-4 bg-[#8A8B95] rounded-full absolute left-1 top-1"></div>
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className="text-[#E8E0D0] mb-1"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Reduce Animations
                    </p>
                    <p
                      className="text-[#8A8B95] text-sm"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Minimizes motion effects throughout the UI
                    </p>
                  </div>
                  <button
                    className="w-12 h-6 bg-[#2A2B35] rounded-full relative transition-colors"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    <div className="w-4 h-4 bg-[#8A8B95] rounded-full absolute left-1 top-1"></div>
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
