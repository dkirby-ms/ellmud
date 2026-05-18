# drizzt — History

**For a quick overview, see [summary.md](./summary.md)**

---

### 2026-04-13: Permadeath DB Schema & Hall of Fame API (DELIVERED)

**Task:** Build permadeath database schema, server config, and Hall of Fame REST API.

**Outcome:** ✅ DELIVERED — Migration 017 created, config integrated, leaderboard API ready.

**Deliverable:** 
- **Migration 017:** `hall_of_fame` table with character/player metadata, survival metrics, death info
- **Config:** Permadeath env vars integrated (PERMADEATH_ENABLED, PERMADEATH_THRESHOLD)
- **API Endpoints:** `GET /api/hall-of-fame` paginated leaderboard + `/api/hall-of-fame/stats` aggregate stats

**Design Note:** Initial implementation used threshold model (multiple deaths before permadeath). User directive simplified to boolean toggle — removed threshold from active logic, kept config field for backward compatibility.

**Integration:** System ready for Jarlaxle death handler, Regis UI, and Minsc test coverage.
