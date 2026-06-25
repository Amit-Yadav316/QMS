# Phase 6b — analytics rollup & partition seam (design, not built)

Phase 6 ships **live aggregation**: `AnalyticsService` runs `GROUP BY` queries
straight against the transactional tables (project-scoped, indexed). At current
volumes that's correct and simplest. This note records the **seam** so the jump
to pre-aggregated rollups is a drop-in when data grows — no API/DTO/frontend/AI
change. Nothing here is implemented yet.

## The contract that makes it a drop-in

- **One chokepoint.** Every metric goes through `AnalyticsService`; no router or
  page writes aggregation SQL. To switch to rollups you change only the *insides*
  of the service methods. Signatures, `schemas/analytics.py` DTOs, the routers,
  the frontend, and (later) the AI query layer are untouched.
- **Traceability stays separate.** `TraceabilityService` is point-lookup +
  bounded FK walk; it never needs rollups and is out of scope here.

## Rollup model (when needed)

A daily fact-rollup keyed by the dimensions metrics slice on, e.g.:

```
quality_rollup(
    project_id, day,            -- time grain (daily; aggregate up to month/qtr)
    tower_id, grade_id, supplier_id,
    test_count, pass_count, fail_count, critical_count,
    sum_strength,               -- AVG = sum_strength / test_count
    PRIMARY KEY (project_id, day, tower_id, grade_id, supplier_id)
)
```

Plus a `dispatch_rollup` (truck accepted/rejected/total per project/day) and an
`ncr_rollup` (open/under_review/closed + closed-duration sums). "Analysis at every
level" still holds: any dashboard dimension is a `GROUP BY` subset of these keys;
drill-down past the lowest grain falls back to the raw facts (the same indexed
joins live aggregation uses today).

## Refresh strategy

- **Near-real-time is acceptable** (product decision), so refresh on a schedule
  rather than synchronously: a `pg_cron` job (or external scheduler) recomputes
  the *current* and *previous* day's rollup rows every few minutes
  (`INSERT … ON CONFLICT … DO UPDATE`). Closed past days are immutable.
- Alternative: `MATERIALIZED VIEW` + `REFRESH … CONCURRENTLY` if the rollup logic
  stays expressible as a single view. The incremental upsert job scales better
  once the fact tables are large.

## Partitioning (the 100M-row insurance)

Range-partition the big append-only fact tables by time (monthly), keeping the
project-scoped composite indexes per partition:

- `transaction.pours` by `pour_date`
- `quality.cube_tests` by `test_date`
- `transaction.truck_dispatches` by `created_at`

Old partitions can be detached/archived; queries that filter by date prune to a
few partitions. Combined with the rollups, dashboard reads touch small,
pre-aggregated, time-pruned data instead of scanning the full history.

## Trigger to build this

Watch p95 latency of the `/analytics/*` endpoints and the row counts of
`cube_tests` / `pours` / `truck_dispatches`. When live aggregation crosses the
latency budget (or those tables reach the tens-of-millions), implement the
rollups first (biggest win, smallest change), then partitioning.
