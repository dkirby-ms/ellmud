import { Link } from "react-router";
import { Plus } from "lucide-react";
import { useAdminEntityList } from "../../hooks/useAdminEntityList.js";

interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  cooldownTicks: number;
  staminaCost: number;
}

const categoryColors: Record<string, string> = {
  combat: "#8B2500",
  defence: "#3A7D7B",
  survival: "#2D6B4F",
  subterfuge: "#6B4E9B",
  awareness: "#B8860B",
  social: "#8B4589",
};

export default function SkillsList() {
  const { data: skills, loading, error } = useAdminEntityList<Skill>("skills");

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-[#8A8B95]" style={{ fontFamily: "var(--font-sans)" }}>
          Loading skills...
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
          Skills
        </h1>
        <Link
          to="/admin/skills/new"
          className="px-4 py-2 bg-[#C9A84C] hover:bg-[#B89840] text-[#0A0B0F] rounded transition-colors flex items-center gap-2"
          style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem" }}
        >
          <Plus className="w-4 h-4" />
          Create Skill
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
                Display Name
              </th>
              <th
                className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Category
              </th>
              <th
                className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Cooldown
              </th>
              <th
                className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Stamina Cost
              </th>
            </tr>
          </thead>
          <tbody>
            {skills.map((skill) => (
              <tr
                key={skill.id}
                className="border-b border-[#2A2B35] hover:bg-[#1C1D27] transition-colors"
              >
                <td className="p-4">
                  <Link
                    to={`/admin/skills/${skill.id}`}
                    className="text-[#E8E0D0] hover:text-[#C9A84C] transition-colors"
                   
                  >
                    {skill.name}
                  </Link>
                </td>
                <td className="p-4">
                  <span
                    className="px-2 py-1 rounded text-xs capitalize"
                    style={{
                      backgroundColor: categoryColors[skill.category] + "20",
                      color: categoryColors[skill.category],
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    {skill.category}
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className="text-[#E8E0D0] text-sm"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {skill.cooldownTicks}
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className="text-[#8A8B95] text-sm"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {skill.staminaCost}
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