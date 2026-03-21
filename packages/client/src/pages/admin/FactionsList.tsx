import { Link } from "react-router";
import { Plus } from "lucide-react";

const factions = [
  { id: "1", name: "The Forgebound", slug: "forgebound", philosophy: "Craft your fate", specialty: "Smithing & Gear", rankCount: 5 },
  { id: "2", name: "The Veilwalkers", slug: "veilwalkers", philosophy: "Knowledge through shadow", specialty: "Stealth & Subterfuge", rankCount: 6 },
  { id: "3", name: "The Ironroot", slug: "ironroot", philosophy: "Survival above all", specialty: "Resilience & Survival", rankCount: 5 },
];

export default function FactionsList() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-[#C9A84C] text-2xl"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Factions
        </h1>
        <Link
          to="/admin/factions/new"
          className="px-4 py-2 bg-[#C9A84C] hover:bg-[#B89840] text-[#0A0B0F] rounded transition-colors flex items-center gap-2"
          style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem" }}
        >
          <Plus className="w-4 h-4" />
          Create Faction
        </Link>
      </div>

      <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#1C1D27] border-b border-[#2A2B35]">
            <tr>
              <th
                className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Name
              </th>
              <th
                className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Slug
              </th>
              <th
                className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Philosophy
              </th>
              <th
                className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Specialty
              </th>
              <th
                className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Ranks
              </th>
            </tr>
          </thead>
          <tbody>
            {factions.map((faction) => (
              <tr
                key={faction.id}
                className="border-b border-[#2A2B35] hover:bg-[#1C1D27] transition-colors"
              >
                <td className="p-4">
                  <Link
                    to={`/admin/factions/${faction.id}`}
                    className="text-[#E8E0D0] hover:text-[#C9A84C] transition-colors"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    {faction.name}
                  </Link>
                </td>
                <td className="p-4">
                  <span
                    className="text-[#8A8B95] text-sm"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {faction.slug}
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className="text-[#8A8B95] text-sm"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    {faction.philosophy}
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className="text-[#8A8B95] text-sm"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    {faction.specialty}
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className="text-[#E8E0D0] text-sm"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {faction.rankCount}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}