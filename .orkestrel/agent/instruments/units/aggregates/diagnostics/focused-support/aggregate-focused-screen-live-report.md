# Live verification: aggregate-focused-screen

Executed on Windows PowerShell at `C:/Users/mikes/WebstormProjects/scaffold` against the authorized local daemon at `127.0.0.1:11434`. This report records the fixed local discrimination run only. It does not establish exact tokenizer fit, service non-truncation, broader qualification, or adoption.

## Launch and completion

The exact fixed command ran through the canonical launcher with status capture and a 180-second cap:

```text
node .agents/skills/orkestrel-dispatch/scripts/launch.ts --journal tmp/units/aggregate-focused-screen-live.jsonl --errors tmp/units/aggregate-focused-screen-live.err --cap 180 --status -- node tmp/units/aggregate-focused-screen/main.ts --execute --packet 52aa96b66f45b9cad0275cd6db52e63f1a12ffb9f4b80e84132831f9f885cf11 --build 09c7d936ffaec46ed9deb5bdd300deb0f9643ad639519762d8d84e38ef513ecf --operator 678dacdd3f72ae2a9eef46974b46f4ef2a7e5095dfc7d1e9fc9e3d6a15e8026b --output tmp/units/aggregate-focused-screen/live-forward-reverse
```

The launcher exited 0, `capped=false`, duration 14698 ms. Recorded PID 69008 and its direct-child query showed no live process after completion. The launcher output journal is empty because the instrument wrote its complete evidence to the owned output directory; the error log contains only `exit=0 signal=none capped=false duration_ms=14698`. Launcher PID and status artifacts are `tmp/units/aggregate-focused-screen-live.jsonl.pid`, `.jsonl.status-before.txt`, and `.jsonl.status-after.txt`.

The instrument reports `complete=true`, `status=passed`, 4 model requests, 2 daemon checks, and 4 completed readings. No retry or additional inference request occurred. Raw request and response bodies, response headers, wire evidence, normalized readings, replay arithmetic, daemon observations, custody, ranking, and outcome remain under `tmp/units/aggregate-focused-screen/live-forward-reverse/`.

## Request and response custody

Each transmitted request body equals the corresponding frozen `packet-final.json` rendering byte-for-byte. The request JSON text, recorded request byte count/hash, and raw `.request.bin` bytes agree. Each raw `.response.bin` matches the captured response body byte count/hash in its wire evidence. All four HTTP responses were 200.

| Position | Frozen body | Request bytes / SHA-256 | Response bytes / SHA-256 | Wire match |
| --- | --- | --- | --- | --- |
| 01 statement-a | statement-a | 5311 / `49c33eff78eac56c7e1fa2e2f5e9c6ed7f08e86b090cf57e2b555159408f0245` | 1819 / `dd5b182a080f7f97128597d763a7461da591a064bbd5fe0db018678fb2a0f076` | yes |
| 02 statement-b | statement-b | 5179 / `1ed282ead7d3342fda2f6e516e75615d79453874ce303ffd9dd78912fe706683` | 1764 / `b131b93af64f20139e68ea57cf7342a527c401591be71e9a2854999da40d99da` | yes |
| 03 statement-b | statement-b | 5179 / `1ed282ead7d3342fda2f6e516e75615d79453874ce303ffd9dd78912fe706683` | 1762 / `d954fdedc4542c99bc4a9d82df61abc5502c637207ee80cde9b4345089651de4` | yes |
| 04 statement-a | statement-a | 5311 / `49c33eff78eac56c7e1fa2e2f5e9c6ed7f08e86b090cf57e2b555159408f0245` | 1819 / `d8bcff44c8bd72de7a78ee3654f0ac2bb2c80395b1b4278d0de5b7c68ce28cbd` | yes |

The packet hash is `52aa96b66f45b9cad0275cd6db52e63f1a12ffb9f4b80e84132831f9f885cf11`; build hash is `09c7d936ffaec46ed9deb5bdd300deb0f9643ad639519762d8d84e38ef513ecf`; operator digest is `678dacdd3f72ae2a9eef46974b46f4ef2a7e5095dfc7d1e9fc9e3d6a15e8026b`. The run's custody record binds those values and all 76 packet inputs. Post-run comparison found all 76 paths present with matching sizes and SHA-256 hashes.

## Readings and arithmetic

The request order was statement-a, statement-b, statement-b, statement-a. Raw returned labels and raw Yes/No log probabilities are:

| Position | Label | `logprob` for returned token | Yes `logprob` | No `logprob` | Prompt / cached prompt / completion | Normalized score | Replay score | Delta |
| --- | --- | ---: | ---: | ---: | --- | ---: | ---: | ---: |
| 01 statement-a | No | -0.5017915964126587 | -0.9775720238685608 | -0.5017915964126587 | 1419 / 0 / 1 | 0.3957718403070372 | 0.3957718403070372 | 0 |
| 02 statement-b | Yes | -0.25189945101737976 | -0.25189945101737976 | -1.5301796197891235 | 1397 / 907 / 1 | 0.7570881646437931 | 0.7570881646437931 | 0 |
| 03 statement-b | Yes | -0.25189945101737976 | -0.25189945101737976 | -1.5301796197891235 | 1397 / 1393 / 1 | 0.7570881646437931 | 0.7570881646437931 | 0 |
| 04 statement-a | No | -0.5017915964126587 | -0.9775720238685608 | -0.5017915964126587 | 1419 / 907 / 1 | 0.3957718403070372 | 0.3957718403070372 | 0 |

Every raw response carries `done=true` and `done_reason=length`. Prompt, cached prompt, and completion usage are reported separately above; normalized totals are 1420 for statement-a and 1398 for statement-b. Independent replay and the library score agree at every position with zero difference.

| Pass | Supported statement-b | Unsupported statement-a | Strictly exceeds |
| --- | ---: | ---: | --- |
| Forward | 0.7570881646437931 | 0.3957718403070372 | yes |
| Reverse | 0.7570881646437931 | 0.3957718403070372 | yes |

The ranking artifact records `passed`. This is a complete local discriminator result; it does not prove that the service did not truncate input or establish exact offline token fit.

## Model and settings observations

The daemon comparison before and after execution reports the same model name and digest: `hf.co/sky7350/Mica-v0.1-4B:Q4_K_M`, digest `ccc93a29870522845fccafeb24fbef6c7307995fd9db105cb5c0abff8da3ce9b`. The raw frozen and transmitted request bodies match, including `num_ctx=4096`, `num_predict=1`, `temperature=1`, `raw=true`, `stream=false`, `logprobs=true`, `top_logprobs=20`, and `keep_alive=5m`. The identity tuple's `1.1244734010661372` is calibration temperature, not seed.

## Status and deviations

Launcher status-before contains only the preexisting `.orkestrel/agent/instruments/bench4/Driver.mjs` modification. Status-after also contains the root-owned untracked `.orkestrel/agent/instruments/units/aggregates/reports/resumption-full-admission-clarification.md`, a disjoint campaign-prose change permitted by the brief. The run made no source change. Later status inspection showed additional disjoint root campaign edits; none is part of this unit.

No binding mismatch, occupied output, transport/decoder exception, cap, missing response, arithmetic mismatch, or request-budget deviation occurred. No daemon restart or settings change was made. The input sizes remain insufficient to establish exact token fit or service non-truncation.
