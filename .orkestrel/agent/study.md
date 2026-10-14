# Optional agent studies

Use **study** for the optional comparison surface. A study asks a declared question about agent behavior, executes comparable trials, and retains the evidence behind its report. The memory study compares records, compaction, and full history under realistic continuing work.

This is a proposal dated 2026-10-14. It changes no command, exported API, frozen harness, or evidence path.

## Name and ownership

`study` is short common English and covers both the experiment and its interpretation. `trial` remains one attempt. `scenario` defines the work. `report` presents the readings. `bench` already names Vitest performance measurements and orchestration transport checks; `probe` names a temporary diagnostic. `assay` is less familiar, and `eval` abbreviates a concept that the public surface can name directly. The local guide and package inventory found no competing `study` owner; this is not a registry availability claim.

Start with a development command in the agent checkout and a durable harness in the scaffold checkout. This follows the earlier preservation proposal's ownership boundary while replacing its overloaded `bench` namespace. Do not add a runtime dependency, published executable, or general evaluation package to establish this first consumer. A downstream distribution can follow an actual downstream use case.

The proposed command vocabulary is:

```text
npm run study -- check memory
npm run study -- execute memory --profile local
npm run study -- report <trial-set>
```

`check` validates fixtures, resets, references, controls, configuration, and capacity prerequisites without paid generation. `execute` explicitly starts the frozen, bounded comparison and its declared grading. `report` reads retained evidence; it makes no model calls. A separate grading operation is justified when a changed rubric needs offline re-scoring. Every paid invocation prints its model population, repetition, and enforced limits before execution; it does not require an interactive approval prompt.

The proposed durable scaffold layout keeps reusable scenarios separate from immutable observations:

```text
studies/agent/
  memory/study.json
  scenarios/
  instruments/
  results/<id>/manifest.json
  results/<id>/trials/
  results/<id>/report.json
  results/<id>/report.md
```

Scenario truth and grader keys belong in separately controlled private storage, outside agent-visible inputs and published package files. Execution resolves that storage through explicit configuration. Generated build and dependencies remain ignored. Retain compact reports and manifests in durable custody; retain large raw trials in ignored or external artifact storage with recorded digests. A study declares its scenario set, strategies, model profiles, limits, repetitions, and grader version. A trial records one strategy's complete trajectory against one scenario from a clean initial state. An internal series schedules those trials; it does not need another public synonym for the study.

The historical harness binds absolute paths and a vendored subject. Preserve that lineage intact. After the capacity comparison closes, promotion must separate historical replay from a study of the installed package. The latter freezes the actual package build hash through an explicit subject seam; changing the directory name cannot establish that the installed release was tested.

## What the memory study measures

Keep facts, completed work, obligations, critical violations, coverage, and cost as separate readings. Add direct state assertions wherever a scenario exposes state. A response that claims a refund is complete does not prove a refund exists. Final state also misses some forbidden intermediate actions, so retain trace predicates for approvals, scope, and ordering. These distinctions follow the outcome/trajectory separation in [Anthropic's agent evaluation guidance](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) and the policy limitations of [tau-bench](https://arxiv.org/abs/2406.12045).

Use continuing workflows as the distinguishing subject: corrected customer facts, obligations that survive a shift, changed permissions, delayed evidence, unresolved dependencies, abstention, interruptions, and recovery. Reset the world between independent trials and strategies, while preserving each strategy's intended memory within its trajectory. Keep the external event schedule fixed for the primary memory comparison. An adaptive simulated customer introduces another model and another source of variation; add that only for a question about interaction.

Pair strategies on the same initial world, events, tools, model, and declared resource envelope. Charge every role, including memory filing, summarization, simulated users, and grading. Report their usage separately and in total. Equal physical context and output limits are a controlled resource envelope; they do not imply equal actual compute. A cost-matched comparison answers a different question and requires its own frozen design.

Distinguish a strategy's capacity limit from a provider outage, invalid fixture, or grader failure. An overflow remains evidence that the strategy cannot serve that workload under the declared profile. A broken environment invalidates that trial. Show every launched attempt and scoring coverage, including unserved work; a score conditioned on served products must expose that denominator. [Inspect's scoring policy](https://inspect.aisi.org.uk/scoring-policy.html) is a useful implementation reference for separating errors and unscored samples.

The existing 96-goal trajectory is one dependent sequence. Its goals are not 96 independent reliability trials. Report the observed comparison descriptively, then repeat independent trajectories or scenario instances when the product decision requires repeatability. Choose repetition from pilot variation, required precision, and the paid budget. Report success on every repeated attempt separately from success in at least one attempt; [tau-bench](https://arxiv.org/abs/2406.12045) motivates that distinction. Do not derive a confidence claim from one sequence.

## Validate the measurement

Run a no-action control and a known-correct reference against each scenario. The no-action control exposes goals whose required final state already holds; the reference exposes impossible tasks or defective graders. Refusal and abstention can legitimately require no action, so check their evidence and explanation rather than demanding that every no-action trial fail. Deliberately wrong results must fail the relevant predicate. Keep positive and negative semantic controls, blind strategy labels, and human-reviewed judge calibration. [The ABC benchmark audit](https://arxiv.org/abs/2507.02825) provides direct evidence that task and outcome validity need independent checks.

Use exact code checks for state and trace facts. Reserve model judges for meaning that a deterministic check cannot settle. Freeze the rubric before the held-out comparison, preserve judge outputs and disagreements, and sample them against human judgments. Re-scoring retained products creates a separate report version; it does not overwrite the first verdict or buy another agent trajectory. Qualify capacity on public development fixtures before spending the held-out series budget.

The supplied article is useful as a design prompt. Its reported experiment and several compressed literature statistics need qualification; the research reports retain those corrections. No reviewed source directly establishes which of records, compaction, and full history performs best on this package's continuing business workflow. That question belongs to the study itself.

See [the supplied-article review](study-article.md), [the independent methods matrix](study-methods.md), and [the repository naming and ownership map](study-canon.md) for the evidence and source limitations. The user selected Luna at max effort for these parallel research lanes; root reconciled the proposal.

## Adoption order

Finish the bounded capacity comparison and its blind report. Preserve its source/build/configuration lineage. Then promote the durable study surface, bind the installed package explicitly, and retain the existing workload as the first memory scenario. Add observable state checks and reference/null controls before widening the scenario set. Add repeated trials when a decision needs evidence about consistency. Keep the optional paid study outside the ordinary deterministic test gate.
