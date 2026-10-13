# Sustained transport diagnosis

The reached failure is a production Driver stop defect, not a deficient fault fixture. The study guard stops the entire Driver on the first judge HTTP failure, before the existing JudgeCache retry loop can send its next attempt. Keep the expected retry count. Repair the study guard and its equivalent matrix-development guard; neither guard owns the judge retry budget.

## Retained request chain

The failing run is `tmp/units/aggregate-transport-fixtures/proof-p9MGiJ/development-1/aggregate/run`. Its request file supplies the following measurements; each sequence is also its JSONL line:

| Sequence | Role | Sent | HTTP | Prompt/completion | Result |
| --- | --- | --- | --- | --- | --- |
| 1 | agent | true | 200 | 110/1 | calibration completes |
| 2 | agent | true | 200 | 110/1 | calibration completes |
| 3 | summarizer | true | 200 | 349/10 | summary completes |
| 4 | judge | true | 500 | absent/absent | transport failure |
| 5 | judge | false | absent | absent/absent | `Error: e1 integrity/resource failure at request 4`; request is null |
| 6 | judge | false | absent | absent/absent | `Error: e1 integrity/resource failure at request 5`; request is null |

See `tmp/units/aggregate-transport-fixtures/proof-p9MGiJ/development-1/aggregate/run/requests.jsonl:4`, `tmp/units/aggregate-transport-fixtures/proof-p9MGiJ/development-1/aggregate/run/requests.jsonl:5`, and `tmp/units/aggregate-transport-fixtures/proof-p9MGiJ/development-1/aggregate/run/requests.jsonl:6`. Run metadata retains `sent: 4`, `status: "fault"`, and measured tokens 581; see `tmp/units/aggregate-transport-fixtures/proof-p9MGiJ/development-1/aggregate/run/run.json:90` and `tmp/units/aggregate-transport-fixtures/proof-p9MGiJ/development-1/aggregate/run/run.json:494`.

The fixture injects its HTTP failure only after receiving `/api/generate`, decrements its finite fault counter, and returns an error body with no invented usage. Its default status is 500. See `.orkestrel/agent/instruments/harness/bench5/sustained/tests/Peer.ts:18` and `.orkestrel/agent/instruments/harness/bench5/sustained/tests/Peer.ts:87`. The test sets the counter to 1 before this run. Its same-prompt filter excludes the null request bodies of the unsent retries, correctly producing actual 1 against expected 2. See `.orkestrel/agent/instruments/harness/bench5/sustained/tests/transport.test.ts:31` and `.orkestrel/agent/instruments/harness/bench5/sustained/tests/transport.test.ts:78`.

The raw log records the judge failing after its allowed attempts, followed by operational trajectory rejection and the `1 !== 2` assertion. See `tmp/units/aggregate-development-flush-verifier-4-positive-logs/sustained-transport.stdout.log:116`. The frozen configuration contains `retry: 2`; see `tmp/units/aggregate-transport-fixtures/proof-p9MGiJ/freeze/manifest.json:361`. No later exhaustion, filing, resource, pilot, or full-arm transport assertion ran after this first assertion failure. Their intended coverage is not a measured result of this run.

## Retry ownership and causal lines

Driver builds the real vendored Ollama judge and injects its private fetch boundary at `.orkestrel/agent/instruments/harness/bench5/Driver.ts:1204`. The vendored Ollama implementation imports the installed `AgentJudge` at `.orkestrel/agent/instruments/harness/vendor/ollama/index.js:1`. The installed implementation sends one HTTP call and throws `JudgeError("HTTP", ...)` for a non-OK response; it has no retry loop at that boundary. See `.orkestrel/agent/instruments/harness/node_modules/@orkestrel/agent/dist/src/core/index.js:3645` and `.orkestrel/agent/instruments/harness/node_modules/@orkestrel/agent/dist/src/core/index.js:3658`.

JudgeCache owns retries. Driver passes the unchanged settings retry count and an abort callback at `.orkestrel/agent/instruments/harness/bench5/Driver.ts:1302`. JudgeCache attempts `Math.max(0, retry) + 1`, propagates caller aborts, excludes deterministic errors, and retries other failures; exhaustion stores the fault, aborts the run, and throws. See `.orkestrel/agent/instruments/harness/bench5/JudgeCache.ts:136`, `.orkestrel/agent/instruments/harness/bench5/JudgeCache.ts:143`, and `.orkestrel/agent/instruments/harness/bench5/JudgeCache.ts:175`.

The study integrity predicate defeats that owner. HTTP 500 produces `readRequestOutcome(...) === 'fault'`; Driver assigns `#stopped` at `.orkestrel/agent/instruments/harness/bench5/Driver.ts:1023`. The next call throws that stop at line 924, before reading the request body at line 939 or setting `sent` at line 941. Its finally block overwrites the stop with the blocked attempt's sequence. This explains both null request bodies and the changing error suffix without hypothesizing another network failure.

