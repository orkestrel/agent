**1. Method inventory**

Port the records method as an additive `Ledger` capability. Keep immutable conversation evidence, cached judgments, per-topic projections, bounded recall, and a separate answer pass. Inject the judge and application policy. No existing package interface needs a breaking change.

The measured result supports this method on the recorded support shift: records scored 8.00–8.13 passes per copy, against 6.75–6.88 for refined and 6.00–6.13 for full history. It does not establish the repaired port’s score. Evidence: ../scaffold/.orkestrel/agent/records-series-verdict.md:19.

The tables use **method** for behavior that affects execution or model input, **instrumentation** for measurement and experiment control, and **defect** for behavior the port must replace. A method marked “legacy” is outside the measured records configuration and receives no public switch.

Every constructor option is covered by these two tables. Options shared with the refined profile appear in the second table.

| Constructor option | Ruling | Port decision and evidence |
|---|---|---|
| `conversation` | Method | Retain the original evidence and judgments. tmp/bench3/bench.mjs:1105 |
| `model` | Method | Read identity from the injected judge; eliminate independently configured identities that can disagree. tmp/bench3/bench.mjs:1106 |
| `desk` | Method | Inject topic questions; no support-desk vocabulary in package defaults. tmp/bench3/bench.mjs:1107 |
| `fit` | Method | Require application thresholds. The measured thresholds were fitted on the evaluated seed. tmp/bench3/bench.mjs:814 |
| `form` | Instrumentation | The experiment compares choice and noul categorization. Port the measured choice categorizer, with typed questions; no algorithm selector. tmp/bench3/bench.mjs:1110 |
| `horizon` | Method, legacy lifetime policy | Records themselves do not expire through this pin horizon. Do not add pin retirement to the records API. tmp/bench3/bench.mjs:1780 |
| `ctx` | Method | Explicit prompt-window limit. tmp/bench3/bench.mjs:1112 |
| `budget` | Method | Initial prompt share, distinct from cumulative inference expenditure. tmp/bench3/bench.mjs:2080 |
| `tail` | Method | Tail allocation within the initial prompt allowance. tmp/bench3/bench.mjs:2081 |
| `system` | Method | Application-authored system text, assembled with the briefing through instructions. tmp/bench3/bench.mjs:1115 |
| `clock` | Method | Explicit request date; never advance it because another request occurred. tmp/bench3/bench.mjs:1116 |
| `replyMode` | Instrumentation | Port terminal answers. Sending an external reply is an application tool, not a second ledger execution mode. tmp/bench3/bench.mjs:1117 |

Every option of `PROFILES.refined` has the following disposition.

| Profile option and value | Ruling | Port decision and evidence |
|---|---|---|
| `gate: admit` | Method | Settle evidence without withholding a reply to demand a pin. tmp/bench3/bench.mjs:129 |
| `horizon: 99` | Method | Preserve evidence until replacement or explicit removal; do not promote this experiment-specific number to a default. tmp/bench3/bench.mjs:130 |
| `date: on` | Method | Capture the application’s date once per request. tmp/bench3/bench.mjs:131 |
| `tail-answers: drop` | Method | Exclude earlier generated answers as evidence. tmp/bench3/bench.mjs:132 |
| `tail-requests: drop` | Method | Exclude previous work requests and their exchanges from the tail. Retain separately admitted factual evidence. tmp/bench3/bench.mjs:133 |
| `rules: last` | Method | Render global rules after subject records; topic match orders rules rather than deciding their presence. tmp/bench3/bench.mjs:134 |
| `handles: bare` | Defect-bearing method | Internal provenance survives; generated source handles disappear from model-facing record and recall text. tmp/bench3/bench.mjs:135 |
| `cache: stable` | Method | Freeze the entry briefing and advertised tools during retrieval. The answer pass explicitly changes both. tmp/bench3/bench.mjs:136 |
| `autopin: named` | Method | Preserve its specificity screen for loose evidence; inject domain entity resolution instead of embedding capitalization assumptions. tmp/bench3/bench.mjs:137 |
| `report: full` | Instrumentation | Return inspectable plans and emit receipts; benchmark tables remain outside the package. tmp/bench3/bench.mjs:138 |
| `arm-tools: recall` | Method | Supply recall; do not expose model-authored pins or a separate read tool. tmp/bench3/bench.mjs:139 |
| `tally: off` | Method | Omit topic-count prose. tmp/bench3/bench.mjs:140 |
| `request-questions: topics` | Method with a defect | Skip the unused request-category question. Remove the scenario-derived exclusion of `warehouse`; consider every configured topic. tmp/bench3/bench.mjs:141; tmp/bench3/bench.mjs:842 |
| `answer-cue: on` | Method | End the answer prompt with an explicit instruction to answer the current request. tmp/bench3/bench.mjs:142 |
| `recall-budget: 2` | Method | Expose a nonnegative recall limit; use 2 in the recorded-load configuration. tmp/bench3/bench.mjs:143 |
| `repeat-stop: all` | Method with a defect | Stop repeated semantic calls independently of provider call IDs. tmp/bench3/bench.mjs:144 |
| `answer-view: collapsed` | Method with a defect | Collapse results from structured provenance and remove every tool-call group, including seed calls. tmp/bench3/bench.mjs:145 |
| `recall-split: on` | Method with a defect | Split first, then resolve every part, including handles; deduplicate sources. tmp/bench3/bench.mjs:146 |
| `recall-category: off` | Method with a defect | Advertise only a topic parameter. Ignore an unsolicited category consistently in semantic identity and recall allocation. tmp/bench3/bench.mjs:147 |
| `records: off` | Instrumentation | This is the profile default; the measured arm explicitly overrides it to `on`. The public capability always projects records. tmp/bench3/bench.mjs:148 |

The remaining `Ledger` inventory follows. Grouped methods share a ruling; their individual declaration lines are cited.

