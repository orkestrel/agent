# Agent and Study handoff — 2026-10-15

This is the starting point for another session. Read this repository's `AGENTS.md` and its
Scaffold authority before acting. Paths without a sibling prefix resolve from
`C:/Users/mikes/WebstormProjects/agent`. The long chronological handoff is archived at Agent
commit `78ea378`; do not treat its historical process or deadline entries as active.

## State and scope

Compaction qualification is running. At `2026-10-15T22:19:23.838Z`, metadata recorded 32 of
96 completed products, three summaries, and most recent goal `ev-09-1`. Re-read progress before acting.
Records is sealed and labeled at 96/96. Never rerun, replay, or relabel Records for this campaign.
The original c1 thinking comparison is graded and closed; this run is the separate q4
thinking-off Compaction qualification, not a restart of that comparison.

Accepted source and remaining work are distinct:

| Checkout | Accepted source | Status |
| --- | --- | --- |
| Agent | `34862bc` consumer extraction; `78ea378` launch record | Authored workload, prompts, strategies, provenance, checkpoints, tool semantics, and grading remain under `studies/`; tests are under `tests/studies`. |
| Study | `422d549334ddb025651c9dd989168e1631938d5e` | Portable package and CLI, macro/micro refinement, shared instrumentation, lifecycle repairs, and consumer extraction are accepted locally. |
| Ollama | `f2a94d6` | Accepted usage/timing and strict native request behavior; do not alter captured runtime bytes. |
| MCP | `b0e9d7f` | Accepted remote tool-refusal classification; physical proof tree `f9fffad`. |

