# Admission mechanism after the l8 refusal: subjective design proposal

## Decision

Replace whole-summary AGREE with a claim-level support check. The check uses the same judge, the same `AGREE_QUESTION`, and the same `buildAgreeState` layout. Each rendered claim is judged on its own against the topic's complete ordered sources. A version is admitted only when every claim reaches the fitted cutoff.

Before any canonical change, a 10-request isolated screen on the l8 relation population must pass. A fixed rule decides it, and a refusal routes to one named successor.

I expect a material chance of refusal. Both whole-summary runs penalized the invented cause but not the invented repair prerequisite. Removing the prerequisite lowered the score under the canonical question (0.842522895608751 to 0.7995156693414494, judge-relations README) and under the l8 question (0.6475513594308746 to 0.6335111001434612, l8 live report). The screen tests directly whether that is dilution across sentences or a judge failure on a bounded claim.

## Mechanism contract

- **Claim unit.** Add `splitClaims(prose): readonly string[]` to `bench5/aggregates/helpers.ts`. It splits on line breaks, then before any `(DAY) ROLE:` source prefix embedded in a line, then with the vendored `splitSentences` inside each piece. It trims each claim and drops nothing.
  - The joined claims must reproduce the prose up to whitespace; otherwise it throws.
  - A dangling prefix with no text is still a claim and gets judged.
  - This splitter is required because `splitSentences` (`vendor/agent-0.0.30-trimmed/index.js:5733`) only splits before a capital letter, digit, or quote. It never splits at `\n(2026-…`, so it treats the source-clause line format that every l7 packet item uses as one sentence.
- **Coverage invariant.** Claim boundaries include every `splitSentences` boundary. Each unit that `filterProse` keeps at render time is therefore a run of whole claims, and each of those claims was scored against the version's sources. `render` already refuses a version whose sources differ from the current projection. The title and the `Ids:` line are built by code, not asserted by the model, and stay unjudged (see risks).
- **Question and state.** Use `AGREE_QUESTION` unchanged, with `buildAgreeState({ prose: claim }, sources)`. The only treatment change is the unit being judged.
- **Admission.** A version is supported when every claim score is at least `fit.agree`. Ask every claim every time, with no short-circuit, so the evidence and cost are the same for every version. If any claim request fails or returns no noul answer, the version is unsupported (runtime) or unscored (calibration). A subset of claims never yields a score.
- **Build.** The flow is unchanged: lexical `checkProse` on the whole prose, then the per-claim check. Any failing claim produces the existing `{ kind: 'agree' }` failure and the existing bounded retry or withhold path. `RETRY_NOTE` stays unchanged.
- **Changed-source retention.** After CHANGE rejects a rebuild, re-ask every claim against the complete changed source set; any failure rebuilds with trigger `check`. Unchanged sources keep the version without asking. Removed sources rebuild. Abort and failure semantics in `maintain` stay as they are.
- **Records.** Add `AggregateClaim { text, score? }` and `AggregateRow.claims` to `bench5/types.ts`. Support rows carry no `answers.agree`; readers derive the item readout as the minimum claim score. The minimum is a ranking readout. Like the source scores, it is not a calibrated probability of support: the judge-relations README states that the normalized weights aren't calibrated probabilities.

## Rejected directions

- **Lowering the cutoff or weighting whole-summary scores.** The brief forbids lowering the standard.
- **The l8 JSON question applied to claims.** It combines a refused presentation with a new unit, so the screen could not attribute the effect.
- **Evidence-first layout for prompt-cache reuse.** This is a presentation change. I defer it as a separately measured cost revision.
- **Partial admission (render only the passing claims).** It would serve usefulness better, but it changes the fit unit and needs claim-level labels, which amounts to new adjudication. I defer it until strict claim evidence exists.
- **A different judge model.** It adds a new role and custody, and no inspected evidence names a candidate.
- **Copy-provenance as the primary mechanism.** Copying cannot establish currency. It would also reject the settled-supported paraphrase "remains open because Sigrid reports…", and it changes lexical retries. I keep it as the refusal successor.