| Part | Ruling | Evidence and disposition |
|---|---|---|
| Configuration fields | Method/instrumentation as classified above | tmp/bench3/bench.mjs:1052 |
| `answering`, `notes`, `withheld` | Method, partly legacy | Request-phase state and exclusion of orchestration messages. Replace text-based notes with explicit request metadata. tmp/bench3/bench.mjs:1084; tmp/bench3/bench.mjs:1099 |
| `scale`, `fixed`, `reply`, `history` | Method | Measurements drive prompt admission, recall room, and answer reservation. They are not merely reporting. tmp/bench3/bench.mjs:1085 |
| `seedCount`, `results`, `pins`, `runs`, `registry` | Method | Evidence, request boundaries, and domain indexing. Replace call-ID indexing; derive whole-source retention without mutable model summaries. tmp/bench3/bench.mjs:1089; tmp/bench3/bench.mjs:1093 |
| `failed` | Method | Avoid repeatedly asking an identical refused question within an execution. Do not permanently cache arbitrary transport errors. tmp/bench3/bench.mjs:1090 |
| `trace`, `routes` | Instrumentation | Top-logprob diagnostics and pin-route counters stay outside projection. tmp/bench3/bench.mjs:1091; tmp/bench3/bench.mjs:1096 |
| `expiry` | Method, unmeasured extension | No public expiry callback in this port. tmp/bench3/bench.mjs:1092 |
| `#index`, `#handles` | Defect-bearing caches | Message-count equality cannot detect remove-and-add replacement; call-ID maps conflate occurrences. tmp/bench3/bench.mjs:1101 |
| Constructor | Method | Own validated configuration and references. tmp/bench3/bench.mjs:1104 |
| `answerNow` | Method | Terminal-answer instruction. tmp/bench3/bench.mjs:1164 |
| `load` | Defect-bearing method | Restores seed results but assumes success. Restore explicit result receipts instead. tmp/bench3/bench.mjs:1169 |
| `current`, `beginRun`, `completeRun`, `settle` | Method | Request lifecycle and retaining completed lookup evidence. tmp/bench3/bench.mjs:1185; tmp/bench3/bench.mjs:1190; tmp/bench3/bench.mjs:1209; tmp/bench3/bench.mjs:1249 |
| `select`, `adopt` | Method | Judge, project, budget, and freeze the entry plan. Assertions and statistics inside selection are instrumentation. tmp/bench3/bench.mjs:1223; tmp/bench3/bench.mjs:1240 |
| `measureSeed`, `measureCall`, `measureRun`, `measureReply` | Method | Calibrate fixed overhead, message scale, marginal growth, and reply reservation. Startup calibration calls remain an explicit host activity. tmp/bench3/bench.mjs:1257; tmp/bench3/bench.mjs:1265; tmp/bench3/bench.mjs:1272; tmp/bench3/bench.mjs:1278 |
| `marginal`, `left`, `reserve`, `room`, `closed` | Method | Bound retrieval and reserve an answer. Reject nonfinite or nonpositive fitted rates. tmp/bench3/bench.mjs:1286; tmp/bench3/bench.mjs:1291; tmp/bench3/bench.mjs:1300; tmp/bench3/bench.mjs:1313; tmp/bench3/bench.mjs:1321 |
| `affords` | Method, legacy | Prices the pin-enforcement refusal. Omit with the deny gate. tmp/bench3/bench.mjs:1330 |
| `advance` | Instrumentation | Simulated daily progression, not request semantics. tmp/bench3/bench.mjs:1337 |
| `record` | Defect | A repeated provider call ID suppresses a later result and its repeat-stop evidence. Use assistant-message identity plus call position. tmp/bench3/bench.mjs:1344 |
| `#learn`, `empty` | Method, application policy | Inject typed lookup interpretation and explicit emptiness; do not ship account/order regexes or `"no record"` semantics. tmp/bench3/bench.mjs:1362; tmp/bench3/bench.mjs:1383 |
| `repeated` | Defect | Detects control flow through stored error prose and the defective ID map. Use a request-local semantic-call decision. tmp/bench3/bench.mjs:1388 |
| `#messages` | Defect-bearing method | Retain ordered source indexing, but rebuild from immutable snapshots rather than length alone. tmp/bench3/bench.mjs:1393 |
| `#numbers`, `nextNumber`, `handle`, `pinHandle` | Method, legacy presentation | Internal provenance may retain stable references; do not number model-facing results. tmp/bench3/bench.mjs:1410; tmp/bench3/bench.mjs:1420; tmp/bench3/bench.mjs:1441; tmp/bench3/bench.mjs:1449 |
| `message`, `position`, `call`, `result` | Method | Source resolution; use occurrence-aware call grouping. tmp/bench3/bench.mjs:1424; tmp/bench3/bench.mjs:1428; tmp/bench3/bench.mjs:1432; tmp/bench3/bench.mjs:1436 |
| `normalize`, `resolve` | Method | Read legacy handle inputs in replay; never infer joined handles as one source. tmp/bench3/bench.mjs:1455; tmp/bench3/bench.mjs:1462 |
| `text`, `state` | Method | Canonical evidence and judge-state rendering. Eliminate result-prefix stripping from production storage. tmp/bench3/bench.mjs:1476; tmp/bench3/bench.mjs:1485 |
| `line`, `lead`, `ruleLines`, `mark` | Defect-bearing method | Rendering must use the corrected sentence projection on every route, not raw text plus amendment annotations. tmp/bench3/bench.mjs:1491; tmp/bench3/bench.mjs:1498; tmp/bench3/bench.mjs:1504; tmp/bench3/bench.mjs:1512 |
| `loopWritten`, `codeCategory` | Method | Exclude generated answers and orchestration from factual evidence; use explicit success receipts for tools. tmp/bench3/bench.mjs:1517; tmp/bench3/bench.mjs:1521 |
| `specCategory`, `specTopic`, `specPair` | Method | Typed, ordered judge questions with source provenance. tmp/bench3/bench.mjs:1529; tmp/bench3/bench.mjs:1536; tmp/bench3/bench.mjs:1540 |
| `read`, `noul`, `categories`, `weigh` | Method | Matching judgment reuse and probability interpretation. Preserve choice ordering. tmp/bench3/bench.mjs:1549; tmp/bench3/bench.mjs:1554; tmp/bench3/bench.mjs:1559; tmp/bench3/bench.mjs:1574 |
| `category`, `quiet`, `decisive`, `opensCorrection` | Method | Threshold decisions; absence remains undecided. tmp/bench3/bench.mjs:1581; tmp/bench3/bench.mjs:1593; tmp/bench3/bench.mjs:1601; tmp/bench3/bench.mjs:1605 |
| `entities` | Method with a documented heuristic limit | Domain identity and partial-alias matching become injected policy. tmp/bench3/bench.mjs:1613 |
| `deskTopics`, `topics`, `label` | Method | Semantic topics, entity topics, and display labels. tmp/bench3/bench.mjs:1630; tmp/bench3/bench.mjs:1636; tmp/bench3/bench.mjs:1645 |
| `fail`, `failure` | Method/instrumentation | Matching refusal identity is method; regex inspection of daemon errors and logprobs is harness-specific. tmp/bench3/bench.mjs:1653; tmp/bench3/bench.mjs:1657 |
| `categorize` | Method | Use the conversation judgment manager. Counters and elapsed-time collection are instrumentation. tmp/bench3/bench.mjs:1667 |
| `marks` | Method with a limit | Retain decided correction edges independently of whether the correcting source still renders. Shared-token localization remains heuristic. tmp/bench3/bench.mjs:1726 |
| `replaced` | Defect-bearing method | Canonicalize argument identities and let successful empty results replace earlier results. tmp/bench3/bench.mjs:1747 |
| `writeRun`, `end`, `ends` | Method, mostly legacy | Correction invalidation survives; pin-age retirement and value-pin expiry do not enter the records API. tmp/bench3/bench.mjs:1763; tmp/bench3/bench.mjs:1770; tmp/bench3/bench.mjs:1792 |
| `write`, `owed`, `seedLookups`, `pinWhole` | Method | Keep source retention, replacing pin records with explicit evidence receipts; route counters are instrumentation. tmp/bench3/bench.mjs:1801; tmp/bench3/bench.mjs:1814; tmp/bench3/bench.mjs:1828; tmp/bench3/bench.mjs:1839 |
| `specific`, `autoPin` | Method | Select decisive and specific loose evidence; never make the answering model author records. tmp/bench3/bench.mjs:1844; tmp/bench3/bench.mjs:1850 |
| `#stub`, `project` | Defect-bearing method | Stub wording must reflect actual retained source coverage after consolidation. tmp/bench3/bench.mjs:1874; tmp/bench3/bench.mjs:1932 |
| `after` | Method | Read current-request evidence independently of older history. tmp/bench3/bench.mjs:1889 |
| `digest`, `#noteLine`, `#resultLead` | Defect-bearing method | Build the answer digest from source references, not recursive parsing of rendered recall strings. tmp/bench3/bench.mjs:1901; tmp/bench3/bench.mjs:1918; tmp/bench3/bench.mjs:1926 |
| `measure`, `#history`, `#tail` | Method | Estimate prompts and preserve complete exchanges/tool groups. Filter stale source sentences before choosing the tail. tmp/bench3/bench.mjs:1936; tmp/bench3/bench.mjs:1949; tmp/bench3/bench.mjs:1982 |
| `#relevance` | Method | Deterministic loose-evidence ordering; not proof that a line answers the request. tmp/bench3/bench.mjs:2004 |
| `recordInput` | Defect | Excluding successful empty results prevents replacement. Preserve their receipts. tmp/bench3/bench.mjs:2019 |
| `projectRecords` | Method/instrumentation | Projection and selection are method; duration and independent checks are instrumentation. tmp/bench3/bench.mjs:2054 |
| `plan` | Defect-bearing method | Preserve budgeting and ordering; repair stale fallback routes and partial-source consolidation. tmp/bench3/bench.mjs:2073 |
| `#recordsReport` | Instrumentation | Keep provenance available to tests and callers; no scenario-specific assertions in runtime. tmp/bench3/bench.mjs:2204 |
| `#ruled`, `#render`, `#renderRecords` | Method with defects | Global rules last, records replace their raw sources, and all rendering uses one corrected projection. tmp/bench3/bench.mjs:2224; tmp/bench3/bench.mjs:2232; tmp/bench3/bench.mjs:2290 |
| `#tally` | Method, legacy | Disabled in measured refined; omit. tmp/bench3/bench.mjs:2327 |
| `#handlesInView`, `#candidates`, `pin` | Method, legacy | Model-authored pin validation is outside this port. tmp/bench3/bench.mjs:2379; tmp/bench3/bench.mjs:2390; tmp/bench3/bench.mjs:2404 |
| `#recallKey`, `recall`, `#callSize` | Defect-bearing method | One canonical semantic query, provenance-backed results, and no generated handles or duplicate call-cost charge. tmp/bench3/bench.mjs:2467; tmp/bench3/bench.mjs:2473; tmp/bench3/bench.mjs:2579 |
| `#cut` | Defect | “At least one” can exceed the available window. Admit complete groups only when they fit. tmp/bench3/bench.mjs:2584 |
| `#resolveRead`, `readHandle` | Method, legacy | Fold source lookup into recall; do not publish a separate read tool. tmp/bench3/bench.mjs:2595; tmp/bench3/bench.mjs:2606 |

