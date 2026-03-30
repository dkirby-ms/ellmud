import { Hammer, ExternalLink, Package, Zap, Mountain, TrendingUp } from "lucide-react";

export default function RecipesList() {
  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Hammer className="w-8 h-8 text-[#C9A84C]" />
        <div>
          <h1 className="text-[#C9A84C] text-2xl">Crafting Recipes</h1>
          <p className="text-[#8A8B95] text-sm" style={{ fontFamily: "var(--font-sans)" }}>
            Item transformation rules — combine materials into gear, consumables, and upgrades
          </p>
        </div>
      </div>

      <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="px-3 py-1 bg-[#B8860B]/20 text-[#B8860B] text-xs rounded-full font-semibold" style={{ fontFamily: "var(--font-sans)" }}>PLANNED — PHASE 3</span>
        </div>
        <p className="text-[#E8E0D0] mb-4 leading-relaxed" style={{ fontFamily: "var(--font-sans)" }}>
          The Crafting System lets players combine extracted materials into usable gear and
          consumables. Recipes define input items, required skill levels, success rates, and
          output items with quality variance. The admin editor will support recipe trees,
          prerequisite chains, and biome-locked crafting stations.
        </p>
        <a href="https://github.com/dkirby-ms/ellmud/issues/33" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#1C1D27] border border-[#2A2B35] rounded text-[#C9A84C] hover:bg-[#2A2B35] transition-colors"
          style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem" }}>
          <ExternalLink className="w-4 h-4" />
          Track on GitHub — Issue #33: Crafting System
        </a>
      </div>

      <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6 mb-6">
        <h2 className="text-[#E8E0D0] text-lg mb-4">Dependencies</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { icon: Package, label: "Item System (Phase 1)", done: true, desc: "Item definitions for inputs and outputs" },
            { icon: Zap, label: "Skill Definitions (Phase 2)", done: true, desc: "Skill requirements for recipe unlocks" },
            { icon: Mountain, label: "Biome Templates (Phase 2)", done: true, desc: "Biome-locked crafting stations" },
            { icon: TrendingUp, label: "Progression System (Phase 3)", done: false, desc: "Skill leveling to unlock recipe tiers" },
          ].map(({ icon: Icon, label, done, desc }) => (
            <div key={label} className={`flex items-start gap-3 p-3 rounded border ${done ? "border-[#2D6B4F]/50 bg-[#2D6B4F]/10" : "border-[#2A2B35] bg-[#1C1D27]"}`}>
              <Icon className={`w-4 h-4 mt-0.5 ${done ? "text-[#2D6B4F]" : "text-[#4A4B55]"}`} />
              <div>
                <p className={`text-sm font-medium ${done ? "text-[#2D6B4F]" : "text-[#8A8B95]"}`} style={{ fontFamily: "var(--font-sans)" }}>{label} {done && "✓"}</p>
                <p className="text-xs text-[#4A4B55] mt-0.5" style={{ fontFamily: "var(--font-sans)" }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
        <h2 className="text-[#E8E0D0] text-lg mb-3">Planned Features</h2>
        <ul className="space-y-2">
          {["Visual recipe editor with drag-and-drop ingredient slots", "Tiered output quality based on skill level and material rarity", "Recipe prerequisite chains and discovery mechanics", "Biome-specific crafting station requirements", "Batch crafting rules and time-cost configuration"].map((item) => (
            <li key={item} className="flex items-center gap-2 text-[#8A8B95] text-sm" style={{ fontFamily: "var(--font-sans)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] flex-shrink-0" />{item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
