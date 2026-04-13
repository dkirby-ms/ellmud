/**
 * PermadeathOverlay — Dramatic death screen for permanently deleted characters.
 * Triggered when the server sends a permadeath overlay message.
 */

import { useNavigate } from "react-router";
import { Skull, Trophy } from "lucide-react";

export interface PermadeathData {
  characterName: string;
  level: number;
  totalKills: number;
  totalDeaths: number;
  survivedSeconds: number;
  causeOfDeath: string;
  zoneOfDeath: string;
}

interface PermadeathOverlayProps {
  data: PermadeathData;
  onDismiss: () => void;
}

function formatSurvivalTime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);

  return parts.join(' ');
}

export default function PermadeathOverlay({ data, onDismiss }: PermadeathOverlayProps) {
  const navigate = useNavigate();

  const handleRiseAgain = () => {
    onDismiss();
    // Player respawns in-game; server handles the actual respawn
  };

  const handleViewHallOfFame = () => {
    onDismiss();
    navigate('/hall-of-fame');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
      <div className="max-w-2xl w-full mx-4 text-center">
        {/* Skull Icon */}
        <div className="flex justify-center mb-6">
          <Skull className="w-24 h-24 text-danger" strokeWidth={1.5} />
        </div>

        {/* Title */}
        <h1 className="text-5xl font-serif text-danger mb-4 tracking-wide">
          DEATH & REBIRTH
        </h1>

        {/* Character Name */}
        <p className="text-2xl text-accent-gold font-serif mb-8">
          {data.characterName}
        </p>

        {/* Legacy Stats */}
        <div className="bg-bg-panel border border-border-muted rounded-lg p-6 mb-6">
          <h2 className="text-text-secondary uppercase tracking-wider text-sm mb-4 font-sans">
            Legacy
          </h2>
          
          <div className="grid grid-cols-2 gap-4 text-left max-w-md mx-auto">
            <div className="flex justify-between border-b border-border-muted pb-2">
              <span className="text-text-secondary font-mono text-sm">Level:</span>
              <span className="text-text-primary font-mono text-sm">{data.level}</span>
            </div>
            
            <div className="flex justify-between border-b border-border-muted pb-2">
              <span className="text-text-secondary font-mono text-sm">Survival Time:</span>
              <span className="text-text-primary font-mono text-sm">{formatSurvivalTime(data.survivedSeconds)}</span>
            </div>
            
            <div className="flex justify-between border-b border-border-muted pb-2">
              <span className="text-text-secondary font-mono text-sm">Total Kills:</span>
              <span className="text-text-primary font-mono text-sm">{data.totalKills}</span>
            </div>
            
            <div className="flex justify-between border-b border-border-muted pb-2">
              <span className="text-text-secondary font-mono text-sm">Total Deaths:</span>
              <span className="text-text-primary font-mono text-sm">{data.totalDeaths}</span>
            </div>
            
            <div className="flex justify-between col-span-2 border-b border-border-muted pb-2">
              <span className="text-text-secondary font-mono text-sm">Final Blow:</span>
              <span className="text-text-primary font-mono text-sm">{data.causeOfDeath}</span>
            </div>
            
            <div className="flex justify-between col-span-2">
              <span className="text-text-secondary font-mono text-sm">Fell in:</span>
              <span className="text-text-primary font-mono text-sm">{data.zoneOfDeath}</span>
            </div>
          </div>
        </div>

        {/* Memorial Message */}
        <p className="text-text-secondary text-lg italic mb-8 font-serif">
          Death claims your progress, but not your spirit. <span className="text-accent-gold">{data.characterName}</span> rises again, stripped of all but what was banked in the stash.
        </p>

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={handleViewHallOfFame}
            className="px-6 py-3 bg-bg-elevated border border-border-muted text-text-primary rounded hover:bg-bg-panel hover:border-accent-gold transition-colors flex items-center gap-2"
          >
            <Trophy className="w-5 h-5" />
            Hall of Fame
          </button>
          
          <button
            onClick={handleRiseAgain}
            className="px-6 py-3 bg-accent text-bg-primary rounded hover:bg-accent-hover transition-colors font-semibold"
          >
            Rise Again
          </button>
        </div>
      </div>
    </div>
  );
}
