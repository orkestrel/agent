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
- Implementation, independent review, proofs, preflight, and successor trajectories remain pending.

## Accepted successor contract

The initial profile uses physical context 12288, decision output 4096 including thinking, and safety 512. Records receives logical capacity 11776 and predict 4096. Compaction uses the same remaining prompt budget with calibration and drift allowance. Summary output is capped at 2048 with thinking off. The sole permitted output escalation is context 16384, decision output 8192, safety 512, preserving prompt room. A summary limit, hardware fault, timeout, or protocol failure does not authorize that escalation.

Decision/summary requests have 180-second deadlines (360 seconds in the extended profile); judge/flush/metadata requests have 30 seconds. A goal has 15 minutes and 128 fresh wire requests. An evaluation trajectory has four hours, 4096 calls, eight million prompt-plus-completion tokens, and the original 96 goals. The complete serial series has 12 hours. Every actual request composes request, goal, trajectory, and series cancellation, including response consumption. Operational retries are disabled.

The raw recorder retains the first capacity, truncation, usage, transport, or deadline failure and prohibits further requests. Ordinary model failures remain benchmark outcomes under continue. Only verified context exhaustion is an expected full-history control outcome; memory allocation failures and output truncation with context remaining are invalid. A series stops on operational invalidity and cannot silently skip an invalid prior run.

The successor source is isolated at `instruments/harness-capacity/` (checkpoint `7e4b5d9`), with a separate emitted build and a junction to the original pinned dependency directory. No dependency is installed or changed. Sol owns its continuous implementation/tests; a separate Sol unit owns `tools/capacity/` for the disjoint qualification driver. The driver's public synthetic fixture runs the same model/arm population under a 30-minute, 512-call, one-million-token qualification cap. It requires an independent proof receipt before live execution. An Astra reviewer and Luna verifier will examine the integrated change before qualification.

Neither a larger context nor a passed canary guarantees task quality across the horizon. New measurements will remain separate from the original comparison because prompt and generation budgets changed.
