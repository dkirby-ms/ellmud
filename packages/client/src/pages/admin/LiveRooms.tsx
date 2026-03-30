import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Radio, Users, RefreshCw } from "lucide-react";
import {
  fetchLiveRooms,
  type LiveRoomSummary,
  AdminAPIError,
} from "../../lib/admin-api.js";

export default function LiveRooms() {
  const [rooms, setRooms] = useState<LiveRoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRooms = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchLiveRooms();
      setRooms(result.rooms);
    } catch (err) {
      setError(
        err instanceof AdminAPIError
          ? err.message
          : "Failed to load live rooms"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const roomTypeColor = (name: string) => {
    if (name === "shard") return "#C9A84C";
    if (name.startsWith("zone:")) return "#2D6B4F";
    return "#4A4B55";
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="text-[#C9A84C] text-2xl"
           
          >
            Live Rooms
          </h1>
          <p
            className="text-[#8A8B95] text-sm mt-1"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            Active Colyseus room instances — pause, resume, and spawn
          </p>
        </div>
        <button
          onClick={loadRooms}
          disabled={loading}
          className="px-4 py-2 border border-[#8A8B95] hover:bg-[#1C1D27] text-[#8A8B95] hover:text-[#E8E0D0] rounded transition-colors flex items-center gap-2 disabled:opacity-50"
          style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem" }}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div
          className="mb-4 p-3 bg-[#8B2500]/20 border border-[#8B2500] rounded text-[#E8E0D0] text-sm"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          {error}
        </div>
      )}

      {loading && rooms.length === 0 ? (
        <div
          className="text-[#8A8B95] text-center py-12"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          Loading active rooms...
        </div>
      ) : rooms.length === 0 ? (
        <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-8 text-center">
          <Radio className="w-8 h-8 text-[#4A4B55] mx-auto mb-3" />
          <p
            className="text-[#8A8B95]"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            No active rooms. Rooms appear when players join the game.
          </p>
        </div>
      ) : (
        <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2A2B35]">
                {["Room ID", "Type", "Players", "Status", "Created"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr
                  key={room.roomId}
                  className="border-b border-[#2A2B35] hover:bg-[#1C1D27] transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      to={`/admin/live-rooms/${room.roomId}`}
                      className="text-[#C9A84C] hover:underline"
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.875rem",
                      }}
                    >
                      {room.roomId.slice(0, 12)}…
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="px-2 py-1 rounded text-xs"
                      style={{
                        backgroundColor: roomTypeColor(room.name) + "20",
                        color: roomTypeColor(room.name),
                        fontFamily: "var(--font-sans)",
                      }}
                    >
                      {room.name}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="flex items-center gap-1 text-[#E8E0D0] text-sm"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      <Users className="w-3 h-3 text-[#8A8B95]" />
                      {room.clients}/{room.maxClients}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        room.locked
                          ? "bg-[#8B2500]/20 text-[#8B2500]"
                          : "bg-[#2D6B4F]/20 text-[#2D6B4F]"
                      }`}
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      {room.locked ? "Locked" : "Active"}
                    </span>
                  </td>
                  <td
                    className="px-4 py-3 text-[#8A8B95] text-sm"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    {room.createdAt
                      ? new Date(room.createdAt).toLocaleTimeString()
                      : "—"}
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
