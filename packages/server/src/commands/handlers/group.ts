/**
 * group [subcommand] — Group management commands (#403 Phase 3).
 *
 * Subcommands:
 *   group form              — Form a group from your current followers.
 *   group add <player>      — Add a player to the group (must be following you or have consented).
 *   group remove <player>   — Remove a member from the group (leader only).
 *   group kick <player>     — Alias for remove.
 *   group leave             — Leave the group (non-leaders).
 *   group disband           — Disband the entire group (leader only).
 *   group leader <player>   — Transfer leadership to another member.
 *   group share [on|off]    — Toggle or view loot sharing (leader only to toggle).
 *   group (no args)         — Show group information.
 *
 * gsay <message>            — Send a message only to group members.
 */

import type { CommandResult, CommandContext } from '../index.js';

export function handleGroup(ctx: CommandContext): CommandResult {
  const { args } = ctx;

  if (!ctx.groupManager) {
    return { narrations: [{ text: 'Groups are not available here.', type: 'system' }] };
  }

  if (args.length === 0) {
    return showGroupInfo(ctx);
  }

  const subcommand = args[0]!.toLowerCase();
  const subArgs = args.slice(1);

  switch (subcommand) {
    case 'form':
      return handleGroupForm(ctx);
    case 'add':
      return handleGroupAdd(ctx, subArgs);
    case 'remove':
    case 'kick':
      return handleGroupRemove(ctx, subArgs);
    case 'leave':
      return handleGroupLeave(ctx);
    case 'disband':
      return handleGroupDisband(ctx);
    case 'leader':
      return handleGroupLeader(ctx, subArgs);
    case 'share':
      return handleGroupShare(ctx, subArgs);
    default:
      return {
        narrations: [{
          text: `Unknown group command "${subcommand}". Use: form, add, remove, leave, disband, leader, share, or just "group" for info.`,
          type: 'system',
        }],
      };
  }
}

function showGroupInfo(ctx: CommandContext): CommandResult {
  const gm = ctx.groupManager!;
  const group = gm.getGroup(ctx.player.sessionId);

  if (!group) {
    return { narrations: [{ text: 'You are not in a group.', type: 'system' }] };
  }

  const leaderMember = group.members.get(group.leaderId);
  const leaderName = leaderMember?.characterName ?? 'Unknown';
  const sharingStatus = group.lootSharing ? 'ON' : 'OFF';
  const lines = [
    `── Group ──`,
    `Leader: ${leaderName}`,
    `Loot Sharing: ${sharingStatus}`,
    `Members (${group.members.size}):`,
  ];

  for (const member of group.members.values()) {
    const tag = member.sessionId === group.leaderId ? ' [Leader]' : '';
    lines.push(`  ${member.characterName}${tag}`);
  }

  return { narrations: [{ text: lines.join('\n'), type: 'system' }] };
}

function handleGroupForm(ctx: CommandContext): CommandResult {
  const { player } = ctx;
  const gm = ctx.groupManager!;
  const charName = ctx.characterName ?? 'Someone';

  if (gm.getGroup(player.sessionId)) {
    return { narrations: [{ text: 'You are already in a group.', type: 'system' }] };
  }

  if (player.followers.size === 0) {
    return { narrations: [{ text: 'You have no followers to form a group with. Players must "follow" you first.', type: 'system' }] };
  }

  // Collect follower info
  const followers: Array<{ sessionId: string; characterName: string }> = [];
  for (const followerId of player.followers) {
    const followerName = resolveCharacterName(ctx, followerId);
    if (followerName) {
      followers.push({ sessionId: followerId, characterName: followerName });
    }
  }

  const result = gm.formGroup(player.sessionId, charName, followers);

  if ('error' in result) {
    return { narrations: [{ text: result.error, type: 'system' }] };
  }

  // Set groupId on all member PlayerStates
  for (const member of result.members.values()) {
    const memberPlayer = ctx.resolvePlayerByName?.(member.characterName)?.player;
    if (memberPlayer) {
      memberPlayer.groupId = result.id;
    }
  }
  player.groupId = result.id;

  const memberNames = followers.map(f => f.characterName).join(', ');
  const groupResult: CommandResult & { _groupEvent?: { type: string; groupId: string; memberIds: string[]; message: string } } = {
    narrations: [{ text: `You form a group with: ${memberNames}.`, type: 'room' }],
    _groupEvent: {
      type: 'formed',
      groupId: result.id,
      memberIds: Array.from(result.members.keys()),
      message: `${charName} has formed a group.`,
    },
  };
  return groupResult;
}

