# Measurement design

This file is the home of every unit's gate, every instrument, and every GPU step's cap and order. `designs/runs.md` owns how a GPU step runs; `tenets.md` § Evaluation owns the evaluation canon; `research/evidence.md` owns the readings.

## Cheap-first order

Every unit runs its acceptance in this order and stops at the first failure:

1. Format, lint, and typecheck on the changed scope.
2. The touched test file.
3. The project tests.
4. One mutation probe on the load-bearing line: disable it, watch the test fail, restore it.

Every medium unit then gets one independent review, per the size gate of `@orkestrel/scaffold` `.agents/orchestration.md` § Size gate.

## Probes

`rc-p1` writes throwaway TypeScript probes run by `node`, never committed. Each prints its control result and its coverage, and the report quotes the numbers.

| Probe | Reads | Control | Decides |
| --- | --- | --- | --- |
| (a) literal census | the public `studies/memory/sources/evaluation.json`, never the answer key (`tenets.md` § Evaluation); simulate folds at the Study `keep: 2` cut and report per fold the distinct ids and numbers in the slice, how many recur within the next 3 to 8 goals, and `estimateTokens` of the anchor line | a slice of known content with known recurrences reports its counts exactly | whether numbers join ids in rc-e1; rc-e1's L0 gate |
| (b) pair growth | a scripted conversation from the same arrivals with an inert data-stub judge; pair questions per correction at growing conversation lengths | a conversation with no correction counts 0 | rc-u6's default question and its test fixture |

Probe (c), the `encode` read for `Message.id`, is dropped: F3 settles it.

Readings (rc-p1, 2026-10-31, on `63e4bf81`'s source tree with rc-a14 in flight; both controls passed, and each probe's mutation failed a control and restored green):

- (a) The 96 goals of `studies/memory/scenarios/endurance.json` add 224 messages and fold twice under the `keep: 2` simulation, at `ev-09-1` and `ev-18-1`, in both fold modes (plain: 165 messages folded; rolling: 166). Per fold, the slice holds 133 and 138 distinct ids, of which 1 recurs within the next 3 goals and 3 and 1 within the next 8 (mean 1 and 2), and 88 and 78 distinct numbers (79 rolling), of which 1 recurs within 3 goals and 10 and 6 within 8. The anchor line of every slice id absent from the summary costs 374.5 tokens on average and 386 at most, 9.1% and 9.4% of the 4096-token recap allowance. Coverage: arrivals and prompts only, so the live arm, which also holds replies, tool messages, and lookup records, folds earlier and more often. Control 1 compares the scenario with the runtime corpus through `studies/memory/provenance/endurance.json` `substitutions`: the projection rewrites the lookup sentence of the 24 packet goals (`ev-NN-2`) to the single `lookup` tool, and all 24 request substitutions are used once.
- (b) After one correction naming `BC-7301`, the `study` variant (`STUDY_MEMORY_TOPICS`) asks one amends question per earlier message: 8, 16, 32, 64, and 128 at lengths 8 to 128, so the count grows linearly (16 times over 16 times the length). The `entities` variant (no topics; ids only) asks 6, 9, 9, 9, and 16. With no correction both variants ask 0.

## Bench

`rc-a3` benches per-request `select` CPU at 100, 200, 400, 800, and 1600 messages, with a scripted provider and a judge that is never reached, seeding long conversations through rc-u4's hydrate path.

- Control: a conversation with no correction-weighted message scales near-linearly.
- State the thresholds before the run and report host load beside the result.
- Gate for rc-a3b: the rc-a3 reading meets its threshold when `select` CPU at 1600 messages is at least 1000 ms, or at least 660 ms, 5% of the only measured model wall, the c1 4B mean agent-call wall of 13206 ms, rounded from 660.3 ms to the millisecond, because the scripted provider records no model wall (`research/evidence.md` § Prior-campaign readings, c1 costs; `plan.md` O48); rc-a9's 2B readings can re-read that wall. When the rc-a3 reading stays under its threshold, delete the bench and change nothing.
- The Orchestrator launches the timed run on a quiet host with no other process lane; the timed ledger sets `requested: false`, seeded with the Study topic unchanged, its low bias recorded beside the reading, with one correction per 16 messages (O48).

Reading (rc-a3, 2026-11-01, on `cc00800a`; seven measured samples after two warmups per arm and size, a 15 ms CPU quantum, a quiet baseline of 4.36% other load, and the timed run exiting 0 in 1576918 ms; `plan.md` § State, O51):

| Arm | Messages | Corrections | Judgments | Median CPU (ms) | Minimum CPU | Maximum CPU | Median wall (ms) | Other load |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| correction | 100 | 6 | 311 | 63 | 62 | 78 | 59.76 | 4.21% |
| correction | 200 | 12 | 985 | 312 | 297 | 375 | 306.97 | 1.30% |
| correction | 400 | 24 | 3406 | 2063 | 2000 | 2125 | 2002.70 | 1.26% |
| correction | 800 | 49 | 13056 | 15563 | 15327 | 15657 | 15405.27 | 1.29% |
| correction | 1600 | 99 | 51106 | 126047 | 125579 | 128110 | 125036.27 | 1.49% |
| control | 100 | 0 | 113 | 16 | 0 | 16 | 13.40 | 0.04% |
| control | 200 | 0 | 229 | 32 | 31 | 110 | 35.76 | 0.49% |
| control | 400 | 0 | 454 | 109 | 94 | 172 | 106.92 | 0.49% |
| control | 800 | 0 | 904 | 391 | 343 | 452 | 358.99 | 1.90% |
| control | 1600 | 0 | 1804 | 1359 | 1312 | 1422 | 1343.47 | 3.69% |

- Gate: the correction arm's median CPU at 1600 messages reads 126047 ms against 660 ms, so the reading meets its threshold; it is not marginal, because the minimum, 125579 ms, is over 660 ms, and not contested, because other load stays under the 10% bound.
- Slopes: the correction arm's CPU slope reads 2.742 from 100 to 1600 messages (wall 2.758) and 3.02 from 800 to 1600 from the medians; the control arm's CPU slope reads 1.820 from 400 to 1600, the fallback span because its median at 100 is under two quanta (wall 1.662 from 100 to 1600), over the instrument's 1.25 near-linear bound, so the control arm does not read near-linear. The control arm was not profiled; the code path that can carry its superlinear term is `Classifier`'s `assign` call for every message, each tool message rescanning the conversation through `Ledger#readLookups` (`designs/records.md` § CPU cost and memoization).
- Invariants: every sample, warmups included, asked the judge 0 times, emitted one `start`, one `select`, and no `fault`, filed every outcome from cache, and produced one selection digest per arm and size; the selection held 4 messages at every size; seeding CPU at 1600 messages read 183469 ms on the correction arm and 3844 ms on the control.
- Mutations: changing the timed judge's model failed exactly `never reaches the judge` and `files every sample from cache`, and seeding facts in place of corrections failed exactly `asks pairs only with corrections`; each mutated run exited 1 and each restored run 0, the restore proven by digest.
- Profile: one 800-message correction request, profiled with its seeding and hydrate, samples 37.5 s; read its shares, never its absolute figures, which hold seeding, hydrate, and profiler overhead, and read its frames by function name, because its line numbers are those of transformed code. `Classifier#gather` holds 30.9 s inclusive, its `#collectNear` 26.9 s, the Ledger `entities` callback 23.9 s, `Ledger#readLookups` 20.2 s, `collectToolGroups` 8.4 s, `extractLiterals` 6.4 s, `matchEntities` 5.7 s, `Ledger#assign` 5.4 s, `collectRegistry` 3.7 s, `quiet` 3.1 s, `structuredClone` 1.7 s, `isJudgment` 1.7 s on the hydrate path, and `Ledger#plan` 1.5 s; the `@orkestrel/contract` frames total about 1.5 s of self time, on the hydrate path. The pair loop of `Classifier#gather` carries the cubic term: it reads each earlier message's quiet flag and near set one time per correction, and each read rescans the conversation (O51).

