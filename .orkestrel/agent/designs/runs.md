# Run operations design

Every GPU step runs as a chain of short, sealed, one-arm segments, and every decision other than a Study ceiling is taken at a segment boundary. This design covers the run shape, the segment plan per GPU step, what rc-a9's first segments measure, the progress readings, the stops, the fixes checked while a step runs, replay and the per-lineage pins, the run-operation units, and their deferrals (O19 to O25). `designs/measurement.md` owns each step's cap, gate, and place in the GPU order; `plan.md` § Sequence owns each unit's row. Study citations name a section of `guides/study.md` in `@orkestrel/study` 0.0.7 (see the [Study repository](https://github.com/orkestrel/study)) or a Study symbol; Agent source names a symbol and its file as of `2bb8c5be`. Deferrals point at `plan.md` § Deferred.

## Ruling

The user ruled on 2026-10-31:

> I don't want us to just wait around while it runs, I want us to keep working on fixes especially if there are failures, we need to fail fast and as we work we need to make sure that we are keeping track of the model runs, especially the quality of inputs and outputs so we can get to work on ideas and actual implementations and even gauge if the fixes we apply are even working instead of just riding out the model runs.

- Ride out no GPU step: decide at every segment boundary whether to launch the next segment, fix, or stop the chain (O19).
- Read every segment's inputs and outputs from its progress reading before the next launch (O21).
- Turn a failure into a fix unit while the chain runs, and check the fix on the cheapest rung that answers (O22).

## Run shape

- Run every GPU execution as one arm and one segment of goals (O19).
- Execute each segment from a `study freeze` closure, so a writer's edit cannot change a live segment (`guides/study.md` § Native command).
- Declare on every segment's profile: `settings.observe: true`; `record` with `bytes`, `calls`, and `duration` at twice the segment's projection; `provider.daemon` pinning the executable digest, the version, and the model digests; purpose `mechanism`; and `bounds.goal.calls` at 512 (O24).
- Start a lineage's first segment at goal 1 and every later segment from an end-of-goal checkpoint a sealed earlier segment staged (rc-a17).
- Checkpoint after every goal on the staging segments, rc-a9 and the extension; a screen reads only its seed, and a screen segment checkpoints only the goal its arm's next segment seeds from. rc-a17 raises the memory validator's 12-id checkpoint cap to the scenario horizon, and rc-s1's per-step change for rc-a9 writes the every-goal staging profile (`plan.md` § Sequence, row rc-s1).
- Across a gate's arms, the closure fingerprint means the Study content identity (`StudyIdentity` content: packages, dist, and source code; fixture JSON excluded) and the runtime identity. Each arm's declaration, rubric, and seeded profile bytes differ by design and are recorded per segment in the run record. The rc-u10 screen's transport rewrite ships in the same build for all four arms, and declaration JSON selects it.
- Size the first segment of rc-a9's lineage at 2 goals and the second at 6. A screen lineage's first segment is its `on` arm's first segment of § Segment plan, projected from the last sealed segment before it; its measured rates re-project the rest of the screen. Project every later segment from the last sealed segment's measured per-role milliseconds and calls per goal, keep it at 15 model minutes or less, and launch it only when its projection fits the step's remaining cap.
- Run each segment as a tracked background command whose completion notifies the session; detach no segment and schedule no wake for one (`@orkestrel/scaffold` `.agents/orchestration.md` § Pace).
- Take every decision other than a Study ceiling at a segment boundary, by launching or not launching the next segment: stop, fix, curtail, continue, or re-project.

### Why segments

- Study latches the first failure across a series: the failed goal, the later goals, and the goals of later trials stay unexecuted with that cause (`guides/study.md` § Execution and evidence; `StudySeries` and `StudyTrialLease` in Study). One arm per execution keeps one arm's stop from costing another arm.
- Custody seals only a complete scheduled population, and a result without a seal stays interrupted (`guides/study.md` § Execution and evidence). A stop between requests leaves the later goals unexecuted and the population complete, so it seals; a stop inside a request does not. rc-p2 reads each stop class.
- A `record.calls` or `record.duration` refusal prevents completion and leaves the result interrupted (`guides/study.md` § Native command, the recording-allowance paragraph). Enforce the step cap by projection before launch; the `record` allowances are a backstop that must never bind.
- `--extend` refuses an ancestor that holds a partial product and continues only an unchanged build, and positional replay refuses any other Node release, a patch included (`guides/study.md` § Native command). A checkpoint is state, so it seeds a changed build across a Node patch and a runner update.
- Every executed segment seals, so every segment stays gradeable, replayable, and seedable.

