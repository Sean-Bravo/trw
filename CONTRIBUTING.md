# Contributing

Thanks for looking. TaxFormatter is a commercial product and this repository
is source-available rather than open source — see [LICENSE](LICENSE).

## Pull requests

**We don't accept outside pull requests.** Not because they aren't welcome in
spirit, but because we can't commit to reviewing them properly, and the
licence doesn't permit derivative works. A PR that arrives will be closed
with thanks rather than left to go stale.

## What we do want

**Bug reports.** If something is broken — a parser mangling a real export, an
API response that contradicts the docs, a page that renders wrong — please
[open an issue](https://github.com/Sean-Bravo/trw/issues/new/choose). Reports
against real exchange and bank exports are especially useful, since format
drift is the single most common cause of parsing failures.

**Security reports.** Privately, please. See [SECURITY.md](SECURITY.md) — do
not open a public issue.

**Exchange and bank format coverage.** If we don't support an export you use,
tell us which institution and what the file looks like. Redact the amounts;
we need the shape, not your transactions.

## Never attach real financial data

Issues are public. When reporting a parsing bug, attach a **redacted** sample:
keep headers and row structure, replace amounts, addresses, and account
numbers with dummy values. If a bug only reproduces with real data, say so in
the issue and send the file to <support@taxformatter.com> instead.

## Running it locally

For reviewers and auditors — this is not an invitation to fork.

```bash
npm install
npm run dev          # http://localhost:3000
```

```bash
npm run typecheck    # tsc --noEmit
npm run lint
npm test             # jest
npm run test:e2e     # playwright
```

Backend tests run from inside `backend/`, not the repo root — imports resolve
as top-level packages from there:

```bash
cd backend && python3 -m pytest tests/
```

Architecture, data flow, and known gotchas are documented in
[ARCHITECTURE.md](ARCHITECTURE.md).
