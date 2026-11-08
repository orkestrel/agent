# Agent studies

The current strategy is the records strategy as the `recommended` profile composes it. To build on it, read [The current strategy](#the-current-strategy), then [Using it in an application](#using-it-in-an-application).

## What's here

The `@orkestrel/study` package fixes the shape: `studies/<name>/study.json` declares a study with its rubric, and `studies/<driver>/` holds a driver bundle with its scenarios, its profiles, and its `index.ts`. Several studies can share one bundle. The following table lists each study:

| Study           | Driver   | Purpose   | What it's for                                                                                                     |
| --------------- | -------- | --------- | ----------------------------------------------------------------------------------------------------------------- |
| `capacity`      | `memory` | capacity  | Whether a profile completes the `handoff` desk trajectory within its bounds.                                      |
| `chat`          | `chat`   | mechanism | Whether the sealed conversations retain stated values, corrections, lookups, and previous replies.                |
| `context`       | `tools`  | mechanism | Whether the built Agent carries a memo set and a skill registry across conversations, loads, and scopes.          |
| `endurance`     | `memory` | quality   | How records and compaction compare over the whole public endurance workload.                                      |
| `memory`        | `memory` | quality   | How records, compaction, and the full conversation keep corrections and obligations on the `handoff` trajectory.  |
| `qualification` | `memory` | capacity  | Whether the selected profile completes the endurance workload. Every long run in this repository goes through it. |
| `tools`         | `tools`  | mechanism | Whether the built Agent dispatches and refuses real tools, aborts declared work, and isolates repeated trials.    |

The following table lists each driver bundle:

| Bundle            | What it's for                                                                                             |
| ----------------- | --------------------------------------------------------------------------------------------------------- |
| `studies/memory/` | The records, compaction, and full-conversation arms over a support desk, with their session and profiles. |
| `studies/chat/`   | The sealed chat battery over fresh ledgers with one Mica judge and three ledger capacities.               |
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

| Piece                              | What it does                                                                                                                                                                                                                                                                                                        | Where it shows                                                                                                               |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Agent on the GPU, judge on the CPU | The agent model stays on the GPU and the judge runs with `num_gpu: 0`, because both don't fit one small GPU and a swap costs more than the CPU's slower asks.                                                                                                                                                       | `settings.judge` in `profiles/recommended.json`; `buildStudyMemoryRoles` in `memory/helpers.ts`                              |
| Two-step judge                     | `tev1` answers category questions through Study's `triage` transport role, with verification, charging, and recorded custody. Its answer stands at a raw winning probability of 0.65 or more unless it says correction. Mica answers the other questions and semantic referrals. A transport fault fails the trial. | `memory/StudyMemoryJudge.ts`; `STUDY_MEMORY_POLICY` in `memory/constants.ts`; `provider.triage` and `provider.digest.triage` |
| Window layout                      | Each prompt holds each completed exchange as it was sent, then a copy of the request with only the record lines those exchanges don't hold. This is the ledger's own behavior, with nothing to configure.                                                                                                           | `Ledger#plan` in `src/core/ledgers/Ledger.ts`                                                                                |
| `recall` offer                     | A request is offered `recall` only when something it could return is out of the prompt. This is the ledger's own behavior too.                                                                                                                                                                                      | `hasHiddenRecall` in `src/core/ledgers/helpers.ts`                                                                           |
| `capacity`, `predict`, and `share` | The session passes `capacity` as the context less its safety margin, 19968 here, `predict` as the output cap, 8192 here, thinking off, and `share` as `{ prompt: 1, tail: 0.35 }`.                                                                                                                                  | `room` in `profiles/recommended.json`; the `createLedger` call in `memory/StudyMemorySession.ts`                             |
| Filing cutoffs                     | The session passes the cutoffs fitted on `LEDGER_QUESTIONS` and these judges.                                                                                                                                                                                                                                       | `STUDY_MEMORY_THRESHOLDS` in `memory/constants.ts`                                                                           |

## Using it in an application

`AGENTS.md` bars `src` and `app` from importing `studies/`, so an application imports nothing from here. The following list says where each piece comes from instead:

- The ledger's behavior comes with `@orkestrel/agent`: the records, the window, and the `recall` offer.
- The judge on the CPU is one option on the `createOllamaJudge` function of `@orkestrel/ollama`.
- The two-step judge is the application's to compose on the public `JudgeInterface` interface, with `studies/memory/StudyMemoryJudge.ts` as the worked example to adapt. Its mechanism moves to Agent core when the first application composes it, and its thresholds and model names stay in the application (ruling O193, in `.orkestrel/agent/plan.md` at commit `db86a3eb`).

- A judge choosing the tools, instructions, memos, or skills of a request is the application's to compose on the `narrow` method of its scope. The recipe's last paragraph states what that costs.

For the recipe and its tested fence, see [Composing a records desk for a small local GPU](../guides/agent.md#composing-a-records-desk-for-a-small-local-gpu).

## What it measured

The last row is the current strategy. Each cell is one read on one host, on the 4B agent model and runner 0.40.15, so it reports what that host read and nothing about another. Rulings O187 to O199, in `.orkestrel/agent/plan.md` at commit `db86a3eb`, hold each reading. First text and recall read a chat battery sealed before any arm ran, and first token and mechanical results read goals `ev-01-1` to `ev-04-4`:

| Arm                                                  | Read on                               | First text in a chat, median | Recall at the last turn, two or three back, and further back | First token on a long goal, median | Mechanical results |
| ---------------------------------------------------- | ------------------------------------- | ---------------------------- | ------------------------------------------------------------ | ---------------------------------- | ------------------ |
| Agent 0.0.36, as installed                           | 2026-11-07                            | 2.34 s                       | 0 of 58 in all                                               | not read                           | not read           |
| Records, judge on the GPU                            | 2026-11-06                            | not read                     | not read                                                     | 23.9 s                             | 16 of 16           |
| Records, judge on the CPU                            | chat 2026-11-07, long goal 2026-11-06 | 2.77 s                       | 7 of 11, 12 of 23, and 6 of 24                               | 14.5 s                             | 16 of 16           |
| Adding the two-step judge                            | 2026-11-06                            | not read                     | not read                                                     | 10.2 s                             | 16 of 16           |
| Adding the window (`c9a651b2`)                       | 2026-11-07                            | 1.24 s                       | 10 of 11, 21 of 23, and 20 of 24                             | 10.0 s                             | 16 of 16           |
| Offering `recall` only when it can help (`513a9a31`) | 2026-11-07                            | 0.42 s                       | 10 of 11, 22 of 23, and 22 of 24                             | 10.5 s                             | 16 of 16           |
| Fitting `recall` to the measured room (`c915224d`)   | 2026-11-07                            | 0.42 s                       | 10 of 11, 22 of 23, and 22 of 24                             | 10.4 s                             | 16 of 16           |

Offering `recall` only when it can help took answers both right and free of a denial from 30 to 47 of 58, and `recall` calls from 0.73 to 0.01 per follow-up, on 2026-11-07.

The last step changes nothing at this profile's capacity and is for a host with less room. `recall` used to close whenever the room under `predict` fell below twice the longest reply the ledger had seen; it now fits whole results into the room the request's own prompt leaves. At a capacity of 1600 with 1024 of it reserved for output, the battery read on 2026-11-07 7 of 11, 9 of 23, and 9 of 24, against 5 of 11, 2 of 23, and 1 of 24 before that step, and 3 of 11, 4 of 23, and 1 of 24 before the one ahead of it, while the follow-up `Make that shorter.` keeps its exchange in 6 of 6. A host with that little room still recalls less than one with room to spare.

Two readings of 2026-11-07 rule options out. A judge narrowing a request to its desk area's tools doesn't help the 4B model: with all 36 tools of a fictional catalog offered it chose right on 42 of 42 requests, and narrowed to the known area's 6 it chose right on 35 of 42, answering some requests in text with no call, though its prompt fell from 2416 to 699 tokens. Correction narrowing (`settings.correction.narrow`) read no change on these goals: 47 judge calls with it and without, with byte-identical results.

The `chat` study is that battery, tracked. On 2026-11-08, on the 0.0.38 build and the same runner, its 102 graded rows matched the battery's last reading row for row at each of its three capacities, primary, denial, and older-value outcomes alike, with follow-up first text at a median of 0.42, 0.43, and 1.78 s against the battery's 0.42, 0.43, and 1.80 s.

## Running it

The `recommended` profile pins its runner in `provider.daemon`: Ollama 0.40.15 by version and executable digest, on its own port 11435, with each model's digest, including `tev1`. Study starts and verifies that daemon for an execution. Its transport verifies the provider's agent, judge, and triage pins against inventory before and after the trial. The triage leg uses `/v1/systemone`; its metadata verification and daemon maintenance use the same Ollama routes as the other roles. Build the package first with `npm run build`, because the profile runs `dist/src/core/index.js`.

The following commands freeze, check, record, and grade one segment of the records arm, whose trial is `r1-s1-a1`. `ABSOLUTE_CLOSURE_PATH` is a canonical absolute path to a new directory under this repository's `tmp/`, with an existing parent. A freeze admits a destination inside a profile root but refuses one under `dist`, an existing destination, or a relative path. `STEM` names the result:

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

The profile declares `record` allowances of 512 MiB, 4096 calls, and 2400000 ms per trial. Both judge legs, inventory verification, and daemon maintenance enter custody. Offline replay checks the retained request bytes and makes no sends; message ids are local to each Agent run.

A continuation needs an ancestor that completed its entire schedule. Record that ancestor separately, without `--trial`, `--goals`, or `--seed`:

```sh
npx study execute qualification --profile recommended --closure ABSOLUTE_CLOSURE_PATH --out tmp/studies/complete
```

After appending goals to the scenario horizon, freeze the grown declaration to a new `ABSOLUTE_GROWN_CLOSURE_PATH`. Keep the earlier goals, schedule, code, provider pins, and profile settings unchanged. Pass the absolute path printed for the complete ancestor as `ABSOLUTE_ANCESTOR_PATH`:

```sh
npx study freeze qualification --profile recommended --to ABSOLUTE_GROWN_CLOSURE_PATH
npx study execute qualification --profile recommended --closure ABSOLUTE_GROWN_CLOSURE_PATH --extend ABSOLUTE_ANCESTOR_PATH --out tmp/studies/continued
```

Study replays the ancestor's retained prefix and sends only the appended goals, with the owned daemon's maintenance retained as well. Segmented selectors cannot accompany `--extend`; an unchanged horizon is not an extension.

## Running the chat instrument

The `chat` mechanism study preserves 38 conversations, 294 requests, and 102 primary mechanical checks. Its profiles are `full` (ledger capacity 19968), `compact` (2400), and `tight` (1600). The agent context remains 20480 and its output limit 1024 in all three. Each profile composes Mica alone and pins the same runner and model identities. See [Chat source and treatment](chat/sources/README.md) for provenance, the original-to-scenario mapping, effective wire policies, allowances, and grading semantics. No model reading of this Study bundle is recorded yet.

Build the package before freezing because the profiles load `dist/src/core/index.js`. The following commands freeze, check, and record the full schedule; replace `full` with the chosen capacity profile. `ABSOLUTE_CHAT_CLOSURE_PATH` names a new absolute directory under `tmp/` with an existing parent, and `STEM` names the result.

```sh
npx study freeze chat --profile full --to ABSOLUTE_CHAT_CLOSURE_PATH
npx study check chat --profile full --closure ABSOLUTE_CHAT_CLOSURE_PATH
npx study execute chat --profile full --closure ABSOLUTE_CHAT_CLOSURE_PATH --out tmp/studies/STEM
```

Grade and report through the captured entry from the closure's directory. `ABSOLUTE_RESULT_PATH` is the path printed by execution, and `ASSESSMENT_ID` is the identity printed by grading.

```sh
cd ABSOLUTE_CHAT_CLOSURE_PATH
node --experimental-strip-types node_modules/@orkestrel/study/dist/bin/main.js grade ABSOLUTE_RESULT_PATH --rubric ABSOLUTE_CHAT_CLOSURE_PATH/studies/chat/rubric.json
node --experimental-strip-types node_modules/@orkestrel/study/dist/bin/main.js report ABSOLUTE_RESULT_PATH --assessment ASSESSMENT_ID
```

Study's generic report includes the separate diagnostic and completion criteria. For the battery's 102-row primary denominator and latency reading, use the tested `buildStudyChatSummary` consumer in `chat/helpers.ts` with the verified assessment, rubric, scenarios, and evidence returned by Study's `collectStudyEvidence` helper. Its rows preserve original conversation ids and turn numbers for external pairing. Offline replay checks custody without model sends and contributes no first-text timing.
