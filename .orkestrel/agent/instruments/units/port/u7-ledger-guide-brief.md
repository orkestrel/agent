# Unit u7-ledger-guide — Document the ledger module in the agent guide

## Role and engine

`opus` on Claude Opus 5.5, reached as a native subagent. The judgment load is subjective: guide voice, the pattern's teaching order, and how the method is explained. Executor: NATIVE_SUBAGENT.

## Objective

Document every public export of the `src/core/ledgers/` module, and the `Selection.briefing` member, in `guides/agent.md`, so that `npm run test:guides` passes. Teach the method in a pattern a developer can copy, with a fence that `tests/guides.test.ts` executes.

## Context

- **Evidence.**
  - The module source is `src/core/ledgers/`: `types.ts`, `constants.ts`, `errors.ts`, `helpers.ts`, `Classifier.ts`, `Gauge.ts`, `Ledger.ts`, `factories.ts`, and `index.ts`. Every export reaches the barrel `src/core/index.ts`.
  - The plan is `tmp/units/records-port-plan.md`, which states what the method is and why: the rulings, the defects fixed, and the documented limits.
  - The evidence behind the method: `../scaffold/.orkestrel/agent/records-series-verdict.md`, whose Correction section gives the two-sided audit numbers. Cite those numbers only as the measured reading on the Larkspur benchmark with the 2B Qwen; never as a guarantee.
  - The guide's structure:
    - `guides/agent.md` has `## Surface`, with one table per module (for example the Contexts module at line 936 and the Agents module at line 1028), `## Methods` at line 1137, and `## Patterns` at line 1475.
    - It has a selection section at line 355 that already names `Selection.briefing`, and the stock selection at line 451.
  - The parity test is `tests/guides.test.ts`:
    - It reads the barrel and the guide through `@orkestrel/guide` and requires every export documented, with Summary cells equal to the TSDoc description paragraphs.
    - It requires a method table per behavioral interface.
    - It keeps `INTERNAL` empty.
    - Its `flagship fences` describe block transcribes and executes the flagship fences.
- **Law.**
  - `AGENTS.md`, which resolves to `../scaffold/AGENTS.md`.
  - `../scaffold/.claude/rules/documentation.md` (§ Parity, § Guide examples, and the prose-claim proof rule), `../scaffold/.claude/rules/writing.md`, and `../scaffold/.claude/rules/tests.md`.
- **Installed primitives.** `@orkestrel/guide`, which `tests/guides.test.ts` already uses (`findDrift`, the `GuideCommand` class).
- **Host.** Linux, working path `/home/user/agent-port`, a git worktree on local branch `port`.
- **Standing conditions.**
  - A live benchmark series in `/home/user/agent` imports `/home/user/agent/dist`. Never run `npm run build` or `npm run clean`, and never write a `dist` directory. Never write under `/home/user/agent`, and send no request to `127.0.0.1:11434`.

## Unknowns

None.

## Scope

- **Owned.** `guides/agent.md` and `tests/guides.test.ts`.
- **Shared (report-only).** Every `src/core/ledgers/` file. The guide's Summary cell must equal the TSDoc description, so when a TSDoc paragraph is wrong or reads badly, return an exact TSDoc patch rather than writing a different Summary.
- **Off-limits.** Every other file.
- **Tools and limits.** Read, Edit, Write, and Bash for the scoped gates. No install and no build.

## Execution

Perform the assignment yourself and spawn nothing. Never delete a file you did not create.

## Content to land

1. A `### Ledgers module` surface table, placed after the Agents module table, with one row per export: kind, signature, and a Summary equal to its TSDoc description. That covers every type, constant, error, helper, class, and the factory.
2. Method tables under `## Methods` for `LedgerInterface`, `ClassifierInterface`, and `GaugeInterface`, each matching its interface's call-signature members exactly.
3. A section in the narrative part of the guide, near the selection sections, titled `### Serving a conversation through a ledger`. It teaches the method in this order:
   - What it is: an event-sourced briefing with per-owner records.
   - The pieces, each named by its export:
     - the filing through an injected judge (Mica in the measured series);
     - the records projection (verbatim live sentences, one record per owner plus a rules record, with stale sentences removed);
     - the plan inside a token budget;
     - `recall`;
     - the repeat stop;
     - the answer pass.
   - What the application supplies: the judge, the `LEDGER_QUESTIONS` wording with its own thresholds, the topics, the lookups with their reading handlers, and the capacity.
   - The documented limits:
     - the person prefix trusts capital letters;
     - a desk-wide correction stays in one owner's record;
     - recall identity is the topic alone;
     - a seed tool message counts as successful;
     - an abort during calibration rejects.
   - The measured reading, in one sentence, with its source.
4. A `### Serving requests through a ledger` pattern under `## Patterns`, with a ` ```ts ` fence that imports through `@orkestrel/agent` only. The fence builds a ledger with a scripted provider, a judge, one lookup, and the measured questions, sends two requests, and reads `content`. Transcribe it into the `flagship fences` block of `tests/guides.test.ts` and assert every value its comments claim, per the documentation rule on prose claims.
5. Every sentence in the guide that the change makes false is fixed. Search for `selection` and `system block` statements near lines 359 and 361.

## Output

Return:

- the sections added, with their line ranges;
- any TSDoc patch, exactly;
- each gate's exit code with its failure excerpt, if any;
- `git status --porcelain`.

No process diary.

## Deviation contract

Stop and report (expected, found, evidence, done or not done, one hypothesis) when parity requires a source change. Return the TSDoc patch and do not apply it.

## Acceptance criteria

1. `npm run test:guides` exits 0.
2. `npm run test:policy`, `npm run lint:check`, and `npm run format:check` exit 0.
3. `npx tsc --noEmit --project tsconfig.json` exits 0.
4. `git status --porcelain` lists only `guides/agent.md`, `tests/guides.test.ts`, and `tmp/` paths.

**Observations, not criteria.** None.

**Measurement.** None.

## Review evidence

The actual diff and `git status --porcelain`.