### Checkpoints

- As of `2bb8c5be`, the memory session attaches its checkpoint to a goal's first observed dispatch, at goal start (`StudyMemorySession` in `studies/memory/StudyMemorySession.ts`), and nothing reads one back.
- rc-a17 appends the `checkpoint` row after the goal's `result` row, when no request is in flight, so `snapshot()` cannot refuse with `'CONCURRENCY'`. The state after goal 24 is the state at the start of goal 25: the extension seeds after goal 24 and re-runs no goal.
- A snapshot carries its judgments (`designs/records.md` § Ledger snapshot), so a seeded arm asks no judge question from before its seed again; the minutes a seed saves are its skipped goals' agent calls plus their judge calls.
- A seed refuses before any request when the sealed result's seal differs, the trial or the row is absent, or the executing slice's goals are not the recorded scenario's goals after the seed.

```ts
// studies/memory/types.ts
/** Opens each trial from the end state a sealed observed result retained after one goal. */
export interface StudyMemorySeed {
	/** The sealed result directory, relative to the workspace root. */
	readonly result: string
	/** The seal id the result must carry; another seal refuses before any request. */
	readonly seal: string
	/** The recorded trial whose checkpoint opens every trial of this execution. */
	readonly trial: string
	/** The goal whose end state opens the trial; the executing slice starts at the goal after it. */
	readonly after: string
}

/** Holds one goal's end state as the `checkpoint` evidence row; the arm's strategy names which state member is present. */
export interface StudyMemoryCheckpoint {
	readonly ledger?: LedgerSnapshot
	readonly conversation?: ConversationSnapshot
	readonly records: StudyMemoryInput['records']
	readonly arrivals: readonly string[]
}

// StudyMemoryOptions gains seed?: StudyMemorySeed; the checkpoint cap rises from 12 to the scenario horizon.
```

## Segment plan

The caps are O17's and sum to 600 model minutes (`designs/measurement.md` § GPU allowance). Each projection is derived arithmetic on the only bases, the 4B c1 costs and the Study pair (`research/evidence.md` § Prior-campaign readings); rc-a9's first segments replace the bases.

| Step | Cap | Arm-goals | Segments and seed | Projection in model minutes, derived |
| --- | --- | --- | --- | --- |
| rc-a9 probes | 10 | single requests; rc-p4 at 3 on Q10 | not segmented | fits |
| rc-a9 recording | 60 | records 1 to 24; compaction 1 to 24 | records 1–2, 3–8, 9–16, 17–24; compaction 1–12, 13–24; from goal 1 | 27 to 37 |
| extension | 100 | records 25 to 77; compaction 25 to 49 | records 25–36, 37–48, 49–53, 54–65, 66–77; compaction 25–37, 38–49; seeded after goal 24, then chained | 54 to 77 |
| rc-a10 for rc-e1 | 30 | 8 compaction goals per arm, 3 arms | two segments per arm (4 goals each), seeded after the goal before the first fold, which rc-a9 shows (goal 13 by estimate); `on` first | about 13 |
| rc-a10 for rc-u10 | 45 | 24 records goals per arm from goal 1, 4 arms | two segments per arm (1–12, 13–24); `on` first | 54 to 95; fits only at a 2B agent rate at or under 0.39 model minutes per goal, or with keyed judge replay (rc-st2) |
| rc-a10 contingency `separate` | 30 | 24 records goals from goal 1, one arm | two segments (1–12, 13–24), only on a failed rc-u10 gate | per the rc-u10 row's per-arm share |
| rc-a10 for rc-a7 | 60 | 16 records goals per arm, 4 arms | two segments per arm (38–45, 46–53), seeded after goal 37; `on` first | 62 to 89; fits only at or under 0.455, or with keyed judge replay |
| rc-a10 for rc-a11 | 100 | 4 goals per arm at burst 49 and at burst 77, 4 arms | one segment per arm per burst, seeded after goals 48 and 76; `on` first; the burst-77 `on` segment is curtailable | 44 to 57 |
| rc-a5 | 40 | the late compaction slice | seeded after goal 48 | fits |
| larger-model checks | 100 | one `off` and `on` pair per promotion at its stratum on 4B | two segments per promotion, seeded from the 2B state | 31 to 45 per promotion |
| rc-a15, rc-a16 | 10, 15 | single requests | not segmented | fit |

