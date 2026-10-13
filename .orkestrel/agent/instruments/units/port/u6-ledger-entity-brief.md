# Unit u6-ledger-entity — Implement Ledger: one conversation served through the briefing and per-owner records

## Role and engine

GPT-6 Astra on the `astra` lane, reached through `codex exec` in a workspace-write sandbox. Executor: BENCH_ENGINE. You are the engine: you implement this unit yourself, and you launch no `codex`, no bench probe, and no other agent.

## Objective

Implement the `Ledger` class and `createLedger(provider, options)`, satisfying `LedgerInterface` from `src/core/ledgers/types.ts`. The class composes the classifier (U4), the gauge (U5), the records helpers (U3), the package's agent, and `Selection.briefing` (U1), and it serves a conversation's requests with the measured method and the plan's fixes. Expose the module through `src/core/ledgers/index.ts` and `src/core/index.ts`.

## Context

- **Evidence.**
  - The plan: `tmp/units/records-port-plan.md`. Its rulings override both designs.
  - The design sections:
    - section 3 (data flow) of `tmp/units/records-port-planner.md`, with the per-request steps;
    - section 3 of `tmp/units/records-port-astra.md`.
  - The measured method lives in `/home/user/agent/tmp/bench3/bench.mjs`. Read it; edit nothing there.
    - The request loop: `createLedgerArm` (line 3286), `prepare` (line 3296), `select` (line 3319), the agent wiring (line 3325), the tool listener (line 3339), `answer` (line 3388), `byAnswer` (line 3437), and `runGoal` (line 3461).
    - The ledger: `select` (line 1223), `plan` (line 2073), `#tail` (line 1982), `#relevance` (line 2004), `#render` (line 2232), `#renderRecords` (line 2290), `recall` (line 2473), `#callSize` (line 2579), `digest` (line 1901), `after` (line 1889), `closed` (line 1321), `specific` and `autoPin` (lines 1844 to 1873), `#stub` (line 1874), and `replaced` (line 1747).
    - The tools: `createLedgerTools` (line 2771), the recall description (line 2823), and the notes `ANSWER_CUE` (line 87), `REPEAT_NOTICE` (line 82), and `ANSWER_NOW` (line 845).
  - The measured settings are `--profile refined --records on`. Every other profile path is out of scope, and the plan lists what the port drops: handles, pins, gates, horizons, tallies, and `send_reply`.
  - The package parts:
    - U2 types and constants: `src/core/ledgers/types.ts` and `src/core/ledgers/constants.ts`.
    - U3 helpers: `src/core/ledgers/helpers.ts`.
    - U4 `Classifier` and U5 `Gauge`: `src/core/ledgers/Classifier.ts` and `src/core/ledgers/Gauge.ts`.
    - `createAgent` and `AgentOptions` (`src/core/agents/`), and `createConversationManager` with the conversation and judgment seams (`src/core/conversations/`).
    - `Selection` with `briefing` and `SelectionHandler` (`src/core/contexts/types.ts`), and scopes for the answer pass (`src/core/contexts/scopes/`).
    - `AgentError` with code `CONCURRENCY` (`src/core/errors.ts`).
  - The test doubles: `createScriptedProvider` and `ScriptedProvider` (`tests/setup.ts:531`, `tests/setup.ts:608`), `RecordingJudge` (`tests/setup.ts:390`), and the U3 fixtures in `tests/setupLedger.ts`.
- **Law.**
  - `AGENTS.md`, which resolves to `../scaffold/AGENTS.md`.
  - `../scaffold/.claude/rules/typescript.md`, `../scaffold/.claude/rules/names.md`, `../scaffold/.claude/rules/architecture.md` (§ Barrel exports, one class per file, no nested functions), `../scaffold/.claude/rules/tests.md`, and `../scaffold/.claude/rules/writing.md`.
- **Installed primitives.**
  - `@orkestrel/tool` (`createTool`, `createToolManager`) for the lookup wrappers and `recall`.
  - `@orkestrel/contract` guards and `canonicalStringify`.
  - `@orkestrel/abort` and `@orkestrel/timeout` for the pass deadline.
- **Host.** Linux, working path `/home/user/agent-port`, a git worktree on local branch `port`. Network is denied in the sandbox. A nested `git` inside the sandbox can report `not a git repository`; report `git status --porcelain` as unavailable in that case, and the Orchestrator runs it.
- **Standing conditions.**
  - A live benchmark series in `/home/user/agent` imports `/home/user/agent/dist`. Never run `npm run build`, `npm run clean`, or any command that writes a `dist` directory. Never write under `/home/user/agent`, and send no request to `127.0.0.1:11434`.

## Unknowns

- How `calibrate` measures the scale and fixed cost through `ProviderInterface` at the least cost. The measured harness priced a one-token generation over the system and seed view, with and without the tool definitions (`measureScale`, `bench.mjs:2943`). Use the cheapest call the provider contract allows, and report the choice.

## Scope

- **Owned.**
  - `src/core/ledgers/Ledger.ts`, `src/core/ledgers/factories.ts`, and `src/core/ledgers/index.ts`.
  - `src/core/index.ts`: add one barrel row.
  - `tests/src/core/ledgers/Ledger.test.ts` and `tests/src/core/ledgers/factories.test.ts`.
- **Shared (report-only).** Every other `src/core/ledgers/` file, and `tests/setupLedger.ts`. Return an exact patch; do not apply it.
- **Off-limits.** Every other file.
- **Made false by this change.** None.
- **Tools and limits.** Read tools, file edits in the owned files, and the scoped gates. No install and no build.

