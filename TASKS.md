# TASKS

Living backlog for Strata. The phased build (Phases 1–9) is **complete** — see the
per-phase history in the user memory, not here. This file tracks what's left:
cleanup debt and deliberately-deferred work. Keep it current as you go.

## Cleanup / tech debt (safe, incremental — tests guard them)

- [ ] **Split the kitchen-sink type/schema files by domain.** `frontend/.../types/
      master.ts` (~870 LOC) and `backend/app/schemas/master.py` (~430 LOC) bundle
      every domain; every phase churns them. Split into per-domain modules
      (projects, pours, cube, ncr, analytics, …). Biggest churn-reducer.
- [x] **Shared project-role dependency.** Done — added `require_project_role(*roles)`
      to `core/project_access.py` (mirrors `require_role`; returns the project +
      enforces the designation) and converted the inline
      `await ensure_project_role(...)` calls in all 9 project-scoped routers to the
      dependency.
- [ ] **Break up the fat page components.** `pages/NCRDashboard.tsx` (~610 LOC)
      holds the list + detail panel + AI section inline; `LandingPage.tsx` (~760).
      Extract reusable pieces into `src/components/` (which is currently nearly
      empty).

## Security — audit of 2026-07-18 (all findings fixed)

A whole-codebase audit (backend security, backend correctness, frontend) found
26 issues; all are fixed. For the record, the ones with lasting design impact:

- Confirmation tokens for suppliers/labs now **expire and are single-use**
  (`app/core/external_tokens.py`, migration `a1c3e5f7b9d2`). They previously
  never expired and survived use, so a forwarded email could be replayed to
  rewrite `contact_email` — the sink for every later dispatch/mix/report link.
- **Blocking an entity revokes its tokens.** Block only gated the authenticated
  side, so a blocked RMC kept submitting mix designs and a blocked lab kept
  writing cube results. Per-sample lab report tokens are refused in
  `CubeService` since they live on the sample, not the lab.
- **Login has an attempt cap + lockout** (`users.failed_login_attempts` /
  `locked_until`), and always runs a bcrypt verify so a missing account can't be
  distinguished by timing. `_register_failed_login` is the **second documented
  exception** to the flush-only rule — it must commit or `get_db` rolls the
  counter back.
- **Register no longer reveals whether an address has an account** — identical
  201 either way, with an out-of-band "you already have an account" email.
- The **in-situ slump gate could be bypassed entirely** when a dispatch's
  supplier differed from the one holding the approved mix.
- The **RAG embedding cache** was stamped with the wrong model name, so a
  provider switch silently grounded the LLM in arbitrary NCRs.
- **Logout now revokes the refresh token**, and the frontend clears the React
  Query cache + chat transcripts (a shared site tablet leaked the previous
  user's data to the next one).

## Deferred (needs infra, a decision, or an external dependency)

- [ ] **Automated lab-report reminders (7/14/28-day).** The lab cube-report flow
      is live (token link → lab submits 7/14/28-day reports → auto-NCR on a failing
      28-day result). Reminders are **manual** today (the QE clicks "resend report
      link" per `routers/cube_tests.py::resend_report_link`). Automating the nudge
      needs a scheduler (APScheduler in-process, or a `scripts/` runner on
      Task Scheduler/cron) that sweeps samples whose milestone is due and re-emails
      the lab. `send_lab_report_request_email(..., is_reminder=True)` already exists;
      only the scheduling layer is missing.

- [ ] **Register/resend rate-limiting by IP.** Per-account limits are all done
      (OTP brute-force cap, 60s resend cooldown, login attempt cap + lockout).
      What's left is genuinely infra: bombing via *varying* emails needs
      request-level (IP) throttling middleware (e.g. slowapi/Redis), which a
      per-account counter can't cover. Pick the mechanism first.
- [ ] **Swap RAG retrieval to pgvector when available.** Phase 9 is pgvector-free
      (float[] + Python cosine) behind a swappable seam because pgvector isn't
      installed in Postgres. When it is, move similarity into the DB — localized to
      the embedding repo / retrieval, no API/DTO change.
- [ ] **Analytics rollup (Phase 6b).** Live `GROUP BY` today; the rollup-table +
      partitioning + incremental-refresh design is documented in
      `backend/docs/phase6_analytics_rollup_seam.md`. Build when data volume needs it.
- [ ] **PDF-driven auto-fill (product vision).** Upload a PDF on a document-bearing
      entity → auto-fill all form fields. Upload button on those entities, never on
      pours. (The mix-design now carries the full detailed form + a mandatory PDF
      attachment per record; auto-fill from that PDF is the remaining vision.)

- [ ] **UI component library — Path B (Tailwind + shadcn/ui).** Path A (Radix
      primitives + polish) is **done**; the remaining plan is in
      `frontend/react-app/UI_LIBRARY_PLAN.md`. Path B is the full visual overhaul
      and needs explicit approval — it touches every page.

## Recently done (for context)

- Phases 1–9 complete (pours → dispatch/gate → cube/IS-456 → NCR lifecycle →
  analytics/traceability → documents → AI analyst agent → AISuggestion/RAG).
- Phase 9 code-review fixes (idempotent apply, schema-drift, unused deps, FE error
  handling) and whole-project hardening (OTP attempt cap + resend cooldown,
  monotonic `age_fraction`, `decode_token` presence check, LIKE-wildcard escaping).
- **Time/date integrity + 90-min concrete window** (auto-reject a truck whose
  dispatch→gate time exceeds the IS-456 window; cross-entity date-ordering rules).
- **RMC-owned, QE-approved mix designs** — the RMC submits the detailed form +
  mandatory PDF per requested grade via a token link; the QE approves/rejects;
  the contractor no longer creates mix designs.
- **Mismatch action-items + QE in-situ slump gate** — supervisor admission is
  provisional (PENDING_QE); the QE runs the in-situ slump test and accepts/rejects
  every delivery, with a polled inbox + bell.
- **Document review** (QE/PM approve/reject each document); mandatory contact email
  on supplier/lab; mandatory mix-design + lab-report PDFs; all email bodies moved
  to `app/templates/email/`. **Removed the unused audit-log trail + Audits page.**

## How to work an item

Use the project skills/agents: `/qms-test` to verify, `/qms-migration` for schema
changes, `/qms-smoke` to check the live API, the `qms-feature` agent to scaffold a
new vertical, and `qms-reviewer` before committing. Backend + frontend get separate
commits; never commit on `main`.
