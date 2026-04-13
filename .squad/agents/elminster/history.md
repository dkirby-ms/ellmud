# elminster — History

**For a quick overview, see [summary.md](./summary.md)**

---

## Core Context

**Role:** Workflow Engine

**Key Focus Areas:**
- Core responsibilities for this agent
- Integration with wider system architecture  
- Test coverage and reliability
- Documentation and knowledge transfer

**Recent Work (Last 30 Lines):**


---

**Decisions Logged to:** `.squad/decisions/inbox/elminster-research-417-418.md`
**GitHub Comments:** Both issues annotated with research summary and architect recommendations
**Labels Updated:** Both issues transitioned from go:needs-research to go:ready, assigned squad member labels

**Process Notes:**
- Directives review confirmed inventory/stash separation and user flags architecture fit both issues
- No conflicts with existing architecture patterns
- Both issues are self-contained with clear acceptance criteria
- No cross-system dependencies or blocking work identified

### 2025-07-22: Re-Review PR #442 — Unified Corpse System (REJECTED)

**Task:** Re-review corpse system PR after Drizzt's revision and Minsc's test rewrite.

**Verdict: REJECT — Test quality failure persists**

**Implementation (4 of 5 points resolved):**
- ✅ Group loot: Round-robin removed, replaced with shared corpse access via room.items containers
- ✅ TTL/decay: Creature corpses 5min, player corpses 10min, tickCorpseDecay() sweeps every tick
- ✅ Player corpse unification: Both creature and player death use identical Item with containerContents
- ⚠️ Single architecture: ZoneRoom clean, but CorpseSystem.ts still exists (not imported by production code)
- ❌ Test quality: 40 commented-out assertions, 10 active trivial assertions. Zero meaningful coverage.

**The Blocker:** creature-corpse.test.ts has 29 "passing" tests with no real assertions. Not one test verifies corpse creation, loot contents, open/take commands, or decay. This is the same issue from the original rejection — tests were never actually rewritten.

**Assignment:** Minsc (QA) to rewrite tests with real assertions. Decision logged to .squad/decisions/inbox/elminster-corpse-re-review-442.md.


---

## Detailed History

Full session logs and dated entries have been moved to `history-archive.md` to keep this file compact.
