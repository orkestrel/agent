# Q2 calibration generation

The fixed Q2 runner completed the first four planned stages with exit 0 and no cap. Generation completed with 168 attempt rows and 168 packet rows; the saved reader validated all outputs, corpus coverage, evidence, and measured costs. Execution stopped before fitting or labels.

## Command and seals

The exact launched command was:

```text
node .agents/skills/orkestrel-dispatch/scripts/launch.ts --journal tmp/units/aggregate-successor-model-q2-execution-root.jsonl --errors tmp/units/aggregate-successor-model-q2-execution-root.err --cap 2880 --status -- node tmp/units/aggregate-successor-model-run.ts --key q2 --plan 5cd2cb31ae98c6643cdb83d7253c7259cd3afcf1bf3670d70adce270377ec622 --head 34cacc767afd55db97b611645c3e5e7e5c4ab3a2 --build 0db4bd7e9f43a7ba8fff1e79a826a52d114db6c8e90de34b8e139737de43b3fc
```

The accepted plan hash is `5cd2cb31ae98c6643cdb83d7253c7259cd3afcf1bf3670d70adce270377ec622`; runner hash is `2781d346a006a8f2fb343504b4a3682568806a9239b41246ed4d0f3dc28193bb`; build manifest hash is `0db4bd7e9f43a7ba8fff1e79a826a52d114db6c8e90de34b8e139737de43b3fc`. Before and after custody both record HEAD `34cacc767afd55db97b611645c3e5e7e5c4ab3a2`. Their files have matching SHA-256 `9d6f92756d31c26aa41adca33d348d96163630b8d146bdbea2bee7fcf5e11e72`. The runner compared custody before and after every command and at completion. See the [Q2 plan](tmp/units/aggregate-successor-model-q2-plan.json:121), [runner custody assertions](tmp/units/aggregate-successor-model-run.ts:104), [before custody](tmp/units/aggregate-successor-model-q2-execution-custody-before.json:2), and [after custody](tmp/units/aggregate-successor-model-q2-execution-custody-after.json:2).

Other custody hashes held throughout: deployment `40442197423b574b61548feb702b55c948d77f61dd719d9d6b26e24ad3016e19`, seed `c52b71f94ab1c2e742a6d6b698bc8fc278b2de1885e4ebdde75caf733355d15e`, settings `760a4598c84f4e94cd22646959858b20eeab03a4e18494778e33f9849eee9bc9`, and dispatch launcher `059a724ea3483a2c99ccfebc35e0b2e4f420fea8bc8242505f26c3a129910970`. The [before custody record](tmp/units/aggregate-successor-model-q2-execution-custody-before.json:5613) and [after custody record](tmp/units/aggregate-successor-model-q2-execution-custody-after.json:5613) match byte for byte.

## Stages and exits

Each stage ran under its plan cap; all nested launchers reported exit 0, `capped=false`, and no signal. The fixed runner also recorded exit 0 for every stage.

| Stage | Cap | Stage duration (ms) | Runner duration (ms) | Exit |
| --- | ---: | ---: | ---: | ---: |
| `q2-think0-freeze` | 240 s | 1,209 | 1,459.2508 | 0 |
| `q2-think1-freeze` | 240 s | 1,208 | 1,484.7785 | 0 |
| `q2-calibration-corpus` | 240 s | 2,545 | 2,794.4077 | 0 |
| `q2-calibration-generate` | 1,800 s | 586,456 | 586,707.8139 | 0 |

The outer launcher used a 2,880 s cap and reported exit 0, `capped=false`, duration 598,632 ms. The generation reader command, `node tmp/units/aggregate-successor-model-q2-generation-read.ts`, exited 0 in 779 ms with empty stderr. See the [outer result](tmp/units/aggregate-successor-model-q2-execution-root.err:2), [generation result](.orkestrel/agent/instruments/results/l15/logs/q2-calibration-generate.err:2), [stage capture](tmp/units/aggregate-successor-model-q2-execution-root.jsonl:13), and [reader output](tmp/units/aggregate-successor-model-q2-generation-read.stdout.txt:7).

## Validated artifacts and coverage

