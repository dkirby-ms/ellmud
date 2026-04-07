# Drizzt: Research #307 Death Screen Clearing
**Timestamp:** 2026-04-05T18:10:00Z  
**Agent:** Drizzt (Backend/Systems)  
**Mode:** background  
**Task:** Research root cause of #307 (death scroll clearing issue)

## Outcome

**Status:** ✅ RESEARCH COMPLETE

### Finding

Root cause identified at `packages/client-ui/src/hooks/useZoneConnection.ts:241`

The `CLEAR_MESSAGES` action is dispatched unconditionally during state transitions, including the death → hub transition. This nukes the narrative log that players see when they die.

### Critical Code Path

```
Death Event
→ Player transitions from zone to hub
→ useZoneConnection effect fires
→ dispatch(CLEAR_MESSAGES) executed
→ Narrative log cleared (PROBLEM)
```

### Impact Analysis

- **Severity:** High — Loss of death narrative disrupts player feedback
- **User Experience:** Players see nothing when dying (confusing)
- **Root:** Message clearing logic doesn't distinguish between navigation types

### Recommended Fix

Conditionally skip `CLEAR_MESSAGES` when:
1. Death overlay is currently visible, OR
2. Transitioning from zone to hub via death event

This allows:
- Normal zone navigation: Messages cleared (as intended)
- Death transition: Messages preserved (for death feedback)
- Hub exploration: Fresh message state (as intended)

### Files to Modify

- `packages/client-ui/src/hooks/useZoneConnection.ts` — Add death check before CLEAR_MESSAGES

## Handoff

Ready for implementation by Regis (Frontend Dev). Fix is straightforward condition check.