- Where the preceding table names `on` first, run the treatment's first segment first, then the bound arms (`off` or `system`, `repeat`, `sham`), then the treatment's later segments. Every arm starts cold from the same seed under one pin, so the treatment's first progress line costs no discarded goal, and curtailment reads only after the bound arms seal.
- Hold one build per gate: the closure fingerprint, the Node runtime, and the daemon pin are equal across a gate's arms. A fix accepted mid-gate restarts that gate's arms from the seed, inside the gate's cap.
- When a screen's projection exceeds its cap with a live judge, take the judge saving from rc-st2 when the user opened the Study release (Q7), else cut goals per arm, never arms, and report the stratum reached. The contingency and larger-model rows stay reserves and top up no screen (O25).
- The larger-model checks read "4B continuing from a 2B state": both arms share that state, and a snapshot gauge suppresses calibration (`designs/records.md` § Hydrate semantics). Whether the checks' profile supplies a 4B `gauge` is an open Orchestrator item in `plan.md` § State, ruled before the first check.

## First readings

rc-a9's records segments for goals 1–2 and 3–8 measure, before any later segment is projected:

- the 2B agent's milliseconds per call and calls per goal;
- the judge's milliseconds per call and calls per goal; the judge stays Mica v0.1 4B on every arm, and judge minutes were 63 of 109 on the c1 records arm, so records arithmetic is judge-bound at the bursts (`research/evidence.md` § Prior-campaign readings, c1 costs and judge bursts);
- the partial and empty product rates;
- the cold-start wall and the `load` milliseconds;
- checkpoint bytes per goal, judgments included;
- whether a second process sees `evidence.jsonl` rows before the sink syncs;
- the gap between `record.duration` and summed `total`;
- the share of judge requests whose state text carries no tool-result text: arrival and pair questions carry only user text that every arm of one seed shares, so the share estimates keyed replay's cross-arm hit rate and decides rc-st2;
- every invariant of § Stops on the wire.

## Progress

The Orchestrator reads each segment at its completion and at no other time (O21). One read is one short Node process that parses appended bytes by offset, contacts no daemon, and writes the step's progress file under the throwaway directory that `.agents/orchestration.md` § tmp layout names for step output.

| File | Holds | Appears |
| --- | --- | --- |
| `exchanges.jsonl` | the exact request body: the `system` message count and bytes, the pinned options, the records block, the tail | synced before each send |
| `evidence.jsonl` | `dispatch` and `wire` rows (finish, prompt, completion, cached, and the `total`, `load`, `prompt`, and `decode` durations); `stop`, `cut`, and `failure` rows; the `result`, `lookup`, `context`, and `denial` rows | per request; the trace rows at goal end |
| `attempt.json` | every goal's product, failure, usage, duration, and executed fact | at trial end |

- Per request: role, model digest, options with every pinned key, request bytes, `system` message count and bytes, finish, prompt, cached, completion, `total`.
- Per goal: calls per role, Σ prompt, Σ cached, Σ completion, Σ `total` in model minutes, the product's `partial` and `empty` flags, lookups found and missing, repeats, checkpoint bytes, stops, alerts, and step spend against the cap.
- Per segment: arm, goals reached of the horizon, ended, failure cause, layer, id, and sealed.
- The `system` bytes cell is a live check of O11: host-authored text is constant across goals, so a change flags a boundary leak in the run itself.
- rc-s1's first change appends a `denial` row per denied call on both arms through `buildStudyAgentToolDenial`, so the reader counts repeats per goal.
- At each boundary, after the segment seals and before the next launch, run `study grade` over the sealed segment with its rubric slice (predicates only, no daemon). Add its per-goal work-criteria and critical-violation counts to the progress line. The micro rung reads the same counts on `on` against `off`.

