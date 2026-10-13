# L12 maintenance direction: subjective planner report

## Finding

The refused summary request did not end the run by itself. A Driver latch that covers the whole trajectory did. It turned one topic's local refusal into a refusal of every later request.

1. Request 46 (summarizer role, `num_predict` 160, `done_reason=length`) is classified as `refused`. For a non-agent role, `listResourceFailures` returns `[]` unless there is a transport fault (`.orkestrel/agent/instruments/harness/bench5/matrix/helpers.ts:702`). The `length` reason then makes `readRequestOutcome` return `refused` (`.orkestrel/agent/instruments/harness/bench5/matrix/helpers.ts:841-866`). It is not a `fault`.
2. In the development phase, any sent request whose outcome is not `complete` sets `#stopped` and throws `development integrity failure at request N` (`.orkestrel/agent/instruments/harness/bench5/Driver.ts:1055-1071`). That check has no role scope.
3. The Aggregator already keeps the refusal local. The error escapes `#build` before a `build` row or a version-counter bump (`.orkestrel/agent/instruments/harness/bench5/aggregates/Aggregator.ts:428-431`). `#update`'s catch then deletes the version, withholds the topic, and writes a `fail` row (`.orkestrel/agent/instruments/harness/bench5/aggregates/Aggregator.ts:331-346`). The error log's first line is that local path: `aggregate owner:LH-20418 at g03-grace-escalation` (`tmp/units/aggregate-l12-development-live-aggregate.err:1`).
4. The latch is what spread the failure. Every later request throws `#stopped` before it is sent (`.orkestrel/agent/instruments/harness/bench5/Driver.ts:924`). That produced the three unsent judge followers, 47 to 49. `JudgeCache` reported `harness fault: the judge failed 3 times` and aborted the rig (`.orkestrel/agent/instruments/harness/bench5/JudgeCache.ts:175-183`). The Driver then threw on `rig.cache.fault` before writing a g03 row (`.orkestrel/agent/instruments/harness/bench5/Driver.ts:1890`), and `maintain`'s outer catch invalidated every topic (`.orkestrel/agent/instruments/harness/bench5/aggregates/Aggregator.ts:150-193`).
5. No truncated content was injected or cached in l12. The provider rejected, so `Summarizer.summarize` appended no row (`.orkestrel/agent/instruments/harness/bench5/Summarizer.ts:52-70`).
6. A related gap exists outside the development phase. `ProviderResult` carries no finish reason (`.orkestrel/agent/instruments/harness/vendor/agent-0.0.30-trimmed/index.d.ts:6243-6251`), so `Summarizer` caches whatever `content` it receives. Outside development, `.orkestrel/agent/instruments/harness/bench5/Driver.ts:1059` throws nothing for a summarizer `length` response. Truncated prose would then reach `#check` and AGREE, and could be rendered if it passes.

Classification of the three causes:

- **Implementation defect.** The development latch at `.orkestrel/agent/instruments/harness/bench5/Driver.ts:1055-1069` contradicts `.orkestrel/agent/instruments/units/aggregates/matrix.md:15-17`. That contract says a failed maintenance step invalidates the old usable state, withholds the topic, and emits a machine-readable outcome. The missing refusal outside development (item 6) is part of the same defect.
- **Resource outcome.** The 160-token cap was hit on a real generation. That is a measured fact and stays recorded as it is.
- **Policy change.** Raising 160 would be one. None is proposed for the immediate path.

## Recommended immediate path

Make a summarizer `refused` outcome a refusal of that one request in every frozen run, and keep all other latches as they are:

- In `Driver.#fetch`'s `finally`, handle the case `role === 'summarizer' && sent && this.#config.frozen !== undefined && readRequestOutcome(...) === 'refused'`.
- For that case, keep the evidence and record writes (`.orkestrel/agent/instruments/harness/bench5/Driver.ts:1038-1054`), never set `#stopped`, and throw an error after `finally`, the same way `qualification` is thrown at `.orkestrel/agent/instruments/harness/bench5/Driver.ts:1071`. Use a message such as `summary refused at request N: length`, with the prefix as a constant in `bench5/constants.ts`.
- Exclude only this case from the development latch condition. A summarizer `fault` (HTTP error, missing usage, `done:false`) still latches.

With that change, the existing lifecycle does the rest:

- **Withheld topic.** The topic is withheld for this read point and a `fail` row is written (`.orkestrel/agent/instruments/harness/bench5/aggregates/Aggregator.ts:331-346`). The row's `withheld` field reports it (`.orkestrel/agent/instruments/harness/bench5/Driver.ts:1934`).
- **Retries.** No retry is spent: the `retry` count of 2 governs check and AGREE failures only, and the refusal escapes the loop at `.orkestrel/agent/instruments/harness/bench5/aggregates/Aggregator.ts:423-428`.
- **Prior versions.** A summary build happens only when the topic's sources changed or it has no version yet, so deleting the prior version is correct. An unchanged topic keeps its version through `#keep` and never calls the summarizer.
- **Later decisions.** These are unaffected. `#invalid`, `row.resource`, and the judge state never see the refusal, because summarizer failures are `[]`.
- **Cost accounting.** This stays complete: `requests.jsonl` keeps the refused request with its usage.

Rejected alternatives:

- **Separately frozen larger summary output (for example 320).** This changes `frozen.summarizer.sampler`. Both `.orkestrel/agent/instruments/harness/bench5/matrix/parsers.ts:119-125` and the development identity gate (`tmp/units/aggregate-matrix-next-commands-report.md:38`) bind that sampler. The l9 generation would therefore stop qualifying the q2 successor, and the policy would have to be regenerated. It also does not fix the defect: owner topics copy source clauses, keep gaining sources over the trajectory, and will hit any fixed cap. Keep it as a possible later amendment if measured coverage turns out too low.
- **Preserving the failed configuration and rerunning.** The prompt and frozen sampler are identical, the cache has no row, and the latch is unchanged. The run would stop at g03 again and give no trajectory.

