# Unit u4-ledger-classifier — Port the ledger's filing of messages through the judge

## Role and engine

GPT-6 Astra on the `astra` lane, reached through `codex exec` in a workspace-write sandbox. The unit is objective and constraint-heavy: its judge-facing bytes must equal the measured harness's. Executor: BENCH_ENGINE. You are the engine and you implement this unit yourself; you are not a driver, and you launch no `codex`, no bench probe, and no other agent.

## Objective

Implement `Classifier` in `src/core/ledgers/Classifier.ts`, satisfying `ClassifierInterface` from `src/core/ledgers/types.ts`. It files each message of a conversation by category, desk topic, and correction pair through the injected judge and the conversation's judgment manager. Every judgment key, question, and state is byte-identical to the measured harness.

## Context

- **Evidence.**
  - The measured classifier is in `/home/user/agent/tmp/bench3/bench.mjs`. Read these parts; edit nothing there.
    - `codeCategory`, line 1521.
    - `specCategory`, `specTopic`, and `specPair`, lines 1529 to 1547; with the choice form only, the noul category form is ablation and is not ported.
    - `read`, `noul`, `categories`, `weigh`, `category`, `quiet`, `decisive`, and `opensCorrection`, lines 1549 to 1612.
    - `entities`, line 1613; `deskTopics`, `topics`, and `label`, lines 1630 to 1652; `fail` and `failure`, lines 1653 to 1666.
    - `categorize`, line 1667; the logprob trace in it is instrumentation and is not ported.
    - `marks`, line 1726; `state` and `text`, lines 1476 to 1487.
    - The question builders, lines 952 to 970.
    - `DETERMINISTIC_JUDGE_ERROR`, found with `rg -n DETERMINISTIC_JUDGE_ERROR`.
    - The `warehouse` exception `UNASKED_REQUEST_TOPICS` (line 842) becomes `LedgerTopic.requests === false`.
  - The contracts are in `src/core/ledgers/types.ts`: `ClassifierOptions`, `ClassifierResult`, `ClassifierInterface`, `LedgerCategoryHandler`, `LedgerEntityHandler`, `LedgerTopic`, `LedgerThreshold`, `LedgerQuestion`, and `LedgerClassification`. The constants are `LEDGER_QUESTIONS` and the category groups in `src/core/ledgers/constants.ts`. The pure helpers are in `src/core/ledgers/helpers.ts` (unit U3), with the shared token test among them.
  - The judgment seam:
    - `JudgmentManagerInterface.resolve(judge, request, sources, signal)` (`src/core/conversations/types.ts:66`);
    - `judgment(key)` on the same manager;
    - `matchesJudgment` in `src/core/conversations/helpers.ts`, the reuse test the harness applies.
  - The test doubles are the `RecordingJudge` class (`tests/setup.ts:390`) and `SequentialSystemOneJudge` (`tests/setup.ts:187`). Tests drive the real conversation and judgment manager.
  - The plan is `tmp/units/records-port-plan.md`.
- **Law.**
  - `AGENTS.md`, which resolves to `../scaffold/AGENTS.md`.
  - `../scaffold/.claude/rules/typescript.md`, `../scaffold/.claude/rules/names.md`, `../scaffold/.claude/rules/architecture.md` (one class per file, no nested functions), `../scaffold/.claude/rules/tests.md`, and `../scaffold/.claude/rules/writing.md`.
- **Installed primitives.** `@orkestrel/contract` guards. The judge contract `JudgeInterface` and the error helpers in `src/core/errors.ts` (`isJudgeAbortError` and the other judge error guards).
- **Host.** Linux, working path `/home/user/agent-port`, a git worktree on local branch `port`. Its `node_modules` is a symlink to `/home/user/agent/node_modules`. Network is denied in the sandbox. A nested `git` inside the sandbox can report `not a git repository` for this worktree; that is a sandbox condition, so report `git status --porcelain` as unavailable rather than diagnosing the checkout, and the Orchestrator runs it.
- **Standing conditions.**
  - A live benchmark series in `/home/user/agent` imports `/home/user/agent/dist`. Never run `npm run build`, `npm run clean`, or any command that writes a `dist` directory. Never write under `/home/user/agent`, and send no request to `127.0.0.1:11434`.

