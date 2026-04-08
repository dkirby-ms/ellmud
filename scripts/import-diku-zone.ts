/**
 * import-diku-zone.ts — Prototype DikuMUD/CircleMUD Zone Importer for Ellmud
 *
 * Parses a CircleMUD `.wld` (world/room) file and generates an Ellmud-compatible
 * SQL migration file with zone, room, and exit INSERTs.
 *
 * Usage:
 *   npx tsx scripts/import-diku-zone.ts <path-to-wld-file> [zone-slug] [zone-name]
 *
 * Examples:
 *   npx tsx scripts/import-diku-zone.ts scripts/midgaard.wld
 *   npx tsx scripts/import-diku-zone.ts scripts/midgaard.wld midgaard "Midgaard City"
 *
 * Output: Writes a `.sql` file to stdout (redirect to save).
 *
 * CircleMUD .wld format reference:
 *   #<vnum>
 *   <room_name>~
 *   <room_description (multiline)>
 *   ~
 *   <zone_num> <room_flags> <sector_type> [x y z]
 *   D<direction>          (0=N, 1=E, 2=S, 3=W, 4=Up, 5=Down)
 *   <exit_description>~
 *   <exit_keywords>~
 *   <exit_flags> <key_vnum> <to_room_vnum>
 *   E                     (extra descriptions — skipped)
 *   T <trigger_vnum>      (triggers — skipped)
 *   S                     (end of room)
 *
 * Limitations (prototype):
 *   - Room-only: does not import .mob, .obj, .zon, .shp files
 *   - Cross-zone exits (vnums outside the file) are skipped with warnings
 *   - Sector types and room flags are not mapped (reasonable defaults used)
 *   - No item or NPC content
 */

import { readFileSync } from 'fs';

// ─── Types ──────────────────────────────────────────────────────────────────

interface DikuExit {
  direction: string;
  toVnum: number;
  description: string;
  keywords: string;
  flags: number;
  keyVnum: number;
}

interface DikuRoom {
  vnum: number;
  name: string;
  description: string;
  zoneNum: number;
  roomFlags: number;
  sectorType: number;
  exits: DikuExit[];
}

// ─── Direction Mapping ──────────────────────────────────────────────────────

const DIKU_DIRECTIONS: Record<number, string> = {
  0: 'north',
  1: 'east',
  2: 'south',
  3: 'west',
  4: 'up',
  5: 'down',
};

// ─── Sector Type Names (for comments) ───────────────────────────────────────

const SECTOR_NAMES: Record<number, string> = {
  0: 'inside',
  1: 'city',
  2: 'field',
  3: 'forest',
  4: 'hills',
  5: 'mountain',
  6: 'water_swim',
  7: 'water_noswim',
  8: 'flying',
  9: 'underwater',
};

// ─── Parser ─────────────────────────────────────────────────────────────────

