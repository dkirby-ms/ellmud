/**
 * Admin API helpers for E2E tests.
 *
 * Uses the ADMIN_TOKEN env var (or falls back to the value from .env)
 * to authenticate against the admin spawn endpoint. This lets tests
 * materialise items in the game world without relying on room loot.
 */

const BASE_URL = process.env['E2E_BASE_URL'] ?? 'http://localhost:2567';
const ADMIN_TOKEN = process.env['ADMIN_TOKEN'] ?? 'ellmud-admin-dev';

interface RoomSummary {
  roomId: string;
  name: string;
  clients: number;
  metadata?: Record<string, unknown>;
}

/**
 * Find the Colyseus room ID for a given zone name (e.g. "zone_the-reliquary").
 * The Colyseus room name follows the pattern `zone_<slug>`.
 */
async function getColyseusRoomId(zoneSlug: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/admin/api/rooms`, {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
  });
  if (!res.ok) {
    throw new Error(`Admin rooms list failed: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as { rooms: RoomSummary[] };
  const room = body.rooms.find(
    (r) => r.name === `zone:${zoneSlug}` || r.name === `zone_${zoneSlug}` || r.name === zoneSlug,
  );
  if (!room) {
    throw new Error(
      `No Colyseus room found for zone "${zoneSlug}". Available: ${body.rooms.map((r) => r.name).join(', ')}`,
    );
  }
  return room.roomId;
}

/**
 * Spawn an item in a specific room within a zone using the admin API.
 *
 * @param itemId     - The item definition ID (e.g. "tattered_satchel")
 * @param targetRoom - The room graph ID within the zone (e.g. "reliquary-inn")
 * @param zoneSlug   - The zone slug (default: "the-reliquary")
 */
export async function adminSpawnItem(
  itemId: string,
  targetRoom: string,
  zoneSlug = 'the-reliquary',
): Promise<void> {
  const colyseusRoomId = await getColyseusRoomId(zoneSlug);

  const res = await fetch(`${BASE_URL}/admin/api/rooms/${colyseusRoomId}/spawn`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ADMIN_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'item',
      id: itemId,
      targetRoomId: targetRoom,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Admin spawn failed for "${itemId}" in ${targetRoom}: ${res.status} ${text}`);
  }
}
