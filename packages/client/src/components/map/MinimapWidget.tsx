import type { ExploredRoomData } from '@ellmud/shared';
import type { RoomPosition } from '../../map/computeLayout.js';
import { MapRenderer } from './MapRenderer.js';
import { useFloorBounds } from './useFloorFilter.js';
import './map.css';

export interface MinimapWidgetProps {
  visitedRooms: Map<string, ExploredRoomData>;
  ghostRooms: Map<string, { roomId: string; direction: string }>;
  positions: Map<string, RoomPosition>;
  currentRoomId: string | null;
  onToggleFullMap?: () => void;
}

export function MinimapWidget({
  visitedRooms,
  ghostRooms,
  positions,
  currentRoomId,
  onToggleFullMap,
}: MinimapWidgetProps) {
  const hasRooms = visitedRooms.size > 0;
  const floorBounds = useFloorBounds(positions);

  return (
    <div className="minimap-widget">
      {onToggleFullMap && (
        <button
          className="minimap-expand-btn"
          onClick={onToggleFullMap}
          title="Open full map (M)"
          aria-label="Open full map"
        >
          ⛶
        </button>
      )}

      {hasRooms ? (
        <MapRenderer
          visitedRooms={visitedRooms}
          ghostRooms={ghostRooms}
          positions={positions}
          currentRoomId={currentRoomId}
          compact={true}
          hideFloorSelector={!floorBounds.isMultiFloor}
        />
      ) : (
        <div className="minimap-placeholder">Explore to reveal map</div>
      )}
    </div>
  );
}
