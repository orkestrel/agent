# Aggregate capacity-probe offline verification, original-path run

The original-path offline gates passed in 2,297 ms with launcher exit 0, signal `none`, and `capped=false`. Runtime imports, constants, packet identity, and source bindings resolved from the original `tmp/units/aggregate-capacity-probe` unit. The evidence output was written to its authorized, initially vacant `independent-check-2` child. No network, model, or service operation ran.

## Commands and exits

The canonical grouped command was:

`node .agents/skills/orkestrel-dispatch/scripts/launch.ts --journal tmp/units/aggregate-capacity-probe-verify-2/verify.stdout.jsonl --errors tmp/units/aggregate-capacity-probe-verify-2/verify.stderr.txt --cap 120 --status -- node tmp/units/aggregate-capacity-probe-verify-2/verify.ts`

The launcher returned exit 0 after 2,297 ms. It recorded PID 70888; `tasklist` returned `INFO: No tasks are running which match the specified criteria.` for that PID, and a Win32 process query found no child whose parent was 70888.

The grouped wrapper ran strict original scoped TypeScript compilation with `node node_modules/typescript/bin/tsc -p tmp/units/aggregate-capacity-probe/tsconfig.json` (exit 0), `node --check` on the derived Validation wrapper (exit 0), and `node --check` on the verifier wrapper (exit 0). The original Validation logic then ran `node --check` for its 9 operator files, `Validation.ts`, and `verify.ts`, plus no-argument offline checks for `main.ts`, `prepare.ts`, `execute.ts`, and `start.ts`; all 15 recorded outcomes exited 0. Their complete stdout and stderr strings are retained in `independent-check-2/offline.json`.

The expected refusal for `Driver.main(['--execute'])` returned its intended exit 64 with the message `Expected every named option exactly once`; this is captured in launcher stderr and did not fail the enclosing verification. The missing-receipt Driver control rejected with `ENOENT` before output creation. The other intended refusals and their assertions are listed in the offline evidence. They are not service execution failures.

## Frozen packet and bindings

The corrected packet SHA-256, read directly from `final-source-inventory.json` and independently computed from the packet bytes, is `27ff15eb80f8dba7d236cdf08e4330a3e37ddd8fd9a46afaf11ddd77f2a9f7d2` (80,122 bytes). The operator digest is `b054ebc86779435ff2935b9a1a669d9a7eac6f20b538ab5fe5d8d6dcce50aa6f`. The packet rebuilt byte-for-byte from original runtime imports and inputs. The final source inventory and packet bytes matched their pre-run snapshots after validation.

The independent binding walk passed for 18 final-inventory source/check entries, the packet and prepared-inventory entries, 35 prepared-inventory file entries, 23 packet bindings, and all 30 request-body files. Packet bindings comprise 9 operator files, 6 retained evidence files, 4 frozen model manifests, and 4 prepared inputs. Each request file matched its vector body byte-for-byte, hash, and declared byte count. The independent binding JSON is separated from the command logs.

The 30 requests have this exact membership and order:

- q2: `q2-positive`, `q2-cache`, `q2-reachability`, `q2-overflow`, `q2-smaller`, `q2-restored`, `q2-generation`
- q4: `q4-positive`, `q4-cache`, `q4-reachability`, `q4-overflow`, `q4-smaller`, `q4-restored`, `q4-generation`
- g2: `g2-positive`, `g2-cache`, `g2-reachability`, `g2-overflow`, `g2-smaller`, `g2-restored`, `g2-generation`
- g4: `g4-positive`, `g4-cache`, `g4-reachability`, `g4-overflow`, `g4-smaller`, `g4-restored`, `g4-generation`
- Mica: `mica-reachability`, `mica-overflow`

