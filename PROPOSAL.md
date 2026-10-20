# Proposal: improve Records with source-indexed BM25

**Date:** 2026-10-20  
**Status:** Design proposal for review and bounded implementation; no measured treatment gain is claimed.  
**Basis:** The supplied `ANALYSIS.md`, the Agent and Database guides, and the supplied Scaffold rules. External BM25 references are identified separately at the end.

## 1. Decision

**Retain Records and add a deterministic lexical index over its source-attributed units.** Repair access to earlier work, owner linking, and obligation/correction presentation before expecting a ranking algorithm to solve those exposure problems. Use BM25 (Best Matching 25) to select relevant record material and support recall. Evaluate predecessor pruning as a separate change that might reduce judge work.

**The target is less unnecessary work and better source exposure, not another inference pipeline.** Keep the existing judge boundary for filing and amendment/supersession questions. Add no embedding model, vector search, neural reranker, judge-based relevance pass, or generative query-rewriting pass to ordinary messaging.

**Records remain projections of retained evidence, not maintained prose summaries.** Do not compact records, summarize record groups, maintain a living aggregate, or compact and retry. The user excludes those directions for this proposal. Historical comparisons in `ANALYSIS.md` explain the decision context; they do not authorize another comparison campaign or another strategy arm.

**The proposed path has distinct responsibilities.** The conversation retains what arrived. Judgments record interpretations. Record projections organize source material. The lexical index locates that material. The ledger admits a bounded selection to the agent. A search score never establishes truth, grants authority, or retires a source.

**Keep the implementation in the existing ownership structure.** Agent owns reusable Records behavior; `studies/memory` owns the experimental consumer and campaign-specific policies. Do not create another context runtime, database abstraction, memory-file system, or package merely to host this change.

## 2. Evidence and limits

### Read the dated analysis before the older guide

**The analysis changes several earlier recommendations.** Its source reading describes complete composed-request admission, a strict `WINDOW` refusal, exact judgment matching, retained partial judge answers, the repeat stop, the answer-only pass, and inherited stop information. Treat those mechanisms as retained behavior to verify in the target checkout, not missing features to reimplement. Exact tokenizer replacement and room/output retuning remain outside this proposal.[^a-admission]

**The proposal has not inspected the repository implementation or reproduced the historical experiments.** `ANALYSIS.md` itself reports that its author read source and receipts but did not execute tests, models, custody readers, or raw-transcript analysis. Preserve that evidence level. Re-read the decision-bearing source and the applicable public declarations before implementing a row.[^a-scope]

**The reported evidence supports targeted repairs, not a general quality victory.** The following findings determine priority; the right column states the limit on each inference.

| Reported finding | Proposed response | Evidence limit |
| --- | --- | --- |
| 95/96 goals referenced prior products; later replies were not carried as work. | Prioritize R2: addressable request/reply work records. | The exposure rule is source-supported; the size of its quality effect needs a treatment test. |
| Records had 21/24 off-focus handoffs and 11 stale dates; the seed case appeared in 32/88 other-case products. | Test R1: a moving recent exchange with standing pins separate from seed examples. | These associations do not isolate a cause. |
| A bounded probe distinguished a recognized bare ID from its prefixed lookup subject. | Repair R3 at the subject/owner-link boundary. | The probe establishes that case, not complete-workload benefit. |
| Goals 49/53/77 accounted for 410/729 judge calls and 240,908/335,490 judge prompt tokens: 56.2% and 71.8%, respectively. | Target predecessor eligibility and repeated work, with correction-recall guards. | Historical pair identities and judge payloads are missing. Call counts do not identify which questions were unnecessary. |
| The retained Records reference completed 96 goals, but later semantic judgments rarely passed facts, work, and obligations. | Keep operational completion separate from semantic acceptance. | One trajectory and differing captured builds do not establish general strategy superiority. |

These findings are reported in the analysis's Records diagnostics, source reading, retained-reference table, and semantic-label section.[^a-diagnostics][^a-records][^a-reference]

**Do not claim savings from work moved elsewhere.** Eager filing, background processing, model residency, batching, and prefix changes have separate eligibility gates in the analysis. The one-slot serving constraint and missing native Records phase timings make those separate experiments, not assumptions supporting this proposal.[^a-speed]

### Preserve the campaign boundary

**This document narrows the requested design work to Records; it does not unpause model execution.** The analysis records W5 and unit A as accepted infrastructure, a pause pending Study 0.0.2, and unit B next. Re-read the actual dispatch ledger before any execution. This proposal does not change its resource permissions, oracle-access rules, or remaining budgets.[^a-status]

**Use the existing ladder rather than creating a competing schedule.** Add the proposed BM25 work as explicitly scoped entries in the session's plan. The identifiers in this document describe design responsibilities, not assigned campaign units or permission to launch a model.

## 3. Priorities and dispositions

**Separate source repairs from ranking changes so each result remains attributable.** The following matrix defines the intended scope; implementation acceptance still requires the owning source, tests, and campaign gate.

