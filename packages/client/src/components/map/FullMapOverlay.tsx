import { useEffect } from 'react';
import type { ExploredRoomData } from '@ellmud/shared';
import type { RoomPosition } from '../../map/computeLayout.js';
import { MapRenderer } from './MapRenderer.js';
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
  // Close on Escape key
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
          <button
            className="map-close-btn"
            onClick={onClose}
            title="Close (Esc)"
            aria-label="Close map"
          >
            ✕
          </button>
        </div>

        <div className="map-panel-body">
          <MapRenderer
            visitedRooms={visitedRooms}
            ghostRooms={ghostRooms}
            positions={positions}
            currentRoomId={currentRoomId}
            compact={false}
          />
        </div>

        <div className="map-hint">Press M or Esc to close</div>
      </div>
    </div>
  );
}
