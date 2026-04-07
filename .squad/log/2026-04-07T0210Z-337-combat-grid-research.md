# Session Log: Issue #337 Combat Grid Research Batch

**Timestamp:** 2026-04-07T0210Z  
**Session:** #337-combat-grid-research  
**Agents:** Jarlaxle (Systems Dev), Regis (Frontend Dev), Laeral (Content Designer)  
**Mode:** background (parallel research)  
**Duration:** ~2 hours  
**Status:** ✅ Complete

---

## Summary

Three-agent parallel research session on Issue #337: DCSS-style grid combat system for Ellmud. Team produced comprehensive technical and design documentation covering systems architecture, frontend rendering, and visual design. All three team members delivered decision proposals for squad approval.

---

## Research Outputs

### Systems Architecture (Jarlaxle)

- Analyzed grid feasibility: **8×12 tiles optimal** for 1-20 players
- Performance model: **<100ms tick** with 20 players + 10 creatures (via distance matrix caching)
- Phased approach: **Phase 1 minimal grid (3-4 weeks)** → Phase 2 tactical depth → Phase 3 DCSS-style rendering
- Key finding: **Backward compatibility achievable** via optional `gridPosition` field and room opt-in
- Identified content design complexity as primary risk; recommended boss-rooms-only approach for Phase 1

### Frontend Architecture (Regis)

- Selected **Canvas 2D + rot.js** (15KB): proven in DCSS webtiles, 60fps performance, lightweight
- Rejected WebGL/Pixi.js (overkill, +500KB bundle), SVG (performance), ANSI (insufficient visual fidelity)
- Chose **DCSS CC0 tiles** for reference: battle-tested, open-licensed, 32×32px standard
- Designed **server-authoritative grid** with WebSocket protocol (no client-side prediction Phase 1)
- **Desktop-first responsive design:** Grid in right panel ≥1024px, full-screen overlay on tablet, text-only <768px
- Accessibility locked in: **text parity requirement** (all grid events logged as text), keyboard navigation, high-contrast mode

### Visual Design (Laeral)

- **Creature silhouettes** define category (humanoid/bestial/swarming/amorphous/drone) for instant readability
- **Color-to-threat mapping:** saturation increases with danger; weak creatures pale, bosses vivid
- **Faction color palettes:** Kindari (grey/rust), Bloom (green/cyan), Krewe (purple/gold)
- **Player representation:** faction-colored sprites, visible equipment, PvP threat glow, proximity clustering
- **Art direction:** 32×32px pixel art, 24-32 color palettes per zone, minimal 2-4 frame animation loops
- **Design principle:** Grid is **optional, text-first supplementary** overlay; no information loss, text remains canonical

---

## Team Alignment Points

1. **Text-first MUD identity preserved.** Grid is visualization layer, not game mechanic.
2. **Backward compatibility maintained.** Existing zone-based combat unaffected; grids optional per room.
3. **Accessibility non-negotiable.** Keyboard-only, screen reader, mobile players fully supported via text parity.
4. **Phase 1 scope tight.** Minimal grid (movement + distance) in boss rooms only; LOS/cover deferred to Phase 2.
5. **Performance validated.** Distance matrix caching + canvas rendering deliver <100ms tick + 60fps UI.

---

## Decision Proposals Queued

Three decision proposals written to `.squad/decisions/inbox/` pending team review and merge to `decisions.md`:
- `jarlaxle-combat-grid-analysis.md` — Systems architecture + phased implementation
- `regis-combat-grid.md` — Frontend architecture + Canvas 2D + rot.js selection
- `laeral-combat-grid.md` — Visual system + text-first design principle

---

## Next Steps

1. **Team review** of three decisions (async comments or sync discussion)
2. **If approved:** Merge inbox entries to `decisions.md`; scribe creates tech spec for implementation
3. **If rejected:** Close issue #337 or defer to post-1.0; document rationale
4. **Approved workflow:** Jarlaxle starts Phase 1 prototype in `feature/grid-combat` branch

---

## Files Produced

- `.squad/orchestration-log/2026-04-07T0210Z-jarlaxle.md`
- `.squad/orchestration-log/2026-04-07T0210Z-regis.md`
- `.squad/orchestration-log/2026-04-07T0210Z-laeral.md`
- `docs/design/337-combat-grid-systems.md` (Jarlaxle)
- `docs/design/337-combat-grid-frontend.md` (Regis)
- `docs/design/337-combat-grid-visual-design.md` (Laeral)
- `.squad/decisions/inbox/jarlaxle-combat-grid-analysis.md`
- `.squad/decisions/inbox/regis-combat-grid.md`
- `.squad/decisions/inbox/laeral-combat-grid.md`

---

**Session Owner:** Scribe  
**Approved by:** (pending team review)