The form of the line a session reads per segment, with illustrative values:

```text
rc-a9 records 3-8: 6/6 goals, 1 partial 0 empty, agent 14 calls 2.1 min, judge 21 calls 0.5 min, model 2.6/60, cached 0.71, system 1 msg 216 B, stops none, alerts none, sealed
```

- The reader starts as the throwaway rc-p3, which calls one exported, tested projection, `computeStudyMemoryProgress` in `studies/memory/helpers.ts` (rc-a17), and lands in Study as the `study progress` command (rc-st1).
- `@orkestrel/scaffold` `.agents/orchestration.md` § Depth, breadth, and machinery moves a tool out of the throwaway directory that `.agents/orchestration.md` § tmp layout names at its second consumer; here the move waits on the user's Study publication (Q7). Until then rc-p3 serves, and its removal records the deviation.
- The term is `progress`: never `digest`, which is Study's SHA-256, and never `watch`.

```ts
// @orkestrel/study src/core/types.ts
/** Holds what custody retains so far for one execution, read while it runs or after it seals. */
export interface StudyProgress {
	readonly id: string
	readonly sealed: boolean
	readonly trials: readonly StudyProgressTrial[]
}

/** Holds one scheduled trial's reach and, after its attempt is retained, its ending. */
export interface StudyProgressTrial {
	readonly trial: StudyTrial
	readonly horizon: number
	readonly ended: boolean
	readonly failure: StudyFailure | undefined
	readonly goals: readonly StudyProgressGoal[]
}

/** Holds one goal's transport readings, its domain row counts, and the consumer's projection. */
export interface StudyProgressGoal {
	readonly goal: string
	/** One-based `evidence.jsonl` lines holding this goal's rows. */
	readonly rows: { readonly first: number; readonly last: number }
	readonly usage: readonly StudyProgressUsage[]
	readonly stops: readonly StudyStop[]
	readonly events: Readonly<Record<string, number>>
	readonly reading: JSONValue | undefined
}

/** Holds one role's wire readings within a goal; a count the wire did not report stays undefined. */
export interface StudyProgressUsage {
	readonly role: StudyRole
	readonly calls: number
	readonly replayed: number
	readonly prompt: number | undefined
	readonly cached: number | undefined
	readonly completion: number | undefined
	/** Mirrors Ollama `total_duration`, summed in nanoseconds; undefined without passive observation. */
	readonly total: number | undefined
	/** Counts wire rows whose finish is `length`. */
	readonly length: number
}

// @orkestrel/study src/server/adapters/types.ts
/** Holds one goal's retained rows for a consumer projection. */
export interface StudyProgressTarget {
	readonly trial: StudyTrial
	readonly goal: string
	readonly evidence: readonly StudyEvidence[]
}

// StudyAdapterInterface gains progress?(target: StudyProgressTarget): JSONValue
// readStudyProgress(directory: string, from?: string): Promise<StudyProgress>
// study progress RESULT [--from GOAL] writes one JSON document under the 60-second command allowance.
```

`RESULT` is the result directory and `GOAL` the first goal id to list; without `--from`, each trial lists its last goal. The reader reads the manifest, every trial's `evidence.jsonl`, and any `attempt.json` one time each, skips a trailing line without LF, and never verifies or writes. It loads the adapter in a child as `study grade` does and calls `progress` per listed goal; a throwing projection refuses the command with `CONFIG`.

## Stops

Study ceilings and Agent ceilings keep their layers; an invariant failure ends the chain; curtailment ends only a treatment arm; every other signal is an alert read at the boundary (O20). No in-process quality guard ships in the first lineage (D39).

