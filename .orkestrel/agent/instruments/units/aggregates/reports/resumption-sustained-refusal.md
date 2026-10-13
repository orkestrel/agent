# Sustained refusal fixture diagnosis

The ranked-infeasibility fixture supplies an operational fault, not a measured resource refusal. Keep production classification unchanged. Give the peer a separate complete-response boundary case, and preserve missing usage as a negative operational control.

## Actual reached evidence

The failed run is `tmp/units/aggregate-runtime-fixtures/proof-PAAe09/infeasible/q4/filing`. Its `tmp/units/aggregate-runtime-fixtures/proof-PAAe09/infeasible/q4/filing/run/requests.jsonl:1` records the only sent request: role `judge`, HTTP `200`, model `hf.co/sky7350/Mica-v0.1-4B:Q4_K_M`, request options `num_ctx: 4096`, `num_predict: 1`, and a completed `stop` response with a valid answer/logprobs but neither usage count. The model matches the frozen judge in `tmp/units/aggregate-runtime-fixtures/proof-PAAe09/freeze/manifest.json`. Requests at `tmp/units/aggregate-runtime-fixtures/proof-PAAe09/infeasible/q4/filing/run/requests.jsonl:2` through the last row are unsent, have `request: null`, and carry the preceding stop error. They are not wrong-model wire requests.

The source causes that evidence directly: `.orkestrel/agent/instruments/harness/bench5/sustained/tests/runtime.test.ts:487` sets `peer.filingFailure = true`; `.orkestrel/agent/instruments/harness/bench5/sustained/tests/Peer.ts:111` removes `prompt_eval_count` and `eval_count` when that flag is true. The runtime then expects filing exit `3` for each ranked configuration.

`readRequestOutcome` returns `fault` when completed raw usage is absent (`.orkestrel/agent/instruments/harness/bench5/matrix/helpers.ts:795`). The non-agent `listResourceFailures` branch returns no explicit capacity failure for this HTTP-200 judge response (`.orkestrel/agent/instruments/harness/bench5/matrix/helpers.ts:702`); its empty `failures` field does not turn absent usage into a successful or measured response. The Driver records the wire response and stops subsequent requests because the outcome is not complete (`.orkestrel/agent/instruments/harness/bench5/Driver.ts:1023`). Blocked requests never reach body decoding and are retained as `request: null` (`.orkestrel/agent/instruments/harness/bench5/Driver.ts:923` and `.orkestrel/agent/instruments/harness/bench5/Driver.ts:1004`).

`readSustainedBoundary` skips unsent followers only after a measured failure or an exhausted whole-trajectory limit (`.orkestrel/agent/instruments/harness/bench5/sustained/helpers.ts:65`). Neither condition holds for the first missing-usage response. The later null requests therefore produce additional fault messages and fail the model-object check at `.orkestrel/agent/instruments/harness/bench5/sustained/helpers.ts:87`. These model-role messages are downstream consequences of the operational stop, not a distinct model-binding defect. Do not change model identities or weaken the null-request validation.

The saved classification at `tmp/units/aggregate-runtime-fixtures/proof-PAAe09/infeasible/q4/filing/classification.json:1` preserves those errors and `run ended without measured resource refusal`. Filing writes that classification and throws for any boundary error (`.orkestrel/agent/instruments/harness/bench5/sustained/Sustained.ts:368`), producing exit `1`. `readPreparationFailure` independently rejects the same operational evidence as configuration infeasibility (`.orkestrel/agent/instruments/harness/bench5/sustained/helpers.ts:197`).

The verifier command was:

```text
node --test --test-concurrency=1 .orkestrel/agent/instruments/harness/.build/bench5/sustained/tests/runtime.test.js
```

The saved verifier report records exit `1`, passed `0`, failed `1`, and `504,813 ms`. Its stdout at `tmp/units/aggregate-development-flush-verifier-3-logs/positive-sustained-runtime.stdout.log:326` retains the operational explanation; the assertion at line 349 is `1 !== 3`. The preceding contextual-support repair passed its direct test and let this runtime proof progress to the later branch.

## Exact fixture correction

Add `boundary = false` to `Peer`. Keep `filingFailure` and its missing-usage behavior intact. Within the existing non-missing `/api/generate` response usage object, replace fixed `prompt_eval_count: 50` with:

```ts
prompt_eval_count:
  this.boundary && isRecord(body.options)
    ? Number(body.options.num_ctx) - 1
    : 50,
eval_count: 1,
```

Replace the ranked-infeasibility block's `peer.filingFailure = true` with `peer.boundary = true`. Preserve the HTTP status, `done: true`, `done_reason: 'stop'`, answer/logprobs, requested model, and all fault controls. For the actual request this retains prompt usage `4095` and completion usage `1` against context `4096`.

