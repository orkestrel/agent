# Unit records-port — Design the briefing ledger with per-topic records as a @orkestrel/agent capability

## Role and engine

`planner` on Claude Opus 5.5, reached as a native subagent (the subjective lane), and `analyst` on GPT-6 Astra, reached through `codex exec` in a read-only sandbox (the objective lane). Both lanes take this brief unaltered, in clean contexts, blind to each other. Executor: NATIVE_SUBAGENT for `planner`; BRIDGE_DRIVER for `analyst`.

## Objective

Propose the design that moves the measured context method, the event-sourced briefing with per-topic records, out of the benchmark harness and into `@orkestrel/agent` as a public capability that the desk application can adopt, with units small enough to build and verify one at a time.

## Context

- **Evidence.**
  - The method and its measured reference:
    - `tmp/bench3/bench.mjs` holds class `Ledger` (from line 1051), `createLedgerTools` (line 2771), `LedgerChatProvider` (line 2620), `PROFILES.refined` (line 128), and the answer run (lines 3388 to 3415).
    - `tmp/bench3/records.mjs` is the pure records module.
    - The measured settings are `--profile refined --records on --ctx 3072 --tail 0.35 --judge mica`.
  - The verdict: `../scaffold/.orkestrel/agent/records-series-verdict.md`. Over 8 reworded copies the records scored 8.0 passes per copy, the refined briefing 6.75, and the full view 6.0. The records cleared the band rule against both, in a 3,072-token window where the full view needs 6,144.
  - The design and its attack: `tmp/bench/results/v9/RECORDS-PLAN.md`, `tmp/bench/results/v9/RECORDS-PLAN-ATTACK.md`, and `tmp/bench/results/v9/FINDINGS-A1.md`.
  - Known defects that the port must not carry over: `../scaffold/.orkestrel/agent/frozen-harness-audit-verdict.md` and `../scaffold/.orkestrel/agent/records-candidate-audit-verdict.md`.
  - Open items in the verdict:
    - Recall results carry handles that a reply cited.
    - A desk-wide correction stated in one account's message stays in that account's record.
    - The person prefix trusts capital letters.
    - The credit check is buried by the pinned account story.
  - The package seams, from a scout map on 2026-10-09:
    - The selection seam `SelectionHandler` returns `Selection` (`src/core/contexts/types.ts:239`, `:274`), and the stock handler is `createSelection` (`src/core/contexts/factories.ts:54`).
    - Judgments: `JudgmentManagerInterface` (`src/core/conversations/types.ts:42`).
    - Conversations: `ConversationInterface` (`src/core/conversations/types.ts:330`).
    - Agent options: `AgentOptions.select` and `AgentOptions.window` (`src/core/agents/types.ts:394`, `:377`).
    - `AgentContext.build(selection?)` (`src/core/contexts/types.ts:643`).
    - The judge contract: `JudgeInterface` (`src/core/types.ts:143`).
    - The provider contract: `ProviderInterface` (`src/core/providers/types.ts:96`).
  - The consumer, the desk at `../desk`:
    - `../desk/app/server/Desk.ts` builds a fresh agent per speech (lines 256 to 279), and every agent call sees one user message and no history.
    - Mica is the judge (`../desk/app/core/constants.ts:19`).
- **Law.**
  - `AGENTS.md`.
  - `../scaffold/.claude/rules/names.md`, `../scaffold/.claude/rules/architecture.md`, `../scaffold/.claude/rules/typescript.md`, `../scaffold/.claude/rules/tests.md`, `../scaffold/.claude/rules/documentation.md`, and `../scaffold/.claude/rules/writing.md`.
  - The guide `guides/agent.md`.
- **Installed primitives.** The `@orkestrel/*` packages in `package.json` dependencies (abort, budget, contract, database, emitter, queue, timeout, tool, workflow, and workspace) and their guides under `node_modules/@orkestrel/*/guides/`. A local helper whose job an installed export does is a defect.
- **Host.** Linux, working path `/home/user/agent`. Read-only: run no command that writes, and send no request to `127.0.0.1:11434`.
- **Standing conditions.**
  - A live benchmark series runs on this host; leave `tmp/bench/` and `tmp/bench3/` untouched.
  - `git status --porcelain` lists only `tmp/` paths.

## Unknowns

- Which parts of `Ledger` are method and which are harness instrumentation. Classify every constructor option, every profile flag of `PROFILES.refined`, and every method, and give the evidence for each call.
- Whether the categorizing judge (Mica, through the judgments seam) belongs inside the capability or is injected. Report the evidence either way.

## Scope

- **Owned.** None: this unit writes a design, not code.
- **Shared (report-only).** None.
- **Off-limits.** Every file: read only.
- **Made false by this change.** None.
- **Tools and limits.** Read, search, and list. No writes, no builds, no tests, and no network.

## Execution

Perform the assignment yourself and spawn nothing. (Bridge driver: carry this brief unaltered, launch Astra through its CLI, and return the journal path and session id with the result.)

## Output

Return one design document as your final message, with these numbered sections:

1. **Method inventory.** A table of every part of `Ledger`, `records.mjs`, the ledger tools, and the answer run, each ruled method, instrumentation, or defect, with `path:line`.
2. **Public surface.** Every exported name with its signature, following `names.md` (one word per name where the rule asks), its module directory under `src/core/`, and how it composes with the selection seam, judgments, conversations, tools, and the agent options.
3. **Data flow per request.** The steps from a new user request to the prompt the provider receives, naming which step needs the judge, which needs the provider, and which are pure.
4. **Defect dispositions.** Each defect and open item from the evidence, ruled fixed by the design, carried as a documented limit, or out of scope, with the reason.
5. **Units.** Disjoint units in build order, each with owned files, dependencies, acceptance criteria as runnable gates, and the tests that pin its behavior.
6. **Desk adoption.** What the desk changes to hold a conversation and use the capability, with `path:line` for each change site.
7. **Risks.** The ways the port could lose the measured gain. Name the check that would catch each one, such as a replay of the recorded wires of `tmp/bench/results/v9/a5-records-v1-wire` through the ported code.

Cite `path:line` as plain text, never as Markdown links. No process diary.

## Deviation contract

Stop and report (expected, found, evidence, done or not done, one hypothesis) when the evidence shows that the method cannot sit behind the package's existing seams without a breaking change to a public interface. Settle naming and placement yourself and record each choice in section 2.

## Acceptance criteria

1. Every `path:line` in the document resolves to the cited line.
2. Every unit owns files that no other unit owns, and every acceptance gate is a command that a `verifier` can run.
3. Section 1 rules every option of `PROFILES.refined` and every export of `records.mjs`.

**Observations, not criteria.** None.

**Measurement.** The recorded wires of the records series (`tmp/bench/results/v9/a5-records-v*-wire`) are the realistic load: eight 10-request shifts of a 48-message conversation.

## Review evidence

The proposal, the canon it must satisfy (the laws named in Context), and its motivation (the verdict).