| Class | Threshold, written before the run | Layer | Acts | Evidence kept |
| --- | --- | --- | --- | --- |
| Study ceilings | the `q2` bounds: request 360000 ms and 1 call; goal 900000 ms and 512 calls; trial and series durations at twice the segment projection; evidence bytes sized from the last sealed segment's checkpoint rows | `scope`, `window`, `custody` | at the crossing, inside the segment | a between-request refusal seals and a mid-request one does not, so the bounds carry headroom |
| Agent ceilings | the agent `limit` of 8 turns in `StudyMemorySession`, the window, the meter | `meter`, `budget`, `model` | per request | always |
| Step cap | the remaining cap funds the next segment's projection; the `record` allowances at twice the projection are a backstop that must never bind | a budget stop; a backstop stop reports Study's `scope` layer | by not launching the next segment | every executed segment seals |
| Invariant | exactly one `system` message, at index 0; every pinned sampling key present with its pinned value; `think` false; the model digest equals the pin; the closure fingerprint and the Node runtime equal across a gate's arms | none: "measurement invalid" | the chain ends at the boundary that reads it | the sealed segment stays evidence and is never a gate reading |
| Curtailment | rc-a11: `on`'s burst-49 judge calls exceed half of `off`'s, or a false retirement against the supersession list written before the run; rc-e1: `on`'s folded-id count plus its remaining goals falls under `off`'s count plus N | none: "gate determined" | the treatment's next segment is not launched, only after the gate's bound arms sealed (`off`, `repeat`, and `sham` where the gate runs it); success is never curtailed | always |
| Alert, never a stop | an empty-product streak of 3 where rc-a9's baseline rate is at or under 0.1; a goal whose model milliseconds exceed 1.5 times the projection on two consecutive goals; repeats at or over `limit` minus 1 in one goal; a malformed call outside the `order:<id>` and `customer:<id>` grammar; a window refusal. Partial products and replies cut at the output reserve are reported, never alerted: in c1 "half of the replies hit the reserve" (`research/evidence.md` § Prior-campaign readings, c1 reserve replies) | none | the Orchestrator decides at the boundary: a fix unit, a re-projection, or continue | always |

- The streak of 3 holds a false-alarm rate at or under 5% at a baseline rate of 0.1 over 24 goals under independence (derived). Goals in one conversation are dependent, an inference from C48's multi-turn degradation, so that rate is a floor, and a streak alert carries information only for a class whose baseline rate is about 0.1 or lower.
- Kill a live segment only when its remaining projected spend is wasted outright, as in a loop burning calls toward the cap. A kill loses that segment's seal only; its raw rows stay readable with the incomplete-history option (`guides/study.md` § Native command). Kill only the recorded process id and its descendants (`@orkestrel/scaffold` `.agents/orchestration.md` § Dispatch).
- The `content` cause stays what Study names: a consumer refusing the content of one request it already settled (`guides/study.md` § Execution and evidence). No unit throws it in the first lineage (D39).
- No sequential or anytime-valid rule ends a screen early for success or futility: goals in one conversation are dependent, an inference from C48's multi-turn degradation, N is a margin over single trajectories (`designs/measurement.md` § Screens), and a paired anytime-valid e-process over replayed frozen traces certified nothing on thin discordance (C51). Curtailment is no inference: it ends an arm whose full-length verdict is already fixed (D45).

## Fixes while a step runs

A fix climbs the ladder and stops at the first rung that answers (O22).

