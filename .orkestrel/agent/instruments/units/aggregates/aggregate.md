Events. The event log is the ledger's conversation: append-only messages plus the judgments store. A topic's events are its live lines as the ledger itself projects them, through buildRecords run on a mirror of the projection input (helpers.ts:395-450). Superseded messages and stale sentences therefore never reach the summarizer (helpers.ts:685-717, 786-825, 849-878). Requests, notes, and replies are not events (helpers.ts:706-716).

Mirror. bench5/Mirror.ts rebuilds the input that `#project` builds (Ledger.ts:491-510) from exports alone:
- readings, from collectToolGroups, resolveLedgerCall, and readLookup;
- the registry, from collectRegistry;
- entities, from matchEntities(registry, content, true);
- a Classifier over `ledger.conversation` with the same judge, questions, topics, and thresholds.

The Classifier gets a mirror of the private assign rule (Ledger.ts:426-440):
- notes are recognized by the LEDGER_NOTES `cue` and `results` text;
- a failed tool result comes from a `tool` event mapped to its message id, as Ledger.ts:209-216 and 415-424 do;
- an assistant call is chatter;
- an assistant message after the first request is chatter.

The Mirror reads classification(), category(), quiet(), and topics(), and never calls classify(). It therefore asks nothing and reads what the ledger recorded at the preceding select.

Topics.
- One aggregate exists per desk topic and per registry owner.
- Owner sources are the lines of record `owner:ID`.
- Desk-topic sources are the buildLines of each live message whose topics include the desk topic.
- Tool readings carry no desk topic (Classifier.ts:58), so they feed owner aggregates only.

Rebuilds. Maintenance runs inside the wrapper at each goal's first select, after the ledger's classify. For each topic:
- first sources: build;
- a source line removed (stale, superseded, or replaced): rebuild by code, without asking;
- an arriving source message: ask CHANGE, and rebuild when any answer reaches its cutoff, else keep;
- every build, and every kept aggregate whose sources changed, is checked.

The summarizer reads all current sources, so a rebuild at the read point gives the version that per-arrival rebuilds would give there. Versions that no reader sees are skipped (Tension).

Summarizer. The summarizer is the model under test, called through a second createOllama instance with the same sampler, think false, and the generation cap from the pilot. It sits outside the ledger, so the ledger's gauge and conversation never see it.
- System prompt: 'You maintain a short summary of what a support desk's messages establish about TOPIC as of DATE. A later message replaces what an earlier message said. Copy every id, amount, date, and name exactly as the messages write it. Write only the summary, in at most three sentences.'
- User message: '(DAY) ROLE: LINE' per source. Tool lines get the name and arguments prefix that Ledger.ts:523-536 renders.
- The prompt cache is keyed by content per model and shared across copies.

Identifiers. Code writes the `Ids:` line from extractTokens(sources).ids (helpers.ts:162). The prose is the summarizer's. Marker slots lose to this: a wrong marker index swaps in a real but wrong value that passes every code check, while a mistyped id fails the subset check.

Consistency.
- Code check:
  - the ids and numbers of the prose are a subset of the sources' ids and numbers;
  - collectNames(prose) is a subset of the source names plus owner names (helpers.ts:190);
  - the prose is not empty;
  - the prose carries no token of the topic's stale sentences that no live line carries.
- Judge check: AGREE.
- On a failure, the version is marked stale and kept as its own event, and the topic is rebuilt.
- After the retry bound in settings.json, the topic is withheld for that read point. A withheld topic renders nothing, and its verbatim lines stay in the ledger's briefing.

Questions. Both are noul questions to Mica, served through the cache. They are logged in aggregates.jsonl and never added to the ledger's store, because classification() reads only amends and supersedes heads (Classifier.ts:190-196).
- CHANGE, keyed ['change', MESSAGE_ID, TOPIC, VERSION]:
  - question: 'Does the event change what the summary states about TOPIC?'
  - true: 'The event adds, replaces, or withdraws something the summary states or must state'
  - false: 'The event repeats the summary or does not bear on it'
  - state: 'Summary of TOPIC as of DATE: PROSE' followed by 'Event: ROLE: LINES'
