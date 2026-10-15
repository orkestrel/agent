# Final-user summary qualification started on 2026-10-15

The Compaction-only `compaction-task` attempt started at 19:37 UTC from accepted Agent
`7bd2a44` and Study `019f5ce`. It moves the same summary instruction from first/system to
final/user, preserving folded messages and all model, gauge, workload, rubric and budget
controls. This separate treatment leaves every earlier result intact. Records remains
sealed and labeled at 96/96; never rerun or replay it.

The physical runtime is `tmp/studies/compaction-task-runtime`, the project is its `project`
directory, and results go to `tmp/studies/compaction-task`. Custody SHA-256 is
`aa11d92f2be674ff3367af2efa53881538c6ff6f07771a9cfe7d7da39f818980`; fingerprint is
`03077ac9a4198b5f3eb05c5af116646bcc1d4aa711d977bef5af7253802a285f`. Offline check passed in
2093 ms and the launch check in 2200 ms. Wrong custody, extra project/runtime files and stale
deadline controls reject, with exact restoration. The source, runtime and consumed launcher
files must remain unchanged while execution or evidence reading depends on them.

The trial limit is 9600000 ms, one attempt and zero retries. The absolute execute deadline is
`2026-10-15T22:25:00.000Z`; the dedicated daemon expires at `2026-10-15T22:35:00.000Z`.
The execute wrapper received a 10041-second cap; the supervisor has a 10080-second cap.
No deadline extension, silent truncate/shift, model retry or prediction-miss refusal is added.
Blank recap content still fails immediately after retaining its evidence and cost.

The owned process and journal identities are:

- Supervisor PID 101076, `tmp/codex/compaction-task-supervisor.jsonl` and `.err`.
- Execute PID 57252, wrapper PID 45788, `tmp/codex/compaction-task-series.jsonl` and `.err`.
- Daemon PID 20432, script PID 76008, `tmp/codex/compaction-task-daemon.jsonl` and `.err`;
  only port 11435. Daemon start is `2026-10-15T19:37:25.746Z`.
- Observer PID 60208, `tmp/units/compaction-task-watch.jsonl` and `.err`.
- Root launch receipt is `tmp/units/compaction-task-launch.json`; read progress metadata with
  `node tmp/units/compaction-task-progress.ts`.

Sonnet's `tmp/units/compaction-task-reader.ts` adaptation is accepted. It requires the
instruction once, last and as user, with source ids and provenance preceding it. Its prior
full-horizon, correlation, nonempty/reducing/repeated-fold and deadline predicates remain
binding. Strict standalone typechecking passed; selftest passed 53 controls and 25 rolling
controls in 671 ms, and pins verified custody in 363 ms. Both commands exited 0 uncapped,
read no live evidence and made no model calls. The reader SHA-256 is
`4493b0c0b6f082c15bfa49600df3e47abc6cda489fb4bd1e60bb71f9184a2f00`.
Use this reader only after the attempt seals; preserve the old reader for its earlier
instruction-first treatment. Public Study custody/grade/report remain separate terminal
checks. No quality or speedup is accepted from progress metadata. Study's promotion and MCP
repair are accepted; their records live in
Study's `.orkestrel/promotion.md`. MCP's root install was aligned to its accepted lockfile
(Scaffold 0.0.101, npm ci exit 0, 8727 ms); no source changed or package was published.

# Compaction content qualification failed on 2026-10-15

The Compaction-only successor started at 19:05 UTC and stopped at goal 11, `ev-03-3`, after
10 complete products. Its summary returned an empty string. The content guard retained the
attempted text, source ids and settled cost, then failed without retry. The remaining 85 goals
are unexecuted, not independent model failures. Trial duration is 257249 ms; execute exited 1,
uncapped, after 261007 ms. This attempt is closed; the successor is recorded above.
Records stays sealed and labeled at 96/96; never rerun or replay it for this campaign.

Result `6ae6b4cc-833b-4227-9d27-ff57546ff54e` is sealed as
`89604d36913afad1c9e8687c310e9056fcef95a04b123313c6a6e984d6dacc41`.
The captured public Study grade and report commands passed in 1242 ms and 246 ms. Their
operational rubric rejects the whole trial; its 96 unsuccessful rows are not 96 semantic
critical violations. Semantic labeling remains separate.

The independent reader `tmp/units/compaction-content-reader.ts` passed strict typechecking,
53 controls and 16 rolling controls, and exact custody verification. Its terminal read exited
2 in 341 ms, with status rejected and the real failure/cascade/cost retained in
`tmp/units/compaction-content-reader-result.json`. Actual Opus session
`349e8a34-65af-47f2-a84c-2a81edad6b52` reviewed the adapted seal/custody/terminal seams and
returned PASS in 225253 ms. Root checked the diff and owning algorithms; abbreviated
unresolved citations were not accepted as evidence. This reader does not replace the public
Study custody check. Preserve it for this frozen request shape.

The summary wire reports prompt 10604, completion 1 and finish `stop`, under context 20480
and output 2048. This is a content failure, not an observed overflow or output cap. The request
ends with an old assistant answer. A render-only check against pinned Ollama v0.40.3 confirms
that this shape continues that answer; a final user task opens a fresh assistant turn. No
generated tokens were used. This mechanism does not prove the cause of every historical blank
recap, and the exact failed request body was not retained.

