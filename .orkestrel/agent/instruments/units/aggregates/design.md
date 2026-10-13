## scenario
Lane: objective. The dispatch names no lane, and every requirement it states is a contract, so this proposal rules on correctness and constraints. Shape calls go to the risks list as Tension entries.

Ledger section. `scenario-long.json` has no `ledger` member. Its top-level keys are title, system, days, seed, tools, lookups, goals, cases, and notes, and its `system` text names `search_history` and `send_reply` (scenario-long.json:3).
- Add `ledger: { system, topics }` after `system`.
- `ledger.system` is the long system text with two changes: the `search_history` sentence becomes the `recall` sentence of `variants/ledger/v1.json` `ledger.system`, and the `send_reply` finish sentence is rewritten as bench4/helpers.mjs:30-31 does. It carries no date sentence, because the driver writes the date as an instruction (see control).
- `ledger.topics` is the six desk topics with the criteria of `variants/ledger/v1.json` `ledger.topics`. The long seed uses the same six (check-long.mjs:13).
- Add no `clock`, because `days` serves it. Add no `gate`, because createLedger 0.0.30 registers only lookups and `recall` (Ledger.ts:166-199).

Goal reconciliation (Tension T1). check-long.mjs:336-343 requires g01-g10 to equal scenario.json outside `after` and `sources`, and the notes claim they do (scenario-long.json:2789). The data differ:
- Long g01 has forbidden ['245.65','43.35'], tools ['send_reply'], and no forbiddenPatterns (scenario-long.json:1956-1974).
- scenario.json g01 has forbidden [], tools ['lookup_order','send_reply'], and a pattern list (scenario.json line 1).

The design restores the scenario.json values in g01-g10, for three reasons:
- The check and the notes agree.
- The 48-message prefix plus g01-g10 then reproduce the short scenario inside the long run, which gives a parity anchor against the p1, v11, and v12 readings.
- The short copies' requests stay valid for g01-g10.

check-long.mjs was not run. Reading it predicts exit 3 before the restore.

Audited scoring fields. FINAL-CHECK.md:142 names them as missing. g11 has no forbidden guard (scenario-long.json:2188-2205).
- The astra lane audits every g11-g24 scoring field against the goal's facts, stale indices, and cases. It writes `bench/long-audit.json` with a ruling per field plus adversarial pass, fail, and hedged replies.
- check-long.mjs gains a check: every g11-g24 goal has an audit entry, and compileRules and scoreText (rescore.mjs:16, 80) classify every audit reply as labelled.
- A field change the audit proposes lands only after the Orchestrator rules on it.

Copies. The design adds eight full copies, `bench/variants/long/v1.json` to `v8.json`. Each parses equal to scenario-long.json outside goals[].request.
- g01-g10 take the requests of `variants/ledger/vN.json`.
- g11-g24 take 112 rewordings written by the opus lane, never by a model under test (BRIEFING.md:506).
- `bench5/copies.ts` ports the rules of variants/check.mjs:103-128: ids, numbers, names, rule-word groups, and scoring phrases. It adds a rule check.mjs lacks (check.mjs:125 reads phrases only): no reworded request newly matches a goal's forbiddenPatterns. It compares against the long base instead of the hard-coded short bases (check.mjs:14-16), and it requires distinct requests per goal across copies.
- The seed, tools, lookups, and days are identical across copies, so every seed-only judge answer and every seed-only aggregate is shared across copies.

Scoring.
- Each row scores with compileRules, scoreText, and clean imported from bench/rescore.mjs. These are exports at rescore.mjs:16, 80, and 93, and the CLI runs only as main (rescore.mjs:263). They score against the goals of the copy the row names. The rescore.mjs CLI is not used, because it is fixed to scenario.json (rescore.mjs:9, 236-237).
- The blind two-sided audit (audit/audit.js, audit/tally.ts) reads the rows after the audit adapter teaches items.ts and tally.ts 24-row runs. tally.ts:13 fixes 10 rows, and items.ts:11 and 17-18 fix 10-row files and the short paths.
- g06 is left out of every arm comparison (FINAL-CHECK.md:130-136).
- goals/read.mjs covers g01-g10 only (children.json) and stays out of this series' verdict.

Corpus.
- harness/data/cal-categories.jsonl covers seed indices 0-47. It binds rows by conversation position (bench4/helpers.mjs:41, Driver.mjs:76), which interleaving breaks.
- The design replaces positional import with a content-keyed judge cache. The key is SHA-256 over the judge model identity, the rendered state, and the question JSON: the same triple that judgment reuse matches (Classifier.ts:281-287).
- The import turns each forward-order category row, topic row, amends row, and supersedes row into a cache row. It renders the long seed message the way Classifier.ts:228-279 does, and it skips reverse-order category rows, which only calibration asks.
- A live seed pass fills every other seed-only question one time. It runs the judge only and serves every model, copy, and arm.
- bench4 read /home/user/agent/tmp/bench/results/v3/cal-categories.jsonl (bench4/constants.mjs:5). The import unit prints both digests and uses the harness copy.

Checks.
- `node bench/check-long.mjs` exits 0.
- `node bench5/copies.ts` exits 0 over the eight copies.
- `node bench5/bench.ts --dry --copy N` exits 0 for N from 1 to 8, with zero fetches, and reports cache coverage of every seed-only question.

Refusals.
1. Writing bench5 in .mjs like bench4. AGENTS.md:47: "ALWAYS write a script as TypeScript run by Node (`node path/to/script.ts`, type stripping, `node:` modules only)".
2. Re-vendoring over vendor/agent/index.js or re-pinning package.json. README.md:74: "Replace a vendored build only on purpose, because a different build changes the requests a run sends". The 0.0.30 build goes beside the existing one.
3. A fake judge or provider in the proofs. AGENTS.md:42: "NEVER use mocks, behavioral fakes, module replacement, framework spies, or fake clocks ... Use real implementations, recorders, temporary resources, protocol-faithful fixture servers, and inert data stubs". The proofs use a replaying fixture server and the recorded judge cache.
4. A package change. The dispatch admits one only where no harness-side route exists, and each reader has a harness-side route (see aggregate).
5. A bash stage runner. AGENTS.md:47: "Never write a bash, PowerShell, or Python script".

## control
Both arms run one driver, `bench5/Driver.ts` with entry `bench5/bench.ts`. The `--arm control|aggregate` flag switches only the aggregate stage.

Build. Both arms build the same way.
- The ledger comes from vendor/agent-0.0.30/index.js. Those are the bytes of /home/user/agent-release/dist/src/core/index.js (version 0.0.30, agent-release/package.json:3), vendored before the trim lands.
- Its @orkestrel imports match the harness pins (harness package.json:7-18 against agent-release package.json:73-82).
- The provider and the judge come from vendor/ollama/index.js, as in bench4 (Driver.mjs:6).

LedgerOptions are as bench4 sets them (Driver.mjs:62-72):
- `judge`: the cache-backed Mica judge (MICA_MODEL and MICA_SYSTEM from constants.mjs:10-11; calibration temperature 1.1244734010661372; num_ctx 4096; keepAlive 5m; Driver.mjs:59).
- `system`: buildSystem(copy), with no date.
- `topics`: from `ledger.topics`, with requested false for warehouse (Driver.mjs:65).
- `questions`: LEDGER_QUESTIONS. `thresholds`: FIT (constants.mjs:12). `capacity`: 3072 (constants.mjs:13). `predict`: 0. `think`: false.
- `share`: DEFAULT_LEDGER_SHARE. `recall.limit`: DEFAULT_RECALL_LIMIT. `agent`: limit DEFAULT_LEDGER_LIMIT, timeout 3600000.