## Execution

Perform the assignment yourself and spawn nothing. Never delete a file you did not create.

## Behavior to land

1. `createLedger(provider, options)` validates the options and throws `LedgerError` with the matching code:
   - each threshold must be in (0, 1];
   - each share must be in (0, 1];
   - `capacity` must be a positive safe integer;
   - topic names must be unique and non-empty;
   - lookup tool names must be unique and never `recall`;
   - the limits must be nonnegative safe integers.

   It returns a `Ledger`, the factory idiom of `createAgent`.
2. The ledger owns one conversation in a private manager with no summarizer, so the conversation never compacts. It also owns one agent:
   - `createAgent(provider, { conversations, system, tools, limit, strict: false, select, ...agent bounds })`, with `limit` defaulting to `DEFAULT_LEDGER_LIMIT`;
   - the tools are each lookup behind a repeat stop, plus `recall`.
3. The select handler, at request entry:
   - files the conversation through the classifier;
   - reads the lookup readings, registry, and entities;
   - projects the records with `buildRecords` and selects the request's owner and topic records;
   - plans the briefing and the tail as the measured `plan` does: `## Pinned` holds the owner records under `###` headings and then the loose units; `## Rules` holds the rules record last; lines are cut in the measured order until the system text fits `(capacity * share.prompt - fixed) / (1 + LEDGER_SCALE_DRIFT)` minus the tail; the tail stays inside `share.tail` of that budget, keeps whole exchanges and call groups, and drops earlier answers and requests;
   - returns `Selection { messages: tail, judgments, usage, briefing }`.

   A stale sentence leaves every route: briefing, tail, recall, and digest (fix R2a). A tail stub's state reads the projected briefing, so `shown` is true (fix R6).
4. Stable cache. Within one request, a continuation reuses the plan the request entered with: the same briefing and tail, followed by the messages after the request. A continuation is a run whose view ends on a ledger note or the answer cue.
5. The repeat stop:
   - A lookup or `recall` call that repeats one already answered in the request, by canonical identity of the tool name and arguments, returns a failure with `notes.repeat`.
   - The ledger reads the repeat from the result, never from the call id (fix F3), and aborts the pass with reason `repeat`.
6. `recall({ topic })`:
   - It splits joined topics and searches the registry, the desk topics, and word matches over the projection.
   - It writes lead-free source lines with no handles, and cuts them to `gauge.room`.
   - It refuses with `notes.closed` once `recall.limit` is spent, after a repeat, or when the room is short.
   - It prices only `{ topic }` (fix F8), and its description names no handle.
7. `respond(content, signal?)`:
   - It adds the request and runs the first pass.
   - When the first pass ends without final text and the caller did not abort, it makes one answer pass. The first pass ends without final text when it is exhausted, aborted on a repeat, empty, or failed with a non-abort error such as a local timeout or a transport error (fix F5).
   - The answer pass adds a digest note of this request's lookup and recall results, lead-free, then the cue note `notes.cue`. It applies a scope that advertises no tools, and its select returns the entered briefing and tail plus later messages with every tool message and call message removed, seed calls included (fix F4a). It restores the scope afterward.
   - It returns `LedgerResult`: `content` and `partial` from the last pass, `usage` summed over the passes, and `passes`.
   - A `respond` while one is active throws `AgentError` with code `CONCURRENCY` before adding any message.
8. `calibrate(signal)` measures and stores the gauge when the options supplied none, and throws `LedgerError` `GAUGE` when the provider reports no usage. `respond` calibrates first when no gauge is held.
9. The classifier's `assign` handler:
   - a ledger note is `chatter`;
   - a tool message is `fact` when its lookup succeeded, or `chatter` when it failed;
   - an assistant message with calls is `chatter`;
   - an assistant message written after the first request is `chatter`;
   - everything else is undecided.
10. `src/core/ledgers/index.ts` star-exports every ledger module file, and `src/core/index.ts` gains `export * from './ledgers/index.js'`, per § Barrel exports. `Classifier` and `Gauge` are barrelled, because a consumer can construct both from values it holds.

## Output

Return:

- the diff summary;
- each numbered behavior with the test that pins it, with `path:line`;
- the calibration choice;
- each gate's exit code with its failure excerpt, if any;
- `git status --porcelain` or `unavailable`.

Cite `path:line` as plain text. No process diary.

## Deviation contract

Stop and report (expected, found, evidence, done or not done, one hypothesis) when a measured behavior cannot be expressed through the package seams without changing a file outside the owned list (return the patch). Settle private names and internal structure yourself.

## Acceptance criteria

1. `npx tsc --noEmit --project tsconfig.json` and `npm run check:src:core` exit 0.
2. `npx vitest run --config vite.config.ts --project src:core tests/src/core/ledgers/Ledger.test.ts tests/src/core/ledgers/factories.test.ts` exits 0. A scripted provider and a recording judge drive every numbered behavior, including:
   - a final reply in one pass;
   - a repeat stop followed by the answer pass, with no tools and no call messages;
   - a caller abort with no answer pass;
   - a concurrent `respond` refused.
3. `npm run test:src:core`, `npm run lint:check`, `npm run format:check`, and `npm run test:policy` exit 0.
4. `git status --porcelain` lists only the owned files and `tmp/` paths.

**Observations, not criteria.** `npm run test:guides` fails until U7 documents the new exports. Report it and do not fix it.

**Measurement.** The realistic load is the 48-message seed and the 10 requests that the U3 fixtures carry in fictional form.

## Review evidence

The actual diff and `git status --porcelain`.
