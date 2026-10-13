I'll read the brief and follow it exactly, then return only the evidence report it specifies.The brief is a read-only evidence map. I'll load the named law, observations, and diagnostics next, then match those signals to local service source.The observations record version `0.40.2`, an empty `ps` body, and a runner clamp to 262144. Next I’ll identify the installed build and match those log strings to source.The workspace search stayed inside the repo, so I’ll list the installed Ollama directory and the sibling client directly.The deployed service identifies itself as Ollama 0.40.2. The matching Scoop manifest names the v0.40.2 installer, and the retained runner log names its own Go file locations and llama.cpp build `631109b34`. Those source texts were not read, so clamp, `truncate=false`, and slot `truncated` semantics stay unverified. What follows is the observed field map.

## Rejections and loading

- A directory listing of `C:\Users\mikes\scoop\apps\ollama-full` was rejected with `Rejected:`.
- Web search was rejected with `User Rejected`.
- Web fetch of `https://api.github.com/repos/ollama/ollama/contents/?ref=v0.40.2` was rejected with `User Rejected`.
- No further access was used for those operations. `C:\Users\mikes\go\pkg\mod\github.com\ollama\ollama@v0.40.2\server\server.go` is absent. No Go source for the logged messages is in this checkout.
- Named law files were read, including `.agents/orchestration.md` through the Acceptance section.

## Distribution identity

`GET /api/version` returned `{"version":"0.40.2"}` (`tmp/units/aggregate-capacity-observations/version.body:1`). The Scoop shim `C:\Users\mikes\scoop\shims\ollama.shim` points at `C:\Users\mikes\scoop\apps\ollama-full\current\ollama.exe`. That executable exists; a binary read was refused as an exe. `install.json` and `manifest.json` are absent beside it.

The extras bucket manifest `C:\Users\mikes\scoop\buckets\extras\bucket\ollama-full.json` is version `0.40.2`, homepage `https://ollama.com/`, installer `https://github.com/ollama/ollama/releases/download/v0.40.2/OllamaSetup.exe`, hash `e78ea4ffc8fdc1a0bbcb4f8404c7ee1bd0898ed3a65d9cc08d79eb2235cd5a9e`, and `checkver` repository `https://github.com/ollama/ollama`. That file is the current bucket manifest, not an install receipt, and the installed bytes were not hashed against it.

The runner log and the 09:30 version read share that install path. They are separate captures: the log lines are from 2026-10-11 03:43–04:00 EDT; the version body is from `2026-10-11T09:29:11.762Z` (`tmp/units/aggregate-capacity-observations/manifest.json:16`). Process IDs 60740 and 47420 are the metadata report’s record (`tmp/units/aggregate-capacity-observations-report.md:3`), not a process query from this pass.

llama-server prints `build 1 (631109b34) with Clang 18.1.8 for Windows AMD64` (`tmp/units/aggregate-ollama-daemon-resume.err:238205`) and cites `https://github.com/ggml-org/llama.cpp/issues/16842` (`tmp/units/aggregate-ollama-daemon-resume.err:220581`) and `https://github.com/ggml-org/llama.cpp/pull/16391` (`tmp/units/aggregate-ollama-daemon-resume.err:220617`). The commit text was not fetched.

## Active `ps` fields

`GET /api/ps` returned `{"models":[]}` (`tmp/units/aggregate-capacity-observations/ps.body:1`), HTTP 200, 13 bytes (`tmp/units/aggregate-capacity-observations/manifest.json:23`). No running-model object, context length, slot, port, or process id is in that body.

The JavaScript client `ollama` 0.6.3 (`../ollama/node_modules/ollama/package.json:3`) exposes `ps()` as `GET /api/ps` and types the result `ListResponse` (`../ollama/node_modules/ollama/dist/browser.mjs:467`). That client is version 0.6.3 against a service that reports 0.40.2. It does not define the server’s non-empty field set. `@orkestrel/ollama` 0.0.22 (`../ollama/package.json:3`) has no `ps` call in `OllamaProvider`.