Actual Opus session `2d6214a1-ec73-4a07-9e2e-c5947d8e8aa3` prescribed moving the unchanged
`summary-instruction` message from first/system to final/user in the Agent study adapter.
Scaffold's Agent guide already specifies this pattern. The final-user-only renderer checks
passed for assistant-tail and rolling-recap transcripts in 5823 ms. Root accepted Sonnet's
consumer repair after the regression failed against the old adapter (1 failure, 3861 ms),
passed after repair (1 passed, 3806 ms), and the touched file passed 91 tests. The full service
project passed 159 tests across 11 files in 94908 ms; typecheck, scoped lint and format passed.
The old first/system, missing instruction and first/user mutations each failed the named
regression; restoration passed. No models were called by these protocol-fixture proofs.
The unchanged instruction, folded source bytes, explicit provenance, blank refusal and budgets
remain covered. Freeze the successor separately, preserving all failed results.

The accepted promotion is Study `019f5ce` with Agent `8a9087b`; the MCP owner repair is
`b0e9d7f`. Study's default gates passed after isolated timing rechecks, and its authored
packed-consumer gate passed 10 tests without skips. MCP's full gates passed 2239 tests with
5 conditional skips. See Study's `.orkestrel/promotion.md` acceptance record. No bump or
publication occurred; promoted Agent/Ollama APIs still need their owning releases.

The terminal candidate uses physical captured files under
`tmp/studies/compaction-content-3-runtime`, with its authored project in that directory's
`project` folder. Its result destination is `tmp/studies/compaction-content-3`.
Keep the entire runtime, source, build receipt, launcher scripts, and their journals unchanged.
The captured Study source is the accepted `tmp/worktrees/promotion-final` build; later
working-tree changes do not change this physical copy. The original installed Study remains
unchanged for historical evidence readers.

The fixed execution deadline is `2026-10-15T21:51:00.000Z`; the dedicated daemon stops at
`2026-10-15T22:02:00.000Z`. Trial and series each permit 9600000 ms, zero retries, one
96-goal Compaction trajectory. Context 20480, output 8192, recap 2048, safety 512, thinking
off, calibrated gauge, model digests, strict overflow options, workload, and rubric remain
frozen. A blank recap retains its exact attempted text and settled usage, then fails with
`content` before history replacement. No automatic retry or deadline extension is admitted.

The process and journal identities are:

- Supervisor PID 71256, `tmp/codex/compaction-content-3-supervisor.jsonl` and `.err`.
- Study execute PID 32512, `tmp/codex/compaction-content-3-series.jsonl` and `.err`.
- Dedicated daemon PID 97780, script PID 50724, `tmp/codex/compaction-content-3-daemon.jsonl`
  and `.err`, were stopped after the render diagnostics. Root enumerated and confirmed the
  owned tree gone before preparing another daemon. The user's daemon on 11434 is untouched.
- Event observer PID 27112, `tmp/units/compaction-content-3-watch.jsonl` and `.err`.
- Read live metadata with `node tmp/units/compaction-content-3-progress.ts`. The observer
  reports milestones and terminal exit; it never declares qualification or stops execution.

Custody SHA-256 is `09748251a8b6392be3564ef0bd3cf5260d405693137ae99c74397204e0bc30cd`.
The checked declaration fingerprint is
`973ea3b82212ca8fc2dbd61f544b894573508265e066042fd9389f350fde60aa`.
The build receipt is `tmp/units/compaction-content-build.json`, SHA-256
`4e0503c9ca6fa8acd41873e260d8b642d4b9a206fdb8f02d5664ce3229cd37b2`.
Root's controls reject the wrong receipt, extra project/runtime files, reused destinations,
and insufficient deadlines; restored custody passes. The real offline check passed in
1631 ms without model calls. Earlier content and content-2 candidates failed offline on a
missing required Agent selection and an invalid built-root layout; both are retained and
were never executed. The content-3 source resolves native imports from its captured runtime.

For a successor, apply the existing full-horizon, usage, pressure,
nonempty recap, reducing fold, and repeated-fold predicates. A clean CLI exit is insufficient.
Grade retained products separately under the frozen semantic rubric; never regenerate products
to grade them. Performance screens remain gated on accepted qualification. No speedup is
claimed from the rejected historical run's context or timing shares.

# Rolling Compaction closed on 2026-10-15

Parallel performance reading is verified in `tmp/units/rolling-performance-read-v5-report.md`.
All fixed checkpoint inputs are present; the rejected qualification does not admit a speed or
quality comparison. Agent prefill accounts for 19.92% of attempt wall, summary prefill 17.71%,
and combined model loading under 1%. No new speedup or Records replay is claimed. Study's
`.orkestrel/performance.md` carries the accepted protocol and current implementation state.

Actual Opus session `8032cd0f-5c26-4b7d-9025-174c18c9c96f` recommended a consumer-only
blank recap refusal and a distinct Study `content` cause (108670 ms, exit 0, uncapped).
Root verified strict Agent compaction rethrows and the existing rolling no-commit-on-throw
test; a duplicate core proof is unnecessary. Sonnet implementation runs in Agent
`tmp/worktrees/empty-recap` and Study `tmp/worktrees/study-content`. Preserve exact failed
summary bytes and usage before refusal. No retry, prompt rewrite or successor run is launched.

