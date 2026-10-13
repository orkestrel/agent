# Aggregate support admission successor: subjective lane proposal

## Decision

I recommend clearer judge input as the first successor: label the candidate summary and the source evidence, put the evidence first, and replace the "agree" question with one that defines support for every fact and every relation the summary asserts. The Mica judge, single-token readout, fit rule, cutoff grid, 0.5 supported-admission floor, summarizer, lifecycle, and budgets stay unchanged. AGREE remains one whole-candidate request at each existing call site.

I rule this the justified first successor. Every retained AGREE reading contains a boundary defect that any later method would also have to fix. The candidate is unlabeled, and since the source-clause summarizer it copies the same `(date) role:` prefix as the evidence lines. The judge is asked about "the summary," but no block in the state carries that name. The criterion relies on "a later message," yet the state never says the sources are in order. Code-side claim decomposition is not justified first: the boundary defect confounds every reading, and splitting a candidate into sentences adds calls and lowers supported scores.

This is a proposal, not an acceptance. Root reconciles it with the objective lane.

## What the retained evidence shows

The relation-deletion readings are deterministic within one candidate. Every replay difference is zero, and the forward and reverse orders agree. The readout does not track the invented relations:

- Removing the invented prerequisite moves the score by −0.043.
- Replacing "due to" with ";" moves it by +0.018.
- Removing both, which gives the supported variant, moves it by −0.0015.

The supported variant (0.8410) therefore scores below both the incorrect original (0.8425) and the variant with the invented cause removed (0.8601). See `tmp/units/aggregate-judge-counterfactual/live-reviewed-repair-1/analysis.json:163` and the variant definitions at `tmp/units/aggregate-judge-counterfactual/packet-final.json:195`. This is within-candidate evidence only.

The wire shape behind those readings:

- The state is the prose followed by `Source messages:` (`.orkestrel/agent/instruments/harness/bench5/aggregates/helpers.ts:449`).
- The source and candidate lines share one format (`.orkestrel/agent/instruments/harness/bench5/aggregates/helpers.ts:308`).
- The prose carries copied prefixes, as `SUMMARY_SYSTEM` instructs (`.orkestrel/agent/instruments/harness/bench5/aggregates/constants.ts:4`).

In the rendered request, the state is 24 lines in one format with a separator after the third (`tmp/units/aggregate-judge-counterfactual/packet-final.json:377`).

My hypothesis, which is unverified: the judge reads the candidate as more messages and answers a coherence question. That would explain the insensitivity. The retained records cannot tell this apart from a model-internal aggregation limit, and the stop rule in the empirical plan settles it.

## Successor contract

This is the exact text for `.orkestrel/agent/instruments/harness/bench5/aggregates/constants.ts`:

```ts
export const AGREE_QUESTION: NoulQuestion = Object.freeze({
	form: 'noul',
	instructions: 'Do the source messages support everything the summary says?',
	criteria: Object.freeze({
		true: 'The source messages state every fact in the summary and every relation it asserts between facts, such as a cause, requirement, or condition, in the same or other words, and no later message corrects or withdraws any of it',
		false: 'The summary states something the source messages do not state, contradict, or later correct or withdraw, such as an added cause, requirement, or condition, a changed value, date, or actor, or a request or plan stated as done',
	}),
})

export const AGREE_STATE_SOURCES = 'Source messages, the only evidence, in message order:'
export const AGREE_STATE_SUMMARY = 'Summary to check against them:'
```

This is the exact body for `buildAgreeState`, with the same signature:

```ts
return `${AGREE_STATE_SOURCES}\n${sources.map(renderSource).join('\n')}\n\n${AGREE_STATE_SUMMARY}\n${version.prose}`
```

The unchanged vendor renderer (`.orkestrel/agent/instruments/harness/vendor/ollama/index.js:81`) then produces this layout:

```text
<state>
Source messages, the only evidence, in message order:
(2026-10-08) user: Third rule: copy Priya Raman from the refunds team on every escalation.
(2026-10-10) user: Sigrid: Her electrician found it when unpacking this morning.

Summary to check against them:
(2026-10-10) user: Escalation ESC-2219 remains open because Sigrid reports two of the 8 pendants have cracked glass.
</state>
Question: Do the source messages support everything the summary says?
Criteria:
false: The summary states something the source messages do not state, contradict, or later correct or withdraw, ...
true: The source messages state every fact in the summary and every relation it asserts between facts, ...
Answer Yes if true, or No if false.
```

These are the wording decisions:

- **One term per concept.** The labels use the question's nouns, "source messages" and "summary," so the question's referent is visible in the state. The judge never sees the summarizer's term "source lines."
- **"The only evidence."** This uses the Mica system prompt's rule that explicit rules in the state override familiar conventions. It tells the judge the summary block is not evidence, without adding a rule about prefixes.
- **"In message order."** This gives "later message" a meaning. The l7 criterion depended on order without stating it.
- **Evidence first, claim last.** The claim the question refers to sits next to the question.
- **"In the same or other words."** This keeps paraphrase supportable, so literal copying is not the test.
- **Asserted relations, not adjacency.** The criterion targets relations the summary asserts. A plain juxtaposition, such as the semicolon in the frozen supported variant, asserts no relation. Making adjacency a violation would conflict with the settled supported expectation.
- **The preserved distinctions are named:** corrections and withdrawals, dates, actors, conditions and requirements, and requests or plans versus completed work.
- **The support definition does not weaken.** Contradict, replace, and not-stated all remain in the false criterion. "Replace" becomes "correct or withdraw" because withdrawals are the retention case.
- **Prefixes stay in the judged prose.** The judge must read the exact bytes admitted to the decision model, and those bytes carry the prefixes.

Support stays separate from coverage. Neither criterion asks for completeness, so a one-clause summary can pass. Coverage is a matter for the later work comparison.

## Where admission runs

Both admission paths reach the same `#support` method (`.orkestrel/agent/instruments/harness/bench5/aggregates/Aggregator.ts:367`), so the successor applies to both without call-site changes.

**Initial build and every rebuild.** This covers the first build, removed sources, a CHANGE-triggered rebuild, a failed check, and each retry. In each case `#build` runs the lexical `#check` first, then `#support(draft, sources)` with the build's complete sources (`.orkestrel/agent/instruments/harness/bench5/aggregates/Aggregator.ts:442`). A refusal follows the existing bounded path: retry, then withhold.

**Changed-source retention.** An arrival that CHANGE does not flag leads to a lexical check of the retained prose against the complete changed source set. The retained prose then goes through `#support(current, sources)` against that same set, and a refusal rebuilds (`.orkestrel/agent/instruments/harness/bench5/aggregates/Aggregator.ts:302`). The clause "no later message corrects or withdraws any of it" carries the most weight here, because the prose was written before the arrival.

**Unchanged.** Identical sources keep the version without AGREE (`.orkestrel/agent/instruments/harness/bench5/aggregates/Aggregator.ts:298`). The render-time lexical filter, CHANGE, and its 0.56 cutoff are untouched.

## Rejected directions

- **Question-only rewording, the smaller change.** The referent problem is in the state. Rewording the question cannot label the summary or separate it from the evidence.
- **Per-sentence admission with a code-side minimum.** The summarizer's one-clause-per-sentence contract makes this the natural next hypothesis, but it is not justified first:
  - The boundary defect is present in every current reading, so aggregation is not shown to be the cause.
  - Taking the minimum over noisy sentence scores lowers supported scores against the 0.5 floor; the generated supported median is 0.47.
  - It multiplies judge calls and changes the reading unit.
  - Admitting summaries partially, sentence by sentence, would also need sentence-level labels, which amounts to relabeling.
- **Structured JSON state.** The adapter supports it, but JSON escaping changes how the evidence reads. That would be a second simultaneous change and would confound attribution. Plain labeled blocks stay on the same string path.
- **A different judge, a thinking judge, or a generated rationale.** Each changes the fixed judge role, the seed-judge identity binding, and the single-token readout, and none has motivation yet.
- **Stripping prefixes before judging.** The judge would then check bytes that differ from the ones admitted.

## Implementation seams

**Owned edits:**

- `AGREE_QUESTION` and `AGREE_STATE_SOURCES`, plus an added `AGREE_STATE_SUMMARY` (`.orkestrel/agent/instruments/harness/bench5/aggregates/constants.ts:20`).
- The `buildAgreeState` body and its `@returns` TSDoc (`.orkestrel/agent/instruments/harness/bench5/aggregates/helpers.ts:443`).

**Consumers that derive the state and need no edit:**

- `.orkestrel/agent/instruments/harness/bench5/aggregates/Aggregator.ts:378`
- `.orkestrel/agent/instruments/harness/bench5/refit/Refit.ts:553` and `.orkestrel/agent/instruments/harness/bench5/refit/Refit.ts:565`
- `.orkestrel/agent/instruments/harness/bench5/refit/helpers.ts:178` and `.orkestrel/agent/instruments/harness/bench5/refit/helpers.ts:497`
- `.orkestrel/agent/instruments/harness/bench5/calibrate.ts:465`

**Tests that pin the old text** (the implementer runs the census):

- `.orkestrel/agent/instruments/harness/bench5/tests/aggregates.test.ts:693`
- `.orkestrel/agent/instruments/harness/bench5/tests/aggregates.test.ts:724`
- `.orkestrel/agent/instruments/harness/bench5/tests/calibrate.test.ts:683`

**Label custody.** `buildRefitItem` puts the question and state into the blinded packet item (`.orkestrel/agent/instruments/harness/bench5/refit/helpers.ts:174`). `verifyLabels` checks the label against that item's digest (`.orkestrel/agent/instruments/harness/bench5/refit/helpers.ts:186`). Settled labels therefore fail verification under the successor even when the prose and sources are byte-identical.