The offline assertions verified each chat model's short/cache/adequate/overflow/smaller/restored/generation relationships and fixed body options. Chat requests use `/api/chat` with `think: false`; every body fixes `truncate: false`, `shift: false`, `stream: false`, and `keep_alive: "5m"`. Mica uses `/api/generate`, `raw: true`, `temperature: 1`, and `num_predict: 1`. The largest request is 5,639 bytes against a 32,768-byte request limit. The packet declares 30 inferences, 262,144-byte response and 1,048,576-byte metadata ceilings, 300,000-ms inference and 30,000-ms snapshot timeouts, and a 1,200,000-ms overall duration.

The code at `Driver.ts:76-80` places the `/api/ps` snapshot call immediately after each inference capture in the loop. This is a source-order check only; no inference or dynamic snapshot ran.

## Refusal controls and scope

All 14 original offline controls passed: wrong packet hash, wrong operator hash, occupied output, escaped output, missing receipt, missing host, reserved output name, repeated argument, inference ceiling, request-byte ceiling, request hash, empty plan, explicit execute without options, and Driver execution without a receipt. Their actual assertions ran through the original `validateExecution`, `validateOutput`, `validateBounds`, `readArguments`, and `Driver` implementations. The wrapper changed only the evidence folder from `checks` to the explicitly owned `independent-check-2`; its imports resolve to original source paths.

The final packet hash is recorded here from direct bytes and inventory because the preceding verifier report's hash prose required correction. That earlier report remains unchanged. No claim is made about transport completion, model behavior, capacity, streaming, native partial writes, or daemon lifecycle.

## Bare output and evidence paths

- Launcher stdout journal: `C:\Users\mikes\WebstormProjects\scaffold\tmp\units\aggregate-capacity-probe-verify-2\verify.stdout.jsonl`
- Launcher stderr, including expected argument-refusal output and final launcher exit: `C:\Users\mikes\WebstormProjects\scaffold\tmp\units\aggregate-capacity-probe-verify-2\verify.stderr.txt`
- Launcher status before: `C:\Users\mikes\WebstormProjects\scaffold\tmp\units\aggregate-capacity-probe-verify-2\verify.stdout.jsonl.status-before.txt`
- Launcher status after: `C:\Users\mikes\WebstormProjects\scaffold\tmp\units\aggregate-capacity-probe-verify-2\verify.stdout.jsonl.status-after.txt`
- Launcher PID: `C:\Users\mikes\WebstormProjects\scaffold\tmp\units\aggregate-capacity-probe-verify-2\verify.stdout.jsonl.pid`
- TypeScript stdout/stderr/exit: `C:\Users\mikes\WebstormProjects\scaffold\tmp\units\aggregate-capacity-probe-verify-2\strict-tsc.stdout.txt`, `strict-tsc.stderr.txt`, `strict-tsc.exit.txt`
- Validation-wrapper syntax stdout/stderr/exit: `C:\Users\mikes\WebstormProjects\scaffold\tmp\units\aggregate-capacity-probe-verify-2\verify-validation-syntax.stdout.txt`, `verify-validation-syntax.stderr.txt`, `verify-validation-syntax.exit.txt`
- Verifier-wrapper syntax stdout/stderr/exit: `C:\Users\mikes\WebstormProjects\scaffold\tmp\units\aggregate-capacity-probe-verify-2\verify-wrapper-syntax.stdout.txt`, `verify-wrapper-syntax.stderr.txt`, `verify-wrapper-syntax.exit.txt`
- Full offline syntax/default outcomes and refusal-control names: `C:\Users\mikes\WebstormProjects\scaffold\tmp\units\aggregate-capacity-probe\independent-check-2\offline.json`
- Full source, packet, prepared-file, and request-body binding inventory: `C:\Users\mikes\WebstormProjects\scaffold\tmp\units\aggregate-capacity-probe\independent-check-2\independent-bindings.json`
- Owned wrapper and derived Validation copy: `C:\Users\mikes\WebstormProjects\scaffold\tmp\units\aggregate-capacity-probe-verify-2\`

Launcher status before and after was identical: ` M .orkestrel/agent/instruments/bench4/Driver.mjs`. The only changed artifact under the original unit is the authorized `independent-check-2` evidence directory. The first verifier report was not edited.