| Area | Disposition | Recommendation |
| --- | --- | --- |
| Evidence capture, R7/W7/W12 | Retain and complete the required coverage | Record source membership, filing, selection, and dispatch without changing request bytes. Add a package observation only when public state cannot supply a required fact. |
| Prefixed owner linking, R3 | Repair | Parse the declared lookup subject and link recognized identities without changing unrelated argument semantics. |
| Earlier products, R2 | Implement | Retrieve actual prior request/reply pairs as own work, distinct from authoritative source observations and completion receipts. |
| Recent context, R1 | Implement as an isolated treatment | Replace seed-only conversational continuity with a bounded moving exchange; retain standing instructions and grants separately. |
| Obligations and supersessions, R4a/R5a | Repair presentation where evidence supports it | Render already-filed obligations, prerequisites, and replacement relationships before adding classifier questions. |
| BM25 record selection | Implement and evaluate | Rank eligible source units within and across record groups without another model call. |
| BM25-assisted recall | Implement through the same index | Search source material and return bounded, attributable results with continuation and exact reads. |
| Predecessor pruning, R5b | Separate gated treatment | Combine direct relationships with lexical candidates; retain unresolved coverage rather than assuming omitted pairs are negative. |
| Incremental materialization | Measure, then implement the supported scope | Update affected records and index entries; preserve equivalence with a full projection over the same inputs. |
| Exact judgment reuse, admission, repeat/recovery behavior | Retain | Do not replace working mechanisms or weaken their failure semantics. |
| Added obligation/correction questions, R4b/R5c | Defer to their existing diagnosis gates | BM25 does not supply missing interpretation; extra questions require their own evidence and cost. |
| Embeddings, vector search, rerankers, record compaction | Exclude | Do not include these mechanisms in this messaging proposal or its acceptance prerequisites. |

R1–R7 and the related aliases retain the meanings assigned in `ANALYSIS.md`. The file distinguishes implemented mechanisms, proposed treatments, diagnostic prerequisites, and held alternatives.[^a-quality]

## 4. Repair what a record can expose

### Preserve source identity independently of record membership

**Keep `LedgerRecord` as the organizational view, not the indivisible retrieval document.** Its key, title, members, and source-attributed lines already provide the basis for this design. A record might accumulate unrelated matters; ranking or including its entire text would make its growing size control retrieval and prompt cost.[^a-records]

**Identify evidence before assigning it to owners.** A searchable unit must identify its conversation, original message, source revision, and exact source span or existing selection group. Owner membership, topics, and presentation labels reference that unit. A sentence placed in multiple owner records must not become several independent search documents or several pieces of corroboration.

**Retain exact source text separately from its rendered form.** Party prefixes, headings, lookup stubs, and retrieval annotations are presentation. Search normalization must not rewrite stored content, source offsets, case-sensitive identifiers, or the text used to reproduce a judgment request.

**Use the existing source-selection boundaries for the first BM25 treatment.** Reuse coherent source groups already available to the selector. Keep a short message whole; preserve a selected span's surrounding qualifier and attribution. Do not change sentence splitting, passage sizing, and ranking in the same initial comparison. Revisit segmentation only when a traced failure identifies it as the cause.

### Restore prior work without promoting it into fact

**Make earlier products addressable as work.** Bind each product to its actual request, conversation position, subject identities, and result. Store or reference the real answer, including partial or incorrect answers. Resolve an explicit prior-product reference directly before lexical search.

**Separate origin from completion state.** An assistant draft proves what the assistant drafted. It does not prove that a message was sent, an order changed, a deployment completed, or an approval was granted. A confirmed external action requires the relevant tool or external receipt and its scope. A successful lookup proves that a lookup returned a result, not that every action discussed in that result occurred.

**Do not classify every prior assistant reply as an externally true fact to make it searchable.** Own-work retrieval must remain available even when the message's existing filing is chatter. Likewise, a mixed request can contain a durable restriction; indexing its request/reply association must not discard that restriction or infer it was accepted elsewhere.

**Distinguish navigation from evidence.** A pointer to the preceding answer can resolve “revise that draft.” A request for work from an earlier case requires that case's product, not whichever product is most recent. An ambiguous reference must remain ambiguous rather than selecting a high-scoring unrelated answer.

R2 and the own-work-status proposal already name this distinction. The analysis reports that later replies' chatter filing excludes them from ordinary topical recall, and it keeps broader action-status work conditional on source mapping.[^a-records][^a-quality]

### Repair owner linking at the parser boundary

**Parse a recognized prefixed subject according to the lookup's declared grammar.** Use the configured parser's extracted ID and owner relationship instead of comparing the entire prefixed subject to a bare ID. Preserve the original tool arguments in the event record and wire request.

**Do not remove every prefix or case-fold every argument globally.** A prefix can identify a namespace; two namespaces can reuse an ID. Unknown or ambiguous subjects must produce a visible unresolved link, not a guessed owner. Test bare/prefixed equivalence only where the actual parser contract establishes that equivalence.

**Exercise wrong-owner and cross-case obligation controls.** Selecting fewer record lines is not success when the discarded lines contain a relevant shared obligation. The analysis identifies this exact qualification for R3.[^a-quality]

### Separate standing pins from recent context

**Use the recent tail for conversational references, not permanent policy.** Carry fitting complete exchanges from the relevant recent history, with tool-call/result groups intact. Keep the original current user message. Deduplicate evidence also carried in the briefing by source identity, without dropping the prompt structure needed to interpret the exchange.

**Select standing instructions and grants by applicability.** Do not retire a standing constraint because its originating message aged out of the tail. Conversely, an opening example's case and date must not remain the active task merely because they appeared in the seed.

**Use recorded time rather than inferred recency.** An arrival timestamp, a source's effective date, and the current task date have different meanings. Preserve explicit dates and validity relationships; do not substitute the date of the most recent message for a deadline or effective date.

