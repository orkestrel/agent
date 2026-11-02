# Run operations design

Every GPU step runs as a chain of short, sealed, one-arm segments, and every decision other than a Study ceiling is taken at a segment boundary. This design covers the run shape, the segment plan per GPU step, what rc-a9's first segments measure, the progress readings, the stops, the fixes checked while a step runs, replay and the per-lineage pins, the run-operation units, and their deferrals (O19 to O25, O30). `designs/measurement.md` owns each step's cap, gate, and place in the GPU order; `plan.md` § Sequence owns each unit's row. Study citations name a section of `guides/study.md` in `@orkestrel/study` 0.0.7 (see the [Study repository](https://github.com/orkestrel/study)) or a Study symbol; Agent source names a symbol and its file as of `2bb8c5be`. Deferrals point at `plan.md` § Deferred.

## Ruling

The user ruled on 2026-10-31:

> I don't want us to just wait around while it runs, I want us to keep working on fixes especially if there are failures, we need to fail fast and as we work we need to make sure that we are keeping track of the model runs, especially the quality of inputs and outputs so we can get to work on ideas and actual implementations and even gauge if the fixes we apply are even working instead of just riding out the model runs.

- Ride out no GPU step: decide at every segment boundary whether to launch the next segment, fix, or stop the chain (O19).
- Read every segment's inputs and outputs from its progress reading before the next launch (O21).
- Turn a failure into a fix unit while the chain runs, and check the fix on the cheapest rung that answers (O22).

## Run shape

