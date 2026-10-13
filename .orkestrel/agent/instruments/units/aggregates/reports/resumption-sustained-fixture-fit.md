# Sustained fixture admission diagnosis

The sustained protocol peer recognizes an obsolete support question and answers `No` to both production contextual support questions. The real refit mechanism correctly refuses those supplied scores. Repair the fixture request recognition; preserve the scoring mechanism, cutoff grid, and admission criterion.

## Decisive evidence

The saved run `tmp/units/aggregate-runtime-fixtures/proof-tnC0Ly/fitted/diagnosis.json:1` reports cutoff `0.51`, generated supported/scored occurrences `32`, admitted occurrences `0`, and reason `end-to-end admission below 0.5`. Every generated reading has `lexical: true` and score `0.0008198669828275761`.

The retained attempt at `tmp/units/aggregate-runtime-fixtures/proof-tnC0Ly/generated/attempts.jsonl:1` contains prose `The standing rule applies to this topic.`, no lexical failures, and completed focus and guard components with that low score. Its evidence includes the identical source sentence. Its component cache keys resolve to `tmp/units/aggregate-runtime-fixtures/proof-tnC0Ly/generation-cache/judge.jsonl:49` and `tmp/units/aggregate-runtime-fixtures/proof-tnC0Ly/generation-cache/judge.jsonl:50`. These cache rows preserve the actual current questions and low answers. Read-only inspection of the retained attempts found only that synthetic candidate prose.

The mismatch is at `.orkestrel/agent/instruments/harness/bench5/sustained/tests/Peer.ts:95`: the peer selects `Yes` for `Does the summary agree` or the policies classification phrase. Production `FOCUS_QUESTION` begins `Does every assertion expressed by focus.text`, and `AGREE_QUESTION` begins `Does the candidate contain only assertions supported by the evidence?` (`.orkestrel/agent/instruments/harness/bench5/aggregates/constants.ts:60` and `.orkestrel/agent/instruments/harness/bench5/aggregates/constants.ts:20`). Neither matches the obsolete phrase. The peer consequently returns `No`, with `No` logprob `-0.01` and `Yes` logprob `-8` (`.orkestrel/agent/instruments/harness/bench5/sustained/tests/Peer.ts:112`). The retained low scores are the resulting decoded answers, not missing responses or generation failures.

The production request builder renders the question as `Question: ${instructions}\n`, after a JSON state inside `<state>` (`.orkestrel/agent/instruments/harness/vendor/ollama/index.js:101`). `buildSupportPlan` places the complete candidate in every focus state and guard state (`.orkestrel/agent/instruments/harness/bench5/aggregates/helpers.ts:525`). `Support.evaluate` submits those questions through the real judge (`.orkestrel/agent/instruments/harness/bench5/aggregates/Support.ts:48`). `reduceSupport` validates exact membership and returns the minimum score (`.orkestrel/agent/instruments/harness/bench5/aggregates/helpers.ts:554`). `fitReadings` chooses a cutoff that rejects scored negatives and then requires generated admission of at least `0.5` (`.orkestrel/agent/instruments/harness/bench5/refit/helpers.ts:258`). This chain explains the saved refusal without changing production behavior.

## Exact bounded prescription

In `.orkestrel/agent/instruments/harness/bench5/sustained/tests/Peer.ts`, import `AGREE_QUESTION` and `FOCUS_QUESTION` from `../../aggregates/constants.js`. Replace the obsolete `prompt.includes('Does the summary agree')` operand with this operand:

```ts
((prompt.includes(`Question: ${FOCUS_QUESTION.instructions}\n`) ||
  prompt.includes(`Question: ${AGREE_QUESTION.instructions}\n`)) &&
  prompt.includes('\n "candidate": "The standing rule applies to this topic."'))
```

Retain the policies-classification operand, the binary/choice split, response probabilities, usage, transport fault branches, and chat response. The candidate field match is scoped to the JSON state emitted by the production builder. This is a finite scripted protocol case, not a semantic evaluator. Unknown candidates retain the fixture's existing `No` response.

Do not copy the matrix peer's unconditional support-question positive branch. The retained `generated/controls.jsonl` includes lexically valid unsupported and ambiguous candidates submitted through the same current support questions. Answering `Yes` for every support question would lift their scores too and cause `no cutoff rejects every scored negative and ambiguity`. The exact synthetic candidate restriction preserves those existing controls. It also preserves existing low responses to other archived candidates; this repair makes no claim about model quality or general semantic classification.

The affected fixture consumers are `runtime.test.ts`, `transport.test.ts`, `products.test.ts`, and `preparation.test.ts` under `bench5/sustained/tests`. The runtime, transport, and products proofs call `prepareRuntimeFixture`; preparation constructs `Peer` directly. References are `.orkestrel/agent/instruments/harness/bench5/sustained/tests/runtime.test.ts:23`, `.orkestrel/agent/instruments/harness/bench5/sustained/tests/transport.test.ts:20`, `.orkestrel/agent/instruments/harness/bench5/sustained/tests/products.test.ts:17`, and `.orkestrel/agent/instruments/harness/bench5/sustained/tests/preparation.test.ts:28`. No other fixture or production consumer needs this response change.

## Meaningful control and verification handoff

Add a bounded protocol proof under the sustained tests using the real production judge/request builder and loopback `Peer`. Submit both current question forms with the known synthetic candidate and assert a high `Yes` score for each. Keep the evidence unchanged, replace the candidate with `The standing rule does not apply to this topic.`, submit both forms again, and assert a low `Yes` score. Build focus spans with the real `buildSupportPlan`, not a substitute implementation. This control fails if the candidate restriction is removed and all support questions receive `Yes`; the positive cases fail if either current question is omitted. An obsolete question with the valid candidate must remain a negative protocol case.

The existing retained refit controls remain the end-to-end separation control: fresh generation and fitting must admit the synthetic generated population while rejecting every scored negative and ambiguity at the selected unchanged cutoff. Assert those properties from the emitted diagnosis rather than manufacturing a fit or altering labels. Preserve the runtime and transport fault controls already present.

The command that reached the failure was:

```text
node --test --test-concurrency=1 .orkestrel/agent/instruments/harness/.build/bench5/sustained/tests/runtime.test.js .orkestrel/agent/instruments/harness/.build/bench5/sustained/tests/transport.test.js
```

The saved successor verifier report records exit `1`, tests `2`, passed `0`, failed `2`, and duration `64,538 ms`; each proof reached `prepareRuntimeFixture` and observed refit exit `3` instead of `0`. Source repair requires a fresh build with the already established fixture resource argument before that command is rerun. The diagnosis unit ran neither build nor test and predicts no downstream pass beyond removal of the established recognition defect.

## Scope and custody

The supplied flush diff changes `matrix/helpers.ts`, `matrix/tests/capacity.test.ts`, `tests/development.test.ts`, and `tests/matrixFixture.ts`. It changes no sustained peer, contextual question, support reducer, or refit admission rule. `Peer.ts` was absent from the supplied dirty status. The mismatch is separate fixture drift exposed after the workload-resource prerequisite was repaired; there is no evidence requiring a change to the flush repair.

Only this report was written. No source, build, cache, saved evidence, or experiment criterion was changed. No tests, service calls, inference, or private evaluation oracle reads ran. The prescription is unimplemented and unaccepted; root retains the decision.
