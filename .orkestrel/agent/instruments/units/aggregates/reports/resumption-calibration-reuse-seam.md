# Diagnosis replay ruling

Prepare a prospectively fixed q2 generation on the final source, after the approved amendments and final freeze. Preserve the l9 strict refusal as historical evidence and report the successor separately. The existing diagnosis reader refuses l9 on amended source before deriving readings. Reusing the old diagnosis through that reader requires a historical-file resolver or an isolated exact historical filesystem; a matrix allowlist alone cannot make it pass.

## Observed refusal

The permitted offline observation called the canonical built `readRefitAssessment` exactly once, with the retained diagnosis's freshly measured file hash. The script disabled `fetch` before importing the built helper, and Node ran with filesystem-read permission only. It wrote no calibration output. See `tmp/units/aggregate-calibration-reuse-seam-observe.ts:1`.

The command was:

```text
node --permission --allow-fs-read=* tmp/units/aggregate-calibration-reuse-seam-observe.ts
```

The observed response identified diagnosis hash `063c4ed9917f4db61b1cb6cecb47863d32e813009e329e66f47c44c8cf0c5a37` and this exact refusal:

```text
custody mismatch: C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\harness\.build\build-manifest.json
```

The stack reached built `verifyFiles` at `.orkestrel/agent/instruments/harness/.build/bench5/refit/helpers.js:26`, called by `computeRefitAssessment` at `.orkestrel/agent/instruments/harness/.build/bench5/refit/helpers.js:352`, through `readRefitAssessment` at `.orkestrel/agent/instruments/harness/.build/bench5/refit/helpers.js:436`. The command tool reported exit 1. No second assessment call or substituted calibration occurred.

The deciding source is `.orkestrel/agent/instruments/harness/bench5/refit/helpers.ts:473`: `verifyFiles([...manifest.files, ...corpus.files, manifest.evidence, manifest.controls])`. The preceding preparation hashes, contract validation, cross-artifact bindings, and corpus validation were reached before this refusal. Subsequent evidence and label recomputation were not reached. The hash check itself is `.orkestrel/agent/instruments/harness/bench5/refit/helpers.ts:70`.

A separate read-only metadata/hash comparison recorded these bindings; it did not replay the diagnosis:

| File | Retained generation hash | Actual hash at observation |
| --- | --- | --- |
| `.build/build-manifest.json` | `76c3c9c4718f69dbb4cd76eb5f95e49c42b3bfe8924ad7ef89de8832db720734` | `51880a44f7f11e509e0c797e8b3321c6921c551fcc24ff26b2d1c0f97747da9b` |
| `bench5/Driver.ts` | `62393140ea587d9ab20ef808953804fe62aed2cdf2c61a1f940e242a16e0e77a` | `d03ae92dc7fdfc2e38b7d4073ae78e305fafffa0788fd543ec94b57f61a5d14d` |
| `bench5/refit/helpers.ts` | `7cd3464e69d4e2ca6267a6cbf82e98c728abac010f93ce2813a6be374d596891` | `7cd3464e69d4e2ca6267a6cbf82e98c728abac010f93ce2813a6be374d596891` |

The generation's direct file list binds the build manifest and Driver at `.orkestrel/agent/instruments/results/l9/calibration/q2/generation/manifest.json:387` and `.orkestrel/agent/instruments/results/l9/calibration/q2/generation/manifest.json:391`. `REFIT_IMPLEMENTATION` also includes both refit helpers and Driver: `.orkestrel/agent/instruments/harness/bench5/refit/constants.ts:16`. The first observed refusal is the build manifest; Driver is another measured byte mismatch, not a claimed later replay result.

## Ground readings without bypassing custody

`readRefitAssessment` does rederive readings from the bound generation, corpus, attempts, packet, evidence, and independent labels; it does not merely trust `diagnosis.readings`. After verifying those inputs, `computeRefitAssessment` invokes `collectReadings` and `fitReadings`, and the reader compares the complete recomputed assessment with the retained diagnosis. See `.orkestrel/agent/instruments/harness/bench5/refit/helpers.ts:488`, `.orkestrel/agent/instruments/harness/bench5/refit/helpers.ts:500`, `.orkestrel/agent/instruments/harness/bench5/refit/helpers.ts:566`, and `.orkestrel/agent/instruments/harness/bench5/refit/helpers.ts:587`.