Every export and supporting function of `records.mjs` is ruled here.

| Part | Ruling | Evidence and disposition |
|---|---|---|
| `splitSentences` | Method | Preserve measured splitting initially; document its English-oriented punctuation assumptions. tmp/bench3/records.mjs:25 |
| `extractTokens` | Method | Token evidence for correction localization; no arithmetic conclusions. tmp/bench3/records.mjs:37 |
| `linkAccounts` | Method, domain-specific implementation | Generalize to explicit subject links returned by the application’s lookup interpreter. tmp/bench3/records.mjs:56 |
| `buildRecords` | Method with defects | Pure projection; repair replacement, correction persistence, scope inheritance, and antecedent handling. tmp/bench3/records.mjs:77 |
| `selectRecords` | Method | Requested subjects first, global rules afterward; preserve stable order. tmp/bench3/records.mjs:114 |
| `renderRecord`, `renderPinned` | Method | One renderer with heading depth as formatting data. tmp/bench3/records.mjs:135; tmp/bench3/records.mjs:144 |
| `compareAmounts` | Instrumentation, unmeasured candidate | Exclude. It is not rendered in the measured arm and conflates thresholds with unrelated amounts. tmp/bench3/records.mjs:156; tmp/bench/results/v9/RECORDS-PLAN.md:57 |
| `checkRecords` | Instrumentation | Move independent invariants to tests; do not publish a second production projector. tmp/bench3/records.mjs:186 |
| `readSubjects`, `indexMessages` | Method | Pure identity extraction/indexing, generalized beyond accounts. tmp/bench3/records.mjs:303; tmp/bench3/records.mjs:310 |
| `normalizeArguments` | Defect | Object-entry order changes replacement identity. Use installed canonical serialization after domain normalization. tmp/bench3/records.mjs:320 |
| `listLive` | Defect-bearing method | Include successful empty replacements and preserve correction effects through chains. tmp/bench3/records.mjs:326 |
| `invertPairs` | Method | Correction-graph projection. tmp/bench3/records.mjs:342 |
| `placeMember` | Defect | Direct account placement suppresses inherited global correction scope. tmp/bench3/records.mjs:350 |
| `listStale` | Defect | Requiring a live correcting message revives an earlier value after a correction is itself replaced. tmp/bench3/records.mjs:368 |
| `buildLines`, `listRuns` | Defect | Capitalization is not evidence of a person or an antecedent. Preserve adjacent source sentences as an indivisible group instead. tmp/bench3/records.mjs:387; tmp/bench3/records.mjs:401 |
| `readAmount` | Instrumentation | Supports the excluded comparison candidate. tmp/bench3/records.mjs:405 |
| `hashText` | Instrumentation | Diagnostic versions; no `node:crypto` dependency in core projection. tmp/bench3/records.mjs:409 |
| `compareText` | Method | Deterministic tie-breaking; inline this trivial comparison. tmp/bench3/records.mjs:413 |
| `reverseKeys` | Instrumentation | Metamorphic test input generation. tmp/bench3/records.mjs:417 |
| Regex/constants | Method, except defective name inference and unmeasured currency comparison | Keep only the splitting/tokenization semantics the retained helpers need. tmp/bench3/records.mjs:5 |

The tool and answer orchestration inventory completes the method.

