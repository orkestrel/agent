# Thinking capacity repair

Active from 2026-10-14. The user requests fixing overflow, failing early on unusable configurations, and allowing comfortable but finite execution. The previous thinking series is closed and retained at agent commit `6ee0ba7`; its scaffold report is committed at `166f3a15e`.

## Exit criterion

Align prompt planning with the output allowance, prove early termination and finite execution, then run a separately frozen comparison after a bounded capacity preflight passes. Retain failed probes and old trajectories. Report coverage, truncation, operational validity, and blind quality separately; a conclusive measurement need not favor either arm or establish production readiness.

The original harness and manifests remain immutable. The successor uses a separate source/build tree and new manifests. No package version bump or publication is requested.

## Evidence and decisions

The original provider uses context 3584 and output cap 1024, while records planning reserves 512. The q4 records overflow sequence contains a request with prompt 3444 and completion 140, a subsequent HTTP 400 for a 3630-token prompt, and a further accepted request before the trajectory stops. The original per-request timeout is one hour and the trajectory wall limit is eight hours; the latter is checked at request boundaries.

The scoped repair is medium: capacity and termination change the harness protocol. One Astra analyst supplies the open-shape design opinion. Root decides the contract; a bounded Sol implementation follows, then an independent Astra review and Luna scoped gates. Live model calls remain serial on the shared GPU. Independent source work and later blind labeling may run in parallel.

## Routing and progress

- Luna scout: exact capacity, wire, failure, and build-isolation evidence; report in `tmp/units/c1-capacity-scout-report.md`.
- Astra analyst: one bounded design opinion; brief in `tmp/units/c1-capacity-design-brief.md`.
- Luna verifier: dedicated-daemon health and exact retained start configuration, without process changes.
- Isolated implementation and qualification driver are built. Independent Luna gates passed fourteen continuous tests and eight driver tests, with the original source unchanged.
- Independent Astra review found an explicit-truncation acceptance/resume defect, reproduced by root, and insufficient attribution in deadline tests. The prescribed fixes and the separately reviewed Agent lifetime correction are closed by thirteen independent root mutation controls and twenty-seven passing Luna protocol tests. Acceptance and limits are retained in `capacity-proof.md`.
- The dedicated daemon started at 12:53 UTC under a 24-hour launcher cap, launcher PID 12596, daemon PID 28348, port 11435. Its receipt is `tmp/units/c1-capacity-daemon-start.json`; port 11434 remains outside this work.

## Accepted successor contract

The initial profile uses physical context 12288, decision output 4096 including thinking, and safety 512. Records receives logical capacity 11776 and predict 4096. Compaction uses the same remaining prompt budget with calibration and drift allowance. Summary output is capped at 2048 with thinking off. The sole permitted output escalation is context 16384, decision output 8192, safety 512, preserving prompt room. A summary limit, hardware fault, timeout, or protocol failure does not authorize that escalation.

Decision/summary requests have 180-second deadlines (360 seconds in the extended profile); auxiliary calibration/judge/flush/metadata requests have 90 seconds after the measured prefill correction below. A goal has 15 minutes and 128 fresh wire requests. An evaluation trajectory has four hours, 4096 calls, eight million prompt-plus-completion tokens, and the original 96 goals. The complete serial series has 12 hours. Every actual request composes request, goal, trajectory, and series cancellation, including response consumption. Operational retries are disabled.

The provider's timeout implements the per-request bound. The encompassing agent timeout must use the goal bound: applying the request timeout to an entire multi-call response would silently shorten the advertised goal allowance. Root found that mismatch during timer attribution and assigned the two agent-level settings plus a real cumulative-call regression; the provider deadline remains unchanged. An independent narrow review covers this added lifetime claim.

The raw recorder retains the first capacity, truncation, usage, transport, or deadline failure and prohibits further requests. Ordinary model failures remain benchmark outcomes under continue. Only verified context exhaustion is an expected full-history control outcome; memory allocation failures and output truncation with context remaining are invalid. A series stops on operational invalidity and cannot silently skip an invalid prior run.

The successor source is isolated at `instruments/harness-capacity/` (checkpoint `7e4b5d9`), with a separate emitted build and a junction to the original pinned dependency directory. No dependency is installed or changed. Sol owns its continuous implementation/tests; a separate Sol unit owns `tools/capacity/` for the disjoint qualification driver. The driver's public synthetic fixture runs the same model/arm population under a 30-minute, 512-call, one-million-token qualification cap. It requires an independent proof receipt before live execution. An Astra reviewer and Luna verifier will examine the integrated change before qualification.

Neither a larger context nor a passed canary guarantees task quality across the horizon. New measurements will remain separate from the original comparison because prompt and generation budgets changed.

The qualification fixture uses one synthetic shift, twelve arrivals plus an opening, and four goals at the shift boundary. The canonical workload validator requires four products per shift and boundary-aligned goals; the initial proposed six-shift/four-goal fixture was incompatible. The fixture was corrected before any live call. It stresses initial selection, compaction, lookups, and subsequent products, and makes no claim to prove cross-shift behavior.

## First live preflight and bounded prefill correction

The first initial-profile attempt is retained at `tmp/units/c1-capacity-initial-live`. It stopped during calibration after 30010ms, before any goal: one actual model request, output cap 1, physical context 12288, and no terminal usage returned. The qualifier made eight total HTTP calls and exited 3 uncapped in 31414ms; no later cell started. The daemon loaded the complete decision model in VRAM (3406833908 bytes) at context 12288. Its diagnostic prompt had 9668 tokens; processing reached 6656 before cancellation. Observed progress projects about 44–45 seconds for that cold prefill.

Root explicitly revised only the shared auxiliary deadline to 90000ms, using the harness's existing frozen flag. Independent narrow review `c1-capacity-prefill-review.md` accepts that measured allowance and its consequence: direct metadata and judge stalls also receive up to 90 seconds. Both models and arms use the same revised setting; all context, output, request, goal, call/token and outer bounds stay fixed. The original harness-capacity build, failed manifests, and first proof remain immutable. This timeout does not authorize the output-only extended profile. New proof and attempt names carry `prefill`.
