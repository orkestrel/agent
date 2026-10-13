# Unit u6-fix — Apply the ruled review findings to the Ledger

## Role and engine

GPT-6 Astra on the `astra` lane, reached through `codex exec` in a workspace-write sandbox. Executor: BENCH_ENGINE. You are the engine: you implement this unit yourself, and you launch no `codex`, no bench probe, and no other agent.

## Objective

Apply every ruled finding of the three-lens review of unit U6, with a test pinning each one, and leave every gate green.

## Context

- **Evidence.**
  - The reviews:
    - `tmp/units/u6-review-parity.md`, parity with the measured method;
    - `tmp/units/u6-review-contract.md`, the package contracts;
    - `tmp/units/u6-review-check.json`, conformance.
  - The unit brief is `tmp/units/u6-ledger-entity-brief.md`, and the plan is `tmp/units/records-port-plan.md`.
  - The measured method is `/home/user/agent/tmp/bench3/bench.mjs`. Read it; edit nothing there.
- **Law.**
  - `AGENTS.md`, which resolves to `../scaffold/AGENTS.md`.
  - `../scaffold/.claude/rules/typescript.md`, `../scaffold/.claude/rules/names.md`, `../scaffold/.claude/rules/architecture.md`, `../scaffold/.claude/rules/tests.md`, and `../scaffold/.claude/rules/writing.md`.
- **Host.** Linux, working path `/home/user/agent-port`. Its `node_modules` is a real directory of links, so Vitest runs inside the sandbox. A nested `git` can report `not a git repository`; report `git status --porcelain` as unavailable in that case.
- **Standing conditions.**
  - Never run `npm run build` or `npm run clean`, and never write a `dist` directory. Never write under `/home/user/agent`, and send no request to `127.0.0.1:11434`.

## Scope

- **Owned.** All of these, for the findings only:
  - `src/core/ledgers/Ledger.ts`, `src/core/ledgers/factories.ts`, `src/core/ledgers/Classifier.ts`, `src/core/ledgers/Gauge.ts`, and `src/core/ledgers/types.ts`;
  - `tests/src/core/ledgers/Ledger.test.ts`, `tests/src/core/ledgers/factories.test.ts`, `tests/src/core/ledgers/Classifier.test.ts`, and `tests/src/core/ledgers/Gauge.test.ts`.
- **Off-limits.** Every other file.
- **Tools and limits.** Read tools, file edits in the owned files, and the gates.

## Execution

Perform the assignment yourself and spawn nothing. Never delete a file you did not create.

## Ruled findings: fix each one and pin it with a test

### Parity with the measured method (`u6-review-parity.md`)

1. **1a.** Only units of category `rule` key to the rules record. A loose correction renders under `## Pinned`, as `#ruled` does (`bench.mjs:2224-2226`, `:2262-2263`).
2. **1b.** For a request that names no owner while records exist, `held` also takes every record member whose unit is a non-loose user `rule`, as `bench.mjs:2115-2117` does.
3. **1c.** Order group 3 by score alone. The loose-before-decisive key applies only in group 1 (`bench.mjs:2124`).
4. **1d.** After each kept unit, render the live corrections from `classification.amended` that no record holds, as `bench.mjs:2266-2274` does, without any `[amended by]` mark.
5. **1e and the lead ruling.** A lookup result line renders as `NAME ARGS: text` on every route: the briefing, recall, and the answer digest. That is the measured result lead minus its handle (`bench.mjs:1494`, `:1926-1929`). Message lines carry no lead. No handle (`mN`, `rN`, or `[rN]`) appears anywhere.
6. **3a.** The tail keeps a pre-first-request assistant message with non-empty text. A seed call message keeps its content beside its kept calls. Only assistant messages written after the first request drop (`bench.mjs:1517-1519`, `:1964-1972`). Update the test at `Ledger.test.ts:75-77`.
7. **3b.** A superseded user message leaves the tail history instead of becoming an empty turn.
8. **4a and 5c.** `input.entities`, unit topics, and recall's on-topic test use `matchEntities(..., true)`, the measured partial match (`bench.mjs:2040`, `:1613`, `:1636-1641`, `:2555`).
9. **5a.** `recall` increments its counter before the empty-topic refusal (`bench.mjs:2475-2478`).
10. **5b.** The recall topic match accepts exact ids by `extractTokens(part).ids` membership and label-substring words, not `matchEntities` (`bench.mjs:2517-2518`).
11. **5d.** In a recall item, a correction follows its source, so the item reads source then correction (`bench.mjs:2534-2544`).
12. **5e.** The no-match text keeps the measured guidance after `nothing on "X"` (`bench.mjs:2574`), minus any handle example.
13. **5f.** Remove the `room <= 0` refusal (`Ledger.ts:823-826`). The measured closure (`left < 2 * reserve`) covers short room.
14. **6.** In the digest, a lookup whose reading is empty contributes its message content, so the answer pass learns that the lookup found nothing (`bench.mjs:1903-1912`).
15. **Gauge reply reserve.** The reply reserve reads only the completion of the call that delivered the final answer, as `measureReply` does (`bench.mjs:1278-1280`, `:3442`), not the largest completion of any call. Adjust `Gauge.observe` and its caller, and update the gauge tests.

