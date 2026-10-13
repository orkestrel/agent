# Unit u3-ledger-helpers — Port the pure records module and the ledger's pure leaves

## Role and engine

`builder` on Claude Sonnet 5.5, reached as a native subagent. The shape is closed: unit U2 fixed the types, and the measured code fixes the behavior. Executor: NATIVE_SUBAGENT.

## Objective

Port the pure records projection and the ledger's pure leaf functions into `src/core/ledgers/helpers.ts`, with three measured defects fixed. Pin each function with tests on fictional fixtures, and move the records invariants into a test oracle. A parity probe against the measured module proves the port faithful.

## Context

- **Evidence.**
  - The plan is `tmp/units/records-port-plan.md`; the defects and their fixes are listed in its section "Defects fixed by the port". The planner design names the helpers in section 2 (`tmp/units/records-port-planner.md`).
  - The measured pure module is `/home/user/agent/tmp/bench3/records.mjs` (425 lines). Its invariant checker is `checkRecords` at line 186, and its 253-check harness is `/home/user/agent/tmp/bench3/records-check.mjs` over `/home/user/agent/tmp/bench3/records-fixtures.json`.
  - The measured pure leaves sit in `/home/user/agent/tmp/bench3/bench.mjs`:
    - the recall split joints `RECALL_JOINS` (line 787);
    - `#cut` (line 2584) and the cut line `CUT_LINE` (line 789);
    - `#stub` (line 1874), whose tail stub states are `failed`, `empty`, `shown`, and `hidden`;
    - `fitSlope` (line 6055);
    - the entity reading `entities` (line 1613);
    - the registry learning `#learn` (line 1362);
    - the account linking `linkAccounts` (`records.mjs:56`).
  - Read every measured file; edit none of them.
  - The types are in `src/core/ledgers/types.ts` (unit U2): `LedgerTokenSet`, `LedgerLine`, `LedgerRecord`, `LedgerStaleSentence`, `LedgerProjection`, `LedgerProjectionInput`, `LedgerProjectionRequest`, `LedgerLookupReading`, `LedgerRegistry`, `LedgerOwner`, and `LedgerLookupState`. The constants are in `src/core/ledgers/constants.ts`.
- **Law.**
  - `AGENTS.md`, which resolves to `../scaffold/AGENTS.md`.
  - `../scaffold/.claude/rules/typescript.md`, `../scaffold/.claude/rules/names.md` (including § Fleet name ownership), `../scaffold/.claude/rules/architecture.md`, `../scaffold/.claude/rules/tests.md`, and `../scaffold/.claude/rules/writing.md`.
- **Installed primitives.** `canonicalStringify` from `@orkestrel/contract` (`node_modules/@orkestrel/contract/dist/src/core/index.d.ts:457`) is the canonical serializer, sorted at every depth. Use it for lookup identity instead of porting `normalizeArguments`. Take the guards (`isString`, `isRecord`, and the rest) from `@orkestrel/contract`. `estimateMessages` is in `src/core/agents/helpers.ts`.
- **Host.** Linux, working path `/home/user/agent-port`, a git worktree on local branch `port`. Its `node_modules` is a symlink to `/home/user/agent/node_modules`.
- **Standing conditions.**
  - A live benchmark series in `/home/user/agent` imports `/home/user/agent/dist`. Never run `npm run build`, `npm run clean`, or any command that writes a `dist` directory. Never write under `/home/user/agent`, and send no request to `127.0.0.1:11434`.

## Unknowns

- Whether each helper name is free across the fleet. Check every exported name with the guide surface reading that unit U2 used (`createGuide().surface()` over `../scaffold/guides/*.md` and `node_modules/@orkestrel/scaffold/dist/host/guides/*.md`). Give a claimed name this module's own qualified name.

## Scope

- **Owned.**
  - `src/core/ledgers/helpers.ts`.
  - `tests/src/core/ledgers/helpers.test.ts`.
  - `tests/setupLedger.ts`: the oracle, the fixtures, and the shared builders that later units reuse.
  - `tests/setupLedger.test.ts`.
  - `tmp/probes/records-parity.test.ts`.