## Method

Every gated bench reading from rc-a3b on follows this method; a brief that departs from it states the departure and its reason before the run. The user delegated the measurements on 2026-11-01, so the method and every threshold here are Orchestrator rulings (`plan.md` O53, O54), except TH-3's floor, which is the user's Q26 ruling. The ids MM, HP, and TH are fixed for the campaign.

### Host profile

The method-bearing readings of the measuring host, read on 2026-11-01 by the host survey and the measurement calibration (`plan.md` O53); the commit that records O53 carries the survey's processor, power plan, GPU, memory, and toolchain readings in its message, and `package.json` holds the installed versions. A slot on another host reads its own profile before its first cell, and its readings never mix with these.

| Fact | Reading |
| --- | --- |
| Logical processors | 16, on 8 cores, so one busy logical processor reads 6.25% of other load (HP-3, HP-4) |
| Clock ramp from idle | about 33% of steady work in the first 25 ms window, steady after about 75 to 100 ms (one run) |
| CPU timer | `process.cpuUsage` steps 15 to 16 ms, median 16 ms over 200 steps |
| Wall timer | `performance.now` steps 0.1 to 1.2 µs, median 0.2 µs; `process.hrtime.bigint` steps 0.1 µs |
| Within-process wall noise, MAD-based | 0.31% to 1.77% across rc-a3's ten cells, 1.77% at the 13 ms control cell |
| Within-process CPU noise, MAD-based | 11.8% at 391 ms, 3.4% at 1359 ms, 0.55% at 126 s |
| Between-process wall spread | three processes of a 22 ms reference kernel: medians 22.43, 22.56, and 22.78 ms, wall CV 1.05% to 2.38% per process |
| Forced garbage collection | raised the spread of the 22 ms kernel (MAD 0.72 ms against 0.14 to 0.21 ms) and moved an allocation-heavy workload's median by 48% |
| Other load | rc-a3's quiet baseline 4.36%, per cell 0.04% to 4.21%; about 7.1% with orchestration lanes active |
| GPU memory in use | 0 MiB with no model loaded, the baseline of HP-2's bound |

### Budgets

Each threshold maps to one of these budgets.

| Budget | Value | Applies to |
| --- | --- | --- |
| Server overhead floor | at most 5% of the subject model's mean agent-call wall: 660 ms at 4B (the c1 mean of 13206 ms); the 2B wall is rc-a9's to read | serial work before the model call: `select`, and hydrate per request |
| Long task | 50 ms per main-thread task | synchronous work in a page |
| Device factor | a `src/core` path that can run in a page reads the page budget divided by 4, so 50 ms becomes 12.5 ms on this host; the factor is Lighthouse's documented 4x default mobile CPU slowdown, the recorded source (`plan.md` O55) | every `src/core` path that can run in a page |
| Frame | 16.7 ms at 60 Hz | streaming and per-delta work in a page |
| Smallest gain worth having | 16 ms on a server path; about 4 ms on a page path after the device factor | the absolute floor beside a relative gain |

### Instrument

- MM-1. Gate on the wall time of the timed region: `performance.now()` at the region's start mark and end mark (rc-a3's marks: the `start` event to the first `select` event). Report `process.cpuUsage()` user plus system over the same region beside it only where a cell's median is at least 500 ms, because the CPU timer's quantum is 16 ms. Under Vitest's `threads` pool the CPU reading is process-wide, the runner's main thread and V8's helper threads included. Apply the preemption flag (wall over CPU above 1.10 reruns the cell one time) only to cells whose CPU median is at least 1600 ms; under that, HP-4 and MM-8 detect interference.
- MM-2. Read the region marks the bench records itself, never tinybench's own timing, which covers the whole callback; report tinybench's mean and relative margin of error and never gate on them. A bench is a `*.bench.ts` file under the `probe (bench)` project, run through `npm run test:bench` (`@orkestrel/scaffold` `.claude/rules/tests.md` § Probes, cited until `@orkestrel/scaffold` 0.0.123 carries the amended bench text; `plan.md` O54). Set tinybench to `time: 0`, `iterations: n`, and `warmup: false`, run MM-7's warmups in the bench, and check tinybench's loop condition on that pair before the brief fixes it.
- MM-3. When a region's median wall is under 10 ms, time K back-to-back calls as one reading, with K times the median at least 100 ms, and divide. A page reading holds at least 10 ms of work, because a page's `performance.now` steps 100 µs without cross-origin isolation.

### Isolation and order

- MM-4. Run one process per cell, a cell being one build, arm, and size: the runner, a TypeScript script launched through the dispatch skill's launcher, starts one Vitest invocation per cell, selected by test name. rc-a3 ran its ten cells in one process; its readings stay valid as the baseline.
- MM-5. Seed once and hydrate per process: build each seed one time per lineage with the before build, write its snapshot under the unit's folder in the probe directory, and hydrate it in every process of both builds. Both builds produce the same selection digest from it before any timing counts; that check is also the replay check.
- MM-6. Interleave builds in one slot: with m processes per build, alternate them (A B B A at m = 2, A B B A A B at m = 3), so drift across the slot lands on both builds. A ratio gate reads its before build in the gating slot beside the after build; a before reading taken in an earlier slot is a trigger reading, a cross-check, or a sensitivity control, never the denominator of a ratio gate. At the gating slot's start, the Orchestrator copies the checkout's source and tests into the unit's folder in the probe directory three times: `after/`, the working tree; `before/`, the same copy with every `src/` file the unit changed read from the unit's launch commit and every `src/` file it added left out; and `replica/`, a second copy of `before/` at a separate path for MM-13's A/A. A live neighbour's edits therefore sit identically in every build. Every live writer pauses at a green phase boundary for the length of the slot, leaving `src/core`, `tests`, and `guides` untouched, so no copy holds a half-written file; the Orchestrator records a `git hash-object` digest of each live writer's diff at slot start and end, and a slot whose digest changes is void and reruns (`plan.md` O54, O55); each copy resolves the checkout's installed dependencies; the slot record names each tree's digest; and the unit's brief settles how the runner points the bench project at each copy and checks it in the before slot.

### Warmup, garbage collection, samples

