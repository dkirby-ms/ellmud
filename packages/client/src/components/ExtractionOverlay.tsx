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
            className="text-text-primary text-center mb-4 font-serif"
            style={{ fontSize: "1.25rem" }}
          >
            Extraction Ritual — Hold Your Ground
          </h3>

          {/* Progress bar */}
          <div className="h-2 bg-bg-panel rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-accent-gold transition-all duration-500"
              style={{
                width: `${progress}%`,
                animation: "pulse 2s ease-in-out infinite",
              }}
            ></div>
          </div>

          <p className="text-warning text-center text-sm font-sans">
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
      <div
        className={`relative bg-bg-panel border rounded-lg p-8 max-w-[600px] w-full mx-4 ${
          state === "success" ? "border-accent-gold" : "border-danger"
        }`}
      >
        {state === "success" ? (
          <>
            <h2
              className="text-accent-gold text-center mb-6 font-serif"
              style={{
                fontSize: "1.75rem",
              }}
            >
              Extraction Successful
            </h2>

            <div className="space-y-6">
              {/* Items Extracted */}
              <div>
                <h3
                  className="text-text-secondary text-sm mb-3 font-sans"
                >
                  Items Extracted
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-tier-sturdy"></div>
                    <span className="text-tier-sturdy font-serif">
                      Corroded Halberd
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-tier-refined"></div>
                    <span className="text-tier-refined font-serif">
                      Veilkeeper's Scroll
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-tier-common"></div>
                    <span className="text-tier-common font-serif">
                      Weathered Dagger
                    </span>
                  </div>
                </div>
              </div>

              {/* Experience */}
              <div>
                <h3
                  className="text-text-secondary text-sm mb-2 font-sans"
                >
                  Experience
                </h3>
                <p className="text-text-secondary font-serif">
                  Significant combat experience gained
                </p>
              </div>

              {/* Contracts */}
              <div>
                <h3
                  className="text-text-secondary text-sm mb-2 font-sans"
                >
                  Contracts
                </h3>
                <p className="text-success flex items-center gap-2 font-serif">
                  <span>✓</span>
                  <span>Hunt: Drowned Revenants (3/5)</span>
                </p>
              </div>

              {/* Run Stats */}
              <div className="border-t border-border-muted pt-4">
                <div className="text-text-secondary text-sm flex justify-between font-mono">
                  <span>Time: 8m 42s</span>
                  <span>Rooms: 12</span>
                  <span>Creatures: 3</span>
                  <span>Players evaded: 1</span>
                </div>
              </div>

              <button
                onClick={() => navigate("/refuge")}
                className="w-full bg-accent-gold hover:bg-accent-gold/90 text-bg-primary font-medium py-3 rounded transition-colors font-sans"
              >
                Return to Refuge
              </button>
            </div>
          </>
        ) : (
          <>
            <h2
              className="text-danger text-center mb-6 font-serif"
              style={{
                fontSize: "1.75rem",
              }}
            >
              You Have Fallen
            </h2>

            <div className="space-y-6">
              {/* Items Lost */}
              <div>
                <h3
                  className="text-text-secondary text-sm mb-3 font-sans"
                >
                  Items Lost
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-text-disabled"></div>
                    <span className="text-text-disabled line-through font-serif">
                      Veilkeeper's Scroll
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-text-disabled"></div>
                    <span className="text-text-disabled line-through font-serif">
                      Weathered Dagger
                    </span>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <h3
                  className="text-text-secondary text-sm mb-2 font-sans"
                >
                  Status Acquired
                </h3>
                <p className="text-warning font-serif">
                  Shard-sickness (moderate)
                </p>
              </div>

              {/* Run Stats */}
              <div className="border-t border-border-muted pt-4">
                <div className="text-text-secondary text-sm flex justify-between font-mono">
                  <span>Time: 4m 12s</span>
                  <span>Rooms: 6</span>
                  <span>Creatures: 2</span>
                </div>
              </div>

              <button
                onClick={() => navigate("/refuge")}
                className="w-full border border-text-secondary hover:bg-bg-elevated text-text-secondary hover:text-text-primary py-3 rounded transition-colors font-sans"
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
