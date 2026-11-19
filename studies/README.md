# Agent studies

The current strategy is the records strategy as the `recommended` profile composes it. To build on it, read [The current strategy](#the-current-strategy), then [Using it in an application](#using-it-in-an-application).

## What's here

The `@orkestrel/study` package fixes the shape: `studies/<name>/study.json` declares a study with its rubric, and `studies/<driver>/` holds a driver bundle with its scenarios, its profiles, and its `index.ts`. Several studies can share one bundle. The following table lists each study:

| Study           | Driver   | Purpose   | What it's for                                                                                                                                |
| --------------- | -------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `chat`          | `chat`   | mechanism | Whether the sealed conversations retain stated values, corrections, lookups, and previous replies.                                           |
| `disclosure`    | `desk`   | mechanism | Which way of showing a 36-tool desk catalog lets the model call the tool each of 42 requests needs.                                          |
| `capacity`      | `memory` | capacity  | Whether a profile completes the `handoff` desk trajectory for records and the full conversation within its bounds.                           |
| `endurance`     | `memory` | quality   | How records keep work, corrections, and obligations over the whole public endurance workload, against no memory.                             |
| `memory`        | `memory` | quality   | How records and the full conversation keep corrections and obligations on the `handoff` trajectory.                                          |
| `qualification` | `memory` | capacity  | Whether the selected profile completes the endurance workload for records and its no-memory control. Every long records run goes through it. |

Each study on the `memory` driver schedules records beside one control. `capacity` and `memory` use `full`, the whole conversation. `qualification` and `endurance` use `plain`, where each goal opens a fresh conversation holding only its own arrivals and prompt. Every arm reads the same released reference snapshots through `lookup`, so `plain` isolates conversational memory alone. The adapter refuses a memory declaration that lists no records arm, or an arm the driver doesn't implement. Each quality study is qualified by its capacity study: `memory` by `capacity`, and `endurance` by `qualification`.

The following table lists each driver bundle:

| Bundle            | What it's for                                                                                |
| ----------------- | -------------------------------------------------------------------------------------------- |
| `studies/memory/` | The records and full-conversation arms over a support desk, with their session and profiles. |
| `studies/chat/`   | The sealed chat battery over fresh ledgers at three ledger capacities, with no judge model.  |
| `studies/desk/`   | The desk catalog's two disclosure arms over bare agents, with its one `screen` profile.      |

The following table lists the memory profiles under `studies/memory/profiles/`. Each names, as its `qualification`, the capacity result its quality study pairs with:

| Profile       | What it is                                                                                                                                                                             | Its studies                  |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `recommended` | The current strategy, on the 4B agent model.                                                                                                                                           | `qualification`, `endurance` |
| `local`       | The unpinned default template, whose `REQUIRED_` values are placeholders a host fills. The test fixtures fill it. It observes, as `recommended` does, so its `wire` rows carry timing. | `capacity`, `memory`         |

## The current strategy

Use the records strategy, the `createLedger` function of `@orkestrel/agent`, composed as `recommended.json` and `StudyMemorySession.ts` compose it. The following table gives each piece and the file that shows it:

| Piece                              | What it does                                                                                                                                                                                                                                                                                                        | Where it shows                                                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Agent on the GPU, judge on the CPU | The agent model stays on the GPU and the judge runs with `num_gpu: 0`, because both don't fit one small GPU and a swap costs more than the CPU's slower asks.                                                                                                                                                       | `settings.judge` in `profiles/recommended.json`; `buildStudyMemoryRoles` in `memory/helpers.ts`                                     |
| Two-step judge                     | `tev1` answers category questions through Study's `triage` transport role, with verification, charging, and recorded custody. Its answer stands at a raw winning probability of 0.65 or more unless it says correction. Mica answers the other questions and semantic referrals. A transport fault fails the trial. | `memory/judges/StudyMemoryJudge.ts`; `STUDY_MEMORY_POLICY` in `memory/constants.ts`; `provider.triage` and `provider.digest.triage` |
| Window layout                      | Each prompt holds each completed exchange as it was sent, then a copy of the request with only the record lines those exchanges don't hold. This is the ledger's own behavior, with nothing to configure.                                                                                                           | `Ledger#plan` in `src/core/ledgers/Ledger.ts`                                                                                       |
| `recall` offer                     | A request is offered `recall` only when something it could return is out of the prompt. This is the ledger's own behavior too.                                                                                                                                                                                      | `hasHiddenRecall` in `src/core/ledgers/helpers.ts`                                                                                  |
| `capacity`, `predict`, and `share` | The session passes `capacity` as the context less its safety margin, 19968 here, `predict` as the output cap, 8192 here, thinking off, and `share` as `{ prompt: 1, tail: 0.35 }`.                                                                                                                                  | `room` in `profiles/recommended.json`; the `createLedger` call in `memory/sessions/StudyMemorySession.ts`                           |
| Filing cutoffs                     | The session passes prospective filing cutoffs for `LEDGER_QUESTIONS` and these judges. They are not calibrated quality claims.                                                                                                                                                                                      | `STUDY_MEMORY_THRESHOLDS` in `memory/constants.ts`                                                                                  |

## Using it in an application

`AGENTS.md` bars `src` and `app` from importing `studies/`, so an application imports nothing from here. The following list says where each piece comes from instead:

- The ledger's behavior comes with `@orkestrel/agent`: the records, the window, and the `recall` offer.
- The judge on the CPU is one option on the `createOllamaJudge` function of `@orkestrel/ollama`.
- The two-step judge is the application's to compose on the public `JudgeInterface` interface, with `studies/memory/judges/StudyMemoryJudge.ts` as the worked example to adapt. Its mechanism moves to Agent core when the first application composes it, and its thresholds and model names stay in the application (ruling O193, in `.orkestrel/agent/plan.md` at commit `db86a3eb`).

- A judge choosing the tools, instructions, memos, or skills of a request is the application's to compose on the `narrow` method of its scope. The recipe's last paragraph states what that costs.

For the recipe and its tested fence, see [Composing a records desk for a small local GPU](../guides/agent.md#composing-a-records-desk-for-a-small-local-gpu).

## What it measured

Each study holds one sealed baseline, recorded on this host on 2026-11-18 with Agent 0.0.47 and Ollama 0.40.16. The agent model is `qwen3.5:4b-q4_K_M` on the GPU. The memory studies also run the Mica judge on the CPU, with `tev1` as triage. Each figure is one read on one host, so it reports what that host read and nothing about another. Treat it as a baseline that tells drift from an outlier on a later run, not as a verdict. The readings before these, from 2026-11-06 to 2026-11-12 on Agent 0.0.36 to 0.0.38, are in `.orkestrel/agent/plan.md` at commit `db86a3eb`.

| Study           | Profile         | Population                                 | Mechanical results                             | Time   | Model calls                      |
| --------------- | --------------- | ------------------------------------------ | ---------------------------------------------- | ------ | -------------------------------- |
| `disclosure`    | `screen`        | 2 arms, 7 conversations of 6 requests each | `area` right on 42 of 42, `index` on 40 of 42  | 417 s  | 184 agent                        |
| `chat`          | `full`, 19968   | 38 conversations, 294 requests             | See the next table                             | 840 s  | 382 agent                        |
| `chat`          | `compact`, 2400 | The same                                   | The same as `full`, call for call              | 838 s  | 382 agent                        |
| `chat`          | `tight`, 1600   | The same                                   | See the next table                             | 1272 s | 535 agent                        |
| `capacity`      | `local`, filled | 4 trials of 3 goals, in both arm orders    | Records 6 of 6, full 6 of 6                    | 337 s  | 22 agent, 24 judge, 12 triage    |
| `memory`        | `local`, filled | The `capacity` result                      | 6 of 12 for each arm; the other 6 are semantic | —      | —                                |
| `qualification` | `recommended`   | 1 trial of 96 goals                        | 96 of 96                                       | 7895 s | 106 agent, 525 judge, 128 triage |
| `endurance`     | `recommended`   | The `qualification` recording              | None; its 384 criteria are all semantic        | —      | —                                |

Semantic criteria read `unknown` until blind labels are imported, and none are imported yet. The `memory` row grades the `capacity` result with the `memory` rubric. The `qualification` and `endurance` grades come from keyed offline replays of the recorded run. Such a replay seals only when every request matches the recording byte for byte, and the memory grader reads no timing or cost, so it grades what the live run produced.

`buildStudyChatSummary` reads the chat recall and first text below. Its `right` counts the 58 dialogue rows, the last turn, two or three back, and further back, that are right and not denying, and each group reports its own as `undenied`:

| Profile   | Last turn | Two or three back | Further back | Changed in dialogue | Lookup, shorter, any, and changed in script | Right and not denying | Follow-up first text, median and p90 |
| --------- | --------- | ----------------- | ------------ | ------------------- | ------------------------------------------- | --------------------- | ------------------------------------ |
| `full`    | 10 of 11  | 22 of 23          | 22 of 24     | 7 of 8              | 6 of 6, 6 of 6, 18 of 18, and 6 of 6        | 47 of 58              | 0.43 s and 0.50 s                    |
| `compact` | 10 of 11  | 22 of 23          | 22 of 24     | 7 of 8              | 6 of 6, 6 of 6, 18 of 18, and 6 of 6        | 47 of 58              | 0.43 s and 0.50 s                    |
| `tight`   | 8 of 11   | 10 of 23          | 9 of 24      | 4 of 8              | 6 of 6, 6 of 6, 12 of 18, and 6 of 6        | 20 of 58              | 2.05 s and 2.98 s                    |

What the baseline shows against the readings before it:

- **`full` and `compact` reproduce the 2026-11-08 reading.** Their recall and their 47 of 58 match it, and the two capacities still read the same.
- **`tight` recalls slightly more and answers more slowly.** It reads 8, 10, and 9 against 7, 9, and 9 on 2026-11-07. Its follow-up first text takes 2.05 s against 1.78 s, because a `tight` request makes 1.82 agent calls against 1.30 at `full`, and first text spans every call of a request. A host with that little room still recalls less than one with room to spare.
- **The chat ledger asks no judge.** Its topic is `requested: false`, requests are excluded from category judging, and replies and tool results take mechanical categories, so its profiles compose no judge model.
- **`disclosure` reproduces the 2026-11-12 reading:**
  - `area` reads 42 of 42 at a median summed prompt of 1947.5 tokens.
  - `index` reads 40 of 42 at 2841 against 2791, with 15 loads, each opening the right area.
- **`qualification` used fewer agent calls but longer answers than October's records run, Candidate 3.** It made 106 agent calls against 209, and 16 lookups, 14 of them found, against 100 found. It produced 153,621 completion tokens against 92,688, so it ran 25% longer: 7895 s against 6304 s. The judge on the CPU takes 4.67 s a call.
- **Whether the drop in lookups costs quality is open.** October's labeled reading achieved 78 (Sol) and 72 (Grok) of the same 384 endurance criteria. Comparing them needs a labeled `endurance` reading of this baseline.

## Running it

The `recommended` profile runs on the Ollama at its provider URL, `http://127.0.0.1:11434`, which is Ollama's default, and pins each model by digest, including `tev1`. It declares no `provider.daemon`, so Study starts no daemon. Its transport verifies the provider's agent, judge, and triage pins against inventory before and after the trial. A recorded run fetches the serving Ollama's version at preflight and postflight and keeps it as a `version` evidence row for debugging; Study compares it with nothing, so a version never refuses a run. The triage leg uses `/v1/systemone`; its metadata verification uses the same Ollama routes as the other roles. Build the package first with `npm run build`, because the profile runs `dist/src/core/index.js`.

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

For recall per goal, pass the verified result to `buildStudyMemorySummary` in `memory/helpers.ts`. It reports each scheduled goal's lookups, found and missing, and each arm's totals.

The profile declares `record` allowances of 512 MiB, 4096 calls, and 9600000 ms per trial. Both judge legs and inventory verification enter custody. Offline replay checks the retained request bytes and makes no sends; message ids are local to each Agent run.

`endurance` runs behind `qualification`. It reads the sealed result at the profile's `qualification` path, `tmp/studies/qualification`, under the root it executes from. It refuses unless that result's identity, bounds, schedule, and scenarios equal its own and no goal failed.

A closure binds identity to its own path and freezes one study, so run the pair from the repository root, without `--closure`. A recorded `qualification` run serves both through keyed offline replay, with no model. `ABSOLUTE_RESULT_PATH` is the recording, and `ABSOLUTE_ENDURANCE_PATH` is the path the second command prints:

```sh
npx study execute qualification --profile recommended --replay ABSOLUTE_RESULT_PATH --roles '["agent","triage","judge","metadata"]' --offline true --out tmp/studies/qualification
npx study execute endurance --profile recommended --replay ABSOLUTE_RESULT_PATH --roles '["agent","triage","judge","metadata"]' --offline true --out tmp/studies/STEM-endurance
npx study grade ABSOLUTE_ENDURANCE_PATH --rubric studies/endurance/rubric.json
```

Grade these root results through the repository's own entry. `memory` runs behind `capacity` the same way, at the `local` profile's `tmp/studies/capacity`.

A continuation needs an ancestor that completed its entire schedule. Record that ancestor separately, without `--trial`, `--goals`, or `--seed`:

```sh
npx study execute qualification --profile recommended --closure ABSOLUTE_CLOSURE_PATH --out tmp/studies/complete
```

After appending goals to the scenario horizon, freeze the grown declaration to a new `ABSOLUTE_GROWN_CLOSURE_PATH`. Keep the earlier goals, schedule, code, provider pins, and profile settings unchanged. Pass the absolute path printed for the complete ancestor as `ABSOLUTE_ANCESTOR_PATH`:

```sh
npx study freeze qualification --profile recommended --to ABSOLUTE_GROWN_CLOSURE_PATH
npx study execute qualification --profile recommended --closure ABSOLUTE_GROWN_CLOSURE_PATH --extend ABSOLUTE_ANCESTOR_PATH --out tmp/studies/continued
```

Study replays the ancestor's retained prefix and sends only the appended goals to the Ollama at the provider URL. The profile declares no `provider.daemon`, so the continuation records no maintenance, and the serving Ollama's version can differ from the ancestor's. Segmented selectors cannot accompany `--extend`; an unchanged horizon is not an extension.

## Running the chat instrument

The `chat` mechanism study preserves 38 conversations, 294 requests, and 102 primary mechanical checks. Its profiles are `full` (ledger capacity 19968), `compact` (2400), and `tight` (1600). The agent context remains 20480 and its output limit 1024 in all three. Each profile composes the agent model alone, declares no judge, and pins the same model identity. See [Chat source and treatment](chat/sources/README.md) for provenance, the original-to-scenario mapping, effective wire policies, allowances, and grading semantics. Its baseline is under [What it measured](#what-it-measured).

Run a sealed reading of one capacity profile in the following order. Replace `full` with the chosen capacity profile.

1. **Build.** Run `npm run build`, because the profiles load `dist/src/core/index.js`.
2. **Rehearse.** Run the [full rehearsal](#full-rehearsal) for the chosen profile and read it green.
3. **Freeze, check, and record.** `ABSOLUTE_CHAT_CLOSURE_PATH` names a new absolute directory under `tmp/` with an existing parent, and `STEM` names the result:

   ```sh
   npx study freeze chat --profile full --to ABSOLUTE_CHAT_CLOSURE_PATH
   npx study check chat --profile full --closure ABSOLUTE_CHAT_CLOSURE_PATH
   npx study execute chat --profile full --closure ABSOLUTE_CHAT_CLOSURE_PATH --out tmp/studies/STEM
   ```

4. **Grade and report.** Run both through the captured entry from the closure's directory. `ABSOLUTE_RESULT_PATH` is the path printed by execution, and `ASSESSMENT_ID` is the identity printed by grading:

   ```sh
   cd ABSOLUTE_CHAT_CLOSURE_PATH
   node --experimental-strip-types node_modules/@orkestrel/study/dist/bin/main.js grade ABSOLUTE_RESULT_PATH --rubric ABSOLUTE_CHAT_CLOSURE_PATH/studies/chat/rubric.json
   node --experimental-strip-types node_modules/@orkestrel/study/dist/bin/main.js report ABSOLUTE_RESULT_PATH --assessment ASSESSMENT_ID
   ```

Study's generic report includes the separate diagnostic and completion criteria. For the battery's 102-row primary denominator and latency reading, use the tested `buildStudyChatSummary` consumer in `chat/helpers.ts` with the verified assessment, rubric, scenarios, and evidence returned by Study's `collectStudyEvidence` helper. Its rows preserve original conversation ids and turn numbers for external pairing. Offline replay checks custody without model sends and contributes no first-text timing.

## Full rehearsal

The full rehearsal executes one chat profile's whole schedule from a frozen closure against a protocol fixture, with no model, and grades and reports the result through the closure's own entry. Run it one time before each sealed run, after the last change to the bundle, the profile, the build, an installed package, or the runner, and only for the profile about to run. No routine suite runs it.

Its procedure is Study's `StudyInstall.rehearse`, over the install that `createStudyFixtureInstall` in `tests/setupStudy.ts` builds with the profile rebound to a protocol fixture, which the routine `chat` proof runs on one conversation. The fixture answers through the test harness, and a Node script can't load that harness, so the rehearsal runs through the `probe` project. Write this probe to `tmp/probes/studies/rehearsal.test.ts`, with `profile` set to the profile about to run. Its 38 attempts and 294 observations are the chat schedule's population:

```ts
import { createScratch, destroyScratch } from '@orkestrel/test/server'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { createStudyFixtureInstall } from '../../../tests/setupStudy.js'

const profile = 'full'

it(`rehearses chat under ${profile}`, async () => {
	const scratch = createScratch({ prefix: 'study-rehearsal-' })
	const { server, install } = await createStudyFixtureInstall(scratch, ['chat'], profile)
	try {
		const rehearsal = await install.rehearse({
			study: 'chat',
			profile,
			directory: join(scratch.path, 'rehearsal'),
		})
		expect(
			[rehearsal.freeze, rehearsal.check, rehearsal.execute, rehearsal.grade, rehearsal.report].map(
				(step) => step?.code,
			),
		).toEqual([0, 0, 0, 0, 0])
		const result = rehearsal.result
		if (result?.status !== 'sealed') throw new Error('The rehearsal did not seal')
		const observations = result.attempts.flatMap((attempt) => attempt.observations)
		expect([result.attempts.length, observations.length]).toEqual([38, 294])
		expect(result.attempts.filter((attempt) => attempt.failure !== undefined)).toEqual([])
		expect(
			observations.filter(
				(observation) =>
					observation.failure !== undefined || observation.product?.partial !== false,
			),
		).toEqual([])
	} finally {
		await server.destroy()
		await destroyScratch(scratch)
	}
}, 1200000)
```

Then run it after the build:

```text
npm run build
npm run test:probe -- tmp/probes/studies/rehearsal.test.ts
```

Each step's result holds its elapsed milliseconds as `duration`. On this host on 2026-11-18, the rehearsal probe of `full` ran 530 s.

## Running the disclosure reading

The `disclosure` mechanism study is phase 3's 4B reading (`.orkestrel/agent/designs/disclosure.md` § The 4B reading). It runs 7 conversations of 6 requests over the `studies/desk/` bundle, one repetition, under two arms:

| Arm     | What each request shows the model                                             |
| ------- | ----------------------------------------------------------------------------- |
| `area`  | The 6 tools of the request's known area, through a run scope, with no `load`. |
| `index` | The skills index and `load`, with nothing shown.                              |

Each request's input holds its prompt and the area the host knows, and the rubric alone names its tool. A request reads `right` when its first call other than `load` names that tool and wasn't denied, `late` when a later call does, `wrong` when its calls never reach it, `text` when it makes no call, and `failed` when its run fails or ends partial. The tested `buildStudyDeskSummary` consumer in `desk/helpers.ts` tallies each arm: the outcomes, the loads with the areas they opened and misopened, the turns, the median summed prompt, and first text read apart for each conversation's first request, for later requests that loaded, and for later requests that didn't, because Study unloads the models before each trial. The adapter declares `progress`, so `study progress` lists each goal's calls, loads, and turns while a run is live.

The run of 2026-11-18 read arm `area` right on 42 of 42 requests at a median summed prompt of 1947.5 tokens. It read arm `index` right on 40 of 42, with one late and one wrong, at a median of 2841 tokens, with 15 loads, each opening the right area. Treat both readings as baselines that tell drift from an outlier on a later run, not as verdicts.

The `screen` profile pins `qwen3.5:4b-q4_K_M` by digest and declares no judge, on the Ollama at its provider URL, `http://127.0.0.1:11434`, with recording declared. It declares no `provider.daemon`. A recorded run keeps the serving Ollama's version as a `version` evidence row and compares it with nothing.

Run the reading in the following order. Each arm runs one sealed trial a conversation, and no live run repeats before the first report.

1. **Build.** Run `npm run build`, because the profile loads `dist/src/core/index.js`.
2. **Rehearse.** Run the [disclosure rehearsal](#disclosure-rehearsal) and read it green.
3. **Freeze and check.** `ABSOLUTE_DESK_CLOSURE_PATH` names a new absolute directory under `tmp/` with an existing parent:

   ```sh
   npx study freeze disclosure --profile screen --to ABSOLUTE_DESK_CLOSURE_PATH
   npx study check disclosure --profile screen --closure ABSOLUTE_DESK_CLOSURE_PATH
   ```

4. **Smoke.** Run one conversation of arm `area`, whose trial is `r1-s1-a1` (arm `index` is `r1-s1-a2`). The profile's trial duration holds the design's 8-minute cap. Derive the series from its per-request times, and record the schedule only when it fits 45 minutes; otherwise report before any cut:

   ```sh
   npx study execute disclosure --profile screen --closure ABSOLUTE_DESK_CLOSURE_PATH --trial r1-s1-a1 --out tmp/studies/STEM-smoke
   ```

   Then derive the profile's byte allowances again from the smoke's own bytes, and write them before recording. Read the trial's `exchanges.jsonl` size as `X`, the bytes its observations admitted as `T`, its largest goal's admitted bytes as `G`, and its `evidence.jsonl` size as `E`. The reply side is the output cap in tokens times the bytes of one streamed frame: 1024 × 148 = 151552 B a request. A trial can send 32 agent requests and a goal 7, and the sidecar stores bodies in base64, a factor of 4/3. With `C` the request ceiling, `bounds.request.bytes`:
   - `bounds.goal.bytes` = 3G + 7 × 151552 + C
   - `bounds.trial.bytes` = 3T + 32 × 151552 + C
   - `record.bytes` = 3X + (32 × 151552 + C) × 4/3
   - `bounds.series.bytes` = 14 × (`bounds.trial.bytes` + `record.bytes`) + 14 × 3E

   Round each up to a whole MiB. Study reserves each trial's whole trial and record allowance against the series before any trial starts, so the series term can't be smaller. The screening values came from the fixture rehearsal of 2026-11-11, which read `X` = 208190, `T` = 146784, `G` = 35961, and `E` = 94006.

5. **Record.** Record the whole schedule live one time, and watch it with `npx study progress tmp/studies/STEM`:

   ```sh
   npx study execute disclosure --profile screen --closure ABSOLUTE_DESK_CLOSURE_PATH --out tmp/studies/STEM
   ```

6. **Replay offline.** The keyed offline replay must seal with no request. `ABSOLUTE_RESULT_PATH` is the path the recording printed:

   ```sh
   npx study execute disclosure --profile screen --replay ABSOLUTE_RESULT_PATH --roles '["agent","metadata"]' --offline true --out tmp/studies/STEM-replay
   ```

7. **Grade, report, and summarize.** Grade and report through the closure's entry from its directory, as [Running the chat instrument](#running-the-chat-instrument) does, with `studies/disclosure/rubric.json`. Then pass the verified result to `buildStudyDeskSummary`.
8. **Iterate offline.** A grading change runs `study grade` alone. A build change runs keyed replay with `--roles '["agent"]' --offline false`, which serves each unchanged request from the recording and sends only the changed ones.

### Disclosure rehearsal

The disclosure rehearsal executes the whole schedule from a frozen closure against a protocol fixture that answers as an oracle, with no model, and grades and reports the result through the closure's own entry. Run it on the same occasions as the [full rehearsal](#full-rehearsal). The routine `desk` proof runs the same procedure on one conversation of arm `index`. Write this probe to `tmp/probes/studies/disclosure.test.ts`. Its 14 attempts and 84 observations are the disclosure schedule's population:

```ts
import { readStudyDeclaration } from '@orkestrel/study/server'
import { createScratch, destroyScratch } from '@orkestrel/test/server'
import { join, resolve } from 'node:path'
import { expect, it } from 'vitest'
import {
	MemoryScript,
	collectStudyDeskAnswers,
	createStudyDeskOracle,
	createStudyFixtureInstall,
} from '../../../tests/setupStudy.js'

it('rehearses disclosure under screen', async () => {
	const scratch = createScratch({ prefix: 'study-rehearsal-' })
	const declaration = await readStudyDeclaration(resolve('.'), 'disclosure')
	const { server, install } = await createStudyFixtureInstall(
		scratch,
		['disclosure'],
		'screen',
		new MemoryScript([], {
			'/api/chat': createStudyDeskOracle(collectStudyDeskAnswers(declaration)),
		}),
	)
	try {
		const rehearsal = await install.rehearse({
			study: 'disclosure',
			profile: 'screen',
			directory: join(scratch.path, 'rehearsal'),
		})
		expect(
			[rehearsal.freeze, rehearsal.check, rehearsal.execute, rehearsal.grade, rehearsal.report].map(
				(step) => step?.code,
			),
		).toEqual([0, 0, 0, 0, 0])
		const result = rehearsal.result
		if (result?.status !== 'sealed') throw new Error('The rehearsal did not seal')
		const observations = result.attempts.flatMap((attempt) => attempt.observations)
		expect([result.attempts.length, observations.length]).toEqual([14, 84])
		expect(result.attempts.filter((attempt) => attempt.failure !== undefined)).toEqual([])
		expect(
			observations.filter(
				(observation) =>
					observation.failure !== undefined || observation.product?.partial !== false,
			),
		).toEqual([])
	} finally {
		await server.destroy()
		await destroyScratch(scratch)
	}
}, 1200000)
```

Then run it after the build:

```text
npm run build
npm run test:probe -- tmp/probes/studies/disclosure.test.ts
```
