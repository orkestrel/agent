# rec-falsify — audit verdict (Recording campaign, F1)

Round of 2026-10-23 on the claims `tmp/units/rec-falsify-claims.md` (25 claims) over Study `9260c5a`..`fa29162` (S1 open recording, S2 replay and identities, S3 continuation, the Node types change) and Agent `0d6b3a92` (A1 consumer) and `8a926460` (A2 differential).

## Lanes

| Lane | Role, engine | Verdict file | Terminal line |
| --- | --- | --- | --- |
| objective | analyst, GPT-6 Astra xhigh (T3 `rec-falsify-analyst-astra-2`; run 1 stopped on a records-only HEAD advance and was re-run with that exemption) | `tmp/units/rec-falsify-analyst-2.md` | `FAIL 23, 24, 25; outside the claims: none` |
| subjective | reviewer, Claude Opus 5.5 (Workflow `wf_04f4bfaa-024`) | `tmp/units/rec-falsify-reviewer.md` | `FAIL 23, 24, 25; outside the claims: F1, F2, F3` |

Citations: the objective verdict's 61 resolve; the subjective verdict's eight unresolved ones are Study paths cited without the `../study/` prefix, and those sampled match Study's source.

## Rulings per claim

- Claims 1 to 22: **CONFIRMED** by both lanes (open admission and bounds, the declared form, the strict reader, no fabricated terminal, one declaration, offline replay, divergence retention, the scan, identities, custody, prefix rules, continuation admission, handover, divergence refusal, cleanup, E5, the session, locale and clock independence, U3, the switches).
- Claim 23: **BROKEN** (both lanes; the Orchestrator reproduced it by reading `studies/memory/helpers.ts` and `studies/memory/types.ts`): `StudyMemoryDifferential` carries no completion or eligibility fact, so an interrupted replay with equal requests returns the same all-undefined reading as an inert sealed replay; with claim 24, a sealed replay whose Ledger plan changed can also read inert.
- Claim 24: **BROKEN** (both lanes; reproduced by reading `normalizeStudyMemoryReceipt`): minted ids are numbered by first appearance within each receipt, so a reorder of established ids, and a filed, rendered or omitted id the receipt does not otherwise anchor, normalize to the same rows.
- Claim 25: **BROKEN** while 23 and 24 are open; also the guide's universal at `../study/guides/study.md:229` ("an extra execution request pairs with the next recorded postflight request") holds only after the last recorded execution, and three U+2019 apostrophes were added near `:213` and `:219`.

## Findings outside the claims (subjective lane)

- **F1, accepted** (reproduced by reading `../study/src/server/commands/StudyCommand.ts:329-342` and `:488-552`): continuation's § 3.2 comparisons run on `#extend`'s read of the definition, scenarios and profile, while the run executes `#prepare`'s second read with no re-comparison; without `--expected` a change between the reads (a daemon environment value, `settings.observe`) seals under a configuration that differs from the ancestor's. Bound: `--replay` keeps admitting a different configuration; raised `record` and `bounds` stay admitted.
- **F2, accepted as test gaps** (the code behind each is correct): (a) no test hands a reader a declaration that differs from its profile, so deleting any of the four `validateStudyRecordingDeclaration` calls survives, and the validator test omits `procedure` and `maintenance`; (b) no test reaches the worker's continuation identity rechecks; (c) the content-digest controls vary only size or append a byte; (d) the CT2 divergence path asserts no daemon exit.
- **F3, accepted**: AP1's `LANG` leg tests nothing on win32 (Node resolves the locale from the system there); AP1 asserts only the environment values it wrote.

## Fix units

- `rec-fix-study` (Study): F1, F2 (a) to (d), the guide sentence and the apostrophes.
- `rec-fix-agent` (Agent): claims 23 and 24 with their controls (an interrupted replay that fails after its last response; an established-id reorder; a filed id the receipt does not otherwise anchor), and F3.

Unknown carried, not a defect: the AC1 stand-in daemon proves Study's handover path but not a real `ollama serve`'s announcement, unload reply, chunking or cold-load latency; the first GPU continuation settles it.