**Keep the tail and record allocation fixed during the first ranking comparison.** R1 is a separate treatment. The analysis identifies it as proposed, and it preserves the room profile absent an attributable trimming failure.[^a-quality]

### Render obligations and corrections from supported state

**Present an applicable obligation with its condition and status evidence.** A requirement can be open, satisfied, withdrawn, or prerequisite-bound. Do not infer satisfaction from silence, a later draft, or low retrieval rank. When the available filing cannot establish a state, render that uncertainty.

**Render a replacement relationship without reviving the retired instruction.** When an old statement is relevant to the task, show its historical status and the applicable replacement. Do not dump every retired statement into each briefing. Preserve unrelated live statements from the same source.

**Use shared IDs and numbers to locate amendment candidates, not to define the changed property.** A correction to a shipping charge does not retire an approval requirement merely because both sentences contain the same order ID. Retain ambiguous material as disputed or unresolved until the evidence identifies the affected assertion.

**Do not broaden classifier work to compensate for unverified rendering defects.** Test R4a and R5a against truthful fixed filings first. When an obligation or correction was never recognized, preserve that diagnosis and route it to the separately gated R4b or R5c experiment. BM25 cannot turn an absent judgment into a supported relationship.[^a-quality]

## 5. Put BM25 inside Records selection

### Choose one search unit and one scoring contract

**Index source units underlying records, then assemble record views from the selected units.** The index is a reconstructable view over the conversation and its accepted projections. It is not another editable transcript and not a record summary.

**Keep searchability separate from permission to act on content.** The following populations need different eligibility rules even when they share one index implementation.

| Population | Search purpose | Admission rule |
| --- | --- | --- |
| Live source evidence | Supply applicable facts, rules, and corrections. | Require released, accessible sources and resolve relevant amendment relationships. |
| Prior work | Locate a request/reply product to continue, compare, or revise. | Label it as own work; preserve its actual result and supporting receipts separately. |
| Historical or unresolved source material | Recover an omitted source or inspect a prior decision. | Preserve historical, disputed, or unclassified status; do not silently promote it into active fact. |

**A quiet filing must not erase the recovery path.** Keep its original source searchable for bounded historical recall. A lexical hit can expose evidence for reconsideration; it does not overrule a supersession or turn irrelevant chatter into a standing instruction.

**Exclude derived echoes from corpus statistics.** Do not index the same source again because it appeared in a briefing, recall answer, answer note, or lookup stub. Preserve those events for execution replay, but index their underlying evidence identity. Independently authored messages remain separate events even when their text happens to match.

**Enforce the released-source boundary before candidate selection.** Future public releases, withheld sources, evaluation labels, rubrics, and private oracle text must not enter the corpus, query expansion, relevance labels, or source relationships used by the agent. Exclude the current request from its own evidence candidates. A request's constraints can still enter the ledger through the normal request/filing path.

### Tokenize text without corrupting identity

**Use separate exact-identity and lexical paths.** Exact source IDs, owner IDs, declared aliases, and recognized tool subjects resolve through keyed structures. BM25 operates over normalized text; it must not decide whether two resource identifiers are equal.

**Version the lexical analyzer.** Define case handling, Unicode segmentation, punctuation, code-name splitting, numbers, and empty input. Preserve the original source bytes. Reuse a declared ecosystem capability when its contract matches; otherwise implement only the bounded analyzer the first consumer needs.

**Preserve informative technical terms.** Package names, function names, error codes, identifiers, dates, and amounts can distinguish otherwise similar messages. Searchable components can supplement literal names, but they must not replace the exact-key path. Do not remove negations and conditions from the evidence sent to the model.

**Defer stemming, fuzzy expansion, learned terms, and generated synonyms.** Add a deterministic application alias only when its meaning is declared. The first treatment must measure BM25, not a combined analyzer and semantic-expansion redesign.

### Freeze a reproducible BM25 definition

**BM25 combines term rarity, saturating term frequency, and document-length normalization.** It requires no inference call. The following formula defines a candidate scoring contract; selecting it is not a claim of byte-for-byte equivalence with a particular search engine.[^bm25]

The notation uses a query term set `Q`, source unit `d`, corpus size `N`, document frequency `df`, term frequency `tf`, source length `L`, and corpus average length `avgL`.

```text
idf(t) = ln(1 + (N - df(t) + 0.5) / (df(t) + 0.5))

score(Q, d) = sum over matching terms t in Q of:
    idf(t) * tf(t, d) * (k1 + 1)
    / (tf(t, d) + k1 * (1 - b + b * L(d) / avgL))
```

**The IDF form follows the documented Lucene formulation.** The parameters `k1` and `b` control term-frequency saturation and length normalization. Choose and freeze their settings on authorized development data; this proposal does not prescribe universal values.[^lucene]

**Define boundary behavior before implementation.** Empty or tokenless queries return no lexical matches. An empty corpus returns no lexical matches. A source without a matching term receives no search hit. Require finite `k1 >= 0` and `0 <= b <= 1`, validate source lengths and corpus statistics, and never pad a result with zero-match records.

**Count each source unit once in document frequency.** Repeating a term within a unit changes its term frequency, not the number of documents containing it. Repeating query text must not multiply its contribution accidentally; the initial scoring contract uses distinct analyzed query terms.