The rolling successor completed all 96 goals, with no operational failure, in 3402443 ms
of launcher wall time. The process exited 0, uncapped. Its qualification reader rejected
the result: 8 of 12 summary completions were empty. The remaining 4 were nonempty and
reduced the subsequent projected request. All 11 repeated folds carried the prior recap
forward structurally. Completion does not override the predeclared nonempty-fold criterion.

Result ID: `883013ed-ae9a-4af4-a1ff-153490d73d95`.
Seal: `3bf2316f53f28af8a49d2894b93d24e2e35804176091892ab80ea485c5719426`.
Reader output: `tmp/units/rolling-reader-result.json` (400555 bytes); read a projection,
never dump the report. Its SHA-256 is
`43d7301bfc5cb2725dda3693993dff97f582b9010428170d584440acbcef5d4e`.
The compact projection and predicate review are `tmp/units/rolling-terminal-review-projection.json`
and `tmp/units/rolling-terminal-review-report.md`. No replay or follow-on run was launched.
Frozen runtime/project/results and the accepted-source archive remain unchanged. Records
remains sealed and labeled, 96/96, and must not be rerun. Investigate the empty recap finding
without changing this result or silently loosening its qualification rule.

Study promotion is authorized and underway in the sibling Study checkout. Its accepted
plan is `.orkestrel/promotion.md` there. Actual Sonnet owns runtime selection and grading/
settlement units; actual Opus owns shared Agent/Ollama instrumentation in isolated worktrees.
Keep Agent's installed Study copy unchanged until retained evidence no longer depends on it.

# Authored study test layout accepted on 2026-10-15

The user placed Agent's authored study proofs under `tests/studies`, mirroring `studies`.
All 14 files moved: 12 test modules and their two types files. Imports were adjusted; helper
and assertion bodies were preserved. Shared helpers and their proofs now live only in
`tests/setupStudy.ts` and `tests/setupStudy.test.ts`; the old setupService files are removed.
The existing isolated `service` project selects the new paths and setup, retaining its bounded
process settings and existing package scripts. No runtime code or manifest changed.

Independent verification collected every moved test file exactly once and passed 180 tests
against a separate copy of the accepted runtime. Root policy passed 119 with one applicability
skip, config passed 229 with one applicability skip, and setup passed 161. Typecheck, scoped
format and lint passed. The verification wrapper initially mistook 14 moved files for 14 test
files after Vitest had passed; the separate census reconciled 12 tests plus two type modules.
The passing service execution was not repeated for that receipt-only defect.

Before moving source proofs, root archived every accepted source binding byte-for-byte under
`tmp/studies/rolling-accepted-sources`; its `custody.json` SHA-256 is
`d074519dc1d470f6400d4291a1ba80b3b2031e10525c5c7afcbc2c10e905c161`.
The original acceptance receipt and frozen project/runtime remain unchanged. Its old absolute
source paths describe commit `7a2e29a`; use the archive for their source evidence. The terminal
reader verifies the original receipt bytes and frozen project/runtime, not today's source paths.
Never relaunch the consumed prelaunch wrappers. The live series is unaffected by this relocation.

# Rolling Compaction running on 2026-10-15

Agent implementation committed at `7a2e29a`. Only Compaction is running. Records remains
96/96, sealed and labeled; never rerun or replay it. The rolling run is development evidence,
not a replica or quality claim about Claude Code, Codex or Cursor. Read `rolling.md`.

Project: `tmp/studies/compaction-rolling-project`. Output: `tmp/studies/compaction-rolling`.
Fingerprint: `3916d7506358aca5d08ae3b33569b1005cae87c9eeba8b1614725ff6b17df90a`.
External launch-pins SHA-256: `6d4c4b4bf1e7648f3576fa89525dc849dd6eec8c9bb266a2c5ecd6855869c346`.
Absolute deadline: `2026-10-15T17:26:13.570Z` (13:26 EDT). Do not reset or extend it.
One attempt, 96 goals, zero retries. Trial and series allowance: 9662835 ms.
The reader's `pins` command verified the frozen identity before launch.

Canonical series PID 21148; journal/errors `tmp/codex/compaction-rolling-series.jsonl` and
`.err`. Evidence at `execution/trials/r1-s1-a1/evidence.jsonl` was advancing at 14:43 UTC.
Read-only watcher PID 32260 writes `tmp/units/compaction-rolling-watch.jsonl`; it exits on
terminal state or its bound and never controls execution.

Dedicated daemon PID 95044, wrapper PID 71800, port 11435. The canonical dispatcher owns
its four-hour cap, ending around `2026-10-15T18:41:49.780Z`; receipt is
`tmp/units/compaction-rolling-daemon-start.json`. The old owned daemon 65196 and descendant
84864 were stopped and confirmed gone before replacement. User daemon 11434 was untouched.

Do not rebuild, install, sweep, or edit captured runtimes or frozen study inputs. Preserve
acceptance-bound files under `tmp/units`, the isolated runtime and all prior result custody.
Study's parallel implementation remains accepted at `065f2aa`; Agent's captured installed
Study stays unchanged. No blanket cleanup is safe while this attempt and observers run.

At termination, read canonical errors and run:

```text
node tmp/units/rolling-reader.ts read tmp/studies/compaction-rolling tmp/studies/compaction-rolling-project tmp/units/rolling-reader-result.json 6d4c4b4bf1e7648f3576fa89525dc849dd6eec8c9bb266a2c5ecd6855869c346
```

