# Aggregate capacity G2 verifier report 2

Status: **Offline verifier gates complete; root owns acceptance.** This report supersedes the first verifier report only on gate completion and clarified predecessor custody. It does not claim deployed capacity, token fit, or model quality.

## Custody result

The frozen predecessor inventory has 418 files. All 416 files other than `daemon.err` and `daemon.log` retain exact membership, byte length, and SHA-256. Both live log files are at least as long as baseline, and hashing exactly the frozen baseline-length prefix reproduces the baseline hash:

| File | Baseline bytes / SHA-256 | Current bytes / SHA-256 | Prefix SHA-256 | Appended bytes / SHA-256 |
| --- | --- | --- | --- | --- |
| `daemon.err` | 1,220,112 / `a0698dd627435ca44594eb0fcebc108edb543309547dd350ac614539462d3297` | 1,245,122 / `b2998b5d58826b77862e1e658a20296dfa4a086dac18a275ffe0dc131c2a9c05` | `a0698dd627435ca44594eb0fcebc108edb543309547dd350ac614539462d3297` | 25,010 / `989134e44d970e41af3cc2e3335c429b155bdac658195dd1a1c642e4951d971b` |
| `daemon.log` | 15,207 / `39858687286941335a5f5306320472b8b4470633a78d2d22437b811f3de87d12` | 15,809 / `48a12719ee9333fd9373c2f8b69dab15ce3fd55ceb61a12771b9ca1f71dfee29` | `39858687286941335a5f5306320472b8b4470633a78d2d22437b811f3de87d12` | 602 / `fedfa4a255d46bad8d1026f57d957fd5c0623d724fd1ed3a1acd200b1fb52764` |

Full post-gate evidence is in `tmp/units/aggregate-capacity-g2-verification/run-5/log-prefix-custody-final.json`; the final-custody launcher journal also retains its bare JSON output. Its `observedAt` is the actual read's UTC observation time, `2026-10-11T11:48:32.585Z`. The files' `mtime` values are separately and correctly labeled `2026-10-11T11:27:41.433Z` and `.435Z`. The first report's `observedAt` values were derived from `stat.mtime`, not read time; this corrects that label. Prefix preservation proves byte custody only, not why bytes were appended.

The first failed predecessor comparison is superseded by this prefix proof and exact non-log comparison. No packet or operator identity changed. The controlled receipt is retained at its original path and hash below. PID 38284 was no longer visible in a process check by this verification turn; I did not start, stop, signal, or otherwise act on the daemon.

## Gate results

The final canonical verification launch was:

`node .agents/skills/orkestrel-dispatch/scripts/launch.ts --journal tmp/units/aggregate-capacity-g2-verify-report-2e.launch.jsonl --errors tmp/units/aggregate-capacity-g2-verify-report-2e.err --cap 120 --status -- node tmp/units/aggregate-capacity-g2-verification/verify.ts --reuse-passed-run-4`

Result: exit 0, uncapped, 638 ms; launcher PID 59672 and its descendants were gone after completion. Its full gate rows are in `tmp/units/aggregate-capacity-g2-verify-report-2e.launch.jsonl`; command JSON and unfiltered stdout/stderr are under `tmp/units/aggregate-capacity-g2-verification/run-5/` and, for gates reused by command-and-output comparison, the named `run-4/` artifacts.

Strict original-tsconfig typecheck passed (exit 0). Syntax checks passed for all 21 inventoried authored `.ts` sources (exit 0 each); final adapted `Offline.ts` and its entry also passed fresh syntax checks (exit 0 each). The expected refusal witness passed with exit 3 and its required refusal text/global count, while all four defaults (`main.ts`, `prepare.ts`, `execute.ts`, `start.ts`) passed with exit 0 and zero global/native dispatches. The two unique refusal-only sentinel paths under the original assigned unit were vacant before and after the proof. These paths must remain descendants of `UNIT` because unchanged `validateOutput()` enforces that boundary; the final proof and admission evidence remain under the verifier-owned directory. This is the narrow adaptation clarification authorized by root; no runtime code or assertion was changed.

The adapted population proof passed (exit 0): 2 inference vectors, 8 metadata vectors, global/native dispatch counts 0/0. The separate direct `validateExecution` positive admission passed with the real original receipt, exact packet/operator hashes and declared host; its original-unit output sentinel was never created and dispatch counts were 0/0. No valid live `Driver.execute` call was made. No HTTP, inference request, restart, or service call was made. No-service proof counts are 0/0.