- Run every GPU execution as one arm and one segment of goals (O19).
- Execute each segment from a `study freeze` closure, so a writer's edit cannot change a live segment (`guides/study.md` § Native command).
- Declare on every segment's profile: `settings.observe: true`; `record` with `bytes`, `calls`, and `duration`, and the trial and series duration bounds, sized per lineage from the 15-model-minute segment ceiling and its about-20-minute wall, an unmeasured 4B figure, because one closure serves every segment of an arm and its identity holds the profile digest, so the profile holds one value, every bound being a backstop that must never bind (§ Why segments), and a different value after rc-a9's first segments re-read it opens another lineage; `provider.daemon` pinning the executable as the exact string `realpathSync` returns, its digest, the version, and the model digests; and `bounds.goal.calls` at 512 (O24). The profile carries no purpose; the declaration does (route (a), following).
- Start a lineage's first segment at goal 1 and every later segment by `--seed` from the end-of-goal `checkpoint` row a sealed earlier segment retained (rc-st3 reads the row; rc-a17 writes it and hydrates from it).
- Checkpoint after every goal on the staging segments, rc-a9 and the extension; a screen reads only its seed, and a screen segment checkpoints only the goal its arm's next segment seeds from. rc-a17 moves the checkpoint cap from the memory validator's 12 ids to the adapter's check of the scenario horizon and writes the every-goal `settings.checkpoints` list into `studies/memory/profiles/q2.json`; rc-s1's first change sets no checkpoint list beyond the current cap (`plan.md` § Sequence, rows rc-s1 and rc-a17).
- Run every segment under route (a) (`plan.md` O94): `studies/qualification`, purpose `capacity`, with the same driver, arms, and scenarios as `studies/endurance`. Study refuses `mechanism` with a semantic criterion, and `quality` demands a sealed capacity run per build and bounds that no § GPU allowance row funds, so no segment executes under `studies/endurance`; `study check endurance --profile q2` stays an offline proof that the declaration parses with `q2`. No tracked study file changes. A `study report` prints purpose `capacity` and the retained `question` names Q4, each accepted. A semantic grade's packet binds its own rubric digest, so a gate's labels bind one sealed result per segment. A closure-read proof runs on the install fixture before any GPU row, at zero model minutes, because `study grade` and `study progress` over a `--closure` result might refuse `Profile roots omit a runtime dependency`, a source reading until it runs; on a refusal, the closure's own entry with cwd at the closure root and absolute paths is tried first, and only when that fails is the choice ruled between a Study 0.0.10 fix and executing with no closure under a held tree. Read on 2026-11-02 (`plan.md` O97): the live entry refuses on the fixture's roots, and the closure's own entry with cwd at the closure root reads grade and progress with exit 0, so segments grade and read progress through that entry. Its endurance read exits 64 in class `other` on a fixture that holds no `ev-` goal, and one re-read with the probe's mismatch class widened rules it: `mismatch` reads the route usable, and any remaining `other` goes to the choice between a Study 0.0.10 fix and executing with no closure, for the user. The re-read kept class `other` on 2026-11-02, so that choice is the user's (`plan.md` O106); rc-a17 reads that path on an `ev-` seed, reporting a code token, and the choice goes to the user only on a refusal (`plan.md` O108); that read took no refusal on 2026-11-02, so no choice goes to the user, and it proves the grade and progress paths, not byte identity (`plan.md` O110).
- Freeze one closure per lineage per arm profile, `study freeze qualification --profile <arm profile> --to <closure>`, and run every segment of that arm in that lineage from it: freeze binds identity, bounds, and definition, and selection is an execute-time choice (O30). A fix between segments opens another lineage with its own closures. Study 0.0.9 refuses a closure inside any root with `OVERLAP` and a relative `--to` with `TRAVERSAL`, and `q2`, `q4`, and `local` each hold `.` as a root, so no destination inside this checkout freezes (`plan.md` O108). `q2` is proven frozen through an OS-temp route on 2026-11-02: freeze and `study check --closure` exit 0 with one fingerprint, and the scratch was removed, so no closure of `q2` exists (`ledger.md`, row rc-s1). A `<closure>` destination is the `closures` directory beside the checkout, one subdirectory per lineage ordinal and arm profile, created before the freeze; tracked records cite a closure by that rule, its freeze digest, and its check fingerprint, and the run record and the launch lines hold its path (`plan.md` O108, O117).
- Run a segment from the consumer root as `study execute qualification --profile <arm profile> --closure <closure> --trial <records or compaction trial> --goals <first>..<last> [--seed <result>:<trial>:<goal>] --out tmp/studies/<stem>`; `--out` resolves inside the working directory under `tmp/`, and `--closure` names the absolute destination the freeze wrote.
- Generate no segment input (O26, O29): the `qualification` declaration, the endurance scenarios, both rubrics, and every arm profile are tracked, and a segment differs from another only in its flags. An arm is a declaration trial plus a tracked single-word profile: `off` is `q2`, `repeat` is `q2` with another sampling seed, `sham` carries the perturbation, `rewrite` carries the rc-u10 screen's transport rewrite, and each experiment's `on` profile sets its switch; each is deleted with its experiment's removal row.
- Name by stem only what lives under `tmp/studies/`: a segment's result `tmp/studies/<step>-<arm>-<first>-<last>/` and a step's run records `tmp/studies/runs/<step>/`. A lineage's closure per arm profile sits outside them, at the destination of `plan.md` O117, because Study 0.0.9 refuses one inside a root.
- Across a gate's arms, the closure fingerprint means the Study content identity (`StudyIdentity` content: packages, dist, and source code; fixture JSON excluded) and the runtime identity. Each arm's profile bytes and each segment's selection differ by design; the run record holds the profile per segment, and the result manifest holds the selection. The rc-u10 screen's transport rewrite ships in the same build for all four arms, and the `rewrite` profile selects it.
- Size the first segment of rc-a9's lineage at 2 goals and the second at 6. A screen lineage's first segment is its `on` arm's first segment of § Segment plan, projected from the last sealed segment before it; its measured rates re-project the rest of the screen. Project every later segment from the last sealed segment's measured per-role milliseconds and calls per goal, keep it at 15 model minutes or less, and launch it only when its projection fits the step's remaining cap.
- Run each segment as a tracked background command whose completion notifies the session; detach no segment and schedule no wake for one (`@orkestrel/scaffold` `.agents/orchestration.md` § Pace).
- Take every decision other than a Study ceiling at a segment boundary, by launching or not launching the next segment: stop, fix, curtail, continue, or re-project.

### Segment selection

Study 0.0.9 adds three selectors to `study check` and `study execute` through rc-st3 (O30), each recorded in the result manifest and verified by custody:

| Selector | Meaning | Custody and identity |
| --- | --- | --- |
| `--trial <name>` | run one trial of the built schedule, named as `--prefix` keys name trials | the manifest's `schedule` holds that trial alone; `computeStudyScores` reads the manifest schedule, so attempts and scores cover it |
| `--goals <first>..<last>` | project every selected scenario to the goals from `first` to `last` inclusive, by goal id | the manifest's `scenarios` carry the projected goals; a `selection` record beside the full-scenario fixture digest names the source scenario, the range, and the trial; `grade` projects the rubric to the manifest's goals before scoring and retains the projected rubric as the grading's own; the report lists criteria outside the range under `unselected`, never `unexecuted` |
| `--seed <result>:<trial>:<goal>` | open the trial from the `checkpoint` evidence row that sealed result retained for that trial and goal | Study verifies the seal, reads the row, records the source result id, seal, trial, goal, and row digest in the manifest, and hands the row's value to the driver at `open`; a missing row, an unsealed source, or a differing seal refuses `CUSTODY` before any request |

