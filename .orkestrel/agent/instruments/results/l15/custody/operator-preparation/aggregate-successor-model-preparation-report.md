# Remaining calibration preparation

Completed temporary preparation for g4, q2, and g2. No runner or model execution occurred. No network/service request, source/build edit, fit, label generation, Git command, or canonical mutation occurred. Builder executed the brief directly and spawned nothing.

The plan preparer allows only g4/q2/g2, refuses existing key-specific freeze/calibration/output/log/cache and owned plan/diff destinations, and uses the accepted emitted readBuild/readMatrixFiles/hashFile primitives. Build and deployment seals were checked before materialization and the checked custody matched before writing. Root retains HEAD, service, launch, and acceptance ownership. Evidence: tmp/units/aggregate-successor-model-plan.ts:15, tmp/units/aggregate-successor-model-plan.ts:17, tmp/units/aggregate-successor-model-plan.ts:32, tmp/units/aggregate-successor-model-plan.ts:79, tmp/units/aggregate-successor-model-plan.ts:90.

Exact adaptations are retained as full-file line diffs in tmp/units/aggregate-successor-model-plan.diff:1 and tmp/units/aggregate-successor-model-run.diff:1. Per-key operator deltas are in tmp/units/aggregate-successor-model-g4-operators.diff:1, tmp/units/aggregate-successor-model-q2-operators.diff:1, and tmp/units/aggregate-successor-model-g2-operators.diff:1. The diff files preserve every predecessor and successor line, normalizing line endings to LF.

The preparer changes the Q4 fixed selection to the validated key, replaces whole-l15 absence with key-specific absence, preserves original operator properties, changes only l14 path segments to l15 and the deployment filename to aggregate-successor-daemon-deployment.json, appends --url http://127.0.0.1:11435, and renumbers the selected sequence from 1. It retains the prior seed, settings, model, sampler options, stage caps, expected outputs, labels, and held fit command. It adds exact materialized-plan comparison, inverse operator comparison, a changed-cap negative control, custody checks, and owned adaptation diffs. Shared script diffs were create-only materialized with g4, the first prepared key. Evidence: tmp/units/aggregate-successor-model-plan.ts:29, tmp/units/aggregate-successor-model-plan.ts:42, tmp/units/aggregate-successor-model-plan.ts:81, tmp/units/aggregate-successor-model-plan.ts:92, tmp/units/aggregate-successor-model-plan.ts:119.

The successor runner requires --key, --plan SHA256, --head SHA1, and --build SHA256. The validated key alone selects its plan and temporary execution prefix. The root-supplied --plan replaces Q4's embedded plan seal. Per-key generation caps are fixed from the prior plan. The pre-fit selection, argv/launcher/status/cap/endpoint assertions, deployment seal, source/build/matrix/launcher/runner/plan/deployment/seed/settings custody, before/between/after comparisons, refusal of destinations, output checks, and exit handling are retained. Evidence: tmp/units/aggregate-successor-model-run.ts:13, tmp/units/aggregate-successor-model-run.ts:30, tmp/units/aggregate-successor-model-run.ts:52, tmp/units/aggregate-successor-model-run.ts:54, tmp/units/aggregate-successor-model-run.ts:81, tmp/units/aggregate-successor-model-run.ts:98, tmp/units/aggregate-successor-model-run.ts:104, tmp/units/aggregate-successor-model-run.ts:140, tmp/units/aggregate-successor-model-run.ts:148, tmp/units/aggregate-successor-model-run.ts:154.

On Windows PowerShell from C:/Users/mikes/WebstormProjects/scaffold, these commands completed:

- node --check tmp/units/aggregate-successor-model-plan.ts: exit 0.
- node --check tmp/units/aggregate-successor-model-run.ts: exit 0; parses only, executes no runner statements.
- node tmp/units/aggregate-successor-model-plan.ts --key g4: exit 0, 1946 ms.
- node tmp/units/aggregate-successor-model-plan.ts --key q2: exit 0, 2385 ms.
- node tmp/units/aggregate-successor-model-plan.ts --key g2: exit 0, 2847 ms.
- node --check tmp/units/aggregate-successor-model-plan.ts after the local path correction: exit 0.
- Get-FileHash -Algorithm SHA256 on the owned scripts, plans, and diffs: exit 0; hashes below.