| Rung | What runs | Model minutes | Proves | Cannot prove | Beside a live segment |
| --- | --- | --- | --- | --- | --- |
| fixture | the failing goal's recorded request and reply as a scripted-provider test, red before the fix and green after | 0 | the fix on the exact input | the model's reaction | the writer edits and runs owned-file format, lint, and type checks; the test waits for the boundary |
| hydrate | seat checkpoint k under the fix, build request k+1, and byte-diff it against the recorded request (rc-a17's seed test generalized) | 0 | the inputs, across Node patches and runner versions | the reply | as for fixture |
| replay | `study execute` with `--replay` over the recording, the whole prefix, and `--offline true`; `scanStudyDivergence` names the first changed request | 0 | a `studies/` or projection fix keeps the bytes; a `src/` fix shows where it first acts | anything after the divergence; it refuses another Node patch | waits for the boundary |
| request | single-request pairs on recorded requests, the control sent live again beside the fix's request in one execution (rc-a16's shape) | seconds | the model's reaction within one pin | continuation effects; a live reply is never compared with a recorded one | queued in the GPU order |
| micro | 2 to 4 goals seeded after goal k, arms `off` and `on` | 2 to 8, derived | a point observation of continuation | a gate | queued in the GPU order |
| screen | the written gate | per § Segment plan | the gate | nothing beyond the gate | queued in the GPU order |