The generic development qualification predicate has the same defect independently. At `.orkestrel/agent/instruments/harness/bench5/Driver.ts:1050`, a sent noncomplete judge response under `execution.phase === 'development'` sets `#stopped` and throws a qualification error. It would block the next JudgeCache attempt even if the study guard were repaired. However, it did not cause this retained run: sustained commands pass `--study` at `.orkestrel/agent/instruments/harness/bench5/sustained/Sustained.ts:278`, while `parseFlags` keeps `study` and matrix `execution` separate at `.orkestrel/agent/instruments/harness/bench5/Driver.ts:478`.

The l11 brief calls matrix/bench development through execution manifests, so it reaches the generic development guard. A study-only edit would leave that path defective. See `tmp/units/aggregate-l11-development-live-brief.md:23` and `.orkestrel/agent/instruments/harness/bench5/Driver.ts:809`. This is a dependency finding, not evidence that l11 has encountered a judge failure; l11 remains unexecuted.

## Exact correction

Within `Driver.#fetch`, derive a local boolean after the request evidence exists. The exception is a sent judge transport failure, not every judge fault:

```ts
const transport =
	role === 'judge' &&
	sent &&
	(error !== undefined ||
		(status !== undefined && (status < 200 || status >= 300)))
```

At the study stop predicate, replace only the noncomplete-outcome term with:

```ts
(!transport &&
	readRequestOutcome(evidence, budget, this.#config.frozen) !== 'complete')
```

Keep `!sent`, token-limit, and wall-limit terms outside that exception. Keep the pre-send call/token/wall checks and abort signal untouched. The HTTP failure or thrown transport error must still reach AgentJudge and JudgeCache normally.

At the generic development predicate, add `!transport` inside the development branch:

```ts
(this.#config.execution?.phase === 'development' &&
	!transport &&
	readRequestOutcome({ ...evidence, failures }, budget, this.#config.frozen) !==
		'complete')
```

Keep the independent agent failure branch unchanged. Keep all raw recording, `#invalid`, usage accounting, qualification of successful but malformed responses, completed resource refusals, and unsent rejection unchanged. In particular, do not use `role !== 'judge'` alone: that would exempt successful judge responses with missing usage, malformed bodies, length exhaustion, or resource overflow. Do not alter JudgeCache, installed or vendored bytes, frozen settings, the retry count, or classification readers. No additional retry counter or request-operation join is needed.

This prescription permits the existing owner to use its frozen retries after actual sent transport failure. It does not retry a trajectory, grant a fresh resource budget, or rehabilitate its missing usage. The expected repaired transport sequence for the retained case is the original HTTP 500 followed by a sent HTTP 200 for the same prompt. Exhaustion remains bounded at the frozen retry count plus the original attempt. These repaired outcomes are predictions requiring the prescribed regression; this diagnosis executed no tests.

## Operational classification

The retained classification is correct. `readRequestOutcome` returns `fault` before interpreting capacity wording for non-2xx, unsent, or errored requests; see `.orkestrel/agent/instruments/harness/bench5/matrix/helpers.ts:775`. `readSustainedBoundary` records transport faults as errors at `.orkestrel/agent/instruments/harness/bench5/sustained/helpers.ts:71`. The raw null request bodies also explain its model-role errors at line 87. Those secondary errors disappear when actual retries send; the original HTTP failure remains an operational error.

After transient recovery, a Driver trajectory may finish with status `complete`, but the parser retains the failed request and returns operational errors as failures. See `.orkestrel/agent/instruments/harness/bench5/sustained/parsers.ts:345`. Sustained writes the rejected attempt and throws the operational trajectory error before admitting a candidate; see `.orkestrel/agent/instruments/harness/bench5/sustained/Sustained.ts:310`. The transport test explicitly requires this distinction, missing-usage cost retention, rejection of historical infeasibility laundering, and HTTP failure precedence over an injected capacity label. Keep those assertions. This matches `.orkestrel/agent/instruments/units/aggregates/endurance-commands.md:32`.

## Direct regression and mutation control

Use the existing real Driver, JudgeCache, vendored judge, installed AgentJudge, and loopback fixture. An isolated JudgeCache test cannot detect this defect because it never reaches Driver's stop predicate. The existing JudgeCache retry assertions at `.orkestrel/agent/instruments/harness/bench5/tests/JudgeCache.test.ts:220` and `.orkestrel/agent/instruments/harness/bench5/tests/JudgeCache.test.ts:242` establish the owner's contract but are not a substitute.

For the cheapest study-bound proof, extend the existing filing segment of `sustained/tests/transport.test.ts` and place it before the long trajectory segment after prerequisites. Filing reaches the same study fetch guard without serving the continuous work horizon. Use fresh output/cache custody for a transient failure and for exhaustion. Assert same-prompt sent attempts equal 2 for a single injected failure and `retry + 1` for exhaustion; assert the recovered reply is HTTP 200, every attempted transport request retained by that grouping is sent, and failed-request missing usage remains charged. Keep filing operational rejection and absence of an admissible candidate. This uses the existing fixture and counters; it needs no harness infrastructure.