## Owned source seams

The changes fall in these files:

- **`bench5/types.ts`**: `AggregateClaim`, `AggregateRow.claims`, and per-claim judge records on `RefitAttempt`.
- **`bench5/aggregates/constants.ts`**: the embedded-prefix pattern.
- **`bench5/aggregates/helpers.ts`**: `splitClaims`. `filterProse` and `buildAgreeState` stay unchanged.
- **`Aggregator.#support`**: one `#ask` per claim, keyed `[AGREE_HEAD, topic.key, version.version, index]`.
- **`refit/Refit.ts` `#generate`**: per-claim asks. Retries stay lexical, so the l7 attempt sequence reproduces exactly.
- **`refit/helpers.ts`**:
  - `collectReadings`: score is the minimum over all claims, and the identity digests the claim states.
  - `readRefitControls`: keeps the archived custody checks, but takes scores from a hash-bound fresh claim-scoring file. The archived `score.agree` never enters the fit.
  - `verifyEvidence`: checks per-claim rows.
  - `buildRefitItem` stays unchanged, so label transfer can match the whole-summary item digest with the id excluded.
- **Every consumer of `answers.agree`**: must be updated in the same change. *Unresolved: I did not inspect the full consumer list.*

## Empirical plan, cheapest step first

Root freezes populations, labels, and rules before each stage.

**Stage 1a: isolated relation screen.** Reuse the judge-relations operator, which already uses the canonical question and state, with a packet of 5 distinct claims from the frozen l8 variants:

- S1: Grace still wants her own replacement.
- S2r: ESC-2219, with the repair prerequisite.
- S2c: ESC-2219, without it.
- S3x: the "due to" cause.
- S3c: the semicolon form.

Run them forward and then in reverse, 10 requests.

- **Pass rule (each pass):** max(S2r, S3x) < min(S1, S2c, S3c). This is exactly the frozen l8 rule ("supported strictly exceeds every unsupported") applied to minimum-claim item scores.
- **Refused:** the judge cannot reject the invented relation even on an isolated claim, so dilution does not explain this example. Close the mechanism with no canonical change. Splitting the credit between S2 and S3 does not count as a pass.
- **Incomplete:** a binding mismatch, transport error, missing logprobs or usage, or a response that isn't the one-token length finish. That leaves the screen unmeasured, not refused. A rerun needs root.
- **Cost estimate.** The judge-relations run measured 8184 prompt tokens over 8 requests in 22635 ms. By that arithmetic, Stage 1a needs about 10k prompt tokens and well under a minute. Per-claim requests share only the system prefix: the renderer puts the state before the question (`vendor/ollama/index.js:101`), and `buildAgreeState` puts the prose first.

**Stage 1b: frozen boundary controls (only after 1a passes).** These are claim texts that root authors and labels before scoring, over the same l8 sources:

- A verbatim current source line, as a positive.
- An expired condition stated as current, as a negative. Example: Ruth Adeyemi's sign-off authority, which ran only until 2026-10-09.
- A withdrawn state asserted unambiguously as current, as a negative. Per the l8 ruling, this must not be a dated historical quotation.
- A pronoun-dependent verbatim line ("She still wants her own replacement."). This one is reported but doesn't gate.

The pass rule is global separation over the gating claims of 1a and 1b in each pass, the same separating shape the fit uses. The cost is about 8 more requests.

**Stage 2: isolated rescoring of the retained cohorts (judge only, no summarizer inference).**

