# Design for porting the records ledger into `@orkestrel/agent` (planner, subjective lane)

**Lane:** subjective. This lane owns shape, naming, ergonomics, and design fit. Claims about byte fidelity and about what the contracts permit go under Tensions, for the objective lane to rule on.

**Design in one paragraph.** The port adds one module, `src/core/ledgers/`. Its public entity is `Ledger`, built by `createLedger(provider, options)`. A ledger owns one conversation and one agent. It files every message through an injected judge into the conversation's judgments, projects the per-owner records and the rules record, and builds a briefing and a tail inside a token window. Its agent gets one selection handler, one tool registry (the application's lookups behind a repeat stop, plus `recall`), and one answer pass. A single additive contract change carries the briefing: an optional `Selection.briefing` member that `AgentContext.build` appends to the system message. Every judge-facing question, key, and state stays byte-identical to the measured harness. Every application-specific part becomes an option:
- desk topics
- thresholds
- the lookup tools and their result grammar
- the note wording
- the system text with its date sentence

The port removes handles (`[rN]`, `mN:`, recall by handle, the handle sentence). That ruling is the largest departure from the measured bytes; Tension T1 holds it for the Orchestrator.

## 1. Method inventory

The following table rules every part of `Ledger`, the ledger tools, the answer run, `records.mjs`, and `PROFILES.refined`.

