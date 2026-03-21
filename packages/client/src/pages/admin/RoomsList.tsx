import { Link } from "react-router";
import { Plus } from "lucide-react";

const rooms = [
  { id: "1", name: "Drowned Vestibule", roomType: "entry", biome: "Flooded Crypt", lightLevel: 0.2 },
  { id: "2", name: "Flooded Passage", roomType: "corridor", biome: "Flooded Crypt", lightLevel: 0.1 },
  { id: "3", name: "Drowned Cathedral", roomType: "boss", biome: "Flooded Crypt", lightLevel: 0.3 },
];

const roomTypeColors: Record<string, string> = {
  entry: "#2D6B4F",
  extraction: "#C9A84C",
  boss: "#8B2500",
  corridor: "#4A4B55",
  junction: "#3A7D7B",
  dead_end: "#6B4E9B",
};

export default function RoomsList() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-[#C9A84C] text-2xl"
          style={{ fontFamily: "var(--font-serif)" }}
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
                Room Type
              </th>
              <th
                className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Biome
              </th>
              <th
                className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Light Level
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
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    {room.name}
                  </Link>
                </td>
                <td className="p-4">
                  <span
                    className="px-2 py-1 rounded text-xs"
                    style={{
                      backgroundColor: roomTypeColors[room.roomType] + "20",
                      color: roomTypeColors[room.roomType],
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    {room.roomType}
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className="text-[#E8E0D0] text-sm"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    {room.biome}
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className="text-[#8A8B95] text-sm"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {room.lightLevel}
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