# CLAUDE.MD

## Core Principles

### 1. Investigate Before Acting
- **Read before answering.** If a user references a file, open it. Never speculate about code you haven't seen.
- Search the codebase for related files before proposing changes. Check for existing patterns, utilities, or similar implementations.
- Give grounded, hallucination-free answers. Say "I need to check that file" rather than guessing.

### 2. Plan Before Executing
- Think through the problem fully before writing code.
- For any change touching 3+ files or core logic: stop and present the plan for approval.
- Identify what could break. Check for dependencies, imports, and downstream effects.

### 3. Simplicity Above All
- Every change should be as small as possible. Prefer surgical edits over rewrites.
- One concern per commit. Don't bundle unrelated changes.
- If a "simple" task is ballooning in scope, stop and reassess. Ask: "Is there a simpler way?"
- Avoid premature abstraction. Duplication is better than the wrong abstraction.

### 4. Communicate Clearly
- After each change, give a 1-2 sentence summary of what changed and why.
- Flag any assumptions you're making.
- If something seems off or contradictory in the codebase, mention it.

---

## Project Documentation

Maintain `ARCHITECTURE.md` in the project root with:
- High-level system overview and data flow
- Key directories and their purposes
- Critical files and what they do
- External dependencies and integrations
- Known gotchas or edge cases

Update this file whenever the architecture meaningfully changes.

---

## Code Standards

### Before Writing Code
- [ ] Read relevant existing code first
- [ ] Check for existing utilities or patterns to reuse
- [ ] Identify the minimal change needed

### While Writing Code
- Match existing code style and patterns in this project
- Add comments only for non-obvious "why" - not "what"
- Handle errors explicitly, never silently swallow them
- If touching data transformations: consider edge cases (nulls, empty strings, malformed input)

### After Writing Code
- [ ] Verify the change works as intended
- [ ] Check for unintended side effects
- [ ] Summarize what changed

---

## Prohibited Actions

- Do NOT refactor unrelated code while fixing a bug
- Do NOT add dependencies without explicit approval
- Do NOT change file structure or naming conventions without discussion
- Do NOT make "improvements" that weren't requested
- Do NOT assume what a file contains - read it

---

## Testing Expectations

- When adding new functionality: write or update tests
- When fixing a bug: add a test that would have caught it
- Run existing tests before declaring a task complete

---

## Git Practices

- Commit messages: `type: short description` (e.g., `fix: handle null timestamps in Binance parser`)
- Commit frequently at logical checkpoints
- Never commit broken code to main branch