The reader uses create-only output and exits 2 when qualification is not established. Preserve
the actual first failure and unexecuted remainder; do not auto-retry. If complete, require
repeated nonempty reducing rolling folds before qualification. Grade retained products and
update reports with the treatment/build differences. Compare performance only within the
accepted protocol; rolling qualification is not a quality or speed result.

# Rolling implementation accepted on 2026-10-15

Read `rolling.md` for vendor research, the selected one-pass replacement mechanism and
verification. The implementation is accepted after actual Sonnet work, independent actual
Opus review and proof closure. Full isolated service: 180 passed. Root project tests and
guide parity pass; historical runtimes retain their bytes.

The final root receipt is `tmp/units/rolling-compaction-acceptance-2.json`, SHA-256
`1bd2c0df6ede7c2d94c461b881cbc6ef91f2422dc16478d2a3966a5169e44aed`.
Use `rolling-series-stage-2.ts`: the original stage's dry validation incorrectly treated
the prior generated Compaction profile as a removed source file. The successor exempts that
generated profile alongside the already-preserved generated scenario; exact source-delta
validation now passes. The original stage and receipt remain unlaunched evidence.

Stage validation passed with exactly the expected memory source delta: StudyMemorySession,
types and validators. Freeze/launch remain pending at this entry. The next steps use
`rolling-series-freeze.ts`, `rolling-series-launch.ts` and `rolling-reader.ts`. Never build
root dist, refresh dependencies, or alter captured runtime inputs. The isolated mirror is
`tmp/studies/compaction-rolling-runtime`; preserve its build receipts and all acceptance-bound
artifacts. The final launch entry will supersede this pending status.

# Production-compaction research changes the successor on 2026-10-15

The user's comparability check withdrew the unlaunched sections:2 proposal. Read
`rolling.md` for primary sources, the actual Opus opinion and the replacement decision:
one-pass rolling text compaction over prior recap plus eligible live history. No successor
has launched. Never execute the compaction-cap draft wrappers. Records and historical
outputs remain immutable. Changed Agent core must build in isolation from captured runtimes.

# Prior recap-cap authorization on 2026-10-15, superseded by the research decision

The user authorized repairing the recap-growth policy and launching a separate Compaction-only
treatment. The analyst unit compaction-cap-design selects a bounded use of the existing section
cap before implementation and freeze. No successor has launched at this entry. Keep Records
and every historical failed run unchanged; their deadlines and stop rules are not extended.
Study acceptance proceeds independently at sibling commit 065f2aa without refreshing Agent's
installed Study runtime. The following terminal record describes the prior room treatment.

# Terminal Compaction and parallel quality work on 2026-10-15

The user selected unchanged estimation with prediction misses recorded as diagnostics. Root
accepted Agent e390d2e and Ollama f2a94d6 after independent Astra/Opus review, prescribed fixes,
mutation proof and final gates. Actual room/output failures, native refusals, missing usage,
operational failures and exhausted bounds still stop at the first failure. No retries or rescue.
Estimator, affine coefficients, 512-token cushion, compaction admission and room remain unchanged.

Compaction is terminal: 37 goals completed, goal 38 was attempted and refused, and 58 goals
were unexecuted. Retain candidate-3 Records at 96/96; never rerun or replay it.
Old attempts and their verdicts remain immutable. This successor changes the failure policy
and opts Compaction into native truncate:false/shift:false; it is disclosed development evidence.

Project: Agent/tmp/studies/compaction-room-project. Output: Agent/tmp/studies/compaction-room.
The immutable launch.json binds fingerprint
d25f68bbdf3b124a3b3de83466fc7ee6a93d2fae575d4d7a2c7a60307b717669 and absolute deadline
2026-10-15T13:50:20.202Z (09:50 EDT). Trial/series allowance is 8064424 ms, with 60000 ms
launcher cleanup. The launcher uses the remaining absolute allowance; never reset or extend it.
One attempt, 96 goals, zero retries. Request duration remains 360000 ms, goal duration 900000 ms.

Root launch: node tmp/units/compaction-room-launch.ts, already executed; do not execute again.
The launcher ended exit 1, uncapped, after 1912436 ms. The first refusal at ev-10-2 was the
local admission projection 12976 against input room 11776, not a native Ollama overflow.
The failed run remains sealed as c76f74f0788d3b0732fbbd5b3a240d279f4bbcfabee8865d35fb096cb0750f34.
No automatic rerun is selected.
Canonical child PID 65956. Execution journal/errors: Agent/tmp/codex/compaction-room-series.jsonl
and .err. The journal writes its result at termination; live evidence is
execution/trials/r1-s1-a1/evidence.jsonl under the output. Event observer PID 45800 writes
Agent/tmp/units/compaction-room-watch.jsonl and exits at terminal state or its bound. It never
controls execution. Dedicated daemon PID 65196 remains on 11435 under its original 6-hour cap
ending around 16:57 UTC. User daemon 11434 is untouched.

Do not build, install, format or edit captured source/runtime while this execution is live.
Temporary readers and cloud labeling may proceed independently. Root acceptance and all gate,
review, live-proof and instrument hashes are in Agent/tmp/units/context-repair-acceptance.json.
The stage, freeze and launch wrappers checked the full captured runtime, unchanged workload,
rubrics and historical Records custody before launch. Retain these artifacts through grading.