For the matrix-development guard, add a focused real Driver case to the existing development proof using its frozen policy and fresh execution/output/cache. Extend only MatrixPeer's `/api/generate` branch with a finite judge-fault countdown, matching the existing Peer transport behavior. Its existing `fault` flag applies to agent requests and cannot prove this branch; see `.orkestrel/agent/instruments/harness/bench5/tests/matrixFixture.ts:93` and `.orkestrel/agent/instruments/harness/bench5/tests/matrixFixture.ts:173`. Drive an uncached judge question in the aggregate arm. Assert the same transient and exhaustion wire counts, operational invalidity, missing usage, and no extra retry. Keep the completed agent/flush rejection cases in the development file unchanged.

The study mutation removes `!transport &&` from the study noncomplete-outcome term. The direct filing assertion `same.filter(request => request.sent).length === 2` must fail with actual 1. Restore exact source bytes and rebuild. The development mutation removes `!transport &&` only from the development qualification branch; the equivalent direct development assertion must fail with actual 1. Mutating each branch separately proves that both are reached; a combined mutation could conceal an untested branch.

Preservation controls must reach sent judge responses with HTTP 200 but missing usage or a completed resource refusal and confirm the next request cannot send. The existing isolated refusal proof supplies these cases. Keep a study case whose remaining call budget cannot accommodate a retry, with the server still willing to answer; assert the next attempt is unsent and sent calls never exceed the limit. Keep token/wall conditions outside the exception and check their unchanged placement during independent review. If a test fixture cannot produce the requested transport or completed-response control through its public fields, stop and scope that fixture-only change rather than replacing Driver behavior with a fake.

## Affected population and necessary validation

The recommended production edit owns only `bench5/Driver.ts`. Its changed branches govern sustained filing/development/evaluation and matrix development; other matrix phases do not execute the development branch. Direct consumers are `bench5/sustained/Sustained.ts`, `bench5/bench.ts`, and the existing Driver-based development proof. The unchanged retry owner is `bench5/JudgeCache.ts`; the unchanged classification consumers are `bench5/sustained/helpers.ts`, `bench5/sustained/parsers.ts`, `bench5/matrix/helpers.ts`, and their callers. No production parser, fixture workload, private oracle, or library source change is prescribed.

The test edit population is `bench5/sustained/tests/transport.test.ts`, `bench5/tests/development.test.ts`, and the small judge-fault field/branch in `bench5/tests/matrixFixture.ts`. Preserve `Peer.ts`, its accepted direct proofs, and the frozen runtime fixture. All paths in this paragraph resolve below `.orkestrel/agent/instruments/harness/`.

Run the following bounded validation after implementation:

1. Build the harness with its declared compiler/types and existing fixture resource binding; run scoped static checks for the touched files.
2. Run each focused Driver regression red on the original branch, green on the repair, then its individual deliberate-break control red at the prescribed assertion. Restore source byte-exactly and rebuild between controls.
3. Run the complete `sustained/tests/transport.test.js` and `tests/development.test.js` emitted files. The former completes the previously unreached exhaustion, classification, resource, pilot, full, and accounting assertions; the latter protects the l11 parser-continuation and flush boundaries.
4. Re-run the isolated `sustained/tests/refusal.test.js` because its successful judge missing-usage and measured-refusal behavior is directly adjacent to the changed study stop predicate. This is a changed load-bearing dependency, unlike the earlier fixture-only edits.
5. Keep the accepted broad `sustained/tests/runtime.test.js` measurement. Do not repeat its 491485 ms continuous-history proof for a condition changed only on sent judge transport failures when the focused study proof covers the changed path and the refusal proof covers its exclusion boundary. Keep direct `Peer.test.js` and its accepted mutation controls; Peer is unchanged. Capacity helper tests, JudgeCache tests, and independent products/preparation results need no repetition solely for this Driver change because their tested implementations are unchanged; if implementation expands their dependencies, update this ruling before execution.
6. Obtain independent review of both exception placements, classification retention, and frozen limit preservation. Then produce the canonical build and its manifest for the l11 freeze; do not reuse pre-edit build custody.

The accepted runtime measurement remains evidence for its original hash. The post-repair build still needs the focused changed-path evidence described here; this report does not claim the pre-edit runtime measurement executed the repaired source.

## Scope and custody

Read-only diagnosis completed. Source, build, fixtures, private oracle bytes, daemon, and Git index were untouched. No model calls, installs, test runs, or sustained runtime reruns occurred. The only write is this report. Direct source diff inspection found no pending Driver or transport-test edit; the relevant pending matrix helper edit is the already-studied one-token flush exception and does not change HTTP 500 classification. The user-owned bench4 change was not opened. The unit used the dispatch skill as the campaign procedure and performed the work without delegation.
