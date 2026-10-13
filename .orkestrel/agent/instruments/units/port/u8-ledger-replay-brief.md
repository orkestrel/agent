# Unit u8-ledger-replay — Prove the ported ledger sends the measured requests

## Role and engine

`builder` on Claude Sonnet 5.5, reached as a native subagent. The planner fixed the probe's design; this brief carries it with the rulings since. Executor: NATIVE_SUBAGENT.

## Objective

Write an offline probe that replays the 8 measured `a5-records` runs through the ported `createLedger`. The probe asserts that the port sends the agent and judge request bodies the measured harness sent, after the listed normalizations, and that an injected unlisted difference fails it.

## Context

- **Design.**
  - `/home/user/agent-port/tmp/units/records-port-planner.md`, section 5, unit U8. Read it first.
  - `/home/user/agent-port/tmp/units/records-port-plan.md`: the rulings, and the departures the port makes on purpose.
  - The section 4 defect dispositions list the residual differences. F4a and R2a are the two a replay can show.
- **Recorded runs.**
  - Under `/home/user/agent/tmp/bench/results/v9/` (read-only): `a5-records-v1` to `a5-records-v8`, each with `seed.json` and a `ledger.jsonl` of rows and calls, and the matching `a5-records-vN-wire/` with every request and response. The requests are `NNNNN_api_chat-request.json` for the agent and `NNNNN_api_generate-request.json` for the judge.
  - The measured harness is `/home/user/agent/tmp/bench3/bench.mjs` with `records.mjs`. It imports the judgments in `/home/user/agent/tmp/bench/results/v3/cal-categories.jsonl` (`bench.mjs` near line 3009), and it answers lookups from the scenario variant's tools table, `/home/user/agent/tmp/bench/variants/ledger/vN.json`.
- **The port** is this worktree, `/home/user/agent-port-gauge`, at commit `111beef`. That commit equals branch `port` and includes the thinking changes.
  - The ledger's answer pass sends `think: false`, which matches the measured think-off runs.
  - `predict` defaults to 0, which keeps the measured budget.
  - Lookup handles are removed from every model-facing text; normalizations N2 and N3 cover that.
- **The judge.** Build it with `createOllamaJudge` from `/home/user/ollama/dist/src/core/index.js`, over a transport that serves `/api/generate` from the recorded responses by exact request body. A body with no recorded twin fails the probe.
- **The precedent probe** is `/home/user/agent-port/tmp/probes/records-parity.test.ts`. The probe Vitest project collects `tmp/probes/**/*.test.ts` (`vite.config.ts` near line 222).
- **Law.**
  - `AGENTS.md`, which resolves to `../scaffold/AGENTS.md`.
  - `../scaffold/.claude/rules/tests.md`: a scripted provider that implements the real interface over recorded data is the allowed stub, and mocks, spies, and module replacement are not allowed.
- **Standing conditions.**
  - Send no request to `127.0.0.1:11434`.
  - Never run `npm run build` or `npm run clean`, and write nothing under `/home/user/agent`.

## Scope

- **Owned.** `tmp/probes/ledger-replay.test.ts`, plus any helper beside it under `tmp/probes/`.
- **Off-limits.** Every other file, `src/` and `tests/` included. When the port fails a body for a reason outside the listed normalizations and residuals, change nothing in `src/`. Report the exact diff and a hypothesis instead.

## Execution

Perform the assignment yourself and spawn nothing. Never delete a file you did not create.

## Contracts to land

1. **Setup.** For each copy N, the probe sets up the run as the harness did:
   - the seed conversation;
   - the imported judgments;
   - the gauge from `seed.json`;
   - the topics, questions, and thresholds the harness used, read from the harness and the run's recorded settings;
   - the lookups answered from the variant's tools table.
2. **Agent replies.** A scripted `ProviderInterface` serves the recorded `/api/chat` replies in order and records the messages, tools, and options each call receives.
3. **Assertions.**
   - Every judge body has a recorded twin.
   - Every agent request equals its recorded body after normalizations N1 to N7: the separator, the handle sentence, the `[rN] ` prefixes, line leads, amended marks, the recall description, and recall leads.
   - Every residual difference falls under F4a or R2a, and the probe names which.
4. **Control.** An injected unlisted difference makes the probe fail. It is a separate test that expects the failure.
5. **Report.** The probe prints, per copy, the number of agent and judge bodies compared, the normalizations applied, and each residual with its disposition.

## Output

Return:

- the probe's per-copy report;
- each gate's exit code;
- every body the port failed outside the listed normalizations and residuals, with the exact diff and one hypothesis.

No process diary.

## Acceptance criteria

1. `npx vitest run --config vite.config.ts --project probe tmp/probes/ledger-replay.test.ts` exits 0 from `/home/user/agent-port-gauge`.
2. The control test fails its injected body and passes as a test.
3. `git -C /home/user/agent-port-gauge status --porcelain` lists only `tmp/` paths.