| Part | Location | Ruling | Port |
| --- | --- | --- | --- |
| Option `conversation` | /home/user/agent/tmp/bench3/bench.mjs:1052 | method | `ledger.conversation` |
| Option `model` | /home/user/agent/tmp/bench3/bench.mjs:1053 | method | read from `judge.model` |
| Option `desk` | /home/user/agent/tmp/bench3/bench.mjs:1054 | method (application data) | `topics` |
| Option `fit` | /home/user/agent/tmp/bench3/bench.mjs:1055, values at /home/user/agent/tmp/bench3/bench.mjs:814 | method (application data, fitted in-sample) | `thresholds`, required, no default |
| Option `form` | /home/user/agent/tmp/bench3/bench.mjs:1056 | instrumentation (ablation; measured `choice`, /home/user/agent/tmp/bench3/bench.mjs:222) | choice form only |
| Option `horizon` | /home/user/agent/tmp/bench3/bench.mjs:1057 | instrumentation in effect (refined 99, /home/user/agent/tmp/bench3/bench.mjs:130, retires nothing in a 10-request shift) | retirement dropped |
| Option `ctx` | /home/user/agent/tmp/bench3/bench.mjs:1058 | method | `window` |
| Option `budget` | /home/user/agent/tmp/bench3/bench.mjs:1059 (0.7 at /home/user/agent/tmp/bench3/bench.mjs:198) | method | `share.prompt` |
| Option `tail` | /home/user/agent/tmp/bench3/bench.mjs:1060 | method | `share.tail` |
| Option `system` | /home/user/agent/tmp/bench3/bench.mjs:1061 | method (sizes the system message; names excluded from the party prefix) | `system` |
| Option `clock` | /home/user/agent/tmp/bench3/bench.mjs:1062 | instrumentation (feeds the record hash /home/user/agent/tmp/bench3/records.mjs:102 and `advance`; the measured date sentence sits in the system text, /home/user/agent/tmp/bench3/bench.mjs:997) | dropped; the application writes the date into `system` |
| Option `replyMode` | /home/user/agent/tmp/bench3/bench.mjs:1063 | instrumentation (measured `terminal`, /home/user/agent/tmp/bench3/bench.mjs:195) | final-message replies only |
| Field `answering` | /home/user/agent/tmp/bench3/bench.mjs:1084 | instrumentation (set only when cache is stable and the cue is off, /home/user/agent/tmp/bench3/bench.mjs:3404) | dropped |
| Fields `scale`, `fixed`, `reply`, `history` | /home/user/agent/tmp/bench3/bench.mjs:1085 | method | `Gauge` |
| Field `seedCount` | /home/user/agent/tmp/bench3/bench.mjs:1089 | method | derived: assistant messages after the first served request are loop-written |
| Field `failed` | /home/user/agent/tmp/bench3/bench.mjs:1090 | method | `Classifier` |
| Fields `trace`, `expiry`, `routes` | /home/user/agent/tmp/bench3/bench.mjs:1091, /home/user/agent/tmp/bench3/bench.mjs:1092, /home/user/agent/tmp/bench3/bench.mjs:1096 | instrumentation | dropped |
| Field `results` | /home/user/agent/tmp/bench3/bench.mjs:1093 | method | failure outcomes recorded from the `tool` event; name and arguments derived from the call |
| Field `pins` | /home/user/agent/tmp/bench3/bench.mjs:1094 | method held as stored state | derived units |
| Field `runs` | /home/user/agent/tmp/bench3/bench.mjs:1095 | method | private runs |
| Field `registry` | /home/user/agent/tmp/bench3/bench.mjs:1097 | method with scenario grammar | `collectRegistry` over `LookupHandler` readings |
| Field `notes` | /home/user/agent/tmp/bench3/bench.mjs:1099 | method | private notes |
| Field `withheld` | /home/user/agent/tmp/bench3/bench.mjs:1100 | instrumentation (tool replies and the hold gate) | dropped |
| Field `#index` | /home/user/agent/tmp/bench3/bench.mjs:1101, check at /home/user/agent/tmp/bench3/bench.mjs:1395 | defect (cache keyed by list length) | indexed per select site |
| Field `#handles` | /home/user/agent/tmp/bench3/bench.mjs:1102 | method as measured | dropped with handles (T1) |
| `answerNow` | /home/user/agent/tmp/bench3/bench.mjs:1164 | method (wording) | `notes.closed` |
| `load` | /home/user/agent/tmp/bench3/bench.mjs:1169 | method | derived: a tool message with no recorded failure counts as successful |
| `current`, `beginRun` | /home/user/agent/tmp/bench3/bench.mjs:1185, /home/user/agent/tmp/bench3/bench.mjs:1190 | method | `respond` opens a run |
| `completeRun` | /home/user/agent/tmp/bench3/bench.mjs:1209 | instrumentation in effect (touched topics feed retirement only) | dropped |
| `select` | /home/user/agent/tmp/bench3/bench.mjs:1223 | method; `assertPlan` call at /home/user/agent/tmp/bench3/bench.mjs:1233 is instrumentation | private select; `assertPlan` becomes a test oracle |
| `adopt` | /home/user/agent/tmp/bench3/bench.mjs:1240 | method (entered plan); `tailIds`/`shown` serve pins and handles | entered plan kept; the rest dropped |
| `settle` | /home/user/agent/tmp/bench3/bench.mjs:1249 | method in effect | derived: lookup results before the request are units |
| `measureSeed` | /home/user/agent/tmp/bench3/bench.mjs:1257 | method | `calibrate` and `Gauge` |
| `measureCall`, `measureRun`, `measureReply`, `marginal`, `left`, `reserve`, `room` | /home/user/agent/tmp/bench3/bench.mjs:1265 to /home/user/agent/tmp/bench3/bench.mjs:1315 | method | `Gauge` |
| `closed` | /home/user/agent/tmp/bench3/bench.mjs:1321 | method | recall guard |
| `affords` | /home/user/agent/tmp/bench3/bench.mjs:1330 | instrumentation (deny gate) | dropped |
| `advance` | /home/user/agent/tmp/bench3/bench.mjs:1337 | instrumentation (`date off`) | dropped |
| `record` | /home/user/agent/tmp/bench3/bench.mjs:1344 | method; defect F3 (a held call id returns early and hides the repeat) | outcomes paired by position; the repeat is read from the result |
| `#learn` | /home/user/agent/tmp/bench3/bench.mjs:1362, regexes /home/user/agent/tmp/bench3/bench.mjs:1369 | method with scenario grammar | `LookupHandler` |
| `empty` | /home/user/agent/tmp/bench3/bench.mjs:1383 | method with scenario wording | `LookupHandler` returns `undefined` |
| `repeated` | /home/user/agent/tmp/bench3/bench.mjs:1388 | method | failure text equals `notes.repeat` |
| `#messages` | /home/user/agent/tmp/bench3/bench.mjs:1393 | defect (`#index`) | per-call index |
| `#numbers`, `nextNumber`, `handle`, `pinHandle`, `normalize`, `resolve` | /home/user/agent/tmp/bench3/bench.mjs:1410 to /home/user/agent/tmp/bench3/bench.mjs:1474 | method as measured (handles) | dropped (T1) |
| `message`, `position`, `call`, `result`, `text`, `state` | /home/user/agent/tmp/bench3/bench.mjs:1424 to /home/user/agent/tmp/bench3/bench.mjs:1487 | method (`state` is the byte-exact judge state) | private readers |
| `line`, `lead`, `ruleLines`, `mark` | /home/user/agent/tmp/bench3/bench.mjs:1491 to /home/user/agent/tmp/bench3/bench.mjs:1515 | method; lead and mark carry handles | lines without leads or marks; sentence split kept |
| `loopWritten`, `codeCategory` | /home/user/agent/tmp/bench3/bench.mjs:1517, /home/user/agent/tmp/bench3/bench.mjs:1521 | method | classifier `assign` handler |
| `specCategory`, `specTopic`, `specPair` | /home/user/agent/tmp/bench3/bench.mjs:1529 to /home/user/agent/tmp/bench3/bench.mjs:1547 | method (keys, questions, states byte-exact) | `Classifier` |
| `read`, `noul`, `categories`, `weigh`, `category`, `quiet`, `decisive`, `opensCorrection` | /home/user/agent/tmp/bench3/bench.mjs:1549 to /home/user/agent/tmp/bench3/bench.mjs:1607 | method | `Classifier` |
| `entities` | /home/user/agent/tmp/bench3/bench.mjs:1613 | method | `matchEntities` |
| `deskTopics`, `topics`, `label` | /home/user/agent/tmp/bench3/bench.mjs:1630 to /home/user/agent/tmp/bench3/bench.mjs:1649 | method | `Classifier` and private readers |
| `fail`, `failure` | /home/user/agent/tmp/bench3/bench.mjs:1653, /home/user/agent/tmp/bench3/bench.mjs:1657 | method | `Classifier` |
| `categorize` | /home/user/agent/tmp/bench3/bench.mjs:1667; logprob trace at /home/user/agent/tmp/bench3/bench.mjs:1690 is instrumentation | method | `classifier.classify` |
| `marks` | /home/user/agent/tmp/bench3/bench.mjs:1726 | method | `Classifier` |
| `replaced` | /home/user/agent/tmp/bench3/bench.mjs:1747 | method; defect R8 (unsorted keys, /home/user/agent/tmp/bench3/bench.mjs:948) | canonical recursive key |
| `writeRun`, `end`, `ends` | /home/user/agent/tmp/bench3/bench.mjs:1763 to /home/user/agent/tmp/bench3/bench.mjs:1799 | method, retirement part instrumentation in effect | replacement kept, retirement dropped |
| `write`, `owed`, `seedLookups`, `pinWhole` | /home/user/agent/tmp/bench3/bench.mjs:1801 to /home/user/agent/tmp/bench3/bench.mjs:1841 | pin store | derived units |
| `specific` | /home/user/agent/tmp/bench3/bench.mjs:1844 | method (`autopin named`) | unit rule |
| `autoPin` | /home/user/agent/tmp/bench3/bench.mjs:1850 | method; touch re-pin is retirement | unit rule; re-pin dropped |
| `#stub` | /home/user/agent/tmp/bench3/bench.mjs:1874 | method | `renderStub` |
| `after` | /home/user/agent/tmp/bench3/bench.mjs:1889 | method | private |
| `digest`, `#noteLine` | /home/user/agent/tmp/bench3/bench.mjs:1901, /home/user/agent/tmp/bench3/bench.mjs:1918 | method; defect F4b (one lead stripped) | digest of lead-free lines |
| `#resultLead` | /home/user/agent/tmp/bench3/bench.mjs:1926 | handles | dropped |
| `project`, `measure`, `#history`, `#tail`, `#relevance` | /home/user/agent/tmp/bench3/bench.mjs:1932 to /home/user/agent/tmp/bench3/bench.mjs:2016 | method | private plan steps |
| `recordInput` | /home/user/agent/tmp/bench3/bench.mjs:2019 | method; defect R5a (empty successor dropped at /home/user/agent/tmp/bench3/bench.mjs:2030) | empty successors replace |
| `projectRecords` | /home/user/agent/tmp/bench3/bench.mjs:2054; `checkRecords` at /home/user/agent/tmp/bench3/bench.mjs:2067 is instrumentation | method | private; oracle moves to tests |
| `plan` | /home/user/agent/tmp/bench3/bench.mjs:2073; report fields from /home/user/agent/tmp/bench3/bench.mjs:2176 are instrumentation except `estimate` | method; defect R9 limit at /home/user/agent/tmp/bench3/bench.mjs:2117 | private plan |
| `#recordsReport` | /home/user/agent/tmp/bench3/bench.mjs:2204 | instrumentation | dropped |
| `#ruled`, `#render`, `#renderRecords` | /home/user/agent/tmp/bench3/bench.mjs:2224 to /home/user/agent/tmp/bench3/bench.mjs:2324 | method; values block is pin-tool only; defect R2a (raw stale lines) | private render, stale filtered on every route |
| `#tally` | /home/user/agent/tmp/bench3/bench.mjs:2327 | instrumentation (`tally off`) | dropped |
| `#handlesInView`, `#candidates`, `pin` | /home/user/agent/tmp/bench3/bench.mjs:2379 to /home/user/agent/tmp/bench3/bench.mjs:2465 | pin tool, ablation | dropped |
| `#recallKey` | /home/user/agent/tmp/bench3/bench.mjs:2467 | method | topic-only key |
| `recall` | /home/user/agent/tmp/bench3/bench.mjs:2473; handle branch /home/user/agent/tmp/bench3/bench.mjs:2497 | method; defect F6; open item 2 | lead-free lines, no handle branch |
| `#callSize` | /home/user/agent/tmp/bench3/bench.mjs:2579 | method; defect F8 | prices `{ topic }` only |
| `#cut` | /home/user/agent/tmp/bench3/bench.mjs:2584 | method | `cutItems` |
| `#resolveRead`, `readHandle` | /home/user/agent/tmp/bench3/bench.mjs:2595, /home/user/agent/tmp/bench3/bench.mjs:2606 | read tool, ablation | dropped |
| `LedgerChatProvider` | /home/user/agent/tmp/bench3/bench.mjs:2620 | instrumentation | dropped |
| Tools `open` | /home/user/agent/tmp/bench3/bench.mjs:2772 | method | recall guard |
| Tools `once` | /home/user/agent/tmp/bench3/bench.mjs:2780, key at /home/user/agent/tmp/bench3/bench.mjs:2782 | method; R8 (top-level sort only, /home/user/agent/tmp/bench3/bench.mjs:944) | repeat stop on canonical key |
| Tools `guard` | /home/user/agent/tmp/bench3/bench.mjs:2791 | method (`repeat-stop all`) | kept |
| Recall `category` schema | /home/user/agent/tmp/bench3/bench.mjs:2792 | instrumentation (`recall-category off`) | dropped |
| `lookup_order`, `lookup_customer` | /home/user/agent/tmp/bench3/bench.mjs:2795, /home/user/agent/tmp/bench3/bench.mjs:2801 | application tools | `Lookup.tool` |
| `pin`, `read` tools | /home/user/agent/tmp/bench3/bench.mjs:2807, /home/user/agent/tmp/bench3/bench.mjs:2834 | ablation (`arm-tools recall`) | dropped |
| `recall` tool | /home/user/agent/tmp/bench3/bench.mjs:2821, description /home/user/agent/tmp/bench3/bench.mjs:2823 | method; the description names handles and the scenario | `recall.description`, handle-free default |
| `send_reply` | /home/user/agent/tmp/bench3/bench.mjs:2842 | ablation | dropped |
| `createResultWrapper` | /home/user/agent/tmp/bench3/bench.mjs:2863 | handles plus cache advertising | dropped; every tool advertised |
| `createGateAuthority`, `ruleGate` | /home/user/agent/tmp/bench3/bench.mjs:2889, /home/user/agent/tmp/bench3/bench.mjs:2907 | ablation (`gate deny`) | dropped |
| `measureScale` | /home/user/agent/tmp/bench3/bench.mjs:2943 | method on an Ollama wire | `ledger.calibrate`, provider-agnostic |
| `fitSlope` | /home/user/agent/tmp/bench3/bench.mjs:6055 | method | `fitSlope` |
| Agent wiring | /home/user/agent/tmp/bench3/bench.mjs:3325 (limit 8 at /home/user/agent/tmp/bench3/bench.mjs:3330, `strict: false` at /home/user/agent/tmp/bench3/bench.mjs:3331) | method | `DEFAULT_LEDGER_LIMIT` |
| Instructions `open: ''` | /home/user/agent/tmp/bench3/bench.mjs:3482 | method as a carrier only | replaced by `Selection.briefing` (T2) |
| Tool listener | /home/user/agent/tmp/bench3/bench.mjs:3339; repeat abort /home/user/agent/tmp/bench3/bench.mjs:3346 | method; F3 | kept, fixed |
| `quiet` test | /home/user/agent/tmp/bench3/bench.mjs:3438 | method; defect F5 | any first pass without final text, unless the caller aborted |
| Seed pass | /home/user/agent/tmp/bench3/bench.mjs:3502 to /home/user/agent/tmp/bench3/bench.mjs:3507 | method (filing before the first request); seed record versions are instrumentation | first select files everything |
| Answer run: `collapsed`, `cue` | /home/user/agent/tmp/bench3/bench.mjs:3389, /home/user/agent/tmp/bench3/bench.mjs:3390 | method | fixed behavior |
| Answer run: digest note | /home/user/agent/tmp/bench3/bench.mjs:3391 | method | `notes.results` header |
| Answer run: cue note | /home/user/agent/tmp/bench3/bench.mjs:3393 | method | `notes.cue` |
| Answer run: continuation prepare | /home/user/agent/tmp/bench3/bench.mjs:3394 | method (`cache stable`) | continuation select |
| Answer run: message filter | /home/user/agent/tmp/bench3/bench.mjs:3395 | method; defect F4a (seed calls kept) | drops every tool message and call message |
| Answer run: scratch conversation | /home/user/agent/tmp/bench3/bench.mjs:3397, /home/user/agent/tmp/bench3/bench.mjs:3400, /home/user/agent/tmp/bench3/bench.mjs:3411 to /home/user/agent/tmp/bench3/bench.mjs:3414 | instrumentation (workaround) | dropped: the continuation select returns the collapsed view |
| Answer run: scope switch | /home/user/agent/tmp/bench3/bench.mjs:3399, /home/user/agent/tmp/bench3/bench.mjs:3406, /home/user/agent/tmp/bench3/bench.mjs:3410 | method (no tools advertised) | answer scope `tools: []` |
| Answer run: `generate`, digest record | /home/user/agent/tmp/bench3/bench.mjs:3407, /home/user/agent/tmp/bench3/bench.mjs:3408 | method, instrumentation | second pass |
| `records.mjs` `splitSentences` | /home/user/agent/tmp/bench3/records.mjs:25 | method | helper |
| `extractTokens` | /home/user/agent/tmp/bench3/records.mjs:37 | method | helper |
| `linkAccounts` | /home/user/agent/tmp/bench3/records.mjs:56 | method | `linkOwners` |
| `buildRecords` | /home/user/agent/tmp/bench3/records.mjs:77 | method; defects R2b (/home/user/agent/tmp/bench3/records.mjs:372), R8 (/home/user/agent/tmp/bench3/records.mjs:320); limits R5b (/home/user/agent/tmp/bench3/records.mjs:393), R9 (/home/user/agent/tmp/bench3/records.mjs:357); hash /home/user/agent/tmp/bench3/records.mjs:102 is instrumentation | helper, hash dropped |
| `selectRecords` | /home/user/agent/tmp/bench3/records.mjs:114 | method | helper |
| `renderRecord`, `renderPinned` | /home/user/agent/tmp/bench3/records.mjs:135, /home/user/agent/tmp/bench3/records.mjs:144 | method | helpers |
| `compareAmounts` | /home/user/agent/tmp/bench3/records.mjs:156 | instrumentation (unmeasured, outside the arm per /home/user/agent/tmp/bench/results/v9/RECORDS-PLAN.md:58) | not ported |
| `checkRecords` | /home/user/agent/tmp/bench3/records.mjs:186 | instrumentation | oracle in `tests/setupLedger.ts` |
| `records.mjs` internals `readSubjects`, `indexMessages`, `normalizeArguments`, `listLive`, `invertPairs`, `placeMember`, `listStale`, `buildLines`, `listRuns` | /home/user/agent/tmp/bench3/records.mjs:303 to /home/user/agent/tmp/bench3/records.mjs:403 | method (`listLive` carries R5a, comment /home/user/agent/tmp/bench3/records.mjs:324) | `buildRecords` internals |
| `readAmount`, `hashText`, `compareText`, `reverseKeys` | /home/user/agent/tmp/bench3/records.mjs:405 to /home/user/agent/tmp/bench3/records.mjs:417 | instrumentation (except `compareText`, method ordering) | `compareText` folded; the rest dropped or moved to tests |
| `gate admit` | /home/user/agent/tmp/bench3/bench.mjs:129 | method (no gate) | no gate |
| `horizon 99` | /home/user/agent/tmp/bench3/bench.mjs:130 | instrumentation in effect | dropped |
| `date on` | /home/user/agent/tmp/bench3/bench.mjs:131 | method, application-owned | application writes it into `system` |
| `tail-answers drop` | /home/user/agent/tmp/bench3/bench.mjs:132 | method | fixed |
| `tail-requests drop` | /home/user/agent/tmp/bench3/bench.mjs:133 | method | fixed |
| `rules last` | /home/user/agent/tmp/bench3/bench.mjs:134 | method | fixed |
| `handles bare` | /home/user/agent/tmp/bench3/bench.mjs:135 | method as measured | handles removed (T1) |
| `cache stable` | /home/user/agent/tmp/bench3/bench.mjs:136 | method | fixed |
| `autopin named` | /home/user/agent/tmp/bench3/bench.mjs:137 | method | fixed |
| `report full` | /home/user/agent/tmp/bench3/bench.mjs:138 | instrumentation | dropped |
| `arm-tools recall` | /home/user/agent/tmp/bench3/bench.mjs:139 | method | recall only |
| `tally off` | /home/user/agent/tmp/bench3/bench.mjs:140 | method | no "Not shown" block |
| `request-questions topics` | /home/user/agent/tmp/bench3/bench.mjs:141; literal at /home/user/agent/tmp/bench3/bench.mjs:842 | method; defect (scenario literal) | `Topic.requests` |
| `answer-cue on` | /home/user/agent/tmp/bench3/bench.mjs:142 | method | fixed |
| `recall-budget 2` | /home/user/agent/tmp/bench3/bench.mjs:143 | method | `recall.limit`, default 2 |
| `repeat-stop all` | /home/user/agent/tmp/bench3/bench.mjs:144 | method | fixed |
| `answer-view collapsed` | /home/user/agent/tmp/bench3/bench.mjs:145 | method (F4a) | fixed |
| `recall-split on` | /home/user/agent/tmp/bench3/bench.mjs:146 | method | fixed |
| `recall-category off` | /home/user/agent/tmp/bench3/bench.mjs:147 | method (F8) | fixed |
| `records off`, set `on` by `--records on` | /home/user/agent/tmp/bench3/bench.mjs:148 | method (on) | always on |