Qualification requires all goals complete, known positive prompt usage and unique canonical/wire
joins, actual room/output compliance, and exercised compaction pressure with nonempty summary
and successful smaller summary-bearing requests. Without pressure, report inconclusive.
Report positive prediction residuals separately; they cannot reject this successor. Near-room
coverage and phase/component costs are descriptive. No quality or speed result is established yet.

Root accepted tmp/units/compaction-room-reading.ts after 36 CPU controls and frozen inventory
verification. Its terminal reading is tmp/units/compaction-room-reading.json, exit 2 as expected
for rejection. It preserves the first failure, unknown usage, unexecuted cascades and separate
component/phase measurements. Do not overwrite that reading.

Retained Records labeling completed exit 0, uncapped, after 2018346 ms with 2 GPT-6.1 Sol high
workers. All 95 pending batches and the preserved 096 pilot passed custody checks. The imported
grading is b3636a404a274942dde10f5cc7bddcfee4592643ee978cd17b4f7eb067fa99f8: Records has 78
achieved, 305 unsuccessful and 1 unknown over 384 semantic criteria. These are model judgments,
not established ground truth. Actual transport input/output was 6777291/127585 tokens; no
cached input was reported. Original execution and historical gradings remain unchanged.
See tmp/units/retained-label-import-report.md for immutable label and report custody.

Compaction labeling also completed: the remaining 36 batches ended exit 0, uncapped, after
723219 ms, alongside the preserved 037 pilot. All 37 product-bearing batches passed the
148-assignment audit, including omitted, duplicate and foreign controls. Imported grading
467587cc891b026a8c5d81eb36ade8b8ffa7ed6a98b92f03ffcf06e27b67a8d1 records 24 achieved, 124
unsuccessful and 236 unknown over the declared 384 semantic criteria. The 59 absent-product
goals include the failed attempted goal and 58 genuinely unexecuted goals. The frozen report
incorrectly calls all absent products unexecuted; preserve its bytes and use the terminal
reading for execution counts. Actual labeling input/output was 1645758/45953 tokens over 37
calls; summed duration was 1337131 ms. Public label/report commands both exited 0 uncapped.
See tmp/units/compaction-label-import-report.md and its canonical command receipts. Labeling
creates a grading on the existing execution result; it does not create another execution.

The refusal's dominant component is eleven accumulated recaps: 9943 of 12315 heuristic units.
The driver omitted the existing sections cap; the library's documented default is uncapped.
The final fold expanded one arrival by 67 units while retaining all prior recaps. This is a
treatment-policy limitation, not a proven Conversation mechanism defect. Selecting a cap would
change model context and requires a separate frozen treatment. Do not silently change this run.

Performance preparation retained exact bytes for the available four checkpoints in
tmp/studies/performance-terminal-inputs. The successor verifier
tmp/units/performance-terminal-inputs-2.ts passed strict TypeScript and its positive/negative
controls; the original extraction script is preserved but was not accepted for conformance.
Agent prefill accounts for 27.575% of Agent fetch time and 20.389% of this partial attempt's
wall time; model loading is 0.372% of Agent fetch time. The required twelve-checkpoint screen
is incomplete. No speedup or optimization is accepted. See ../study/.orkestrel/performance.md.
Study execution accounting is accepted at sibling commit 065f2aa. Actual Sonnet implemented
the change and independent Opus reviewed the production claims and proof adequacy. Study-owned
format counters and historical compatibility branches are removed. Explicit boolean execution
facts separate attempted failures from unexecuted cascades. Structural validation, integrity
hashes, npm identities and caller-authored content versions remain. There is no decoder,
migration or npm-version branch. Historical runs retain their captured runtime unchanged.
Prescribed close-failure tests killed both review mutations; restored focused tests passed 59.
Final format, lint, types, build and npm test passed, with 604 tests passing and 2 explained
applicability skips. Discovery found no ungated, empty or undiscovered files. The commit carries
the review ruling and gate measurements. No version bump or publication occurred.

The CPU-only compaction-sections-fixture passed against the real frozen Conversation. It
reproduced recap expansion and verified merge triggering, preserved source identities and the
protected exchange, plus initial/merge throw and abort behavior. No model executed. Its cap-2
fixture was not a treatment recommendation or model-quality reading; the authorized successor
requires its own frozen policy and bound.

The requested one-hour metadata check completed at 2026-10-15T13:15:20.018Z (09:15 EDT),
exit 0 uncapped, without inference. It wrote tmp/studies/progress-check-20261015T1315.json.
The following sections are historical; this terminal state
supersedes their active-process and pending-label statements.

# Compaction terminal state on 2026-10-15

Read `usage.md` for the completed Ollama API research and the next implementation decision:
separate prediction diagnostics from reserved-room enforcement, prove opt-in truncation/shift
controls, then evaluate an adaptive estimate through the existing custom consumer. This decision
does not authorize a run under the elapsed frozen deadline. No runtime change has landed for it.

The owned daemon on 11435 was stopped after terminal custody was collected. No GPU execution is
active. The user daemon on 11434 was not changed. Retain the raw runs, frozen projects, readers,
and runtime backups; `compaction.md` remains hash-bound.

The temporary label runner repair is verified: 59 helper tests pass, and isolated mutations of
the prompt boundary, judging policy, and publication order fail their regression tests. Live Sol
controls returned 4 achieved, 4 unsuccessful, and 1 unknown against the frozen expectations. The
largest Records batch 096 completed in 32900 ms uncapped, with 125458 input tokens and 1262 output
tokens. Its full 462917-byte batch was sent; no summarization or Records execution occurred.
Receipts are under `tmp/studies/study-label-control-{a,b,c}-1` and
`tmp/studies/study-label-pilot-096-1`; verification reports use the corresponding prefixes under
`tmp/units/`. No labels have been imported. Population labeling has not launched. Keep the
pilot as the single completed attempt for 096; do not label it again.

