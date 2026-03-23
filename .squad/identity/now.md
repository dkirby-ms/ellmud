# Current Focus

**Phase:** Wave 2 in progress ✅ — Issues #22 & #23 complete, #25 implementation underway

**Wave 2 Status:**
- ✅ Issue #22 (Sound Propagation) — CLOSED, PR #118 merged to dev
- ✅ Issue #23 (Trace System) — CLOSED, PR #117 merged to dev
- 🔨 Issue #25 (Player Awareness & Stealth Detection) — Drizzt implementation in progress

**Test Suite:**
- All 1,061 tests passing
- 120 anticipatory test scaffolds active (sound, trace, awareness)
- Zero regressions

**Infrastructure Locked:**
- **Sound System:** Per-room BFS, room modifiers, noise constants shared
- **Trace System:** Suppression at creation, TTL decay, skill-scaled descriptions
- **Narration Pipeline:** 3 new LLM narration types + fallback templates (Volo)
- **Awareness Contract:** Detection tiers, player names never revealed (cardinal rule)

**What Shipped (Wave 2 Preview):**
- PR #117 (Trace System): 33 unit tests, integration with ShardRoom
- PR #118 (Sound Propagation): 34 unit tests, O(N) BFS, modifiers functional
- PR #115 (Anticipatory Tests): 208 tests defining acceptance criteria
- PR #116 (Sensory Narration): LLM templates + fallbacks for 3 systems

**What's Next — Phase 2 Remaining (after #25):**
- #21 Multi-Player Shards (Redis, KEDA auto-scaling)
- #24 PvP Combat
- #26 Proximity Communication
- #27 Death & Downing
- #28–#49 (Phase 2–4 features)

**Recommendation:** Sound + Trace systems now locked in dev. PR #114 (dev → uat) waiting for #25 merge. Once #25 lands, promote Wave 2 features to UAT.

**Deployment Readiness:**
- Container Apps pipeline validated
- All sensory system infrastructure ready
- PR #114 ready to merge after #25
