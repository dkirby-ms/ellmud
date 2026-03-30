import { Link } from "react-router";
import { Plus } from "lucide-react";
import { useAdminEntityList } from "../../hooks/useAdminEntityList.js";

interface Room {
  id: string;
  name: string;
  description: string;
  type: string;
  properties: string[];
  hazards: Array<{ type: string; severity: number }>;
  lootContainers: Array<{ type: string; itemIds: string[] }>;
}

const roomTypeColors: Record<string, string> = {
  entry: "#2D6B4F",
  extraction: "#C9A84C",
  boss: "#8B2500",
  corridor: "#4A4B55",
  junction: "#3A7D7B",
  dead_end: "#6B4E9B",
};

export default function RoomsList() {
  const { data: rooms, loading, error } = useAdminEntityList<Room>("rooms");

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-[#8A8B95]" style={{ fontFamily: "var(--font-sans)" }}>
          Loading rooms...
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
          Room Templates
        </h1>
        <Link
          to="/admin/rooms/new"
          className="px-4 py-2 bg-[#C9A84C] hover:bg-[#B89840] text-[#0A0B0F] rounded transition-colors flex items-center gap-2"
          style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem" }}
        >
          <Plus className="w-4 h-4" />
          Create Room
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
                Type
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
                Hazards
              </th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => (
              <tr
                key={room.id}
                className="border-b border-[#2A2B35] hover:bg-[#1C1D27] transition-colors"
              >
                <td className="p-4">
                  <Link
                    to={`/admin/rooms/${room.id}`}
                    className="text-[#E8E0D0] hover:text-[#C9A84C] transition-colors"
                   
                  >
                    {room.name}
                  </Link>
                </td>
                <td className="p-4">
                  <span
                    className="px-2 py-1 rounded text-xs"
                    style={{
                      backgroundColor: (roomTypeColors[room.type] ?? "#4A4B55") + "20",
                      color: roomTypeColors[room.type] ?? "#4A4B55",
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    {room.type}
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className="text-[#8A8B95] text-sm"
                   
                  >
                    {room.description && room.description.length > 60
                      ? room.description.substring(0, 60) + "..."
                      : room.description}
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className="text-[#8A8B95] text-sm"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {room.hazards.length}
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