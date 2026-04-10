/**
 * VisibilityService — Server-authoritative player visibility filtering.
 *
 * Determines what information a viewer can see about a target player,
 * based on the target's flags, spatial proximity, and viewer permissions.
 *
 * Rules (Issue #365, scope decisions):
 * - [Anon] hides name, level, class UNLESS viewer is in the same room OR viewer is admin.
 * - [RP] is always visible — purely informational.
 * - All checks are server-authoritative; the client only displays what it receives.
 */

import type { CharacterFlags } from '@ellmud/shared';

/** Context about the viewer performing the observation. */
export interface ViewerContext {
  /** The viewer's character ID (session ID in runtime). */
  characterId: string;
  /** The room the viewer is currently in. */
  roomId: string;
  /** Whether the viewer has admin privileges. */
  isAdmin: boolean;
}

/** Context about the target being observed. */
export interface TargetContext {
  /** The target's character ID. */
  characterId: string;
  /** The target's character name. */
  characterName: string;
  /** The room the target is currently in. */
  roomId: string;
  /** The target's current flags. */
  flags: CharacterFlags;
}

/** The visibility result — what the viewer is allowed to see. */
export interface VisiblePlayerInfo {
  /** Display name: real name or "A shadowed figure" if anon-hidden. */
  displayName: string;
  /** Whether the target's identity is hidden from this viewer. */
  isAnonymous: boolean;
  /** Active display tags (e.g., "[RP]", "[Anon]"). */
  tags: string[];
}

/**
 * Resolve what a viewer can see about a target player.
 *
 * Pure function — no side effects, no database calls.
 */
export function resolveVisibility(
  viewer: ViewerContext,
  target: TargetContext,
): VisiblePlayerInfo {
  const tags: string[] = [];
  let isAnonymous = false;
  let displayName = target.characterName;

  // [RP] tag is always visible
  if (target.flags.rp) {
    tags.push('[RP]');
  }

  // [Anon] processing
  if (target.flags.anon) {
    tags.push('[Anon]');

    const sameRoom = viewer.roomId === target.roomId;
    const canSeeThrough = sameRoom || viewer.isAdmin;

    if (!canSeeThrough) {
      isAnonymous = true;
      displayName = 'A shadowed figure';
    }
  }

  return {
    displayName,
    isAnonymous,
    tags,
  };
}
