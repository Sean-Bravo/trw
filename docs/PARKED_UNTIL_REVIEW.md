# Parked until the 14-day review — 2026-10-28

**Rule:** Launch → Observe → Review → Build only what earned the right to be built.

Nothing below starts before the review on **Wednesday, October 28, 2026**, and
after it only in this order, only if the review's numbers justify it. This file
exists so that no session — human or agent — quietly starts one of these during
launch week because it looked useful. If you are reading this because a task
touches one of these items: stop, and point at this file.

Launch Day 0 is October 14. Observation runs October 14–27. The review runs the
six decision rules at the bottom against the metrics in the daily schedule.

## Frozen until the review

| # | Initiative | Roadmap refs | Why it waits |
|---|-----------|--------------|--------------|
| 1 | **Exact arithmetic** — audit all amount/fee/value types; introduce a Decimal/fixed-point boundary; add precision regression tests | #18 | Default foundational pick *after* the review, unless evidence points to a more urgent reliability defect |
| 2 | **Engine / schema / parser versioning** — stamp every result; store parser version per source and insights-model version per tier; define version-bump rules | #20 | Needs real traffic to show which versions matter. (The narrow Oct 9 item — stamp model id, prompt version and effort into insights metadata — is the exception and is already scheduled.) |
| 3 | **Golden corpus** — verified production formats first; then malformed / localized / DST / duplicate cases with known-correct expected outputs; run on every change | #11 | Built from observed failures, which don't exist yet. Doubles as the insights shadow-eval set |
| 4 | **Confidence + refusal taxonomy** — define confidence levels; add `review_required`; map model refusals into it; prohibit defaults for unknown timezone/currency | #4, #13 | The Oct 9 refusal branch is the minimum; the taxonomy waits |
| 5 | **Provenance + round-trip audit** — capture source field / value / transformation metadata; expose a transaction lineage view/API | #5, #6 | Nobody has asked for it yet |
| 6 | **Invariant validation** — rules as warnings/errors with test fixtures; never auto-reclassify without evidence | #7 | Rules come from the failure review, not from imagination |
| 7 | **Source drift + observability** — fingerprint distributions; alert on unknown versions; track success / manual-review rate by parser | #3, #10, #16 | Instrument-before-launch analytics (Oct 13) is the floor; this is the ceiling |
| 8 | **Reconciliation + event dedup** — multi-source matching; begin with high-confidence self-transfer matching | #8, #9 | Only when repeated customer workflows require combining exchange/wallet/bank files |
| — | **Fable 5.1 as fallback for unknown bank formats or ambiguous rows** | #14 | Evidence-gated: only if launch data shows those failures matter. The published PDF path stays as is |

Also frozen: any **Level 3 feature expansion**, any **Elite Normalization** roadmap
work, any **user-visible model change** (Fable 5.1 stays shadow-only on the
Business tier until reviewed), and **model names on the pricing page or bank
funnel** (they live in `content/docs/api/index.md` and blog Updates posts only).

## Not parked (allowed during launch week)

- Bug fixes with a test, per `CLAUDE.MD`.
- The daily schedule's own items through Oct 14 (Fable 5.1 shadow wiring, bank
  landing page, analytics tagging, go/no-go checklist).
- Copy, docs and registry drift fixes caught by the guard tests
  (`__tests__/lib/tier-registry.test.ts`, `legacy-pro-copy`, `claims-copy`,
  `retention-copy`, `exchange-registry`, `bank-registry`).
- Post-launch, not before: Free tier onto Haiku instead of Gemini (one AI
  subprocessor, 30 days everywhere, the Gemini footnote disappears).

## Decision rules the review applies

- Bank traffic converts and repeats materially better than developer traffic →
  bank parser reliability and the nontechnical funnel before adding breadth.
- Developers create keys but fail to reach a second successful parse → inspect
  onboarding, source coverage, error quality, SDK/docs friction before features.
- A few parser/source-version failures dominate support → golden corpus and
  drift instrumentation around those exact sources first (#3 and #7 above).
- Users repeatedly combine exchange/wallet/bank files or explain self-transfers
  → reconciliation (#8) has earned discovery work.
- Mostly one-off conversion with little retention → test transaction/file packs
  or one-time pricing before forcing subscription economics.
- Fable 5.1 meets or beats Opus 4.7 on flag agreement without raising false-flag
  or refusal rates, and P90 cost per call with caching is under $0.12 → promote
  it on Business. Cost the blocker → fix caching and output size first.

The review picks **at most one** foundational initiative and **one**
market-facing initiative for the next cycle. Everything else stays here.

Source: the "TaxFormatter Daily Schedule — Oct 5 → Oct 28, 2026" page in Notion
(sections *Parked until the review* and *Decision rules for the review*).