1. Run an offline census first. It records the lexically passing attempts per cohort, the distribution of claims per attempt, and the number of distinct claim states after content-addressed deduplication. It also checks that the largest claim request stays under `MICA_CONTEXT` 4096. The claim request bounds this: it is shorter than the whole-summary request recorded in the l7 judge usage.
2. The census also runs the label-transfer check. Every attempt's prose and ordered source bytes must equal those of its labeled item, or the stage stops before inference.
3. Score claims for the l7 cohorts (q2 168, g2 174, g4 179, q4 171 attempts) plus the 12 archived controls. The attempt counts give an arithmetic bound of about 2,100 requests; the census sets the exact figure, and wall time is estimated from the Stage 1 per-request timings.
4. Fit each cohort with the unchanged `fitReadings`, using the settled item labels and minimum-claim scores. A fit is accepted when a cutoff rejects every scored negative and ambiguity and end-to-end admission is at least 0.5.
5. For an item with one claim whose bytes equal its prose, the fresh request is byte-identical to the historical one. The fresh score must equal the historical score; a difference flags the run as incomplete.
6. Integrate canonically only if at least one cohort is accepted. If every cohort refuses, the mechanism is refused.

**Refusal routing.**

- **A refusal driven by invented relations** (Stage 1a, or Stage 2 negatives whose settled propositions are unsupported) routes to the copy-provenance successor. Each claim must equal one source line modulo its prefix, as `SUMMARY_SYSTEM` already instructs. This is enforced as a lexical failure, and per-claim AGREE remains for currency. Its first step is a census over the retained l7 attempts that needs no inference.
- **A refusal driven by currency or conditions** (Stage 1b, or contradicted and superseded negatives) is something neither direction addresses. The judge's support role then becomes root's open question.

**After Stage 2 accepts.** Canonical integration is a medium-size change:

1. Types, then helpers, `Aggregator`, `Refit`, and tests.
2. A failing control showing that a whole-summary fit cannot validate under the claim build. *Unresolved: whether the pilot and plan readers already enforce fit-to-implementation custody.*
3. One independent review, then `verifier` on the harness project.
4. Refreeze the corpus offline and regenerate with the l7 summary cache replayed. The prompts are unchanged, so the summarizer gets cache hits.
5. Transfer labels by content digest. Judge rows may be reused only on exact request bytes, with lineage recorded; anything else is scored fresh.
6. Rerun matrix freeze, resource, and full-view preflight; the custody contract requires this for any canonical change.
7. Pilots, Stages A to C, the separate filing-judge shadow, and the sustained-work pair then follow unchanged.

## Risks for the long-work comparison

- **Breadth versus admission.** The strict minimum rule penalizes summaries with three claims more than summaries with one. Report admission by claim count and claims per rendered body, separately from support. Never gate on these readings.
- **Exposure.** One failing claim withholds the whole topic. `filterProse` is unchanged and treats line-format prose as one unit, so one sole token empties the entry. Either effect can threaten the requirement of a nonempty aggregate on more than half of served goals.
- **Relations implied by adjacency.** Relations between rendered claims are unchecked. A claim that opens with a connective fails closed when judged alone.
- **Pronouns.** Isolation does not hurt the judge, which still sees the full sources. A reader still can't resolve a pronoun line once its antecedent line isn't rendered.
- **Unjudged `Ids:` line.** `collectIds` reads every source line, so the line might render a corrected-away id such as ESC-2291 from the Halvorsen correction. *Unresolved: inferred from reading the code, not observed at runtime.*
- **Calendar drift.** Relative-time claims can go stale as the date moves without any source change. Only the claim's date prefix anchors them.
- **Support cost.** Each support event becomes one request per claim. Endurance limits must use claim counts measured in development.
- **Weak supported control.** The supported control S3c is itself a semicolon fragment. Support and usefulness remain separate readings.

## Deviation record

This is how my evidence differs from what the brief expected:

- **Expected:** a structured shell read of the l8 packet. **Found:** the read-only shell call was rejected. **Done:** I read the packet directly with file reads instead.
- **Expected:** every context file the brief names. **Found:** I read `quality.md` only by section headings and did not read the dispatch skill. **Done:** the recovery brief forbids further reading. **Hypothesis:** neither file changes the mechanism contract.

This proposal carries no adoption verdict and no self-acceptance.