| Part | Ruling | Evidence and disposition |
|---|---|---|
| `LedgerChatProvider` | Instrumentation | Records outgoing requests; do not port its Ollama inheritance. tmp/bench3/bench.mjs:2620 |
| `createLedgerTools` closure guard | Method | Request-local closure and semantic repeat detection. tmp/bench3/bench.mjs:2771 |
| `lookup_order`, `lookup_customer` | Method, application-owned | Inject real `ToolInterface` implementations and lookup interpretation. tmp/bench3/bench.mjs:2795 |
| `pin`, `read` registration | Method, legacy | Absent from refined’s advertised set; omit. tmp/bench3/bench.mjs:2807; tmp/bench3/bench.mjs:2834 |
| `recall` registration | Method | Package-owned retrieval tool over corrected evidence. tmp/bench3/bench.mjs:2821 |
| `send_reply` registration | Method, legacy | Terminal response is the port’s delivery boundary. tmp/bench3/bench.mjs:2842 |
| `createResultWrapper` | Defect-bearing method | Preserve bounded execution and stable definitions; remove textual result prefixes and ID-based collision handling. tmp/bench3/bench.mjs:2863 |
| `createGateAuthority`, `ruleGate` | Method, legacy | Omit pin-enforcement policy; retain ordinary caller-supplied authority. tmp/bench3/bench.mjs:2889; tmp/bench3/bench.mjs:2907 |
| `prepare`, selection adapter | Method with defective fallback | Use instructions plus `Selection`. A plan failure must not silently send an unbounded full history. tmp/bench3/bench.mjs:3296 |
| Agent tool/usage observations | Method/instrumentation | Result retention and stop decisions are method; event tables are instrumentation. tmp/bench3/bench.mjs:3339 |
| Answer digest, cue, collapse | Method with defects | Remove all call groups; derive digest from source receipts. tmp/bench3/bench.mjs:3388 |
| Scratch conversation and answer scope | Method | Use a separate manager for the scratch answer agent, avoiding shared active-pointer switching. tmp/bench3/bench.mjs:3397 |
| Scratch-to-original ID mapping | Instrumentation | Required for wire comparison, not prompt semantics. tmp/bench3/bench.mjs:3398; tmp/bench3/bench.mjs:3414 |
| Copying answer output back | Method | Commit only the delivered answer to the original conversation; discard scratch scaffolding. tmp/bench3/bench.mjs:3412 |
| `final`, `plain`, `byTool` | Method, partly legacy | Keep nonempty terminal-answer validation; omit tool-delivery reminders. tmp/bench3/bench.mjs:3418; tmp/bench3/bench.mjs:3420; tmp/bench3/bench.mjs:3422 |
| `byAnswer` | Defect-bearing method | A first-pass transport failure or local timeout must be evaluated for answer recovery instead of automatically skipping it. Caller cancellation still forbids recovery. tmp/bench3/bench.mjs:3437 |
| `runGoal` | Method/instrumentation | Request lifecycle becomes `Ledger.execute`; scoring and run-log bookkeeping remain outside. tmp/bench3/bench.mjs:3461 |

**2. Public surface**

Place the capability in `src/core/ledgers/`. Export it through that module’s `index.ts` and `src/core/index.ts`. Use `Ledger` for the stateful capability and qualified `Ledger…` names for its data. Do not introduce `Briefing`, which another fleet guide already owns. Evidence: ../scaffold/guides/brief.md:117.

The public behavior is deliberately small:

```ts
export interface LedgerInterface {
	readonly conversation: ConversationInterface
	readonly emitter: EmitterInterface<LedgerEventMap>

	execute(input: LedgerInput, options?: AgentRunOptions): Promise<LedgerResult>
	snapshot(): LedgerSnapshot
	destroy(): Promise<void>
}

export class Ledger implements LedgerInterface {
	constructor(options: LedgerOptions)
	// Implements exactly the interface above.
}
```

There is no pass-through `createLedger` factory. Construction creates the conversation, observations, request coordination, and projection machinery; `execute` composes the existing agent rather than replacing its loop.

All data properties and returned collections in the following contracts are readonly. Optional fields use `undefined`; the displayed shapes are complete proposed contracts.

| Export in `src/core/ledgers/types.ts` | Signature or shape |
|---|---|
| `LedgerOptions` | `{ provider: ProviderInterface, judge: JudgeInterface, policy: LedgerPolicy, system: LedgerSystemHandler, window: LedgerWindowOptions, tools?: readonly ToolInterface[], authority?: AuthorityInterface, snapshot?: LedgerSnapshot, on?: EmitterHooks<LedgerEventMap>, error?: EmitterErrorHandler }` |
| `LedgerInput` | `{ request: string, date: string, evidence?: readonly string[] }` |
| `LedgerResult` | `{ result: AgentResult, plan?: LedgerPlan, faults: readonly Error[] }` |
| `LedgerSnapshot` | `{ conversation: ConversationSnapshot, requests: readonly string[], receipts: readonly LedgerReceipt[], calls: readonly LedgerCall[] }` |
| `LedgerPolicy` | `{ category: ChoiceQuestion, topics: Readonly<Record<string, NoulQuestion>>, amends: NoulQuestion, supersedes: NoulQuestion, thresholds: LedgerThreshold, subjects: readonly LedgerSubject[], resolve: LedgerResolveHandler, lookup: LedgerLookupHandler, needed?: LedgerRelevanceOptions }` |
| `LedgerThreshold` | `{ category: number, topic: number, correction: number, amends: number, supersedes: number }` |
| `LedgerSubject` | `{ id: string, title: string, aliases: readonly string[] }` |
| `LedgerLookup` | `{ key: JSONValue, empty: boolean, subjects: readonly LedgerSubject[], links: Readonly<Record<string, string>> }` |
| `LedgerReceipt` | `{ source: string, turn: string, position: number, call: ToolCall, success: boolean, lookup?: LedgerLookup }` |
| `LedgerSystemHandler` | `(date: string) => string` |
| `LedgerResolveHandler` | `(text: string, subjects: readonly LedgerSubject[]) => readonly string[]` |
| `LedgerLookupHandler` | `(call: ToolCall, result: ToolResult) => LedgerLookup \| undefined` |
| `LedgerWindowOptions` | `{ max: number, share: number, tail: number, drift: number, recall: number, calibration: LedgerCalibration }` |
| `LedgerCalibration` | `{ identity: string, scale: number, fixed: number, reserve: number }` |
| `LedgerCall` | `{ request: string, identity: string, tools: string, estimate: number, answer: boolean, usage?: TokenUsage }` |
| `LedgerCategory` | `'fact' \| 'rule' \| 'correction' \| 'request' \| 'opinion' \| 'chatter' \| 'distractor'` |
| `LedgerTokens` | `{ ids: readonly string[], numbers: readonly number[] }` |
| `LedgerLine` | `{ source: string, sentence: number, text: string, topics: readonly string[], role: MessageRole, group: string }` |
| `LedgerRecord` | `{ id: string, title: string, scope: 'subject' \| 'global', sources: readonly string[], lines: readonly LedgerLine[] }` |
| `LedgerStale` | `{ source: string, sentence: number, by: readonly string[] }` |
| `LedgerProjectionInput` | `{ snapshot: LedgerSnapshot, policy: LedgerPolicy, date: string }` |
| `LedgerProjection` | `{ records: readonly LedgerRecord[], loose: readonly LedgerLine[], stale: readonly LedgerStale[] }` |
| `LedgerQuery` | `{ subjects: readonly string[], topics: readonly string[] }` |
| `LedgerPlanInput` | `{ snapshot: LedgerSnapshot, projection: LedgerProjection, query: LedgerQuery, request: Message, system: string, window: LedgerWindowOptions, calibration: LedgerCalibration }` |
| `LedgerPlan` | `{ selection: Selection, briefing: string, projection: LedgerProjection, omitted: readonly LedgerLine[], over: boolean, estimate: number }` |
| `LedgerJudgmentResult` | `{ keys: readonly string[], usage?: TokenUsage, faults: readonly Error[] }` |
| `LedgerRelevanceOptions` | `{ criterion: Criterion, limit: number }` |
| `LedgerRelevanceResult` | `LedgerJudgmentResult` plus `{ lines: readonly LedgerLine[] }` |
| `LedgerEventMap` | `{ start: readonly [request: string], select: readonly [plan: LedgerPlan], call: readonly [call: LedgerCall], fault: readonly [error: unknown], finish: readonly [result: LedgerResult] }` |
| `LedgerErrorCode` | `'OPTIONS' \| 'STATE' \| 'WINDOW' \| 'SNAPSHOT' \| 'ANSWER'` |