Gap: the struct that fills a non-empty `models` entry, and whether it carries the live context allocation, is unverified. The empty body does not show it.

## Requested context clamping

Observed warning, twice, from the binary’s own location `server.go:112`:

`requested context size too large for model` with `num_ctx=1068663` and `n_ctx_train=262144` (`tmp/units/aggregate-ollama-daemon-resume.err:220299`, `tmp/units/aggregate-ollama-daemon-resume.err:238190`).

The following launch uses `-c 262144 -np 1` (`tmp/units/aggregate-ollama-daemon-resume.err:220300`, `tmp/units/aggregate-ollama-daemon-resume.err:238191`). The source that chooses that ceiling was not opened, so the general clamp rule is unverified beyond these log lines.

`POST /api/show` for `qwen3.5:2b-q4_K_M` reports `model_info.qwen35.context_length` 262144, `details.runner` `llamacpp`, selected manifest digest `sha256:78a738cc751e89cba72bb1feabf70f30c31772eb81a89a66af94ecea90dc5d11`, and `requires` `0.17.1` (`tmp/units/aggregate-capacity-observations/show.body:1`). `requires` is model metadata. The server version in the version body is `0.40.2`. The show value 262144 and the log field `n_ctx_train=262144` are equal in these artifacts. They are separate fields.

Client requests are a third record. Request 20 sends `options.num_ctx` 1068663 and `truncate` false (`tmp/units/aggregate-q2-full-failure/requests.jsonl-20.json:442`, `tmp/units/aggregate-q2-full-failure/requests.jsonl-20.json:504`). The retained projection reports the same pair for sequences 1, 20, and 66 (`tmp/units/aggregate-full-capacity/excerpts.md:32`).

## Effective per-sequence allocation

For the 262144 launches, the runner prints `n_seq_max = 1`, `n_ctx = 262144`, `n_ctx_seq = 262144` (`tmp/units/aggregate-ollama-daemon-resume.err:220535`, `tmp/units/aggregate-ollama-daemon-resume.err:238426`). The slot init prints `n_slots = 1`, `n_ctx_slot = 262144`, and `new slot, n_ctx = 262144` (`tmp/units/aggregate-ollama-daemon-resume.err:220612`, `tmp/units/aggregate-ollama-daemon-resume.err:220614`, `tmp/units/aggregate-ollama-daemon-resume.err:238503`, `tmp/units/aggregate-ollama-daemon-resume.err:238505`). The KV line reports `262144 cells` (`tmp/units/aggregate-ollama-daemon-resume.err:220551`).

The final prompt line is `n_ctx_slot = 262144, n_keep = 4, task.n_tokens = 12685` (`tmp/units/aggregate-ollama-daemon-resume.err:238545`). `--keep 4` is on the launch command (`tmp/units/aggregate-ollama-daemon-resume.err:238191`). Prompt evaluation reports 12685 tokens (`tmp/units/aggregate-ollama-daemon-resume.err:238597`).

The retained extraction, not re-run here, counts 25 warnings, 25 `-c 262144` launches, 25 `n_ctx` and 25 `n_ctx_seq` lines at 262144, and 24 `-c 3072` launches inside lines 220297–238601 (`tmp/units/aggregate-full-capacity/excerpts.md:62`, `.orkestrel/agent/instruments/units/aggregates/diagnostics/q2-full-capacity/extract.ts:67`). Request rows in that projection are 42 at `num_ctx` 1068663 and 24 at 3072. Launch count and request count differ, so one runner serves more than one oversized request in that span.

## Chat `truncate=false`

