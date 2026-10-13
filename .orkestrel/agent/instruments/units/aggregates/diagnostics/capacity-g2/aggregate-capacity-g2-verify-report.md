# Aggregate capacity G2 verifier report

Status: **STOPPED — predecessor custody mismatch; acceptance gates incomplete.** This report records a deviation under the checked brief's stop-and-report contract. Root owns acceptance.

## Expected / found

Expected predecessor custody to match the frozen `predecessor-before.json` inventory (418 files). Found 418 files, with two byte/hash mismatches. Stable reads at `2026-10-11T11:27:41.433Z` / `.435Z`:

- `tmp/units/aggregate-capacity-probe/daemon.err`: expected 1,220,112 bytes, SHA-256 `a0698dd627435ca44594eb0fcebc108edb543309547dd350ac614539462d3297`; found 1,245,122 bytes, SHA-256 `b2998b5d58826b77862e1e658a20296dfa4a086dac18a275ffe0dc131c2a9c05`.
- `tmp/units/aggregate-capacity-probe/daemon.log`: expected 15,207 bytes, SHA-256 `39858687286941335a5f5306320472b8b4470633a78d2d22437b811f3de87d12`; found 15,809 bytes, SHA-256 `48a12719ee9333fd9373c2f8b69dab15ce3fd55ceb61a12771b9ca1f71dfee29`.

Evidence: `tmp/units/aggregate-capacity-g2-verification/predecessor-drift.json`; frozen inventory: `tmp/units/aggregate-capacity-g2-control/predecessor-before.json`. The controlled daemon PID 38284 remained running. One hypothesis is that it appended to its log files after the frozen baseline; this is not established as fact.

## Completed work and evidence

- Read the complete writer report and proof/runtime sources, the required scaffold contracts/rules/dispatch skill and launch reference, and this verifier brief.
- Created verifier-owned `tmp/units/aggregate-capacity-g2-verification/` only. Adapted proof copy: `Offline.ts`; entry: `population.ts`; exact adaptation diff: `proof-only.diff`; diff stderr: `proof-only.diff.stderr.txt` (empty). The adaptation preserves substantive assertions and points imports at the unchanged original runtime; proof evidence and scratch paths point inside the verifier-owned directory.
- Before stopping, verified source, input, packet, prepared-body, prepared-inventory and evidence-inventory bindings, exact packet-byte rebuild and exact operator-byte identity against the completed writer report. Values remained: packet SHA-256 `bb7d5de942f9c4e5168fa77d0bb344bcb2d585b931129294b68c74bb8e94bd56` (7,380 bytes); operator SHA-256 `5504592be3b85761ec98574ac48e95be539998b22da5b42f2d1d5a6b6dbca014` (1,332 bytes); generation SHA-256 `695dba977ed20b4221d997a93a34e9cb5a5c7acd831c8fa56cd399d95cd7dab3`; reachability body SHA-256 `61668937ffba7c3d9205c9660cd7a424f07a6686250b93bf9871050ca6727614`; generation body SHA-256 `08a3a074bd155facceb93e70dd6cba949e6c985d631a4166fce06d508821df48`; source inventory SHA-256 `15f01005e2911617ef95f150f79f4fdca5c0eb32a1b280019e3cb7562f2ac26d` (21,777 bytes). These are the previously independently recorded writer values; the verifier wrapper reached and passed its source/input/packet/prepared/evidence comparisons and packet/operator rebuild checks before stopping at predecessor comparison. The launcher retains the terminal mismatch, not per-check stdout.
- Predecessor custody was checked and failed as detailed above. No evidence supports claiming all bound files stayed unchanged after proof work.
- No HTTP, daemon restart, inference, or service request was made by this verifier. Thus no-service witness counts are **not applicable / not collected**.

## Commands and bare outcomes

Canonical launcher attempts were retained as full stdout, stderr, PID, before-status and after-status artifacts:

- `tmp/units/aggregate-capacity-g2-verify.launch.jsonl` / `.err` / `.pid` / `.status-before.txt` / `.status-after.txt`: exit 1, uncapped, 111 ms. Verifier wrapper round-trip failed due to an adaptation formatting issue; no scoped gates ran.
- `tmp/units/aggregate-capacity-g2-verify-2.launch.jsonl` / `.err` / `.pid` / `.status-before.txt` / `.status-after.txt`: exit 1, uncapped, 111 ms. Verifier-owned prior empty proof directory triggered its initial occupied-path guard; no scoped gates ran.
- `tmp/units/aggregate-capacity-g2-verify-3.launch.jsonl` / `.err` / `.pid` / `.status-before.txt` / `.status-after.txt`: exit 1, uncapped, 181 ms. Evidence inventory comparison ordering issue; no scoped gates ran.
- `tmp/units/aggregate-capacity-g2-verify-4.launch.jsonl` / `.err` / `.pid` / `.status-before.txt` / `.status-after.txt`: exit 1, uncapped, 262 ms. Source/input/packet/prepared/evidence checks and exact packet rebuild/operator identity passed, then predecessor comparison failed. Error tail is retained in `tmp/units/aggregate-capacity-g2-verify-4.err`. Launcher reported `exit=1 signal=none capped=false duration_ms=262`; recorded PID 49080 was no longer present after completion. Before/after repository status records agree and contain only the pre-existing unrelated `M .orkestrel/agent/instruments/bench4/Driver.mjs`.

Strict original-tsconfig typecheck, authored-source syntax sweep, witness-negative expected exit 3, default entries, adapted population proof, and positive `validateExecution` admission were **not run**, because the required predecessor check failed first. No command is claimed to have demonstrated those outcomes. No retry or source repair was performed.

## Deviation

Expected predecessor custody exact match; found two changed live daemon log files. Evidence is `predecessor-drift.json` and the frozen inventory cited above. Completed the binding and packet checks and retained the proof adaptation; stopped before all scoped gates. The likely explanation is continued daemon log append after baseline, but the evidence does not establish causation. This report is immutable and created once.