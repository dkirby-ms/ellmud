### 2026-03-21: Extraction Screen Component API
**By:** Drizzt (Engine Dev)
**Issue:** #72
**PR:** #92

**What**
Extraction screen uses a phase-discriminated union pattern: `ExtractionScreen` accepts `phase: 'extracting' | 'success' | 'failure'` with phase-specific props. Internally delegates to `ExtractionOverlay`, `ExtractionSuccess`, `ExtractionFailure`.

**Why**
- Single entry point for GameScreen integration (just render `<ExtractionScreen phase={...} />`)
- Individual sub-components exportable for direct use if needed
- TypeScript discriminated union ensures compile-time prop correctness per phase
- Matches issue spec: overlay during channeling, full-page for success/failure

**Tier naming**
Used `anomalous` (not `relic`) matching the theme CSS variables and issue spec. The removed anticipatory tests had `relic` — this is intentionally different.

**Impact**
- GameScreen will need to track extraction state and render `ExtractionScreen` conditionally
- Types exported from `extraction-types.ts` should be used when wiring server messages to props
- `onReturn` callback should trigger room switch back to refuge