**Unknown 2: the judge is injected.** Four pieces of evidence support this:
- The measured judge is Mica, built by `createOllamaJudge` from another package (/home/user/agent/tmp/bench3/bench.mjs:518). That judge's errors are not instances of this checkout's classes (/home/user/agent/tmp/bench3/bench.mjs:519).
- The desk already builds that same judge (/home/user/desk/app/server/Desk.ts:55, model at /home/user/desk/app/core/constants.ts:19).
- The stock selection takes `judge: JudgeInterface` (/home/user/agent/src/core/contexts/types.ts:325).
- Reuse keys on `judge.model` (/home/user/agent/src/core/types.ts:146).

The questions, keys, and states stay inside the capability. They are the measured filing. The thresholds stay with the application, which follows the stock selection's no-default precedent (/home/user/agent/src/core/contexts/factories.ts:57).

## 2. Public surface

**Naming and placement choices:**
- **Module and folder.** Module `src/core/ledgers/`, barrel row `export * from './ledgers/index.js'` in /home/user/agent/src/core/index.ts:11.
- **Entity names.**
  - `Ledger` is the stateful entity.
  - `respond` is its verb. It serves one request to its reply; `execute` is reserved for lifecycle.
  - `Owner` generalizes "account".
  - `LedgerRecord` and `LedgerLine` avoid the built-in `Record`.
  - `TokenSet` avoids a plural type name.
