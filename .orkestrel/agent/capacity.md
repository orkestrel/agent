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

Final capacities and caps will be recorded here before implementation and frozen before a full run. Neither a larger context nor a passed canary guarantees task quality across the horizon.
