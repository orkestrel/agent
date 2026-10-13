# Q4 capacity diagnostic

The retained daemon interval records a memory-driven eviction during Q4 request 52, followed by a Qwen 2B load and an additional chat request. Q4 completed its response with HTTP 200 before its immediate capacity sample returned an empty inventory. These observations support competing traffic as a plausible cause of the missing inventory. They do not identify the other client or timestamp the removal of Q4 from the inventory. No crash or capacity infeasibility is established.

The deciding extracts are `tmp/units/aggregate-final-q4-capacity-diagnostic-stderr.log:686` (eviction), `tmp/units/aggregate-final-q4-capacity-diagnostic-stderr.log:694` (slot release), `tmp/units/aggregate-final-q4-capacity-diagnostic-stderr.log:996` (Qwen 2B identity), and `tmp/units/aggregate-final-q4-capacity-diagnostic-stdout.log:6` (additional chat). The original request evidence is `.orkestrel/agent/instruments/results/l14/q4-think0/full/preflight/l6-q4-think0-full-v1/requests.jsonl:52`; its restricted metadata projection is `tmp/units/aggregate-final-q4-capacity-diagnostic-evidence.json:90`.

## Input identity

The extractor checked the supplied build manifest, full manifest, run, and capacity snapshot hashes before reading the attempt. Their SHA-256 values match the accepted cell report. The emitted `readBuild()` reader validated source and output custody; the emitted `readAttempt()` reader decoded the retained attempt; the emitted `listCapacityFailures()` reader reproduced the request 52 capacity failure. See `tmp/units/aggregate-final-q4-capacity-diagnostic-evidence.json:2`, `tmp/units/aggregate-final-q4-capacity-diagnostic-evidence.json:21`, and `tmp/units/aggregate-final-q4-capacity-diagnostic-evidence.json:141`.

The checked hashes are:

| Input | SHA-256 |
| --- | --- |
| Build manifest | `d361e9d8ec607ae7e21bcee966904effa2be9a0ccaa972eef8d25b540e977c54` |
| Full manifest | `52869d2ea3167896efd638f457e9690a95dfdff87fe128d1e7065f260a13f7b8` |
| Full run | `8e20d6b79e023badb91eecca08f3cee7d3c7e2ca160b0ada84bc08590ca2b0e0` |
| Capacity snapshot | `5b57739c9a861447d69590b8408cf949456550d5a9e0a2cfb1494c0d4a71f84f` |

`git rev-parse HEAD` returned `9cdbdaf6dccfd7d925e93fabce34700ced6de68f` before and after extraction, matching this diagnostic's brief. The older cell report names the earlier run-time HEAD; that difference is recorded context, not a changed input artifact.

## Timing and order

Request timestamps are Unix milliseconds. The daemon stderr explicitly carries `-04:00`; the host's `America/New_York` offset for this interval is also `-04:00`. The unzoned GIN timestamps align with request 50, flush 51, request 52, and the capacity sample after adding 4 hours. Thus daemon `2026-10-11 22:43:53` means `2026-10-12 02:43:53Z`. GIN timestamps have only second precision. See `tmp/units/aggregate-final-q4-capacity-diagnostic-evidence.json:190` and `tmp/units/aggregate-final-q4-capacity-diagnostic-stdout.log:1`.

The observed order is:

| UTC on 2026-10-12 | Observation | Evidence |
| --- | --- | --- |
| 02:42:07.869–.870 | Request 50's capacity snapshot succeeds with Q4 context 262144. | `tmp/units/aggregate-final-q4-capacity-diagnostic-evidence.json:26` |
| 02:42:08.221–13.682 | Flush 51 is sent to Q4 and succeeds. | `tmp/units/aggregate-final-q4-capacity-diagnostic-evidence.json:62` |
| 02:42:13.685 | Q4 request 52 starts for `g23-grace-reopened`, with `keep_alive: 30m`. | `tmp/units/aggregate-final-q4-capacity-diagnostic-evidence.json:90` |
| 02:42:15.358 | Daemon clamps requested context 1068374 to model context 262144 and starts the Q4 runner. | `tmp/units/aggregate-final-q4-capacity-diagnostic-stderr.log:317` |
| 02:42:22.642 | Q4 runner is loaded. | `tmp/units/aggregate-final-q4-capacity-diagnostic-stderr.log:627` |
| 02:43:43.738 | Scheduler logs `llama-server model predicted to exceed available memory, evicting`, with predicted context 8192. Generation progress occurs before and after this line. | `tmp/units/aggregate-final-q4-capacity-diagnostic-stderr.log:684` |
| Untimestamped | Q4 records prompt evaluation of 8669 tokens, generation of 155 tokens, slot release, and idle slots. These usage readings match request 52. This is slot release, not an explicit model-unload completion event. | `tmp/units/aggregate-final-q4-capacity-diagnostic-stderr.log:690` |
| 02:43:53.067 | Request 52's complete response is buffered, HTTP 200, stop reason `stop`. | `tmp/units/aggregate-final-q4-capacity-diagnostic-evidence.json:90` |
| 02:43:53.067–.816 | Capacity GET runs after buffering, takes 749 ms, returns HTTP 200 with exact body `{"models":[]}`. | `tmp/units/aggregate-final-q4-capacity-diagnostic-evidence.json:144` |
| 02:43:53.818 | Request 52 evidence finishes, with failure `observation`. | `tmp/units/aggregate-final-q4-capacity-diagnostic-evidence.json:90` |
| 02:43:53.926–.927 | Request 53 is refused locally and is not sent. | `tmp/units/aggregate-final-q4-capacity-diagnostic-evidence.json:127` |
| 02:43:56.322–02:44:00.117 | A different blob loads; the daemon identifies Qwen 2B and records a loaded runner. | `tmp/units/aggregate-final-q4-capacity-diagnostic-stderr.log:696`, `tmp/units/aggregate-final-q4-capacity-diagnostic-stderr.log:996` |
| 02:44:05, second precision | Another HTTP 200 POST `/api/chat` completes with duration 22.3302102 seconds. | `tmp/units/aggregate-final-q4-capacity-diagnostic-stdout.log:6` |