## Bounded work unit

This is a **medium** change: it alters how a protocol outcome is classified. It needs one review pass on the condition.

**Production files**

- `bench5/Driver.ts`: the `finally` and throw block at about lines 1055-1071.
- `bench5/constants.ts`: the message prefix.

**Test files**

- `bench5/tests/matrixFixture.ts`: add a `summary` control to `MatrixPeer`. For the Nth request with `num_predict === 160`, it returns `done:true`, `done_reason:'length'`, `eval_count:160`, and a cut-off copied clause, alongside the existing switch at `.orkestrel/agent/instruments/harness/bench5/tests/matrixFixture.ts:205-219`.
- `bench5/tests/development.test.ts`: add one case beside the flush controls at `.orkestrel/agent/instruments/harness/bench5/tests/development.test.ts:764-795`.

**Contract made false:** only the implicit rule that a summarizer `length` response stops a development trajectory. No existing test asserts it (`summarizer` has no match in `development.test.ts`). The flush, judge, agent, and transport assertions stay as they are.

**Failing vector (before the fix):** a development aggregate run against `MatrixPeer` with summary `length` on the first owner build. It rejects with `/development integrity failure/` and emits fewer rows than the copy's goals.

**Proof (after the fix):**

- Every goal emits a row.
- `aggregates.jsonl` holds a `fail` row for the topic whose error matches `/summary refused/`.
- That goal's row lists the topic under `withheld`.
- The summary cache has no row for that prompt key.
- Exactly one summarizer request is sent per refused build.
- No later agent request body contains the refused prose.
- Judge and agent requests continue to be sent.
- `readRequestOutcome` on the summarizer request returns `refused`.

**Negative controls:**

- A summarizer that returns HTTP 500, omits usage, or sends `done:false` still rejects with `/development integrity failure/`.
- An agent `length` response still rejects with `decision qualification failed: length`.
- An aggregate execution outside development with summarizer `length` withholds the topic and caches nothing. This closes the gap in finding item 6.
- Mutation control: reverting the role-scoped branch makes the new case fail again.
- The records and full arms send no summarizer request, so their existing development tests must pass unchanged.

**Commands:**

- The touched file: `npx vitest run` on `development.test.ts`, under the harness's Vitest config.
- The harness project: `aggregates.test.ts`, `Driver.test.ts`, `integration.test.ts`, and `matrix.test.ts`.

## Preserved invariants

- Truncated, unsupported, or stale summary content is never cached or rendered. `render` still requires a completed maintenance pass and matching sources (`.orkestrel/agent/instruments/harness/bench5/aggregates/Aggregator.ts:237-251`).
- A failed update never counts as maintained: there is no `build`/`current` row and no version-counter bump.
- Sent-request usage stays complete and the evidence is unchanged.
- Retry stays bounded at 2. The whole-trajectory limits and the study latch (`.orkestrel/agent/instruments/harness/bench5/Driver.ts:1027-1036`) are unchanged.
- The initial records selection is unchanged, because the summary stage runs after the ledger files the request.

## Minimum fresh execution and qualification boundary

1. Commit, build, and record the new build-manifest hash.
2. Make a fresh `l13/q2-think0` cell with the l12 freeze arguments into a new output directory (freeze writes are create-only).
3. Regenerate the development policy with the same prepare script. The summary settings stay AGREE 0.67, CHANGE 0.56, paired budget 3072 with reserve 512, output 160, allowance 555, retry 2, so the l9 identity guards still hold.
4. Run the relative-cache control and the dry-read.
5. Make one live aggregate launch with the same cap.

Report the following from the run:

- **Maintenance coverage:** for each goal, the `rendered`, `withheld`, `cut`, and `emptied` topics, and the count of summarizer `refused` requests from `requests.jsonl`.
- **Completed work:** the rows emitted.
- **Quality:** blind grades of content and complete work against the l11 records/full baselines. Label it a cross-build development observation.

The other seven cells (q4, g2, and g4 at both thinking settings, and q2 with thinking on) each need their own development generation. The existing validator refuses to reuse l9 for them.

## Before any held-out adoption claim

- The sustained classifier treats any `refused` outcome as a refusal of the whole trajectory. It also reports an error for every request sent afterward (`.orkestrel/agent/instruments/harness/bench5/sustained/helpers.ts:65-80`). The study latch at `.orkestrel/agent/instruments/harness/bench5/Driver.ts:1027-1036` does the same. The aggregate arm of the final long-work pair would stop the way l12 did.
- Close that with its own role-scoped amendment and proof. Refused summary calls must still count toward the call and token limits.
- Freeze a matched build and the summary settings across both arms.
- Report coverage beside completed work.

No adoption verdict follows from l12.

## Remaining limitations

- I did not read whether the freeze or the development policy binds the build-manifest hash. The deciding source is `Matrix.ts` `#freeze` and `readDevelopment` at `.orkestrel/agent/instruments/harness/bench5/matrix/helpers.ts:420-503`. If it is bound, step 2 is required, not optional.
- I did not read the summarizer sampler in `settings.json`, so whether a summary is deterministic for the same prompt is unverified.
- Owner topics that keep refusing will cost one capped attempt at every read point. Only the run measures that cost, and it might show coverage too low to make the aggregate arm meaningful. That would be the evidence for the separately frozen output amendment.