This is a client request field. `shapeBody` writes `truncate: false` for the agent, summarizer, and flush roles (` .orkestrel/agent/instruments/harness/bench5/Driver.ts:641`, `.orkestrel/agent/instruments/harness/bench5/Driver.ts:653`, `.orkestrel/agent/instruments/harness/bench5/Driver.ts:158`). `WireChatRequest` has no `truncate` property (`../ollama/src/core/types.ts:16`). `OllamaProvider.body` does not set it (`../ollama/src/core/OllamaProvider.ts:74`). The readable `ollama` 0.6.3 `chat` method forwards the request object to `/api/chat` (`../ollama/node_modules/ollama/dist/browser.mjs:339`). No `truncate` declaration was found in that file.

Request 20’s retained response is `{"error":"XML syntax error on line 6: element <function> closed by </parameter>"}` with status 500 and no prompt or completion counts (`tmp/units/aggregate-q2-full-failure/requests.jsonl-20.json:506`). The gin row is `POST /api/chat` status 500 at 03:46:04 (`tmp/units/aggregate-ollama-daemon-resume.log:1011`).

The server branch for `truncate=false` was not read. Whether it refuses overflow, leaves input intact, or is ignored is unverified.

## Runner shifts and `truncated`

The parent starts llama-server with `--context-shift` (`tmp/units/aggregate-ollama-daemon-resume.err:220300`, `tmp/units/aggregate-ollama-daemon-resume.err:238191`). The child then prints `KV cache shifting is not supported for this context, disabling KV cache shifting` (`tmp/units/aggregate-ollama-daemon-resume.err:220568`, `tmp/units/aggregate-ollama-daemon-resume.err:238459`) and `the context does not support partial sequence removal` (`tmp/units/aggregate-ollama-daemon-resume.err:220610`, `tmp/units/aggregate-ollama-daemon-resume.err:238501`).

Slot release for the 12685-token prompt is `id  0 | task 0 | stop processing: n_tokens = 12756, truncated = 0` (`tmp/units/aggregate-ollama-daemon-resume.err:238601`). Timing on that task is 12685 prompt tokens, 72 generated tokens, and a total of 12757 (`tmp/units/aggregate-ollama-daemon-resume.err:238597`). The release count 12756 and the timing total 12757 are both in the log. The reason for the difference was not read from source.

A search of the captured stderr for `truncated = ` followed by a first digit 1–9 found no line. The retained span counter reports 66 `truncated =` lines and 0 nonzero (`tmp/units/aggregate-full-capacity/excerpts.md:60`). That counter was not re-executed. The llama.cpp meaning of `truncated`, and whether it covers prompt ingestion as well as a context shift, was not read. The final prompt’s `task.n_tokens` 12685 is below `n_ctx_slot` 262144, so this release does not exercise an overflow shift.

## Request and slot association

Gin rows carry time, status, duration, client address, method, and path. They carry no request id (`tmp/units/aggregate-ollama-daemon-resume.log:991`, `tmp/units/aggregate-ollama-daemon-resume.log:1011`, `tmp/units/aggregate-ollama-daemon-resume.log:1057`). Runner launches carry a port (`60383` at `tmp/units/aggregate-ollama-daemon-resume.err:220300`, `64268` at `tmp/units/aggregate-ollama-daemon-resume.err:238191`) and the slot log carries `id` and `task`. The line after the second `llama-server started` record is `conv_id= (empty=1)` (`tmp/units/aggregate-ollama-daemon-resume.err:238531`).

The final gin chat completes at 04:00:40 after 45.5545423s (`tmp/units/aggregate-ollama-daemon-resume.log:1057`). The runner that started at 04:00:07 evaluates 12685 prompt tokens (`tmp/units/aggregate-ollama-daemon-resume.err:238597`), matching the projected request-record prompt count for sequence 66 (`tmp/units/aggregate-full-capacity/excerpts.md:51`). That is adjacency of time and token count. No shared request id binds them. Request 20 has no usage fields to bind to a slot.

## Smallest missing fact

The source at the binary’s reported locations — `server.go:112` for the clamp, the chat handler for `truncate=false`, and llama.cpp commit `631109b34` for slot `truncated` and the disabled KV shift — was not available locally, and the remote fetch was rejected.