**Keep statistics tied to an observable corpus revision.** Use a declared released-source corpus for each authorized conversation/source partition at a revision, with eligibility masks for live evidence, own work, and historical recall. Inaccessible sources must not enter that partition or its statistics. State whether tokenless units count; the proposed text corpus excludes them. Additions change corpus statistics, so retrieval-result caches need the index revision. Do not persist a BM25 score as an intrinsic property of a message.

### Build the query from evidence already available

**Start from the original request and resolved references.** Extract lexical terms, recognized IDs, requested work identity, and existing topic/owner information. For a short referential request, include the context needed to resolve its referent, not the entire recent conversation.

**Do not generate a cleaner request as a prerequisite to retrieval.** A deterministic task header can restate the resolved target and original requirements while keeping the original user message present. Ambiguous references and tentative language must remain visible. Query construction must not manufacture an ID, deadline, obligation, or synonym.

**Keep query provenance inspectable.** Record which terms came from the request, a recognized alias, or an explicitly resolved prior product. Do not add all words from a high-scoring answer back into the query; that creates self-reinforcing retrieval of the same possibly wrong product.

### Protect mandatory context before ranking optional evidence

**Load applicable obligations and direct references outside BM25 competition.** A restriction does not become optional because its wording differs from the request. Exact referenced work and required source/receipt relationships enter the candidate set directly.

**Use BM25 for the optional portion of the selection.** Search eligible source units within the relevant records and include a bounded conversation-level discovery path for missed topics or owner links. An inferred topic is a retrieval hint, not an access-control boundary or proof that other topics cannot matter.

**Budget candidates after dependency expansion.** A source might require an amender, a prerequisite, a preceding question, or a correlated tool result. Calculate that group's actual prompt cost before accepting it. Skip an optional group that does not fit and consider the next fitting group; do not let one oversized optional source prevent every later source from being considered.

**Rank for selection, then render for interpretation.** Select by obligation/direct-reference priority and lexical score; present the chosen evidence in stable owner/source order with chronological correction relationships. Freeze a deterministic tie-breaker. Repeated unchanged input must not reshuffle the prefix through unstable iteration order.

**Do not force the briefing to consume every available token.** Admit evidence that answers the request or supports a required dependency. A shorter briefing can reduce input work, but removing required work to achieve that reduction is a failure.

**A bounded candidate set is not complete recall.** For requests requiring every matching record, use scoped enumeration and continuation, not top-ranked retrieval. When mandatory context cannot fit, preserve the admission failure or split the requested work; do not silently discard an obligation.

### Share the mechanism with recall

**Use one source index for eager selection and agent-directed retrieval.** Exact owner/ID lookup and BM25 discovery can provide different candidate inputs to that mechanism, but they must share source identity, release checks, and amendment handling.

**Return attribution and continuation instead of unbounded source dumps.** A recall result must identify the source, record or work association, status, and excerpt, with an exact-read path for the retained original. A truncated listing must state that omitted material remains.

**Make older results reachable without weakening the repeat stop.** Where the target implementation repeats the first page for the same topic, add a cursor bound to the query, corpus revision, and position. Include continuation identity in repeat detection. A page with no progress remains a repeat; a later page is not the same operation. Re-read the target's actual guard before changing it.

**Keep historical correction context intact.** Returning an older statement without its known replacement can reintroduce stale instructions. Include the necessary relationship or an explicit unresolved marker within the same bounded result.

**Treat recalled content as evidence, not authority.** Preserve its original role and origin. A quoted instruction cannot redefine the system policy, source-access rules, or tool permissions. Exact reads must enforce the same access and release boundary as search.

## 6. Reduce judge work through a separate predecessor treatment

**BM25 selection alone does not reduce filing calls.** It changes which evidence reaches the agent. Judge-call savings require avoiding unnecessary questions, reusing exact answers, or a separately validated change in execution. Do not attribute selection savings to classifier pruning when pruning is disabled.

**Use a separate proposal for R5b predecessor eligibility.** Preserve category-before-topic, correction-before-predecessor, and amendment-before-supersession dependencies. Preserve question text, ordered source IDs, rendered state, and judgment identity for retained questions.[^a-records]

**Construct predecessor candidates from explicit relationships first.** Include recognized source references, shared entity/field relationships where available, applicable owner relationships, and known cross-case obligations. Use BM25 to nominate additional lexically plausible predecessors from the remaining population. A broad desk topic alone must not force an unbounded pair expansion.

**Do not equate lexical mismatch with absence of correction.** “Remove the earlier approval prerequisite” can amend a differently worded instruction. Direct references and scoped relationships must survive lexical cutoffs. When those relationships are unresolved, widen within the declared bound or report unresolved coverage rather than accepting the older assertion as still valid.

**Run a shadow eligibility comparison before pruning live questions.** On an authorized captured or development population, compute the proposed candidates while retaining the baseline question population. Measure which influential amendment/supersession relationships would be missed. Shadow mode claims no saved judge calls.

**Recognize the coverage limit of incomplete tapes.** The historical Records run lacks the pair identities and answers needed to prove all pruning decisions. An unmatched question in a replay tape is unknown, not a negative answer or a cache hit. Earn additional evidence through the existing bounded tape rungs; do not acquire the full tape as an automatic prerequisite.[^a-tape]

**Sorting every pair saves no inference when every pair is still asked.** A smaller evaluated population can save work but changes coverage. Report evaluated, reused, deferred, and unevaluated questions separately, and propagate partial/abort information without turning a missing answer into favorable filing.