- **One term per concept.** `Classification` and `Classifier` are the single term for the filing. `thresholds` is one term with `Criterion.threshold`. `topics` always means desk topics; `entities` means registry ids.
- **Interned classes.** `Classifier` and `Gauge` stay out of the barrel because only the ledger constructs them (/home/user/scaffold/.claude/rules/architecture.md:284).

**Contexts change (additive).** `Selection` gains `readonly briefing?: string` (/home/user/agent/src/core/contexts/types.ts:239). `build(selection)` appends it as the last system part, after instructions and workspace, joined by a blank line (/home/user/agent/src/core/contexts/AgentContext.ts:244). A scope's `instructions` allow-list never filters it.

The types file declares the following signatures, all with readonly members and collections.

```ts
interface Topic { name: string; criterion: string; requests?: boolean } // requests: default true
interface LedgerThresholds { category: number; topic: number; amends: number; supersedes: number; correction: number }
interface LedgerShare { prompt: number; tail: number }
interface LedgerNotes { cue: string; results: string; repeat: string; closed: string }
interface RecallOptions { limit?: number; description?: string }
interface Owner { id: string; names: readonly string[] }
interface LookupResult { ids: readonly string[]; owners: readonly Owner[] }
type LookupHandler = (args: Readonly<Record<string, unknown>>, text: string) => LookupResult | undefined // undefined: empty result
interface Lookup { tool: ToolInterface; read: LookupHandler }
interface Gauge { scale: number; fixed: number }
type LedgerAgentOptions = Pick<AgentOptions, 'limit' | 'timeout' | 'budget' | 'signal' | 'scheduler' | 'strict' | 'on' | 'error'>
interface LedgerOptions {
	judge: JudgeInterface; system: string; topics: readonly Topic[]; thresholds: LedgerThresholds; window: number
	gauge?: Gauge; lookups?: readonly Lookup[]; share?: Partial<LedgerShare>; recall?: RecallOptions
	notes?: LedgerNotes; agent?: LedgerAgentOptions; snapshot?: ConversationSnapshot
}
interface LedgerResult { content: string; passes: readonly AgentResult[] }
interface LedgerInterface {
	readonly agent: AgentInterface; readonly conversation: ConversationInterface; readonly gauge: Gauge | undefined
	respond(content: string, signal?: AbortSignal): Promise<LedgerResult>
	calibrate(signal: AbortSignal): Promise<Gauge>
}
interface TokenSet { ids: ReadonlySet<string>; numbers: ReadonlySet<number> }
interface LedgerRegistry { ids: ReadonlySet<string>; owners: ReadonlyMap<string, readonly string[]> }
interface LookupReading { id: string; name: string; arguments: Readonly<Record<string, unknown>>; text: string; result: LookupResult | undefined }
interface Classification { quiet: readonly string[]; categories: Readonly<Record<string, string>>; topics: Readonly<Record<string, readonly string[]>>; amended: Readonly<Record<string, readonly string[]>>; superseded: Readonly<Record<string, readonly string[]>> }
interface ProjectionInput { system: string; exclude: readonly string[]; owners: Readonly<Record<string, readonly string[]>>; messages: readonly Message[]; results: readonly LookupReading[]; entities: Readonly<Record<string, readonly string[]>>; classification: Classification }
interface LedgerLine { text: string; source: string; sentence: number; party?: string; topics: readonly string[]; role: MessageRole }
interface LedgerRecord { key: string; title: string; members: readonly string[]; lines: readonly LedgerLine[] }
interface StaleSentence { source: string; sentence: number; tokens: readonly string[] }
interface Projection { records: readonly LedgerRecord[]; stale: readonly StaleSentence[]; loose: readonly string[] }
interface ProjectionRequest { owners: readonly string[]; topics: readonly string[] }
interface ClassifierOptions { judge: JudgeInterface; topics: readonly Topic[]; thresholds: LedgerThresholds; assign: (message: Message) => string | undefined; entities: (text: string, partial: boolean) => ReadonlySet<string> }
interface ClassifierInterface { classify(requests: ReadonlySet<string>, signal: AbortSignal): Promise<{ keys: readonly string[]; usage?: TokenUsage }>; category(id: string): string | undefined; quiet(id: string): boolean; decisive(id: string): boolean; topics(id: string): ReadonlySet<string>; marks(): { amended: ReadonlyMap<string, readonly string[]>; superseded: ReadonlyMap<string, readonly string[]> }; classification(): Classification }
interface GaugeCall { estimate: number; prompt?: number; completion?: number; tools: number }
interface GaugeInterface { readonly scale: number; readonly fixed: number; measure(messages: readonly Message[]): number; rate(calls: readonly GaugeCall[]): number; left(calls: readonly GaugeCall[]): number; reserve(calls: readonly GaugeCall[], longest: string): number; room(calls: readonly GaugeCall[], longest: string): number; observe(calls: readonly GaugeCall[]): void }
type LedgerErrorCode = 'THRESHOLD' | 'SHARE' | 'WINDOW' | 'LIMIT' | 'GAUGE' | 'TOPIC'
```

