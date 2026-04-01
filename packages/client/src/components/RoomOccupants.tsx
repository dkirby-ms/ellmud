/**
 * RoomOccupants — Shows creatures and players in the current room.
 * Displayed in the right status panel of ZoneExploration.
 */

interface Creature {
  id: string;
  name: string;
  type: string;
  aggressive: boolean;
}

interface Player {
  id: string;
  name: string;
}

interface RoomOccupantsProps {
  creatures: Creature[];
  players: Player[];
}

interface GroupedCreature {
  type: string;
  name: string;
  aggressive: boolean;
  count: number;
}

export function RoomOccupants({ creatures, players }: RoomOccupantsProps) {
  // Group creatures by type
  const groupedCreatures = creatures.reduce<GroupedCreature[]>((acc, creature) => {
    const existing = acc.find(g => g.type === creature.type);
    if (existing) {
      existing.count++;
    } else {
      acc.push({
        type: creature.type,
        name: creature.name,
        aggressive: creature.aggressive,
        count: 1,
      });
    }
    return acc;
  }, []);

  const isEmpty = groupedCreatures.length === 0 && players.length === 0;

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        In This Room
      </div>

      {isEmpty ? (
        <div className="text-sm text-gray-500 italic">The room is quiet.</div>
      ) : (
        <div className="space-y-1">
          {groupedCreatures.map((group) => (
            <button
              key={group.type}
              className="w-full text-left text-sm px-2 py-1 rounded hover:bg-gray-800/50 transition-colors cursor-pointer flex items-center gap-2"
              onClick={() => {}}
            >
              <span className={group.aggressive ? 'text-amber-500' : 'text-gray-400'}>
                {group.aggressive ? '⚔' : '·'}
              </span>
              <span className="text-gray-300">
                {group.name}
                {group.count > 1 && <span className="text-gray-500"> (x{group.count})</span>}
              </span>
            </button>
          ))}

          {players.map((player) => (
            <button
              key={player.id}
              className="w-full text-left text-sm px-2 py-1 rounded hover:bg-gray-800/50 transition-colors cursor-pointer flex items-center gap-2"
              onClick={() => {}}
            >
              <span className="text-blue-400">👤</span>
              <span className="text-gray-300">{player.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