function parseWldFile(content: string): DikuRoom[] {
  const rooms: DikuRoom[] = [];
  const lines = content.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trimEnd();

    // Look for room vnum: #<number>
    if (!line.startsWith('#') || line === '$~') {
      i++;
      continue;
    }

    const vnumMatch = line.match(/^#(\d+)/);
    if (!vnumMatch) {
      i++;
      continue;
    }

    const vnum = parseInt(vnumMatch[1], 10);
    i++;

    // Room name — everything up to the tilde
    let roomName = '';
    while (i < lines.length) {
      const nameLine = lines[i].trimEnd();
      if (nameLine.endsWith('~')) {
        roomName += nameLine.slice(0, -1);
        i++;
        break;
      }
      roomName += nameLine;
      i++;
    }
    roomName = roomName.trim();

    // Room description — multiline, ends with ~ on its own line
    let description = '';
    while (i < lines.length) {
      const descLine = lines[i].trimEnd();
      if (descLine === '~') {
        i++;
        break;
      }
      if (description) description += '\n';
      description += descLine;
      i++;
    }
    description = description.trim();

    // Room flags line: <zone_num> <room_flags> <sector_type> [x y z]
    const flagsLine = (lines[i] || '').trim();
    const flagParts = flagsLine.split(/\s+/).map(Number);
    const zoneNum = flagParts[0] || 0;
    const roomFlags = flagParts[1] || 0;
    const sectorType = flagParts[2] || 0;
    i++;

    // Parse exits, extra descriptions, and triggers until 'S'
    const exits: DikuExit[] = [];

    while (i < lines.length) {
      const current = lines[i].trimEnd();

      if (current === 'S') {
        i++;
        break;
      }

      // Direction exit: D<number>
      const dirMatch = current.match(/^D(\d)$/);
      if (dirMatch) {
        const dirNum = parseInt(dirMatch[1], 10);
        const direction = DIKU_DIRECTIONS[dirNum] || `dir${dirNum}`;
        i++;

        // Exit description (until ~)
        let exitDesc = '';
        while (i < lines.length) {
          const eLine = lines[i].trimEnd();
          if (eLine.endsWith('~')) {
            exitDesc += eLine.slice(0, -1);
            i++;
            break;
          }
          if (exitDesc) exitDesc += ' ';
          exitDesc += eLine;
          i++;
        }

        // Exit keywords (until ~)
        let exitKeywords = '';
        while (i < lines.length) {
          const kLine = lines[i].trimEnd();
          if (kLine.endsWith('~')) {
            exitKeywords += kLine.slice(0, -1);
            i++;
            break;
          }
          exitKeywords += kLine;
          i++;
        }

        // Exit flags line: <flags> <key_vnum> <to_room_vnum>
        const exitFlagsLine = (lines[i] || '').trim();
        const exitParts = exitFlagsLine.split(/\s+/).map(Number);
        const exitFlags = exitParts[0] || 0;
        const keyVnum = exitParts[1] || -1;
        const toRoomVnum = exitParts[2] || -1;
        i++;

        exits.push({
          direction,
          toVnum: toRoomVnum,
          description: exitDesc.trim(),
          keywords: exitKeywords.trim(),
          flags: exitFlags,
          keyVnum,
        });
        continue;
      }

      // Extra description: E ... ends at next S, D, E, or T
      if (current === 'E') {
        i++;
        // Skip keyword line (until ~)
        while (i < lines.length) {
          if (lines[i].trimEnd().endsWith('~')) { i++; break; }
          i++;
        }
        // Skip description (until ~)
        while (i < lines.length) {
          if (lines[i].trimEnd() === '~') { i++; break; }
          i++;
        }
        continue;
      }

      // Trigger: T <vnum>
      if (current.startsWith('T ')) {
        i++;
        continue;
      }

      // Unknown line — skip
      i++;
    }

    rooms.push({
      vnum,
      name: roomName,
      description,
      zoneNum,
      roomFlags,
      sectorType,
      exits,
    });
  }

  return rooms;
}

// ─── Slug Generator ─────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function deduplicateSlugs(rooms: DikuRoom[]): Map<number, string> {
  const vnumToSlug = new Map<number, string>();
  const slugCounts = new Map<string, number>();

  for (const room of rooms) {
    const base = toSlug(room.name);
    const count = slugCounts.get(base) || 0;
    slugCounts.set(base, count + 1);

    const slug = count === 0 ? base : `${base}-${count + 1}`;
    vnumToSlug.set(room.vnum, slug);
  }

  return vnumToSlug;
}

// ─── SQL Escaping ───────────────────────────────────────────────────────────