Each kind file holds the following exports:
- **Constants (`constants.ts`).**
  - The judge-facing constants keep the measured wording verbatim: `LEDGER_CATEGORIES`, `LEDGER_CATEGORY_QUESTION`, `LEDGER_TOPIC_INSTRUCTIONS`, and `LEDGER_PAIR_QUESTIONS`.
  - `QUIET_CATEGORIES`, `DECISIVE_CATEGORIES`, `PLACED_CATEGORIES`, and `RULES_KEY`.
  - `DEFAULT_LEDGER_SHARE` is `{ prompt: 0.7, tail: 0.35 }`. `DEFAULT_LEDGER_LIMIT` is 8 and `DEFAULT_RECALL_LIMIT` is 2.
  - `LEDGER_NOTES` holds the measured terminal wording. `SCALE_DRIFT` is 0.06.
  - The sentence, token, name, join, and cut patterns.
- **Errors (`errors.ts`).** `LedgerError` with `code` and `context`, and `isLedgerError`.
- **Helpers (`helpers.ts`).**
  - Text: `splitSentences(text)`, `extractTokens(text): TokenSet`, `collectNames(text)` (the party rule), `collectCapitals(text)` (the `listNames` rule), and `normalizeArguments(args): string`, which sorts keys at every depth.
  - Registry: `linkOwners(results, owners)`, `collectRegistry(results)`, and `matchEntities(registry, text, partial)`.
  - Records: `buildRecords(input): Projection`, `selectRecords(projection, request)`, `renderRecord(record)`, and `renderPinned(record)`.
  - Questions and recall: `buildTopicQuestion(topic)`, `renderRecallDescription(topics)`, `splitTopic(query)`, and `cutItems(items, room)`.
  - Tail and gauge: `renderStub(name, args, state)`, where `state` is one of `'failed' | 'empty' | 'shown' | 'hidden'`, and `fitSlope(groups)`.
- **Factories (`factories.ts`).** `createLedger(provider: ProviderInterface, options: LedgerOptions): LedgerInterface`.

**How the ledger composes with each seam:**
- **Selection seam.** The ledger installs its private select as its agent's `AgentOptions.select` (/home/user/agent/src/core/agents/types.ts:394). The handler returns the tail and the briefing, plus the filing keys and the judge usage as the selection's judgments and usage. A foreign conversation gets `fault` with `view()`, per /home/user/agent/src/core/contexts/types.ts:246.
- **Judgments.** The classifier asks through `resolve` (/home/user/agent/src/core/conversations/types.ts:66) with the measured JSON keys. These keys never parse as stock `needed` keys (/home/user/agent/src/core/contexts/parsers.ts:13).
- **Conversations.** The ledger holds one conversation in a private manager. That manager has no summarizer, so the conversation never compacts and the ledger never sets `window`; the briefing is the ledger's compaction.
- **Tools.** Each `Lookup.tool` is re-created with `createTool` around a repeat-stop guard, beside `recall`. No tool symbol is re-exported.
- **Agent options.** `agent` passes the bounds through. Applying a scope that carries `select` displaces the ledger's handler (/home/user/agent/src/core/contexts/types.ts:337); the guide documents this.

## 3. Data flow per request

The following steps run on `ledger.respond(content, signal)`:

1. [pure] The ledger appends the request as a user message and opens a run.
2. [provider, first call only, when `gauge` is absent] `calibrate` generates over the system message and `view()` twice, with and without tool definitions. It reads `scale = bare / estimate` and `fixed = prompt - bare` from `usage.prompt`.
3. [provider loop] `agent.generate({ signal })` reaches run entry and calls the ledger's select.
4. [judge] `classify` asks the questions in this order:
   - a choice category for every message the `assign` handler leaves open, requests excepted;
   - a topic noul per topic for every non-quiet message and every request, skipping `requests: false` topics for requests;
   - `amends`, and then `supersedes` when amends reaches its threshold, for each correction-opening user message against each earlier message that shares a whole-name topic.

   Reuse goes through `matchesJudgment`. A per-question error leaves that item undecided, and a repeating-logprob error is held. An abort rethrows.
5. [pure] The ledger derives everything else from the conversation and the classification:
   - lookup readings, the registry, entities, and marks (amends gated by shared tokens);
   - the `Classification`, `buildRecords`, the request's owners and topics, and `selectRecords`;
   - units: decisive, specific user statements and successful lookups before the request, minus replaced ones, plus loose on-topic statements;
   - stale sentences, removed from every route.
6. [pure] Tail: the history before the first request (the seed), with answers dropped and lookup stubs. Whole call groups are taken newest first within `share.tail` of the budget, opening on a user message and ending on the request.
7. [pure] Consolidation: `## Pinned` holds the owner records under `###` headings and then the loose units. `## Rules` holds the rules record and then the loose rules. Lines are cut in the measured order until the system message fits `(window * share.prompt - fixed) / (1 + SCALE_DRIFT)` minus the tail. The run stores the entered plan, and the select returns the `Selection`.
8. [provider] `build` produces `[system: system + "\n\n" + briefing, ...tail]`, sent with the lookup and recall definitions.
9. [pure] Tool calls:
   - A repeated canonical call fails with `notes.repeat`, and the `tool` listener aborts the run with reason `repeat`.
   - `recall` refuses with `notes.closed` once the limit is spent, after a repeat, or when the room is short. It splits joined topics, searches registry, desk, and word matches, writes lead-free lines, and cuts them to room.
   - `turn` and `usage` events feed `GaugeCall`s.
10. [pure] When the first pass has no final text and the caller did not abort, the ledger adds a digest note and the cue note, then applies the answer scope (`tools: []`).
11. [provider] The second pass runs. Its select sees a ledger note and returns the entered briefing with the entered tail and later messages, minus every tool and call message. The ledger restores the scope.
12. [pure] `gauge.observe(calls)` rescales from the first call and keeps the longest reply. The ledger returns `{ content, passes }`.

## 4. Defect dispositions

The following table rules each defect and open item.