**Keep correction detection separate from pruning.** An improved detector can identify more real corrections and increase total pair work. Evaluate R5c under its own gate and remeasure R5b before combining them. Lower call count alone cannot justify a detector that misses corrections.[^a-quality]

**Leave judge batching, eager filing, and model replacement held.** The analysis records Mica's one-question calls, limited same-state mergeability, and the one-slot constraint. This proposal neither adds a topic taxonomy to improve BM25 nor changes model identity, question wording, or probability thresholds to obtain a cheaper result.[^a-speed]

## 7. Make materialization incremental and replayable

### Separate reusable computations from request decisions

**Measure the projection cost before expanding its state machinery.** The analysis reports offline rebuild times of 0.2 seconds for 12 goals, 2.8 seconds for 48, and 18.4 seconds for 96, excluding fresh live judge inference. These are reconstruction readings, not native per-request latency measurements.[^a-tape]

**Maintain an inverted index rather than rescanning all text for every query.** Store source term frequencies, lengths, postings, and corpus totals. Visit postings for matching terms and maintain a bounded top-result structure. Verify its results against a straightforward scorer over the same corpus before treating it as an optimization.

**Measure archive growth rather than claiming constant-cost retrieval.** Common-term postings, index memory, and result filtering can still grow with retained history. Record the late-stage costs. If a search stops at its declared work bound, report incomplete coverage rather than a definitive absence. The first implementation does not claim constant memory or unlimited conversation capacity.

**Apply changes to affected sources and record memberships.** An appended source adds entries. A changed filing alters eligibility and affected record projections. A corrected owner link moves the relevant membership. A threshold change reprojects valid stored distributions; a changed question/state/model requires a judgment miss. A segmentation or analyzer change rebuilds the affected index under a different revision.

**Do not re-embed, resummarize, or rejudge unchanged text to maintain this index.** Tokenization and indexing operate in application code. Cache source-local computations by their actual inputs; do not build a semantic cache over similar-looking messages.

**Avoid an incremental implementation that secretly copies the whole archive on every append.** Preserve the package's ownership rules with source-local updates and atomic publication of a consistent revision. Read-only public views must not leak mutable index internals. Measure publication and maintenance cost as part of the change.

The following cache boundaries keep reuse specific.

| Cached value | Validity inputs |
| --- | --- |
| Analyzed source unit | Original source revision, span/group identity, analyzer revision. |
| Derived record membership and lines | Source identities, relevant lookup links, judgment identities, projection policy. |
| Judge answer | Existing exact question, ordered sources, rendered state, and pinned model configuration. |
| Retrieval result | Analyzed query, access/release filters, corpus revision, scoring configuration. |
| Selected briefing | Selected source/projection revisions, applicable instructions, request identity, and admission configuration. |

**Pin a model configuration to immutable evidence.** A mutable model tag is insufficient when weights or serving configuration change behind it. Preserve historical records; invalidate incompatible derived decisions rather than relabeling a former result as one produced by the replacement.

### Publish coherent revisions

**A selection must not mix a source revision with an index from another revision.** Bind its corpus cutoff, projection, query, and source reads to a coherent checkpoint. If interpretation lags an arrival, include the unprocessed correction as pending evidence or refuse a dependent action; do not present an older projection as complete.

**Compute inference outside database transactions.** Validate that its source revisions remain applicable before publishing a result. A delayed or aborted operation must not overwrite a later accepted projection. The publication boundary must acknowledge required state changes; an isolated observation listener is not a durability acknowledgment.

**Use retained sources and recorded judgments for replay.** A replay that reruns the judge is another inference execution and can produce a different result. Keep that distinction explicit in evaluation and recovery.

### Keep persistence changes proportional to the consumer

**A conversation snapshot is not a Ledger checkpoint.** The analysis states that registrations, request sets, gauge state, and other Ledger-private bookkeeping require replay; the public conversation store does not restore them all. Do not describe a reload as a resumed ledger merely because its messages and judgments were read.[^a-records]

**Do not make a durable-ledger redesign a prerequisite for the first BM25 treatment.** Use the existing authorized replay/seed path and build the lexical index from its actual sources. W3's design explicitly does not require Ledger restore. Add persistence or a package checkpoint only when an identified restart or scale requirement earns that scope.[^a-status]

**For a persistent index, preserve one canonical conversation record.** Index rows and materialized records are derived data with source IDs and revision watermarks. A missing index can be rebuilt. Missing authoritative content must be reported, not reconstructed by a model.

**Do not add destructive cleanup in this proposal.** Relevance and expiry affect selection. Corrections affect applicability. Neither deletes the retained source. Derived caches can be discarded and rebuilt; changes to source retention require their own authorization.

## 8. Preserve the runtime protections and inference profile

**Retain complete-request admission and strict refusal.** The analysis describes measurement of the composed request, including instructions, tools, and options. Verify that the Records consumer routes every dispatch, including recall growth and answer-only recovery, through that path. If a bypass is observed, repair that specific bypass; do not replace the gauge or claim the complete-request mechanism is absent.[^a-admission]

**Retain the measured room profile for the first treatments.** The sealed Records reference had no length finishes and a peak prompt of 11,309 against 11,776 available. Those observations do not establish safety for every changed output, but they do not support an automatic reserve reduction. Keep reserve, context, safety, thinking policy, and sampler fixed during the selection comparison.[^a-reference][^a-quality]

