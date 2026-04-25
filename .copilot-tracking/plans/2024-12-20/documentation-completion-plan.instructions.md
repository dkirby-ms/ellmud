<!-- markdownlint-disable-file -->

# Documentation Completion Plan

**Date:** 2024-12-20
**Difficulty:** Medium
**Estimated effort:** 3-4 hours
**Status:** In execution

## User Requests

All requests are implicit continuations from Phase 5 discovery:

1. Complete docs/api-reference.md ShardState removal
2. Update docs/llm-integration.md  
3. Create docs/getting-started.md
4. Create docs/testing-guide.md
5. Archive old design docs (sandbox-*.md, 337-combat-grid-*.md)

## Overview & Objectives

Complete comprehensive documentation alignment by:
- Removing remaining extraction/shard terminology (api-reference, llm-integration)
- Adding developer onboarding guides (getting-started, testing-guide)
- Cleaning up deprecated design documentation

This follows the prior session's direction updates (GDD, README, player-guide, etc.) and creates a complete, coherent documentation suite.

## Context Summary

**Prior work completed:**
- GDD.md, README.md, CONTRIBUTING.md updated to MUD/MMORPG direction
- New docs created: unity-client.md, zone-content.md, zone-designer-quickstart.md
- API reference, architecture.md updated
- Admin guide updated for zone management

**Discovered gaps:**
- api-reference.md still contains `shard_state` message type and ShardState lifecycle
- llm-integration.md references `shard_stability` and extraction MUD context
- No getting-started guide for new developers
- No testing guide for contributors
- Old design docs (Figma-focused, arena/extraction design) should be archived

## Implementation Checklist

<!-- parallelizable: false -->

### Phase 1: Archive Design Docs ✅ PARALLELIZABLE

- [ ] Move 8 design files to docs/design/_archive/ directory
  - [ ] 337-combat-grid-frontend.md
  - [ ] 337-combat-grid-proposal.md
  - [ ] 337-combat-grid-systems.md
  - [ ] 337-combat-grid-visual-design.md
  - [ ] sandbox-arena-content.md
  - [ ] sandbox-combat-arena.md
  - [ ] sandbox-combat-mechanics.md
  - [ ] sandbox-server-infrastructure.md
- [ ] Update docs/design/README.md to document archival and link to current design docs

### Phase 2: Update api-reference.md ✅ PARALLELIZABLE

- [ ] Remove `shard_state` message type (lines ~110-128)
- [ ] Remove ShardState enum definition
- [ ] Verify all message types align with current protocol (zone/stronghold/group)
- [ ] Validate message examples match current implementation

### Phase 3: Update llm-integration.md ✅ PARALLELIZABLE

- [ ] Replace `shard_stability` with `zone_stability` or remove if N/A
- [ ] Update NarrationRoom schema to remove shard_stability
- [ ] Replace "extraction MUD" context with zone-based examples
- [ ] Update schema keywords and example prompts
- [ ] Validate LLM context examples align with persistent zone gameplay

### Phase 4: Create getting-started.md ✅ SEQUENTIAL (needs repo exploration)

- [ ] Section: Prerequisites (Node, npm, Docker)
- [ ] Section: Clone & Install (git clone, npm install in monorepo)
- [ ] Section: Environment Setup (.env config, DATABASE_URL, etc.)
- [ ] Section: Run Server (npm run dev:server)
- [ ] Section: Run Client (npm run dev:client)
- [ ] Section: First Session (create account, character, explore zone)
- [ ] Section: Common Commands (look, go, attack, etc.)
- [ ] Section: Troubleshooting (port conflicts, dependency issues)

### Phase 5: Create testing-guide.md ✅ SEQUENTIAL (needs test pattern research)

- [ ] Section: Overview (test structure, frameworks: vitest, playwright)
- [ ] Section: Unit Tests (vitest patterns, running tests, mocking Colyseus)
- [ ] Section: E2E Tests (playwright patterns, fixtures, test organization)
- [ ] Section: Running Tests (commands: npm test, npm run test:e2e, filtering)
- [ ] Section: Writing Tests (best practices, common patterns)
- [ ] Section: Coverage Goals (current coverage, targets)
- [ ] Section: Debugging Tests (verbose logs, pause in debugger)

## Planning Log

### Approach Selected

1. **Archival (Phase 1):** Simple file moves and README update. Can execute immediately.
2. **API & LLM (Phases 2-3):** Targeted string replacements. Can run in parallel.
3. **New Guides (Phases 4-5):** Require codebase exploration. Run sequentially after setup/testing investigation.

### Dependencies

- Getting-started guide depends on package.json scripts inspection
- Testing guide depends on vitest.config.ts, playwright.config.ts, and test file review
- No blocking dependencies between archival and content updates

## Success Criteria

✅ **Completion:**
- All 8 design docs moved to _archive/
- api-reference.md has no shard/extraction references
- llm-integration.md updated to zone-based context
- getting-started.md provides clear onboarding path for new developers
- testing-guide.md documents test patterns and execution

✅ **Validation:**
- grep search confirms no "shard_state" in api-reference.md
- grep search confirms no "shard_stability" in llm-integration.md
- All 5 new/updated files follow markdown standards
- Links between docs validated (getting-started → setup, testing-guide → contributing)

## Dependencies

**Instructions files:**
- `.github/instructions/hve-core/markdown.instructions.md` (writing style)
- `.github/instructions/hve-core/writing-style.instructions.md` (tone/voice)

**Related documentation:**
- GDD.md (authority on game direction)
- CONTRIBUTING.md (contributor expectations)
- setup.md (environment configuration)
- docs/architecture.md (system design)

## Next Steps

1. Execute Phase 1: Archive design docs
2. Execute Phases 2-3 in parallel: Update api-reference and llm-integration
3. Execute Phase 4: Create getting-started.md (research package.json, setup.md)
4. Execute Phase 5: Create testing-guide.md (research test files and configs)
5. Phase 4 (Review): Validate all changes and completion