The following exports contain reusable computation and boundary behavior. They are independently tested; stateful orchestration remains in `Ledger.ts`.

| File | Export and signature |
|---|---|
| `helpers.ts` | `splitLedgerSentences(text: string): readonly string[]` |
| `helpers.ts` | `extractLedgerTokens(text: string): LedgerTokens` |
| `helpers.ts` | `renderLedgerState(messages: readonly Message[], sources: readonly string[]): string` |
| `helpers.ts` | `buildLedgerProjection(input: LedgerProjectionInput): LedgerProjection` |
| `helpers.ts` | `selectLedgerRecords(projection: LedgerProjection, query: LedgerQuery): readonly LedgerRecord[]` |
| `helpers.ts` | `renderLedgerRecord(record: LedgerRecord, level?: 2 \| 3): string` |
| `helpers.ts` | `buildLedgerPlan(input: LedgerPlanInput): LedgerPlan` |
| `helpers.ts` | `computeLedgerCalibration(calls: readonly LedgerCall[], initial: LedgerCalibration): LedgerCalibration` |
| `parsers.ts` | `parseLedgerQuery(text: string): readonly string[] \| undefined` |
| `handlers.ts` | `resolveLedgerJudgments(conversation: ConversationInterface, request: Message, snapshot: LedgerSnapshot, policy: LedgerPolicy, judge: JudgeInterface, signal: AbortSignal): Promise<LedgerJudgmentResult>` |
| `handlers.ts` | `resolveLedgerRelevance(conversation: ConversationInterface, request: Message, lines: readonly LedgerLine[], options: LedgerRelevanceOptions, judge: JudgeInterface, signal: AbortSignal): Promise<LedgerRelevanceResult>` |
| `validators.ts` | `isLedgerSnapshot(value: unknown): value is LedgerSnapshot` |
| `errors.ts` | `LedgerError extends Error`, constructor `(code: LedgerErrorCode, message: string, options?: ErrorOptions)`, readonly `code` |
| `errors.ts` | `isLedgerError(value: unknown): value is LedgerError` |
| `Ledger.ts` | `Ledger`, with the constructor and interface stated above |

These choices settle composition and ownership:

- **Selection:** a private bound handler satisfies the existing `SelectionHandler`. It returns the projected tail and judgment receipt. A private instruction manager, configured with an empty opening header, supplies the briefing. `Selection` gains no system or tool member. Existing seams: src/core/contexts/types.ts:239; src/core/contexts/types.ts:274; src/core/contexts/AgentContext.ts:174.
- **Judgments:** categorization and correction resolution call `conversation.judgments.resolve`. Reuse requires matching question bytes, ordered sources, state, and configured judge identity. Preserve criterion order; canonical argument serialization must not reorder judge choices. Existing behavior: src/core/conversations/types.ts:66; src/core/conversations/helpers.ts:62.
- **Judge injection:** `LedgerOptions.judge` is required. Mica is not constructed inside the package. The benchmark already receives a judge at selection, the package treats judges as a separate inference boundary, and the desk constructs its own Mica instance. Evidence: tmp/bench3/bench.mjs:1223; src/core/types.ts:143; ../desk/app/server/Desk.ts:55.
- **Conversations:** the snapshot contains the original `ConversationSnapshot` plus request and result receipts. Original sections are read through their retained messages, not generated recaps. The ledger never assumes that tool text reveals success. Evidence: src/core/conversations/types.ts:139; src/core/conversations/types.ts:504; src/core/types.ts:21.
- **Tools:** retain `@orkestrel/tool` implementations. Compose bounded execution around each tool and add one recall tool. Reject a supplied tool named `recall`. Preserve its definition and annotations. Lookup identity is `canonicalStringify([call.name, lookup.key])`; the application decides case-sensitive argument semantics.
- **Agent options:** use `select`, `instructions`, `conversations`, `tools`, and caller authority. Omit `AgentOptions.window`: it triggers summarization and can continue over the window; it is not a hard admission check. Keep its public contract unchanged. Evidence: src/core/agents/types.ts:369; src/core/agents/Agent.ts:639.
- **Provider:** a private structural `ProviderInterface` adapter observes the exact messages and definitions, updates calibration from returned usage, and refuses an estimated over-window call before forwarding it. This adds a budgeting boundary; it is not the benchmark’s wire recorder.
- **Concurrency:** reject overlapping `execute` calls on one ledger with `STATE`. Applications can serialize them with the installed queue. `snapshot` requires a settled ledger. `destroy` aborts and awaits active work, releases owned resources, and destroys its emitter last; it does not destroy injected providers, judges, or tools.
- **Persistence:** persist the complete `LedgerSnapshot` as one application-owned value. Do not save the conversation and its result receipts independently. Automatic crash replay of external tools is outside this capability.

Installed primitives prevent the following local reinventions:

| Existing capability | Use |
|---|---|
| `@orkestrel/contract` | Guards, JSON ownership, result types where needed, and `canonicalStringify`; no custom canonical serializer or generic exception wrapper. node_modules/@orkestrel/contract/dist/src/core/index.d.ts:464; node_modules/@orkestrel/contract/dist/src/core/index.d.ts:563 |
| `@orkestrel/budget` | Existing cumulative cost budgets and their signals; ledger-specific prompt allocation remains separate. node_modules/@orkestrel/budget/dist/src/core/index.d.ts:53 |
| `@orkestrel/abort`, `@orkestrel/timeout` | Cancellation and one outer execution deadline covering both inference phases. No timer/promise race helper. |
| `@orkestrel/emitter` | Lifecycle observations and listener-error isolation. node_modules/@orkestrel/emitter/dist/src/core/index.d.ts:109 |
| `@orkestrel/tool` | Registration, validation, execution, and failure isolation. node_modules/@orkestrel/tool/dist/src/core/index.d.ts:351 |
| `@orkestrel/queue` | Optional application serialization, with retries disabled for requests that can execute tools. node_modules/@orkestrel/queue/dist/src/core/index.d.ts:620 |
| `@orkestrel/database` | Optional application persistence of the complete snapshot; no second storage engine. node_modules/@orkestrel/database/dist/src/core/index.d.ts:521 |
| `@orkestrel/workflow` | Leave the desk’s policy workflow intact. The ledger does not recreate its policy decisions. ../desk/app/server/Desk.ts:133 |
| `@orkestrel/workspace` | Leave document ownership with workspace. Do not store ledger evidence as automatically rendered workspace files. src/core/contexts/AgentContext.ts:197 |
| Existing agent helpers | Reuse `estimateMessages`, `collectToolGroups`, `matchesJudgment`, and usage accounting. src/core/agents/helpers.ts:143; src/core/conversations/helpers.ts:150 |

The requested installed `guides/` directories are absent from these dependency installations. The available repository guide mirrors and installed declaration entries provide the capability evidence.

**3. Data flow per request**

The request follows this sequence.

1. **Validate and admit — pure checks plus state mutation.** Validate options, request date, and snapshot references. Capture application policy. Append explicitly supplied evidence as user-source messages, then append the work request and record its ID separately. Earlier work requests remain identifiable without content regexes.

