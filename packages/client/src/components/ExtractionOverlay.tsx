import { useNavigate } from "react-router";

interface ExtractionOverlayProps {
  state: "in-progress" | "success" | "death" | null;
  progress: number;
  onClose?: () => void;
}

export default function ExtractionOverlay({
  state,
  progress,
}: ExtractionOverlayProps) {
  const navigate = useNavigate();

  if (!state) return null;

  if (state === "in-progress") {
    return (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
        <div className="w-[60%] pointer-events-auto">
          <h3
            className="text-[#E8E0D0] text-center mb-4"
            style={{ fontFamily: "var(--font-serif)", fontSize: "1.25rem" }}
          >
            Extraction Ritual — Hold Your Ground
          </h3>

          {/* Progress bar */}
          <div className="h-2 bg-[#12131A] rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-[#C9A84C] transition-all duration-500"
              style={{
                width: `${progress}%`,
                animation: "pulse 2s ease-in-out infinite",
              }}
            ></div>
          </div>

          <p
            className="text-[#B8860B] text-center text-sm"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            Noise generated: HIGH — nearby entities may investigate.
          </p>
        </div>

        <style>
          {`
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.7; }
            }
          `}
        </style>
      </div>
    );
  }

  // Success or Death summary
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Scrim */}
      <div className="absolute inset-0 bg-black/80"></div>

      {/* Summary card */}
      <div className="relative bg-[#12131A] border rounded-lg p-8 max-w-[600px] w-full mx-4" style={{ borderColor: state === "success" ? "#C9A84C" : "#8B2500" }}>
        {state === "success" ? (
          <>
            <h2
              className="text-[#C9A84C] text-center mb-6"
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "1.75rem",
              }}
            >
              Extraction Successful
            </h2>

            <div className="space-y-6">
              {/* Items Extracted */}
              <div>
                <h3
                  className="text-[#8A8B95] text-sm mb-3"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Items Extracted
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-[#6B8E6B]"></div>
                    <span
                      className="text-[#6B8E6B]"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      Corroded Halberd
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-[#4682B4]"></div>
                    <span
                      className="text-[#4682B4]"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      Veilkeeper's Scroll
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-[#E8E0D0]"></div>
                    <span
                      className="text-[#E8E0D0]"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      Weathered Dagger
                    </span>
                  </div>
                </div>
              </div>

              {/* Experience */}
              <div>
                <h3
                  className="text-[#8A8B95] text-sm mb-2"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Experience
                </h3>
                <p
                  className="text-[#8A8B95]"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  Significant combat experience gained
                </p>
              </div>

              {/* Contracts */}
              <div>
                <h3
                  className="text-[#8A8B95] text-sm mb-2"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Contracts
                </h3>
                <p
                  className="text-[#2D6B4F] flex items-center gap-2"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  <span>✓</span>
                  <span>Hunt: Drowned Revenants (3/5)</span>
                </p>
              </div>

              {/* Run Stats */}
              <div className="border-t border-[#2A2B35] pt-4">
                <div
                  className="text-[#8A8B95] text-sm flex justify-between"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  <span>Time: 8m 42s</span>
                  <span>Rooms: 12</span>
                  <span>Creatures: 3</span>
                  <span>Players evaded: 1</span>
                </div>
              </div>

              <button
                onClick={() => navigate("/refuge")}
                className="w-full bg-[#C9A84C] hover:bg-[#B89840] text-[#0A0B0F] font-medium py-3 rounded transition-colors"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Return to Refuge
              </button>
            </div>
          </>
        ) : (
          <>
            <h2
              className="text-[#8B2500] text-center mb-6"
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "1.75rem",
              }}
            >
              You Have Fallen
            </h2>

            <div className="space-y-6">
              {/* Items Lost */}
              <div>
                <h3
                  className="text-[#8A8B95] text-sm mb-3"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Items Lost
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-[#4A4B55]"></div>
                    <span
                      className="text-[#4A4B55] line-through"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      Veilkeeper's Scroll
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-[#4A4B55]"></div>
                    <span
                      className="text-[#4A4B55] line-through"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      Weathered Dagger
                    </span>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <h3
                  className="text-[#8A8B95] text-sm mb-2"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Status Acquired
                </h3>
                <p
                  className="text-[#B8860B]"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  Shard-sickness (moderate)
                </p>
              </div>

              {/* Run Stats */}
              <div className="border-t border-[#2A2B35] pt-4">
                <div
                  className="text-[#8A8B95] text-sm flex justify-between"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  <span>Time: 4m 12s</span>
                  <span>Rooms: 6</span>
                  <span>Creatures: 2</span>
                </div>
              </div>

              <button
                onClick={() => navigate("/refuge")}
                className="w-full border border-[#8A8B95] hover:bg-[#1C1D27] text-[#8A8B95] hover:text-[#E8E0D0] py-3 rounded transition-colors"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Return to Refuge
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