Every materialized operator compared equal to its corresponding prior command after reversing only the permitted substitutions and restoring its prior sequence. The endpoint suffix and successor sequence were separately asserted. The changed-cap control failed the same deep comparison as required, for each operator. Coverage is exact private command-plan adaptation, not model behavior or quality. Evidence: tmp/units/aggregate-successor-model-plan.ts:92, tmp/units/aggregate-successor-model-plan.ts:96, tmp/units/aggregate-successor-model-plan.ts:101, tmp/units/aggregate-successor-model-plan.ts:113, tmp/units/aggregate-successor-model-plan.ts:114.

The first g4 preparation attempt exited 1 before writing any plan because hashFile preserved slash spelling in its returned path: the before path used node:path.join and the second used the slash-separated plan deployment string. Both deployment hashes were 40442197423b574b61548feb702b55c948d77f61dd719d9d6b26e24ad3016e19; source/build had not drifted. The owned preparer now resolves that second path before comparison, and the same preparation completed. Evidence: tmp/units/aggregate-successor-model-plan.ts:90. No unowned change or deviation remains.

All stage destinations below are relative to .orkestrel/agent/instruments/results/l15. The plan retains a held fit cap of 240 seconds; the runner executes only through generation.

| Key | Stage | Cap seconds | Output directory |
| --- | --- | ---: | --- |
| g4 | think0 freeze | 240 | g4-think0/freeze |
| g4 | think1 freeze | 240 | g4-think1/freeze |
| g4 | corpus | 240 | calibration/g4/corpus |
| g4 | generation | 1800 | calibration/g4/generation |
| g4 | fit held | 240 | calibration/g4/fit |
| q2 | think0 freeze | 240 | q2-think0/freeze |
| q2 | think1 freeze | 240 | q2-think1/freeze |
| q2 | corpus | 240 | calibration/q2/corpus |
| q2 | generation | 1800 | calibration/q2/generation |
| q2 | fit held | 240 | calibration/q2/fit |
| g2 | think0 freeze | 240 | g2-think0/freeze |
| g2 | think1 freeze | 240 | g2-think1/freeze |
| g2 | corpus | 240 | calibration/g2/corpus |
| g2 | generation | 1800 | calibration/g2/generation |
| g2 | fit held | 240 | calibration/g2/fit |

Stage destinations and caps: tmp/units/aggregate-successor-model-g4-plan.json:11, tmp/units/aggregate-successor-model-g4-plan.json:49, tmp/units/aggregate-successor-model-g4-plan.json:87, tmp/units/aggregate-successor-model-g4-plan.json:121, tmp/units/aggregate-successor-model-g4-plan.json:159; tmp/units/aggregate-successor-model-q2-plan.json:11, tmp/units/aggregate-successor-model-q2-plan.json:49, tmp/units/aggregate-successor-model-q2-plan.json:87, tmp/units/aggregate-successor-model-q2-plan.json:121, tmp/units/aggregate-successor-model-q2-plan.json:159; tmp/units/aggregate-successor-model-g2-plan.json:11, tmp/units/aggregate-successor-model-g2-plan.json:49, tmp/units/aggregate-successor-model-g2-plan.json:87, tmp/units/aggregate-successor-model-g2-plan.json:121, tmp/units/aggregate-successor-model-g2-plan.json:159.

For each key, freeze expects manifest.json; corpus expects corpus.json and manifest.json; generation expects attempts.jsonl, packet.jsonl, and manifest.json; held fit expects fit.json. New generation cache is calibration/<key>/cache. The original corpus seed cache remains the l5 pilot-resumption/cache. Logs are logs/<stage-id>.jsonl and logs/<stage-id>.err, including held fit log destinations. Launcher .pid, .status-before.txt, and .status-after.txt companions are refused too. Future sequence and custody paths are tmp/units/aggregate-successor-model-<key>-execution-sequence.jsonl, -custody-before.json, and -custody-after.json. Evidence: tmp/units/aggregate-successor-model-plan.ts:59, tmp/units/aggregate-successor-model-plan.ts:65, tmp/units/aggregate-successor-model-run.ts:81, tmp/units/aggregate-successor-model-run.ts:83.