function handleGroupAdd(ctx: CommandContext, args: string[]): CommandResult {
  const { player } = ctx;
  const gm = ctx.groupManager!;

  if (args.length === 0) {
    return { narrations: [{ text: 'Add whom? Usage: group add <player>', type: 'system' }] };
  }

  const group = gm.getGroup(player.sessionId);
  if (!group) {
    return { narrations: [{ text: 'You are not in a group.', type: 'system' }] };
  }

  if (group.leaderId !== player.sessionId) {
    return { narrations: [{ text: 'Only the group leader can add members.', type: 'system' }] };
  }

  const targetName = args.join(' ');
  const target = findTarget(ctx, targetName);

  if (!target) {
    return { narrations: [{ text: `No player named "${targetName}" found.`, type: 'system' }] };
  }

  if (target.sessionId === player.sessionId) {
    return { narrations: [{ text: `You are already in the group.`, type: 'system' }] };
  }

  // Check: target must be following the leader OR have consented to the leader
  const targetPlayer = ctx.resolvePlayerByName?.(target.name)?.player;
  const isFollowing = player.followers.has(target.sessionId);
  const hasConsented = targetPlayer?.consentedPlayers.has(player.sessionId) ?? false;

  if (!isFollowing && !hasConsented) {
    return {
      narrations: [{
        text: `${target.name} must be following you or have consented to you before they can be added to the group.`,
        type: 'system',
      }],
    };
  }

  const result = gm.addMember(player.sessionId, target.sessionId, target.name);

  if (!result.success) {
    return { narrations: [{ text: result.error, type: 'system' }] };
  }

  // Set groupId on the new member's PlayerState
  if (targetPlayer) {
    targetPlayer.groupId = result.group.id;
  }

  const charName = ctx.characterName ?? 'Someone';
  const addResult: CommandResult & { _groupEvent?: { type: string; groupId: string; memberIds: string[]; targetId: string; message: string } } = {
    narrations: [{ text: `You add ${target.name} to the group.`, type: 'room' }],
    _groupEvent: {
      type: 'added',
      groupId: result.group.id,
      memberIds: Array.from(result.group.members.keys()),
      targetId: target.sessionId,
      message: `${charName} adds ${target.name} to the group.`,
    },
  };
  return addResult;
}

function handleGroupRemove(ctx: CommandContext, args: string[]): CommandResult {
  const { player } = ctx;
  const gm = ctx.groupManager!;

  if (args.length === 0) {
    return { narrations: [{ text: 'Remove whom? Usage: group remove <player>', type: 'system' }] };
  }

  const targetName = args.join(' ');
  const group = gm.getGroup(player.sessionId);

  if (!group) {
    return { narrations: [{ text: 'You are not in a group.', type: 'system' }] };
  }

  // Find target by name in the group
  let targetId: string | undefined;
  let targetDisplayName: string | undefined;
  for (const member of group.members.values()) {
    if (member.characterName.toLowerCase() === targetName.toLowerCase()) {
      targetId = member.sessionId;
      targetDisplayName = member.characterName;
      break;
    }
  }

  if (!targetId || !targetDisplayName) {
    return { narrations: [{ text: `"${targetName}" is not in your group.`, type: 'system' }] };
  }

  const result = gm.removeMember(player.sessionId, targetId);

  if (!result.success) {
    return { narrations: [{ text: result.error, type: 'system' }] };
  }

  // Clear groupId on the removed member's PlayerState
  const removedPlayer = ctx.resolvePlayerByName?.(targetDisplayName)?.player;
  if (removedPlayer) {
    removedPlayer.groupId = null;
  }

  const charName = ctx.characterName ?? 'Someone';
  const removeResult: CommandResult & { _groupEvent?: { type: string; groupId: string; targetId: string; message: string } } = {
    narrations: [{ text: `You remove ${targetDisplayName} from the group.`, type: 'room' }],
    _groupEvent: {
      type: 'removed',
      groupId: group.id,
      targetId,
      message: `${charName} removes ${targetDisplayName} from the group.`,
    },
  };
  return removeResult;
}

