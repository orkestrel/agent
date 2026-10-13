# Successful flush refusal

The l10 records run stopped on a successful, intentional one-token cache flush. Correct only the length-termination predicate in `readRequestOutcome`. Preserve Driver's validation of every sent development role. No agent package correction is involved.

The analyst read retained evidence and actual source. No source edit, test, build, service call, or git action ran. This report prescribes a repair; root retains acceptance.

## Reached cause

Request 3 is the production flush: `role: 'flush'`, `sent: true`, HTTP 200, `think: false`, `num_predict: 1`, `num_ctx: 3072`, and no advertised tools. Its response has a terminal `done: true` record with `done_reason: 'length'`, prompt usage 22, and completion usage 1. It has no error or truncation marker and records `failures: []`. See `.orkestrel/agent/instruments/results/l10/q2-think0/records/run/requests.jsonl:3`.

Driver constructs that provider with the one-token limit at `.orkestrel/agent/instruments/harness/bench5/Driver.ts:1442`. The selection interceptor invokes the actual flush at `.orkestrel/agent/instruments/harness/bench5/Driver.ts:1765`; `#flush` supplies its fixed prompt, no tools, and disabled thinking at `.orkestrel/agent/instruments/harness/bench5/Driver.ts:1816`.

`readRequestOutcome` accepts the transport, complete terminal response, and usage, but its final length predicate exempts only agent calibration. The valid flush therefore returns `refused` at `.orkestrel/agent/instruments/harness/bench5/matrix/helpers.ts:842`. Driver's development guard consumes that outcome at `.orkestrel/agent/instruments/harness/bench5/Driver.ts:1055` and sets `development integrity failure at request 3`. The first row retains that exact error, a partial result, and local followers through request 5 at `.orkestrel/agent/instruments/results/l10/q2-think0/records/run/rows.jsonl:1`.

The flush method catches the thrown error for logging, but the recorded Driver stop remains active. Removing that catch would not repair the false refusal. The retained row's `transport` category includes blocked follow-on work; it does not make the original successful flush a transport failure.

## Prescribed correction

In `.orkestrel/agent/instruments/harness/bench5/matrix/helpers.ts:842`, extend only the existing exception inside the `reading.reason === 'length'` predicate. Preserve the agent-calibration clause verbatim and admit this additional conjunction:

```ts
request.role === 'flush' &&
request.request.think === false &&
isRecord(options) &&
options.num_predict === 1 &&
reading.completion === 1
```

The existing `request.request` record narrowing and local `options` binding already supply the required values. Add no helper, dependency, public type, phase switch, or Driver role bypass. Require exactly one observed completion token; this prescription does not excuse zero-token or over-limit length termination.

Keep the exception inside the length condition. Earlier transport/JSON/completeness/usage checks must still return `fault`; the sibling truncation, resource-failure, and prompt-plus-completion checks must still return `refused`. A successful `stop`-terminated flush remains accepted. A decision request with `length` remains refused except for the existing intentional gauge-calibration case, whose capacity evidence remains mandatory.

The repair belongs in the shared reader because its consumers already ask the same outcome question: Driver's sustained guard at `.orkestrel/agent/instruments/harness/bench5/Driver.ts:1027`, development guard at `.orkestrel/agent/instruments/harness/bench5/Driver.ts:1055`, continuation checking at `.orkestrel/agent/instruments/harness/bench5/matrix/helpers.ts:950`, feasibility checking at `.orkestrel/agent/instruments/harness/bench5/matrix/helpers.ts:968`, and retained sustained-boundary checking at `.orkestrel/agent/instruments/harness/bench5/sustained/helpers.ts:71`. Restricting Driver's invocation would leave retained evidence classified differently and could admit malformed non-agent requests. The shared repair changes only the harmless flush length case; each consumer retains its additional role, custody, and limit checks.

## Fixture gap and required proof

The existing real Driver test exercises the production flush, but its protocol peer emits `length` only for a 512-token tool-bearing decision. It assigns one completion token to `num_predict: 1` while returning `stop`, so it never produces the reached flush response. Its transport and missing-usage controls explicitly exclude one-token requests. See `.orkestrel/agent/instruments/harness/bench5/tests/matrixFixture.ts:147`, `.orkestrel/agent/instruments/harness/bench5/tests/matrixFixture.ts:166`, and `.orkestrel/agent/instruments/harness/bench5/tests/development.test.ts:379`.

The writing unit needs these owned files:

- `.orkestrel/agent/instruments/harness/bench5/matrix/helpers.ts`: the bounded predicate correction.
- `.orkestrel/agent/instruments/harness/bench5/tests/matrixFixture.ts`: protocol responses targeting the actual flush request, distinguished from calibration by its fixed system message, empty user message, disabled thinking, absent tools, and one-token cap. Do not identify flushing by the cap alone because calibration also uses it.
- `.orkestrel/agent/instruments/harness/bench5/tests/development.test.ts`: real Driver positive and negative flush cases.
- `.orkestrel/agent/instruments/harness/bench5/matrix/tests/capacity.test.ts`: direct outcome boundaries beside the existing calibration exception test at line 239.

Drive the positive regression through the existing valid frozen development configuration and production `Driver.execute()` path. Have the peer return the retained flush response shape with `done: true`, `length`, and completion 1. Require nonempty retained sent flush evidence with that termination, a later sent decision for the same goal, and completion of the declared ordered goals. Existing parser-failed goals can remain under their separate policy. The existing all-arm execution can carry this response so records, aggregate, and full view retain their ordinary flush path. An assertion that only checks Driver exit or counts goals without requiring the length-terminated flush is insufficient.

Drive negative cases through the same production flush path, with calibration succeeding and only the identified flush altered. Cover HTTP failure, incomplete terminal response, missing usage, explicit truncation, completion beyond the requested cap, and prompt-plus-completion at the request context limit. Require a retained sent flush with the intended wire defect, Driver rejection, a failed/partial goal row, and no later sent decision for that goal. Do not count an earlier calibration rejection as a flush control. Preserve the existing decision transport/length/usage/capacity controls and the existing agent-calibration test.

In the direct reader cases, pin the exact retained successful request as `complete`; pin `stop` termination as `complete`; pin non-OK status, missing terminal completion, missing usage, and malformed JSON as `fault`; pin truncation, overflow, completion 0 or 2 with `length`, a changed generation cap, and thinking enabled with `length` as `refused`. Adjacent summarizer and judge length termination remain refused. An agent decision does not inherit the flush exception; use its valid request/capacity fixture to reach that check.

The load-bearing mutation removes only the added flush conjunction from the rebuilt reader. The named real Driver regression must then fail at the same flush integrity stop, with the sent length-terminated flush retained. A second discriminating mutation bypasses development outcome checks for `role === 'flush'`; the real Driver invalid-flush controls must fail because malformed flushes no longer stop the run. Keep imports, test discovery, and fixture routing valid in both controls.

Before repair, record the named regression's failing command and actual collected failure. After repair, run that command green, the touched outcome-boundary test, and the relevant emitted development/capacity population. The prior green suites are evidence of the fixture gap, not proof of this correction. Root owns build scheduling, independent controls, and the successor freeze; retained l10 artifacts remain unchanged.

No blocker. Relative live cache paths are a separate operator correction owned by root.
