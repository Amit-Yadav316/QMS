# UI component library — Path B (Tailwind + shadcn/ui)

Decision doc for the full visual overhaul. **Path A is done** — Radix primitives
(`Dialog`, `ConfirmDialog`/`useConfirm`, forwardRef `Button`/`Card`/`Badge`/
`Input`/`Select`/`ErrorBox`) now live in `src/components/ui/`, styled with the
existing hand-written CSS + token system. This file keeps only the work that is
still ahead.

## Where we are today

- **Styling:** hand-written CSS — one `.css` per component + a global token
  system (CSS variables: `--gray-*`, `--primary`, `--lp-navy`, …) in `index.css`.
  No Tailwind.
- **Primitives:** `src/components/ui/` — Radix-based where interaction matters,
  so focus-trap / `Esc` / ARIA / keyboard handling are covered.

## Path B — Full migration: Tailwind + shadcn/ui

Adopt Tailwind as the styling engine and shadcn/ui (copy-in, Radix-based, CVA
variants) as the component set. shadcn is Radix underneath, so the mental model
from Path A transfers directly.

**Scope (sequenced)**

1. Install + configure Tailwind (`tailwind.config`, `postcss`, content globs);
   map the existing CSS-variable tokens into the Tailwind theme so colors stay
   on-brand.
2. Init shadcn; generate the components you need (Button, Input, Select, Dialog,
   Table, …). Decide: replace `components/ui/*` or run both during transition.
3. Migrate page-by-page from hand CSS → Tailwind utilities; delete the matching
   `.css` files as each page is converted. Coexistence is fine mid-migration.
4. Re-verify every migrated page.

**Effort:** Multi-day, spread over several PRs. It touches every page eventually.
**Risk:** Medium. Styling-paradigm shift; two systems live simultaneously during
the transition; visual regressions need per-page checking. Per the
`qms-frontend` skill, this is "a deliberate migration, not a drive-by."
**Buys:** ~40 consistent, accessible components, CVA variants, theming/dark-mode,
fastest long-term UI velocity.

## Recommendation

Treat Path B as an **explicit, separately-approved project**. If we go there, do
the Tailwind token-mapping + a single pilot page first, review the look, then
roll out page-by-page.

Note one deployment constraint: `vite.config.ts` sets `cssCodeSplit: false` (with
a global CSS import in `main.tsx`) because route-level code-splitting was loading
shared CSS per-chunk and leaving pages unstyled on a direct reload. Any Tailwind
migration needs to re-check that behaviour rather than assume it still holds.