The capture implementation establishes the request/sample ordering directly. Emitted `Driver.js` awaits the complete response body, records `buffered`, awaits the capacity snapshot, and only then constructs the response returned to its caller. The snapshot fetches `/api/ps`; request `finished` is recorded afterward. See `.orkestrel/agent/instruments/harness/.build/bench5/Driver.js:783`, `.orkestrel/agent/instruments/harness/.build/bench5/Driver.js:788`, `.orkestrel/agent/instruments/harness/.build/bench5/Driver.js:821`, and `.orkestrel/agent/instruments/harness/.build/bench5/Driver.js:921`. There is no client-side model-release call between response buffering and capacity sampling in this sequence. The emitted capacity reader refuses the missing match at `.orkestrel/agent/instruments/harness/.build/bench5/matrix/helpers.js:89`.

## Cause assessment and limits

Eviction is explicit daemon evidence. The untimestamped `slot release` line establishes completion of slot processing, not the precise instant the scheduler removes the model or finishes unloading it. The empty inventory records what `/api/ps` returned during the sample. It does not timestamp physical memory release.

Additional traffic is explicit endpoint evidence. The chat completion at 02:44:05 cannot be Q4 request 52, whose response was already buffered at 02:43:53.067; Q4 request 53 was unsent. The adjacent daemon workload uses Qwen 2B. Neither log carries the client's PID, a request identifier, or the caller's run identity. Attributing this traffic to a particular pilot, bench, or person is unsupported.

The additional chat's recorded duration implies an arrival during approximately 02:43:42.670–02:43:43.670Z when combined with GIN's second-resolution completion time. That is a timing derivation, not an observed arrival timestamp. It overlaps Q4 generation and precedes the eviction line. The sole hypothesis is that this competing model request prompted eviction, leaving the inventory empty between Q4 completion and Qwen 2B readiness. Establishing the exact causal chain requires a retained scheduler/client correlation that this bounded evidence lacks.

The interval contains no explicit crash, panic, or runner-death event. Startup `llm server error` status is followed by successful loading, and Q4's response completes successfully; those startup lines do not establish a crash. Absence of a crash record in this interval is not proof that no unlogged fault occurred. The empty inventory does not establish full-view infeasibility or a strict capacity refusal.

The smallest next action is a read-only attribution check against retained client launch/request logs covering 02:43:42–02:44:06Z, matching the Qwen 2B request and its 22.3302102-second daemon interval. That is a successor scope; this diagnostic performs no retry or live probe.

## Extract custody and validation

The extractor preserved the selected source bytes, including existing line endings, and re-read those byte ranges to confirm equality. Its manifest records original line ranges and zero-based, end-exclusive byte ranges at `tmp/units/aggregate-final-q4-capacity-diagnostic-evidence.json:168`. The stdout slice covers request 50's completion through the adjacent chat completion. The stderr slice covers the flush load, Q4 load and generation, eviction, and Qwen 2B load and generation. Untimestamped stderr lines retain their original file order; no exact wall time is assigned to them.

The retained extract hashes are:

| Extract | Source lines | Source bytes | SHA-256 |
| --- | --- | --- | --- |
| `aggregate-final-q4-capacity-diagnostic-stdout.log` | 2593–2598 | 239678–240220 | `c2ab8c071d720d583aac867c92e2dc7fb6411809e1b56017ee27f6a3e3e9f53d` |
| `aggregate-final-q4-capacity-diagnostic-stderr.log` | 332410–333439 | 26211406–26289462 | `c5436d4a14433f5c4e6c247630fb478ce4e622f5e55a84ec7081967ad4114404` |
| `aggregate-final-q4-capacity-diagnostic-evidence.json` | Derived restricted metadata |  | `90d2626525138462c67d46a3125c66c60818bf6bbd6e6a58c9276aece97a308e` |

`node tmp/units/aggregate-final-q4-capacity-diagnostic-extract.ts` exited 0. It made no model requests. Only files under the diagnostic's owned prefix were written. No source, build, service, prior artifact, or HEAD was mutated. No answer-quality judgment was made. Expected: bounded cause assessment. Found: eviction and additional traffic with missing client attribution and unload timestamp. Done: retained evidence extraction and ordering; cause remains bounded as stated.

`node .agents/skills/orkestrel-dispatch/scripts/cite.ts tmp/units/aggregate-final-q4-capacity-diagnostic-report.md` exited 0 and reported 31 citations with 0 unresolved.
