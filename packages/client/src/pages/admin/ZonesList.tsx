import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Plus } from "lucide-react";
import { listZones, type ZoneDefinition } from "../../lib/zone-api";

export default function ZonesList() {
  const [zones, setZones] = useState<ZoneDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadZones() {
      try {
        setLoading(true);
        setError(null);
        const data = await listZones();
        setZones(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load zones");
      } finally {
        setLoading(false);
      }
    }
    loadZones();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <p
            className="text-[#8A8B95] text-sm"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            Loading zones...
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
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Zones
        </h1>
        <Link
          to="/admin/zones/new"
          className="px-4 py-2 bg-[#C9A84C] hover:bg-[#B89840] text-[#0A0B0F] rounded transition-colors flex items-center gap-2"
          style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem" }}
        >
          <Plus className="w-4 h-4" />
          Create Zone
        </Link>
      </div>

      {zones.length === 0 ? (
        <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-8 text-center">
          <p
            className="text-[#8A8B95] text-sm mb-4"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            No zones found. Create your first zone to get started.
          </p>
          <Link
            to="/admin/zones/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#C9A84C] hover:bg-[#B89840] text-[#0A0B0F] rounded transition-colors text-sm"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            <Plus className="w-4 h-4" />
            Create Zone
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
                  Slug
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
                  Tier
                </th>
                <th
                  className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Lifecycle
                </th>
                <th
                  className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  PvP
                </th>
                <th
                  className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Repop Timer
                </th>
              </tr>
            </thead>
            <tbody>
              {zones.map((zone) => (
                <tr
                  key={zone.id}
                  className="border-b border-[#2A2B35] hover:bg-[#1C1D27] transition-colors cursor-pointer"
                >
                  <td className="p-4">
                    <Link
                      to={`/admin/zones/${zone.slug}`}
                      className="text-[#E8E0D0] hover:text-[#C9A84C] transition-colors"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      {zone.name}
                    </Link>
                  </td>
                  <td className="p-4">
                    <span
                      className="text-[#8A8B95] text-sm"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {zone.slug}
                    </span>
                  </td>
                  <td className="p-4">
                    <span
                      className="text-[#8A8B95] text-sm capitalize"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      {zone.category}
                    </span>
                  </td>
                  <td className="p-4">
                    <span
                      className="text-[#E8E0D0] text-sm"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      Tier {zone.tier}
                    </span>
                  </td>
                  <td className="p-4">
                    <span
                      className="text-[#8A8B95] text-sm capitalize"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      {zone.lifecycle}
                    </span>
                  </td>
                  <td className="p-4">
                    <span
                      className={`text-sm ${zone.pvpEnabled ? "text-[#8B2500]" : "text-[#8A8B95]"}`}
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {zone.pvpEnabled ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="p-4">
                    <span
                      className="text-[#8A8B95] text-sm"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {zone.repopIntervalSeconds}s
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
