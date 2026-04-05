export class ThreatTable {
  private threat = new Map<string, number>();
  addBaseThreat(playerId: string): void {
    const current = this.threat.get(playerId) ?? 0;
    this.threat.set(playerId, current + 10);
  }
  addDamageThreat(playerId: string, damage: number): void {
    const current = this.threat.get(playerId) ?? 0;
    this.threat.set(playerId, current + damage);
  }
  addHealingThreat(_p: string, _h: number, _c: number): void { }
  applyTaunt(_p: string): void { }
  removePlayer(playerId: string): void {
    this.threat.delete(playerId);
  }
  clear(): void {
    this.threat.clear();
  }
  getHighestThreatTarget(reachablePlayers: string[]): string | null {
    let highestThreat = -1;
    let targetId: string | null = null;
    for (const playerId of reachablePlayers) {
      if (!this.threat.has(playerId)) continue;
      const threat = this.threat.get(playerId)!;
      if (threat > highestThreat) {
        highestThreat = threat;
        targetId = playerId;
      }
    }
    return targetId;
  }
  getThreat(playerId: string): number {
    return this.threat.get(playerId) ?? 0;
  }
  getAllThreat(): Map<string, number> {
    return new Map(this.threat);
  }
  isEmpty(): boolean {
    return this.threat.size === 0;
  }
}