The agent provider is createOllama with the model under test, think false, keepAlive 30m, and the SAMPLER (constants.mjs:13). On the wire, the body carries truncate false, and calibration calls carry num_predict 1 (Driver.mjs:166-168).

Interleaving. bench4 adds the whole seed at once (Driver.mjs:74) and ignores goal.after (Driver.mjs:243-257). The bench5 driver does the following:
1. Add seed 0-47 and calibrate (two calls, Ledger.ts:287-293).
2. For each goal in order, add seed indices up to goal.after through `ledger.conversation.add` (public, Ledger.ts:247), recording a map from seed index to message id.
3. Write the date instruction.
4. Call `respond(goal.request)`.

Every seed message after index 47 arrives after the first request. It reaches a planned prompt only through the briefing or `recall` (agent.md:546; Ledger.ts:836-841), and an assistant message among them is filed as chatter without a question (Ledger.ts:433-439). Both arms share these behaviors.

Days.
- `LedgerOptions.system` is fixed for the ledger's life (types.ts:256; Ledger.ts:143, 203), and createLedger builds its own conversation (Ledger.ts:153-155).
- The driver writes the instruction `date` through `ledger.agent.context.instructions`, which overwrites by name (contexts/types.ts:115-151). Its content is 'Today is WEEKDAY DATE.' for the day with the greatest `from` not above goal.after (scenario-long.json:4-17).
- `build` renders instructions after the system text and before the briefing (AgentContext.ts:184-247).
- The turn estimate uses context.build (Ledger.ts:920-933), so the gauge prices the line. The plan cap prices only options.system plus the briefing (Ledger.ts:725-731), which leaves a gap of one line.
- Alternative: a per-day system text. It needs a package seam, so it loses.

Lookups.
- `lookup_order` and `lookup_customer` are built as in bench4 (Driver.mjs:69-70), with readLookup ported from bench4/helpers.mjs:70-86.
- A lookup returns the most recent `lookups` entry for that tool and id whose `from` is at most the last seed index added; otherwise it returns `tools[name][id]`. The versioned entries are LH-80941 from 81 and LH-71592 from 135 (scenario-long.json:1940-1953).
- Replacement by identity stays the ledger's job (identifyLookup, types.ts:167-169).

Selection wrapper. Both arms apply one scope named `aggregate`. Its `select` does the following:
1. Saves `context.scope` and applies undefined.
2. Awaits `context.select(request, signal)`. The context reads the scope at call time and falls back to the ledger's handler (AgentContext.ts:167-172; Ledger.ts:207).
3. Re-applies itself.
4. Returns the ledger's Selection unchanged.

The answer pass applies the ledger's scope and restores the saved one (Ledger.ts:351-372). The control arm runs the same wrapper with the aggregate stage off, so both arms send prompts down the same code path. The wrapper never throws: on an aggregate-stage error it logs the error and removes the `summaries` instruction.

Judge cache. A JudgeInterface wrapper (id, name, model, ask; core/types.ts:169-176) answers each one-question request from the cache. On a miss it forwards to Mica and appends the row, with one writer. Without `--live`, a miss throws, and the Classifier then leaves the question undecided (Classifier.ts:347-363). Both arms and every copy and model share the cache.

Run outputs:
- rows.jsonl: one row per goal.
- selections.jsonl: every `select` event, with goal, briefing and its digest, tail ids, instruction texts, and gauge scale.
- messages.jsonl and judgments.jsonl: written at the end, with seed index, request flag, and goal flag.
- calls.jsonl: role (agent, judge, or summarizer), goal, wall time, and status.
- aggregates.jsonl: aggregate arm only.
- run.json: settings, the vendored build's digest, cache counters, and checks.

tools/record-fetch.mjs under tools/run-one.ts records the wire.

Modes. Exactly one mode runs per invocation.
- `--run`: inference also needs `--live`.
- `--dry`: no fetch. It builds the ledger, interleaves the seed without responding, checks settings, and prints read points, dates, lookup versions, and cache coverage.
- `--seed`: a judge-only pass that needs `--live`.

A fetch to port 11434 without `--live` throws. `--goals` limits a pilot to the listed goals. `--url`, `--fit`, and `--settings` point the driver at fixtures for proofs.

## metrics
Per goal, both arms, using the ledger arm's fields:
- Outcome and reply: goal, copy, model, arm, success (scorer clean with a reply that is not empty), reply, replyVia, missing, violations, patternViolations, passes, usage, partial, error.
- Wire: faults (wire errors and statuses of 400 or more), wall, firstWire and lastWire, maxPrompt (largest prompt_eval_count), overflow (a prompt at or over capacity, or a context error).
- Tools: recalls (calls, closed) and lookups (calls, repeats).
- Questions: fresh Mica calls and cache hits for each head (category, topic, amends, supersedes).
- Briefing:
  - tokens: estimate times gauge scale;
  - facts: the goal's facts whose live text renders in the briefing or tail at the first select;
  - stale: tokens of goal.stale sentences that no fact carries, plus goal.forbidden phrases, found in the briefing or tail.
- Gauge scale after the goal, and the plan digest (briefing text and tail ids).

Per run: the calibrated gauge, held judge items, cache counters, wall time by role (agent, judge, summarizer), and an isolation diagnostic. The diagnostic reports whether each goal's plan equals the other arm's for the same copy and model, wherever both conversations hold the same event set. g01 must match, because its conversation is identical in both arms.

Aggregate arm, per read point and topic:
- builds and rebuild triggers (first build, removed source, CHANGE yes);
- CHANGE asked and its yes rate;
- AGREE asked and its failure rate;
- code-check failures by kind (id, number, name, stale token, empty);
- consistency failures per rebuild, meaning code plus AGREE failures over builds, with retries;
- withheld topics and stale versions;
- summarizer calls, tokens, and seconds, with cache hits counted separately.

Aggregate arm, per goal:
- rendered topics and summaries tokens;
- sentences filtered by the pinning rule;
- sole-carried tokens, which must read 0;
- summaries facts: goal facts whose tokens the rendered prose carries;
- summaries stale tokens.

Judge keep and drop (shadow.ts, per run and pooled per model). Answers are scored against the seed truth (truth.category, truth.amends, and truth.supersedes per seed message):
- keep rate: messages whose truth is fact, rule, or correction that are filed not quiet;
- drop rate: chatter or distractor truth messages that are filed quiet;
- pair recall: truth amends and supersedes pairs read at or above the cutoff;
- false-drop rate: screened pairs outside the truth read at or above the cutoff.