The cushioned successor is terminal and rejected: 24 completed goals, failure on attempted
goal25 (`ev-07-1`), and71 unexecuted. Actual prompt10738 exceeded cushioned projection10703
by35, while reserved room11776 still had1038 tokens. Launcher exit1, uncapped971634ms.
The frozen reader passed custody checks and saved rejected status to
`tmp/units/compaction-cushion-reading.json`. See `qualification.md` for the seal and evidence.
No further GPU execution is selected. Records remains sealed at96/96, with no rerun or replay.

The following launch decision is historical. Its original absolute deadline has elapsed.
Continue only retained-product grading, cost analysis, and independent implementation checks.
Keep `compaction.md` byte-identical because the frozen launch binds its hash.

# Compaction successor decision on 2026-10-15

Reuse sealed candidate-3 Records, 96/96 complete; execute no Records replay. The repaired
Compaction-only provisional attempt ended with 21 completed goals, one attempted failure,
and 74 unexecuted goals. Actual prompt usage 10425 exceeded its frozen projection 10423 by
2 tokens while remaining below reserved room 11776. It is rejected under its original criteria.
The failure, empty first summary, grading limitations, and retained seal are in `compaction.md`.

Root accepted a separate Compaction-only candidate with a 512-token predictive cushion.
The base coefficients, context/output/physical safety/recap limits, runtime, and workload stay
fixed. This is an engineering margin selected after failure. The absolute deadline remains
2026-10-15T07:15:45.568Z; the final launch check requires 6396760 ms plus 60000 ms cleanup.
If that check or the successor fails, stop GPU generation. No retries or further rerun are selected.

Offline development replay covers 44 retained Full/Compaction requests; all fit the cushion,
and the zero-cushion control reproduces the +2 failure. One agent request would require earlier
compaction. The successor reader passes 30 controls, including +2 acceptance and +513 refusal.
These reused measurements are not held-out validation. Root freezes reader and replay hashes
before launch. Full calibration remains inconclusive; no historical outcome changes.

The create-only project is `tmp/studies/compaction-cushion-project`; output is
`tmp/studies/compaction-cushion`. Read its `launch.json` and
`tmp/units/compaction-cushion.{jsonl,err}` for execution state. Until those exist, it has not
launched. The earlier provisional artifacts remain preserved. No runtime build/install is needed.
Records semantic batches are prepared at `tmp/studies/labels-2ac2a898`; no labels are applied.

The following repair protocol is retained history; the cushion decision supersedes its launch.

# Series repair accepted on 2026-10-15

Reuse candidate-3 Records; execute Compaction only. Actual Sonnet implemented summary admission
and role-preserving projection errors; actual Opus implemented cross-copy StudyError recognition.
Independent Astra review passed; Luna's final Agent and Study gates passed, including the real
packed ESM/CommonJS proof. Root accepted the repaired claims in `series-repair-verdict.md`.
The original CPU reproduction passed against the refreshed installed runtime: the over-room
response retains capacity attribution. No Fable was used.

Root observed summary red8failed/4passed become17passed; all memory files129passed; fixture17
passed; root TypeScript passed. A further nonidentity summary-gauge proof passed with the
existing Agent gauge proof (2tests): estimate3903, scale2/overhead7 projects7813 and refuses
before dispatch. Study final focused core/setup30passed, captured CLI3passed, processes31passed,
root TypeScript passed. The CLI regression separately preserves abandoned-ticket cleanup
failures rather than mistaking them for attribution loss. Final receipts are under Agent/tmp/units
with prefix series-repair-final; independent review is series-repair-review-report.md there.

The accepted prospective protocol is at the top of ../study/.orkestrel/series.md. Full calibration
stays inconclusive and unchanged. One Compaction-only qualification tests its provisional frozen
gauge prospectively, with160-minute trial/series and60-second launcher cleanup allowance.
Per-request underprediction or missing usage stops it; summary prompt room17920 and Agent
prompt room11776 are admitted separately. No automatic rerun, recovery, refit, or extension.

Installed Study was preserved under tmp/studies/runtime-before-error-identity and refreshed after
gates. The create-only tmp/studies/compaction-provisional-project holds the repaired memory source,
runtime transitions, and frozen protocol. Root's compaction-provisional-freeze.ts requires accepted
review, final gates, clean commits, unchanged staged bytes, and daemon coverage. Its launch.json
records the absolute deadline and command; it never launches inference. Execution journal/errors
are tmp/units/compaction-provisional.{jsonl,err}; output is tmp/studies/compaction-provisional.
Check those receipts for execution state. The event observer is compaction-provisional-watch.ts.

The following paragraphs retain the diagnostic's custody and older context; their active-unit
statements are superseded by this dated state.

Reuse completed candidate-3 Records; rerun Compaction only. Candidate 3 is terminal:
Records completed96/96 without partials or failures; Compaction produced63 products, failed
at attempted goal64, and left32 unexecuted. Its sealed custody remains under
tmp/studies/endurance-capacity-3. No quality generation is admitted by that failed capacity
result. Separate semantic grading of retained products is supported and avoids another
Records execution. The prospective plan is in ../study/.orkestrel/series.md, resolved from
the Agent repository root, with performance and metrics follow-ups beside it.

