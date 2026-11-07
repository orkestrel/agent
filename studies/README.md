# Agent studies

The current strategy is the records strategy as the `recommended` profile composes it. To build on it, read [The current strategy](#the-current-strategy), then [Using it in an application](#using-it-in-an-application).

## What's here

The `@orkestrel/study` package fixes the shape: `studies/<name>/study.json` declares a study with its rubric, and `studies/<driver>/` holds a driver bundle with its scenarios, its profiles, and its `index.ts`. Several studies can share one bundle. The following table lists each study:

| Study           | Driver   | Purpose   | What it's for                                                                                                     |
| --------------- | -------- | --------- | ----------------------------------------------------------------------------------------------------------------- |
| `capacity`      | `memory` | capacity  | Whether a profile completes the `handoff` desk trajectory within its bounds.                                      |
| `context`       | `tools`  | mechanism | Whether the built Agent carries a memo set and a skill registry across conversations, loads, and scopes.          |
| `endurance`     | `memory` | quality   | How records and compaction compare over the whole public endurance workload.                                      |
| `memory`        | `memory` | quality   | How records, compaction, and the full conversation keep corrections and obligations on the `handoff` trajectory.  |
| `qualification` | `memory` | capacity  | Whether the selected profile completes the endurance workload. Every long run in this repository goes through it. |
| `tools`         | `tools`  | mechanism | Whether the built Agent dispatches and refuses real tools, aborts declared work, and isolates repeated trials.    |

The following table lists each driver bundle:

| Bundle            | What it's for                                                                                             |
| ----------------- | --------------------------------------------------------------------------------------------------------- |
| `studies/memory/` | The records, compaction, and full-conversation arms over a support desk, with their session and profiles. |
| `studies/tools/`  | One agent over real scratch tools, with its one `local` profile.                                          |

The following table lists the memory profiles under `studies/memory/profiles/`:

| Profile       | What it is                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| `recommended` | The current strategy, on the 4B agent model. It was formerly `q4`, the name the plan's history uses.   |
| `smallest`    | The smallest model's gate, on the 2B agent model with the judge sharing the GPU. It was formerly `q2`. |
| `narrow`      | `smallest` with correction narrowing.                                                                  |
| `local`       | The unpinned default template, whose `REQUIRED_` values are placeholders a host fills.                 |

## The current strategy

Use the records strategy, the `createLedger` function of `@orkestrel/agent`, composed as `recommended.json` and `StudyMemorySession.ts` compose it. The following table gives each piece and the file that shows it:

| Piece                              | What it does                                                                                                                                                                                                                                                                                     | Where it shows                                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Agent on the GPU, judge on the CPU | The agent model stays on the GPU and the judge runs with `num_gpu: 0`, because both don't fit one small GPU and a swap costs more than the CPU's slower asks.                                                                                                                                    | `settings.judge` in `profiles/recommended.json`; `buildStudyMemoryRoles` in `memory/helpers.ts`  |
| Two-step judge                     | `tev1`, the triage judge, answers the category question first. Its answer stands at a raw winning probability of 0.65 or more unless it says correction. Mica answers every other question and each category answer that triage doesn't keep. A fault of `tev1` refers its question to Mica too. | `memory/StudyMemoryJudge.ts`; `STUDY_MEMORY_POLICY` in `memory/constants.ts`; `settings.triage`  |
| Window layout                      | Each prompt holds each completed exchange as it was sent, then a copy of the request with only the record lines those exchanges don't hold. This is the ledger's own behavior, with nothing to configure.                                                                                        | `Ledger#plan` in `src/core/ledgers/Ledger.ts`                                                    |
| `recall` offer                     | A request is offered `recall` only when something it could return is out of the prompt. This is the ledger's own behavior too.                                                                                                                                                                   | `hasHiddenRecall` in `src/core/ledgers/helpers.ts`                                               |
| `capacity`, `predict`, and `share` | The session passes `capacity` as the context less its safety margin, 19968 here, `predict` as the output cap, 8192 here, thinking off, and `share` as `{ prompt: 1, tail: 0.35 }`.                                                                                                               | `room` in `profiles/recommended.json`; the `createLedger` call in `memory/StudyMemorySession.ts` |
| Filing cutoffs                     | The session passes the cutoffs fitted on `LEDGER_QUESTIONS` and these judges.                                                                                                                                                                                                                    | `STUDY_MEMORY_THRESHOLDS` in `memory/constants.ts`                                               |

## Using it in an application

`AGENTS.md` bars `src` and `app` from importing `studies/`, so an application imports nothing from here. The following list says where each piece comes from instead:

- The ledger's behavior comes with `@orkestrel/agent`: the records, the window, and the `recall` offer.
- The judge on the CPU is one option on the `createOllamaJudge` function of `@orkestrel/ollama`.
- The two-step judge is the application's to compose on the public `JudgeInterface` interface, with `studies/memory/StudyMemoryJudge.ts` as the worked example to adapt. Its mechanism moves to Agent core when the first application composes it, and its thresholds and model names stay in the application (`.orkestrel/agent/plan.md` O193).

For the recipe and its tested fence, see [Composing a records desk for a small local GPU](../guides/agent.md#composing-a-records-desk-for-a-small-local-gpu).

## What it measured

The last row is the current strategy, read on 2026-11-07. Each cell is one read on one host, on the 4B agent model and runner 0.40.15, so it reports what that host read and nothing about another. `.orkestrel/agent/plan.md` O187 to O194 holds each reading. First text and recall read a chat battery sealed before any arm ran, and first token and mechanical results read goals `ev-01-1` to `ev-04-4`:

| Arm                                     | First text in a chat, median | Recall at the last turn, two or three back, and further back | First token on a long goal, median | Mechanical results |
| --------------------------------------- | ---------------------------- | ------------------------------------------------------------ | ---------------------------------- | ------------------ |
| Agent 0.0.36, as installed              | 2.34 s                       | 0 of 58 in all                                               | not read                           | not read           |
| Records, judge on the GPU               | not read                     | not read                                                     | 23.9 s                             | 16 of 16           |
| Records, judge on the CPU               | 2.77 s                       | 7 of 11, 12 of 23, and 6 of 24                               | 14.5 s                             | 16 of 16           |
| Adding the two-step judge               | not read                     | not read                                                     | 10.2 s                             | 16 of 16           |
| Adding the window                       | 1.24 s                       | 10 of 11, 21 of 23, and 20 of 24                             | 10.0 s                             | 16 of 16           |
| Offering `recall` only when it can help | 0.42 s                       | 10 of 11, 22 of 23, and 22 of 24                             | 10.5 s                             | 16 of 16           |

That last step took answers both right and free of a denial from 30 to 47 of 58, and `recall` calls from 0.73 to 0.01 per follow-up.

The weakest reading is a capacity far below this profile's. At a capacity of 1600 with 1024 of it reserved for output, the same battery reads 5 of 11, 2 of 23, and 1 of 24, against 3 of 11, 4 of 23, and 1 of 24 before that step. On the two dialogues traced at that capacity, every `recall` call answered that `recall` was closed for lack of room, because the reply reserve keeps the longest reply seen. A host with that little room can't rely on `recall`.

## Running it

The `recommended` profile pins its runner in `provider.daemon`: Ollama 0.40.15 by version and executable digest, on its own port 11435, with each model's digest. The Study package starts and verifies that daemon for an execution. It doesn't pin `tev1`'s runner, so the session checks that model's digest against the daemon's inventory. Build the package first with `npm run build`, because the profile runs `dist/src/core/index.js`.

The following commands freeze, check, execute, and grade one segment of the records arm, whose trial is `r1-s1-a1`. `ABSOLUTE_CLOSURE_PATH` is a directory outside this repository, because a freeze refuses a destination inside one of the profile's roots and a relative path, and `STEM` names the result:

```sh
npx study freeze qualification --profile recommended --to ABSOLUTE_CLOSURE_PATH
npx study check qualification --profile recommended --closure ABSOLUTE_CLOSURE_PATH --trial r1-s1-a1 --goals ev-01-1..ev-04-4
npx study execute qualification --profile recommended --closure ABSOLUTE_CLOSURE_PATH --trial r1-s1-a1 --goals ev-01-1..ev-04-4 --out tmp/studies/STEM
```

Grade a closure's result through the closure's own entry, from the closure's root, with absolute paths, because the repository's entry refuses a closure's roots. `ABSOLUTE_RESULT_PATH` is the `path` member `study execute` prints:

```sh
cd ABSOLUTE_CLOSURE_PATH
node --experimental-strip-types node_modules/@orkestrel/study/dist/bin/main.js grade ABSOLUTE_RESULT_PATH --rubric ABSOLUTE_CLOSURE_PATH/studies/qualification/rubric.json
```

The session refuses to record while `settings.triage` is set, so this profile declares no `record`, and exchanges, replay, and `--extend` don't apply to it.