2. **Capture the source view — pure.** Read retained section originals followed by live messages. Join tool messages to their assistant turn and call position. A receipt’s `source` identifies the stored result message; `turn` and `position` disambiguate repeated call IDs.

3. **Resolve classification — judge.** Apply deterministic exclusions first. Ask the injected judge for missing category/topic decisions and eligible correction pairs through the judgment manager. The category question is omitted for the work request. All configured request topics remain eligible. Refused or failed questions stay undecided.

4. **Project records — pure.** Determine successful lookup replacement using canonical identities, including empty successors. Derive correction invalidations from the complete accepted correction graph. Build verbatim source sentences with provenance. A correction inherits the scope of what it corrects even when it also names a subject.

5. **Preserve antecedents — pure.** Keep a pronoun-led sentence and its preceding surviving source sentence in one indivisible group. Do not invent a person prefix. If the preceding sentence is stale, retain no fabricated antecedent; report the unresolved group through the plan’s retained provenance.

6. **Select subjects and rules — pure.** Resolve request subjects using application policy. Select their records, then global rules. Global topic matches affect order. An unscoped request uses corrected loose evidence and corrected fallback records; it never falls back to raw stale sentences.

7. **Optionally judge line relevance — judge.** When `policy.needed` exists, ask one question per candidate line against the request and its source context. Drop only a decisive negative; retain uncertain, refused, unasked, or failed lines. Preserve antecedent groups and required correction dependencies. Do not apply this filter to mandatory global rules in the initial port.

8. **Plan the prompt — pure.** Allocate the initial allowance as the measured method does: remove fixed overhead, retain drift margin, allocate the tail share, then consolidate the briefing. The recorded-load configuration uses a 3,072-token window, initial share `0.7`, and tail share `0.35`; these are supplied configuration, not universal defaults. Evidence: tmp/bench3/bench.mjs:198; tmp/bench3/bench.mjs:2080.

9. **Build through existing context machinery — state mutation, then pure assembly.** Install the briefing instruction and return `Selection`. `AgentContext.build(selection)` produces one system block followed by the selected messages. Cache the entry plan for this request. Selection does not mutate conversation messages while awaiting judgments.

10. **Generate and retrieve — provider, then tools.** The provider receives the assembled prompt and stable tool definitions. Successful external lookup outcomes become evidence receipts. Recall reads the corrected projection, emits complete source groups without generated handles, and fits them within measured remaining room and the answer reserve.

11. **Stop retrieval — pure decision plus lifecycle action.** Canonical repeat detection, recall limit, or insufficient room closes retrieval. Track the semantic decision directly; never infer it from an error string retrieved by call ID. The provider adapter measures each actual call; usage remains charged once by the existing agent.

12. **Produce an answer — provider.** If retrieval stops without a usable final answer, or a recoverable first-pass failure leaves time and budget, construct one scratch answer prompt. It contains the current request, corrected briefing, a provenance-derived digest of available results, and the final-answer cue. It contains no assistant tool calls, tool messages, generated handles, or callable definitions.

13. **Settle — state mutation.** Copy the delivered answer back, bind all completed result receipts, and emit the result. Caller cancellation, exhausted total budget, or expired outer deadline prevents another provider call. An empty or tool-only answer remains an explicit incomplete outcome with an `ANSWER` fault; it is never reported as a successful reply.

The selection lifecycle constraint is material: the agent invokes selection at entry and compaction rebuilds, not after every tool execution. The orchestration and provider boundary therefore belong around the existing loop. Evidence: src/core/agents/Agent.ts:351; src/core/agents/Agent.ts:557.

**4. Defect dispositions**

The dispositions distinguish mechanical repairs from empirical limitations.

| Finding | Disposition | Reason and proof obligation |
|---|---|---|
| Repeated call ID hides repeat stop | Fixed by design | Identify occurrences by assistant message and call position; track semantic repetition independently. Test equal IDs across turns and within one batch. ../scaffold/.orkestrel/agent/frozen-harness-audit-verdict.md:13 |
| Collapsed answer retains seed calls | Fixed by design | Remove all tool-call groups regardless of age. Assert the actual answer-provider input. ../scaffold/.orkestrel/agent/frozen-harness-audit-verdict.md:14 |
| Nested recall leads survive digest | Fixed by design | Digest source references, never previously rendered recall text. Same verdict row. |
| First-pass timeout/transport failure skips answer | Fixed by design | Distinguish a local failed pass from caller cancellation and the total deadline; allow one bounded recovery answer when resources remain. ../scaffold/.orkestrel/agent/frozen-harness-audit-verdict.md:15 |
| Joined handles are not split | Fixed by design | Split query parts before handle/entity resolution; deduplicate by source. ../scaffold/.orkestrel/agent/frozen-harness-audit-verdict.md:16 |
| Disabled category affects recall pricing | Fixed by design | One effective topic-only query determines semantic identity and allocation. Actual already-spent wire tokens still count once. ../scaffold/.orkestrel/agent/frozen-harness-audit-verdict.md:17 |
| Empty-answer assertion survives removal of its guard | Fixed in verification | A mutation removing answer validation must fail the named assertion while keeping test collection intact. ../scaffold/.orkestrel/agent/frozen-harness-audit-verdict.md:18 |
| Permissive scorer accepts stale or negated answers | Out of production scope; fixed verification policy | Use the strict scorer and recorded adjudications. Never modify scoring to accept port output. ../scaffold/.orkestrel/agent/frozen-harness-audit-verdict.md:19 |
| Random IDs in diagnostics; shared parsing imports | Fixed diagnostic comparison; import sharing is not a defect | Compare structured provenance under an explicit source-ID bijection. Do not require random UUID bytes to match across fresh conversations. ../scaffold/.orkestrel/agent/records-candidate-audit-verdict.md:15 |
| Unscoped fallback leaks stale sentences | Fixed by design | All briefing, tail, recall, loose, and answer-digest routes consume the corrected projection. ../scaffold/.orkestrel/agent/records-candidate-audit-verdict.md:16 |
| Correction of a correction revives an old value | Fixed by design | Invalidations derive from all accepted correction edges, independently of rendering liveness. Same verdict row. |
| Empty successor lookup leaves earlier result live | Fixed by design | Successful emptiness is replacement evidence; a failed lookup is not. ../scaffold/.orkestrel/agent/records-candidate-audit-verdict.md:17 |
| Capitalization-based person prefix | Fixed by design | Remove synthesized attribution; retain original antecedent sentences as a group. Same verdict row. |
| Tight consolidation changes source coverage and tail stubs | Fixed by design | Consolidate atomic groups, then derive coverage and stubs from what actually remains. Compare full tail bytes. ../scaffold/.orkestrel/agent/records-candidate-audit-verdict.md:18 |
| Argument key order changes lookup replacement | Fixed by design | Domain normalization followed by installed canonical serialization. ../scaffold/.orkestrel/agent/records-candidate-audit-verdict.md:19 |
| Desk-wide correction stranded in one account | Fixed by design | Inherit global scope through the decided correction edge, even when direct subject membership exists. Preserve subject membership separately. ../scaffold/.orkestrel/agent/records-candidate-audit-verdict.md:20 |
| Rules order depends on request topics | Retained method | This is intended ordering, not nondeterminism for identical input. ../scaffold/.orkestrel/agent/records-candidate-audit-verdict.md:21 |
| Recall handle cited in reply | Fixed by design | Generated handles never enter record, recall, or digest text. Literal source text that happens to contain `r8` is not blindly deleted. ../scaffold/.orkestrel/agent/records-series-verdict.md:40 |
| Credit question buried by account story | Carried as a measured-default limit; optional mechanism supplied | Line relevance offers a concrete testable control, but its score improvement is unproved. Keep it disabled for the baseline replay and enable it only in a separately measured configuration. ../scaffold/.orkestrel/agent/records-series-verdict.md:39 |
| Kenji delivery-date violation | Documented model limit | Prompt placement and tested rewrites did not solve it. Do not claim a ledger repair or introduce an uncalibrated answer-policy judge. ../scaffold/.orkestrel/agent/records-series-verdict.md:42; tmp/bench/results/v9/FINDINGS-A1.md:69 |
| Account matching depends on surname overlap; unnamed customer untested | Documented application-policy limit | Require injected entity resolution and explicit subject links. Ambiguous identity stays unresolved rather than choosing an account. tmp/bench/results/v9/RECORDS-PLAN-ATTACK.md:14 |
| Imported categorization and narrow decision margins | Documented empirical limit | Preserve exact questions and model identity for replay; application thresholds require separate calibration for different workloads. tmp/bench/results/v9/RECORDS-PLAN.md:50 |
| Shared-number correction localization | Documented heuristic limit | Correctly decided message pairs can still identify the wrong sentence or miss a correction without shared tokens. Test and expose provenance; do not claim semantic completeness. tmp/bench3/bench.mjs:1735 |
| Unmeasured amount comparison | Out of scope | No inferred refund total or generic threshold arithmetic enters records. tmp/bench/results/v9/RECORDS-PLAN.md:58 |
| Same-length mutation, inferred seed success, oversized first recall group | Fixed by design | Snapshot validation, explicit receipts, and strict whole-group admission address additional defects visible in source. tmp/bench3/bench.mjs:1179; tmp/bench3/bench.mjs:1395; tmp/bench3/bench.mjs:2587 |

