# Bounded full-view capacity evidence

Capture time: 2026-10-11T09:14:44.776Z

## Source byte identities

- source: `tmp/units/aggregate-ollama-daemon-resume.log`
- captured bytes: 118638; SHA-256: `d3faabc2fb1f1f62dfa92d04c004dc247aa5d6757f6eda8a3cde7c9746ea696f`
- snapshot started: 2026-10-11T09:01:01.567Z; snapshot ended: 2026-10-11T09:01:01.567Z
- file size before/after read: 118638/118638
- source: `tmp/units/aggregate-ollama-daemon-resume.err`
- captured bytes: 19369409; SHA-256: `725a7121d4adeb3aef12a70c3e208cca5c8374528aed2c2788d843b4aced4f2c`
- snapshot started: 2026-10-11T09:01:01.512Z; snapshot ended: 2026-10-11T09:01:01.512Z
- file size before/after read: 19369409/19369409
- source: `.orkestrel/agent/instruments/results/l7/q2-think0/full/preflight/l6-q2-think0-full-v1/requests.jsonl`
- captured bytes: 1449951; SHA-256: `4232e4f14a3d7eacb15764fa0bfeb10b2525e348c41e6648d9540e8068c9db81`
- snapshot started: 2026-10-11T08:00:40.331Z; snapshot ended: 2026-10-11T08:00:40.331Z
- file size before/after read: 1449951/1449951

## Exact request-record projection (prompt bodies omitted)

```json
[
  {
    "sequence": 1,
    "sent": true,
    "status": 200,
    "prompt": 2440,
    "completion": 1,
    "failures": [],
    "model": "qwen3.5:2b-q4_K_M",
    "num_ctx": 1068663,
    "truncate": false
  },
  {
    "sequence": 20,
    "sent": true,
    "status": 500,
    "failures": [
      "transport"
    ],
    "model": "qwen3.5:2b-q4_K_M",
    "num_ctx": 1068663,
    "truncate": false
  },
  {
    "sequence": 66,
    "sent": true,
    "status": 200,
    "prompt": 12685,
    "completion": 72,
    "failures": [],
    "model": "qwen3.5:2b-q4_K_M",
    "num_ctx": 1068663,
    "truncate": false
  }
]
```

## Runner-span truncation markers: 66 total, 0 nonzero

The bounded runner span has 25 oversized-context warnings, 25 launches with -c 262144, 25 n_ctx allocations at 262144, 25 n_ctx_seq allocations at 262144, and 24 launches with -c 3072. The selected daemon API interval has 66 POST /api/chat rows; request artifact rows: 66; request model/context groups: [["qwen3.5:2b-q4_K_M / 1068663",42],["qwen3.5:2b-q4_K_M / 3072",24]].

## Original daemon excerpts

