# G2 calibration generation

The fixed G2 runner completed the first four planned stages with exit 0 and no cap. Generation completed with 174 attempt rows and 174 packet rows; the saved reader validated the output hashes, corpus coverage, evidence, and measured costs. Execution stopped before fitting or labels.

## Command and seals

The exact launched command was:

```text
node .agents/skills/orkestrel-dispatch/scripts/launch.ts --journal tmp/units/aggregate-successor-model-g2-execution-root.jsonl --errors tmp/units/aggregate-successor-model-g2-execution-root.err --cap 2880 --status -- node tmp/units/aggregate-successor-model-run.ts --key g2 --plan 4f875648d30934971697bd0959cc148ac32b5ddbb7b431dc3f672177a82c2619 --head 1491e6b2b8913f814d308c3d45ff002e1506abe4 --build 0db4bd7e9f43a7ba8fff1e79a826a52d114db6c8e90de34b8e139737de43b3fc
```

The accepted plan hash is `4f875648d30934971697bd0959cc148ac32b5ddbb7b431dc3f672177a82c2619`; runner hash is `2781d346a006a8f2fb343504b4a3682568806a9239b41246ed4d0f3dc28193bb`; build manifest hash is `0db4bd7e9f43a7ba8fff1e79a826a52d114db6c8e90de34b8e139737de43b3fc`. Before and after custody both record HEAD `1491e6b2b8913f814d308c3d45ff002e1506abe4`. Their files have matching SHA-256 `bbacc67ccef82ccf2605a149c9929a0d16a209facfc2392ebc8566553620cb17`. The runner compared custody before and after every command and at completion. See the [G2 plan](tmp/units/aggregate-successor-model-g2-plan.json:121), [runner custody assertions](tmp/units/aggregate-successor-model-run.ts:104), [before custody](tmp/units/aggregate-successor-model-g2-execution-custody-before.json:2), and [after custody](tmp/units/aggregate-successor-model-g2-execution-custody-after.json:2).

Other custody hashes held throughout: deployment `40442197423b574b61548feb702b55c948d77f61dd719d9d6b26e24ad3016e19`, seed `c52b71f94ab1c2e742a6d6b698bc8fc278b2de1885e4ebdde75caf733355d15e`, settings `760a4598c84f4e94cd22646959858b20eeab03a4e18494778e33f9849eee9bc9`, and dispatch launcher `059a724ea3483a2c99ccfebc35e0b2e4f420fea8bc8242505f26c3a129910970`. The [before custody record](tmp/units/aggregate-successor-model-g2-execution-custody-before.json:5613) and [after custody record](tmp/units/aggregate-successor-model-g2-execution-custody-after.json:5613) match byte for byte.

## Stages and exits

Each stage ran under its plan cap; all nested launchers reported exit 0, `capped=false`, and no signal. The fixed runner also recorded exit 0 for every stage.

| Stage | Cap | Stage duration (ms) | Runner duration (ms) | Exit |
| --- | ---: | ---: | ---: | ---: |
| `g2-think0-freeze` | 240 s | 1,221 | 1,477.2704 | 0 |
| `g2-think1-freeze` | 240 s | 1,288 | 1,560.0776 | 0 |
| `g2-calibration-corpus` | 240 s | 2,552 | 2,798.3067 | 0 |
| `g2-calibration-generate` | 1,800 s | 1,114,591 | 1,114,837.9116 | 0 |

The outer launcher used a 2,880 s cap and reported exit 0, `capped=false`, duration 1,126,851 ms. The generation reader command, `node tmp/units/aggregate-successor-model-g2-generation-read.ts`, exited 0 in 784 ms with empty stderr. See the [outer result](tmp/units/aggregate-successor-model-g2-execution-root.err:2), [generation result](.orkestrel/agent/instruments/results/l15/logs/g2-calibration-generate.err:2), [stage capture](tmp/units/aggregate-successor-model-g2-execution-root.jsonl:13), and [reader output](tmp/units/aggregate-successor-model-g2-generation-read.stdout.txt:7).

## Validated artifacts and coverage

