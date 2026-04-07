# Minsc: Research #306 Zone Timer Message
**Timestamp:** 2026-04-05T18:10:00Z  
**Agent:** Minsc (QA/Testing)  
**Mode:** background  
**Task:** Research root cause of #306 (zone timer message in non-combat)

## Outcome

**Status:** ✅ RESEARCH COMPLETE

### Finding

Timer message display identified at `packages/client-ui/src/hooks/useZoneConnection.ts:177`

The timer system message is being shown for ALL zone states, including open exploration. This is misleading because:
- Timer only relevant during active combat
- Open zones (no combat) show timer message anyway
- Player confusion about whether combat is active

### Message Logic Analysis

Current: Timer message shown when zone state changes (any change)
```
Zone Joined
→ Message: "Combat starting in X seconds..."
→ But zone is open, no combat threat
```

### Impact Analysis

- **Severity:** Medium — UX confusion, no functional breakage
- **User Experience:** Players see combat timer in peaceful exploration
- **Context:** Timer system is necessary for real combat zones, but message placement is wrong

### Recommended Fix

Show timer message **only** during:
1. `active` combat state — Timer is real, countdown matters
2. `destabilising` state — Zone becoming unstable, threat present

Skip message for:
- `open` state — No combat threat
- `transit` state — Player transitioning through

This preserves timer system functionality while removing misleading UI.

### Files to Modify

- `packages/client-ui/src/hooks/useZoneConnection.ts` — Add state check before timer message display

## Handoff

Ready for implementation by Regis (Frontend Dev). Fix requires conditional on zone state.