**Treat a fault fallback as a distinct exposure path.** A fallback to the conversation view still requires admission. If the fallback omits necessary evidence or cannot fit, report a failed or incomplete invocation. Do not add a compaction recovery, silently truncate the request, or waive a standing obligation.

**Retain the repeat stop and surfaced answer-pass failures.** Improve pagination identity only where required for genuine continuation. Do not make a failed first pass disappear from attempt accounting because the final pass returned text. Inherited `stop` already exists; record additional counts only when a consumer requires them.[^a-records]

**Separate stable instructions from changing evidence.** Preserve a stable trusted prefix where it does not alter meaning. Render selected sources in a stable order and keep origin/status labels explicit. Repositioning the briefing changes model input and might change quality; it belongs to the separate R-S5 treatment, not an unreported optimization in BM25.

**Do not use cached-token count as a time-saving measurement.** Report elapsed work and provider phases where observed. Source retention, prompt-prefix caching, exact judgment reuse, and lexical-index caching are different mechanisms with different invalidation rules.[^a-speed]

## 9. Place the implementation at its owner

**Read installed capabilities before adding a search dependency or exported name.** Reuse a declared implementation when its scoring, update, and ownership contracts match. Otherwise start with a host-independent lexical component consumed by the existing ledger. Keep the first implementation within Agent unless a separate package is justified and authorized.

**Do not turn `selectRecords` into an implicit database or model client.** Keep deterministic source projection, scoring, and packing in pure helpers or the appropriate owned entity. Let Ledger orchestrate the prepared index and existing selection boundary. Eager selection and recall must consume the same search behavior.

**Keep the first scoring path portable.** The uploaded Database guide exposes keyed access and portable conditions, not a BM25 query operator or raw-SQL escape hatch. An in-memory postings index rebuilt from retained sources is sufficient to test the proposed mechanism. It adds neither a vector service nor a SQLite-specific requirement.[^database]

**Defer a native FTS5 adapter.** SQLite Full-Text Search 5 (FTS5) provides BM25 ranking, but its query and scoring contract is not the Database package's portable condition API. Adopt a native path only after measured index cost and authorized dependency work justify it. Its lower-is-better BM25 result and its analyzer/IDF behavior require an explicit translation; do not claim equivalence to the proposed scorer from a shared algorithm name.[^fts5]

**Preserve the package/study boundary.** Reusable index and source-selection behavior belongs under `src/`; workload topic names, case grammar, cutoffs, fixtures, and treatment orchestration belong in the authorized consumer. Do not move temporary campaign instruments into reusable source merely because they produced useful evidence.

The following source map identifies responsibilities, not a frozen API or a claim that this proposal inspected these files.

| Existing location | Intended responsibility |
| --- | --- |
| `src/core/ledgers/Ledger.ts` | Compose records, work references, lexical selection, bounded recall, and existing admission. |
| `src/core/ledgers/Classifier.ts` | Retain dependent filing and exact reuse; accept a separately tested predecessor-candidate mechanism only in its own treatment. |
| `src/core/ledgers/helpers.ts` | Source-unit projection, identity relations, scoring leaves, and deterministic packing where they remain pure. |
| Ledger module's centralized declarations | Define only the types, parameters, guards, and errors required by the accepted behavior. |
| `tests/src/core/ledgers/Ledger.test.ts` | Complete request capture and public behavioral controls; retain the W7 home rather than inventing a golden-test tree. |
| Existing mirrored classifier/helper tests | Pair eligibility, scoring, update parity, and failure behavior. |
| `studies/memory` | Public-data treatment wiring, measurements, source-exposure diagnostics, and accepted reusable study instruments. |

**Follow `AGENTS.md` and its linked Scaffold rules rather than treating this proposal as another coding convention file.** Keep centralized declarations, one-word entity members, origin-package imports, owned inputs, public parity, and real-interface tests in their established locations. Update affected consumers together; do not add compatibility aliases. Source positions cited in `ANALYSIS.md` are navigation leads and must be re-read at the target revision.

## 10. Prove the behavior before promoting it

### Capture the loss boundary

**Record how a necessary source moves through the pipeline.** Distinguish available, linked, filed, searchable, retrieved, selected, rendered, and used. Record exclusion reasons and unresolved relationships. A source selected correctly but ignored by the model is not a retrieval miss.

**Keep observation outside the prompt.** Capture query derivation, corpus revision, matching source IDs, score contributions where needed, candidate membership, dependency expansion, final source membership, and the dispatched request identity. Store detailed traces only for the declared instrument population; ordinary diagnostics can retain bounded IDs and reasons.

**Count physical work separately from logical questions.** Preserve `ClassifierReading` observations, but add transport-level counts and timing through the actual recorder when evaluating savings. Charge request-level judge usage once, retain unknown usage, and avoid summing overlapping timing layers.

**Do not reconstruct missing provenance from briefing prose or byte lengths.** W4 provides its own capture/replay instrument, not the historical judge answers absent from the retained run. W7/W12 must supply the evidence required by the proposed treatment before a writer claims complete historical equivalence.[^a-tape][^a-status]

### Require negative controls at the relevant boundary

**Each acceptance claim needs a control that reaches and breaks the behavior under test.** Use real owned implementations and the sanctioned recorded/scripted boundary facilities; do not mock project-owned retrieval or classification logic.

