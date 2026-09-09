## What changed and why

<!-- One or two sentences. The why matters more than the what — the diff
     already shows the what. -->

## How it was verified

<!-- What you actually ran or measured, not what you expect to be true.
     e.g. "npm test green, build succeeds, checked /pricing at 1380 and
     412px" — not "should be fine". -->

- [ ] `npm run typecheck`
- [ ] `npm test` (full suite, not a subset)
- [ ] `npm run build`
- [ ] Backend touched? `cd backend && python3 -m pytest tests/`

## Anything a reviewer should know

<!-- Assumptions made, things deliberately left out, follow-ups filed.
     If a finding turned out not to be real, say so here rather than
     silently dropping it. -->

---

- [ ] Backend (Lambda) changed — **remember it does not auto-deploy**; run
      `./backend/deploy.sh deploy` after merge. Frontend auto-deploys via Vercel.