Study is the package name; earlier messages calling it “story” refer to this effort. Agent's
`studies/` directory is the real consumer, not a temporary mirror. Study owns reusable execution
and measurement in `src/core`, `src/server`, and `src/bin/main.ts`; outputs belong in the
consumer's `tmp/studies/`. See [integration acceptance](../study.md) and
[Study's guide](../../../study/guides/study.md). Do not resurrect private `app/studies` or the
abandoned Scaffold runtime-root proposal.

The user authorizes necessary Orkestrel dependencies and requires their latest published
versions for ordinary development. Non-Orkestrel additions need explicit authorization.
Frozen experiments retain their admitted versions. No version bump or publication was
authorized for this continuation. Scaffold was published by another session; leave its
release and `PARALLEL.md` work alone. Use the canonical contracts and direct matching Orkestrel
primitives; retain the user's single setup-file-per-layer convention.

The user requests Claude models for implementation: Sonnet for bounded work, Opus for
subjective and adversarial work, and Haiku for precise lookups. No Fable without fresh explicit
permission. On 2026-10-15 around 22:09 UTC, the Haiku lookup returned a session-limit refusal
until 18:30 America/New_York (22:30 UTC); no substantive lookup ran. No allowance percentages
are visible. The refused session was `4cb1d976-b61b-4c17-ad0e-24980edc59c1`; its launcher
exited 1 uncapped in 2865 ms. Stop Claude scheduling on that failure, and re-probe availability before reuse.
Native Luna handled mechanical verification; this is not a Claude gate claim. The semantic
adjudicator is independently frozen as GPT-6.1 Sol high and must not change with helper routing.

## Running Compaction attempt

The `compaction-output` treatment raises summary output allowance from 2048 to 4096. It keeps
context 20480, Agent output 8192, safety 512, `think:false`, the affine gauge, model/digests,
workload, rubrics, rolling history, and the final-user summary instruction unchanged. Summary
input room becomes 15872. The previous `compaction-task` attempt completed 78 products and
failed at goal 79 on summary prompt 10408, completion 2048, finish `length`. Preserve that
output-limit failure; it is not a context overflow. The preceding rolling result completed
96 products but was rejected for empty recaps. No earlier rejected result qualifies a baseline.

Request limit is 360000 ms, goal limit 900000 ms, and trial/series limit 9600000 ms. The
attempt has zero retries. Native `truncate:false` and `shift:false`, missing-usage checks,
output-limit refusal, and blank-summary refusal remain. Positive prediction residuals are
diagnostics; do not change the estimator or turn them into observed overflow. Preserve the
first real failure, its cost, and unexecuted goals separately. No rescue or optional model-visible
time/token/budget metadata is enabled.

The fixed execute deadline is `2026-10-16T00:55:00.000Z` (20:55 EDT on October 15).
The owned daemon expires at `2026-10-16T01:02:00.000Z`. Do not extend either. Daemon wrapper
cap is 10800 seconds; supervisor and observer caps are 10320 seconds. The daemon is separate
on port 11435; the user's port 11434 is untouched.

These are the recovery identities:

| Item | Identity or path |
| --- | --- |
| Runtime | `tmp/studies/compaction-output-runtime` |
| Captured project | `tmp/studies/compaction-output-runtime/project` |
| Result | `tmp/studies/compaction-output` |
| Root launch receipt | `tmp/units/compaction-output-launch.json` |
| Custody SHA-256 | `f7fd6acc551860ba89b904fc506b0eab5f11a49515ab1e183ea4fbb4a0bce4ef` |
| Study fingerprint | `50c186e330f2684ef3c0536c34dac0bc390db33fa522717a805640d7cd3ca7c0` |
| Reader SHA-256 | `ea9bd6966cf9810c24f3711bb058a8ab348764c4abd71f483b5ab111d858e0ac` |
| Build receipt | `tmp/units/compaction-output-build-receipt.json` |
| Build receipt SHA-256 | `d0f3c0f87f5b8db1bbacc3bdd3d46c65f416a10271c2d32b60055ea1ae95cdc2` |
| Study build worktree | `../study/tmp/worktrees/compaction-output`, clean accepted commit `422d549` |

Read process identity, not merely an old PID, before acting on a process:

| Process | Recorded PID | Journal and errors |
| --- | --- | --- |
| Supervisor | 29536 | `tmp/codex/compaction-output-supervisor.jsonl` and `.err` |
| Captured Study execute | 2268 | `tmp/codex/compaction-output-series.jsonl` and `.err` |
| Ollama daemon / daemon script | 72624 / 55192 | `tmp/codex/compaction-output-daemon.jsonl` and `.err` |
| Metadata observer | 84596 | `tmp/units/compaction-output-watch.jsonl` and `.err` |

Daemon start is `2026-10-15T22:04:15.149Z`. Matching `.jsonl.pid` files and the daemon-start
receipt retain process identities. An empty execute stdout journal while running is normal;
progress comes from evidence metadata. The observer exits on terminal state and never controls
execution. From Agent root, read progress without generating anything:

```text
node tmp/units/compaction-output-progress.ts
node tmp/units/compaction-output-reader.ts pins f7fd6acc551860ba89b904fc506b0eab5f11a49515ab1e183ea4fbb4a0bce4ef
```

Read the observer journal and the last dispatcher `exit=… capped=… duration_ms=…` record in
the series errors file. If execution remains live, wait; never run the launch script again.
If it terminates or dies, inspect its seal and terminal errors before any further inference.
This attempt is create-only and has no resume/retry path. Preserve a failed or interrupted
attempt; a repaired successor needs a separate namespace, captured identity, finite bounds,
and disclosure. Do not reuse an expired deadline, overwrite its result, or restart Records.
After terminal work, stop only the verified owned daemon tree and confirm its descendants
are gone, following the canonical dispatch procedure. Never kill by process-name pattern.

## Terminal reading and grading

After execution seals, read it once into a fresh result file:

```text
node tmp/units/compaction-output-reader.ts read tmp/studies/compaction-output tmp/studies/compaction-output-runtime/project tmp/units/compaction-output-reader-result.json f7fd6acc551860ba89b904fc506b0eab5f11a49515ab1e183ea4fbb4a0bce4ef
```

Exit 2 is a rejected reading, not a broken command by itself. Acceptance requires the full
96-goal horizon, known usage, unique request joins, actual room/output compliance, exercised
compaction pressure, nonempty recaps, and successful reducing rolling folds. No pressure is
inconclusive. A clean process exit alone establishes neither quality nor performance.

Run public Study commands from the captured project, using
`C:/Users/mikes/WebstormProjects/agent/tmp/studies/compaction-output-runtime/node_modules/@orkestrel/study/dist/bin/main.js`.
Use absolute result paths: the result lies outside that project's relative output boundary.
Wrap grade, label, and report commands with the canonical dispatch launcher under a 120-second
outer cap; each has its own 60-second allowance. Use a fresh journal per command. The captured
CLI's verified syntax is:

```text
study grade RESULT --rubric RUBRIC
study label RESULT --grading GRADING_SHA --labels LABELS
study report RESULT --grading GRADING_SHA
```

Here `study` means Node plus the captured CLI path, `RESULT` is the absolute result directory,
and `GRADING_SHA` comes from the preceding command's output. Use
`studies/qualification/rubric.json` for operational reporting, then the independently frozen
`studies/endurance/rubric.json` for semantic grading. A whole-trial operational predicate can
mark every criterion unsuccessful; report actual completed, attempted-failed, and unexecuted
counts alongside it. Do not describe those rows as independent semantic violations.

The semantic rubric SHA-256 is
`1c192f973185dec7fba312dcb630a64416baf9a36a5d8c79752d25dc94320206`; workload SHA-256 is
`e6d2396c71979f64e6147df3bd4a8bc7bf7bc3e2d1d0fa118dac2fae0e6e65ed`.
Grade retained products without another generation pass. See
[semantic protocol](../../../study/.orkestrel/semantic.md). Prepare neutral public-history
batches with `tmp/units/study-label-prepare.ts PACKET SCENARIO TRIAL DESTINATION`;
`tmp/units/study-label-runner/main.ts` takes `BATCH_PATH EXPECTED_SHA256 CREATE_ONLY_DESTINATION`.
Verify the actual packet and neutral trial before creating successor population/import
wrappers; historical wrappers bind earlier results. Keep full preceding public history,
and verify the runner/checker's Study contract against the captured build before dispatch.
Do not assume Agent's historical root installation validates the successor packet. Keep
verbatim current criteria, no future evidence, at most two independent Sol-high labelers,
frozen controls and bounded pilots. Stop scheduling on invalid output, missing accounting,
quota/access failure or timeout; keep launched work under its cap. No hidden retry, changed
adjudicator or reused labels across packet identities. Import through public Study commands.

Retained Records custody is under `tmp/studies/endurance-capacity-3`: result
`fe9bd623-258a-44fa-91dd-cb6cd5a564ff`, seal
`3fbafc2bbcc7c551438adba20ee90654209bff0720bb18a2499210e8f6e35b6f`.
Its semantic grading is `b3636a404a274942dde10f5cc7bddcfee4592643ee978cd17b4f7eb067fa99f8`;
labels are `tmp/studies/retained-label-population-study-labels.json`. See
`tmp/units/retained-label-import-report.md` for immutable receipt and packet identities.
The labeled reading is 78 achieved, 305 unsuccessful, 1 unknown across 384 criteria. These
are model judgments, not ground truth. Changed build/room conditions and one trajectory limit
causal comparisons. Preserve the completed Records labels rather than requesting them again.

## Accepted implementation and remaining work

Study owns the reusable trace, gauged summary provider, scripted provider, response guards,
message/readings projections, and Ollama model/settings projections. Agent source fell from
2595 lines / 97140 bytes to 2104 lines / 80231 bytes; workload assets stayed 461437 bytes.
Trace flush/goal ownership, Script cancellation settlement, and Summary gauge ownership were
reproduced, repaired, and independently reviewed. No additional macro or per-file review is
pending for that accepted extraction. See [integration acceptance](../study.md) and
[promotion acceptance](../../../study/.orkestrel/promotion.md#acceptance).

Study verification passed 509 source, 119 policy, 229 configuration, 42 setup, and 13 guide
tests, with two applicability skips. The test chain resumed after a guide-only correction;
do not claim a single all-green `npm test` invocation. Agent passed 2118 main tests with two
skips and 155 separate study integration tests. Both packages passed formatting, lint, types,
and build. Agent's discovery instrument still flags core as ungated, but direct discovery
matched 44 files and `npm test` ran them with 1474 passes; no configuration was changed.

Agent's root installed Study is historical: core SHA-256
`8fa96e330fad15c9e63c3d842d67164825cbc965c84addb2e4620bf4c5a36430`.
Do not replace it to run the promoted consumer. The accepted consumer proof worktree is
`tmp/worktrees/study-slim`, with physical dependencies under
`tmp/studies/study-slim-dependencies`. Its Study server SHA-256 is
`01bff1edf977435415d21bb572150ae6434fb900a65dd3c53c877720a6304ecd`.
Study's older `tmp/worktrees/slim` proof tree is dirty but source-equivalent to accepted root;
do not reset it. Its dependencies live under `../study/tmp/studies/slim-dependencies`.
Study root `dist` is not proof of its accepted source; build in isolation when needed.

The next work follows these dependencies:

1. Close this Compaction attempt with terminal custody, operational reading, semantic grading,
   and an honest comparison against retained Records. Preserve failures and unknowns.
2. Read qualified Compaction phase/component/checkpoint evidence before a performance
   diagnostic. Observation is implemented; no optimization or speedup is accepted. Follow
   [performance protocol](../../../study/.orkestrel/performance.md), which supersedes the
   early suggestions in [direction](direction.md). History's context share is not elapsed-time
   attribution; retained decoding measurements point to substantial Agent generation cost.
3. Admit only measured candidates under that protocol: eager filing, batching, pending joins,
   repeat handling, runtime preparation, and residency changes remain conditional. Records
   lacks exact request checkpoints and must not be replayed to fill them. No parallel GPU
   treatment during this run. The historical protocol's 1200-minute total is a ceiling for
   gated stages, not permission to execute every stage. Require its paired quality and
   whole-trajectory criteria; no component-only speedup claim.
4. Reconcile publication/installed consumption only when authorized. Study's physical
   integration proofs use unpublished Agent/Ollama APIs; registry loading is not proof that
   those APIs are published. Needed owner releases and installed-consumer verification remain
   before publication readiness. MCP's repair is accepted, not implicitly published.
5. Before retiring historical harness custody, preserve raw runs/builds and promote the
   complete-capture golden probe with negative controls into Agent ledger tests as the
   separate unit described in `direction.md`. Do not remove the temporary harness build ignore
   or relocate absolute-path inputs while a retained proof still binds them.

See [metrics follow-up](../../../study/.orkestrel/metrics.md) for optional measurements and
model-context ablations. Its attempted/unexecuted reporting defect was already repaired at
Study `065f2aa`, and package-owned format counters/compatibility branches were removed;
those historical findings are not pending implementation. Model-visible dates/budgets remain
off and require a separate frozen treatment. Research references are in `usage.md`,
`rolling.md`, `records-research.md`, and `models-research.md`; read selectively by decision.

## Verification and cleanup custody

The summary-room design used actual Opus session `feac08f8-c4de-4b0e-baae-f9756204cc37`
(81954 ms, uncapped). Root accepted 4096 as a finite next allowance, not a guarantee or the
report's incorrect uniqueness claim about powers of two. All eight prior summary inputs fit
15872: maximum projected 13033, actual 12244; the original evidence hash stayed
`24b7f43a96df1cbe6444a9f87d0c1759f0c86529693d6a5a851c0d89540e0b8d`.
Sonnet sessions `75f33e24-527a-4195-841d-de1c1dd512c6` and
`56a32507-3d1b-47f9-a92d-a88b5b40b0f7` wrote disjoint launch/reader adaptations in 166991 ms
and 213037 ms. Independent Opus `7ef12568-8d34-42e3-95e1-610076114d81` returned
`VERDICT: PASS` in 204981 ms; source rulings were supplemented by host checks. No Fable ran.

Host checks passed Node parsing and strict standalone TypeScript for the successor scripts,
reader selftest 55 controls plus 25 rolling controls, frozen staging, wrong custody,
extra-project/runtime membership and stale-deadline refusals with exact restoration.
Offline/public launch checks exited 0 uncapped in 1920/1624 ms; reader pins verified without
reading results. The isolated Study build exited 0 uncapped in 9224 ms. No model completion,
semantic quality or speed conclusion follows from these checks.
Opus noted that the existing selftest does not separately mutate every summary-specific
numeric boundary. It found no incorrect guard; retain that coverage limit when interpreting
the reader proof, rather than treating the control count as exhaustive.

The accepted code seams in `series-audit-verdict.md` and `series-repair-verdict.md` are
archived at Agent `78ea378`; their verdict documents can be retired. Their acceptance does
not close the live qualification or its grading.

The ready handoff was committed before cleanup at Agent `dd170a8` and Study `aed20fc`.
The 2026-10-15 sweep removed 49 reviewed artifacts totaling 2145106 bytes: accepted bench
transcripts/briefs, duplicate drafts/preparation copies, the quota-refused lookup artifacts,
and the archived verdicts. The sweep helper was also retired. A native Luna checker found
no live dependency on the candidates. After deletion, reader pins and the external build
receipt hash still matched; progress remained at 32/96 and the supervisor error file was empty.

Remove further accepted bench transcripts, briefs, duplicate drafts and preparation copies
only after their decisions/readings are retained.
Protect all captured runtimes/results, original c1 evidence/oracle/golden inputs, worktrees and
physical dependencies, label batches/receipts, and canonical dispatch tools. In particular,
the current launcher rechecks the external build receipt; deleting it invalidates the run.
Keep `tmp/units/compaction-output-{stage,launch,daemon,controls,progress,watch,reader}.ts`,
their stage/build/launch/daemon/control/validation receipts, and every active check/series/
daemon/supervisor/observer journal and PID file. Keep historical `compaction-task-*` and
other frozen proof tools until their custody is retired. Do not use a broad `sweep --tmp`
while this run is active. The next session must verify these paths before a further sweep.