| Behavior | Required scenario and failure control |
| --- | --- |
| Owner linking | A parser-recognized bare/prefixed pair links identically; another namespace or owner does not inherit that link. |
| Prior work | A request retrieves the actual earlier product; an assistant claim without a receipt cannot establish external completion. |
| Recent tail | A referential request carries its preceding proposal; a later unrelated case does not inherit a seed example's case/date. |
| Standing obligations | A low-overlap applicable restriction survives optional ranking; a closed or unrelated restriction is not falsely reopened. |
| Correction scope | A field-specific correction preserves another live statement sharing the entity ID; an explicit cross-reference remains reachable despite vocabulary change. |
| Search scoring | Hand-derived scores and an independently organized reference calculation agree; repeated terms, empty input, common terms, and nonmatches exercise their defined boundaries. |
| Ranking population | A source with zero lexical overlap is not inserted as a BM25 hit; an exact direct reference remains available without lexical overlap. |
| Record membership | One source appearing in several owner records has one search identity; distinct events with identical text remain distinct. |
| Incremental index | Update, membership change, and rebuild produce the same results at the same revision; a deliberately stale posting is detected by the comparison. |
| Release isolation | A source becomes searchable only after release; a future release or private rubric cannot influence the query or statistics. |
| Recall continuation | A later page reaches omitted evidence; an identical page request still triggers the repeat policy. |
| Capacity and cancellation | Expanded dependencies and large results reach actual admission; an abort or stale revision cannot publish an apparently complete selection. |
| Exact judgment reuse | Changed wording, state, ordered sources, or model identity misses, including equal-length changes; a matching request reuses the recorded answer. |
| Treatment isolation | Observation-off preserves request bytes; a selection-only treatment adds no relevance-model call or summarizer call. |

**Use actual development failures and clean guards at both early and late positions.** Scale cases to the load and error being tested. This document does not prescribe arbitrary candidate counts, token shares, fixtures, or acceptance percentages; inherit the applicable frozen ladder gates and declare BM25-specific thresholds before running the treatment.

### Distinguish semantic acceptance from performance

**Evaluate evidence recall before final-answer quality.** Determine whether required facts, obligations, prior work, and correction relationships were in the candidate set and survived packing. Then assess whether the final product used them correctly.

**Use semantic labels independently of retrieval heuristics.** A lexical overlap metric can diagnose term coverage, not truth or completion. The analysis reports poor correlation between mechanical metrics and semantic criteria, and it keeps the official holistic rubric separate from development atoms.[^a-diagnostics]

**Measure selection and maintenance together.** Include query construction, index updates, postings visited, candidates scored, source reads, dependency expansion, packing, and any recovery work. Report warm and cold preparation separately when relevant. Include agent/judge calls, prompt/completion tokens, wall time, and other host load.

**Judge speed at comparable work quality.** Fewer lookups, shorter answers, fewer records, or fewer judge calls can indicate failure rather than improvement. A quality gain may increase output cost. Report that tradeoff explicitly instead of hiding it behind one throughput score.

**Preserve the comparison unit.** Goals in one evolving conversation are dependent; they are not independent replications. Freeze the model/runtime closure, inference settings, treatment onset, source releases, candidate parameters, and labeling procedure. Use off, exact repeat, sham, and on where the existing ladder requires them. Their noise allowance is a campaign decision rule, not a confidence interval.[^a-gates]

**Continue each treatment's actual history.** After a changed response, subsequent work must use that response rather than sealed baseline products. Treat surgery at a later checkpoint as repair evidence, not proof that an earlier intervention would have prevented the failure. Tune on development threads and keep held-out evaluation text out of every selection rule.[^a-gates]

## 11. Sequence the work without broadening the campaign

**Use the following order for the next bounded scope.** Independent offline index work can proceed alongside authorized diagnosis, but each model comparison must have one identified treatment and the required evidence.

1. **Reconcile evidence and ownership.** Read the dated dispatch, target source, installed declarations, and complete capture obligations. Retain working admission/repeat/stop mechanisms. Close the evidence needed for the next row without an unconditional full Records replay.
2. **Repair direct source exposure.** Address R3 with its negative controls. Test R2 prior-work carriage and R1 recent continuity separately. Test R4a/R5a presentation on truthful filings where diagnosis identifies an exposure gap. Record what remains unresolved.
3. **Build BM25 offline over the same source units.** Freeze the analyzer, corpus definition, identity, and scoring contract. Compare ranked candidates against exact references and source-exposure labels. Verify that optional retrieval adds no model calls and that protected context bypasses lexical ranking.
4. **Evaluate BM25 record selection on the accepted Records foundation.** Hold the judge, question text, room, sampler, and runtime configuration fixed. Run the earned early/late cases with controls before longer continuations. Evaluate recall integration independently where its behavior changes.
5. **Evaluate predecessor pruning separately.** Begin with shadow eligibility and preserved baseline pair evidence. Promote only after influential corrections survive and the eligible cost gate is met. Retain an explicit unresolved-coverage path.
6. **Optimize measured maintenance cost.** Promote source-local materialization and index updates where realistic measurements justify them and parity controls pass. Keep prefix placement, batching, residency, model changes, and exact counting out of that result.
7. **Promote through the existing ladder.** Advance only surviving Records treatments, with actual generated history, same-quality cost evidence, and no critical regression under the applicable gate. This proposal requires no compaction treatment or full comparison arm.

**Stop the search direction when the failure is downstream.** When necessary evidence is selected and rendered correctly but the product ignores it, apply the analysis's excerpt diagnosis. Route that case to the separately gated reasoning or task-template investigation; do not widen the index or add more text without evidence.[^a-quality]