- When a failure appears in a segment's progress, read the failing goal's exact input and output from the reader and class it: an instrument defect in `studies/` is a size S unit; a product defect in `src/` is a unit whose test comes first from the fixture rung.
- Write the brief, dispatch the writer beside the run, run the fixture and hydrate rungs with the touched tests at the boundary, and let the GPU order take the request and micro rungs.
- A request or micro rung draws on the cap of the step whose segment surfaced the failure. It is projected before launch like a segment and runs one arm per execution. Its reading is written before launch (micro: the failing class's per-goal count on `on` against `off`). Its seeded declarations and profiles are deleted when the fix unit is accepted. When that step's remaining cap cannot fund the rung, the rung waits for the step's screen.
- Stop an arm's chain when an invariant fails, an instrument defect leaves the remaining goals unmeasurable for the gate, a curtailment fires, or an accepted `src/` fix changes the arm's request bytes at or before the current goal.
- Let an arm continue when it is a bound arm the fix does not touch, or when the alert is the subject model's own behavior.
- `plan.md` § Parallelism holds the line on what runs beside a segment.

## Replay and pins

- In Study 0.0.7 a screen relies on hydration seeds, which are state and survive a Node patch, a runner update, and a build change; on positional offline replay of a sealed recording for the replay rung, on the recording's exact Node runtime (`guides/study.md` § Native command); and on a live judge on one daemon pin within a screen, where the `repeat` arm folds judge noise into N.
- The live-judge irreproducibility of `research/evidence.md` § Prior-campaign readings holds across lineages, and no gate spans two lineages.
- After rc-st2, a screen serves judge requests by request-body key from a sealed recording, misses live, which pairs every arm on one judge draw.
- Rely on no bit-stable generation: identical request bodies matched the sealed product at 3 of 12 checkpoints (`research/evidence.md` § Prior-campaign readings, prefix replay), temperature 0 is not batch-invariant (C49), and llama.cpp's server documents that, depending on the backend, `cache_prompt` logits are "not guaranteed" bit-for-bit identical across batch sizes (C50).
- A lineage is the chain of segments that share one Node patch and one daemon pin; one opens at rc-a9's first segment and at each S7 screen's first segment, and a daemon change opens a separate one (`tenets.md` § Host).
- Pin three things per lineage, on the recommendations of Q8 and Q9 until the user rules: the Node 22 patch, the most recent Node 22 release at the lineage's start, held through the last replay of that lineage's recordings (amending O18 for the window); the Ollama daemon, its executable digest, version, and model digests in the profile's `daemon` member, which Study verifies before every trial, screened for the most recent stable release only at a lineage start; and one closure fingerprint across the arms of each gate.
- A Node patch that lands mid-lineage voids that lineage's replay rung and nothing else: the hydrate rung and every seed survive.

## Units

Each unit's row in `plan.md` § Sequence names its step, role, owned files, and dependencies; this table holds its acceptance, cheap first.

| Unit | Builds | Acceptance | Promotion and removal |
| --- | --- | --- | --- |
| rc-p2 | a throwaway custody probe over a protocol-faithful loopback Ollama fixture, never on port 11434 or 11435 | typecheck; the fixture drives 3 goals with `record` and `observe`; control: a complete run seals and `study grade` exits 0; per class (a scope bound refusing before dispatch, a trial deadline mid-request, `record.duration` exhausted, `record.calls` exhausted, a consumer `content` throw, a kill of the recorded process id): the seal, the `study grade` exit, and the exit of an offline replay; a second process reads `evidence.jsonl` between appends, and the report records whether rows are visible before the sink syncs; `fs.watch` event counts on both files | its table feeds rc-p3 and rc-s1's first change; the probe and its throwaway `studies/custody` declarations are deleted before the unit returns |
| rc-a17 | end-of-goal `checkpoint` rows, `StudyMemorySeed`, the seeded open, the slice scenarios, and `computeStudyMemoryProgress` in `studies/memory` | typecheck; the checkpoint row is appended after the `result` row when no request is in flight; the checkpoint cap is the scenario horizon; a slice test asserts every slice's goals equal the endurance goals at their positions; a CPU round trip with a scripted provider: goals 1 to 4 with checkpoints sealed, and a seed after goal 2 sends a byte-identical goal-3 first request on both arms; controls: `failures` emptied differs, the gauge removed adds a calibration request, a wrong `seal` refuses with `CONFIG` before any request, an unsealed result refuses with `CUSTODY`; a mutation that skips the arrivals hydration throws `Source arrival was replayed within a trial`; `computeStudyMemoryProgress` over a fixture goal returns calls, usage, product flags, lookups, repeats, system bytes, and cache share, and a goal without rows returns undefined cells; `test:studies` green | stays in `studies/memory` until a second driver seeds (D40) |
| rc-p3 | the throwaway progress reader of § Progress over `computeStudyMemoryProgress` | typecheck; over rc-p2's sealed result the per-goal lines equal a hand count of wire rows, and the tally equals Σ `timing.total`; a copy with one pinned key removed raises the invariant line, and the unchanged copy raises none; it parses appended bytes only and holds no timer | promoted as rc-st1 at the Study release; deleted at promotion, or at campaign close with the deviation of § Progress recorded |
| rc-p4 | a throwaway contention probe, only when the user grants Q10 | the gate is written first: offer the exception only when the median per-request `total` beside one `test:studies` run, with `OLLAMA_HOST` at `http://127.0.0.1:1`, is within 5% of quiet, and replies agree as often as quiet repeats agree; cap 3 model minutes inside the rc-a9 probe cap | deleted after its reading |
| rc-st1 | `study progress` in `@orkestrel/study`: the shapes of § Progress, `readStudyProgress`, and the adapter's optional `progress` | an interrupted fixture reads every complete row and skips a trailing line without LF; a sealed fixture reads `ended` and the failure; a real child appends while the reader reads; an adapter without `progress` yields an undefined reading; a generated 77-goal observed result with a checkpoint row per goal reads, and the report records the duration; an unknown flag exits 64; a mutation that keeps the partial line fails; the project tests and guide parity | ships in Study 0.0.8 (Q7) |
| rc-st2 | keyed role replay in `@orkestrel/study`, written only when rc-a9's first records segments project a records screen over its cap with a live judge | `--replay RESULT --roles ROLES --offline true|false`, with `ROLES` a JSON role list, is exclusive with `--prefix` and `--extend`; a listed role's request whose path, method, and body bytes equal a recorded attempt's is served and marked replayed; a miss sends live under `--offline false` or refuses before send under `--offline true`; a tampered served row refuses custody; a mutation that drops the role filter serves an agent request; progress counts `replayed`; keyed mode needs no equal Node runtime | ships in Study 0.0.8 when written (Q7); else D48 |

## Deferred

Each item's trigger lives in `plan.md` § Deferred.

- An in-process quality guard in the memory driver, tripping the `content` cause before the next goal (D39).
- Seed custody in Study, a profile `seed` member (D40).
- A Study model-time limit summing `total_duration` (D41).
- A trial selector or a per-trial failure latch in Study (D42).
- A Study cause for a planned stop, so curtailment can end a trial in-process and seal (D43).
- An event-driven milestone waiter (D44).
- Sequential or anytime-valid promotion stops (D45).
- Live semantic labeling during a run (D46).
- One CPU lane beside a GPU segment (D47).
- Keyed role replay after the campaign (D48).