- AGREE, keyed ['agree', TOPIC, VERSION]:
  - question: 'Does the summary agree with its source messages?'
  - true: 'Every statement in the summary matches the source messages, a later message replacing an earlier one'
  - false: 'The summary states something the source messages contradict, replace, or do not state'
  - state: the summary followed by 'Source messages:' and '(DAY) ROLE: LINE' per source.

Each cutoff is fitted per question and must exceed 0.5 (BRIEFING.md:290). The fit is in-sample.

Pinning. The rule is that an aggregate is never the only carrier of a value.
- A prose sentence renders only if every id, number, and name in it also occurs in what the model reads: the selection's briefing, a tail message, the system text, or the date line.
- `Ids:` keeps only ids that occur there.
- An aggregate left with no prose does not render.

The ledger's Pinned and Rules blocks are the verbatim carriers, so the summaries block adds only prose and code-copied ids, never verbatim text that the control lacks. The alternative, putting each value's source line inside the block, loses: it adds verbatim context that the control's plan cut, which confounds the comparison (Tension). The render records sole-carried tokens and asserts zero.

Placement. The wrapper writes the instruction `summaries`, ranked after `date`, before the build at Agent.ts:747. The 'select' event at Agent.ts:748 fires after the build, so a listener would be too late.
- Content: '### Topic summaries', then for each topic '#### TITLE, as of DATE', the `Ids:` line, and the prose.
- Order: the request's owners first, then its desk topics. The near set is taken as the plan takes it (Ledger.ts:589-597).
- Size: whole aggregates are cut from the end until estimateMessages times `ledger.gauge.scale` fits the allowance.
- The answer pass reuses the entered briefing (Ledger.ts:563-568) and the same instruction.
- On a faulted selection the wrapper removes `summaries`, because build renders instructions even when it drops the briefing (AgentContext.ts:240-247).

Budget. Additive: both arms keep the same share and capacity, so the ledger plans the same briefing and tail. The block lives in the headroom left by `share.prompt` 0.7 (constants.ts:94-97). The gauge prices it (Ledger.ts:920-933); the plan cap does not (Ledger.ts:725-731). A budget-neutral design, with a lower share for the aggregate arm, would answer the fixed-budget compaction question. It loses here because the requirement fixes the ledger options across arms.

Judge reader. The ledger's filing reads plain states, and it has no hook for anything else (Classifier.ts:228-231; types.ts:480-488). bench5/shadow.ts works offline:
- It re-asks, through the cache, every category question the ledger asked about a message after the first read point, and every amends or supersedes pair it screened.
- Each state is prefixed with the aggregates current before that read point, for the subject's topics and the request's topics.
- The plain answers come from judgments.jsonl.

A route that lets aggregate states drive the filing exists: the judge wrapper rewrites `state`, and the cache keys the rewritten state. It adds a second difference between arms, so it belongs to a later arm (Tension).

Where it lives.
- bench5/aggregates/Aggregator.ts, bench5/aggregates/helpers.ts, bench5/aggregates/constants.ts
- bench5/Mirror.ts, bench5/Summarizer.ts, bench5/JudgeCache.ts
- aggregates.jsonl in each run directory, and the caches under BASE/cache
- bench5/fit.json and bench5/settings.json

@orkestrel/agent needs no change. If a later arm lets aggregates drive the filing inside the package, the smallest seam is one ClassifierOptions handler, `context`, that returns text prepended to a subject's state before rendering, so that the stored reuse key covers the full state (JudgmentManager.ts:80-87, 110-111).