The required outer cap for each future pre-fit execution is 2880 seconds: 240 + 240 + 240 + 1800 = 2520 seconds in preserved inner caps, plus the accepted Q4 runner's 360-second slack. Root sets the actual launch cap. Evidence: tmp/units/aggregate-successor-q4-execution-run.ts:1, tmp/units/aggregate-successor-model-run.ts:1, tmp/units/aggregate-successor-model-run.ts:54; fixed prior caps: tmp/units/aggregate-final-calibration-command-plan-2.json:12, tmp/units/aggregate-final-calibration-command-plan-2.json:332, tmp/units/aggregate-final-calibration-command-plan-2.json:400, tmp/units/aggregate-final-calibration-command-plan-2.json:468.

Future invocation syntax, prepared only and not executed:

```text
node .agents/skills/orkestrel-dispatch/scripts/launch.ts --journal tmp/units/aggregate-successor-model-<key>-execution-root.jsonl --errors tmp/units/aggregate-successor-model-<key>-execution-root.err --cap 2880 --status -- node tmp/units/aggregate-successor-model-run.ts --key <key> --plan <plan-sha256> --head 5ef0eb4fa719386ab7ba9c2dba542552231e6c8e --build 0db4bd7e9f43a7ba8fff1e79a826a52d114db6c8e90de34b8e139737de43b3fc
```

Root release must supply the matching validated key and exact plan hash below, retain the accepted HEAD/build and fixed deployment seal, and independently confirm the dedicated endpoint before launching. The runner stops after generation; blind labels, adjudication, and fit release remain separate. Evidence: tmp/units/aggregate-successor-model-run.ts:36, tmp/units/aggregate-successor-model-run.ts:42, tmp/units/aggregate-successor-model-run.ts:104, tmp/units/aggregate-successor-model-run.ts:153.

| Owned artifact under tmp/units | SHA256 |
| --- | --- |
| aggregate-successor-model-plan.ts | 2e3466afcdbc4dd25c1b9f8c6e9c8722cd47a54afa0e0859c3a10a5598d747ba |
| aggregate-successor-model-run.ts | 2781d346a006a8f2fb343504b4a3682568806a9239b41246ed4d0f3dc28193bb |
| aggregate-successor-model-g4-plan.json | 0e091e45ed2d7ead59ee486565b1c702d96b7338190487a980fda3cd1de3bb22 |
| aggregate-successor-model-q2-plan.json | 5cd2cb31ae98c6643cdb83d7253c7259cd3afcf1bf3670d70adce270377ec622 |
| aggregate-successor-model-g2-plan.json | 4f875648d30934971697bd0959cc148ac32b5ddbb7b431dc3f672177a82c2619 |
| aggregate-successor-model-plan.diff | bbf37bc7fd57bf60b090b46c74399459a9fe0b8c49bcf0e36aa19758bf486005 |
| aggregate-successor-model-run.diff | c0066e6631de419d144c5395d8b4c2631d8d8f92284a36a277f3e83ff52533d5 |
| aggregate-successor-model-g4-operators.diff | 53a8eab1f59d4f5f1e9c101e2cab0cf3f719e828981602b2b27bd89516417c06 |
| aggregate-successor-model-q2-operators.diff | 1902c3d15fb46e1eb3ffab68a6e2a317473a6a632a3a20b73eb8d9f758adf2a7 |
| aggregate-successor-model-g2-operators.diff | 97ca48439239ffd3c1c64a1e631642fd7a802a30420945487f04806a8b8c76f5 |

Measurement is preparation only. No model or quality result is claimed.

Citation check: node .agents/skills/orkestrel-dispatch/scripts/cite.ts tmp/units/aggregate-successor-model-preparation-report.md exited 0, with 61 citations and 0 unresolved.