| Item | Ruling | Reason |
| --- | --- | --- |
| F3, repeated call id hides the repeat (/home/user/scaffold/.orkestrel/agent/frozen-harness-audit-verdict.md:13) | fixed | The repeat is read from the emitted result, and outcomes pair with tool messages by position. |
| F4a, the answer run keeps the seed's tool calls (/home/user/scaffold/.orkestrel/agent/frozen-harness-audit-verdict.md:14) | fixed | The collapsed view drops every tool message and call message. |
| F4b, nested recall leads survive the digest | fixed by construction | Recall lines carry no leads. |
| F5, a timeout or transport error skips the answer run (/home/user/scaffold/.orkestrel/agent/frozen-harness-audit-verdict.md:15) | fixed | The answer pass follows any first pass without final text, unless the caller aborted. |
| F6, joined handles not split (/home/user/scaffold/.orkestrel/agent/frozen-harness-audit-verdict.md:16) | fixed by removal | The port has no recall by handle. |
| F8, category prices the recall (/home/user/scaffold/.orkestrel/agent/frozen-harness-audit-verdict.md:17) | fixed | Pricing reads `{ topic }`. |
| F9, scorer edits (/home/user/scaffold/.orkestrel/agent/frozen-harness-audit-verdict.md:19) | out of scope | Harness scorer. |
| O1, empty-reply assertion (/home/user/scaffold/.orkestrel/agent/frozen-harness-audit-verdict.md:18) | out of scope | Harness fixture. The port's tests assert `content === ''` with clean passes. |
| R1, random ids in fault strings (/home/user/scaffold/.orkestrel/agent/records-candidate-audit-verdict.md:15) | out of scope | Diagnostics. The replay compares wire bodies. |
| R2a, stale raw lines on unscoped requests (/home/user/scaffold/.orkestrel/agent/records-candidate-audit-verdict.md:16) | fixed | Stale sentences are filtered on every system route. |
| R2b, a corrected correction revives the old value | fixed | A superseded corrector keeps its stale effect. |
| R5a, an empty successor leaves the old result (/home/user/scaffold/.orkestrel/agent/records-candidate-audit-verdict.md:17) | fixed | Readings with `result: undefined` replace earlier ones. |
| R5b / open item, the person prefix trusts capitals | documented limit | The prefix carries the measured g07 and g10 facts (/home/user/agent/tmp/bench/results/v9/RECORDS-PLAN.md:39). A test pins the known false case. |
| R6, a tight budget cuts a lookup (/home/user/scaffold/.orkestrel/agent/records-candidate-audit-verdict.md:18) | fixed by construction, limit documented | The stub reads the projected briefing, so "shown" is true. Request-owner lines are cut last. |
| R8, argument key order (/home/user/scaffold/.orkestrel/agent/records-candidate-audit-verdict.md:19) | fixed | Canonical key, sorted at every depth. |
| R9 / open item, a desk-wide correction stays in one owner's record (/home/user/scaffold/.orkestrel/agent/records-candidate-audit-verdict.md:20) | documented limit | The fix revives the "15 percent" token for other owners (/home/user/agent/tmp/bench/results/v9/RECORDS-PLAN.md:54). |
| R10, rules order follows desk topics (/home/user/scaffold/.orkestrel/agent/records-candidate-audit-verdict.md:21) | documented behavior | Not a defect. |
| Open item, recall results carry handles (/home/user/scaffold/.orkestrel/agent/records-series-verdict.md:40) | fixed | Handles are removed. |
| Open item, the credit check is buried (/home/user/scaffold/.orkestrel/agent/records-series-verdict.md:39) | out of scope, limit documented | Its arm is the relevance filter (/home/user/agent/tmp/bench/results/v9/FINDINGS-A1.md:105). |
| Scenario literals at /home/user/agent/tmp/bench3/bench.mjs:774, /home/user/agent/tmp/bench3/bench.mjs:842, /home/user/agent/tmp/bench3/bench.mjs:1369 | fixed | Replaced by `Lookup`, `Topic.requests`, and `LookupHandler`. |
| `#index` length cache (/home/user/agent/tmp/bench3/bench.mjs:1395) | fixed | Indexed per select. |

## 5. Units

The units run in build order. Each unit's gates come after its scope. The `verifier` runs the tree-wide gates after U7.

- **U1 `selection-briefing`**: builder on Claude Sonnet 5.5. No dependencies.
  - Owns /home/user/agent/src/core/contexts/types.ts, /home/user/agent/src/core/contexts/AgentContext.ts, /home/user/agent/tests/src/core/contexts/AgentContext.test.ts, and /home/user/agent/tests/src/core/agents/Agent.test.ts.
  - Adds `Selection.briefing` with its TSDoc and the build rule.
  - Tests:
    - the briefing goes last, after instructions and workspace;
    - a briefing alone yields one system message;
    - an `undefined` briefing leaves the output unchanged;
    - an instructions allow-list does not drop it;
    - a scripted provider (/home/user/agent/tests/setup.ts:608) receives a system message ending in the briefing, and the `select` event carries it.
  - Gates: `npx vitest run --config vite.config.ts --project src:core tests/src/core/contexts/AgentContext.test.ts tests/src/core/agents/Agent.test.ts`, `npm run check:src:core`.
- **U2 `ledger-types`**: opus on Claude Opus 5.5. No dependencies.
  - Owns /home/user/agent/src/core/ledgers/types.ts, /home/user/agent/src/core/ledgers/constants.ts, and /home/user/agent/src/core/ledgers/errors.ts.
  - Writes section 2's types, constants, and error class with full TSDoc. The constants copy /home/user/agent/tmp/bench3/bench.mjs:775 to /home/user/agent/tmp/bench3/bench.mjs:814 verbatim.
  - Runs the fleet name check for every public name (/home/user/scaffold/.claude/rules/names.md:128).
  - Gates: `npm run check:src:core`, `npm run test:policy`.
- **U3 `ledger-helpers`**: builder on Claude Sonnet 5.5. Depends on U2.
  - Owns /home/user/agent/src/core/ledgers/helpers.ts, /home/user/agent/tests/src/core/ledgers/helpers.test.ts, /home/user/agent/tests/setupLedger.ts, and /home/user/agent/tests/setupLedger.test.ts.
  - Ports records.mjs and the listed pure leaves with the R2b, R5a, and R8 fixes. Ports `checkRecords` as the oracle, and writes the fictional fixtures (Brightwater Studio, Odile Marlow) plus a scripted shift with a lookup tool and its `LookupHandler`.
  - Tests:
    - verbatim lines, stale removal, and the correction chain;
    - an empty successor;
    - key order, top-level and nested;
    - placement by id, by name, by amends pair, and loose;
    - the party prefix, including the pinned limit case "Riverside Depot: She orders on Mondays.";
    - rules order and reversed-key equality;
    - `fitSlope` groups, `cutItems`, `splitTopic`, and `renderStub`;
    - `setupLedger.test.ts` proves the oracle fires on each injected fault and passes a clean build.
  - Gates: `npx vitest run --config vite.config.ts --project src:core tests/src/core/ledgers/helpers.test.ts`, `npx vitest run --config vite.config.ts --project setup tests/setupLedger.test.ts`, `npm run check:src:core`.
- **U4 `ledger-classifier`**: astra on GPT-6 Astra. Depends on U2 and U3.
  - Owns /home/user/agent/src/core/ledgers/Classifier.ts and /home/user/agent/tests/src/core/ledgers/Classifier.test.ts.
  - Ports /home/user/agent/tmp/bench3/bench.mjs:1521 to /home/user/agent/tmp/bench3/bench.mjs:1744.
  - Tests use `RecordingJudge` (/home/user/agent/tests/setup.ts:390) against declared literal keys and states:
    - reuse makes no second ask;
    - requests skip their category question and their `requests: false` topics;
    - pairs are asked only for correction openers, and `supersedes` only after amends;
    - a held deterministic failure is not asked again, and a transient one is;
    - an abort keeps completed records;
    - marks apply the shared-token filter.
  - Gates: `npx vitest run --config vite.config.ts --project src:core tests/src/core/ledgers/Classifier.test.ts`, `npm run check:src:core`.