**5. Units**

The following units are serial and own disjoint files. Paths without a prefix belong to `/home/user/agent`; `../desk/` paths belong to the consumer. Each unit lands working behavior and its tests before its successor begins. No unit edits the benchmark directories.

These are proposed verification commands, not executed results. This assignment performs no writes, builds, tests, or network requests.

| Unit | Owned files | Dependencies | Acceptance criteria and tests |
|---|---|---|---|
| **U1 — Contracts and snapshot boundary** | `src/core/ledgers/types.ts`, `errors.ts`, `validators.ts`; `tests/src/core/ledgers/validators.test.ts` | None | Declare every contract in section 2. Validate complete snapshots, source references, repeated call IDs with distinct occurrences, malformed receipts, unknown input, cycles, and immutable returned state. Gate: `npm run check:src:core`. Gate: `npx vitest run --config vite.config.ts --project src:core tests/src/core/ledgers/validators.test.ts`. |
| **U2 — Pure projection and allocation** | `src/core/ledgers/helpers.ts`, `parsers.ts`; `tests/src/core/ledgers/helpers.test.ts`, `parsers.test.ts` | U1 | Prove verbatim lines, scope inheritance, chained corrections, empty replacement, canonical lookup identity, antecedent groups, stable ordering, corrected unscoped fallback, complete tool groups, tight budgets, and accurate stubs. Independent expected fixtures must disagree with deliberately broken placement and stale filtering. Gate: `npx vitest run --config vite.config.ts --project src:core tests/src/core/ledgers/helpers.test.ts tests/src/core/ledgers/parsers.test.ts`. Gate: `npm run check:src:core`. |
| **U3 — Judgment and relevance resolution** | `src/core/ledgers/handlers.ts`; `tests/src/core/ledgers/handlers.test.ts` | U1, U2 | Use the real conversation and judgment manager. Pin exact states/questions, choice ordering, source/model invalidation, reused-versus-fresh usage, refusal, partial abort, all-topic requests, question limits, and conservative relevance filtering. Use recorded boundary answers, not a replacement judgment manager. Gate: `npx vitest run --config vite.config.ts --project src:core tests/src/core/ledgers/handlers.test.ts`. Gate: `npm run check:src:core`. |
| **U4 — Request execution** | `src/core/ledgers/Ledger.ts`; `tests/src/core/ledgers/Ledger.test.ts` | U1–U3 | Compose real agents, conversations, instruction managers, tool managers, emitter, cancellation, and budgets. Prove stable retrieval prompts, exact prompt admission, duplicate-ID handling, repeated-call stop, bounded recall, structured digest, one recovery answer, cancellation precedence, empty-answer failure, settlement, overlap rejection, snapshot restoration, and cleanup. Gate: `npx vitest run --config vite.config.ts --project src:core tests/src/core/ledgers/Ledger.test.ts`. Gates: `npm run test:src:core` and `npm run check:src:core`. |
| **U5 — Public exposure, realistic replay, and guide** | `src/core/ledgers/index.ts`, `src/core/index.ts`; `guides/ledgers.md`, `guides/agent.md`, `guides/README.md`; `tests/guides.test.ts`; `tests/src/core/ledgers/integration.test.ts`; `tests/setupLedger.ts`, `tests/setupLedger.test.ts`; `tests/fixtures/ledgers/` | U1–U4 | Export exactly section 2’s surface. Execute the consumer example. Normalize and preserve the eight recorded shifts as immutable fixtures, retaining tool batches, judgment questions, usage, source order, and request boundaries. Replay through the real ledger and agent with inert provider/judge boundary transcripts. Require every expected request and tool occurrence to be consumed. Gates: `npx vitest run --config vite.config.ts --project src:core tests/src/core/ledgers/integration.test.ts`; `npx vitest run --config vite.config.ts --project setup tests/setupLedger.test.ts`; `npm run test:guides`; `npm run test:src:core`; `npm run check:src:core`. |
| **U6 — Desk adoption** | `../desk/app/core/types.ts`, `constants.ts`, `helpers.ts`; `../desk/app/server/Desk.ts`, `types.ts`, `parsers.ts`, `handlers.ts`, `constants.ts`; `../desk/app/vue/App.vue`, `helpers.ts`, `types.ts`; corresponding existing mirrored tests; `../desk/tests/app/server/integration.test.ts`; `../desk/tests/app/vue/integration.test.ts`; `../desk/guides/desk.md` | U5 | Hold a ledger per explicit conversation identity; isolate comparison lanes; preserve raw evidence apart from generated policy/request text. Prove two successive requests retain facts and corrections, two identities do not share evidence, cancellation settles before reuse, reload/reset identity behavior is explicit, and the browser sends the identity. Gates: `npm --prefix ../desk run check:app`; `npm --prefix ../desk run test:app`; `npm --prefix ../desk run test:journey:vue`. |

Unit U5’s replay has two distinct assertions:

- **Preservation:** unchanged behaviors reproduce normalized judge questions, entry record membership, ordering, tail grouping, and prompt allocation from the recorded load.
- **Repairs:** explicit expected differences cover handle removal, global correction inheritance, antecedent grouping, stale filtering, and answer collapse. A broad “ignore prompt differences” comparator is forbidden.

