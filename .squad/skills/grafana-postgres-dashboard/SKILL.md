---
name: "grafana-postgres-dashboard"
description: "Build portable Grafana dashboards for PostgreSQL-backed gameplay metrics with JSONB metadata."
domain: "observability"
confidence: "high"
source: "earned"
---

## Context
Use this when gameplay or engine telemetry is stored in PostgreSQL and needs to be visualized in Azure Managed Grafana without environment-specific datasource wiring.

## Patterns
- Check dashboards into `infra/grafana/dashboards/` as standard Grafana JSON models.
- Reference PostgreSQL through `${DS_POSTGRESQL}` in panel datasource UIDs so imports stay portable across environments.
- Use Grafana PostgreSQL macros like `$__timeFilter()` and `$__timeGroupAlias()` for time-range aware panels.
- Read event-specific fields from JSONB metadata with `metadata->>'field'`, and cast booleans/numerics explicitly before aggregating.
- Favor hourly grouping for gameplay trend panels unless the metric requires finer granularity.
- Keep leaderboard tables explicit about whether they follow the dashboard range or pin their own window (for example, last 24h).

## Examples
- `infra/grafana/dashboards/game-metrics.json` groups deaths by `metadata->>'isPvP'` and kills by `metadata->>'isCreature'`.
- Combat efficiency is derived from `combat_stats` by dividing aggregated hits by hits-plus-misses and presenting the result as a percentage.

## Anti-Patterns
- Hard-coding datasource UIDs into committed dashboards.
- Treating JSONB booleans or numbers as strings during aggregation.
- Mixing fixed-window leaderboard queries with dashboard-range descriptions.