This uses the existing measured protocol: after complete usage passes validation, `readRequestOutcome` returns `refused` when prompt plus completion reaches the request's context (`.orkestrel/agent/instruments/harness/bench5/matrix/helpers.ts:854`). The sustained boundary adds `completed response violates resource or usage bounds`, then skips unsent followers after that measured refusal. A nonempty boundary failure with no boundary errors permits filing exit `3` and preparation ranking. This is a source-derived prediction requiring the direct proof; no reproduction ran in this analyst lane.

Do not change the missing-usage response to exit `3`, invent a resource failure string, alter the frozen context, manufacture a refused manifest, or waive the model-role checks. HTTP faults and missing usage must remain operational.

## Complete bounded population

The `filingFailure` search across sustained tests finds its declaration and response use in `Peer.ts` and its sole consumer in `.orkestrel/agent/instruments/harness/bench5/sustained/tests/runtime.test.ts:487`. The affected ranked branch covers `q4`, `g4`, `q2`, and `g2`, refused filing, candidate creation, exact ranked selection, and the inconclusive preparation report. Its borrowed-resource assertion also depends on the branch's generated `g4` resource.

The related controls remain in scope for preservation: `transport.test.ts` retains HTTP judge faults, blocked retries, operational filing rejection, and refusal to rank operational development or matrix preparation (`.orkestrel/agent/instruments/harness/bench5/sustained/tests/transport.test.ts:93` and `.orkestrel/agent/instruments/harness/bench5/sustained/tests/transport.test.ts:136`); `products.test.ts` retains the legitimate whole-trajectory call-limit refusal with an empty product suffix and no operational errors (`.orkestrel/agent/instruments/harness/bench5/sustained/tests/products.test.ts:85`); `runtime.test.ts` retains wall/call limits, truncated responses, and missing late usage. `preparation.test.ts` has no `filingFailure` use or equivalent missing-usage-as-resource expectation. `Peer.test.ts` must retain the accepted contextual-question controls.

Only the peer, the ranked runtime block or its extracted test, and the direct protocol proof need changes. No production file needs a correction for this reached case.

## Cheap proof before the long population

Extend `Peer.test.ts` with a real loopback generate exchange and pass its exact body/status/raw response to the real `readRequestOutcome` as a judge request. Use the production prompt builder or real judge, retain the actual response, and use the existing matrix request/budget types and helpers. Assert these cases:

- Default peer: complete response, present integer usage, outcome `complete`.
- `boundary = true`: complete response, prompt plus completion exactly equal to the requested context, outcome `refused`.
- `boundary = false`, `filingFailure = true`: completed HTTP-200 response without usage, outcome `fault`.

The resource control fails if the boundary assignment is disabled. The operational control fails if missing usage is relabeled as measured refusal. Reuse the real boundary reader for a retained sequence with the refused sent request followed by a stopped unsent request; it must have a measured failure and no model-role error. The analogous missing-usage sequence must retain operational errors.

Then isolate the real filing/ranking path from the expensive trajectory. Move the contiguous runtime block from `peer.filingFailure = true` through the inconclusive-report assertion into `sustained/tests/refusal.test.ts`. Create only its own scratch directory, empty seed, deployment fixture, loopback peers, and real freeze/resource prerequisites. Freeze and resource-check every ranked key, including `q4`; do not call `prepareRuntimeFixture`, generate summaries, fit, run continuous development/evaluation, or read an oracle for this proof. Keep all candidate/select/report assertions and exact ordering. Move the borrowed-resource assertion with the block, using the authentic `q4` filing execution as its baseline and the authentic `g4` resource as the wrong binding; assert the unaltered baseline parses before making the substitution. This preserves the exact foreign-resource rejection property without depending on a completed evaluation trajectory.

For each retained filing, assert exit `3`, a nonempty boundary failure, empty boundary errors, exact sent model identity, complete raw usage, and no sent follower after refusal. Assert `readPreparationFailure` accepts that actual classification. Before ranking, use a fresh `q4` filing output with `boundary = false` and `filingFailure = true`; assert exit `1` and `readPreparationFailure` rejection. Reset `filingFailure` before measured-refusal cases. Keep the existing candidate, selection, and report exits and report-preparation coverage assertions. Leave the later no-live-evaluation control and trajectory proof artifact in `runtime.test.ts`.

After the authorized resource-bound rebuild, the cheap commands are:

```text
node --test .orkestrel/agent/instruments/harness/.build/bench5/sustained/tests/Peer.test.js
node --test .orkestrel/agent/instruments/harness/.build/bench5/sustained/tests/refusal.test.js
```

Only after those pass, run the existing sustained consumer population. This is a proposed verification order, not a passed result.

## Attribution and work performed

The supplied Peer correction diff changes only current support-question recognition and adds its direct proof. It leaves `filingFailure` and the usage omission unchanged. The supplied status does not list `runtime.test.ts` as modified. The flush diff changes no sustained filing expectation. The late branch is a preexisting fixture mismatch exposed by progressing past the preceding prerequisite failures.

This lane read retained local protocol evidence and exact reached source, wrote only this report, and ran no test, build, inference, model/service call, or private oracle read. Root retains implementation and acceptance decisions.
