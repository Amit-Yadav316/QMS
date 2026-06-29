# UI component library — Radix vs Tailwind + shadcn/ui (scoped plan)

Decision doc for "better UI components / buttons / everything". Two viable paths;
they are **not** mutually exclusive — Path A is a safe prerequisite/standalone, Path
B is the full visual overhaul.

## Where we are today

- **Styling:** hand-written CSS — one `.css` per component + a global token system
  (CSS variables: `--gray-*`, `--primary`, `--lp-navy`, …) in `index.css`.
- **Primitives:** a small in-house set in `src/components/ui/` — `Button`, `Card`,
  `Badge`, `Input`, `Select`, `ErrorBox`. No accessible overlay/menu primitives.
- **Known gaps (found during verification):**
  - Hand-rolled panels/menus lack focus-trap / `Esc` / full ARIA.
  - `Input`/`Select` label association was missing (now fixed via `useId` + `htmlFor`).
  - No Dialog/Dropdown/Tooltip/Tabs/Popover primitives — these get re-invented ad hoc.

---

## Path A — Incremental: Radix primitives + polish (RECOMMENDED FIRST)

Add `@radix-ui/react-*` (unstyled, accessible) for the interaction-heavy components
and style them with the **existing** CSS/tokens. No paradigm shift, no Tailwind.

**Scope**
- `npm i @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tooltip @radix-ui/react-tabs @radix-ui/react-popover`
- Wrap each in a thin `components/ui/` component (e.g. `Dialog.tsx`) styled with a
  co-located `.css` using current tokens — same pattern as `Button`/`Card`.
- Replace the hand-rolled modals/menus/disclosures incrementally, one surface at a
  time, keeping `tsc` green and verifying each.

**Effort:** ~0.5 day for the wrappers; then per-surface as you migrate.
**Risk:** Low. Additive; existing components untouched until you swap them.
**Buys:** Accessibility (focus trap, `Esc`, ARIA, keyboard), consistent overlays —
the bulk of the "feels polished" gap — without touching the styling system.

## Path B — Full migration: Tailwind + shadcn/ui

Adopt Tailwind as the styling engine and shadcn/ui (copy-in, Radix-based, CVA
variants) as the component set. This is the complete visual overhaul.

**Scope (sequenced)**
1. Install + configure Tailwind (`tailwind.config`, `postcss`, content globs); map
   the existing CSS-variable tokens into the Tailwind theme so colors stay on-brand.
2. Init shadcn; generate the components you need (Button, Input, Select, Dialog,
   Table, …). Decide: replace `components/ui/*` or run both during transition.
3. Migrate page-by-page from hand CSS → Tailwind utilities; delete the matching
   `.css` files as each page is converted. Coexistence is fine mid-migration.
4. Re-verify every migrated page (the verify harness in `scratchpad/` can be reused).

**Effort:** Multi-day, spread over several PRs. It touches every page eventually.
**Risk:** Medium. Styling-paradigm shift; two systems live simultaneously during the
transition; visual regressions need per-page checking. Per the `qms-frontend` skill,
this is "a deliberate migration, not a drive-by."
**Buys:** ~40 consistent, accessible components, CVA variants, theming/dark-mode,
fastest long-term UI velocity.

---

## Recommendation

1. **Do Path A now.** It closes the real accessibility/interaction gaps for a small,
   low-risk investment and is useful regardless of B (shadcn is Radix underneath, so
   the mental model transfers).
2. **Treat Path B as an explicit, separately-approved project** if you want the full
   visual refresh. If we go there, do the Tailwind token-mapping + a single pilot
   page first, review the look, then roll out page-by-page.

Either path is independent of the react-hook-form + zod form work, which is complete
for the big forms (pours, project setup, mix designs).