## Unknowns

None beyond the deviation contract.

## Scope

- **Owned.** `src/core/ledgers/Classifier.ts` and `tests/src/core/ledgers/Classifier.test.ts`.
- **Shared (report-only).** `src/core/ledgers/types.ts`, `src/core/ledgers/constants.ts`, `src/core/ledgers/helpers.ts`, and `tests/setupLedger.ts`. Return an exact patch for any change; do not apply it.
- **Off-limits.** Every other file, including `src/core/index.ts`.
- **Made false by this change.** None.
- **Tools and limits.** Read tools, file edits in the owned files, and the scoped gates. No install and no build.

## Execution

Perform the assignment yourself and spawn nothing. Never delete a file you did not create.

## Behavior to land

1. The judgment keys:
   - category: `JSON.stringify(['category', id])`;
   - topic: `JSON.stringify(['topic', id, topicName])`;
   - pair: `JSON.stringify([head, earlier, later])`.
2. The questions:
   - The category is a choice question built from `options.questions.category` in `LEDGER_CATEGORIES` order.
   - The topic noul uses the instructions `options.questions.topic`. Its criteria are `true: 'The message concerns NAME: CRITERION'` and `false: 'The message does not concern NAME'`.
   - The amends and supersedes pair questions come from `options.questions`.
3. A message's state is `ROLE: TEXT`. A pair's state is `Earlier message: STATE\nLater message: STATE`.
4. The asking order, under the measured refined settings:
   - First, a category question for every message that `assign` leaves undecided, except requests.
   - Then a topic noul per desk topic for every message that is not quiet, and for every request; a request skips a topic with `requests: false`.
   - Then, for each user message that opens a correction, the `amends` question against each earlier non-quiet message that shares a whole-name topic, followed by `supersedes` when `amends` reaches `thresholds.amends`.
5. Reuse:
   - A recorded judgment that matches by `matchesJudgment` with the judge's model is reused and not asked again.
   - A deterministic judge failure is held for its spec and not asked again within the classifier's life; a transient failure is asked again later.
   - An abort rethrows after keeping completed records.
6. The decisions:
   - `category(id)` is the choice reading at or above `thresholds.category`, else undefined.
   - `quiet(id)` is a quiet category.
   - `decisive(id)` is a decisive category at or above the cutoff.
   - `topics(id)` holds the desk topics whose noul reaches `thresholds.topic`.
   - `classification()` returns the `LedgerClassification`, where an `amends` mark needs a shared token between the two messages (the measured `marks`).
7. `classify(requests, signal)` returns the keys it rests on and the summed usage, the shape of `ClassifierResult`.

## Output

Return:

- the diff summary;
- each behavior with the test that pins it, with `path:line`;
- each gate's exit code with its failure excerpt, if any;
- `git status --porcelain`.

Cite `path:line` as plain text. No process diary.

## Deviation contract

Stop and report (expected, found, evidence, done or not done, one hypothesis) when a measured key, question, or state cannot be reproduced through the declared types, or when the interface needs a member that U2 did not declare (return the patch). Settle private method names yourself.

## Acceptance criteria

1. `npx tsc --noEmit --project tsconfig.json` and `npm run check:src:core` exit 0.
2. `npx vitest run --config vite.config.ts --project src:core tests/src/core/ledgers/Classifier.test.ts` exits 0, with a test asserting the literal key, question, and state bytes for one category, one topic, and one pair spec against the measured strings.
3. `npm run lint:check`, `npm run format:check`, and `npm run test:policy` exit 0.
4. `git status --porcelain` lists only the owned files and `tmp/` paths.

**Observations, not criteria.** None.

**Measurement.** None.

## Review evidence

The actual diff and `git status --porcelain`.