| Artifact | SHA-256 | Size or count |
| --- | --- | ---: |
| Q2 think0 freeze manifest | `442dfeb697d843e28ab3c8985aabb720d768d9f9646b33a128124a74560b53fd` | 19,384 bytes |
| Q2 think1 freeze manifest | `b356f869b71480ed759e274e2587cf87437c1551987583c2bac81e0e8b4f8f5f` | 19,382 bytes |
| Corpus JSON | `5c18e8b99cf2bc156b8ac274798eff60b70e1f7873f7b35b87c866ef9d589b67` | 3,124,729 bytes |
| Corpus manifest | `b7e8abd32644a89f275b1a3c1d9f62714dc602e9a3a73de992bb63773ababb94` | 551 bytes |
| Generation attempts | `f4c2077126abaf6cfff9d442c951becfd266598926e2773f5c8e19b28b207cb9` | 3,443,128 bytes; 168 rows |
| Generation packet | `a67c510650eaa2ffae29fe5c461fcf56d4cd91e9e3376a3ac4b5fba2b3c14999` | 2,719,417 bytes; 168 rows |
| Generation manifest | `10e654ee24fe25b7a32af7e8f6610467154a8c1c5cc65dcbeeb2c6335e722d23` | 39,235 bytes |
| Retained evidence | `2f699b104cf60656b0a40d5386d5b9c571eb14ca27c24e061687a95cc6ee9e1b` | 12 controls |

The reader found a complete generation manifest with 0 errors, 168 attempts matching 168 packet rows, and an exact attempt-to-packet join. The 162 corpus contexts cover all 162 occurrences across 24 points. Attempts comprise 52 sent and 116 unsent rows, 0 unmeasured rows, and 0 attempt errors. The reader validated the generated evidence with the frozen judge configuration and withheld model identity. See the [reader coverage](tmp/units/aggregate-successor-model-q2-generation-read.stdout.txt:12), [packet and context counts](tmp/units/aggregate-successor-model-q2-generation-read.stdout.txt:21), and [reader predicates](tmp/units/aggregate-successor-model-q2-generation-read.ts:40).

## Measured costs

The cost reader reported no missing measurement boundary and no cost failures. Wall values are milliseconds; prompt and completion values are token counts.

| Phase | Role | Requests | Wall (ms) | Prompt | Completion | Missing |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| trajectory | summarizer | 52 | 111,363.2858000002 | 37,215 | 5,764 | 0 |
| trajectory | judge | 152 | 415,738.5817999999 | 165,311 | 152 | 0 |
| controls | judge | 25 | 55,144.773699999554 | 18,236 | 25 | 0 |

Replay count: 388. See the [measured costs](tmp/units/aggregate-successor-model-q2-generation-read.stdout.txt:38).

## Process closure and retained logs

The launcher and every recorded stage process closed. The checked process IDs were 37536, 62228, 35924, 46472, 43212, 76576, 57116, 19560, and 67880; each returned gone with no child processes. See the [process closure record](tmp/units/aggregate-successor-model-q2-generation-process-closure.txt:3). The Q2 reader copy has SHA-256 `8825310f365954f17cebe08eb588a188dcbc6649f1fe35826557a909b6a5b6a8`; its only changes from the accepted corrected reader are the three Q2 path literals. It was run offline after generation closure.

Execution and terminal evidence hashes:

| Evidence | SHA-256 |
| --- | --- |
| Outer stdout/journal | `0e8dd10577c3fec73b92a0c529c074b7b3e56b96f43842029b059914fa2de4ef` |
| Outer stderr/status | `f4f5a5d3dbd1d23bab0cd9dfb16d7ba6446c50082d3936269c43d2c7291eed61` |
| Stage sequence and custody events | `9b57624bf3b9b568ce281287066babeda710dcbfe82155cea86162cbf9608082` |
| Before and after custody files | `9d6f92756d31c26aa41adca33d348d96163630b8d146bdbea2bee7fcf5e11e72` each |
| Q2 reader stdout | `d180e3350751660b5fcf6602ff8c49c0a3c0e90af992595cb036ca1b367e37fc` |
| Q2 reader stderr | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` (empty) |
| Process closure record | `c6de94f41645dac78faa1b630e1992975b86649104c39bfd644774d1843421f8` |

Stage stdout captures are empty. Stage stderr/status hashes: think0 `83527534d0e02e53ac6a0e2fd765396963f60f357dcdab6b37685d67c2d873b6`; think1 `dd5ecb58e2bfa647ca535ef670baa0520a7377e31a02deefd1cad99e93dc69cf`; corpus `21f51c4cae3bc071d1ebfbbc549f0cfa380913bd1857e21b7c189e5f84d8ccbf`; generation `4c58b54112c5201ecbe2f075a3feaf56000394534286efd1f9f26458afb4d195`. Each records its exit, signal, cap state, and duration. The [execution records](tmp/units/aggregate-successor-model-q2-execution-root.jsonl:16), [stage status](.orkestrel/agent/instruments/results/l15/logs/q2-think0-freeze.err:2), and [process closure record](tmp/units/aggregate-successor-model-q2-generation-process-closure.txt:4) retain the corresponding details.

Generation ended at the accepted boundary. Fitting and labels remain held for root release and the independent blind-label step.