- `computeStudyScores` requires the manifest schedule to equal the declared population and refuses a rubric that omits goals or names goals outside it, so a goal range needs the schedule projection and the rubric projection inside Study (`computeStudyScores` in `@orkestrel/study` `src/core/helpers.ts`).
- A projected rubric carries its own digest, so a segment's grading is keyed to that projection and never to the tracked rubric's digest; the report names the selection so a reader can tell the two apart.
- Study refuses a closure run under a profile other than the one it froze (`StudyCommand#closure` in `@orkestrel/study`, "Study closure selectors differ from the checked selection", https://github.com/orkestrel/study at `e319242`), so every arm runs from the closure its lineage froze for that arm's profile (§ Run shape).
- D49, the scratch-root closure route, is closed: the registry serves Study 0.0.9 and the rc-s1 re-pin landed as `a7f4fe9f` before rc-a9's first segment, so its condition cannot occur (O75); route (a) and the closure-read proof's fallback, which runs from the closure's own root, do not reopen it (`plan.md` O94).

### Why segments

- Study latches the first failure across a series: the failed goal, the later goals, and the goals of later trials stay unexecuted with that cause (`guides/study.md` § Execution and evidence; `StudySeries` and `StudyTrialLease` in Study). One arm per execution keeps one arm's stop from costing another arm.
- Custody seals only a complete scheduled population, and a result without a seal stays interrupted (`guides/study.md` § Execution and evidence). rc-p2's table read a `scope` refusal before dispatch, `record.duration`, and `record.calls` each as an interrupted result that cannot be graded; only a stop between requests that Study itself takes, the latch after a failed goal, seals. So every `q2` bound is a backstop that must never bind (`plan.md` § State, row Study 0.0.9 pre-publish consumer gate; O94).
- A `record.calls` or `record.duration` refusal prevents completion and leaves the result interrupted (`guides/study.md` § Native command, the recording-allowance paragraph). Enforce the step cap by projection before launch; the `record` allowances are a backstop that must never bind.
- `--extend` refuses an ancestor that holds a partial product and continues only an unchanged build, and positional replay refuses any other Node release, a patch included (`guides/study.md` § Native command). A checkpoint is state, so it seeds a changed build across a Node patch and a runner update.
- Every executed segment seals, so every segment stays gradeable, replayable, and seedable.

### Checkpoints

- As of `2bb8c5be`, the memory session attaches its checkpoint to a goal's first observed dispatch, at goal start (`StudyMemorySession` in `studies/memory/StudyMemorySession.ts`), and nothing reads one back.
- From `a19c163d`, rc-a17 appends the `checkpoint` row after the goal's `result` row, when no request is in flight, so `snapshot()` cannot refuse with `'CONCURRENCY'`. The state after goal 24 is the state at the start of goal 25: the extension seeds after goal 24 and re-runs no goal.
- A snapshot carries its judgments (`designs/records.md` § Ledger snapshot), so a seeded arm asks no judge question from before its seed again; the minutes a seed saves are its skipped goals' agent calls plus their judge calls. From `a82c5985`, a snapshot's judgments match by JSON value, not by JSON text, so a sealed row's sorted keys match (rc-u23), except a question the classifier memoized as failed, which a hydrated ledger asks again (`designs/records.md` § Hydrate semantics).
- Study refuses a seed with `CUSTODY` before any request when the source result is unsealed, its seal differs, or the row is missing (§ Segment selection). The memory session hydrates from the row's value that Study hands over at `open`, and no seed setting exists in the profile's `settings` (rc-a17).
- When a seeded first request on rc-a9's first segments differs only inside `tool_calls[].function.arguments` or a briefing lookup line, the checkpoint row holds its state as JSON text on both arms, as its own small unit, and this section's row shape is restated (`plan.md` O113). The read beside that trigger, by rc-a17 with no GPU (`plan.md` O118): a canonical seat over a scripted two-key `lookup` reads a difference on both arms, at the briefing line on records, offset 387, and inside `tool_calls[].function.arguments` on compaction, offset 492, `reached` true on both; the one-key call reads the same and a seat through `buildMemorySeedControl` reads different, so the second key carries it. Every study tool declares one argument key, so this read is the trigger's shape and not its firing; a real model emitting two keys on rc-a9's first segments fires it.
- rc-a17's real chain reads compared 1, equal 1, control 1, whole 1 on both arms (`a19c163d`). Unproven at that commit: the `failed`-judgment clause that follows, because no fixture's scripted judge replies fail; `readMemoryControl`'s fold-first path, because the fixture chain never folds, so rc-a9's first compaction segment that folds is its live check; and, on a seeded segment, an arrival from before the seed reads origin `history` where the uninterrupted run reads `arrival`, an evidence annotation and never wire bytes. The row-size reading stays the first segment's live check (`plan.md` O110).
- When rc-a9 reads a seeded difference with an extra leading judge request and a `failed` reading in the source segment, that difference is the known limit named under the snapshot's judgments, not the JSON-text trigger and not a key-order defect.

```ts
// studies/memory/types.ts
/** Holds one goal's end state as the `checkpoint` evidence row; the arm's strategy names which state member is present. */
export interface StudyMemoryCheckpoint {
	readonly ledger?: LedgerSnapshot
	readonly conversation?: ConversationSnapshot
	readonly records: StudyMemoryInput['records']
	readonly arrivals: readonly string[]
}

// The session's open hydrates from the StudyMemoryCheckpoint value Study hands over (rc-st3); the checkpoint cap rises from 12 to the scenario horizon.
```

## Segment plan

The caps are O17's and sum to 570 of the 600 model minutes, because rc-e1's retirement removed its 30-minute screen and unspent minutes carry to no step (O75; `designs/measurement.md` § GPU allowance). Each projection is derived arithmetic on the only bases, the 4B c1 costs and the Study pair (`research/evidence.md` § Prior-campaign readings); rc-a9's first segments replace the bases.

| Step | Cap | Arm-goals | Segments and seed | Projection in model minutes, derived |
| --- | --- | --- | --- | --- |
| rc-a9 probes | 10 | single requests; rc-p4 at 3 on Q10 | not segmented | fits |
| rc-a9 recording | 60 | records 1 to 24; compaction 1 to 24 | records 1–2, 3–8, 9–16, 17–24; compaction 1–12, 13–24; from goal 1 | 27 to 37 |
| extension | 100 | records 25 to 77; compaction 25 to 49 | records 25–36, 37–48, 49–53, 54–65, 66–77; compaction 25–37, 38–49; seeded after goal 24, then chained | 54 to 77 |
| rc-a10 for rc-u10 | 45 | 24 records goals per arm from goal 1, 4 arms | two segments per arm (1–12, 13–24); `on` first | 54 to 95; fits only at a 2B agent rate at or under 0.39 model minutes per goal, or with keyed judge replay (rc-st2) |
| rc-a10 contingency `separate` | 30 | 24 records goals from goal 1, one arm | two segments (1–12, 13–24), only on a failed rc-u10 gate | per the rc-u10 row's per-arm share |
| rc-a10 for rc-a7 | 60 | 16 records goals per arm, 4 arms | two segments per arm (38–45, 46–53), seeded after goal 37; `on` first | 62 to 89; fits only at or under 0.455, or with keyed judge replay |
| rc-a10 for rc-a11 | 100 | 4 goals per arm at burst 49 and at burst 77, 4 arms | one segment per arm per burst, seeded after goals 48 and 76; `on` first; the burst-77 `on` segment is curtailable | 44 to 57 |
| rc-a5 | 40 | the late compaction slice | seeded after goal 48 | fits |
| larger-model checks | 100 | one `off` and `on` pair per promotion at its stratum on 4B | two segments per promotion on the `q4` profile, by `--seed` from the 2B seal | 31 to 45 per promotion |
| rc-a15, rc-a16 | 10, 15 | single requests | not segmented | fit |

- Where the preceding table names `on` first, run the treatment's first segment first, then the bound arms (`off` or `system`, `repeat`, `sham`), then the treatment's later segments. Every arm starts cold from the same seed under one pin, so the treatment's first progress line costs no discarded goal, and curtailment reads only after the bound arms seal.
- Hold one build per gate: the closure fingerprint, the Node runtime, and the daemon pin are equal across a gate's arms. A fix accepted mid-gate opens another lineage with its own closure and restarts that gate's arms from the seed, inside the gate's cap.
- When a screen's projection exceeds its cap with a live judge, take the judge saving from rc-st2 when Study 0.0.10 is served (Q7), else cut goals per arm, never arms, and report the stratum reached. The contingency and larger-model rows stay reserves and top up no screen (O25).
- The larger-model checks read "4B continuing from a 2B state": each runs the `q4` profile with `--seed` from the 2B seal, both arms share that state, and a snapshot gauge suppresses calibration (`designs/records.md` § Hydrate semantics). Whether the checks' profile supplies a 4B `gauge` is an open Orchestrator item in `plan.md` § State, ruled before the first check.

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

The Orchestrator reads each segment at its completion and at no other time (O21). One read is one short Node process that parses appended bytes by offset, contacts no daemon, and writes the step's progress lines beside its run record under `tmp/studies/runs/<step>/`; Q11, approved on 2026-10-31, gives `tmp/studies/` its row in `@orkestrel/scaffold` `.agents/orchestration.md` § tmp layout.

| File | Holds | Appears |
| --- | --- | --- |
| `exchanges.jsonl` | the exact request body: the `system` message count and bytes, the pinned options, the records block, the tail | synced before each send |
| `evidence.jsonl` | `dispatch` and `wire` rows (finish, prompt, completion, cached, and the `total`, `load`, `prompt`, and `decode` durations); `stop`, `cut`, and `failure` rows; the `result`, `lookup`, `context`, and `denial` rows | per request; the trace rows at goal end |
| `attempt.json` | every goal's product, failure, usage, duration, and executed fact | at trial end |

- Per request: role, model digest, options with every pinned key, request bytes, `system` message count and bytes, finish, prompt, cached, completion, `total`.
- Per goal: calls per role, Σ prompt, Σ cached, Σ completion, Σ `total` in model minutes, the product's `partial` and `empty` flags, lookups found and missing, repeats, checkpoint bytes, stops, alerts, and step spend against the cap.
- Per segment: arm, goals reached of the horizon, ended, failure cause, layer, id, and sealed.
- The `system` bytes cell is a live check of O11: host-authored text is constant across goals, so a change flags a boundary leak in the run itself.
- rc-s1's first change appends a `denial` row per denied call on both arms through `buildStudyAgentToolDenial`, so the reader counts repeats per goal; on the records arm, the row for a repeat is written from `on.tool` on the ledger's `LEDGER_NOTES.repeat` failure, because `deny` never fires for it (`plan.md` O94).
- At each boundary, after the segment seals and before the next launch, run `study grade` over the sealed segment with `studies/qualification/rubric.json`, which `grade` projects to the manifest's goals (predicates only, no daemon; § Segment selection). The boundary grade reads one operational `ev-…-operational` criterion per goal, `critical` true: `achieved` when the observation holds a product and no failure and the attempt holds no failure, else `unsuccessful`; a partial product counts `achieved`, so `partial` stays a progress cell. Add that per-goal count to the progress line. The micro rung reads the same counts and the failing class's count from progress on `on` against `off`. A gate's semantic reading grades the same sealed result with `--rubric studies/endurance/rubric.json`, then `study label` and `study report`; blind model labelers label the packet, as `plan.md` Q30 rules and `designs/measurement.md` § Screens holds (route (a), O94).

The form of the line a session reads per segment, with illustrative values:

```text
rc-a9 records 3-8: 6/6 goals, 1 partial 0 empty, agent 14 calls 2.1 min, judge 21 calls 0.5 min, model 2.6/60, cached 0.71, system 1 msg 216 B, stops none, alerts none, sealed
```

- The reader is Study's `study progress` command (rc-st1), in Study 0.0.9 published before rc-a9's first segment (Q7). It calls the memory adapter's `progress` (`StudyMemoryAdapter#progress`, rc-a17) per listed goal; no throwaway reader serves in its place (rc-p3 is retired, `plan.md` § Sequence, Retired ids).
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
// readStudyProgress(directory: string, from?: string, project?: StudyProgressFunction): Promise<StudyProgress>
// study progress RESULT [--from GOAL] writes one JSON document under the 60-second command allowance.
```

`RESULT` is the result directory and `GOAL` the first goal id to list; without `--from`, each trial lists its last goal. The reader reads the manifest, every trial's `evidence.jsonl`, and any `attempt.json` one time each, skips a trailing line without LF, and never verifies or writes. It loads the adapter in a child as `study grade` does and calls `progress` per listed goal; a throwing projection refuses the command with `CONFIG`.

## Stops

Study ceilings and Agent ceilings keep their layers; an invariant failure ends the chain; curtailment ends only a treatment arm; every other signal is an alert read at the boundary (O20). No in-process quality guard ships in the first lineage (D39).

| Class | Threshold, written before the run | Layer | Acts | Evidence kept |
| --- | --- | --- | --- | --- |
| Study ceilings | the `q2` bounds: request 360000 ms and 1 call; goal 900000 ms and 512 calls; trial and series durations sized per lineage from the segment ceiling (§ Run shape); evidence bytes sized from the last sealed segment's checkpoint rows | `scope`, `window`, `custody` | at the crossing, inside the segment | rc-p2's table read a `scope` refusal, `record.duration`, and `record.calls` each as an interrupted result that cannot be graded, so every bound is a backstop that must never bind and carries headroom (`plan.md` O94) |
| Agent ceilings | the agent `limit` of 8 turns in `StudyMemorySession`, the window, the meter | `meter`, `budget`, `model` | per request | always |
| Step cap | the remaining cap funds the next segment's projection; the `record` allowances at twice the projection are a backstop that must never bind | a budget stop; a backstop stop reports Study's `scope` layer | by not launching the next segment | every executed segment seals |
| Invariant | exactly one `system` message, at index 0; every pinned sampling key present with its pinned value; `think` false; the model digest equals the pin; the closure fingerprint and the Node runtime equal across a gate's arms | none: "measurement invalid" | the chain ends at the boundary that reads it | the sealed segment stays evidence and is never a gate reading |
| Curtailment | rc-a11: `on`'s burst-49 judge calls exceed half of `off`'s, or a false retirement against the supersession list written before the run | none: "gate determined" | the treatment's next segment is not launched, only after the gate's bound arms sealed (`off`, `repeat`, and `sham` where the gate runs it); success is never curtailed | always |
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
- A request or micro rung draws on the cap of the step whose segment surfaced the failure. It is projected before launch like a segment and runs one arm per execution. Its reading is written before launch (micro: the failing class's per-goal count on `on` against `off`). It runs from a closure frozen with the fix, which opens another lineage, selects its goals and seed by `--trial`, `--goals`, and `--seed`, and writes nothing outside `tmp/studies/` (§ Run shape). When that step's remaining cap cannot fund the rung, the rung waits for the step's screen.
- The replay rung needs a sealed source. Study 0.0.9 refuses an interrupted result's offline replay with `CUSTODY` ("Execution inventory is incomplete") and refuses to grade or report an interrupted execution (the rc-p2 gate, 2026-10-31), so a failure that surfaces in an interrupted segment climbs from the fixture and hydrate rungs to the request rung.
- Stop an arm's chain when an invariant fails, an instrument defect leaves the remaining goals unmeasurable for the gate, a curtailment fires, or an accepted `src/` fix changes the arm's request bytes at or before the current goal.
- Let an arm continue when it is a bound arm the fix does not touch, or when the alert is the subject model's own behavior.
- `plan.md` § Parallelism holds the line on what runs beside a segment.

## Replay and pins

- In Study 0.0.7 a screen relies on hydration seeds, which are state and survive a Node patch, a runner update, and a build change; on positional offline replay of a sealed recording for the replay rung, on the recording's exact Node runtime (`guides/study.md` § Native command); and on a live judge on one daemon pin within a screen, where the `repeat` arm folds judge noise into N.
- The live-judge irreproducibility of `research/evidence.md` § Prior-campaign readings holds across lineages, and no gate spans two lineages.
- After rc-st2, a screen serves judge requests by request-body key from a sealed recording, misses live, which pairs every arm on one judge draw.
- Rely on no bit-stable generation: identical request bodies matched the sealed product at 3 of 12 checkpoints (`research/evidence.md` § Prior-campaign readings, prefix replay), temperature 0 is not batch-invariant (C49), and llama.cpp's server documents that, depending on the backend, `cache_prompt` logits are "not guaranteed" bit-for-bit identical across batch sizes (C50).
- A lineage is the chain of segments that share one Node patch, one daemon pin, and one closure per arm profile; one opens at rc-a9's first segment and at each S7 screen's first segment, and a daemon change or a fix between segments opens a separate one (`tenets.md` § Host; O30).
- Pin three things per lineage, as the user ruled Q8 and Q9 on 2026-10-31: the Node 22 patch, the most recent Node 22 release at the lineage's start, held through the last replay of that lineage's recordings (amending O18 for the window); the Ollama daemon, its executable digest, version, and model digests in the profile's `daemon` member, which Study verifies before every trial, screened for the most recent stable release only at a lineage start; and one closure fingerprint across the arms of each gate.
- A Node patch that lands mid-lineage voids that lineage's replay rung and nothing else: the hydrate rung and every seed survive.
- Rebuild the runner pin and its launch route before the first GPU step, a named prerequisite of rc-a15, because no tracked record names a route and no earlier pin survives. Read the most recent stable Ollama release and the `ollama` npm client from the GitHub releases and the registry at each GPU phase, never from the CLI; a later stable is adopted with no further question, as a runner pin and a screen that opens a lineage (`tenets.md` § Host; `plan.md` O72).
- The runner route (`plan.md` O94), read 2026-11-02 and pending at each GPU phase. The tag selects the release and the bare `/api/version` string is the identity, so the probe's first start declares the tag minus `v`, and a `version` refusal reports the received value. The pin is the installed `ollama-full` 0.40.13, named by its version directory, never its `current` junction, with no package-manager command run. When a later stable has no such directory, the release's archive is fetched into an empty directory under `tmp/studies/runner/`, its SHA-256 checked before unpacking, and nothing spawned from it except the pinned `serve`. A receipt under the same folder holds the tag, the release date, the bare version, the executable as the exact string `realpathSync` returns, its SHA-256, the route, the client version, and the Node version, and the screen adds the digests, `/api/show` per served digest, and the 2B gauge. `q2.json` holds that executable string JSON-escaped, a machine path D80 holds open. Node 22 is held by its physical directory, `22.23.4` at this reading, and each run record compares `process.version` and `process.execPath`. The daemon's environment is `OLLAMA_NUM_PARALLEL=1`, `OLLAMA_MAX_LOADED_MODELS=0`, `LLAMA_ARG_CONTEXT_SHIFT=0`, and `OLLAMA_NOPRUNE=1`.
- The first-lineage screen passed on 2026-11-02 on the `ollama-full` 0.40.13 pin at 0.158 of 2 model minutes, and the 2B gauge reads scale 0.8275862068965517 and overhead 354 (`plan.md` O97). The first-lineage screen (`plan.md` O94; `designs/measurement.md` § GPU allowance, row runner screen) proves the pinned runner before any capped step spends and supplies what `q2` needs: rc-s1's first change writes `provider.daemon` and the measured `settings.gauge` one time from its receipt, and its digest, stored parameters, and version come from `/api/tags`, `/api/show`, and `/api/version` on port 11435, never from under the user's `.ollama` folder. A dated `ledger.md` line before the launch names the runner, the port, the 2-minute cap, and a possible 2B pull, and waits for no answer. Phase A, at zero model minutes, verifies all three digests, and a moved 4B or Mica digest stops the route; an absent 2B is pulled by exact name on port 11435, which adds blobs and removes none. Phase B serves 2B and Mica: one short chat each, `/api/show` per digest, and one gauge on 2B through `Ledger.calibrate`, with `num_predict` at 16 because the gauge reads only `usage.prompt`, an abort deadline on each request, and a running sum of `total_duration` that stops at 2 minutes. It passes when the executable digest is unchanged, stop is confirmed, `/api/version` equals the receipt's version, each reply is non-empty, and GPU memory and the `ollama` process count return to their readings before the screen; a failure stops the route, with no retry chain. 4B's half runs at the lineage start before the first larger-model check, on the same pin as an extension of Phase B and on a changed pin as a whole screen. A same-pin lineage start reads the releases only, at zero model minutes, and a changed pin repeats the whole screen, the per-pin reading of Q9 listed for the user to reopen.

## Units

Each unit's row in `plan.md` § Sequence names its step, role, owned files, and dependencies; this table holds its acceptance, cheap first.

| Unit | Builds | Acceptance | Promotion and removal |
| --- | --- | --- | --- |
| rc-p2 | a throwaway custody probe over a protocol-faithful loopback Ollama fixture, never on port 11434 or 11435, with its scratch consumer (a declaration, the bundle, `package.json`, and `dist`) under `tmp/probes/custody/` and the executable run from there | typecheck; the fixture drives 3 goals with `record` and `observe`; control: a complete run seals and `study grade` exits 0; per class (a scope bound refusing before dispatch, a trial deadline mid-request, `record.duration` exhausted, `record.calls` exhausted, a consumer `content` throw, a kill of the recorded process id): the seal, the `study grade` exit, and the exit of an offline replay; a second process reads `evidence.jsonl` between appends, and the report records whether rows are visible before the sink syncs; `fs.watch` event counts on both files; under the local Study 0.0.9 tarball pin of the pre-publish consumer gate (`plan.md` § Release), a `--trial`, a `--goals`, and a `--seed` execution each seal, grade, and report | its table feeds rc-s1's first change, and its fixture feeds the pre-publish consumer gate's `study progress` reading; the probe and its scratch consumer are deleted before the unit returns |
| rc-a17 | end-of-goal `checkpoint` rows, the hydrate from the checkpoint value Study hands to the session at `open` (rc-st3), the memory adapter's `progress` (`StudyMemoryAdapter#progress`) over rc-st1's `StudyProgressTarget`, the checkpoint cap moved from the validator to the adapter's check of the scenario horizon, the every-goal `settings.checkpoints` list in `studies/memory/profiles/q2.json`, and the committed `readMemorySeedRequests` and `compareMemorySeed` in `tests/setupStudy.ts`, whose thin wrapper under `tmp/studies/` is deleted after the campaign's last segment seals (`plan.md` O94) | typecheck; the checkpoint row is appended after the `result` row when no request is in flight; the checkpoint cap is the scenario horizon, checked by the adapter, and `study check endurance --profile q2` and `study check qualification --profile q2`, with its `--trial` and `--goals ev-01-1..ev-24-4`, exit 0 with a checkpoint id per goal, while `study check memory --profile q2` refuses as expected; a CPU round trip with a scripted provider: goals 1 to 4 with checkpoints sealed, and a session opened with the checkpoint row of goal 2 sends a goal-3 first request byte-identical to the uninterrupted run's on both arms; controls: `failures` emptied differs, and the gauge removed adds a calibration request; a seeded session given an arrival from before its seed throws `Source arrival was replayed within a trial`, and a mutation that skips the arrivals seat makes that case fail because nothing throws; the adapter's `progress` over a fixture target returns calls, usage, product flags, lookups, repeats, system bytes, and cache share, and a goal without rows returns absent keys; `study progress` over a sealed scripted result lists the adapter's reading per goal; `test:studies` green | stays in `studies/memory`; seed custody is Study's (rc-st3) |
| rc-p4 | a throwaway contention probe, only when the user grants Q10 | the gate is written first: offer the exception only when the median per-request `total` beside one `test:studies` run, with `OLLAMA_HOST` at `http://127.0.0.1:1`, is within 5% of quiet, and replies agree as often as quiet repeats agree; cap 3 model minutes inside the rc-a9 probe cap | deleted after its reading |
| rc-st1 | `study progress` in `@orkestrel/study`: the shapes of § Progress, `readStudyProgress`, and the adapter's optional `progress` | an interrupted fixture reads every complete row and skips a trailing line without LF; a sealed fixture reads `ended` and the failure; a real child appends while the reader reads; an adapter without `progress` yields an undefined reading; a generated 77-goal observed result with a checkpoint row per goal reads, and the report records the duration; a result whose goal rows exceed one frame reads completely, because the reader batches goals so no adapter frame exceeds the frame limit; an unknown flag exits 64; the project tests and guide parity; a mutation that keeps the partial line fails. It accepts on Study's own fixtures; the pre-publish consumer gate (`plan.md` § Release) then reads it over rc-p2's custody fixture and a scripted memory run, where the per-goal usage equals a hand count of wire rows and the summed `total` equals Σ `timing.total`, with no Agent GPU segment | ships in Study 0.0.9, published before rc-a9's first segment (Q7, O30) |
| rc-st2 | keyed role replay in `@orkestrel/study`, written only when rc-a9's first records segments project a records screen over its cap with a live judge | `--replay RESULT --roles ROLES --offline true|false`, with `ROLES` a JSON role list, is exclusive with `--prefix` and `--extend`; a listed role's request whose path, method, and body bytes equal a recorded attempt's is served and marked replayed; a miss sends live under `--offline false` or refuses before send under `--offline true`; a tampered served row refuses custody; a mutation that drops the role filter serves an agent request; progress counts `replayed`; keyed mode needs no equal Node runtime | ships in Study 0.0.10 when written, published before the first records screen (Q7); else D48 |
| rc-st3 | segment selection and seed custody in `@orkestrel/study` (§ Segment selection): the command parser and types, the schedule projection in the execution path, the manifest `selection` record, custody verification of a selected schedule, the rubric projection in `grade` and the `unselected` partition in `report`, and seed reading with the `open` argument on the driver and session contracts | a fixture study runs one trial of a multi-trial schedule, a goal range inside a longer scenario, and a seed from a sealed fixture result, each sealing, grading, and reporting, with no `NaN` on the wire for an arm or repetition that holds no scheduled trial; a seed without `--trial` opens the one scheduled trial and refuses `CONFIG` on a schedule of more than one; a wrong seal, a missing row, an unknown trial, and an empty or reversed range refuse `CONFIG` or `CUSTODY` before any request; the project tests and guide parity; a mutation that drops the schedule projection fails `computeStudyScores`. It accepts on Study's own fixtures; rc-p2's selector cases run in the pre-publish consumer gate (`plan.md` § Release) | ships in Study 0.0.9, served before rc-a9's first segment (O30); published 2026-10-31, so D49 is closed (O75) |

## Deferred

Each item's trigger lives in `plan.md` § Deferred.

- An in-process quality guard in the memory driver, tripping the `content` cause before the next goal (D39).
- A Study model-time limit summing `total_duration` (D41).
- A Study cause for a planned stop, so curtailment can end a trial in-process and seal (D43).
- An event-driven milestone waiter (D44).
- Sequential or anytime-valid promotion stops (D45).
- Live semantic labeling during a run (D46).
- One CPU lane beside a GPU segment (D47), dormant: the user ruled Q10 no (O75).
- Keyed role replay after the campaign (D48).
- The scratch-root closure route, a consumer root under `tmp/studies/scratch/<lineage>/` (D49), closed: Study 0.0.9 is served (O75).
- Seed custody (D40) and a trial selector (D42) closed into rc-st3 (O30).