Agent3f7c2bd, Studye008235, and Ollamaaad1e2d implement complete-request admission,
strict refusal, structural context components, request/wire correlation, and passive timing.
Integrated source review and final Agent/Study gates passed; see
[series-audit-verdict.md](series-audit-verdict.md). No version bump or publication occurred.

The separate Full calibration diagnostic has ended: result5659e8cc-9595-4727-a95c-b8481663b6f6,
seal05fb70819a5a08063ec82a5dcb3fad6b0927bbba462757ca048e2e5e1d4b52f4, output
tmp/studies/calibration-full. Its launcher exited1, uncapped, after250683ms. It completed the
repeated first-goal controls and10 trajectory goals, then exceeded prompt room at goal11.
Both control bodies were identical and reported1850 prompt tokens. Its training-only fit
was frozen before validation under tmp/studies/calibration-project. Validation is inconclusive:
held-out positions4and8 passed projection checks, but pressure coverage and the required
held-out population were insufficient. Do not relabel it passed, overwrite it, or launch from
its validation. The original candidate-3 deadline remains unchanged; this diagnostic was a
separate bounded experiment.

The live diagnostic also exposed a remaining error-attribution defect: the capacity error
crosses the installed Study worker boundary as infrastructure. The installed Study bytes
match the sibling build; independent Astra is reproducing the bundled nominal-error boundary
with a CPU-only fixture. Actual Opus is deciding a bounded successor validation protocol from
the inconclusive diagnostic. Fable remains forbidden. Neither lane may rerun Records.

No GPU series is running after that terminal result. Dedicated daemon 11435 remains under its
recorded cap ending2026-10-15T12:53:19.339Z; user11434 is untouched. Runtime refresh or build
requires checking that no successor has started. The source worktrees and installed-runtime
backups remain preserved. Temporary active-lane details belong in
tmp/units/study-performance-handoff.md; do not read the following historical running-PID
paragraphs as live state.

## Historical c1 and successor custody

The user requested a capacity repair and a bounded comparison. The failed thinking-enabled attempts are tracked in [capacity.md](capacity.md); the selected prospective successor is tracked in [endurance.md](endurance.md). The closed baseline below remains unchanged evidence.

The Study capacity attempt at 2026-10-14T20:54:26Z ended with an infrastructure failure before model requests. The captured loader refused `node_modules/@orkestrel/agent/dist/src/core/index.js` because the profile selected Agent's root build. Both trial attempts are sealed under `tmp/studies/endurance-capacity`; all 192 goals are unexecuted and every role has zero calls. The public CLI exited 1, uncapped, in 4520 ms. Grade and report succeeded, with grading identity `16e4298b0203d849af459541f453d9fe8a8c0a83a1f6874bb460dc1f0e480f6d`. Capacity was not accepted and quality did not start. Preserve this attempt and its `tmp/studies/endurance-plan.json` receipt; do not restart it or change its captured files. The repaired installed CLI reproduces its public report byte for byte.

CPU diagnosis and independent review closed that loader defect. Study `f977e68` admits distinct captured package roots with the same name, retaining canonical-path duplication refusal and all file admission checks. The q4 profile now captures the installed Agent dependency separately from the local Agent/Ledger subject. Ollama retains its native installed Agent bases; neither root is aliased or substituted. Independent verification passed the native positive and refusal controls, the service project (51 tests), setup project (139 tests), static gates and installed offline checks. All 14 installed Study dist files and the manifest match the verified sibling build.

The selected successor uses create-only `tmp/studies/endurance-plan-2.json`, `tmp/studies/endurance-capacity-2`, and `tmp/studies/endurance-quality-2`. Its checked capacity fingerprint is `93b767d2fd435dbca752cc03bf3d55050a61cf9a9606a34fce843057de385aab`; quality is `4542045e22f96dbadab5a7b1e267fbb368fdc1a3d46602374b32f91f31ddf42f`. Preserve the original overall deadline, 2026-10-15T08:54:21.154Z, and the original models, bounds, fixed schedule and workload. The unchanged [protocol](endurance.md) records those bounds; the new plan records the root repair and replacement output destinations. Root must accept sealed full-horizon capacity, observed usage and pressure coverage before starting quality. Each generation launch is capped at 21660 seconds; quality starts only with that full allowance remaining before the original deadline. No automatic retry or budget increase is selected. The freeze recorder is `tmp/units/study-endurance-native-freeze.ts`; it refuses existing successor custody. Read progress with `node tmp/units/study-endurance-progress.ts capacity 2` and the journal `tmp/codex/study-endurance-capacity-2.jsonl`. Never build or install against captured files during execution.

The successor plan froze at 2026-10-14T21:20:32.463Z and execution launched immediately after it. It terminated uncapped with exit 1 after 2545154 ms. Records completed 48 products with no partials; goal 49, `ev-13-1`, exhausted its goal allowance while admitting judge work. Compaction never executed. This was a request-admission failure, not a context or output overflow. The sealed result is `5ef1149a-2b23-40a8-9343-436cfa16600f`, seal `e3209f35797713c115371fd51e155df116361859672e204c3dbb21f48e88af1c`.

