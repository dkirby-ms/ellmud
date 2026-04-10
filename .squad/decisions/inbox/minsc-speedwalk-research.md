# Minsc — Speedwalk False Positive Research (#380 Residual)

**Date:** 2025-07-18
**Issue:** #380 — Moving quickly with individually typed commands triggers speedwalk message
**Status:** Root cause identified, fix approaches proposed, reproduction test written

---

## Summary

The original #380 fix (`shouldTreatAsSpeedwalk` requiring 2+ moves) correctly prevents **single direction letters** from triggering speedwalk. However, a **residual false positive** remains: when a player types individual direction commands rapidly (e.g., `n` Enter `e` Enter), the input can accumulate to `"ne"` before the second submit, which `shouldTreatAsSpeedwalk("ne")` correctly identifies as 2 moves — triggering the "Speedwalk: 2 moves (ne)" message even though the player intended two separate single-direction commands.

## Root Cause Analysis

### Trigger 1: React Controlled Input Race Condition (primary)

The command input in `ZoneExploration.tsx` (line 512-516) is a **React controlled input**:

```tsx
<input value={command} onChange={(e) => setCommand(e.target.value)} />
```

In `handleSubmit` (line 173-218), `setCommand("")` clears the input after submission. However, React 18's state update is **not synchronous to the DOM**. The update is committed after the event handler returns and React re-renders.

**The race window:**

1. User submits `"n"` → `handleSubmit` fires → `setCommand("")` is **queued**
2. React needs to re-render and commit before the DOM input clears
3. User types `"e"` **before** React commits → browser appends `"e"` to the still-present `"n"` in the DOM → `onChange("ne")` fires → `setCommand("ne")`
4. The `setCommand("")` from step 1 and `setCommand("ne")` from step 3 both enter React's batch. The final state is `"ne"` (last write wins if they resolve in the same render pass, or the `""` gets overwritten).
5. User presses Enter → `handleSubmit` with `command = "ne"` → `shouldTreatAsSpeedwalk("ne")` → **true** → false positive

**Timing window:** This is the gap between React's `setState` call and the DOM commit — typically under 16ms (one frame), but enough for a fast typist who can sustain 10+ keystrokes per second.

### Trigger 2: Keyboard Key Repeat (secondary)

If a player holds a direction key slightly too long before releasing, the OS key-repeat fires. A single held `n` key becomes `"nn"` in the input. On most systems, repeat delay is 250-500ms — plausible during rapid play.

- Input: `"nn"` → `shouldTreatAsSpeedwalk("nn")` → **true** (2 moves) → false positive
- This doesn't require any React race condition at all

### Trigger 3: Stale Closure + React Batching (edge case)

With React 18's automatic batching via `createRoot`, if multiple events are processed in the same microtask:

1. `onChange` sets `command = "n"` (React hasn't re-rendered)
2. Submit fires with **stale** `handleSubmit` closure (still has `command = ""` from previous render)
3. `trimmed = ""` → early return → command `"n"` is **silently dropped**
4. Input retains `"n"`, user types next direction → accumulates

This causes the previous direction to be "stuck" in the input, leading to accumulation on the next keystroke.

## Code Path

```
ZoneExploration.tsx:176  → const trimmed = command.trim()
ZoneExploration.tsx:181  → setCommand("")           ← async, doesn't clear DOM immediately
ZoneExploration.tsx:186  → shouldTreatAsSpeedwalk(trimmed)
  speedwalk.ts:98        → isSpeedwalk(input)       ← matches "ne" as valid speedwalk
  speedwalk.ts:99-100    → parseSpeedwalk → moves.length > 1  ← 2 moves → true
ZoneExploration.tsx:199  → addSystemMessage("Speedwalk: 2 moves (ne)")  ← FALSE POSITIVE
```

## What's NOT the Cause

- **Server-side throttling**: Speedwalk detection is entirely client-side
- **`useDirectionKeys` hook**: Only fires when input is NOT focused (line 51-58 of `useDirectionKeys.ts`)
- **Command history**: Arrow-up/down correctly sets a single value; no accumulation path
- **`shouldTreatAsSpeedwalk` logic**: The function itself is correct — the bug is upstream (what value reaches it)

## Reproduction

Test file: `packages/client/src/__tests__/speedwalk-false-positive.test.tsx`

- 13 tests, all passing
- Demonstrates that accumulated direction chars ("ne", "nn", "nne") trigger `shouldTreatAsSpeedwalk` → true
- Component test harness mirrors ZoneExploration's controlled input pattern
- Note: In jsdom/testing-library, React commits synchronously, so the exact race can't be triggered programmatically — the test simulates the accumulated state directly

## Proposed Fix Approaches (ranked)

### Fix A: Synchronous DOM clear via ref (recommended — minimal change)

In `handleSubmit`, directly clear the DOM input value via the ref **before** React's async state update:

```tsx
// In handleSubmit, after setCommand(""):
if (inputRef.current) inputRef.current.value = '';
```

This ensures the DOM input is empty before the next keystroke, regardless of React's commit timing. Safe because React will also set it to `""` on re-render (idempotent).

**Pros:** One line, zero risk of breaking anything, directly addresses the root cause.
**Cons:** Slightly "un-React" — manually touching the DOM.

### Fix B: Track input source (paste vs. typed)

Only activate speedwalk mode when the input came from a paste event. Track via `onPaste` handler:

```tsx
const pastedRef = useRef(false);
// onPaste: pastedRef.current = true
// onChange: (if not paste) pastedRef.current = false
// handleSubmit: only check speedwalk if pastedRef.current
```

**Pros:** Completely eliminates false positives from typing.
**Cons:** Prevents users from intentionally typing speedwalks like `3e2n`. May be too restrictive.

### Fix C: `flushSync` for input clearing

```tsx
import { flushSync } from 'react-dom';
// In handleSubmit:
flushSync(() => setCommand(''));
```

**Pros:** Guarantees synchronous DOM update.
**Cons:** `flushSync` forces synchronous re-render of the entire component tree, which can cause performance issues. React docs discourage its use.

### Fix D: Debounce-based detection

Track the last submission timestamp. If a new submission arrives within N ms of the previous one, skip speedwalk detection and treat as a regular command.

```tsx
const lastSubmitRef = useRef(0);
// In handleSubmit:
const now = Date.now();
const tooFast = now - lastSubmitRef.current < 300;
lastSubmitRef.current = now;
if (!tooFast && shouldTreatAsSpeedwalk(trimmed)) { ... }
```

**Pros:** Simple, addresses both race condition and key-repeat scenarios.
**Cons:** Arbitrary threshold (300ms). Could miss legitimate speedwalks typed quickly.

### Fix E: Minimum input length for speedwalk (simple heuristic)

Require at least 3 characters for speedwalk activation (e.g., `3e` or `ene`). Two-char inputs like `ne`, `nn` are treated as regular commands.

**Pros:** Very simple. Eliminates the most common false positive (2-char accumulation).
**Cons:** Prevents legitimate 2-move speedwalks like `ne`. Changes the feature contract.

## Recommendation

**Fix A** (ref-based DOM clear) is the safest and most targeted fix. It addresses the root cause without changing speedwalk semantics or introducing arbitrary thresholds.

If the team wants a belt-and-suspenders approach, **Fix A + Fix D** together would cover both the React race condition AND the key-repeat scenario.

---

*— Minsc, Tester*
*"If it can break, it will break. Found it before the players did."*