**Keep an unsuccessful prototype disposable.** If BM25 adds cost without worthwhile source-recall or product benefit, retain the source repairs and exact lookup path. If predecessor pruning misses influential corrections, retain the original eligible question population within its existing bounds. Neither outcome requires embeddings or record compaction as the next step.

## 12. Handoff conclusion

**The recommended design is Records plus indexed source selection, not Records plus another model.** Give the ledger direct access to prior products, correct owner relationships, applicable obligations, and known revisions. Let BM25 choose useful optional evidence from those records and support deeper recall without rewriting the sources.

**The strongest performance hypothesis is avoiding unnecessary correction questions while preserving every influential relationship.** The strongest quality hypothesis is carrying the right prior work and obligations into the briefing. Keep those hypotheses separate, retain the measured runtime protections, and promote only the changes supported by source-level controls and bounded semantic comparisons.

**For the next session, start with the evidence/defect matrix and the smallest earned Records row.** Treat all unmeasured benefits in this document as proposals. Preserve the dispatch pause until the session's actual authority changes it, and use `ANALYSIS.md` to resolve reported history rather than reconstructing it from earlier chat recommendations.

## References and evidence provenance

**Local citations identify the supplied analysis, not independently read repository receipts.** Place this file beside `ANALYSIS.md`. The analysis's source definitions resolve to the underlying repository documents; its source-line references must be checked against the implementation revision the session uses.

[^a-scope]: See [Analysis: scope and sources](ANALYSIS.md#1-scope-and-sources), lines 5–13. The analysis distinguishes source reading, reported measurements, and unperformed verification.
[^a-records]: See [Analysis: how Records works](ANALYSIS.md#2-how-records-works), lines 19–50, especially the projection description, dependent classifier phases, prior-reply exclusion, owner-link defect, and Ledger-private replay requirements.
[^a-admission]: See [Analysis: complete-request admission](ANALYSIS.md#3-how-compaction-works), lines 64–68, and [Analysis: cross-arm and earlier proposals](ANALYSIS.md#cross-arm-and-earlier-proposals), especially the retained admission/accounting row. This reference records existing runtime behavior; it does not propose compaction.
[^a-reference]: See [Analysis: retained Study references](ANALYSIS.md#thinking-off-study-adaptation-and-compaction-qualification-october-1416), lines 170–184, and [Analysis: semantic labels](ANALYSIS.md#semantic-labels-on-the-retained-study-references), lines 188–200. The Records result prefix is `fe9bd623…`; its reported seal prefix is `3fbafc2b…`.
[^a-diagnostics]: See [Analysis: failure analysis and performance probes](ANALYSIS.md#failure-analysis-and-performance-probes-october-1619), lines 204–218. The selection, correction-burst, and mechanical-metric findings are reported observations with stated attribution limits.
[^a-tape]: See [Analysis: offline reconstruction and instrument proofs](ANALYSIS.md#offline-reconstruction-and-instrument-proofs), lines 220–226, and [Analysis: open questions and limits](ANALYSIS.md#7-open-questions-and-limits), lines 408–427. Missing historical answers remain missing; offline replay cost excludes fresh inference.
[^a-quality]: See [Analysis: Records quality and selection](ANALYSIS.md#records-quality-and-selection), lines 250–274. R1–R7 and the related aliases identify the existing proposals and their prerequisites; none is represented here as an accepted live gain.
[^a-speed]: See [Analysis: Records speed and alternative designs](ANALYSIS.md#records-speed-and-alternative-designs), lines 276–292. Eager filing, batching, residency, prefix reuse, and additional topics retain their separate dispositions.
[^a-status]: See [Analysis: units and execution status](ANALYSIS.md#earlier-boost-plan-versus-the-current-units), lines 349–373, and lines 406–427. W5/A acceptance is infrastructure acceptance; the 2026-10-20 pause and unit B dependency are distinct from treatment authorization.
[^a-gates]: See [Analysis: gates and prospective cost limits](ANALYSIS.md#gates-comparisons-and-prospective-cost-limits), lines 375–406. Inherit applicable controls, coverage, causal-continuation rules, and budgets; do not interpret planned thresholds as observed improvements.
[^database]: See the supplied Database guide's `ConditionOperator`, `QueryInput`, and driver contracts, and its design statement at lines 12–20. The uploaded guide is a capability reference, not evidence that an FTS5 retrieval seam is installed in the target checkout.
[^bm25]: External algorithm reference checked on 2026-10-20: see [Okapi BM25: a non-binary model](https://nlp.stanford.edu/IR-book/html/htmledition/okapi-bm25-a-non-binary-model-1.html). It supports the lexical scoring factors and development-set parameter selection, not Orkestrel performance claims.
[^lucene]: External implementation reference checked on 2026-10-20: see [Lucene 10.3.1 BM25Similarity](https://lucene.apache.org/core/10_3_1/core/org/apache/lucene/search/similarities/BM25Similarity.html). It documents the stated IDF form and parameter roles. It is a pinned reference, not a recommendation to add Lucene or a claim about the most recent release.
[^fts5]: External capability reference checked on 2026-10-20: see [SQLite FTS5 Extension](https://sqlite.org/fts5.html), particularly its BM25 auxiliary function and tokenizer sections. A native adapter remains deferred; this proposal does not add a SQLite dependency or claim scoring parity.
