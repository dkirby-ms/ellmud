/**
 * In-memory group manager (#403 Phase 3).
 *
 * Groups are session-scoped and transient (no persistence).
 * The leader forms the group from their followers, can add/remove members,
 * transfer leadership, or disband. If the leader disconnects, the group disbands.
 *
 * Max group size: 20 players.
 */

export const MAX_GROUP_SIZE = 20;

export interface GroupMember {
  sessionId: string;
  characterName: string;
}

export interface Group {
  id: string;
  leaderId: string;
  members: Map<string, GroupMember>; // sessionId → GroupMember
}

let nextGroupId = 1;

export class GroupManager {
  private readonly groups = new Map<string, Group>(); // groupId → Group
  private readonly playerGroup = new Map<string, string>(); // sessionId → groupId

  /** Create a new group with the given leader and initial members (from followers). */
  formGroup(
    leaderId: string,
    leaderName: string,
    initialMembers: Array<{ sessionId: string; characterName: string }>,
  ): Group | { error: string } {
    if (this.playerGroup.has(leaderId)) {
      return { error: 'You are already in a group.' };
    }

    if (initialMembers.length === 0) {
      return { error: 'You have no followers to form a group with.' };
    }

    // Filter out members already in a group
    const eligible = initialMembers.filter(m => !this.playerGroup.has(m.sessionId));
    if (eligible.length === 0) {
      return { error: 'All your followers are already in groups.' };
    }

    if (1 + eligible.length > MAX_GROUP_SIZE) {
      return { error: `A group can have at most ${MAX_GROUP_SIZE} members.` };
    }

    const groupId = `group-${nextGroupId++}`;
    const members = new Map<string, GroupMember>();
    members.set(leaderId, { sessionId: leaderId, characterName: leaderName });
    for (const m of eligible) {
      members.set(m.sessionId, m);
    }

    const group: Group = { id: groupId, leaderId, members };
    this.groups.set(groupId, group);

    // Register all members
    for (const sid of members.keys()) {
      this.playerGroup.set(sid, groupId);
    }

    return group;
  }

  /** Add a player to an existing group. Only the leader can add. */
  addMember(
    requesterId: string,
    targetId: string,
    targetName: string,
  ): { success: true; group: Group } | { success: false; error: string } {
    const groupId = this.playerGroup.get(requesterId);
    if (!groupId) return { success: false, error: 'You are not in a group.' };

    const group = this.groups.get(groupId);
    if (!group) return { success: false, error: 'Group not found.' };

    if (group.leaderId !== requesterId) {
      return { success: false, error: 'Only the group leader can add members.' };
    }

    if (this.playerGroup.has(targetId)) {
      return { success: false, error: `${targetName} is already in a group.` };
    }

    if (group.members.size >= MAX_GROUP_SIZE) {
      return { success: false, error: `Group is full (${MAX_GROUP_SIZE} members max).` };
    }

    group.members.set(targetId, { sessionId: targetId, characterName: targetName });
    this.playerGroup.set(targetId, groupId);

    return { success: true, group };
  }

  /** Remove a member from the group. Leader can kick; members can leave themselves. */
  removeMember(
    requesterId: string,
    targetId: string,
  ): { success: true; group: Group; removed: GroupMember } | { success: false; error: string } {
    const groupId = this.playerGroup.get(requesterId);
    if (!groupId) return { success: false, error: 'You are not in a group.' };

    const group = this.groups.get(groupId);
    if (!group) return { success: false, error: 'Group not found.' };

    // Leader can remove anyone; non-leaders can only remove themselves
    if (requesterId !== targetId && group.leaderId !== requesterId) {
      return { success: false, error: 'Only the group leader can remove members.' };
    }

    // Leader can't kick themselves (use disband or transfer + leave)
    if (targetId === group.leaderId && requesterId === targetId) {
      return { success: false, error: 'The leader cannot leave. Use "group disband" or transfer leadership first.' };
    }

    const member = group.members.get(targetId);
    if (!member) return { success: false, error: 'That player is not in your group.' };

    group.members.delete(targetId);
    this.playerGroup.delete(targetId);

    // If group is down to 1 member (just leader), auto-disband
    if (group.members.size <= 1) {
      this.disbandGroup(group.id);
      return { success: true, group, removed: member };
    }

    return { success: true, group, removed: member };
  }

  /** Disband the group entirely. All members removed. */
  disbandGroup(groupId: string): GroupMember[] | null {
    const group = this.groups.get(groupId);
    if (!group) return null;

    const members = Array.from(group.members.values());
    for (const m of members) {
      this.playerGroup.delete(m.sessionId);
    }
    this.groups.delete(groupId);
    return members;
  }

  /** Transfer leadership to another member. */
  transferLeadership(
    requesterId: string,
    newLeaderId: string,
  ): { success: true; group: Group; newLeaderName: string } | { success: false; error: string } {
    const groupId = this.playerGroup.get(requesterId);
    if (!groupId) return { success: false, error: 'You are not in a group.' };

    const group = this.groups.get(groupId);
    if (!group) return { success: false, error: 'Group not found.' };

    if (group.leaderId !== requesterId) {
      return { success: false, error: 'Only the group leader can transfer leadership.' };
    }

    if (newLeaderId === requesterId) {
      return { success: false, error: 'You are already the leader.' };
    }

    const newLeader = group.members.get(newLeaderId);
    if (!newLeader) return { success: false, error: 'That player is not in your group.' };

    group.leaderId = newLeaderId;
    return { success: true, group, newLeaderName: newLeader.characterName };
  }

  /** Get the group a player belongs to. */
  getGroup(playerId: string): Group | undefined {
    const groupId = this.playerGroup.get(playerId);
    if (!groupId) return undefined;
    return this.groups.get(groupId);
  }

  /** Get the group ID for a player. */
  getGroupId(playerId: string): string | undefined {
    return this.playerGroup.get(playerId);
  }

  /** Check if a player is a group leader. */
  isLeader(playerId: string): boolean {
    const group = this.getGroup(playerId);
    return group?.leaderId === playerId;
  }

  /**
   * Clean up when a player disconnects/leaves.
   * If the player is the leader, the group disbands.
   * If the player is a regular member, they are removed.
   * Returns disbanded member list if a disband occurred, or null.
   */
  handlePlayerLeave(playerId: string): { disbanded: boolean; members: GroupMember[]; groupId: string } | null {
    const groupId = this.playerGroup.get(playerId);
    if (!groupId) return null;

    const group = this.groups.get(groupId);
    if (!group) {
      this.playerGroup.delete(playerId);
      return null;
    }

    if (group.leaderId === playerId) {
      // Leader left → disband
      const members = this.disbandGroup(groupId);
      return members ? { disbanded: true, members, groupId } : null;
    } else {
      // Regular member left
      const member = group.members.get(playerId);
      group.members.delete(playerId);
      this.playerGroup.delete(playerId);

      // Auto-disband if only leader remains
      if (group.members.size <= 1) {
        const remaining = this.disbandGroup(groupId);
        return remaining ? { disbanded: true, members: remaining, groupId } : null;
      }

      return member ? { disbanded: false, members: [member], groupId } : null;
    }
  }

  /** Reset the group ID counter (for testing). */
  static resetIdCounter(): void {
    nextGroupId = 1;
  }
}