- **U5 `ledger-gauge`**: builder on Claude Sonnet 5.5. Depends on U2 and U3.
  - Owns /home/user/agent/src/core/ledgers/Gauge.ts and /home/user/agent/tests/src/core/ledgers/Gauge.test.ts.
  - Ports /home/user/agent/tmp/bench3/bench.mjs:1257 to /home/user/agent/tmp/bench3/bench.mjs:1315.
  - Tests compare against hand-computed declared values: measure, rescale minus fixed, slope pooled by tool count, and the left, reserve, and room arithmetic.
  - Gates: `npx vitest run --config vite.config.ts --project src:core tests/src/core/ledgers/Gauge.test.ts`, `npm run check:src:core`.
- **U6 `ledger-entity`**: astra on GPT-6 Astra. Depends on U1 through U5.
  - Owns /home/user/agent/src/core/ledgers/Ledger.ts, /home/user/agent/src/core/ledgers/factories.ts, /home/user/agent/src/core/ledgers/index.ts, /home/user/agent/src/core/index.ts, /home/user/agent/tests/src/core/ledgers/Ledger.test.ts, and /home/user/agent/tests/src/core/ledgers/factories.test.ts.
  - `/home/user/agent/tests/setupLedger.ts` is shared and report-only for this unit.
  - Ports `select`, `plan`, the tail, the render, recall, the tools, and the answer run with section 4's fixes. The declared briefing texts in the fixtures are the oracle.
  - Tests:
    - a final reply in one pass, with the briefing sections, a seed-only tail, and no earlier answers;
    - a repeat stop leads to an answer pass with the cue last, no tools advertised, and no call or tool messages;
    - F3 and F5;
    - a caller abort makes no answer pass;
    - recall limit, split, no category, F8 pricing, and lead-free lines;
    - the answer-pass system message equals the first pass's;
    - R2a, R9 pinned, a foreign conversation, and concurrency (`AgentError` `CONCURRENCY`);
    - `calibrate`, with `GAUGE` when usage is absent;
    - every validation code.
  - Gates: `npm run test:src:core`, `npm run test:policy`, `npm run check:src:core`.
- **U7 `ledger-guide`**: opus on Claude Opus 5.5. Depends on U6.
  - Owns /home/user/agent/guides/agent.md and /home/user/agent/tests/guides.test.ts.
  - Adds the Ledgers module surface rows, the `Selection.briefing` clause, and a "Serving requests through a ledger" pattern with a transcribed fence. Lists `Classifier` and `Gauge` as interned.
  - Gates: `npm run test:guides`, `npm run test:policy`.
- **U8 `ledger-replay`**: builder on Claude Sonnet 5.5. Depends on U6. Read-only under `tmp/bench`.
  - Owns /home/user/agent/tmp/probes/ledger-replay.test.ts.
  - Over a5-records-v1 to v8, the probe sets up the run as the measured harness did:
    - it imports /home/user/agent/tmp/bench/results/v3/cal-categories.jsonl into judgments, porting /home/user/agent/tmp/bench3/bench.mjs:3009;
    - it takes the gauge from each seed.json;
    - it answers lookups from the variant's tools table;
    - it serves `/api/generate` by exact body to `createOllamaJudge` from /home/user/ollama/dist/src/core/index.js, and serves `/api/chat` replies in order through a scripted `ProviderInterface` that records the messages and tools it receives.
  - Asserts:
    - every judge body has a recorded twin;
    - every agent request equals its recorded body after normalizations N1 to N7: separator, handle sentence, `[rN] ` prefixes, line leads, amended marks, recall description, recall leads;
    - every residual diff falls under F4a or R2a;
    - an injected unlisted diff fails, which is the control.
  - Gate: `npx vitest run --config vite.config.ts --project probe tmp/probes/ledger-replay.test.ts`.
- **U9 `ledger-series`**: builder on Claude Sonnet 5.5 for the driver; `verifier` reads the band.
  - Depends on U8 and on the host being free of the live series.
  - Owns /home/user/agent/tmp/bench4/.
  - Runs the port over the 8 copies, writing `p1-ledger-vN` beside read-only copies of the a4 and a5 rows.
  - Gates: `node /home/user/agent/tmp/bench/results/v9/tools/band.ts p1-ledger a4-refined /home/user/agent/tmp/bench4/results` must print `fix clears`, and `node /home/user/agent/tmp/bench/results/v9/tools/band.ts p1-ledger a5-records /home/user/agent/tmp/bench4/results` must print `trim clears`.
- **U10 `desk-ledger`**: builder on Claude Sonnet 5.5, in /home/user/desk.
  - Depends on an agent release with U1 to U7; publishing is the user's decision.
  - Owns section 6's sites and /home/user/desk/tests/app/server/Desk.test.ts and /home/user/desk/tests/app/server/parsers.test.ts.
  - Gates: `npm run test:app:server`, `npm run test:app:vue`, `npm run check`, run from /home/user/desk.

## 6. Desk adoption

The desk changes at these sites:
- /home/user/desk/app/server/Desk.ts:39: add a ledger map keyed by thread, and a shared `Gauge` taken from the first ledger's `calibrate`. The Mica judge at /home/user/desk/app/server/Desk.ts:55 becomes the ledger's `judge`.
- /home/user/desk/app/server/Desk.ts:78: `publish` takes `thread`, and the agent speech at /home/user/desk/app/server/Desk.ts:90 passes it on.
- /home/user/desk/app/server/Desk.ts:256: for role `agent`, the desk replaces `createOllama` plus `createAgent` (/home/user/desk/app/server/Desk.ts:268, /home/user/desk/app/server/Desk.ts:277) with a get-or-create `createLedger(provider, { judge, system: AGENT_SYSTEM, topics, thresholds, window: NUM_CTX, gauge })` and `respond(prompt, bound.signal)`.
  - The speech maps `content`, the passes' summed `usage`, and the last pass's `partial`.
  - The contrast speeches keep the per-call agent at /home/user/desk/app/server/Desk.ts:277.
- /home/user/desk/app/server/parsers.ts:112: read a bounded, non-empty `thread`.
- /home/user/desk/app/server/handlers.ts:71: pass `thread` to `publish`.
- /home/user/desk/app/vue/helpers.ts:87 and /home/user/desk/app/vue/helpers.ts:124: send `thread`.
- /home/user/desk/app/vue/App.vue:71: mint a thread per page session.
- /home/user/desk/app/core/constants.ts:206: derive the desk topics and criteria from the action domains, and add thresholds once calibrated (T8).
- /home/user/desk/app/server/constants.ts:14: `NUM_CTX` is the window. Add a thread cap and an id length limit.
- /home/user/desk/package.json:47: raise the `@orkestrel/agent` range to the release.

## 7. Risks

Each risk names the check that catches it:
- **Unlisted prompt drift loses the gain.** U8: every body equals its recorded body after the listed normalizations, and the control fails.
- **Handle removal or the separator change moves model behavior.** U9 band against a4 and a5.
- **Live filing differs from the imported seed filing.** A probe that classifies the a5 seed live and counts decided readings that differ at the thresholds from /home/user/agent/tmp/bench/results/v3/cal-categories.jsonl. This reading is missing.
- **`calibrate` by full generation misreads `fixed`.** A probe over the recorded seed bodies must reproduce `scale` 1.1634671320535195 and `fixed` 498 (/home/user/agent/tmp/bench/results/v9/a5-records-v1/seed.json:1).
- **Error classes from a duplicate agent copy defeat `isJudgeAbortError` (/home/user/agent/tmp/bench3/bench.mjs:519).** `npm ls @orkestrel/agent` in /home/user/desk shows one copy, and a Desk test aborting mid-filing settles partial.
- **Plan errors fall back to `view()` (the contract) and overflow a small window.** A Ledger test with a throwing `LookupHandler` asserts `fault`; `strict` turns it into an error.
- **Concurrent turns on one thread.** A Desk test serializes them per thread or maps `CONCURRENCY` to `DeskError`.
- **The desk's turn shape is outside the measured load, so the gain does not transfer.** A desk-shaped series; this reading is missing.

