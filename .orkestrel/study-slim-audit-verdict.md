# Integrated extraction ruling

This round decides whether the Study extraction and Agent consumer can land before another
model attempt. The reviewed source is Study `b6b2fed` and isolated Agent `7018039`.

Actual Opus ran independent design-fit and correctness lanes with the same claims, diff and
status. Sessions `2d254ccf-f4ba-4b64-a7e6-71bf93d5732c` and
`95fa6ef9-7b2b-4e4c-be9c-e70fb8a054f6` returned uncapped after 301026 ms and 345351 ms.
Both ruled `FAIL 3, 4, 5; outside the claims: none`. Original reports contain invalid abbreviated
citations and diff offsets; those coordinates are discarded. Citation-only errata resumed the
same lanes, with no new audit or cross-lane exposure, and completed in 63115 ms and 73891 ms.
The original reports remain immutable.

The canonical citation script still splits paths at `@orkestrel`. Root verified the complete
absolute paths and line bounds against the reviewed commit and unchanged built artifacts:
70 design citations and 86 correctness citations resolve. Root also read the owning source,
consumer diff and actual host output. Neither model claimed to run the reproductions.

| Claim | Ruling and bounds | Repair |
| --- | --- | --- |
| Ownership | Confirmed. Prompts, role policy, provenance, lookup/file semantics and grading stay in Agent. The promoted exports have real consumers. The distinct session lifecycles and settlement policies do not collapse into one generic class. | none |
| Treatment preservation | Confirmed for supported consumer profiles and lifecycle. Wire settings, canonical summary instruction, projection comparison, identities and row order are preserved. No retry was introduced. | retain existing consumer proofs |
| Trace custody | Broken: repeated or concurrent flush duplicates rows; starting over an active goal loses rows. The current consumer's serial finally-flush path is unaffected. | refuse active replacement and concurrent flush; inactive flush is a no-op; clear rows/goal/phase in finally; preserve live-buffer append and trial-wide counters |
| Script settlement | Broken: generator return after a content yield skips catch and finish, leaving an admitted ticket unsettled. The current tools consumer drains the stream and is unaffected. | fail only the unsettled ticket in finally with agent attribution; preserve first failure and clear running state even if settlement throws |
| Summary bound | Broken: a non-finite limit bypasses refusal. Root reproduced the same bypass through a non-finite gauge. Valid consumer settings already satisfy the declared numeric bounds. | validate owned limit and gauge values; snapshot gauge scalars; preserve the comparison, canonical messages, accounting and errors for valid consumers |
| Proof/guide | Existing moved assertions still discriminate the behaviors they name. Public lifecycle omissions are covered by the repaired claims, not by prior green gates. | add focused proofs and matching contract prose |

Root's reproduction imported the physical built server artifact, not source aliases. It used
actual meters and provider fixtures. The unchanged probe collected 10 tests and failed 10,
exit 1 uncapped in 851 ms: duplicate and overlapping custody, active replacement, abandoned
stream, invalid numeric limits and non-finite gauge. These are reachable failures, not import
or type errors. The gauge extension is a wider reproduction of the bound defect; its repair
gets a focused independent review because it extends the auditors' numeric-limit prescription.

The lanes differed on whether an inactive flush should throw. Root adopts the design lane's
no-op after goal end and the correctness lane's concurrent-flush guard. Both prevent duplicate
custody; a sink failure still ends the goal. No snapshot may lose rows appended during a flush.
No abandoned stream may be finished as successful. No finite input used by the consumer may
be repriced. The repair is the Sonnet unit `study-slim-lifecycle-fix`; no whole-surface audit
restart is authorized. No outside finding or performance advisory was substantiated.

The round remains open until repaired proofs, the focused review and final gates close.

Sonnet resumed session `6d4efc77-910d-4888-ab47-515ec16f9c91` and completed the bounded
repair in 132049 ms uncapped. Root kept the explicit unsettled guard before allocating the
abandonment error. An expanded async fixture hook exposed one TS2322 error; root made the
existing callback return void explicitly without changing its assertions. The repeated
typecheck passed in 3763 ms, owning tests passed 72 in 2707 ms, setup passed 23 in 1245 ms,
build passed in 24413 ms and guides passed 13 in 6032 ms. All exits were 0 and uncapped.

The unchanged physical-package reproduction then passed all 10 tests, exit 0 uncapped in
872 ms. The repaired server artifact hashes to
`01bff1edf977435415d21bb572150ae6434fb900a65dd3c53c877720a6304ecd`.
Root's additional controls removed active-start refusal, abandoned-ticket settlement and
gauge copying separately. Each owning assertion failed under its mutation and passed after
restoration; the batch exited 0 uncapped in 11692 ms. These controls prove discrimination of
the repaired invariants, not arbitrary external provider behavior.

The focused independent Opus review is session `80e0f455-b2dd-4546-ad8d-512ad2b877f5`.
It is bounded to repaired claims 3, 4 and 5; it cannot reopen the accepted ownership design.
