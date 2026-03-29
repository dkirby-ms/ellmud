import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Plus } from "lucide-react";
import { listEntities } from "../../lib/admin-api";

interface Biome {
  id: string;
  name: string;
  description: string;
  tier: number;
  features: string[];
  hazardTypes: string[];
  roomProperties: string[];
  narrationHints: string[];
}

export default function BiomesList() {
  const [biomes, setBiomes] = useState<Biome[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBiomes() {
      try {
        setLoading(true);
        setError(null);
        const data = await listEntities<Biome>("biomes");
        setBiomes(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load biomes");
      } finally {
        setLoading(false);
      }
    }
    loadBiomes();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <p
            className="text-[#8A8B95] text-sm"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            Loading biomes...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p
              className="text-[#8B2500] text-sm mb-2"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              Error: {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#C9A84C] hover:bg-[#B89840] text-[#0A0B0F] rounded transition-colors text-sm"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              Retry
            </button>
          </div>
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
          Biomes
        </h1>
        <Link
          to="/admin/biomes/new"
          className="px-4 py-2 bg-[#C9A84C] hover:bg-[#B89840] text-[#0A0B0F] rounded transition-colors flex items-center gap-2"
          style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem" }}
        >
          <Plus className="w-4 h-4" />
          Create Biome
        </Link>
      </div>

      {biomes.length === 0 ? (
        <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-8 text-center">
          <p
            className="text-[#8A8B95] text-sm mb-4"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            No biomes found. Create your first biome to get started.
          </p>
          <Link
            to="/admin/biomes/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#C9A84C] hover:bg-[#B89840] text-[#0A0B0F] rounded transition-colors text-sm"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            <Plus className="w-4 h-4" />
            Create Biome
          </Link>
        </div>
      ) : (
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
                  Description
                </th>
                <th
                  className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Tier
                </th>
                <th
                  className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Features
                </th>
                <th
                  className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Hazards
                </th>
              </tr>
            </thead>
            <tbody>
              {biomes.map((biome) => (
                <tr
                  key={biome.id}
                  className="border-b border-[#2A2B35] hover:bg-[#1C1D27] transition-colors cursor-pointer"
                >
                  <td className="p-4">
                    <Link
                      to={`/admin/biomes/${biome.id}`}
                      className="text-[#E8E0D0] hover:text-[#C9A84C] transition-colors"
                     
                    >
                      {biome.name}
                    </Link>
                  </td>
                  <td className="p-4">
                    <span
                      className="text-[#8A8B95] text-sm"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      {biome.description.length > 60
                        ? `${biome.description.slice(0, 60)}...`
                        : biome.description}
                    </span>
                  </td>
                  <td className="p-4">
                    <span
                      className="text-[#E8E0D0] text-sm"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      Tier {biome.tier}
                    </span>
                  </td>
                  <td className="p-4">
                    <span
                      className="text-[#8A8B95] text-sm"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {biome.features.length}
                    </span>
                  </td>
                  <td className="p-4">
                    <span
                      className="text-[#8A8B95] text-sm"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {biome.hazardTypes.length}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}