function handleGroupLeave(ctx: CommandContext): CommandResult {
  const { player } = ctx;
  const gm = ctx.groupManager!;

  const group = gm.getGroup(player.sessionId);
  if (!group) {
    return { narrations: [{ text: 'You are not in a group.', type: 'system' }] };
  }

  const result = gm.removeMember(player.sessionId, player.sessionId);

  if (!result.success) {
    return { narrations: [{ text: result.error, type: 'system' }] };
  }

  player.groupId = null;

  const charName = ctx.characterName ?? 'Someone';
  const leaveResult: CommandResult & { _groupEvent?: { type: string; groupId: string; memberIds: string[]; message: string } } = {
    narrations: [{ text: 'You leave the group.', type: 'room' }],
    _groupEvent: {
      type: 'left',
      groupId: group.id,
      memberIds: Array.from(group.members.keys()),
      message: `${charName} has left the group.`,
    },
  };
  return leaveResult;
}

function handleGroupDisband(ctx: CommandContext): CommandResult {
  const { player } = ctx;
  const gm = ctx.groupManager!;

  const group = gm.getGroup(player.sessionId);
  if (!group) {
    return { narrations: [{ text: 'You are not in a group.', type: 'system' }] };
  }

  if (group.leaderId !== player.sessionId) {
    return { narrations: [{ text: 'Only the group leader can disband the group.', type: 'system' }] };
  }

  const memberIds = Array.from(group.members.keys());
  const members = gm.disbandGroup(group.id);

  if (!members) {
    return { narrations: [{ text: 'Failed to disband the group.', type: 'system' }] };
  }

  // Clear groupId on all members
  for (const member of members) {
    const memberPlayer = ctx.resolvePlayerByName?.(member.characterName)?.player;
    if (memberPlayer) {
      memberPlayer.groupId = null;
    }
  }
  player.groupId = null;

  const charName = ctx.characterName ?? 'Someone';
  const disbandResult: CommandResult & { _groupEvent?: { type: string; groupId: string; memberIds: string[]; message: string } } = {
    narrations: [{ text: 'You disband the group.', type: 'room' }],
    _groupEvent: {
      type: 'disbanded',
      groupId: group.id,
      memberIds,
      message: `${charName} has disbanded the group.`,
    },
  };
  return disbandResult;
}

function handleGroupLeader(ctx: CommandContext, args: string[]): CommandResult {
  const { player } = ctx;
  const gm = ctx.groupManager!;

  if (args.length === 0) {
    return { narrations: [{ text: 'Transfer leadership to whom? Usage: group leader <player>', type: 'system' }] };
  }

  const targetName = args.join(' ');
  const group = gm.getGroup(player.sessionId);

  if (!group) {
    return { narrations: [{ text: 'You are not in a group.', type: 'system' }] };
  }

  // Find target by name in the group
  let targetId: string | undefined;
  for (const member of group.members.values()) {
    if (member.characterName.toLowerCase() === targetName.toLowerCase()) {
      targetId = member.sessionId;
      break;
    }
  }

  if (!targetId) {
    return { narrations: [{ text: `"${targetName}" is not in your group.`, type: 'system' }] };
  }

  const result = gm.transferLeadership(player.sessionId, targetId);

  if (!result.success) {
    return { narrations: [{ text: result.error, type: 'system' }] };
  }

  const charName = ctx.characterName ?? 'Someone';
  const leaderResult: CommandResult & { _groupEvent?: { type: string; groupId: string; memberIds: string[]; message: string } } = {
    narrations: [{ text: `You transfer group leadership to ${result.newLeaderName}.`, type: 'room' }],
    _groupEvent: {
      type: 'leader_changed',
      groupId: group.id,
      memberIds: Array.from(group.members.keys()),
      message: `${charName} transfers group leadership to ${result.newLeaderName}.`,
    },
  };
  return leaderResult;
}

