# Aggregate capacity startup evidence

The retained daemon process tree was live during this lookup, and the captured service configuration records serial Ollama allocation. The daemon's inherited context-shift state remains unknown.

## Process and startup source

The launcher PID file records PID 60740 (`tmp/units/aggregate-ollama-daemon-resume.log.pid:1`). A scoped process query observed PID 60740 as `ollama.exe`, parent 47380, running `C:/Users/mikes/scoop/shims/ollama.exe serve`; child PID 47420 was `ollama.exe`, parent 60740, running `C:/Users/mikes/scoop/apps/ollama-full/current/ollama.exe serve`. Both were live at lookup time. No process was signaled.

The retained logs begin at `2026-10-10T22:54:54.290-04:00` (`tmp/units/aggregate-ollama-daemon-resume.err:1`), equivalent to the brief's recorded `2026-10-11T02:54:54Z`. The targeted search found no retained TypeScript startup command or launch receipt naming this daemon prefix. It found the process launch record above and later runner launch lines; those do not reconstruct the daemon's launch history.

The daemon log records Ollama configuration values `OLLAMA_NUM_PARALLEL=1`, `OLLAMA_MAX_LOADED_MODELS=0`, and `OLLAMA_HOST=http://127.0.0.1:11434` (`tmp/units/aggregate-ollama-daemon-resume.err:1`). The same captured record does not bind `LLAMA_ARG_CONTEXT_SHIFT` or `LLAMA_ARG_N_PARALLEL`; both remain unknown. This lookup did not inspect process memory or enumerate process environments.

The retained service observation reports Ollama version `0.40.2`; this is a logged/API observation, not binary version verification (`.orkestrel/agent/instruments/units/aggregates/reports/resumption-capacity-service-raw.md:13`). Runner stderr identifies llama-server build commit `631109b34` and Clang `18.1.8` for Windows AMD64 (`tmp/units/aggregate-ollama-daemon-resume.err:238205`). This is runner-reported identity, not independent binary verification. The runner command lines include `-c 262144 -np 1` (`tmp/units/aggregate-ollama-daemon-resume.err:220300`, `tmp/units/aggregate-ollama-daemon-resume.err:238191`).

## Frozen model and role routes

The harness constants map q2, q4, g2, and g4 to the Qwen and Gemma tags and name Mica as the judge (`.orkestrel/agent/instruments/harness/bench5/constants.ts:12`, `.orkestrel/agent/instruments/harness/bench5/constants.ts:20`). The matrix constants route its stages through those four workload keys (`.orkestrel/agent/instruments/harness/bench5/matrix/constants.ts:8`). The declared daemon endpoint is `http://127.0.0.1:11434` (`.orkestrel/agent/instruments/harness/bench5/constants.ts:46`). Frozen manifests assign Qwen/Gemma to decision and summarizer roles and Mica to judge; the common Ollama chat transport is `POST /api/chat` (`.orkestrel/agent/instruments/units/aggregates/reports/resumption-capacity-service-raw.md:51`). These are harness declarations; they do not establish that each model was loaded during the captured daemon session.

| Workload | Decision and summarizer tag | Retained digest | Judge tag | Retained digest |
| --- | --- | --- | --- | --- |
| q2 | `qwen3.5:2b-q4_K_M` | `78a738cc751e89cba72bb1feabf70f30c31772eb81a89a66af94ecea90dc5d11` | `hf.co/sky7350/Mica-v0.1-4B:Q4_K_M` | `ccc93a29870522845fccafeb24fbef6c7307995fd9db105cb5c0abff8da3ce9b` (`.orkestrel/agent/instruments/results/l7/q2-think0/freeze/manifest.json:6`, `.orkestrel/agent/instruments/results/l7/q2-think0/freeze/manifest.json:33`) |
| q4 | `qwen3.5:4b-q4_K_M` | `d8b0f5e9760cd1682034f292d7ef72ec46f432149be0df7574bf2d6e92e38c04` | `hf.co/sky7350/Mica-v0.1-4B:Q4_K_M` | `ccc93a29870522845fccafeb24fbef6c7307995fd9db105cb5c0abff8da3ce9b` (`.orkestrel/agent/instruments/results/l7/q4-think0/freeze/manifest.json:6`, `.orkestrel/agent/instruments/results/l7/q4-think0/freeze/manifest.json:33`) |
| g2 | `gemma4:e2b-it-q4_K_M` | `b37049369adfe3d2b653af0ab301a062ca5cbe96ace6aa0d3f2559ee9b563fc2` | `hf.co/sky7350/Mica-v0.1-4B:Q4_K_M` | `ccc93a29870522845fccafeb24fbef6c7307995fd9db105cb5c0abff8da3ce9b` (`.orkestrel/agent/instruments/results/l7/g2-think0/freeze/manifest.json:6`, `.orkestrel/agent/instruments/results/l7/g2-think0/freeze/manifest.json:33`) |
| g4 | `gemma4:e4b-it-q4_K_M` | `dc35e8d9c6061baa6f0fa870975ab6932e2542b579b13ea0f199fa4bb7300c9c` | `hf.co/sky7350/Mica-v0.1-4B:Q4_K_M` | `ccc93a29870522845fccafeb24fbef6c7307995fd9db105cb5c0abff8da3ce9b` (`.orkestrel/agent/instruments/results/l7/g4-think0/freeze/manifest.json:6`, `.orkestrel/agent/instruments/results/l7/g4-think0/freeze/manifest.json:33`) |

The bench settings file contains q2, q4, g2, and g4 allowance/retry/predict values, but does not name model tags or serving routes (`.orkestrel/agent/instruments/harness/bench5/settings.json:1`). The q2 service observation identifies its selected model as `qwen3.5:2b-q4_K_M`, digest `78a738cc751e89cba72bb1feabf70f30c31772eb81a89a66af94ecea90dc5d11`, with runner `llamacpp` (`.orkestrel/agent/instruments/units/aggregates/reports/resumption-capacity-service-raw.md:37`). No direct per-model active allocation evidence exists for the other tags in this bounded lookup.

## Limits

The daemon's inherited `LLAMA_ARG_CONTEXT_SHIFT` and `LLAMA_ARG_N_PARALLEL` values are unbound. Frozen manifests identify workload roles and digests; they do not prove which models were resident in this daemon. The retained `/api/ps` response was empty, so it provides no active-model allocation (`.orkestrel/agent/instruments/units/aggregates/reports/resumption-capacity-service-raw.md:23`). No service request, model request, environment dump, install, source edit, or process mutation was made.
