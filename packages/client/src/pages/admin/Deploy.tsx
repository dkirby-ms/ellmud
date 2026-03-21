export default function Deploy() {
  return (
    <div className="p-8">
      <h1
        className="text-[#C9A84C] text-2xl mb-6"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        Deploy Content
      </h1>

      <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6 mb-6">
        <p
          className="text-[#E8E0D0] mb-4"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          Current Published Snapshot: <span className="text-[#C9A84C]">v47</span> (deployed 2h ago by Jane)
        </p>

        <div className="bg-[#1C1D27] rounded-lg p-4 mb-4">
          <h3
            className="text-[#8A8B95] text-sm mb-3"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            Pending Changes (since v47):
          </h3>
          <div className="space-y-2 text-sm">
            <p className="text-[#E8E0D0]" style={{ fontFamily: "var(--font-sans)" }}>
              ✅ Creatures: Cinder Wraith (new), Drowned Revenant (edited)
            </p>
            <p className="text-[#E8E0D0]" style={{ fontFamily: "var(--font-sans)" }}>
              ✅ Items: Ember Shard (new)
            </p>
            <p className="text-[#B8860B]" style={{ fontFamily: "var(--font-sans)" }}>
              ⚠ Biomes: Ember Rift (incomplete — missing 2 room types)
            </p>
            <p className="text-[#E8E0D0]" style={{ fontFamily: "var(--font-sans)" }}>
              ✅ Balance: Combat timeout changed 10 → 12
            </p>
          </div>
          <p
            className="text-[#8A8B95] text-xs mt-3"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            3 publishable / 1 with warnings
          </p>
        </div>

        <div className="flex gap-3">
          <button
            className="px-4 py-2 border border-[#8A8B95] hover:bg-[#1C1D27] text-[#8A8B95] hover:text-[#E8E0D0] rounded transition-colors"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            Preview Deployment Diff
          </button>
          <button
            className="px-4 py-2 bg-[#3A7D7B] hover:bg-[#2D6B5F] text-[#E8E0D0] rounded transition-colors"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            Deploy to Staging
          </button>
          <button
            className="px-4 py-2 bg-[#C9A84C] hover:bg-[#B89840] text-[#0A0B0F] rounded transition-colors"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            Deploy to Production
          </button>
        </div>
      </div>

      <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
        <h2
          className="text-[#C9A84C] text-lg mb-4"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Deployment History
        </h2>
        <div className="space-y-2">
          <div className="p-3 bg-[#1C1D27] rounded">
            <p className="text-[#E8E0D0] text-sm" style={{ fontFamily: "var(--font-sans)" }}>
              v47 — Jane — 2h ago — 5 changes — Production ✅
            </p>
          </div>
          <div className="p-3 bg-[#1C1D27] rounded">
            <p className="text-[#E8E0D0] text-sm" style={{ fontFamily: "var(--font-sans)" }}>
              v46 — Bob — 1d ago — 2 changes — Production ✅
            </p>
          </div>
          <div className="p-3 bg-[#1C1D27] rounded">
            <p className="text-[#E8E0D0] text-sm" style={{ fontFamily: "var(--font-sans)" }}>
              v45 — Jane — 2d ago — 8 changes — Production ✅ (rolled back →v44)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
