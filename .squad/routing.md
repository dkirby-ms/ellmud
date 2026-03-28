# Work Routing

How to decide who handles what.

## Routing Table

| Work Type | Route To | Examples |
|-----------|----------|----------|
| Game server, networking, WebSocket/SSH | Drizzt | Server core, tick system, command parser, shard worker isolation, persistence |
| Combat, shard gen, creatures, progression | Jarlaxle | Combat system, room graphs, creature AI, skills, economy, traces, sound, PvP |
| LLM integration, narrative, prompts | Volo | Prompt engineering, caching, template fallbacks, narration pipeline, cost control |
| React UI, admin pages, client | Regis | Admin dashboard pages, player UI, CSS/styling, hooks, client state |
| Zone/creature/item design, theming, lore | Laeral | Zone themes, creature concepts, item design, encounter planning, worldbuilding |
| Content creation in game data | Bruenor | Creating zones/rooms/exits/items/NPCs via admin API and DB |
| Code review, architecture | Elminster | Design review, system boundaries, scope decisions, technical direction |
| Testing, QA, edge cases | Minsc | Test architecture, unit/integration tests, edge case coverage, fixtures |
| Scope & priorities | Elminster | What to build next, trade-offs, milestone planning |
| Session logging | Scribe | Automatic — never needs routing |

## Issue Routing

| Label | Action | Who |
|-------|--------|-----|
| `squad` | Triage: analyze issue, assign `squad:{member}` label | Elminster |
| `squad:elminster` | Architecture/design issues | Elminster |
| `squad:drizzt` | Server, networking, command parsing issues | Drizzt |
| `squad:jarlaxle` | Game systems, combat, shard gen issues | Jarlaxle |
| `squad:volo` | LLM, narrative, prompt issues | Volo |
| `squad:regis` | React UI, admin pages, client-side issues | Regis |
| `squad:minsc` | Test, quality, regression issues | Minsc |

### How Issue Assignment Works

1. When a GitHub issue gets the `squad` label, the **Lead** triages it — analyzing content, evaluating @copilot's capability profile, assigning the right `squad:{member}` label, and commenting with triage notes.
2. **@copilot evaluation:** The Lead checks if the issue matches @copilot's capability profile (🟢 good fit / 🟡 needs review / 🔴 not suitable). If it's a good fit, the Lead may route to `squad:copilot` instead of a squad member.
3. When a `squad:{member}` label is applied, that member picks up the issue in their next session.
4. When `squad:copilot` is applied and auto-assign is enabled, `@copilot` is assigned on the issue and picks it up autonomously.
5. Members can reassign by removing their label and adding another member's label.
6. The `squad` label is the "inbox" — untriaged issues waiting for Lead review.

### Lead Triage Guidance for @copilot

When triaging, the Lead should ask:

1. **Is this well-defined?** Clear title, reproduction steps or acceptance criteria, bounded scope → likely 🟢
2. **Does it follow existing patterns?** Adding a test, fixing a known bug, updating a dependency → likely 🟢
3. **Does it need design judgment?** Architecture, API design, UX decisions → likely 🔴
4. **Is it security-sensitive?** Auth, encryption, access control → always 🔴
5. **Is it medium complexity with specs?** Feature with clear requirements, refactoring with tests → likely 🟡

## Rules

1. **Eager by default** — spawn all agents who could usefully start work, including anticipatory downstream work.
2. **Scribe always runs** after substantial work, always as `mode: "background"`. Never blocks.
3. **Quick facts → coordinator answers directly.** Don't spawn an agent for "what port does the server run on?"
4. **When two agents could handle it**, pick the one whose domain is the primary concern.
5. **"Team, ..." → fan-out.** Spawn all relevant agents in parallel as `mode: "background"`.
6. **Anticipate downstream work.** If a feature is being built, spawn the tester to write test cases from requirements simultaneously.
7. **Issue-labeled work** — when a `squad:{member}` label is applied to an issue, route to that member. The Lead handles all `squad` (base label) triage.
8. **@copilot routing** — when evaluating issues, check @copilot's capability profile in `team.md`. Route 🟢 good-fit tasks to `squad:copilot`. Flag 🟡 needs-review tasks for PR review. Keep 🔴 not-suitable tasks with squad members.
