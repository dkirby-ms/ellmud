import { Link } from "react-router";
import { Plus } from "lucide-react";
import { useAdminEntityList } from "../../hooks/useAdminEntityList.js";

interface Faction {
  id: string;
  name: string;
  description: string;
  milestones: Array<{ name: string; threshold: number; description: string }>;
  events: Array<{ milestone: string; narratives: string[] }>;
}

export default function FactionsList() {
  const { data: factions, loading, error } = useAdminEntityList<Faction>("factions");

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-[#8A8B95]" style={{ fontFamily: "var(--font-sans)" }}>
          Loading factions...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="text-[#8B2500]" style={{ fontFamily: "var(--font-sans)" }}>
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-[#C9A84C] text-2xl"
         
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
                ID
              </th>
              <th
                className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Description
              </th>
              <th
                className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Milestones
              </th>
              <th
                className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Events
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
                   
                  >
                    {faction.name}
                  </Link>
                </td>
                <td className="p-4">
                  <span
                    className="text-[#8A8B95] text-sm"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {faction.id}
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className="text-[#8A8B95] text-sm"
                   
                  >
                    {faction.description?.slice(0, 60)}{(faction.description?.length ?? 0) > 60 ? "…" : ""}
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className="text-[#E8E0D0] text-sm"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {faction.milestones?.length ?? 0}
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className="text-[#E8E0D0] text-sm"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {faction.events?.length ?? 0}
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