- MM-7. Warm up in each process until at least 1 s of cumulative region time and at least 2 iterations have passed, capped at 30; a cell of 1 s or more keeps rc-a3's 2 warmups. The quiet-baseline wait runs before the warmups, never between the warmups and the samples, because the clock falls to about 975 MHz at idle.
- MM-8. Never force garbage collection, in any arm. Report each cell's maximum over its median; a cell with more than 15% of its samples over 1.25 times its median reruns one time.
- MM-9. Choose m processes per build and n samples per process from § Detectability so the threshold is at least the smallest readable difference there; n is at least 7. A cell over 60 s per sample that sits more than 10 times from its threshold can drop to n = 3 with 1 warmup. Every ratio gate at or under 1.10 runs at least 2 processes per build, interleaved A B B A, and every 1.05 gate at least 3, interleaved A B B A A B.

### Statistic and verdict

- MM-10. Use medians, never the mean and standard deviation: per process the median, minimum, maximum, and c = 1.4826 × MAD / median; per cell the median of the process medians.
- MM-11. Report a comparison as the ratio of cell medians with its 95% interval: at 6 or more processes per build, a seeded bootstrap of 10000 resamples over processes and then samples within each process; at 2 to 5, a t interval on process medians with 2m − 2 degrees of freedom; at 1, the interval holds within-process noise only, so a gate read at one process per build sits at least 3 times the one-process readable difference from its threshold. Fit a slope as ln(wall) on ln(size) over the stated sizes; a slope from single-process cells has a standard error of about 0.022 at n = 7 and 0.019 at n = 15, so a slope reading is decisive at least 0.065 from its threshold and `marginal` nearer.
- MM-12. Read one of four verdicts. `meets`: the interval's unfavorable end clears the threshold. `marginal`: the point clears and the interval straddles it; rerun with m doubled, and a second `marginal` reads as not shown, so a speed change reverts. `misses`: the point does not clear. `contested`: a cell broke HP-4 twice; no verdict. A slot whose A/A trips MM-13 reads `unreadable`, apart from every verdict.

### Controls