function handleGroupShare(ctx: CommandContext, args: string[]): CommandResult {
  const { player } = ctx;
  const gm = ctx.groupManager!;

  const group = gm.getGroup(player.sessionId);
  if (!group) {
    return { narrations: [{ text: 'You are not in a group.', type: 'system' }] };
  }

  // No args: show current status
  if (args.length === 0) {
    const status = group.lootSharing ? 'ON' : 'OFF';
    return { narrations: [{ text: `Loot sharing is currently ${status}.`, type: 'system' }] };
  }

  // Toggle requires leader
  const arg = args[0]!.toLowerCase();
  if (arg !== 'on' && arg !== 'off') {
    return { narrations: [{ text: 'Usage: group share [on|off]', type: 'system' }] };
  }

  const enabled = arg === 'on';
  const result = gm.setLootSharing(player.sessionId, enabled);

  if (!result.success) {
    return { narrations: [{ text: result.error, type: 'system' }] };
  }

  const status = enabled ? 'ON' : 'OFF';
  const charName = ctx.characterName ?? 'Someone';
  const shareResult: CommandResult & { _groupEvent?: { type: string; groupId: string; memberIds: string[]; message: string } } = {
    narrations: [{ text: `You turn loot sharing ${status}.`, type: 'room' }],
    _groupEvent: {
      type: 'loot_sharing_changed',
      groupId: group.id,
      memberIds: Array.from(group.members.keys()),
      message: `${charName} turns loot sharing ${status}.`,
    },
  };
  return shareResult;
}

/** gsay — Send a message to all group members. */
export function handleGsay(ctx: CommandContext): CommandResult {
  const { player, args } = ctx;

  if (!ctx.groupManager) {
    return { narrations: [{ text: 'Groups are not available here.', type: 'system' }] };
  }

  const gm = ctx.groupManager;
  const group = gm.getGroup(player.sessionId);

  if (!group) {
    return { narrations: [{ text: 'You are not in a group.', type: 'system' }] };
  }

  if (args.length === 0) {
    return { narrations: [{ text: 'Say what to your group? Usage: gsay <message>', type: 'system' }] };
  }

  const message = args.join(' ');
  const charName = ctx.characterName ?? 'Someone';

  const gsayResult: CommandResult & {
    _gsay?: { groupId: string; senderId: string; senderName: string; message: string; memberIds: string[] };
  } = {
    narrations: [{ text: `[Group] You say: ${message}`, type: 'speech' }],
    _gsay: {
      groupId: group.id,
      senderId: player.sessionId,
      senderName: charName,
      message,
      memberIds: Array.from(group.members.keys()),
    },
  };
  return gsayResult;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function findTarget(ctx: CommandContext, name: string): { sessionId: string; name: string } | undefined {
  const lower = name.toLowerCase();

  // Check same room first
  const inRoom = ctx.otherPlayerInfo?.find(
    (p) => !p.anon && p.name.toLowerCase() === lower,
  );
  if (inRoom) return { sessionId: inRoom.sessionId, name: inRoom.name };

  // Zone-wide lookup
  if (ctx.resolvePlayerByName) {
    const resolved = ctx.resolvePlayerByName(name);
    if (resolved) return { sessionId: resolved.sessionId, name: resolved.characterName };
  }

  return undefined;
}

function resolveCharacterName(ctx: CommandContext, sessionId: string): string | undefined {
  // Check otherPlayerInfo first (same room)
  const info = ctx.otherPlayerInfo?.find(p => p.sessionId === sessionId);
  if (info) return info.name;

  // Use resolvePlayerById for zone-wide lookup
  if (ctx.resolvePlayerById) {
    const resolved = ctx.resolvePlayerById(sessionId);
    if (resolved) return resolved.characterName;
  }

  return undefined;
}