## Alternatives

Each alternative names the constraint that favors it and why the design wins:
- **Briefing as an instruction written inside select (the measured carrier).** Favored because it needs no contract change and keeps the bytes. The design wins because the receipt becomes complete, there is no side channel, and a scope's instructions allow-list (/home/user/agent/src/core/contexts/types.ts:207) cannot silently drop it.
- **Seam-only kit: export the handler and tool factory and let the application build the agent.** Favored by minimal API and flexibility. The design wins because the measured invariants (cache stable, repeat abort, answer scope, gauge events) hold only under one wiring. `agent` stays exposed for observation.
- **Keep handles.** Favored by replay fidelity. The design wins on three counts: 0 of 60 a5 recalls named a handle, a reply cited one (/home/user/scaffold/.orkestrel/agent/records-series-verdict.md:40), and handles force call-id numbering. This depends on U9.
- **Repeat stop and closed recall through `AgentOptions.authority`.** Favored because it is an existing seam. The design wins because a denial prefixes "denied: " to model-visible refusals and takes the application's only authority slot.

## Constraints

- A selection carries only messages, and the system block stays unchanged: /home/user/agent/src/core/contexts/types.ts:635.
- A fault means `messages` is `view()`: /home/user/agent/src/core/contexts/types.ts:246.
- A handler runs only when the view ends on a user message: /home/user/agent/guides/agent.md:359.
- The view is checked unchanged around the handler: /home/user/agent/src/core/contexts/AgentContext.ts:252.
- `tool` is emitted before its message is added: /home/user/agent/src/core/agents/Agent.ts:542, /home/user/agent/src/core/agents/Agent.ts:546.
- `ToolContext` carries no call id: /home/user/agent/node_modules/@orkestrel/tool/dist/src/core/index.d.ts:165.
- A failed result carries its error text and no success bit: /home/user/agent/src/core/types.ts:21.
- A manager cannot register an existing conversation: /home/user/agent/src/core/conversations/types.ts:701.
- Code laws:
  - /home/user/scaffold/AGENTS.md:58 (derive state)
  - /home/user/scaffold/AGENTS.md:65 (minimal API)
  - /home/user/scaffold/AGENTS.md:67 (mechanism, not policy)
  - /home/user/scaffold/.claude/rules/names.md:29 (option keys)
  - /home/user/scaffold/.claude/rules/architecture.md:47 (one class per file)
  - /home/user/scaffold/.claude/rules/architecture.md:186 (leaf test)
  - /home/user/scaffold/.claude/rules/tests.md:32 (scripted stubs)
  - /home/user/scaffold/.claude/rules/tests.md:117 (probes in `tmp/probes`)
- The desk builds one agent per speech: /home/user/desk/app/server/Desk.ts:277.

## Refusals

Each refused option is followed by the rule that forecloses it:
- **A duck-typed tool registry (/home/user/agent/tmp/bench3/bench.mjs:2863).** "NEVER use non-null assertions (`!`) or type assertions (`as`); narrow or validate." (/home/user/scaffold/AGENTS.md:36)
- **A class-field arrow as the handler.** "Refuse a climb out of a method or accessor body, or through a spread, computed key, class field, assignment, or local binding." (/home/user/scaffold/.claude/rules/architecture.md:175)
- **Mock judges or providers.** "NEVER use mocks, behavioral fakes, module replacement, framework spies, or fake clocks for project-owned behavior." (/home/user/scaffold/AGENTS.md:42)
- **Scenario literals in the package.** "Keep everything generic/reusable and free of unrelated-project logic." (/home/user/scaffold/.claude/rules/architecture.md:312)
- **Profile flags as string modes.** "A literal that selects a different action is a magic mode and requires separate functions/methods." (/home/user/scaffold/.claude/rules/names.md:75)
- **A stored pin array.** "Compute facts from existing fields; never store a second flag or label that can drift." (/home/user/scaffold/AGENTS.md:58)
- **Re-exporting `createTool`.** "Never re-export a symbol originating in another package; fix consumer imports to the originating package." (/home/user/scaffold/.claude/rules/architecture.md:276)
- **Porting `compareAmounts`.** "Create or substantively expand a capability with its first real consumer" (/home/user/scaffold/AGENTS.md:65).
- **A type named `Tokens`.** "Never pluralize type names." (/home/user/scaffold/.claude/rules/names.md:167)
- **Non-TypeScript replay scripts.** "Never write a bash, PowerShell, or Python script." (/home/user/scaffold/AGENTS.md:47)

## Measurements

Readings supplied:
- **Passes per copy.** Records 8.00–8.13, refined 6.75–6.88, full view 6.00–6.13. Records lower bounds are 0.43 against refined and 0.69–0.75 against the full view (/home/user/scaffold/.orkestrel/agent/records-series-verdict.md:21).
- **Seed filing.** Every a5 seed imported 356 judgments and asked 1 amends question live. Scale is 1.1635 and fixed is 498 over estimate 1,719 (/home/user/agent/tmp/bench/results/v9/a5-records-v1/seed.json:1, identical across v1 to v8).
- **Answer passes.** 11 of 80 a5 goals replied through the answer pass. g04 did so on 7 of 8 copies (`replyVia` in a5-records-v1 to v8 `ledger.jsonl`, read 2026-10-09).
- **Recall topics.** 60 a5 recall calls; none names a handle (same rows).
- **Records footprint.** 0 old tokens and 0 cut record lines (/home/user/scaffold/.orkestrel/agent/records-candidate-audit-verdict.md:11).

Readings missing:
- loose units and handle-bearing lines per a5 briefing;
- recalls cut or closed by room;
- live-asked against imported seed filing;
- the effect of handle removal and the separator change;
- `calibrate` agreement;
- desk-topic thresholds;
- a desk-shaped series.

## Tensions

The following judgment calls are open for the objective lane or the Orchestrator:
- **T1.** Remove handles, which this lane recommends, or port them as measured with a numbering wrapper.
- **T2.** `Selection.briefing`, an additive contract change with a 2-newline byte difference, or the measured instruction carrier.
- **T3.** The ledger owns its agent, or the application wires a kit.
- **T4.** Keep the person prefix as measured, or omit it as the audit's conservative repair proposes.
- **T5.** Owner scope against desk-wide corrections (R9).
- **T6.** The measured constants say "support-desk" and "[Desk]". They are kept because the thresholds are fitted on them.
- **T7.** `window` is a number here, while `AgentOptions.window` is a `Budget`.
- **T8.** For the desk:
  - whether customer turns are requests or statements;
  - it has no lookups;
  - its thresholds are uncalibrated;
  - thread eviction;
  - whether to show the briefing.
- **T9.** `calibrate` spends two full generations.
- **T10.** `tail-requests drop` treats everything before the first request as the seed, which matters for interleaved threads.
- **T11.** Retirement is dropped, so long threads rely on consolidation alone.
- **T12.** band.ts trims at `>= -1` (/home/user/agent/tmp/bench/results/v9/tools/band.ts:58), while the attack ruled `> -1`.