- MM-13. Run one A/A pair in every comparison slot: the same build in two process sets at separate paths, interleaved like the real comparison. Its point sits within 2 to 2.5 times the measured c_diff and its interval includes 1. An A/A whose spread puts 3 times c_diff over the threshold makes the slot `unreadable`; the observed spread re-derives c_b for the slot, and m rises when it reads over the table's c_b.
- MM-14. Prove the bench can fail before trusting a pass. Where the before build reads `misses` on the metric a gate or trigger reads (rc-a3b's slope gate; rc-u21's case A slope, which TH-4's trigger reads), that reading is the control. Otherwise inject a busy wait of the threshold plus 3 times c_diff into the timed region and require `meets` as a change, and one of the threshold itself and require at least `marginal`. Every 1.05 non-regression gate gets its own injected arm, about 7.3% at m = 3.
- MM-15. Keep the mutation probe on the load-bearing line of § Cheap-first order; a bench never replaces it.

### Report

- MM-16. Write one record per slot, never committed: HEAD and the build label per arm; Node and V8 versions; the power plan's identifier; each HP reading; per cell the raw wall and CPU samples, warmups, median, minimum, maximum, c, CPU over wall, and other load; per comparison the ratio, its interval, and its verdict; the A/A and sensitivity results; the slot's start and end times. Carry the readings into the acceptance commit and this file.

### Host preconditions

Check each item at slot start, at slot end, and where the row says, per cell; record each reading in the slot record. A failed item postpones the slot.

| Id | Check | Bound |
| --- | --- | --- |
| HP-1 | One process lane: the timing runner only; writers pause every command, their owned-file checks included, for the slot | no `node`, `npm`, `tsc`, `vitest`, or `oxlint` process outside the runner's tree with a CPU-time delta over 100 ms across the slot, matched by command line in the process list at slot start and end, except recorded background; before the first slot, with no lane running, the Orchestrator reads every such process present, names each by its command line in the slot record as recorded background (a registered MCP server or a lane's harness, for example), and bounds each by its own CPU-time delta across the slot at 0.5% of one logical processor; the IDE stays closed (closed on 2026-11-01 on the user's approval), and the IDE's background daemon, which still runs, and the network service are recorded as known background under the same bound; a process not recorded at the first slot meets the 100 ms bound; a slot whose A/A or MM-8 rule trips reruns |
| HP-2 | No GPU or model work, read at slot start, at slot end, and per cell; never run the `ollama` CLI, `ollama --version` included, and never contact port 11434 or 11435 | GPU memory in use at or under 100 MiB from `nvidia-smi`; the `ollama` process count at the daemon plus its tray |
| HP-3 | Quiet baseline: other load over a 10 s wait before the first cell, computed as rc-a3 computes it, the host's CPU times minus the runner's own over 16 logical processors | at most 6.25%, aiming for 3%; on a miss, wait 60 s and read one more time |
| HP-4 | Per-cell other load over the measured samples | at most 10%, aiming for 3%; a cell over it reruns one time, and a second miss reads `contested`. One busy logical processor on the bench core's sibling reads 6.25% and can cost the region 10% to 30%, so the A/A and MM-8 back this bound |
| HP-5 | Power plan, recorded by its identifier | one identifier for every cell of a comparison; Balanced, the user's setting, is kept |
| HP-6 | Reference kernel: a fixed in-process spin-and-sort of about 200 ms | the median at slot end within 3% of the median at slot start, a ratio of at least 0.98 when the kernel runs around every cell |
| HP-7 | Node and flags | the newest Node 22 release at the slot's start, one binary for every arm; `OLLAMA_HOST=http://127.0.0.1:1` set as its own statement; identical V8 flags across arms, `--max-old-space-size` unset; no `--inspect`, `--cpu-prof`, or `--expose-gc` in a timed run, and a profile runs in its own slot and never gates by its absolute figures |
| HP-8 | Free physical memory | at least 8 GiB |

### Detectability

The noise of a before and after comparison with m processes per build and n samples per process is c_diff = sqrt(2 × (c_b² / m + 1.57 × c_w² / (m × n))), where 1.57 is the variance cost of a median against a mean; this is a derivation, not a cited formula. c_w = 1.5% is the within-process wall noise the measurement plan read as the worst of rc-a3's cells; the consultation's recomputation reads 1.77% at the 13 ms control cell, which MM-3's repetition covers. c_b = 0.8% is provisional: it comes from three processes of the 22 ms reference kernel, its 95% interval runs from about 0.42% to 5.0%, and it says nothing yet of a process holding a 51106-judgment heap.

| m | n | t(0.975, 2m − 2) | Smallest readable difference, provisional |
| --- | --- | --- | --- |
| 1 | 7 | none; 3 × c_diff | 4.5% |
| 1 | 15 | none; 3 × c_diff | 4.0% |
| 2 | 15 | 4.30 | 4.0% |
| 3 | 15 | 2.78 | 2.3% |
| 4 | 15 | 2.45 | 2.0% |

- A threshold is readable when it is at least the larger of 3 and t(0.975, 2m − 2) times c_diff, because MM-11 reads 2 to 5 processes per build with a t interval on process medians; at m = 2 that multiple is 4.30, which leaves a 1.05 gate about 1% of margin at c_b = 0.8%, so every 1.05 gate runs at m of at least 3 (MM-9). A true effect needs about the threshold plus (t + 0.84) times c_diff to read `meets` at 80% power, so at m = 3 TH-6's 3% accepts only an observed drop of about 6%.
- The A/A pilot fixes c_b, and this table is rewritten from it, before any gate at or under 5% is set (`plan.md` O54): at least 6 processes of the before build over the control `select` at 1600 messages, read first in rc-a3b's before slot, before rc-a3b's 1.05 control gate sets its m. rc-u19 reuses that c_b, and reads its own A/A on the correction `select` at 1600 messages of rc-a3b's committed build before its 3% gate sets its m only when rc-a3b's pilot is older than one slot (`plan.md` O55). rc-u21's case B and rc-u20's control-seed hydrate time workloads the pilot does not run, so their 1.05 gates read c_b from their own slot's A/A under MM-13, a stated departure from a pilot before the gate.
- A CPU reading carries up to 15.6 ms of quantization error: 1% at 1.56 s, 4% at 391 ms, and more than 100% at 13 ms.

### Thresholds

Each threshold is fixed in its unit's brief before the before run; a reading that does not clear it reverts the change.

- TH-1. rc-a3: closed. `select` CPU at 1600 messages of at least 1000 ms or 660 ms; met on `cc00800a` at 126047 ms CPU and 125036 ms wall (§ Bench).
- TH-2. rc-a3b (Q23, `plan.md` O54): on its committed bench, in wall time with CPU beside, the correction arm's slope from 800 to 1600 messages at most 2.0, its marginal rule stated before the before run; replay byte-identical, with MM-5's digest check; and the after build's control arm at 1600 messages at most 1.05 times the before build's, at 3 processes or more per build interleaved in the gating slot (MM-6, MM-9), with its own injected arm. Samples: the before slot runs the A/A pilot of § Detectability first, then reads the before build's correction arm at 800 messages, n = 7 with 2 warmups, and at 1600 messages, n = 3 with 1 warmup under MM-9, because that cell takes about 125 s per sample and its slope, 3.02 in wall time on rc-a3, sits 1.02 from the 2.0 bound, more than 10 times MM-11's decisive distance of 0.065; the gating slot reads the after build's correction arm at 800 and 1600 messages and both builds' control arm at 1600, n = 15. The before build's slope is the slope gate's sensitivity control. The before slot also cross-checks the committed bench against rc-a3: the before build's correction-arm wall medians at 800 and 1600 messages each read within 10% of rc-a3's (15405 ms and 125036 ms), a bound that covers the move from one process for every cell to one process per cell; on a miss, rc-a3's throwaways stay, the before slot's readings serve no gate, and the Orchestrator rules on the two instruments before rc-a3b's after run. Q23's 2x correction-to-control bar at 1600 messages is read after rc-u19 lands, or right after rc-a3b when TH-6 cancels rc-u19, and a miss after both feeds TH-3.
- TH-3. The absolute floor (Q26), read by rc-a18 in its own timed slot in S4, never from a profile: the control arm's `select` CPU at 1600 messages at most 660 ms and its slope from 800 to 1600 messages at most 1.25, as the user ruled, with wall time beside; reading CPU where MM-1 makes wall primary is a stated departure, because the user ruled the metric. On `cc00800a` the control arm reads 1359 ms CPU (1343 ms wall) at 1600 messages and a wall slope of 1.90 from 800 to 1600, so both bounds miss on that commit. A missed floor opens at most one bounded ledger unit (Q26), whose scope the control arm's profile shares can revise (`plan.md` O55). After rc-a9, the Orchestrator reads the control arm's `select` on rc-a3b's committed bench at the realistic size rc-a9's report names (messages and judgments at the furthest stratum of the records arm) in one timed slot, reports it beside a share of the 2B time to first token rc-a9 reads, and brings to the user the proposal to gate the floor there, because it changes Q26's basis; neither reading gates before the user rules.
- TH-4. rc-u21: wall time only. The repair is written only when case A or C at 20000 deltas costs at least 12.5 ms, the page budget over the device factor, or case A's slope over 5000, 10000, and 20000 deltas is at least 1.5 with at least 4 ms at 20000, the smallest gain worth having on a page path (§ Budgets), so the slope clause fires on growth before the total reaches 12.5 ms. It is kept only when case B after reads within 1.05 times case B before, at 3 processes or more per build interleaved in the gating slot (MM-6, MM-9), with stream behavior unchanged. The largest single append at 20000 deltas is reported beside the total.
- TH-5. rc-u20: hydrate wall of the 1600-message correction seed (51106 judgments) drops at least 25% and at least 250 ms, at m = 1 and n = 7; the 1804-judgment control seed's hydrate reads at most 1.05 times before, at 3 processes or more per build, beside it; both builds read interleaved in the gating slot (MM-6). Each upstream guard site joins only on its own reading, timed with MM-3: `isMemo` when `isMemoSnapshot` at 1000 memos costs at least 12.5 ms, and `isSection` when `isConversationSnapshot` at 500 sections costs at least 12.5 ms, each with the retained guard at least 5 times cheaper per call; `isAuthorityDecision` has no reading here (`plan.md` O52, D73).
- TH-6. rc-u19: in wall time, on the frozen rc-a3 seed for both builds, the correction arm's `select` at 1600 messages drops at least 3% and at least 16 ms, with m fixed from the c_b of § Detectability and capped at 6, both builds interleaved in the gating slot (MM-6), and the A/A bound at 2.5 times c_diff (`plan.md` O55); a `judgment(id)` read at 51106 judgments, timed with MM-3, is at least 2 times faster; replay byte-identical. Pre-registered cancel: when rc-a3b's after-run correction arm reads under about 530 ms, 3% falls under 16 ms and rc-u19 is not built.
- TH-7. rc-ct1: `arrayOf(isString)` over 10000 elements and `recordOf` over 1000 keys each drop at least 20%; each tinybench task runs at least 1 s per process, at m of at least 2 interleaved (the rc-ct1 brief fixes m = 4 on the two gated cases, A B B A A B B A, and m = 2 on the reported ones), against the HEAD build copied into the contract checkout's probe directory, with an A/A built from a second copy of that build at a separate path, within the smaller of 2.5 times the measured c_diff and 3% and read `unreadable` beyond it; the threshold injection passes when its interval contains 0.80; the small-fixture pool slowing by more than 5%, a point estimate at m of at least 2, is a miss; read the raw sample medians, never tinybench's mean; a miss reverts the helper and the call-site swaps and keeps the polluted-prototype pin cases and the bench as coverage (`plan.md` O55).
- TH-8. rc-a18 (`plan.md` O52, O55): one CPU profile in its own slot at a 100 µs interval with at least 10000 samples in the region, read for inclusive shares only, its absolute figures never gating; D67 opens at 10% of `select` on the correction arm; I4 opens when the view and messages copies reach 0.1% of the projected run wall, the run's wall plus turns times the 13206 ms model wall; I5 opens at 12.5 ms of pre-dispatch work per turn, with the 132 ms figure reported beside it; U2 opens at 12.5 ms at the realistic request size or a slope over request size above 1.15; the floor is TH-3.

## Instruments

`rc-a8` builds four instruments in `studies/memory`, each serving a unit the campaign builds. An instrument that serves a stripped experiment leaves with it.

| Instrument | Measures | Negative control | Limit |
| --- | --- | --- | --- |
| literal retention | ids from pre-boundary history that recur in the next 3 to 8 requests and are present in the post-fold view | the same transcripts with the extractor removed score lower | speaks to retention, not continuation (C02) |
| carriage | the referenced prior product's literals present in the built prompt | a seed-only tail scores lower | retention, not use (C16) |
| cache share | `cached / prompt` per request from the Ollama counts | a random string at the start of the system text drives the share toward 0 | cannot say why a prefix changed; wall time is never a cache reading |
| re-acquisition | recall and lookup calls per goal, apart from other calls | rc-a8's brief names a control that must fail before the instrument is accepted | environment-dependent (C06) |

- Before building, rc-a8 maps each instrument to `@orkestrel/study` and builds in `studies/memory` only what Study does not own.
- The rule-retention instrument joins rc-a8 when rc-e1 promotes or a unit's gate names it (D3); stage attribution joins only when a unit's gate names it.

## Models

The user builds Agent for the smallest local models, because they are the most sensitive to these changes: a larger model works around a flaw that a small model exposes (Q5). A change that only a larger model tolerates fails its gate.

- Subject: Qwen 3.5 2B `q4_K_M`, the smallest model with prior readings, and the model whose plain loop repeated one lookup to the step cap (`research/evidence.md` § Prior-campaign readings, repeat loops). rc-s1 adds a `q2` profile beside `studies/memory/profiles/q4.json` that pins its digest.
- Records judge: Mica v0.1 4B, as in the `q4` profile. The judge is the records strategy's classifier, not the subject; changing it opens a separate axis.
- Larger-model check: an experiment that promotes on the subject runs one off and on pair at its deciding stratum on Qwen 3.5 4B, the `q4` profile, and is non-inferior there.
- Sampling: every role sends the pinned effective values; a value change is D38 (O13; `designs/layout.md` § Sampling).
- No hosted provider runs in this campaign (Q5).

## GPU allowance

The allowance is 600 model minutes: the summed Ollama `total_duration` of every agent and judge call (O9). The basis is the c1 cost at 4B, 109 records minutes and 53 compaction minutes over 96 goals (`research/evidence.md` § Prior-campaign readings, c1 costs), with the judge live on one daemon pin within a screen until rc-st2 serves judge requests by key (`designs/runs.md` § Replay and pins). The split follows O17: rc-a6's 90 minutes fund rc-a16, rc-a10 for rc-u10, and its contingency; rc-a15's 10 come from the larger-model checks.

| Step | Cap in model minutes | Work |
| --- | --- | --- |
| rc-a9 probes | 10 | co-residency, skill load, render M3, sampling M1 and M2; rc-p4 at 3 only when the user grants Q10 |
| rc-a9 recording | 60 | goals 1 to 24, both arms, one arm per segment |
| rc-a15 | 10 | denial-note arms and the marker probe |
| rc-a16 | 15 | single-request layout arms |
| rc-a10 for rc-e1 | 30 | 8 goals, arms off, repeat, and on |
| rc-a10 for rc-u10 | 45 | 24 goals, arms `system`, `repeat`, `sham`, and `on`, judge live on one pin until rc-st2 |
| rc-a10 contingency `separate` | 30 | only on a failed rc-u10 gate |
| recording extension | 100 | goals 25 to 49 on both arms, 50 to 77 on the records arm, seeded after goal 24 |
| rc-a10 for rc-a7 | 60 | 16 goals from goal 38, seeded after goal 37, four arms, judge live on one pin until rc-st2 |
| rc-a10 for rc-a11 | 100 | four arms at bursts 49 and 77, live judge |
| rc-a5 | 40 | late strata, compaction arm |
| larger-model checks | 100 | one off and on pair per promoted experiment |

- Each step writes its cap into its run record before it starts, enforces it by projection before each segment launches, and reports its spend beside its result (O19; `designs/runs.md` § Segment plan holds each step's segments and seeds).
- A screen whose projection exceeds its cap with a live judge follows O25 (`designs/runs.md` § Segment plan); the contingency and larger-model rows top up no screen.
- An unspent cap carries to no other step, the contingency's included.
- A request or micro rung of a fix draws on the cap of the step whose segment surfaced the failure. It is projected before launch like a segment and runs one arm per execution. Its reading is written before launch (micro: the failing class's per-goal count on `on` against `off`). It generates no input: it selects its trial, goals, and seed by flags from a closure frozen with the fix (O30). When that step's remaining cap cannot fund the rung, the rung waits for the step's screen (`designs/runs.md` § Fixes while a step runs).
- A cap stop is a budget stop, never a quality verdict (`tenets.md` § Scope).
- When the total reaches 600 model minutes, GPU work stops and the campaign reports (O5).

## Recording

`rc-a9` is a GPU run by the Orchestrator under `tenets.md` § Host, inside § GPU allowance. `designs/runs.md` owns how it runs: one arm per sealed segment from a frozen closure (§ Run shape there), its segments (§ Segment plan), what its first segments measure (§ First readings), its progress readings, and its stops.

1. rc-a15 runs first under its own cap; then the single-request probes run inside the rc-a9 probe cap:
   - Co-residency: one agent request, one judge call, a second agent request; read whether the agent's cache survives.
   - Skill load: two requests around one `skill:<name>` instruction add; read `cached` on each.
   - Render M3: `[system, A, B]` against `[system, A + '\n\n' + B]` at `num_predict` 1, each behind a unique random system prefix; read the `prompt_eval_count` delta. A delta at or under 0 stops the recording and opens D34.
   - Sampling M1 and M2: three desk requests under arms `omitted`, `pinned`, and `zero`. M1 reads `omitted` against `pinned`; a difference stops the recording until the Orchestrator rules the value. M2 reads `pinned` against `zero` and reports whether the penalty acts at `temperature` 0 (D38).
   - F3 removed the system-id probe; the late-`system` template probe is retired with rc-a6.
2. Records and compaction arms of the endurance workload record goals 1 to 24, one arm per segment, with request-body recording on and an end-of-goal checkpoint after every goal (rc-a17).
3. For rc-a7 and rc-a11, the recording extends to goal 49 on both arms and to goal 77 on the records arm, seeded after goal 24 with no goal re-run.

Every GPU step writes a run record before it starts, under `tmp/studies/runs/<step>/` (`designs/runs.md` § Progress), holding the daemon version, `/api/show` `parameters` and `details` per digest, each role's `options` as sent, `think`, the Node runtime, the closure fingerprint, the seed's result and seal, each segment's projection and `record` allowances, the step's cap, and the probe verdicts (`designs/layout.md` § Sampling).

Acceptance: every segment seals; the checkpoints validate; rc-a17's seed test runs over each sealed segment, and a session seeded after goal k builds goal k+1's first request byte-identical to the recorded request on non-maintenance requests; every probe answered; the run record holds its fields; the report names the furthest goal each arm reached, the message and judgment counts the records arm holds at its furthest stratum, and a 2B time to first token read from the recorded agent responses, which TH-3's later reading uses.

Inputs: rc-a9 and the extension generate no input; each segment selects its trial, goals, and seed by `--trial`, `--goals`, and `--seed` from the closure its lineage froze for its arm's profile, and its results, closures, and run records stay under `tmp/studies/`, never committed (O26, O30; `designs/runs.md` § Run shape).

## Screens

`rc-a10` screens each unit under test on the rc-a9 recording. `designs/runs.md` owns how a screen runs: its segments and arm order (§ Segment plan), its stops and curtailment (§ Stops), the fixes checked while it runs, and its judge and pins (§ Replay and pins).

- Seed each screen from end-of-goal checkpoints where `designs/runs.md` § Segment plan names: rc-u10 from goal 1, rc-e1 after the goal before the first fold, rc-a7 after goal 37, rc-a11 after goals 48 and 76, rc-a5 after goal 48; the readings fall at the onset and burst strata 17, 49, and 77.
- Run arms off, repeat, sham, and on, one execution per arm per segment, in the order `designs/runs.md` § Segment plan names.
- Offer no tools on the final step, the repair the prior R2 screen needed (`152ac3c3:.orkestrel/agent/r2-u43-u44-ruling.md`).
- Run the judge live on one daemon pin within a screen until rc-st2 serves judge requests by key (`designs/runs.md` § Replay and pins).
- Noise N = 2·max(r, s), with r = |off-repeat − off| and s = |sham − off| (`152ac3c3:.orkestrel/agent/plan.md` § Levels and gates, row Noise `N`). r and s come from the repeat and sham arms of the first screen; nothing promotes before they exist.
- No experiment promotes on mechanical metrics alone: mechanical scores do not track semantic labels (`research/evidence.md` § Prior-campaign readings, mechanical against semantic). Cache share or retention never promotes by itself.
- Each experiment's off arm runs on 0.0.34 and doubles as the endurance baseline for the 0.0.32 ledger fixes over the goals it runs (D19).
- The screen of rc-u10 reads a fix, not an experiment: its comparison arm is `system`, a Study transport rewrite deleted after the screen, and no switch exists to revert (O12; `designs/layout.md` § Layout readings).

## Gates

| Unit | Cheapest discriminating check | GPU | Promotion gate | Removal |
| --- | --- | --- | --- | --- |
| rc-u1 | a summarizer returning `'  \n'` rejects with `'SUMMARY'` and the slice stays live with sections unchanged; a blank merge leaves the appended section and rejects; under `strict: false` the automatic path emits `fault` and dispatches over the window, under `strict: true` it settles as an error; mutation on the blank check | none | fix | none |
| rc-a14 | Stage A (`ask`): a `prove` breaking edit, where a rule literal carrying `allowed` fails typecheck; `Authority` tests (a matched rule with no `verdict` allows, first match wins, the default fallback is `{ zone: 'default', verdict: 'allow' }`, `ask` returns the handler's boolean for sync and async handlers and rejects with the coded error when no handler is set); `isAuthorityDecision` total over `{ allowed }`, an unknown verdict, a throwing getter, and a `Proxy`; orderings 1 to 9 of `designs/authority.md` § Orderings with a scripted provider, recorders, real `AbortController` instances, and `Promise.withResolvers`, no fake clock; byte assertions per note, the `deny` event carrying `errorToMessage` while the message carries the note, and a name with a quote and an over-long name encoded and capped; one `allow` or `deny` per admitted call in call order, `ask` first for an asked call, and a throwing `ask` listener routed to the emitter's `error` handler while the run continues; a denial-loop fixture where a scripted provider repeats a denied call, the turn count equals `limit`, and `exhausted` is true; five mutations, each failing its own test: drop the race (ordering 1), drop the failure arm (2), move the ask pass after the guard (3), drop the order rebuild (5), test `!== 'deny'` instead of `=== 'allow'` (6). Stage B (floor): a `resolveDecision` table (allow to ask, deny stays, ask stays, an unannotated tool untouched); a CPU injection fixture where an `untrusted` `read` returns text instructing `write` and the script calls `write` annotated `consequential`: the write recorder counts 0 with no handler (the model reads the `unanswered` note), 1 approving, and 0 refusing; control: with the annotation removed, `write` runs one time; with no `authority`, an unannotated tool runs and `allow` carries zone `default`; a mutation on the raise line fails the fixture. Then `test:studies` green (the admission scenario still records `Declared workload tool admission refused`; scenarios for approve, refuse, abort while pending, and a `consequential` `write` with no handler); `test:guides` green; `scaffold surface` reports `AuthorityVerdict`, `AuthorityHandler`, `AuthorityNote`, `AUTHORITY_NOTES`, and `isAuthorityDecision` free. A Stage A failure stops the unit, and Stage B dispatches apart | rc-a15 reads the notes | fix and capability | none |
| rc-u2 | briefing bytes identical on a fixture before and after; a search for the old names returns nothing | none | fix | none |
| rc-u5 | an owner record over its line cap fails on 0.0.34, then keeps its most recent lines, and a correction line outlives an older fact | none | fix | none |
| rc-u10 | the canary of `designs/layout.md` § Canary fails first on the unchanged tree, then passes; a `prove` breaking edit, where a `Selection` literal with `briefing` fails typecheck; `build` returns `[system, context (user), …tail]`, no text file gives no context message, images land on the last tail `user` message, a tail with no `user` message leaves the context message without images, and empty inputs return the tail alone; the request copy is `${records}\n\n## Request\n${content}`, the prompt verbatim when nothing renders, the stored request unchanged after `respond`, the answer pass carries the same copy and drops `tool` and call messages, the shown stub reads `: result shown under Records below`, and every other selection byte equals 0.0.34's on a fixture; trim prices the system text, the tail, and the request copy, and a mutation that prices the stored request lets a fixture over the cap pass; hand-written recorded bytes per arm (plain, records first, late request, answer pass), with compaction bytes equal to 0.0.34's; a mutation that pushes the records back into the `system` parts fails the canary; `test:guides` and `test:studies` green; no `Pinned` and no `briefing` member in `src`, `tests`, or `guides` | rc-a16; rc-a10 for rc-u10 | fix; its cost is read, never a veto (O12) | none |
| rc-u4 | a ledger hydrated at request k produces byte-identical selection messages for request k+1 against the uninterrupted ledger, with a scripted provider and preloaded judgments; control: the same with `failures` emptied differs | none | capability | none |
| rc-u6 | pair questions at most `2 × limit` on the rc-p1 (b) fixture; `limit` at or over the eligible count gives identical classification | none | capability | none |
| rc-u7, rc-u8, rc-u9 | manager tests (revision, unchanged no-op, `remove` forgets, snapshot round trip, events with a throwing listener routed to `error`, format cascade); total guards with malformed-input tests; one store contract test over both stores; head order test: the skills index in `system`, the memos index then the workspace text in the context message; head pricing with an instruction long enough to push the head past the cap when only `system` and the records are priced stays under the cap, and a reverted-pricing control exceeds it; the calibration pass sends the same head; the canary's memo and skill sentinels land as `designs/layout.md` § Canary states | none | capability | none |
| rc-a3 | `select` CPU at 100 to 1600 messages; control: no corrections scales near-linearly | none | rc-a3b runs only when the rc-a3 reading meets its threshold: `select` CPU at 1600 messages of at least 1000 ms, or at least 660 ms (§ Bench; O48); met 2026-11-01 on `cc00800a`, 126047 ms at 1600 messages (§ Bench, Reading) | the Orchestrator recycles the bench and its profile throwaways after rc-a3b's before run cross-checks the committed bench against it at 800 and 1600 messages within TH-2's 10% bound, and keeps them on a miss (O54) |
| rc-a3b | a read-once case in `Classifier.test.ts` (each message's `entities` and `assign` reads counted per `classify` call), a contract the `ClassifierOptions` remark states, and a replay case in `Ledger.test.ts` (asks, their order, and recorded judgments identical, and the selection identical between a ledger and its hydrated copy); the committed `tests/src/core/ledgers/Ledger.bench.ts` under `probe (bench)`, a copy of rc-a3's instrument (`select` wall from the `start` event to the first `select` event, CPU beside it) with correction arms at 800 and 1600 messages and control arms at 800 and 1600, read under § Method; mutations on the memo, its key, and its lifetime, the lifetime mutation proving the memo lives for one `#gather` call; a cost-only bench run in place of mutations for the alias index and the two hoists (O48, O51, O54) | none | § Method, TH-2: the correction arm's slope from 800 to 1600 messages at most 2.0, rc-u4 replay byte-identical, and the control arm at 1600 messages at most 1.05 times the before build's, read beside it in the gating slot; Q23's 2x bar is read after rc-u19 lands, or right after rc-a3b when rc-u19 is not built (Q23, O54) | revert |
| rc-u21 | `Channel.test.ts` cases for exactly-once delivery across readers, buffered values before close or fail, and `return()` while parked; the added `tests/src/core/agents/Channel.bench.ts`, cases A, B, and C and a `generate()` sample, read before any repair (O52) | none | § Method, TH-4 | revert |
| rc-u20 | the existing validator cases unchanged; the added `tests/src/core/conversations/validators.bench.ts` (hydrate of the correction and control seeds and the section timings) and `tests/src/core/contexts/validators.bench.ts` (the memo timings), read before any hoist (O52) | none | § Method, TH-5 | revert |
| rc-u19 | a nested `Reflect.set` on `question` or `sources` refused with the stored record unchanged; a mutation on the deep freeze; the c_b of § Method, Detectability, then rc-a3b's committed bench on the frozen rc-a3 seed (O52, O54, O55) | none | § Method, TH-6; not built under TH-6's cancel | revert |
| rc-ct1 | the contract checkout's polluted-prototype cases unchanged against the helper; its added `tests/src/core/combinators.bench.ts`, read before the helper is written (O52) | none | § Method, TH-7 | revert; no release |
| rc-a18 | one CPU profile of a 10-turn scripted-provider run at 1600 messages, read for inclusive shares only, and a separate timed slot for the floor (O52) | none | § Method, TH-3 and TH-8 | delete the probes |
| rc-a15 | rc-a14's byte assertions, and rc-u16's for the `SCOPE_NOTE` and `AUTHORITY_NOTES.refused` texts (O48), freeze the notes | single requests over paired seeds, arms `off`, `repeat`, `bare`, `denied`, `refused`, `unanswered`, and `scope`, which is mandatory; `refused` and `scope` read the rc-u16 wording, and the `scope` arm's request advertises only `read` (`designs/authority.md` § Denial-text reading; O48) | each note's re-call and completion-claim counts reach at most `off` plus N, with N = 2·\|repeat − off\|; a lower `prompt_eval_count` on the marker arm reopens D22 | a failing note's constant reverts to the 0.0.34 wording in one edit, except that a failing `scope` or `refused` arm reverts `SCOPE_NOTE` or `AUTHORITY_NOTES.refused` to the rc-a14 wording in one edit (O48); when `bare` passes where the three notes fail, the notes drop their next-step clause; delete the probe either way |
| rc-a16 | rc-u10's hand-written recorded bytes per arm | every recorded first-pass request under arms A0, S, A1, A2, A3, and R (`designs/layout.md` § Layout readings) | rc-u10 holds when A1 ≥ A0 − N on use and A1 ≤ A0 + N on re-acquisition, with N = 2·\|S − A0\|; otherwise R is read and D34 opens; A2's strings ship in rc-u11 when A2 reads within N of A1 on both readings; A2 also rewrites each owner title to `${holder} (${owner})`, or `${owner}` with no holder, in the recorded request text, and the recall tool description to "or one of the topics" and "An owner name, an id, or a topic" in the recorded tools, which the other arms keep as recorded (O48; `designs/layout.md` § Literal strings); A3's lead lines ship only when A3 beats A2 by more than N on one reading | delete the probe after its reading |
| rc-u11 | a byte fixture per string rc-a16 kept; annotation cases included, not included, mixed, and endpoint; when A2's strings ship, no `[Desk]` or `Ledger source` in `src`, `tests`, or `guides`, and every site there that pins the owner title (`(account ${owner})` at `e773887b:src/core/ledgers/helpers.ts`) or the recall tool description (`one of the desk topics` and `or a desk topic` at `e773887b:src/core/ledgers/Ledger.ts`) carries the A2 text (O48); a mutation on the annotation join; `test:guides` green | none; rc-a16 decides its strings | fix (vocabulary) | none |
| rc-a10 for rc-u10 | the transport rewrite's test: the `system` arm appends the records block to `system` after `\n\n` and strips it from the request copy | 24 goals, arms `system`, `repeat`, `sham`, and `on`, the judge live on one daemon pin until rc-st2 serves judge requests by key (`designs/runs.md` § Replay and pins); contingency arm `separate` only on a failed gate | `on` passes at work criteria ≥ `system` − N with no critical class added, with N = 2·max(\|repeat − system\|, \|sham − system\|); cached share is reported and never gates; on a failed gate the `separate` arm runs, and D34 opens when it passes where `on` failed; both failing is reported as the measured cost of the ruling | delete the transport rewrite and its test; no switch exists to revert |
| rc-e1 | L0: rc-p1 (a) shows at least one recurring id per fold on average, and the anchor line costs at most 5% of the 4096-token recap allowance; L1: off and on are byte-identical until the first fold, and on adds exactly the anchors | L2 micro: 8 goals seeded from a compaction checkpoint before the goal-17 lookup window, arms off, repeat, and on | a predicate scores a product that carries the correct folded account id; on minus off reaches N, and on adds no critical violation | delete the option, the render branch, its constant, and its tests |
| rc-a7 | carriage reaches 0.8 for products inside the window on the hydrate rung over rc-a9's end-of-goal checkpoints (seat checkpoint k under rc-a7, build request k+1); control: the seed-only tail | 16 goals from goal 38, seeded after goal 37 | work criteria improve beyond N, no critical violation added, cached share within 0.1 of the `on` arm of rc-a10 for rc-u10 | strip the switch, the branch, and its tests |
| rc-a11 | a recording stub judge sees fewer pair asks with identical correction state | rc-a9 extended to goal 77 | at least 50% fewer burst calls and time beyond noise, zero false retirement at burst 49 and then 77 | delete the switch, the id-share eligibility branch in `Classifier`, and their tests |
| rc-a5 | none | late strata after rc-e1's reading | closures without evidence plus fabricated completions fall beyond N; re-acquisition stays at or under 2 times off | revert the study wiring |

rc-a6 is retired (`plan.md` § Sequence, Retired ids); its gate row and its GPU row are struck. The rc-a11 gate is the prior campaign's R5b reopen condition (`research/evidence.md` § Prior-campaign readings, R5b packet).

## GPU order

All GPU work runs as the Orchestrator, after the CPU units it depends on, inside § GPU allowance:

1. rc-a15, then the rc-a9 single-request probes.
2. The rc-a9 records segments for goals 1–2 and 3–8, with rc-p4 after the first segment only when the user grants Q10, whose reading projects every later segment (`designs/runs.md` § First readings), then the remaining rc-a9 segments.
3. rc-a16 on the recorded first-pass requests.
4. The extension to goals 49 and 77, for rc-a7 and rc-a11, after the seeds validate, beside the S7 writers.
5. The screens in the order of `plan.md` § Sequence: rc-a10 for rc-e1, and rc-a10 for rc-u10 after rc-u11 is accepted, with its contingency only on a failed gate; then the screens that read the extension.
6. The larger-model check of each experiment that promotes.

Fixes found while a step runs queue their request and micro rungs into this order (`designs/runs.md` § Fixes while a step runs).

## Uncertainty

| Recommendation | Weakness | Next check |
| --- | --- | --- |
| skill load as an instruction | the cache cost is an inference, and load frequency on this workload is unmeasured | count loads per run in `studies/context`, and read `cached` around a load in rc-a9's skill-load probe |
| the cache saving of rc-u10 | the wall arithmetic uses the 4B uncached prefill rate of about 202 to 209 tokens per second (`692e551:ANALYSIS.md`), the 2B rates are the research estimate for the measuring host's GPU class, about 400 to 900 tokens per second of prefill and 80 to 100 of decode, unmeasured (`plan.md` O55), and the saving needs the agent's slot to survive judge calls | rc-a9's 2B readings and its co-residency probe |
| the merged request turn | no reading compares it with a separate message at any size; the stored-copy precedent is a tool stub, not a user turn | rc-a16's R arm; the screen's `separate` contingency |
| adjacent user turns at the head (the context message, then a `user` tail) | one summarized read of the renderer, no test | rc-a9's render probe M3 gates the recording |
| dropping `[Desk]` and the "Sentence scope is unresolved" sentence | no reading; the Study's system text introduces a desk, so the tag has meaning there | rc-a16 A2 against A1 |
| refusing the lead lines by default | an instruction in the user turn is the one slot a 3B followed (C46) | rc-a16 A3 against A2 |
| the sampling pin as a no-op | rests on C45, read from Ollama's `main` through a summarizing fetch | rc-a9's M1 probe on the pinned daemon version |
| `presence_penalty` 1.5 against id copying | unmeasured at `temperature` 0 | rc-a9's M2 probe plus the carriage instrument (D38) |
| deferring `untrusted` taint (D23) | the floor covers only annotated tools, and a rule that separates untrusted input from consequential action needs the flag | land D23 in the same wave as rc-t1's `memo` tool; before that, count how often the floor asks on `studies/tools` |
| three denial notes in the "did not run" form with "Do not call it again" | rests on one 0.5B rollout set over 24 tasks (C39), one fabrication study (C40), and practitioner reports; rc-u16 rewords the scope and refused notes (O48), and rc-a15 reads both, its `scope` arm mandatory; whether the 10-minute rc-a15 cap of § GPU allowance funds the seventh arm, and the `scope` arm's baseline, are open (`plan.md` § State, row O48 open points) | rc-a15 |
| one merged security unit | a larger diff for one review | staged acceptance: a Stage A failure stops rc-a14, and Stage B dispatches apart |
| rc-a15 funded from the larger-model checks | that row spends only per promoted experiment; three promotions leave 100 minutes | the Orchestrator re-reads the row after the first screens; O25 keeps it a reserve that tops up no screen |
| the approval binding check (a tool replaced during an ask) | no consumer replaces tools mid-run | drop it in review when `tools.tool(name)` identity is unstable across `remove` and `add` |
| `AUTHORITY_NAME_LIMIT` and its encoding leaf | a fleet helper might already encode and cap an identifier | resolved 2026-10-31: `preview` in `@orkestrel/contract` encodes and caps the name, so neither is declared (`designs/authority.md` § Shapes) |
| `correction.limit` with no default | rc-p1 (b)'s growth curve may argue for a default | read 2026-10-31: the `study` variant grows linearly (128 questions at 128 messages against 8 at 8), not far beyond linear, so no default is proposed; rc-u6's review weighs the absolute count, one question per earlier message under the study topics (§ Probes, Readings) |
| whole-set memo store | the per-revision store has a real write-cost argument | time `set` over growing memo sets in rc-u8 (D14) |
| memos before workspace in the head | workload-dependent, no reading | pin by test; read invalidation counts on the mechanism study |
| four instruments suffice | rule retention and stage attribution may join when rc-e1 promotes | rule retention joins when rc-e1 promotes; stage attribution only when a unit's gate names it |
| the smallest model as the subject | without the repeat rule, the compaction arm at 2B stopped at goal 15, so an arm may never reach a late stratum | rc-a9 reports the furthest goal each arm reaches; a stratum the off arm never reaches is reported unreached, and the gate reads at the strata the arms reached |
| objective bench routing | each `astra` unit runs on the subjective lane's engine when the roster lists no objective bench (O3) | a liveness probe of the objective bench before dispatching the first `astra` unit |
| segments of 15 model minutes finish in about 20 minutes of wall | the wall-to-model ratio and the cold start are 4B readings of the prior campaign; a burst segment can stretch | rc-a9's first two segments; size by measured wall, not model time, when the ratio moves |
| the step cap by projection, with no in-process guard | fail-fast acts at segment granularity, so a loop inside a segment wastes up to one segment | the D39 trigger on the boundary reads |
| rc-st2 decided by the judge-state share | the share counts judge states without tool-result text, not actual body matches across arms | the first records screen's `on` segment counts body-hash matches against `off`'s seal |
| no seal lost on a between-request stop | the Study guide states it (`@orkestrel/study` `guides/study.md` § Execution and evidence); a scope refusal before dispatch and a kill are unread | rc-p2 |
| checkpoints after every goal | custody bytes grow with the square of the goal count, and the read cost is unmeasured | rc-a9 reports checkpoint bytes per goal; rc-st1's acceptance reads a 77-goal result |
| evidence rows visible to a second process before the sink syncs | unknown; without it the reader lags to trial end for evidence while `exchanges.jsonl` still shows progress | rc-p2 |
| the empty-streak alert at a streak of 3 | assumes a baseline rate at or under 0.1 and independent goals, which C48 argues against | rc-a9's records and compaction arms supply the baseline rates before any screen |
| cutting goals per arm when a screen exceeds its cap | a shorter slice might not reach a stratum | the report names the stratum reached, as the row on the smallest model as the subject allows |

The consultations' trim-order and grouped-asks uncertainties are closed by F2 and F1, and the optional-`ask` uncertainty by O16 (`plan.md` § Rulings).
