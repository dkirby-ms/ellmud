### 2025-07-24: Regis — Flag toggle UI architecture

**Decision:** Character flags (anon, rp) use a separate `useFlags` hook rather than extending the existing `useSettings` hook.

**Why:**
- Flags are stored in `character_flags` table, not `user_settings` — different persistence layer.
- Flags are toggled via Colyseus room messages (`TOGGLE_FLAG`), not REST API like settings.
- `useFlags` caches optimistically in localStorage and sends room messages when connected.
- When the Settings page is accessed outside a zone (no room), toggles still work via localStorage; the server will sync on next zone join.

**Integration point:** `sendToggleFlag()` in `connection.ts` sends `{ flag, enabled }` — Jarlaxle's `onToggleFlag` handler on the server picks this up.

**Files:**
- `packages/client/src/hooks/useFlags.ts` — new hook
- `packages/client/src/services/connection.ts` — `sendToggleFlag` + `onFlagState` handler
- `packages/client/src/components/SettingsModal.tsx` — Flags category
- `packages/client/src/pages/Settings.tsx` — Flags category
