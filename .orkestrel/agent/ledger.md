# Ledger writes ledger

| Date | Unit | Role | Carrier |
| --- | --- | --- | --- |
| 2026-11-09 | The user's ruling: taverna uses Agent's records strategy instead of compaction | user | `plan.md` § Goal and exit criterion |
| 2026-11-09 | The ledger writes design | `planner` on `opus` | `plan.md` § Claims |
| 2026-11-09 | The build, and its repair of F1 and the smaller items | `builder` on `opus` | the commit that carries this row |
| 2026-11-09 | The Orchestrator's closure read of F1, and its full-chain verification | Orchestrator | the commit that carries this row |
| 2026-11-09 | Independent review: PASS on claims 1 to 6; F1, a write-then-verify read refused as a repeat, ruled a fix | `reviewer` on `sonnet` | `plan.md` § Claims |
| 2026-11-10 | The user's ruling: superseded findings leave the `recall` offer, items 1 and 57 | user | `plan.md` § Claims |
| 2026-11-10 | The answer pass bound and the `recall` offer, claims 8 and 9 | `builder` on `opus` | the commit that carries this row |
| 2026-11-10 | The user's ruling: fix the Agent gaps the build's census found, so the first pass joins claim 8 | user | `plan.md` § Claims |
| 2026-11-10 | Claim 8 widened to every pass that advertises no tools | `builder` on `opus` | the commit that carries this row |
| 2026-11-10 | Independent review of claims 8 and 9: FAIL 3, the answer pass's `limit: 1` capped a host scope that advertised tools; the untested `'stray'` event and the `stop` name noted | `reviewer` on `sonnet` | `plan.md` § Claims |
| 2026-11-10 | The review's repair: `limit: 1` dropped, the `'stray'` abort event tested, `abort` and `aborted` named | `builder` on `opus` | the commit that carries this row |
| 2026-11-10 | Re-check of the repair: PASS, the stray-stop mutation replayed | `reviewer` on `sonnet` | the commit that carries this row |
| 2026-11-10 | Gates on the repaired tree: format, lint, check, `test:src` 2684, `test:policy` 179 plus 1 skipped, `test:config` 544 plus 1 skipped, `test:setup` 353, `test:guides` 207 | `verifier` on `haiku` | the commit that carries this row |
| 2026-11-10 | The gauge identity across a hydrate, claim 10, on taverna's CRM premise probes | `opus` on `opus` | the commit that carries this row |
| 2026-11-10 | Independent review of claim 10: FAIL 7 on one guide sentence that overclaimed for a tool added after construction; claims 1 to 6 held, the mutation replayed | `reviewer` on `sonnet` | the commit that carries this row |
| 2026-11-10 | The prose correction in the guide, its guide test, and the plan; format, lint, and `test:guides` 208 rerun | Orchestrator | the commit that carries this row |
| 2026-11-10 | Gates: format, lint, check, `test:src` 2696, `test:policy` 179 plus 1 skipped, `test:config` 544 plus 1 skipped, `test:setup` 353, `test:guides` 208 | `verifier` on `haiku` | the commit that carries this row |
| 2026-11-10 | The argument refusal release, claim 11, on taverna's surface design | `opus` on `opus` | the commit that carries this row |
| 2026-11-10 | Independent review of claim 11: PASS; notes on the Agent-level decline retry, a refusal wrapped as an `Error`'s cause, and a bash script the builder left under `tmp/` (deleted) | `reviewer` on `sonnet` | the commit that carries this row |
| 2026-11-10 | Gates: format, lint, check, `test:src` 2710, `test:policy` 179 plus 1 skipped, `test:config` 544 plus 1 skipped, `test:setup` 353, `test:guides` 209 | `verifier` on `haiku` | the commit that carries this row |
