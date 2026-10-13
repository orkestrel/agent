# Unit u2-ledger-types — Declare the ledger module's types, constants, and errors

## Role and engine

`opus` on Claude Opus 5.5, reached as a native subagent: the unit's judgment load is subjective (names, API shape, and contract wording). Executor: NATIVE_SUBAGENT.

## Objective

Declare the public contracts of the `src/core/ledgers/` module: its types, constants, and error class. These declarations are what units U3 to U6 implement against, and their exact shape is fixed here.

## Context

- **Evidence.**
  - The reconciled plan is `tmp/units/records-port-plan.md`. Its rulings override both designs.
  - The planner design's section 2 is the starting proposal for the surface (`tmp/units/records-port-planner.md`). The Astra design's section 2 is the alternative (`tmp/units/records-port-astra.md`).
  - The measured method is `/home/user/agent/tmp/bench3/bench.mjs`. Its judge-facing constants are at lines 775 to 814, the refined profile at lines 128 to 149, and the ledger notes and cue at lines 82 to 87 and 845. Read it; never edit it.
  - The pure records module is `/home/user/agent/tmp/bench3/records.mjs`.
  - The package seams:
    - `src/core/contexts/types.ts`: `Selection` with the `briefing` member that unit U1 added, `SelectionHandler`, `Criterion`, and `SelectionOptions`.
    - `src/core/types.ts`: `JudgeInterface` and `Message`.
    - `src/core/providers/types.ts`: `ProviderInterface`.
    - `src/core/agents/types.ts`: `AgentOptions`, `AgentResult`, and `AgentInterface`.
    - `src/core/conversations/types.ts`: `ConversationInterface` and `JudgmentManagerInterface`.
  - The precedent for an error class with a `code` is `src/core/contexts/errors.ts`.
- **Law.**
  - `AGENTS.md`, which resolves to `../scaffold/AGENTS.md`.
  - `../scaffold/.claude/rules/names.md`, especially § Fleet name ownership and § Fixed lifecycle vocabulary.
  - `../scaffold/.claude/rules/typescript.md`, `../scaffold/.claude/rules/architecture.md`, `../scaffold/.claude/rules/documentation.md`, and `../scaffold/.claude/rules/writing.md`.
- **Installed primitives.** `@orkestrel/contract` for guards and `isInstance`; `@orkestrel/tool` for `ToolInterface`; `@orkestrel/emitter` where an event map is declared.
- **Host.** Linux, working path `/home/user/agent-port`, a git worktree on local branch `port`. Its `node_modules` is a symlink to `/home/user/agent/node_modules`.
- **Standing conditions.**
  - A live benchmark series in `/home/user/agent` imports `/home/user/agent/dist`. Never run `npm run build`, `npm run clean`, or any command that writes a `dist` directory. Never write under `/home/user/agent`, and send no request to `127.0.0.1:11434`.

## Unknowns

How `names.md` names the token-window option. The plan's ruling T7 says it must not read as `AgentOptions.window`, which is a `Budget`. Record the choice and the rule behind it.

## Scope

- **Owned.** `src/core/ledgers/types.ts`, `src/core/ledgers/constants.ts`, and `src/core/ledgers/errors.ts`.
- **Shared (report-only).** None. Do not add the module to `src/core/index.ts`; unit U6 owns the barrel.
- **Off-limits.** Every other file.
- **Made false by this change.** None.
- **Tools and limits.** Read, Edit, Write, and Bash for the scoped gates. No install and no build.

## Execution

Perform the assignment yourself and spawn nothing. Never delete a file you did not create.

## Contracts to declare

The plan's rulings fix these points; settle the rest yourself.

1. The entity contract `LedgerInterface`, implemented later by a class built through `createLedger(provider, options)`:
   - The read-only members `agent`, `conversation`, and the measured `gauge`.
   - `respond(content: string, signal?: AbortSignal): Promise<LedgerResult>`, which serves one request through to its reply.
   - `calibrate(signal: AbortSignal): Promise<...>`, which measures the gauge when the options supplied none.
2. The options:
   - The injected `judge`.
   - The application's `system` text.
   - The desk topics.
   - The required thresholds, with no default.
   - The token-window size (T7).
   - An optional gauge, the lookups (each a `ToolInterface` plus a reading handler), the shares, the recall options, the notes, and a narrow pass-through of agent bounds (limit, timeout, budget, signal, strict, and hooks).
   - The judge questions and criteria, as an option typed by an exported type (T6).
   - No snapshot option.
3. The judge wording:
   - The measured wording ships verbatim as exported constants: the category question and criteria, the topic question, and the amends and supersedes pair questions.
   - Their TSDoc states that the thresholds in the measured series were fitted on exactly this wording.
4. The measured defaults as constants:
   - A prompt share of 0.7 and a tail share of 0.35.
   - A turn limit of 8, a recall limit of 2, and a scale drift of 0.06.
   - The notes: cue, results header, repeat, and closed, with the measured terminal wording minus every handle reference.
5. The records data shapes, ported from `records.mjs` and generalized from accounts to owners:
   - A line, a record, a stale sentence, and a projection.
   - The projection input and request.
   - The token set and the classification.
6. `LedgerError` with a machine-readable `code` and `isLedgerError`, following `SelectionError`. One code for each configuration refusal the options can trigger, plus `GAUGE` for a calibration that receives no usage.
7. No type, constant, or member that names a handle, a pin tool, a gate, a profile, a horizon, or a tally: the plan removes them.
8. Every public name is checked against the fleet guides (`../scaffold/guides/*.md` surface rows), and a claimed name gets this module's own name. `Lookup` is claimed by `../scaffold/guides/scaffold.md`, and `Briefing` by `../scaffold/guides/brief.md`. Report each checked name.
9. Full TSDoc on every export, in the shape `typescript.md` prescribes, with an `@example` where that rule requires one.

## Output

Return:

- the declared surface as a table (name, kind, signature, and summary);
- each naming choice with the rule behind it;
- each gate's exit code with its failure excerpt, if any;
- `git status --porcelain`.

No process diary.

## Deviation contract

Stop and report (expected, found, evidence, done or not done, one hypothesis) when a declaration cannot satisfy both the plan's rulings and `names.md`. Settle every other naming and placement choice yourself and record it.

## Acceptance criteria

1. `npm run check:src:core` exits 0.
2. `npm run test:policy` exits 0, or fails only on rules that read a module's barrel or its guide rows, which units U6 and U7 own. Report each such failure by rule name.
3. `git status --porcelain` lists only the owned files and `tmp/` paths.

**Observations, not criteria.** None.

**Measurement.** None.

## Review evidence

The actual diff and `git status --porcelain`.
