import { useState, useCallback } from "react";
import { useNavigate, Navigate } from "react-router";
import { login, register, ApiError } from "../services/api";
import { useAppContext } from "../store";

export default function Login() {
  const { state, dispatch } = useAppContext();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Already authenticated — skip straight to refuge
  if (state.authenticated) {
    return <Navigate to="/refuge" replace />;
  }

  const switchMode = useCallback((registerMode: boolean) => {
    setIsRegister(registerMode);
    setError(null);
    setConfirmPassword("");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isRegister && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const authFn = isRegister ? register : login;
      const result = await authFn(username, password);
      dispatch({ type: "LOGIN_SUCCESS", token: result.token, playerId: result.playerId });
      navigate("/refuge");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Connection failed. Is the server running?");
      }
    } finally {
      setLoading(false);
    }
  };

  const flavorTexts = [
    "The ground trembles. Another shard opens.",
    "Deep below, something stirs in the darkness.",
    "The Refuge calls to those who would risk everything.",
    "Shadows lengthen. Time grows short.",
  ];

  const [flavorText] = useState(
    flavorTexts[Math.floor(Math.random() * flavorTexts.length)]
  );

  return (
    <div className="min-h-screen bg-[#0A0B0F] flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Subtle background texture */}
      <div className="absolute inset-0 opacity-5 bg-gradient-to-b from-[#1C1D27] to-transparent"></div>

      {/* Main card */}
      <div className="relative z-10 w-full max-w-[480px] bg-[#12131A] border border-[#2A2B35] rounded-lg shadow-2xl p-8">
        {/* Title */}
        <h1
          className="text-center mb-2 tracking-[0.2em] text-[#C9A84C]"
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "2.5rem",
            fontWeight: 700,
          }}
        >
          ELLMUD
        </h1>

        <p
          className="text-center text-[#8A8B95] mb-8 italic"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          The shards are calling.
        </p>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-[#2A2B35]">
          <button
            onClick={() => switchMode(false)}
            className={`pb-2 px-4 transition-colors ${
              !isRegister
                ? "border-b-2 border-[#C9A84C] text-[#C9A84C]"
                : "text-[#8A8B95] hover:text-[#E8E0D0]"
            }`}
            style={{ fontFamily: "var(--font-sans)" }}
          >
            Login
          </button>
          <button
            onClick={() => switchMode(true)}
            className={`pb-2 px-4 transition-colors ${
              isRegister
                ? "border-b-2 border-[#C9A84C] text-[#C9A84C]"
                : "text-[#8A8B95] hover:text-[#E8E0D0]"
            }`}
            style={{ fontFamily: "var(--font-sans)" }}
          >
            Register
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-[#8A8B95] text-sm mb-2"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-4 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none transition-colors"
              style={{ fontFamily: "var(--font-sans)" }}
              disabled={loading}
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-[#8A8B95] text-sm mb-2"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-4 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none transition-colors"
              style={{ fontFamily: "var(--font-sans)" }}
              disabled={loading}
              required
            />
          </div>

          {isRegister && (
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-[#8A8B95] text-sm mb-2"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-4 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none transition-colors"
                style={{ fontFamily: "var(--font-sans)" }}
                disabled={loading}
                required
              />
            </div>
          )}

          {error && (
            <div
              className="text-[#8B2500] text-sm px-4 py-2 bg-[#8B2500]/10 border border-[#8B2500]/30 rounded"
              role="alert"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#C9A84C] hover:bg-[#B89840] text-[#0A0B0F] font-medium py-3 rounded transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            {loading
              ? "Connecting..."
              : isRegister
                ? "Create Shardwalker"
                : "Enter the Refuge"}
          </button>
        </form>
      </div>

      {/* Flavor text */}
      <p
        className="relative z-10 mt-6 text-[#8A8B95] text-sm italic text-center"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        {flavorText}
      </p>
    </div>
  );
}