Generation retries are lexical only, and AGREE is recorded but never drives a retry (`.orkestrel/agent/instruments/harness/bench5/refit/Refit.ts:542`). With the summarizer cache replaying, the successor's calibration prose population should match l7; this is unverified until it is compared. A bounded label-transfer step lets the fit reuse settled labels without relabeling. It must:

1. Verify each label's l7 digest against the l7 packet.
2. Match each l8 item by equal prose and ordered sources.
3. Emit the l8 digest with a reference to the transfer.

Any unmatched item gets a fresh blind audit under the same rubric. Root rules on whether to add this seam or to audit everything fresh.

**Fit.** Unchanged (`.orkestrel/agent/instruments/harness/bench5/refit/helpers.ts:237`). `REFIT_IMPLEMENTATION` binds the edited files (`.orkestrel/agent/instruments/harness/bench5/refit/constants.ts:16`), so a fresh fit is forced. The vendor renderer and `MICA_RENDER_REVISION` are unchanged. Judge cache keys change through the state and question bytes.

## Empirical plan

Freeze the successor text once. Make no wording revision at any stage. Use a separate result root and keep l7 immutable. Retain every request body, response body, top-20 logprobs, usage, finish reason, wall time, and `prompt_eval_cached_count`. Build every state with the production `buildAgreeState` and render it through `renderJudgePrompt`; never concatenate by hand.

1. **Boundary controls, predeclared.** Root freezes these families and their expectations before any request:
   - **Relation joins:** the four variants in `packet-final.json`.
   - **Supported correction:** settled-supported `23060fe4`, Farah's "91 Quarry Lane, not 19". Its mutation states the superseded value.
   - **Request versus completed work:** settled-supported `079f08df`, the conditional replacement plan. Its mutation states the replacement as sent.
   - **Retention withdrawal:** the verbatim frozen clause `(2026-10-09) user: Ticket ESC-2219 is resolved, close it.` Judge it against the source prefix through 2026-10-09 (expected supported), then against the complete set containing the reopening (expected not supported). The prose bytes and their lexical overlap are identical in both states, so lexical overlap cannot pass this pair.

   Run every family under the l7 and successor renderers in forward and reverse order.

   **Pass:** within every family, each supported-expectation state scores strictly above each not-supported state, with zero replay difference. **Any failure:** refuse the successor and stop. The next hypothesis is per-sentence admission under its own brief. One candidate's improvement never qualifies the method.
2. **Population rescoring with settled labels.** This step is offline and uses no generation. Rescore under the successor:
   - every scored distinct identity in q2, g2, g4, and q4;
   - the archived control population.

   Join labels by attempt id after verifying the l7 digests. Apply the unchanged `fitReadings` and `measureRecall` per cohort. Report occurrence and distinct admission, the score tables by label, and the negative that forces each cutoff. Lexical exclusions stay in the denominators.

   **Pass:** a cohort proceeds only if its diagnosis is accepted. **No cohort accepted:** refuse the successor and stop.
3. **Qualification fit under custody.** For each passing cohort:
   - Run a fresh build and freeze, then generation with the summarizer cache replaying.
   - Verify prose equality with l7.
   - Transfer or audit labels per the custody seam.
   - Run the unchanged fit.

   This fit is the one the matrix pilot requires.

**Fresh measurements before the matrix and held-out work:**

- Pilot exposure: a nonempty body on more than half of served goals.
- Runtime withhold and retry rates. Live AGREE refusals drive retries, unlike calibration generation.
- A blind support audit of every version admitted through the retention path in the pilot. This is the only evidence on later states, because the fit certifies cold builds only (`.orkestrel/agent/instruments/harness/bench5/refit/constants.ts:7`).
- A fresh endurance development fit on its distinct corpus. This is the first reading on unseen sources.

Matrix evaluation copies and sustained-work evaluation stay untouched until the method is frozen.

## Risks left for the final work comparison

- **Thin summaries.** A clearer support test can admit mostly narrow, extractive summaries. Report the prose length, the distinct source clauses carried, and completion-cap hits descriptively, and never treat them as admission inputs.
- **Exposure collapse.** The retry note tells the summarizer only `{"kind":"agree","token":""}`, with no location. Stricter admission can raise withholding and fail the exposure requirement.
- **Misleading adjacency.** A juxtaposition with no connective remains supported, yet it can still mislead a decision model. Only the work comparison detects that.
- **Readout meaning.** The score is a normalized Yes/No weight, not a calibrated factual probability. The sampled token can disagree with it: the first original reading sampled "No" at a normalized Yes weight of 0.8425 (`tmp/units/aggregate-judge-counterfactual/live-reviewed-repair-1/analysis.json:15`).
- **Prompt reuse cost.** Putting evidence first lets attempts over one source context share the prompt prefix. The repeat reading reused 1025 of 1029 prompt tokens (`tmp/units/aggregate-judge-counterfactual/live-reviewed-repair-1/analysis.json:29`). No speed gain is claimed; record the reuse count with the host load.