function escSql(s: string): string {
  return s.replace(/'/g, "''");
}

/** Wrap long text to ~78 chars for readable SQL */
function wrapDescription(desc: string): string {
  // Collapse internal whitespace but preserve paragraph breaks (double newlines)
  const paragraphs = desc.split(/\n\s*\n/);
  return paragraphs
    .map(p => p.replace(/\s+/g, ' ').trim())
    .join('\n   ')
    .trim();
}

// ─── Determine Room Type ────────────────────────────────────────────────────

function inferRoomType(room: DikuRoom, isEntry: boolean): string {
  if (isEntry) return 'entry';
  const exitCount = room.exits.length;
  if (exitCount === 0) return 'dead_end';
  if (exitCount === 1) return 'dead_end';
  if (exitCount >= 4) return 'junction';
  return 'corridor';
}

// ─── SQL Generator ──────────────────────────────────────────────────────────

function generateSql(
  rooms: DikuRoom[],
  zoneSlug: string,
  zoneName: string,
  zoneDescription: string,
): string {
  const vnumToSlug = deduplicateSlugs(rooms);
  const vnumSet = new Set(rooms.map(r => r.vnum));
  const warnings: string[] = [];

  // Determine entry room (first room in file)
  const entryVnum = rooms[0]?.vnum;
  const entrySlug = vnumToSlug.get(entryVnum) || 'unknown';

  const lines: string[] = [];

  // Header
  lines.push(`-- Imported from CircleMUD/DikuMUD .wld file`);
  lines.push(`-- Zone: ${zoneName} (${rooms.length} rooms)`);
  lines.push(`-- Generated by scripts/import-diku-zone.ts`);
  lines.push(`-- WARNING: This is auto-generated content — review before use as a migration.`);
  lines.push('');
  lines.push('BEGIN;');
  lines.push('');

  // Zone INSERT
  lines.push(`-- ============================================================================`);
  lines.push(`-- Zone: ${zoneName}`);
  lines.push(`-- ============================================================================`);
  lines.push('');
  lines.push(`INSERT INTO zones (id, slug, name, description, level_min, level_max, tier, theme, entry_room_slugs, lifecycle, category, max_players, pvp_enabled, repop_interval_seconds)`);
  lines.push(`VALUES (gen_random_uuid(), '${escSql(zoneSlug)}', '${escSql(zoneName)}',`);
  lines.push(`  '${escSql(zoneDescription)}',`);
  lines.push(`  1, 10, 1, 'flooded_crypt', '{${escSql(entrySlug)}}', 'persistent', 'dungeon', 6, false, 300)`);
  lines.push(`ON CONFLICT (slug) DO NOTHING;`);
  lines.push('');

  // Room INSERTs
  lines.push(`-- ── Rooms (${rooms.length}) ──────────────────────────────────────────────`);
  lines.push('');
  lines.push(`INSERT INTO zone_rooms (zone_id, slug, name, description, type, properties, npcs, loot_containers, hazards)`);
  lines.push(`SELECT z.id, v.slug, v.name, v.description, v.type,`);
  lines.push(`       v.properties::text[], v.npcs::jsonb, v.loot_containers::jsonb, v.hazards::jsonb`);
  lines.push(`FROM zones z, (VALUES`);

  for (let idx = 0; idx < rooms.length; idx++) {
    const room = rooms[idx];
    const slug = vnumToSlug.get(room.vnum)!;
    const isEntry = room.vnum === entryVnum;
    const roomType = inferRoomType(room, isEntry);
    const desc = wrapDescription(room.description);
    const sectorName = SECTOR_NAMES[room.sectorType] || 'unknown';

    const comma = idx < rooms.length - 1 ? ',' : '';
    lines.push(`  -- vnum ${room.vnum}, sector: ${sectorName}`);
    lines.push(`  ('${escSql(slug)}',`);
    lines.push(`   '${escSql(room.name)}',`);
    lines.push(`   '${escSql(desc)}',`);
    lines.push(`   '${roomType}',`);
    lines.push(`   '{}',`);
    lines.push(`   '[]',`);
    lines.push(`   '[]',`);
    lines.push(`   '[]')${comma}`);
  }

  lines.push(`) AS v(slug, name, description, type, properties, npcs, loot_containers, hazards)`);
  lines.push(`WHERE z.slug = '${escSql(zoneSlug)}'`);
  lines.push(`ON CONFLICT (zone_id, slug) DO NOTHING;`);
  lines.push('');

  // Exit INSERTs — collect all valid exits
  interface ExitRow {
    fromSlug: string;
    direction: string;
    toSlug: string;
    locked: boolean;
    hidden: boolean;
  }

  const exitRows: ExitRow[] = [];

  for (const room of rooms) {
    const fromSlug = vnumToSlug.get(room.vnum)!;
    for (const exit of room.exits) {
      if (!vnumSet.has(exit.toVnum)) {
        warnings.push(
          `Skipped exit: ${room.name} (${room.vnum}) → ${exit.direction} → vnum ${exit.toVnum} (outside zone)`
        );
        continue;
      }
      const toSlug = vnumToSlug.get(exit.toVnum)!;
      // Exit flag 1 = door (EX_ISDOOR), flag 2 = locked (EX_CLOSED + locked)
      const _isDoor = (exit.flags & 1) !== 0;
      const isLocked = (exit.flags & 2) !== 0;
      // Hidden if flag 4 (EX_HIDDEN) or door with keywords
      const isHidden = (exit.flags & 4) !== 0;

      exitRows.push({
        fromSlug,
        direction: exit.direction,
        toSlug,
        locked: isLocked,
        hidden: isHidden,
      });
    }
  }

  lines.push(`-- ── Exits (${exitRows.length} intra-zone) ──────────────────────────────────`);
  lines.push('');

  if (exitRows.length > 0) {
    lines.push(`INSERT INTO zone_exits (zone_id, from_room_slug, direction, to_room_slug, target_zone_slug, target_room_slug, locked, hidden)`);
    lines.push(`SELECT z.id, v.from_slug, v.direction, v.to_slug,`);
    lines.push(`       NULLIF(v.target_zone, ''), NULLIF(v.target_room, ''),`);
    lines.push(`       v.is_locked, v.is_hidden`);
    lines.push(`FROM zones z, (VALUES`);

    for (let idx = 0; idx < exitRows.length; idx++) {
      const e = exitRows[idx];
      const comma = idx < exitRows.length - 1 ? ',' : '';
      lines.push(`  ('${escSql(e.fromSlug)}', '${e.direction}', '${escSql(e.toSlug)}', '', '', ${e.locked}, ${e.hidden})${comma}`);
    }

    lines.push(`) AS v(from_slug, direction, to_slug, target_zone, target_room, is_locked, is_hidden)`);
    lines.push(`WHERE z.slug = '${escSql(zoneSlug)}'`);
    lines.push(`ON CONFLICT (zone_id, from_room_slug, direction) DO NOTHING;`);
  }

  lines.push('');
  lines.push('COMMIT;');

  // Warnings as trailing comments
  if (warnings.length > 0) {
    lines.push('');
    lines.push(`-- ── Warnings (${warnings.length}) ──────────────────────────────────────────`);
    for (const w of warnings) {
      lines.push(`-- ${w}`);
    }
  }

  // Summary stats as trailing comment
  lines.push('');
  lines.push(`-- ── Import Summary ─────────────────────────────────────────────────────`);
  lines.push(`-- Rooms: ${rooms.length}`);
  lines.push(`-- Exits: ${exitRows.length} intra-zone`);
  lines.push(`-- Skipped: ${warnings.length} cross-zone exits`);
  lines.push(`-- Entry room: ${entrySlug} (vnum ${entryVnum})`);

  return lines.join('\n') + '\n';
}

// ─── Derive Zone Info ───────────────────────────────────────────────────────

function deriveZoneName(rooms: DikuRoom[]): string {
  // Try to find a common zone name from room names
  // Heuristic: if many rooms mention the same place, use it
  const words = new Map<string, number>();
  for (const room of rooms) {
    for (const word of room.name.split(/\s+/)) {
      if (word.length >= 4) {
        const w = word.replace(/[^a-zA-Z]/g, '');
        if (w) words.set(w, (words.get(w) || 0) + 1);
      }
    }
  }
  // Return most common meaningful word, or use zone number
  let best = '';
  let bestCount = 0;
  for (const [word, count] of words) {
    if (count > bestCount && !['the', 'with', 'from', 'that', 'this'].includes(word.toLowerCase())) {
      best = word;
      bestCount = count;
    }
  }
  return best || `Zone ${rooms[0]?.zoneNum || 0}`;
}

function buildZoneDescription(rooms: DikuRoom[]): string {
  // Use the first room's description as a basis for the zone description
  const first = rooms[0];
  if (!first) return 'An imported zone from a classic MUD.';
  return `An area imported from a classic DikuMUD zone. ${rooms.length} rooms spanning ${
    SECTOR_NAMES[first.sectorType] || 'various'
  } terrain.`;
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main(): void {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: npx tsx scripts/import-diku-zone.ts <path-to-wld-file> [zone-slug] [zone-name]');
    console.error('');
    console.error('Examples:');
    console.error('  npx tsx scripts/import-diku-zone.ts scripts/midgaard.wld');
    console.error('  npx tsx scripts/import-diku-zone.ts scripts/midgaard.wld midgaard "Midgaard City"');
    process.exit(1);
  }

  const filePath = args[0];
  const content = readFileSync(filePath, 'utf-8');
  const rooms = parseWldFile(content);

  if (rooms.length === 0) {
    console.error('No rooms found in file.');
    process.exit(1);
  }

  // Zone metadata
  const zoneSlug = args[1] || toSlug(deriveZoneName(rooms));
  const zoneName = args[2] || deriveZoneName(rooms);
  const zoneDescription = buildZoneDescription(rooms);

  // Stats to stderr so stdout is clean SQL
  console.error(`Parsed ${rooms.length} rooms from ${filePath}`);
  console.error(`Zone: ${zoneName} (${zoneSlug})`);

  const vnumSet = new Set(rooms.map(r => r.vnum));
  let intraExits = 0;
  let crossExits = 0;
  for (const room of rooms) {
    for (const exit of room.exits) {
      if (vnumSet.has(exit.toVnum)) intraExits++;
      else crossExits++;
    }
  }
  console.error(`Exits: ${intraExits} intra-zone, ${crossExits} cross-zone (skipped)`);

  const sql = generateSql(rooms, zoneSlug, zoneName, zoneDescription);
  process.stdout.write(sql);
}

main();