## tmp/units/aggregate-ollama-daemon-resume.log
991: [GIN] 2026/10/11 - 03:43:21 | 200 |     32.8611ms |       127.0.0.1 | GET      "/api/tags"
992: [GIN] 2026/10/11 - 03:43:34 | 200 |   13.2560338s |       127.0.0.1 | POST     "/api/chat"
993: [GIN] 2026/10/11 - 03:43:38 | 200 |    3.9275467s |       127.0.0.1 | POST     "/api/chat"
1010: [GIN] 2026/10/11 - 03:46:02 | 200 |   21.7857947s |       127.0.0.1 | POST     "/api/chat"
1011: [GIN] 2026/10/11 - 03:46:04 | 500 |    2.3237164s |       127.0.0.1 | POST     "/api/chat"
1012: [GIN] 2026/10/11 - 03:46:30 | 200 |   25.7047993s |       127.0.0.1 | POST     "/api/chat"
1055: [GIN] 2026/10/11 - 03:59:47 | 200 |          1m3s |       127.0.0.1 | POST     "/api/chat"
1056: [GIN] 2026/10/11 - 03:59:54 | 200 |    6.5043069s |       127.0.0.1 | POST     "/api/chat"
1057: [GIN] 2026/10/11 - 04:00:40 | 200 |   45.5545423s |       127.0.0.1 | POST     "/api/chat"
## tmp/units/aggregate-ollama-daemon-resume.err
220299: time=2026-10-11T03:43:22.887-04:00 level=WARN source=server.go:112 msg="requested context size too large for model" num_ctx=1068663 n_ctx_train=262144
220300: time=2026-10-11T03:43:22.892-04:00 level=INFO source=llama_server.go:436 msg="starting llama-server" cmd="C:\\Users\\mikes\\scoop\\apps\\ollama-full\\current\\lib\\ollama\\llama-server.exe --model C:\\Users\\mikes\\.ollama\\models\\blobs\\sha256-d9a552ab2828b2be48a251019c2222c52f067f5e4771d3ee12fbeaa6dbf19052 --port 60383 --host 127.0.0.1 --no-webui --offline -c 262144 -np 1 --log-verbosity 4 --no-log-prefix --no-log-timestamps --no-jinja --chat-template chatml --mmproj C:\\Users\\mikes\\.ollama\\models\\blobs\\sha256-a43514840ac5b8393521a0481ec347d49a2c3c3728722f64703d95209da5d98e --load-mode none --flash-attn auto -b 512 -ub 512 --context-shift --keep 4"
220536: llama_context: n_ctx                 = 262144
220537: llama_context: n_ctx_seq             = 262144
220637: time=2026-10-11T03:43:29.420-04:00 level=INFO source=sched.go:747 msg="loaded runners" count=1
238190: time=2026-10-11T03:59:57.076-04:00 level=WARN source=server.go:112 msg="requested context size too large for model" num_ctx=1068663 n_ctx_train=262144
238191: time=2026-10-11T03:59:57.085-04:00 level=INFO source=llama_server.go:436 msg="starting llama-server" cmd="C:\\Users\\mikes\\scoop\\apps\\ollama-full\\current\\lib\\ollama\\llama-server.exe --model C:\\Users\\mikes\\.ollama\\models\\blobs\\sha256-d9a552ab2828b2be48a251019c2222c52f067f5e4771d3ee12fbeaa6dbf19052 --port 64268 --host 127.0.0.1 --no-webui --offline -c 262144 -np 1 --log-verbosity 4 --no-log-prefix --no-log-timestamps --no-jinja --chat-template chatml --mmproj C:\\Users\\mikes\\.ollama\\models\\blobs\\sha256-a43514840ac5b8393521a0481ec347d49a2c3c3728722f64703d95209da5d98e --load-mode none --flash-attn auto -b 512 -ub 512 --context-shift --keep 4"
238427: llama_context: n_ctx                 = 262144
238428: llama_context: n_ctx_seq             = 262144
238528: time=2026-10-11T04:00:07.642-04:00 level=INFO source=sched.go:747 msg="loaded runners" count=1
238529: time=2026-10-11T04:00:07.642-04:00 level=INFO source=llama_server.go:1307 msg="waiting for llama-server to start responding"
238530: time=2026-10-11T04:00:07.643-04:00 level=INFO source=llama_server.go:1374 msg="llama-server started in 10.55 seconds"
238597: slot print_timing: id  0 | task 0 | prompt eval time =   28573.33 ms / 12685 tokens (    2.25 ms per token,   443.95 tokens per second)
238598: slot print_timing: id  0 | task 0 |        eval time =    4073.99 ms /    72 tokens (   57.38 ms per token,    17.43 tokens per second)
238599: slot print_timing: id  0 | task 0 |       total time =   32647.32 ms / 12757 tokens
238600: slot print_timing: id  0 | task 0 |    graphs reused =         71
238601: slot      release: id  0 | task 0 | stop processing: n_tokens = 12756, truncated = 0
238602: srv  update_slots: all slots are idle