The matrix development source allowlist does not override that reader. Its direct policy checks accept selected historical changes, but `readRefitAssessment` performs its own exact file checks. Calling it from a generalized `readDevelopment` therefore encounters the measured refusal. Keeping generation request semantics unchanged is relevant to scientific reuse; it does not establish the required byte custody. See `.orkestrel/agent/instruments/harness/bench5/matrix/helpers.ts:465` and `.orkestrel/agent/instruments/harness/bench5/refit/helpers.ts:473`.

The proposal to avoid refit edits while extracting identity deduplication from `fitReadings` is internally inconsistent. That extraction edits `refit/helpers.ts`, which is explicitly frozen and absent from the matrix historical-change allowlist. Behavior preservation cannot preserve its byte hash. See `tmp/units/aggregate-comparison-completion-direction-opus.md:53`, `tmp/units/aggregate-comparison-completion-direction-opus.md:54`, and `.orkestrel/agent/instruments/harness/bench5/refit/helpers.ts:281`.

If historical replay is required, its minimum honest interface must resolve each original `{path,hash}` identity to retained archived bytes without changing the original identity. It must verify those bytes against the original hash, preserve all evidence/label/control bindings and semantic replay checks, and identify the evaluator used for replay. A resolver must fail closed on absent or conflicting bytes and cannot substitute amended bytes for a historical hash. All relevant reads must use that resolution consistently; an allowlist that skips `verifyFiles` cannot suffice. The existing primitive accepts only a `RefitFile` and reads its literal path; neither `readRefitAssessment` nor `computeRefitAssessment` accepts a resolver. Implementing and proving that interface is a separate custody capability. This lane neither inventories historical snapshots nor claims they are available.

## Recommend final-source preparation

Fresh final-source preparation is materially narrower in implementation than historical replay: it uses the existing freeze/generate/blind-audit/fit operators and their unchanged exact checks. Before any successor inference, fix the final source, model/digest, sampler, source population, seed, independent-label procedure, strict fit rule, and any separately approved exploratory rule. Declare a single successor q2 generation, share it across decision-thinking settings, and retain its result regardless of acceptance. A failure ends that preparation attempt; it does not trigger another generation to seek a passing sample.

Retain and report l9's refusal, its source identity, the custody reason for successor preparation, and the successor's separate result and cost. Never replace the l9 diagnosis or present the successor as retroactive qualification of l9/l13. A prospectively fixed generation required by a changed frozen implementation is distinguishable from repeat-until-pass selection; identical seed-generation semantics do not excuse hiding either result. This recommendation establishes no expected quality or qualification outcome.

The fresh path requires no historical-replay amendment. The separately proposed exploratory policy still needs its own bounded admission implementation if strict qualification fails. No changes to that policy, the classifier, source, build, or HEAD were made by this lane.

## Correct the sustained selection condition

The proposal's control, “The exploratory tier is refused when any matrix strict fit is accepted,” is too broad. Matrix qualification is necessary for the qualified matrix pilot; sustained qualification additionally requires an accepted fit tied to the distinct endurance development runtime and classification, plus the required paired development evidence. An accepted matrix fit can therefore coexist with a refused sustained selection. See `tmp/units/aggregate-comparison-completion-direction-opus.md:94`, `.orkestrel/agent/instruments/harness/bench5/sustained/helpers.ts:293`, and `.orkestrel/agent/instruments/harness/bench5/sustained/helpers.ts:394`.

Replace that control with: refuse the exploratory tier when the bound qualified **sustained selection** is accepted, incomplete, or lacks valid ranked failure evidence; consider it only after a complete, validated, refused qualified sustained selection. This retains the proposal's stated bound-selection gate without blocking a matrix-qualified candidate whose own endurance fit failed. The existing selection reader requires the full ranked refusal population when selection is refused and independently validates endurance preparation failure custody. See `.orkestrel/agent/instruments/harness/bench5/sustained/helpers.ts:215`, `.orkestrel/agent/instruments/harness/bench5/sustained/helpers.ts:416`, and `.orkestrel/agent/instruments/harness/bench5/sustained/helpers.ts:438`.

Missing or operationally interrupted endurance evidence does not count as a completed refusal. This correction changes the selection predicate only; it does not change the workload, audit, held-out population, or adoption bar.
