import { ClipboardList, ExternalLink, Sword, Trophy, Building2, TrendingUp } from "lucide-react";

export default function ContractsList() {
  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <ClipboardList className="w-8 h-8 text-[#C9A84C]" />
        <div>
          <h1 className="text-[#C9A84C] text-2xl">Contracts</h1>
          <p className="text-[#8A8B95] text-sm" style={{ fontFamily: "var(--font-sans)" }}>
            Faction-issued missions that drive the zone gameplay loop
          </p>
        </div>
      </div>

      <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="px-3 py-1 bg-[#B8860B]/20 text-[#B8860B] text-xs rounded-full font-semibold" style={{ fontFamily: "var(--font-sans)" }}>PLANNED — PHASE 3</span>
        </div>
        <p className="text-[#E8E0D0] mb-4 leading-relaxed" style={{ fontFamily: "var(--font-sans)" }}>
          Contracts are faction-issued objectives that players undertake before entering zones.
          Each contract specifies targets (kill, collect, explore), reward tiers, time limits,
          and faction reputation consequences. The admin editor will let designers create contract
          templates, set reward curves, and manage the active contract pool per faction.
        </p>
        <a href="https://github.com/dkirby-ms/ellmud/issues/44" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#1C1D27] border border-[#2A2B35] rounded text-[#C9A84C] hover:bg-[#2A2B35] transition-colors"
          style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem" }}>
          <ExternalLink className="w-4 h-4" />
          Track on GitHub — Issue #44: Contracts System
        </a>
      </div>

      <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6 mb-6">
        <h2 className="text-[#E8E0D0] text-lg mb-4">Dependencies</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { icon: Sword, label: "Creature Templates (Phase 1)", done: true, desc: "Kill targets require creature definitions" },
            { icon: Trophy, label: "Loot Tables (Phase 2)", done: true, desc: "Collection targets reference loot items" },
            { icon: Building2, label: "Faction System (Phase 3)", done: false, desc: "Contracts are issued by factions" },
            { icon: TrendingUp, label: "Reputation Engine (Phase 3)", done: false, desc: "Rep gains/losses on contract outcomes" },
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
          {["Contract template editor with objective types (kill, collect, explore, survive)", "Reward curve designer — scale payouts by zone tier and difficulty", "Faction assignment rules and rotation scheduling", "Time-limit and failure-penalty configuration", "Active contract pool management per faction"].map((item) => (
            <li key={item} className="flex items-center gap-2 text-[#8A8B95] text-sm" style={{ fontFamily: "var(--font-sans)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] flex-shrink-0" />{item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