The integration suite includes adversarial fixtures beyond the measured shift: successful empty lookups, argument permutations, repeated IDs, correction chains, unscoped requests, ambiguous aliases, sentence-initial names, mixed global/subject corrections, and budgets too small for the first recall group.

After U6, a verifier runs the integrated package gates once:

```text
npm run format:check
npm run lint:check
npm run check
npm run build
npm test
npm --prefix ../desk run format:check
npm --prefix ../desk run lint:check
npm --prefix ../desk run check
npm --prefix ../desk run build
npm --prefix ../desk test
```

A separate adversarial acceptance review attacks the repaired contracts and prompt boundary. Live model comparisons require a separate execution brief after the host’s active benchmark finishes; this design authorizes no daemon calls.

**6. Desk adoption**

The desk needs conversation identity and retained evidence before records can help it. Its existing `#speak` constructs a fresh agent, adds one user message, and immediately generates. Evidence: ../desk/app/server/Desk.ts:268.

The change sites are:

| Site | Change |
|---|---|
| ../desk/app/core/types.ts:39 | Add the shared turn-request contract carrying `conversation`, `fixture`, and `message`. Keep transport types out of server-local inline object declarations. |
| ../desk/app/vue/App.vue:26 | Hold an explicit conversation identity for the selected working session. Renew it on the application’s reset/example-change boundary; do not use a global server conversation for all browsers. |
| ../desk/app/vue/App.vue:71 | Pass conversation identity through the existing request flow. |
| ../desk/app/vue/App.vue:97 | Define example switching as a conversation boundary so unrelated fixtures do not become one account history. |
| ../desk/app/vue/helpers.ts:87 | Thread identity through `readTurn`. |
| ../desk/app/vue/helpers.ts:114 | Send `{ conversation, fixture, message }` from `openTurn`. |
| ../desk/app/server/parsers.ts:112 | Validate the shared request shape and identity alongside the message. |
| ../desk/app/server/handlers.ts:59 | Pass identity to the desk; stop redeclaring the request body inline. |
| ../desk/app/server/Desk.ts:40 | Hold the ledger registry and its execution ownership. Reject overlapping requests for an already-running conversation or serialize them through `@orkestrel/queue`. |
| ../desk/app/server/Desk.ts:55 | Reuse the injected Mica judge. Keep its model, system prompt, calibration, transport, and deadline in the application. |
| ../desk/app/server/Desk.ts:78 | Make `publish` operate on the named conversation. Keep the policy workflow’s request-local decisions separate from factual ledger evidence. |
| ../desk/app/server/Desk.ts:89 | Keep the two contrast speeches isolated from the retained agent conversation. Their generated text must never become ledger evidence. |
| ../desk/app/server/Desk.ts:96 | Supply the raw customer message as evidence and the rendered policy/task prompt as the work request. The ledger excludes previous work requests without losing the actual customer statements. |
| ../desk/app/server/Desk.ts:256 | Route the agent speech through `Ledger.execute`; preserve the existing contrast path. Read content, usage, and partial state from `LedgerResult.result`. |
| ../desk/app/core/constants.ts:13 | Retain application ownership of judge wording; add application-specific category/topic/correction criteria here. Do not copy Larkspur benchmark entities into the package. |
| ../desk/app/core/constants.ts:19 | Retain Mica selection here rather than inside `@orkestrel/agent`. |
| ../desk/app/server/constants.ts:14 | Keep provider context size and ledger window aligned. The desk’s 8,192-token context is not evidence of the measured 3,072-token result. |
| ../desk/app/server/constants.ts:24 | Supply an explicit answer reservation consistent with the configured reply limit. |
| ../desk/app/server/types.ts:5 | Extend desk configuration with the ledger policy/window inputs and optional snapshot persistence supplied by the application. |

The first consumer can retain ledgers in process. Restart durability is optional: persist the complete ledger snapshot through an application database row and restore it before accepting another request. Do not persist only `ConversationSnapshot`, because that loses request boundaries and result-success receipts.

The desk has a policy demonstration workload rather than the benchmark’s order/account tool set. Its first adoption must therefore demonstrate retained customer evidence and corrections using its real domain. Lookup tools join only when the application actually supplies them.

**7. Risks**

The following checks identify ways the port could lose the measured gain.

| Risk | Check |
|---|---|
| Formatting changes erase the useful prompt structure | Replay `tmp/bench/results/v9/a5-records-v1-wire` through the port, then all eight copies. Compare actual provider messages, headings, ordering, and whole-group allocation under explicit repair differences. |
| Judge questions, criterion order, or states drift | Match recorded judgment requests exactly after source-ID normalization. An unmatched question fails replay rather than receiving a fabricated answer. |
| Fixing global correction scope adds distracting withdrawn values | Fixture a correction that mentions an obsolete value, then measure the repaired global-scope configuration separately. Preserve corrective language verbatim; do not globally delete matching numbers. |
| Removing person prefixes loses the antecedent benefit | Assert adjacent source grouping for the Tomasz and Sigrid evidence, then compare request-level outcomes for depot release and callback in a fresh measured series. |
| Relevance filtering removes necessary lookup or correction evidence | Baseline replay with relevance absent; separate deterministic tests for negative, uncertain, refused, and budget-cut decisions; separately measure the enabled configuration, including lookup lines omitted by the earlier probe. Evidence: tmp/bench/results/v9/FINDINGS-A1.md:104. |
| Calibration understates schema/framing cost | Replay recorded prompt/completion usage; vary tool-schema size, omit usage, inject invalid slopes, and change calibration identity. Assert every forwarded prompt passed admission with answer room reserved. |
| Estimated admission is mistaken for exact token counting | Document the estimator’s limit and measure actual provider counts in the later live run. Refuse structural overflow before calling; report observed estimation error rather than claiming an exact tokenizer. |
| Stable caching hides newly retrieved facts | Assert current-request results enter the retrieval continuation and answer digest while the entry briefing stays frozen. Assert the next request rebuilds its records. |
| Corrected sources leak through a secondary route | Scan provenance-bearing system, tail, recall, loose, and digest outputs. A mutation bypassing stale filtering on each route must fail its named case. |
| Duplicate IDs or result timing corrupt provenance | Drive repeated IDs within and across batches. Account for the tool event occurring before the result message is appended. Evidence: src/core/agents/Agent.ts:542; src/core/agents/Agent.ts:546. |
| Recovery repeats side effects or ignores cancellation | Count real fixture-tool executions across timeout, repeat-stop, and answer recovery. The answer phase advertises no tools; a cancelled request makes no recovery provider call. |
| Snapshot restore changes behavior | Round-trip the full snapshot and compare the next request’s projection, questions, receipts, and prompt to uninterrupted execution. |
| Different clients share one record set | Desk integration test with interleaved conversation identities and distinct corrections. |
| Old requests or generated answers regain evidentiary status | Assert request IDs and assistant outputs never enter records; separately admitted raw customer evidence survives. |
| Tests replay outputs without proving prompt construction | Make replay match each outgoing request before releasing its recorded response. Fail on missing, extra, reordered, or unconsumed interactions. |
| The benchmark score is treated as a production guarantee | After implementation, run the same eight-copy paired comparison with strict scoring and blind adjudication. Report the repaired port’s score separately from the frozen harness result. |

Recorded-wire replay proves preservation and mechanical repairs. Only a fresh, separately authorized model series can establish whether the repaired port retains the measured gain.