Each rate is reported for the plain state (the ledger's recorded answers) and for the aggregate state, with the count of answers that flip between them.

Pair reading (report.ts, with tally.ts for audited ends):
- d per copy is aggregate passes minus control passes over the 23 goals without g06.
- The bound is mean(d) plus or minus 2·sd(d)/√n (FINAL-CHECK.md:48), read at the scorer end and at the audited low and high ends.
- Pass rates are also given for g01-g10 against g11-g24 and for each lifetime case (scenario-long.json:2561-2787).
- The report includes invariant verdicts and wall time per copy by role.

## series
Setup.
- Models: qwen3.5:2b-q4_K_M (q2), qwen3.5:4b-q4_K_M (q4), gemma4:e2b-it-q4_K_M (g2), and gemma4:e4b-it-q4_K_M (g4), all with thinking off.
- Judge: hf.co/sky7350/Mica-v0.1-4B:Q4_K_M.
- One daemon, one run at a time through tools/series.ts and tools/run-one.ts, with a cold start per run.
- Copies 1-8, both arms per copy. The arm that runs first alternates with copy parity, so daemon drift falls on both arms.

Measurements supplied by the COST survey, spot-checked:
- q2: 7.08 min per 10-goal ledger run (results/port/run-log.txt:1-16; copy 1 took 6:59; the model is named only in p1-ledger-v1/run.json:16).
- g2: 7.97 min (results/v11/run-log.txt, copies 2-8; copy 1 took 11.57 min cold).
- g4: 10.54 min (results/v12/run-log.txt; copy 1 took 10:59).
- Mica: 2.64 s per warm question on 161-175-token states (harness/tmp/v11-repro/g2-records-v1-wire), and 4.3 s on 363-token states (BRIEFING.md:286, unverified).

Missing measurements:
- q4 timing;
- Mica seconds on CHANGE, AGREE, and shadow states;
- summarizer seconds;
- builds per copy and the consistency-failure rate;
- summaries tokens;
- the long seed's pair count;
- check-long's exit code.

Projection per 24-goal copy. Under the COST survey's assumption A1, a copy takes 2.4 times the 10-goal wall time.
- Control: 17.0 min on q2, 19.1 on g2, 25.3 on g4, and an assumed 22.5 on q4 (q2 times the g4/g2 ratio).
- Aggregate, assumed until the pilot measures it: 1.15 times the control's per-goal wall time, plus about 30 min of summarizer and judge calls on a model's copy 1 and about 6 min on each later copy. That gives copy 1 then later copies of 49.6 then 25.6 min on q2, 52.0 then 28.0 on g2, 55.9 then 31.9 on q4, and 59.1 then 35.1 on g4.
- Shadow: about 8.4 min per model for copies 1-4 and about 1 min per later copy.
- Cold start: about 0.75 min per run.

Stage 0, one time, about 1.3 to 1.5 h:
- seed pass, judge only: about 500 questions, 22 to 36 min;
- CHANGE and AGREE calibration on q2: about 15 min;
- pilot: q2 copy 1, g01-g12, both arms, about 40 min. The pilot sets the allowance, retry bound, and summarizer cap in settings.json, and it replaces the projection's aggregate-overhead terms with measurements.

Stage A: q2, copies 1-4, both arms.
- About 3.5 h: control 68 min, aggregate 126 min, shadow 8 min, cold starts 6 min.
- series.ts budget: 4.5 h, which is 1.3 times the estimate.
- The copy 1 pair is readable about 2.6 h after Stage 0 starts, and the Stage A verdict about 5 h after.

Stopping rule, applied after the copy 1 pair and again after Stage A:
- Stop and fix before any further run when an aggregate run breaks an invariant:
  - a token carried only by the summaries block;
  - a rendered aggregate whose code check or AGREE failed;
  - an overflow on a goal whose paired control did not overflow;
  - a g01 plan that differs between the arms.
- After Stage A, stop the series and report when the aggregate arm reads worse at the audited high end, that is, mean(d) + 2·sd(d)/√4 < 0. Otherwise run Stage B.
- The scorer gives the first Stage A read, and the audit confirms it before any claim.

Stage B: copies 1-4 of g2, then q4, then g4.
- About 12.7 h: g2 3.7 h, q4 4.2 h, g4 4.6 h, cold starts 0.3 h.
- Budget: 16.5 h.
- q4's copy 1 serves as its cost measurement, and series.ts raises each arm's estimate to 1.3 times its longest finished run (series.ts:4-8).

Stage C: copies 5-8, per model.
- A model runs Stage C only when its pair clears at neither end after copies 1-4; a pair that clears at the low end stops at 4 (FINAL-CHECK.md:140).
- Up to about 14.3 h if all four models continue. Budget: 18.6 h.

Total wall time: about 17.5 to 17.7 h when no model runs Stage C, and up to about 32 h when all four do. The blind audit runs off the daemon and overlaps the next stage.

Every Stage A to C figure past the measured control walls rests on the unmeasured aggregate-overhead assumptions. Fix Stage A's budget after the pilot.

## units
- vendor-and-seams [builder] /home/user/scaffold/.orkestrel/agent/instruments/harness/vendor/agent-0.0.30/index.js, /home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/seams.ts, /home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/tests/seams.test.ts, /home/user/scaffold/.orkestrel/agent/instruments/harness/README.md
  BRIEF: Role: vendor the ported ledger build and give the trim a probe of every seam. Depends on: nothing.

1. Confirm that /home/user/agent-release/package.json reads version 0.0.30.
2. Copy /home/user/agent-release/dist/src/core/index.js byte for byte to vendor/agent-0.0.30/index.js.
3. Compare each bare @orkestrel import in the build with harness package.json:7-18. Stop and report any package or version the harness lacks; never edit package.json.
4. Add a row to the README vendored-builds table (README.md:61-70) with source path, file time, SHA-256, and reason. Leave vendor/agent/index.js untouched (README.md:74).
5. Write bench5/seams.ts.
   - Usage line: `node bench5/seams.ts --build PATH [--json]`.
   - Exit 0 when all seams hold, 1 when one fails, 64 on usage.
   - Before importing the build, replace globalThis.fetch with a thrower that counts calls.
   - Check each seam in the proposal's seams list:
     - each named export exists as a function, class, or object;
     - LEDGER_NOTES has cue, results, repeat, and closed;
     - LEDGER_QUESTIONS has category, topic, amends, and supersedes;
     - createLedger, given an inert provider object whose generate rejects plus options built from the long ledger topics and FIT values, returns respond, calibrate, conversation, agent, and gauge;
     - agent.context has apply, scope, select, build, and instructions (add, remove, instruction);
     - agent.emitter.on exists;
     - Classifier.prototype has classify, classification, category, quiet, and topics;
     - after instructions.add({ name: 'date', content: 'Today is X.' }), context.build({ messages: [], judgments: [], briefing: '## Pinned' }) returns one system message whose content has the system text, then the instruction, then '## Pinned' last.
   - Print one line per seam, the build's SHA-256, and 'fetch calls N'.

Acceptance:
- The probe passes on the vendored build with 0 fetch calls.
- It fails, naming the seam, on a scratch build that omits one seam.
- The printed digest equals the README row.
  PROOF: From the harness directory: `node bench5/seams.ts --build vendor/agent-0.0.30/index.js` exits 0 and prints 'fetch calls 0' and the digest the README records. `node --test bench5/tests/seams.test.ts` writes a scratch module in the test's temp directory that re-exports the vendored build except buildRecords, and expects exit 1 with a line naming buildRecords. Offline, with no request to 127.0.0.1:11434.
- kinds-and-judge-cache [builder] /home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/types.ts, /home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/constants.ts, /home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/helpers.ts, /home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/JudgeCache.ts, /home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/tests/helpers.test.ts, /home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/tests/JudgeCache.test.ts
  BRIEF: Role: shared kind files and the content-keyed judge cache. Depends on: vendor-and-seams. Use erasable TypeScript only (no enum, no parameter properties) and `#` fields.

types.ts (readonly members):
- Row, SelectionRecord, CallRecord, CacheRow { key, model, state, question, answer?, refusal?, error?, usage?, wall, origin: 'corpus' | 'live', at }, Settings { allowance, retry, predict }, Fit { change, agree, separated }, PlanEntry { name, harness, estimate, args }.

constants.ts:
- HARNESS (the directory above bench5, from import.meta.dirname), VENDOR_AGENT, VENDOR_OLLAMA, SCENARIO_LONG, COPIES_DIR (bench/variants/long), CORPUS (data/cal-categories.jsonl).
- MODELS: { q2: 'qwen3.5:2b-q4_K_M', q4: 'qwen3.5:4b-q4_K_M', g2: 'gemma4:e2b-it-q4_K_M', g4: 'gemma4:e4b-it-q4_K_M' }.
- MICA_MODEL and MICA_SYSTEM (bench4/constants.mjs:10-11), MICA_CALIBRATION 1.1244734010661372, MICA_CONTEXT 4096 (Driver.mjs:59).
- FIT (constants.mjs:12), SAMPLER (constants.mjs:13), TIMEOUT 3600000, DAEMON 'http://127.0.0.1:11434'.

helpers.ts:
- readJSON, readRows, computeDigest, describeError: ports of bench4/helpers.mjs:5-26.
- buildSystem(scenario): scenario.ledger.system with the replacements of helpers.mjs:30-32 and the handle sentence of helpers.mjs:37, and no date.
- renderDate(date): 'Today is WEEKDAY DATE.', as in helpers.mjs:33-34.
- findDay(days, index): the day with the greatest `from` not above index.
- readLookup: port of helpers.mjs:70-86.
- resolveLookup(scenario, name, id, position): the most recent `lookups` entry with that tool and id whose `from` is at most position, else tools[name][id], else 'no record for ID'.
- buildCacheKey(model, state, question): SHA-256 of JSON [model, state, question].
- renderMessageState(message): exactly `${role}: ${content}` (Classifier.ts:228-231).
- renderPairState(earlier, later): matches Classifier.ts:276.
- buildTopicQuestion(topic, questions): matches Classifier.ts:257-263.
- importCorpus(rows, seed, topics, model) returns CacheRow[]:
  - forward category rows use LEDGER_QUESTIONS.category, with the criteria in LEDGER_CATEGORIES order as Classifier.ts:236-247 builds them;
  - include topic rows and amends and supersedes rows;
  - skip order 'reverse';
  - skip a row whose `asked` JSON differs from the rebuilt question;
  - a row whose error matches DETERMINISTIC_JUDGE_ERROR becomes an error row;
  - render state from seed[index] of the long scenario.

JudgeCache implements JudgeInterface (id, name, and model from the inner judge; ask):
- It refuses a request with more than one question by throwing.
- A hit returns { model, answers or refusals, usage }.
- An error row rethrows Error(recorded text).
- On a miss with `live`, it calls the inner judge, appends the row with appendFileSync, and returns the result.
- On a miss without `live`, it throws Error('judge cache miss').
- It counts hits and misses per head, where head is the first element of the question key parsed as JSON, else 'other'.

Acceptance:
- importCorpus yields a key for every forward category row, topic row, and pair row of indices 0-47.
- The long seed's first 48 messages render the same states as scenario.json's seed.
- A Classifier from the vendored build, run over a conversation of those 48 messages with an offline JudgeCache, classifies with misses only on questions absent from the corpus. The test lists those misses and asserts that none is a category or topic question for a message the corpus covers.
- The test prints the digests of data/cal-categories.jsonl and /home/user/agent/tmp/bench/results/v3/cal-categories.jsonl.
  PROOF: `node --test bench5/tests/helpers.test.ts bench5/tests/JudgeCache.test.ts` from the harness directory. globalThis.fetch is replaced by a thrower for any :11434 URL. The write-through case uses an inert data stub as the inner judge, returning a fixed JudgeResult, and asserts that one row is appended and that a second ask is a hit. The offline case asserts the miss error and that zero fetches occur.
- fixture-server [builder] /home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/tests/fixture.ts, /home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/tests/data/chat-final.json, /home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/tests/fixture.test.ts
  BRIEF: Role: a protocol-faithful Ollama fixture for every offline proof. Depends on: vendor-and-seams.

1. Copy one recorded daemon exchange into bench5/tests/data/chat-final.json: request stream flag, response status, content type, and body text. Take it from harness/tmp/v11-repro/g2-records-v1-wire, choosing an *_api_chat-response.json whose body is a final reply with prompt_eval_count, together with its request file. Record the source file names in the JSON.
2. Export startFixture({ summaries }) returning { url, requests, close }:
   - a node:http server on 127.0.0.1, port 0;
   - POST /api/chat answers with the recorded status, content type, and body bytes;
   - when the request's first system message starts with the summarizer system text from bench5/aggregates/constants.ts (take the prefix as a parameter so this unit does not import that file), it answers with the same envelope and the message content replaced by summaries[topic];
   - every request body is recorded;
   - /api/generate answers 404.
3. A request whose stream flag differs from the recording's is refused with 400 and a message naming the mismatch.

Acceptance:
- The vendored createOllama (vendor/ollama/index.js) pointed at the fixture returns a reply with prompt usage.
- A num_predict 1 request also returns usage.
- No fetch reaches :11434.
  PROOF: `node --test bench5/tests/fixture.test.ts`. globalThis.fetch is wrapped to throw on :11434. The test asserts the reply text, usage.prompt above 0, and recorded request bodies, with zero :11434 calls.
- scoring-audit [astra] /home/user/scaffold/.orkestrel/agent/instruments/harness/bench/long-audit.json
  BRIEF: Role: an independent audit of the g11-g24 scoring fields in bench/scenario-long.json. Read-only, except for the one file this unit owns. Depends on: nothing.

For each goal g11-g24:
- Read goal.facts and goal.stale (seed indices), the linked `cases` entries, the seed messages they name, and the check-long.mjs SAMPLES entry.
- Rule on each scoring field (expected, expectedAny, forbidden, forbiddenPatterns): keep, or change with a replacement value and the seed index that supports it. Rule on g11's missing forbidden guard (scenario-long.json:2188-2205).
- Write adversarial replies, enough to exercise every scoring field the goal carries:
  - pass: correct, phrased differently from the samples;
  - fail: a stale or wrong value;
  - hedged: the right value with a stale one beside it.
  Label each reply with the outcome the current rules must give, or, when your ruling changes a field, the outcome the changed rules must give.

File shape: { goals: { ID: { fields: { FIELD: { ruling: 'keep' | 'change', value?, evidence: [seed indices], reason } }, replies: [{ text, label: 'pass' | 'fail', under: 'current' | 'changed' }] } } }, serialized with JSON.stringify(value, null, '\t') and a final newline.

Acceptance:
- Every g11-g24 goal has an entry, and every field has a ruling with evidence.
- Every 'current' reply scores as labelled under compileRules and scoreText from bench/rescore.mjs. The long-scenario unit's check enforces this.
  PROOF: Offline: the long-scenario unit's `node bench/check-long.mjs` reads this file and exits 0 only when every 'current' reply scores as labelled. Until that unit lands, the lane reports each reply's scoreText result, computed by importing bench/rescore.mjs in a scratch script under the session scratchpad.
- long-scenario [builder] /home/user/scaffold/.orkestrel/agent/instruments/harness/bench/scenario-long.json, /home/user/scaffold/.orkestrel/agent/instruments/harness/bench/check-long.mjs
  BRIEF: Role: give the long scenario its ledger section, restore g01-g10, and check the audit. Depends on: scoring-audit, and the Orchestrator's ruling on Tension T1 (restore) and on each 'change' ruling in long-audit.json.

Edits to scenario-long.json, keeping its tab-indented JSON form:
1. Add `ledger` immediately after `system`, holding:
   - `system`: the long `system` text with the `search_history` sentence replaced by the recall sentence from bench/variants/ledger/v1.json `ledger.system`, and the send_reply finish sentence replaced as bench4/helpers.mjs:30-31 replaces it;
   - `topics`: an object equal to v1.json `ledger.topics`.
2. Set every key of g01-g10, except `after` and `sources`, to the value in bench/scenario.json.
3. Apply only the field changes the Orchestrator accepted from long-audit.json.
4. Append to `notes` one sentence stating that `ledger` carries the createLedger system text and the six desk topics.

Additions to check-long.mjs (exit 0 or 3 as before):
- `ledger` exists; its topics deep-equal v1.json `ledger.topics`; its system names recall and names neither search_history nor send_reply.
- bench/long-audit.json has an entry for every goal from index 10 on.
- Every 'current' reply scores as labelled under compileRules and scoreText imported from ./rescore.mjs.

Acceptance: the check exits 0 on the edited files and 3 on each injected defect.
  PROOF: `node bench/check-long.mjs` exits 0. In a scratch copy of bench/ (scenario.json, scenario-long.json, check-long.mjs, rescore.mjs, long-audit.json) under the session scratchpad, each of these makes it exit 3: reverting g01.forbidden to ['245.65','43.35'], relabelling one audit reply, and deleting ledger.topics.contacts. All offline.
- copy-checker [builder] /home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/copies.ts, /home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/tests/copies.test.ts
  BRIEF: Role: validate the long copies. Depends on: long-scenario, which supplies the base. Write a self-contained executable script that exports nothing and puts its usage and exit codes in its opening comment.

- Usage: `node bench5/copies.ts [COPY_FILE ...]`. The default is bench/variants/long/v1.json to v8.json. Exit 0 on pass, 2 on any problem, 64 on usage.
- Port these from bench/variants/check.mjs: RULE_WORDS (34-58), ID and NUMBER (59-60), the names, groups, words, and phrase helpers (60-100), and compare (103-128).
- Add a rule: a reworded request must not match any of the goal's forbiddenPatterns, or any expected or expectedAny phrase, that the original request does not match.
- Base: scenario-long.json, parsed. A copy restored with the original requests must deep-equal the base.
- Serialization: the copy's text must equal JSON.stringify(copy, null, '\t') plus a newline.
- For g01-g10, the request must equal goals[i].request of bench/variants/ledger/vN.json for copy N.
- For g11-g24, requests must differ from the original and from every other copy of the same goal.
- Startup self-tests port check.mjs:131-143 REFUSALS, plus two more: g11 adding a name, and g12 adding the phrase '$50 store credit'. If a self-test is not refused, exit 2.

Acceptance:
- Each rule refuses a scratch copy that breaks it, with a message naming the goal and the rule.
- A conforming scratch copy passes.
  PROOF: `node --test bench5/tests/copies.test.ts` builds scratch copies under the test's temp directory from scenario-long.json, one per rule, and asserts exit 2 with the named reason. It also builds one conforming copy and asserts exit 0. Offline.
- long-copies [opus] /home/user/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json, /home/user/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v2.json, /home/user/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v3.json, /home/user/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v4.json, /home/user/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v5.json, /home/user/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v6.json, /home/user/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v7.json, /home/user/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v8.json
  BRIEF: Role: write the eight reworded copies of the long scenario. Depends on: long-scenario and copy-checker.

Each copy N is scenario-long.json with goals[].request replaced:
- g01-g10 take the requests of bench/variants/ledger/vN.json, verbatim.
- g11-g24 take one rewording per copy that asks the same thing in different words. A rewording:
  - keeps every id, number, and proper name of the original;
  - adds no id, number, name, or word from a RULE_WORDS group the original lacks;
  - adds no scoring phrase or forbiddenPatterns match;
  - differs from every other copy's rewording of the same goal.
- Vary sentence order, register, and framing across copies, as the short copies do.

Write each file as JSON.stringify(copy, null, '\t') plus a newline. Never use output from the models under test.

Acceptance: `node bench5/copies.ts` exits 0 over the eight files.
  PROOF: `node bench5/copies.ts` from the harness directory exits 0. Offline.
- mirror [builder] /home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/Mirror.ts, /home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/tests/Mirror.test.ts
  BRIEF: Role: rebuild from 0.0.30 exports the projection input and filing that the ledger's private #project and #plan read (Ledger.ts:491-510, 586-597), without asking the judge. Depends on: kinds-and-judge-cache and fixture-server.

class Mirror:
- Constructor: (ledger, { judge, questions, topics, thresholds, system, reads: map from tool name to LedgerLookupHandler }).
- It subscribes to ledger.agent.emitter 'tool' and keeps pending results keyed by conversation length at the event, flushed to the id of the tool message at that index on each read. This mirrors Ledger.ts:209-216 and 415-424.
- note(request: Message): records a request id.
- assign(message): mirrors Ledger.ts:426-440:
  - an annotation is chatter: a user message after the first request whose content equals LEDGER_NOTES.cue or starts with LEDGER_NOTES.results (Ledger.ts:347-350);
  - a tool message is chatter when its flushed result has success false, and fact otherwise;
  - an assistant message with calls is chatter;
  - an assistant message after the first request is chatter;
  - anything else is undefined.
- readings(): mirrors Ledger.ts:442-489. Skip failed results, and add argument ids through extractTokens.
- input(): returns LedgerProjectionInput { system, exclude: requests plus annotations, owners, messages, readings, entities, classification }. It uses an internal Classifier from the vendored build with the same judge, questions, topics, and thresholds, this.assign, and entities = matchEntities(collectRegistry(readings), text, partial).
- projection(): buildRecords(input()).
- lines(id): buildLines(input, byId, id, stale keys, owner names, collectNames(system)).
- near(request): matchEntities(registry, content, true) plus classifier.topics(id).
- owners(request): mirrors Ledger.ts:594-597 through registry.owners and linkOwners.
- The Mirror never calls classify.

Acceptance. Build a ledger with vendored createLedger, using the fixture as provider and an offline JudgeCache loaded with importCorpus rows. Add seed 0-47 and calibrate. Respond with g01's request, capturing the Selection from the 'select' event; the wrapper is not involved here. Then:
- the Mirror's owner titles for owners(request) equal the '### ' titles in the briefing;
- every line under such a title in the briefing is one of the Mirror's lines for that record, after the tool prefix of Ledger.ts:523-536 is applied;
- the Mirror's quiet set equals the ids whose recorded category weight for chatter and distractor reaches FIT.category.
  PROOF: `node --test bench5/tests/Mirror.test.ts` against startFixture, with fetch throwing on :11434. Asserts the three acceptance comparisons and zero :11434 calls. Offline.
- summarizer [builder] /home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/Summarizer.ts, /home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/tests/Summarizer.test.ts
  BRIEF: Role: a cached generate call for aggregate prose, outside the ledger. Depends on: kinds-and-judge-cache and fixture-server.

class Summarizer:
- Constructor: ({ provider, model, sampler, predict, cache: file path, live }), where provider is a createOllama instance separate from the ledger's.
- summarize(messages: readonly Message[], signal) returns { prose, raw, usage, wall, cached }.
  - Key: SHA-256 over model, sampler, predict, and the message contents.
  - A hit returns the recorded output without a request.
  - On a miss with live, it calls provider.generate(messages, signal, undefined, { think: false }), trims the content into prose, and appends a row.
  - On a miss without live, it throws Error('summary cache miss').
- The ledger's emitter, gauge, and conversation never see a summarizer call.

Acceptance:
- Against the fixture, the prose equals the fixture summary for the topic.
- A repeat call is a hit with no fixture request.
- An offline miss throws.
- The recorded request body carries think false, the sampler, and num_predict equal to predict.
  PROOF: `node --test bench5/tests/Summarizer.test.ts` against startFixture, with live meaning only that the fixture URL is reachable and fetch throwing on :11434. Offline.
- aggregator [builder] /home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/aggregates/Aggregator.ts, /home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/aggregates/helpers.ts, /home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/aggregates/constants.ts, /home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/tests/aggregates.test.ts
  BRIEF: Role: the aggregate store, its two judge questions, consistency, and the pinned render. Depends on: mirror, summarizer, kinds-and-judge-cache, fixture-server.

aggregates/constants.ts holds, word for word from the proposal's aggregate section:
- SUMMARY_SYSTEM (with TOPIC and DATE slots);
- CHANGE_QUESTION and AGREE_QUESTION, as noul questions with instructions and true/false criteria;
- SUMMARIES_HEADING ('### Topic summaries');
- the instruction names 'date' and 'summaries' and their priorities, with date first.

aggregates/helpers.ts holds pure exported helpers, each with TSDoc:
- collectTopicSources(mirror projection, input, topic): owner record lines for an owner topic; lines of live messages with the topic for a desk topic.
- buildSummaryPrompt(topic, title, asOf, sources).
- buildChangeState(aggregate, message lines) and buildAgreeState(aggregate, sources).
- checkProse(prose, sources, ownerNames, staleTokens): returns failures by kind (id, number, name, stale, empty).
- filterProse(prose, idsLine, shownText): keeps sentences whose ids, numbers, and names all occur in shownText, keeps ids that occur there, and reports the sentences it dropped.
- renderSummaries(entries, allowance, price): cuts whole aggregates from the end until price(text) is at most allowance.
- countSoleTokens(text, shownText).

class Aggregator:
- Constructor: ({ mirror, summarizer, judge, fit, settings, days, log }).
- maintain(request, goal, lastSeed, signal): for every desk topic and registry owner, runs this procedure:
  - first build;
  - code rebuild on a removed source line;
  - CHANGE per arriving source message, through judge.ask with one question and key JSON ['change', id, topic, version]; rebuild when the noul reaches fit.change;
  - after each build, and for each kept aggregate whose sources changed: checkProse, then AGREE keyed ['agree', topic, version]. AGREE counts as failed below fit.agree, and only when fit.separated is true; otherwise it is logged only;
  - a failure marks the version stale and rebuilds, up to settings.retry, and then withholds the topic.
  It appends one aggregates.jsonl row per version and per question: topic, version, status, goal, lastSeed, sources with message id, seed index, and sentence, ids line, prose, raw, trigger, answers, failures, wall, cached. It never throws; errors are logged and the topic withheld.
- render(selection, request, systemText, dateText, scale): builds shownText from briefing, tail contents, systemText, and dateText. It orders owners(request) before the desk topics in near(request), applies filterProse, and renders '#### TITLE, as of DATE', 'Ids: ...', and the prose. It cuts to settings.allowance with price = estimateMessages of a system message times scale. It returns { text, topics, filtered, sole }.

Acceptance cases:
1. The first maintain builds every topic that has sources.
2. A preloaded amends and supersedes pair that removes a source line triggers a rebuild with no CHANGE asked.
3. A fixture summary with a mistyped id fails checkProse, retries, and is withheld after settings.retry.
4. render drops a sentence whose amount is absent from a supplied selection, and sole reads 0.
5. Earlier versions stay in the log.
  PROOF: `node --test bench5/tests/aggregates.test.ts` against startFixture, with an offline JudgeCache whose rows for the exact CHANGE and AGREE states the test computes and writes first, and fetch throwing on :11434. Asserts the five acceptance cases. Offline.
- driver [builder] /home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/Driver.ts, /home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/bench.ts, /home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/tests/Driver.test.ts
  BRIEF: Role: the long-scenario driver for both arms, as the proposal's control section specifies. Depends on: long-scenario, long-copies, mirror, aggregator, summarizer, kinds-and-judge-cache, fixture-server.

bench.ts imports Driver, awaits execute, prints describeError on failure, and sets exitCode 1.

Flags (node:util parseArgs, strict):
- --run, --dry, --seed: exactly one is required; exit 64 otherwise.
- --live, --copy 1-8, --model (a MODELS value), --arm control|aggregate, --out, --cache.
- --url (default DAEMON), --goals (a comma list of goal id prefixes).
- --fit (default bench5/fit.json), --settings (default bench5/settings.json).
- --allowance, --retry, --predict: these override settings.

Fetch wrapper (passed as `fetch` to both clients, as Driver.mjs:60-61 does):
- throws for a :11434 URL without --live;
- applies truncate false and calibration num_predict 1 (Driver.mjs:165-169);
- appends calls.jsonl rows { sequence, role, goal, started, wall, status }.

Run mode:
1. Build LedgerOptions as the control section lists.
2. Build the Mirror. Apply the wrapper scope in both arms, as the control section specifies. The wrapper calls mirror.note(request) and, in the aggregate arm, aggregator.maintain then render, then writes or removes the 'summaries' instruction.
3. Add seed 0..goals[0].after and calibrate under the calibration flag.
4. For each selected goal:
   - add seed through goal.after;
   - set the 'date' instruction from findDay;
   - respond with AbortSignal.timeout(TIMEOUT);
   - score with compileRules, scoreText, and clean from ../bench/rescore.mjs;
   - append the row (fields as in Driver.mjs:253 plus the metrics fields this driver can read live).
5. Record every 'select' event to selections.jsonl.
6. At the end, write messages.jsonl, judgments.jsonl, and run.json, including the vendored build digest, settings, fit, and cache counters.
7. Refuse --run without --live unless --url is not the daemon. Refuse an existing output directory.

Dry mode: no fetch. Build, interleave the whole seed without respond, and print per goal the read point, date, and lookup versions. Report cache coverage by running a mirror Classifier's classify with an offline JudgeCache and counting misses by head. Exit 1 on a settings mismatch.

Seed mode (requires --live): judge only.
- Use a standalone conversation from createConversationManager().add().
- Add the seed in the same blocks, and add the copy's original requests as user messages registered as requests.
- Use a Classifier with the mirror assign rule.
- Call classify(requests, signal) after each block, then print coverage.

Acceptance against the fixture (--url, scratch --cache, --fit, and --settings, --goals g01,g11), in both arms:
- seed indices through goal.after precede each request;
- the date instruction reads 2026-10-08 for g01 and 2026-10-09 for g11;
- a lookup of LH-80941 at g11 returns the versioned text;
- in the aggregate arm only, the first-pass system message holds, in order: system text, '## Instructions', the date, '### Topic summaries', then the briefing; and the answer pass carries the same block;
- the control arm's system message has no summaries block;
- rows, selections, messages, judgments, and run.json are written;
- `--dry` exits 0 for copies 1-8 with zero fetches.
  PROOF: `node --test bench5/tests/Driver.test.ts` spawns bench.ts as a child against startFixture, with fetch throwing on :11434, and asserts the acceptance list. Offline. It then runs `node bench5/bench.ts --dry --copy N --cache SCRATCH` for N from 1 to 8 and expects exit 0 and 'fetches 0'.
- series-tools [builder] /home/user/scaffold/.orkestrel/agent/instruments/harness/tools/run-one.ts, /home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/plan.ts, /home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/tests/plan.test.ts
  BRIEF: Role: let tools/series.ts run bench5. Depends on: driver.

run-one.ts:
- Replace the HARNESSES set (run-one.ts:18) with a map from harness to entry: bench to bench.mjs, bench3 to bench.mjs, bench5 to bench.ts.
- Spawn that entry (run-one.ts:86).
- For bench5, hash the sorted contents of bench5/*.ts and bench5/aggregates/*.ts, excluding tests, as harness-sha256 (run-one.ts:81).
- Keep every exit code and the refusal order: the existing-output check comes before the cold start.

plan.ts:
- Usage: `node bench5/plan.ts --models q2[,g2,...] --copies A-B --cache DIR --out FILE`. Exit 0, or 64 on usage.
- Writes PlanEntry[] as series.ts:4-8 reads them:
  - name `l5-SHORT-ARM-vN`;
  - harness 'bench5';
  - estimate = 60 × 1.3 × the projected minutes per copy, using a table in plan.ts that copies the series projection with copy 1 and later copies kept apart;
  - args ['--run', '--live', '--copy', N, '--model', TAG, '--arm', ARM, '--cache', DIR].
- Entries are interleaved per copy, with the first arm alternating by copy parity.

Acceptance:
- A plan for q2 copies 1-4 has 8 entries in the order control, aggregate, aggregate, control, and so on.
- run-one exits 2 for an existing bench5 output and 64 for an unknown harness, both before any daemon contact.
  PROOF: `node --test bench5/tests/plan.test.ts` asserts the plan, and spawns tools/run-one.ts against a scratch OUT_BASE that holds an existing NAME directory, expecting exit 2 and no cold start. The test checks that cold-start.mjs was not spawned by finding no run.log line. Offline.
- report [builder] /home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/report.ts, /home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/tests/report.test.ts
  BRIEF: Role: metrics and the stopping verdict. Depends on: driver, which fixes the row and record shapes in types.ts.

- Usage: `node bench5/report.ts --base DIR --pair SHORT,A-B [--json FILE]`. --pair repeats. Exit 0, 1 on a missing or short run, 64 on usage.
- For each run under DIR, read rows.jsonl, selections.jsonl, aggregates.jsonl, calls.jsonl, and the -wire/*_api_chat-response.json prompt_eval_count values.
- Compute every metric in the proposal's metrics section except the shadow and the audit.
- For each pair: d per copy over goals without the g06 prefix, mean, sd, and the bounds mean ± 2·sd/√n.
- Print the invariant verdicts (sole-carried tokens, a rendered aggregate after a failed check, an overflow without a paired control overflow, a g01 plan mismatch), then 'STOP' when mean + 2·sd/√n < 0, else 'CONTINUE'.

Acceptance: on handmade run directories with known rows, the computed d, bounds, invariant lines, and verdict equal hand-computed values.
  PROOF: `node --test bench5/tests/report.test.ts` with fixture run directories written by the test. Offline.
- shadow [builder] /home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/shadow.ts, /home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/tests/shadow.test.ts
  BRIEF: Role: the judge's keep and drop rates, with and without aggregates in its state. Depends on: driver and kinds-and-judge-cache.

- Usage: `node bench5/shadow.ts --run DIR --cache DIR --out FILE [--live] [--url URL]`. Exit 0, 1 on missing inputs, 64 on usage.
- Inputs: messages.jsonl, judgments.jsonl, aggregates.jsonl, and the copy file named in run.json, for seed truth.
- For each category judgment of a message whose seed index is above 47:
  - build the shadow state: 'Topic summaries:' followed by the prose of the aggregates current before that message's read point, for the message's topics (owner entities by matchEntities, desk topics from its topic judgments) and the request's topics. Then a blank line, then 'Message: ' plus the plain state.
  - ask the same question through the JudgeCache, live or offline.
- Do the same for each amends and supersedes judgment, using the pair state prefixed the same way.
- Compute keep, drop, pair recall, false drop, and flips against truth, for the plain answers and the shadow answers, at FIT cutoffs.
- Write the rows and the rates.

Acceptance: on a fixture run directory with preloaded cache rows, the rates equal hand-computed values, and a missing aggregate leaves the state plain and is counted.
  PROOF: `node --test bench5/tests/shadow.test.ts` with an offline cache and fetch throwing on :11434. Offline.
- calibrate [builder] /home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/calibrate.ts, /home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/tests/calibrate.test.ts
  BRIEF: Role: fit the CHANGE and AGREE cutoffs. Depends on: aggregator, summarizer, kinds-and-judge-cache.

- Usage: `node bench5/calibrate.ts --cache DIR --model TAG --out DIR [--live] [--url URL]`. Exit 0, or 64 on usage.
- Build labelled items from seed truth, never from the judge. At each distinct goal.after, for each desk topic:
  - sources are the decisive-truth messages up to that index whose truth.topics include the topic, minus the earlier sides of truth amends and supersedes pairs;
  - summarize them with the Summarizer and buildSummaryPrompt;
  - CHANGE positives: the next decisive message carrying the topic. CHANGE negatives: decisive messages without the topic, and messages already among the sources;
  - AGREE positives: summaries that pass checkProse. AGREE negatives: the same summary with one value replaced by code, either by a value from a truth-stale sentence of the topic or by a same-shape value from another topic.
- Ask each item through the JudgeCache.
- Fit each cutoff as the lowest value above 0.5 that gives no yes on the negatives. If none exists, take the value above 0.5 with the best balanced accuracy and set separated false.
- Write OUT/fit.json { change, agree, separated, counts } and OUT/items.jsonl.

Acceptance: on an offline fixture of items with preloaded cache answers, the fitted cutoffs and the separated flag equal hand-computed values.
  PROOF: `node --test bench5/tests/calibrate.test.ts` against startFixture and an offline cache. Offline.
- audit-adapter [builder] /home/user/scaffold/.orkestrel/agent/instruments/harness/audit/items.ts, /home/user/scaffold/.orkestrel/agent/instruments/harness/audit/tally.ts, /home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/tests/audit.test.ts
  BRIEF: Role: let the blind audit read 24-row long runs. Depends on: long-copies.

- items.ts gains three flags: --variants DIR (default bench/variants; items.ts:17), --seed FILE (default bench/scenario.json; items.ts:18), and --rows N (default 10; items.ts:11). For a run without control or compaction in its name, it reads DIR/vN.json when --variants names the long folder.
- tally.ts gains --rows N (default 10; tally.ts:13) and reads ROWS from it.
- Every default behavior stays byte-identical.

Acceptance:
- With defaults, both tools give the same output as before on a 10-row fixture.
- With --rows 24 and the long paths, a 24-row fixture is accepted and tallied.
  PROOF: `node --test bench5/tests/audit.test.ts` runs both tools as children on fixture directories in the test's temp directory: a 10-row fixture with defaults, compared against the output before the edit and recorded as a fixture, and a 24-row fixture with the flags. Offline.
- seed-pass-and-fit [builder] /home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/fit.json, /home/user/scaffold/.orkestrel/agent/instruments/harness/tmp/l5/cache/judge.jsonl, /home/user/scaffold/.orkestrel/agent/instruments/harness/tmp/l5/seed, /home/user/scaffold/.orkestrel/agent/instruments/harness/tmp/l5/calibrate
  BRIEF: Role: live pilot, judge and q2 only. It fills the shared judge cache and fits the cutoffs. Depends on: every builder unit.

1. Create tmp/l5.
2. Load the corpus into tmp/l5/cache/judge.jsonl through importCorpus.
3. Run the seed pass under the dispatch skill's launch.ts with a cap (README.md:45-49): `node bench5/bench.ts --seed --live --copy 1 --cache tmp/l5/cache --out tmp/l5/seed`.
4. Run `node bench5/bench.ts --dry --copy N --cache tmp/l5/cache` for N from 1 to 8. Every seed-only question must be a hit.
5. Run calibrate.ts live on qwen3.5:2b-q4_K_M into tmp/l5/calibrate, then copy its fit.json to bench5/fit.json.

Record the wall time, questions, and seconds per question for each step in tmp/l5/notes.json.

Acceptance:
- Dry coverage shows zero seed-only misses on all eight copies.
- fit.json exists with cutoffs above 0.5, or with separated false recorded.
- Measured seconds per question replace the projection's 2.64 to 4.3 s.
  PROOF: Live: the commands above against 127.0.0.1:11434 under launch.ts. The offline check that follows is `node bench5/bench.ts --dry --copy N --cache tmp/l5/cache` printing zero seed-only misses for N from 1 to 8.
- pilot [builder] /home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/settings.json, /home/user/scaffold/.orkestrel/agent/instruments/harness/tmp/l5/pilot
  BRIEF: Role: live pilot that sets the allowance, retry bound, and summarizer cap, and measures the aggregate overhead. Depends on: seed-pass-and-fit.

1. Run through tools/run-one.ts, harness bench5, base tmp/l5/pilot: q2 copy 1 with --goals g01,...,g12, control first, then aggregate. Start the aggregate run with a provisional allowance equal to the smallest per-goal headroom the control run leaves, meaning capacity minus (maxPrompt + largest completion), and with provisional --retry and --predict values recorded in the run line.
2. Write settings.json:
   - allowance: the smallest headroom over the control's 12 goals;
   - retry: the bound under which a topic that keeps failing stops costing summarizer calls within its read point, read from the pilot's retry log;
   - predict: the largest summarizer completion observed, rounded up to the next 16 tokens.
3. Rerun the aggregate arm with settings.json.
4. Run report.ts on the pilot base.

Acceptance:
- No invariant line fails.
- No aggregate-arm overflow occurs.
- tmp/l5/pilot/notes.json records summarizer seconds, builds, CHANGE and AGREE seconds, and per-goal wall time against control.
- The plan.ts estimate table is updated from those measurements before Stage A.
  PROOF: Live: the run-one commands against 127.0.0.1:11434 under launch.ts. Offline after the runs: `node bench5/report.ts --base tmp/l5/pilot --pair q2,1-1` prints no invariant failure.

## risks
- The selection wrapper relies on AgentContext.select reading the scope at call time (AgentContext.ts:169). It also relies on the ledger restoring the previous scope after the answer pass (Ledger.ts:351-372). A trim that caches the handler or drops the restore breaks the arm silently. bench5/seams.ts and the driver proof assert both behaviors.
- The Mirror copies private ledger logic: assign, the pending tool results, and the near and owner computation. It can drift from the vendored build. The Mirror proof compares it with the ledger's own briefing on g01. At run time, the driver logs any owner title that appears in the briefing but is missing from the Mirror.
- The plan cap prices only options.system plus the briefing (Ledger.ts:725-731). The date line and the summaries block sit outside the plan, so a multi-turn goal can overflow capacity 3072, and the ledger refuses no over-window prompt (agent.md:548). The pilot sets the allowance from measured headroom, and report.ts counts overflows per arm.
- The gauge rescales from each request's first call, and the aggregate arm's calls include the summaries block (Gauge.ts:122-131; Ledger.ts:920-933). Its scale can drift from the control's and change later plans. Only g01 must plan identically. report.ts reports plan equality wherever event sets match, and gauge scale per goal.
- The 2B summarizer might fail checkProse or AGREE often enough that most aggregates are withheld. The arm would then read like the control for mechanical reasons. Withheld and failure rates are reported, so a null result can be told apart from a negative one.
- AGREE might not separate planted mutations on Mica; this form is unmeasured. The driver then acts on the code check alone and only logs AGREE (fit.separated false). This weakens the section 9 consistency reading.
- Summarizer calls evict the agent model's prompt prefix in the daemon. This inflates aggregate-arm wall time and can add CPU numeric nondeterminism to agent replies. The cost is recorded by role in calls.jsonl.
- The vendored ollama judge inherits @orkestrel/agent 0.0.29 error classes (README.md:63). The 0.0.30 isJudgeError guard might then miss a QUESTION refusal, so such questions are re-asked instead of held. Both arms share this, as bench4 did.
- q4 has no measured timing, and every aggregate-overhead term is assumed. Total wall time can exceed the 32 h ceiling. series.ts budgets stop a stage, and the pilot replaces the assumptions.
- The CHANGE and AGREE cutoffs are fitted on q2's summaries and reused for every model. The FIT thresholds were fitted on seed 0-47, and the long seed's later messages are out of sample for them. All judge-dependent readings are in-sample or cross-model.
- check-long.mjs was not run. The predicted exit 3 rests on reading lines 336-343 and the g01 field comparison.
- Tension T1, for the Orchestrator: for g01-g10, restore the scenario.json scoring fields, as the check and the notes require (this design), or keep the long values and fix check-long and the notes. The design keeps short-scenario parity and makes the short copies valid.
- Tension T2: the summarizer is the model under test (this design: no third model on the CPU host, and no swaps), or one fixed summarizer for all models. A fixed summarizer gives identical aggregates across models and a model-independent shadow reading, but costs load swaps beside Mica.
- Tension T3: never-only-carrier as a render filter against the ledger's selection (this design: adds no verbatim text, so it isolates the aggregate), or verbatim source lines inside the block (lets aggregates carry values the plan cut, but confounds the comparison with extra context). A third, sources-only arm would isolate the prose; it is not in this series.
- Tension T4: additive budget, where the ledger options are equal and the block sits in the headroom (this design, required by the dispatch), or budget-neutral, with a lower share.prompt in the aggregate arm. The second is the compaction question at a fixed budget.
- Tension T5: CHANGE triggers rebuilds but writes no supersession mark into the ledger's filing, and the aggregate-informed filing is measured only by the offline shadow. A later arm can drive the filing through the judge wrapper rewriting state, at the cost of a second difference between arms.
- Tension T6: rebuilds run once per read point from the full source set, eagerly for every changed topic (this design), versus per arriving event, or lazily for rendered topics only. The lazy form cuts summarizer calls but leaves aggregates missing for the shadow reader.
- Tension T7: the date goes in an instruction for both arms. The g01-g10 prompts then differ from bench4's system-date placement, so the long run's first 10 goals compare with the p1 readings only approximately.
- Tension T8: the vendored bytes come from agent-release dist before the trim lands; that directory is not a git repository, so provenance rests on the version field and the digest. The alternative is the npm-published @orkestrel/agent 0.0.30 tarball, an exact identity that needs a network fetch.
- Tension T9: the Stage A stop uses the scorer, with the blind audit confirming before any claim. The alternative is waiting for the audit, which costs Haiku wall time but no daemon time.
- Tension T10: the shared judge and summary caches make every judge answer identical across arms and copies. This removes judge noise from the comparison but hides any Mica nondeterminism. One uncached re-ask sample per stage could measure that; it is not in this design.