### Package contracts (`u6-review-contract.md`)

16. **Claim 1.** `#select` never throws.
    - On any error, it returns `{ messages: view(), judgments, usage, fault }` with the judge usage already spent.
    - `Classifier.classify` returns the judgments and usage it gathered, plus `fault`, when the caller aborts instead of rethrowing. `ClassifierResult` gains `fault?: Error`.
    - Pin a selection failure and an abort during classification.
17. **Claim 7.** At the start of every pass, reset `#selected` and set `#boundary` to the conversation's message count.
18. **F1.** The `Ledger` constructor runs every option check. `createLedger` returns `new Ledger(...)`.
19. **F2.** Amend the TSDoc of `respond` and `calibrate` in `types.ts`: an abort during calibration rejects with the abort reason.
20. **F3.** A `read` handler that throws counts its lookup as failed: filed `chatter`, no replacement, and a stub state of `failed`.
21. **F4.** `calibrate` refuses a priced prompt of 0 or less with `GAUGE`.
22. **F5.** Check each of the five threshold keys by name.
23. **F6.** Remove `'strict'` from `LedgerAgentOptions`.
24. **F7.** `calibrate` refuses with `AgentError` `CONCURRENCY` while a `respond` is active.
25. **Recovery.** After a `respond` that rejects, for example with `GAUGE`, the next `respond` works. Pin this with a test.

### Conformance (`u6-review-check.json`)

26. The stable-cache test asserts the continuation's messages: the entered tail followed by the messages after the request.
27. A test separates `fact` from `chatter` for a successful lookup against a failed one.
28. The getters `agent`, `conversation`, and `gauge` get TSDoc.
29. Rename the private methods that are not verb-first, such as `#pass`, `#readings`, and `#lines`, to verb-first names.

### Documented limits: keep the code, write the TSDoc

30. Recall identity is the trimmed `{ topic }` alone; the plan accepts it with F8.
31. A seed tool message that the ledger did not record counts as a successful lookup.

## Output

Return:

- one line per finding number with the fix's `path:line` and its test's `path:line`;
- each gate's exit code;
- `git status --porcelain` or `unavailable`.

No process diary.

## Deviation contract

Stop and report (expected, found, evidence, done or not done, one hypothesis) when a ruled fix conflicts with another ruled fix or with a passing test outside the owned files.

## Acceptance criteria

1. `npx tsc --noEmit --project tsconfig.json` and `npm run check:src:core` exit 0.
2. `npx vitest run --config vite.config.ts --project src:core tests/src/core/ledgers` exits 0, and `npm run test:src:core` exits 0.
3. `npm run lint:check`, `npm run format:check`, and `npm run test:policy` exit 0.

**Observations, not criteria.** `npm run test:guides` fails until U7 documents the exports.
