# Unit records-final — Record headings, refined's tail stub, and the unscoped stale fixture in the records candidate

## Role and engine

`builder` on Claude Sonnet 5.5, reached as the native Agent tool. Executor: NATIVE_SUBAGENT.

## Objective

Make three closed changes to the records candidate under `tmp/bench/results/v9/recordsrender/`, behind `--records on` only, and rerun its proofs: account records render with `###` headings under the one `## Pinned` heading; a lookup a record shows keeps refined's tail stub; and a fixture catches an old-token check narrowed back to account-scoped requests.

## Context

- **Evidence.** The rulings unit's review (`/root/.claude/projects/-home-user/5e260bfe-213d-5ed6-a85a-c681e970c415/subagents/workflows/wf_e293b50f-c7b/journal.jsonl`, the `review` result) found: account records render as `## HOLDER (account ID)` at the level of `## Pinned`, so `## Pinned` heads an empty Markdown section (`tmp/bench/results/v9/recordsrender/proof/rulings/dry/on-a4-refined-v6/bodies/00026_api_chat.json`); the fixture at `tmp/bench/results/v9/recordsrender/bench.mjs:4485-4491` builds its stale injection from the scoped `g05-entry` plan only, so narrowing the `assertPlan` old-token check to scoped plans passes all 224 checks. The rulings unit's report notes that a lookup a record shows gets the tail stub `result shown in the system message`, while refined writes `result shown under Pinned in the system message`.
- **Rulings (the Orchestrator's).** (1) Under `--records on`, the `## Pinned` heading line is followed by each account record with a `### HOLDER (account ID)` heading and its `- LINE` lines, then the loose units; the Rules record keeps filling the `## Rules` slot with its `## Rules` heading. (2) Under `--records on`, every tail stub reads exactly as refined writes it, so the tail of every request is byte-identical to refined's tail for the same history. (3) The stale fixture also injects an old token into the unscoped g06 plan and asserts `assertPlan` reports it.
- **Law.** `/home/user/scaffold/AGENTS.md`; `/home/user/scaffold/.claude/rules/writing.md` for comments and the README.
- **Installed primitives.** None; the candidate is standalone Node.
- **Host.** Claude Code Cloud, Linux, bash, working directory `/home/user/agent`. The Ollama daemon at 127.0.0.1:11434 serves live runs and probes: send it nothing. Every harness command preloads `tmp/bench/results/v8/refinework/no-net.mjs`, the wire-replay preload, or the candidate's dry-run preload, as `tmp/bench/results/v9/recordsrender/proof.sh` does.
- **Standing conditions.** A live run may be writing under `tmp/bench/results/v9/a4-refined-v8*`; read its wire only through `proof.sh`'s snapshot, and never edit it.

## Unknowns

Whether the `###` heading changes any count in run 3; the proof reports it.

## Scope

- **Owned.** `tmp/bench/results/v9/recordsrender/bench.mjs`, `tmp/bench/results/v9/recordsrender/records.mjs`, `tmp/bench/results/v9/recordsrender/records-check.mjs`, `tmp/bench/results/v9/recordsrender/records-fixtures.json`, `tmp/bench/results/v9/recordsrender/README.md`, and new outputs under `tmp/bench/results/v9/recordsrender/proof/final2/` plus `tmp/bench/results/v9/recordsrender/proof/final2.txt`.
- **Shared (report-only).** None.
- **Off-limits.** `tmp/bench3/bench.mjs`, `tmp/bench3/records.mjs`, `tmp/bench3/records-check.mjs`, `tmp/bench3/records-fixtures.json` (the frozen files), every run and wire directory under `tmp/bench/results/`, the earlier proof outputs under `tmp/bench/results/v9/recordsrender/proof/` and `tmp/bench/results/v9/recordsrender/dry/`, and every `.env*`, `.npmrc`, `auth.json`, key, and token file.
- **Made false by this change.** The candidate's fixtures that assert a `## HOLDER` heading or the short stub, and the README's layout and stub text.
- **Tools and limits.** Read, Edit, Write, Bash; scoped validation only; no network request; no install.

## Execution

Perform the assignment yourself and spawn nothing. Update the fixtures first and record the failing run (command, exit code, failed check names), then change the code, then run `bash tmp/bench/results/v9/recordsrender/proof.sh final2` and read each part of its output.

## Output

Changed files with one line each; the failing-first run; each proof command with its exit code and counts: `node --check`, candidate `--check-ledger` under refined and roundA, `records-check.mjs`, the five roundA wire replays, `--records off` byte identity against the frozen harness on every complete a3-refined and a4-refined wire, and run 3 totals (over, fact recall, old tokens in the briefing and the tail, other-account record blocks, faults, cut lines, tail bodies equal to refined's) over every complete wire. State the run 3 go or no-go. No process diary.

## Deviation contract

Stop and report (expected, found, evidence, done or not done, one hypothesis) when a ruling cannot hold without editing an off-limits file, or when `--records off` stops matching the frozen harness. Settle naming and placement inside the owned files yourself and record them.

## Acceptance criteria

1. `node --check` on the candidate `bench.mjs` and `records.mjs` exits 0.
2. Candidate `--check-ledger` exits 0 under `--profile refined` and `--profile roundA`, and `records-check.mjs` exits 0.
3. `proof.sh final2` exits 0 with `--records off` byte-identical to the frozen harness on every complete wire, every roundA replay identical, and run 3 at over 0, full fact recall, 0 old tokens in briefings, and every tail body under `--records on` equal to refined's tail for the same goal.

**Observations, not criteria.** None.

**Measurement.** None.

## Review evidence

The Orchestrator diffs the owned files against the copies the rulings unit left and reruns `proof.sh final2` through `verifier`.