- **Shared (report-only).** `src/core/ledgers/types.ts` and `src/core/ledgers/constants.ts`: return an exact patch if a helper needs a new type or constant; do not edit them.
- **Off-limits.** Every other file, including `src/core/index.ts`.
- **Made false by this change.** None.
- **Tools and limits.** Read, Edit, Write, and Bash for the scoped gates. No install and no build.

## Execution

Perform the assignment yourself and spawn nothing. Never delete a file you did not create.

## Behavior to land

1. Port every function `records.mjs` exports except `compareAmounts` and `checkRecords`, plus the internals they need, with the same behavior. The port drops these: the hash fields, `HANDLE`, the currency and threshold patterns, `readAmount`, and `reverseKeys`.
2. Port the pure leaves named in Context:
   - splitting a recall topic at its joints;
   - cutting items to a room, with the cut line;
   - the tail stub for each `LedgerLookupState`;
   - the slope fit;
   - reading the registry ids and owners from lookup readings;
   - linking owners;
   - matching entities in a text, whole or partial.

   Use `@orkestrel/contract`'s `canonicalStringify` for lookup identity.
3. Fix R5a: a reading whose `result` is undefined (an empty lookup) replaces the earlier reading of the same canonical call, so the earlier result leaves every record.
4. Fix R2b: a sentence that a correction made stale stays stale when that correction is itself corrected or superseded, so the old value never revives.
5. Fix R8: lookup identity is the tool name plus the canonical arguments, equal whatever the key order at any depth.
6. Keep the person prefix as measured (ruling T4): a sentence that opens with a pronoun takes the party named in the sentence before it. Pin the known false case in a test, for example a sentence-initial company word read as a party, and name it in the TSDoc as the documented limit.
7. Keep record rendering byte-identical to `renderRecord` and `renderPinned` (`## TITLE` and `### TITLE`, with `- line` items). No generated handle (`mN`, `rN`, or `[rN]`) appears in any text a helper returns.
8. `tests/setupLedger.ts` ports `checkRecords` as the oracle and builds fictional fixtures: owners such as Brightwater Studio and Odile Marlow, never Larkspur names. `tests/setupLedger.test.ts` proves the oracle fires on each injected fault (a stale line kept, a member misplaced, a replaced result kept, a handle in a line) and passes a clean build.
9. `tmp/probes/records-parity.test.ts` runs the ported `buildRecords`, `selectRecords`, and renderers against `/home/user/agent/tmp/bench3/records.mjs` over every case in `/home/user/agent/tmp/bench3/records-fixtures.json`, importing both. It asserts byte-equal renders and equal records on every case. The only differences allowed are the hash fields and cases that exercise R2b, R5a, or R8; the probe lists each of those by case name.

## Output

Return:

- the exported functions as a table (name, signature, and the measured source it ports, with `path:line`);
- each fix with the test that pins it;
- the parity probe's result per case;
- each gate's exit code with its failure excerpt, if any;
- `git status --porcelain`.

No process diary.

## Deviation contract

Stop and report (expected, found, evidence, done or not done, one hypothesis) when the parity probe finds a difference that no listed fix explains, or when a helper needs a type that U2 did not declare (return the patch). Settle helper names and the private internals yourself and record the choices.

## Acceptance criteria

1. `npx tsc --noEmit --project tsconfig.json` and `npm run check:src:core` exit 0.
2. `npx vitest run --config vite.config.ts --project src:core tests/src/core/ledgers/helpers.test.ts` exits 0.
3. `npx vitest run --config vite.config.ts --project setup tests/setupLedger.test.ts` exits 0.
4. `npx vitest run --config vite.config.ts --project probe tmp/probes/records-parity.test.ts` exits 0.
5. `npm run lint:check`, `npm run format:check`, and `npm run test:policy` exit 0.
6. `git status --porcelain` lists only the owned files and `tmp/` paths.

**Observations, not criteria.** None.

**Measurement.** The realistic load is the recorded records fixtures and the seed of the 48-message shift that `records-fixtures.json` carries.

## Review evidence

The actual diff, `git status --porcelain`, and the parity probe's output.