## Seams
- createLedger(provider, options) factory (ledgers/factories.ts:17): both arms construct through it.
- LedgerOptions judge, system, topics with requested, questions, thresholds, capacity, predict, think, lookups as { tool, read }, share, recall.limit, agent.limit and agent.timeout (ledgers/types.ts:254-276, 173-176, 117-120, 67-75, 231-234), and the LedgerLookupHandler contract returning { ids, owners } or undefined (types.ts:156-159).
- LedgerInterface respond, calibrate, conversation, agent, gauge (types.ts:301-343), and a public conversation that accepts add between respond calls (Ledger.ts:247): interleaving depends on it.
- ConversationInterface add (one and batch), messages, message, view, and judgments.judgment, judgments, resolve (conversations/types.ts:41-71): the Mirror, the dumps, and the Classifier read through them.
- AgentContext apply, scope, and select, with select reading the scope at call time and falling back to the handler createAgent received (AgentContext.ts:163-172; Ledger.ts:207); createScope({ name, select }) (contexts/factories.ts:236): the selection wrapper delegates through this.
- Agent order: build(selection) at Agent.ts:747 before emit('select') at Agent.ts:748, and the 'tool', 'turn', and 'select' events (Agent.ts:415, 557, 748): the summaries instruction must be written inside select to reach the build.
- AgentContext.build part order: system, instructions, workspace text, briefing last, with instructions rendered even on a faulted selection (AgentContext.ts:184-256); InstructionManagerInterface add with overwrite by name, remove, instruction, and priority order (contexts/types.ts:115-151, 44-56).
- Ledger turn estimate built through context.build(selection), so instructions enter the gauge (Ledger.ts:920-933); Gauge.observe rescaling from the first call (Gauge.ts:122-131); the plan cap pricing options.system plus briefing (Ledger.ts:725-731).
- Answer pass applies its own scope and restores the previous one, and annotation selects reuse the entered briefing (Ledger.ts:351-372, 563-568): the wrapper and the instruction persist into the answer pass.
- Filing rules the Mirror reproduces: assign (Ledger.ts:426-440), notes from LEDGER_NOTES cue and results (Ledger.ts:347-350), pending tool results flushed to message ids (Ledger.ts:209-216, 415-424), seed tail limited to messages before the first request (Ledger.ts:836-841; agent.md:546), and a seed tool message read as a successful lookup (agent.md:544).
- Classifier class and ClassifierOptions { conversation, judge, questions, topics, thresholds, assign, entities }, with classify, classification, category, quiet, topics (Classifier.ts:35-226; types.ts:480-548); the judgment keys ['category', id], ['topic', id, name], ['amends', e, l], ['supersedes', e, l], the states '${role}: ${content}' and 'Earlier message: ...\nLater message: ...', and reuse on model, state, sources, and question (Classifier.ts:228-287): the judge cache keys depend on these exact strings.
- Projection helpers buildRecords, buildLines, collectRegistry, matchEntities, linkOwners, resolveLedgerCall, identifyLookup, extractTokens, splitSentences, collectNames (ledgers/helpers.ts:33-878), collectToolGroups (conversations/helpers.ts), estimateMessages (agents/helpers.ts), and the types LedgerProjectionInput, LedgerLookupReading, LedgerClassification, LedgerLine, LedgerRecord (types.ts:186-447).
- Constants LEDGER_QUESTIONS, LEDGER_NOTES, DEFAULT_LEDGER_SHARE, DEFAULT_LEDGER_LIMIT, DEFAULT_RECALL_LIMIT, DETERMINISTIC_JUDGE_ERROR, LEDGER_RULES_KEY, LEDGER_OWNER_PREFIX (ledgers/constants.ts:31-121).
- Selection.briefing (contexts/types.ts:239-250) and the renderLedgerPinned '### TITLE' block shape (helpers.ts:519-521): the pinning filter reads the briefing text and the Mirror proof compares owner titles.
- JudgeInterface { id, name, model, ask } with JudgeRequest { state, questions } and JudgeResult { model, answers, refusals?, usage? } (core/types.ts:128-176): the judge cache implements it.
- ProviderInterface generate(messages, signal, tools, options) and replay (providers/types.ts:98-120; Ledger.ts:142, 287-293): the summarizer calls generate on its own instance, and calibration still makes two calls.
- Package root re-export of the ledgers module (src/core/index.ts:12) into the built dist/src/core/index.js the harness vendors: bench5/seams.ts probes every entry of this list against any build, so the trim can run it before release.
