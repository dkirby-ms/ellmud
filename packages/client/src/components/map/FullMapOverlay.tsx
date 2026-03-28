import { useState, useEffect } from 'react';
import type { ExploredRoomData } from '@ellmud/shared';
import type { RoomPosition } from '../../map/computeLayout.js';
import { MapRenderer } from './MapRenderer.js';
import { FloorSelector } from './FloorSelector.js';
import { useFloorBounds } from './useFloorFilter.js';
import './map.css';

export interface FullMapOverlayProps {
  visitedRooms: Map<string, ExploredRoomData>;
  ghostRooms: Map<string, { roomId: string; direction: string }>;
  positions: Map<string, RoomPosition>;
  currentRoomId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function FullMapOverlay({
  visitedRooms,
  ghostRooms,
  positions,
  currentRoomId,
  isOpen,
  onClose,
}: FullMapOverlayProps) {
  const floorBounds = useFloorBounds(positions);

  // Floor state — default to current room's z
  const [currentFloor, setCurrentFloor] = useState(0);

  // Reset floor to current room when overlay opens
  useEffect(() => {
    if (isOpen && currentRoomId) {
      const pos = positions.get(currentRoomId);
      if (pos) setCurrentFloor(pos.z);
    }
  }, [isOpen, currentRoomId, positions]);

  // Close on Escape key (but don't conflict with [ ] floor keys)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="full-map-overlay">
      {/* Backdrop */}
      <div className="map-backdrop" onClick={onClose} />

      {/* Panel */}
      <div className="map-panel">
        <div className="map-panel-header">
          <h2>Exploration Map</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {floorBounds.isMultiFloor && (
              <FloorSelector
                currentFloor={currentFloor}
                minFloor={floorBounds.minFloor}
                maxFloor={floorBounds.maxFloor}
                onFloorChange={setCurrentFloor}
                roomCounts={floorBounds.roomCounts}
                keyboardEnabled={true}
              />
            )}
            <button
              className="map-close-btn"
              onClick={onClose}
              title="Close (Esc)"
              aria-label="Close map"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="map-panel-body">
          <MapRenderer
            visitedRooms={visitedRooms}
            ghostRooms={ghostRooms}
            positions={positions}
            currentRoomId={currentRoomId}
            compact={false}
            initialFloor={currentFloor}
            hideFloorSelector={true}
          />
        </div>

        <div className="map-hint">
          Press M or Esc to close{floorBounds.isMultiFloor ? ' · [ ] to switch floors' : ''}
        </div>
      </div>
    </div>
  );
}
