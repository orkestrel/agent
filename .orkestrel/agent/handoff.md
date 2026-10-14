# c1 thinking results and retained harness

The user has since requested a capacity repair and a new bounded comparison. The active successor is tracked in [capacity.md](capacity.md). The closed baseline below remains unchanged evidence.

The evaluation research and user-requested adversarial round closed on 2026-10-14. See [study.md](study.md) for the recommendation, [Fable's synthesis](study-synthesis.md) for the complete design, and [the round record](study-round.md) for the independent Opus proposal, Opus review, model custody, and root reconciliation. Adopt `study` for the optional development command and an unpublished `studies/` tree owned by the agent checkout. This supersedes the earlier scaffold ownership proposal and `bench` umbrella name; no move, command, or public API is implemented. The supplied-article review, methods research, and naming evidence remain linked from the proposal. Local model execution remains serial.

Closed on 2026-10-14. The thinking series and both blind audits are finished. No generation, labeling, merge, or report is waiting to run. The package hardening remains accepted at `901c786`; the user's no-bump instruction remains in force.

## Results

The graded comparison is in the scaffold's [RESULTS.md](../../../scaffold/RESULTS.md). The package implications and preservation proposal are in [direction.md](direction.md).

| Key | Records | Compaction | Valid report verdict |
| --- | --- | --- | --- |
| q4 | overflow at goal 48; 47 complete goals, 48 graded products; 1 acceptable product, 11 critical violations | 92 of 96 served; 0 acceptable products, 26 critical violations | inconclusive |
| q2 | 96 of 96 served; 0 acceptable products, 52 critical violations | 38 of 96 served; 0 acceptable products, 17 critical violations | records |

The reports retain the incomplete overflow product when a reply exists. Their top-level `served` field counts attempted rows; the arm tallies count successful products. The full-history controls overflowed at attempt 5, retaining 2 q4 products and 3 q2 products.

Both reports are valid under the frozen c1 rules, record no design leaks, and record one missed ambiguous control. The affected batch summary is flagged invalid, while the per-adjudicator rule retains its labels and does not invalidate the overall report. The rule was retained from the thinking-off comparison, not changed for these outcomes.

The thinking pass used reserve 1024, window 3584, `predict` 512, and the continue policy. Thinking-off used 512, 3072, and 0. GPT-6.1 Sol high labeled the thinking products; the earlier packets used other adjudicators. The differing budgets, adjudicators, one trajectory per arm, and shared host prevent isolating thinking as the cause of a difference. Cloud labeling overlapped local generation. These runs do not establish production readiness on these small models.

## Custody

Paths in this section resolve from this folder.

- `instruments/results/c1/q4-think/` and `q2-think/` hold each freeze manifest, public audit packet, individual and merged labels, report JSON, rendered report, repeat reading, and private key map.
- [q4 report](instruments/results/c1/q4-think/audit/report.md): 145 labels, including controls, from 73 accepted batches.
- [q2 report](instruments/results/c1/q2-think/audit/report.md): 140 labels, including controls, from 70 accepted batches.
- [Generation summary](instruments/results/c1/thinking-summary.jsonl): every retained raw arm's costs, coverage, and truncations. Role totals include calibration. Request `failed` counts include failure notes such as length cuts; they are not a transport-fault count. The row repeat counter does not count ordinary compaction repeats; use each audit's `repeats.jsonl`.
- `instruments/harness/tmp/c1-think/` holds the ignored raw runs. Every retained run has an empty faults array. The daemon-interrupted first q4 compaction attempt remains excluded under `tmp/c1-think-void/`.
- `instruments/results/c1/q4/`, `q2/`, and `q2-continue/` hold the graded thinking-off custody. Their ignored raw runs remain under `harness/tmp/c1/` and `harness/tmp/c1-continue/`.
- `instruments/units/aggregates/endurance/` holds the workload and private oracle. Never pass the private oracle or key maps to an adjudicator.

The q4 packet SHA256 is `8f09d315f81fab4e8d2e824cb202c96ef9011b52957398c695486b4a55e0c175`. The q2 packet SHA256 is `d08563c1856eac2ac704eec54fda6d5b015d106315a6f1d03f8eae92d0f2bca6`.

## Execution and verification

The continuation added a standalone labeling driver under [tools/c1](tools/c1/README.md), outside the frozen harness. It checks packet identity and split membership, validates resumed output, uses a create-only audit lock, gives every attempt a unique journal directory, bounds concurrency, and stops scheduling after a failed worker while waiting for the in-flight workers.

Sol high labeled disjoint pairs of items at concurrency 6 using neutral public paths under `tmp/units/c1-blind/<packet-hash>/audit/` at the repository root. No Opus worker was launched by this continuation, and existing workers were not interrupted. Astra independently reviewed the driver and completion chain; Luna verified the scoped proofs. The corrected driver pilot had uncapped child exits 0 with durations 138561, 232186, and 273187 ms, nonempty sessions and final messages, and canonical checker acceptance.

The first pilot lost worker startups to the unrelated required `tactica-probe` MCP handshake. After those workers exited, an invocation-local `mcp_servers.tactica-probe.enabled=false` override passed a READY probe and the corrected pilot. Global configuration was unchanged. A reviewer also caught that an operational run error can coexist with an empty faults array; rejecting the run's own `error` field passed the failing-before/passing-after proof while preserving ordinary model failures.

The isolated driver and completion-chain typecheck passed. Their combined process proofs passed 3 tests, and the frozen continuous harness proofs passed 10 tests. q4 canonical label verification exited 0 with 0 refused and 0 unlabeled; its raw integrity reader returned 0 failures for every arm. The q2 completion chain also recorded 0 refused and 0 unlabeled. The final Luna report in `tmp/units/c1-final-report-report.md` records the independent closing checks.

The generation launcher exited 0, uncapped, after 16234159 ms. The q4 completion launcher exited 0 after 2488467 ms; q2 exited 0 after 10948241 ms, including its wait for generation. These launcher durations are not model trajectory timings.

At the 2026-10-14 07:37 EDT closing check, the recorded series, completion-chain, and dedicated-daemon PIDs were absent. The series had finished at 01:40 EDT; the daemon log's later model-server termination is outside the retained trajectories. No daemon restart is needed to read the reports. The user's daemon on port 11434 was not touched.

## Harness constraints and remaining decisions

The harness is frozen. Its build identity hashes its tools and their membership. Do not add a tool there or rebuild it beside live generation or label checking; the standalone driver exists outside that boundary. Its accepted continuous proofs are:

```powershell
node --test .orkestrel/agent/instruments/harness/.build/bench5/tests/continuous/Trial.test.js .orkestrel/agent/instruments/harness/.build/bench5/tests/continuous/Audit.test.js
```

The older aggregate-era tests refer to retired results and are outside the c1 proof. Those retired artifacts remain in git history at `e85f5ee`.

Frozen manifests and raw runs bind absolute paths. The retained thinking-off raw runs bind the old scaffold location. Re-reading them requires the temporary junction procedure from the earlier handoff in git history; their graded reports can be read directly. Do not move the harness before deciding how to preserve those references.

The accepted study design supersedes direction.md's scaffold `bench/agent/` preservation sketch. A later adoption unit must preserve the historical raw evidence and frozen identities before moving durable development tooling to the agent checkout's `studies/` tree. Promotion of the complete-capture golden probe into package tests remains an independent implementation proposal. The design round changes no package generation budget, filing, or loop behavior.

A version bump remains unrequested. The accepted hardening records breaking changes to `scopes.add`, `createRelayProvider`, the run guard, `keep`, `isJudgment`, and `handleAgentRunnerJob(registry, partial, spawned, controller)`. Follow the publishing and falsify procedures when the user requests a release.

The regenerated q4 `audit/items/` directory remains untracked because command policy rejected its removal; no alternative deletion was attempted. Keep unrelated scaffold changes in the enterprise-veneer skills, `host.json`, and `tests/distribution.test.ts` untouched. Do not perform a broad temporary-file sweep while other sessions may own live work.