The strict check, inventoried-source syntax checks, refusal witness and four default witnesses were reused from `run-4` only after the final wrapper compared each exact command array, expected/actual exit, signal and captured output; the default/refusal validators were applied again to saved output. Their passing bare artifacts are preserved and explicitly referenced in `verification.json`. Final proof-copy and proof-entry syntax checks and the population proof ran against fresh `run-5` copies. No subject gate failure was retried.

## Frozen bindings and identities

Exact packet byte rebuild passed. Packet SHA-256 is `bb7d5de942f9c4e5168fa77d0bb344bcb2d585b931129294b68c74bb8e94bd56` (7,380 bytes); operator SHA-256 is `5504592be3b85761ec98574ac48e95be539998b22da5b42f2d1d5a6b6dbca014` (1,332 bytes). The actual receipt `tmp/units/aggregate-capacity-probe/daemon-start.json` is SHA-256 `19c077e9190accb54e1e791d2be4493412431d22a86778a1b1e229255854a120` (449 bytes; recorded PID 38284).

The generation binding is `695dba977ed20b4221d997a93a34e9cb5a5c7acd831c8fa56cd399d95cd7dab3`; reachability and generation body hashes are `61668937ffba7c3d9205c9660cd7a424f07a6686250b93bf9871050ca6727614` and `08a3a074bd155facceb93e70dd6cba949e6c985d631a4166fce06d508821df48`. The final source inventory is SHA-256 `15f01005e2911617ef95f150f79f4fdca5c0eb32a1b280019e3cb7562f2ac26d` (21,777 bytes). Recomputed source/input/packet-binding/prepared-body/prepared-inventory/evidence-inventory/inventory/operator/packet values all match their frozen declarations. All 97 bound paths match before/after verifier work. Counts: 22 source records (21 authored TypeScript files), 1 input, 19 packet bindings, 5 prepared records, 56 evidence records. The complete binding arrays and before/after rows are retained in `tmp/units/aggregate-capacity-g2-verification/run-5/verification.json` (81,410 bytes), not abbreviated in this report.

The exact proof-only adaptation diff is `tmp/units/aggregate-capacity-g2-verification/run-5/proof-only.diff`; the exact successor verifier-wrapper diff is `tmp/units/aggregate-capacity-g2-verification/run-5/verifier-wrapper.diff`. Proof summary is in `run-5/proof/population.json`; positive admission evidence is in `run-5/positive-admission.json`. The final report's status evidence records the root-owned unrelated bench5 edits visible during both status snapshots.

## Launch history and deviations

- `tmp/units/aggregate-capacity-g2-verify-report-2.launch.jsonl` / `.err`: exit 1, uncapped, 104 ms. A verifier-owned string interpolation produced invalid TypeScript in the new custody comparison; no gates ran.
- `tmp/units/aggregate-capacity-g2-verify-report-2b.launch.jsonl` / `.err`: exit 1, uncapped, 3,363 ms. Typecheck, all source syntax, expected refusal and four defaults passed; population proof exposed a relative-import error in my copied proof. No runtime source changed.
- `tmp/units/aggregate-capacity-g2-verify-report-2c.launch.jsonl` / `.err`: exit 1, uncapped, 3,122 ms. The same unchanged gates passed; I had corrected the runtime imports but missed the proof's separate `aggregate-judge-counterfactual` helper import.
- `tmp/units/aggregate-capacity-g2-verify-report-2d.launch.jsonl` / `.err`: exit 1, uncapped, 3,165 ms. Those gates passed and imports resolved; unchanged `validateOutput()` rejected an out-of-UNIT refusal-only sentinel before the intended negative check. No output was created. Root then authorized unique vacant sentinel paths within original `UNIT`, with verifier proof artifacts remaining in the verifier-owned directory.
- Final gate launch `...verify-report-2e...`: exit 0, uncapped, 638 ms, as recorded above.
- Post-gate prefix custody launch: `node .agents/skills/orkestrel-dispatch/scripts/launch.ts --journal tmp/units/aggregate-capacity-g2-verify-final-custody.launch.jsonl --errors tmp/units/aggregate-capacity-g2-verify-final-custody.err --cap 120 --status -- node tmp/units/aggregate-capacity-g2-verification/predecessor-prefix-final.ts`; exit 0, uncapped, 160 ms. PID 53032 and descendants were gone after completion. This independently rechecked all 418 files after the proof/admission gates.

The failed launches were verifier adaptation errors, not subject failures; their full bare outputs remain intact. The earlier immutable report remains unchanged and is superseded only as stated above. No preparation/check script, runtime, packet, source, service, or Git state was mutated by this verifier.