Native Luna graded and reported the failed capacity result through the public installed CLI. Both commands exited 0, uncapped, in 1121 ms and 293 ms. Grading identity is `6f10e6acbf0d6613256239dccbebd8c940864d13b9743a41a4dd934239450aa7`. Root read both bare outputs. The report retains 48 of 192 scheduled products and 144 unexecuted outcomes. Its two terminal trial faults include the unstarted compaction trial; they do not establish two independent executions. Records retained 51 lookup events; compaction-summary coverage is absent. Capacity is not accepted and quality must not launch from this result. The observer report is `tmp/units/study-endurance-watch-report.md`. Astra's diagnosis found 125 judge calls and 3 metadata calls consumed the 128-call goal ceiling while token, byte and time allowances remained. Correction filing can compare an arrival against many earlier related messages; retained wire evidence cannot identify exact pairs or establish a cache defect. Preserve the failed result and receipt.

The separately reviewed [admission successor](admission.md), committed at `a831d50`, freezes `q4-room` under `tmp/studies/endurance-plan-3.json` at 2026-10-14T22:27:19.914Z. It retains context 20480, output 8192, thinking off, model digests, workload, copied Study f977e68 and the original outer deadline. Goal admission permits 8192 calls and one hour; trial remains four hours and series six hours. Safe token/byte counters cover the declared call ceilings. The public-only preflight and independent ordered-fixture, refusal and hash controls passed; they establish admission under the selected policy, not completion or quality.

Candidate 3 is running under execution PID 57064, root exec session 44252, journal `tmp/codex/study-endurance-capacity-3.jsonl`, errors `tmp/codex/study-endurance-capacity-3.err`, cap 21660 seconds. At 2026-10-14T22:34:39Z, the direct progress reader observed 8 completed q4 records products, no partials, 115 dispatches and 114 wire receipts, with the next agent request active. Use `node tmp/units/study-endurance-progress.ts capacity 3` for a bounded reading. Native Luna's event observer is PID 93828, exec session 38216, journal `tmp/codex/endurance-watch-3.jsonl`. Its brief is `tmp/units/endurance-watch-3-brief.md`; it may mechanically grade and report terminal capacity but never start quality. The output is `tmp/studies/endurance-capacity-3`; quality's untouched destination is `tmp/studies/endurance-quality-3`. Root must inspect the terminal report and require all 192 products, no operational faults, actual usage, records lookup and compaction-summary coverage before accepting capacity. Quality may start only if the complete 21660-second allowance remains before 2026-10-15T08:54:21.154Z. No deadline reset or automatic retry is selected.

Study's renewed actual Opus refinement is accepted at `d06b30c`: 101 authored paths reconciled, independent review and repaired-claim mutation complete, final tree gates with 503 passing tests and two applicability skips, and isolated tarball proof with 9 passes and no skips. Its closed campaign folder is retired. Public truth lives in its guide and contracts; prior design decisions remain in git history. Do not copy the refined build into Agent while the capacity/quality execution and grading chain still needs the captured f977e68 runtime. The installed consumer refresh and proof follow that release of frozen inputs; they are not permission to rebuild a running candidate.

The dedicated [Study package integration](../study.md) is implemented and accepted after independent review and gates. The user superseded app placement and a new scaffold root axis with @orkestrel/study, using canonical src/core, src/server and src/bin, with results in the consuming package's tmp/studies. Agent owns its consumer adapters under studies/. Duplicated app code was removed at 8a14ac9. The abandoned scaffold axis was restored exactly; do not integrate it or run the old migration. Opus's macro and per-file reviews, Sol's mutation proofs, the final Astra review, Study and Agent tree gates, and the actual installed CPU integration all passed. These proofs do not assert model quality. The user's final Fable allowance is consumed; do not invoke it again. Use latest published Orkestrel versions for working builds and preserve frozen runs. Consolidate fixtures by surface, never per item. The temporary harness/.build ignore stays until dependent generation, grading, reporting and custody work no longer need it.

The extended capacity series stopped at2026-10-14T18:16:38Z, exit3 uncapped. Q4records completed48goals and exhausted8192output tokens on attempt49, ev-13-1, producing thinking text but no answer. Its fail-fast rule sent no further request; the remaining arms never started. The journal is tmp/codex/c1-capacity-extended-series.jsonl, and retained raw runs are instruments/harness-capacity/tmp/c1-capacity-extended/runs. See capacity.md for the terminal evidence. No restart or additional budget increase has been selected. Keep the frozen builds and evidence pending custody/reporting; daemon 11435 remains separate from the user's11434.

The evaluation research and user-requested adversarial round closed on 2026-10-14. Study's git history through `3b7d6f3` retains the article research, independent Opus proposal and review, authorized Fable synthesis, model custody and reconciliation under the historical `.orkestrel/study/` paths. The implemented portable contract is described in [Study's guide](../../../study/guides/study.md). This supersedes the earlier scaffold ownership proposal and bench umbrella name. Local model execution remains serial.

The original thinking series and both blind audits closed on 2026-10-14. Their generation, labeling, merges, and reports are finished. The prospective Study endurance successor is separate work. Its implementation and fixture repair are accepted after independent review and verification; capacity execution precedes any quality execution under [the frozen protocol](endurance.md). The package hardening remains accepted at `901c786`; the user's no-bump instruction remains in force.

## Results

The graded comparison and bounded capacity failures are in Agent's [RESULTS.md](../../RESULTS.md). The package implications and preservation proposal are in [direction.md](direction.md).

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