| Artifact | SHA-256 | Size or count |
| --- | --- | ---: |
| G2 think0 freeze manifest | `470d01c30a1a91e87f6bfd022508487bce1574fb7f31e44229298cbbcc8ec9b9` | 19,390 bytes |
| G2 think1 freeze manifest | `3712cba6a9f16c8f43251560ee25abd8af0bd24690f9f8491268f76053b28070` | 19,388 bytes |
| Corpus JSON | `e930cdf16315d8bafc3503d1e4a3532ef09aeba0d863fd3f0e0d76914cca3c8c` | 3,124,729 bytes |
| Corpus manifest | `60b67f7b8b9950b94b0dc779f7934d653a1d6e61383e12bc0e16059b45c2e5c3` | 551 bytes |
| Generation attempts | `ab7dae4f7a614a412945268f3f5d5f6d8891672b868724d782e0d16090b9bb97` | 3,783,560 bytes; 174 rows |
| Generation packet | `9ae5f8622b50bfd09672c243499fccf01b775451cba03671a33c46755025cb2d` | 3,208,183 bytes; 174 rows |
| Generation manifest | `916567ee5a07a9db92ba7fed2007809801ab03d0c67d0b0369c46fb479d13c66` | 39,244 bytes |
| Retained evidence | `ff66516a091af5c85ef8b6b0320419212eb9fa3d6f67fd13e1c5a21ba021c0a6` | 12 controls |

The reader found a complete generation manifest with 0 errors, 174 attempts matching 174 packet rows, and an exact attempt-to-packet join. The 162 corpus contexts cover all 162 occurrences across 24 points. Attempts comprise 54 sent and 120 unsent rows, 0 unmeasured rows, and 0 attempt errors. The reader validated the generated evidence with the frozen judge configuration and withheld model identity. See the [reader coverage](tmp/units/aggregate-successor-model-g2-generation-read.stdout.txt:12), [packet and context counts](tmp/units/aggregate-successor-model-g2-generation-read.stdout.txt:21), and [reader predicates](tmp/units/aggregate-successor-model-g2-generation-read.ts:40).

## Measured costs

The cost reader reported no missing measurement boundary and no cost failures. Wall values are milliseconds; prompt and completion values are token counts.

| Phase | Role | Requests | Wall (ms) | Prompt | Completion | Missing |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| trajectory | summarizer | 54 | 432,178.0927000005 | 38,219 | 6,558 | 0 |
| trajectory | judge | 165 | 617,510.4491999996 | 183,173 | 165 | 0 |
| controls | judge | 25 | 60,682.2630000005 | 18,236 | 25 | 0 |

Replay count: 459. See the [measured costs](tmp/units/aggregate-successor-model-g2-generation-read.stdout.txt:38).

## Process closure and retained logs

The launcher and every recorded stage process closed. The checked process IDs were 60168, 47768, 33160, 66900, 58584, 61248, 66516, 34420, and 5760; each returned gone with no child processes. See the [process closure record](tmp/units/aggregate-successor-model-g2-generation-process-closure.txt:3). The G2 reader copy has SHA-256 `8b08996796bce9a7401f4b23ae8914815383160eacf4c0dd5e613fe37a3012b5`; its only changes from the accepted Q2 reader are the three G2 path literals. It ran offline after generation closure.

Execution and terminal evidence hashes:

| Evidence | SHA-256 |
| --- | --- |
| Outer stdout/journal | `00fb0204c962a70d1c5b9ae42820b2b774b7940335f44cd8a09471abd30bb36c` |
| Outer stderr/status | `c733018437ff009c4958e63a25d3f648e2590b0c851c0cf6679cc0c28447c034` |
| Stage sequence and custody events | `f21e85ef0a139f02585e45e3bc4b5d4c18dcf1a82f6ef21709ac3807c6646d86` |
| Before and after custody files | `bbacc67ccef82ccf2605a149c9929a0d16a209facfc2392ebc8566553620cb17` each |
| G2 reader stdout | `ecd8bcaa575ddac5daf54ee803e4a83d3450909d0f4817b99ba07b9a014b97da` |
| G2 reader stderr | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` (empty) |
| Process closure record | `344a85893f814d630b14386944a6757f4aa79d716f9a6eea3cde48dac281a1e4` |

Stage stdout captures are empty. Stage stderr/status hashes: think0 `b31a652791413ea9a03b08d0d5c6a6065dead4187acf527bdbb8743bdef65a79`; think1 `549ab53cc9696573d62053f19fd623d0689168eb77bd42219b7e74d1535c152a`; corpus `b12ec9c8a7c93937f67f518d6709936e09ae98d57f35549fa8b67860738bdaad`; generation `04f47859e7b34d3d5e8167b36e07e9afdb75590bba60546c85441f54c9939135`. Each records its exit, signal, cap state, and duration. The [execution records](tmp/units/aggregate-successor-model-g2-execution-root.jsonl:16), [stage status](.orkestrel/agent/instruments/results/l15/logs/g2-think0-freeze.err:2), and [process closure record](tmp/units/aggregate-successor-model-g2-generation-process-closure.txt:4) retain the corresponding details.

Generation ended at the accepted boundary. Fitting and labels remain held for root release and the independent blind-label step.
