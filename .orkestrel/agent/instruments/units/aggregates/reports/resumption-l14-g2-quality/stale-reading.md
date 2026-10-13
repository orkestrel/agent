# Closed pilot stale-phrase reading

The recorded predicate findings reproduce, but they do not establish that a summary asserted an obsolete identifier as valid. Requests 63 and 64 contain an ambiguous, unqualified ticket identifier list. Request 66 explicitly withdraws the obsolete approval code in the summary prose. Every flagged match comes from an `Ids:` line. Every obsolete identifier also appears outside the summary in correction or withdrawal language. The pilot qualification remains refused.

## Evidence and method

The raw `requests.jsonl` SHA-256 matches the brief: `b1dc18477a82ae65cd43a6be7c9c3268f88eca223edb0c02e4d5f03241ac70ec`. The reader retains only requests 63, 64, and 66. It uses the emitted `readRows`, `isMatrixRequest`, `isMatrixSelection`, `readCopy`, `readWireReading`, `matchesSummaryBlock`, `collectSummaryBodies`, and `readScoreCarriers` functions. It selects the last same-goal selection preceding each request, as the deciding predicate does. Summary blocks match the actual supplied system messages. See `tmp/units/aggregate-final-g2-stale-reading-reader.ts:1` and `tmp/units/aggregate-final-g2-stale-reading-evidence.json:1`.

The existing predicate compares carrier results for parsed summary bodies against carrier results for the remaining supplied message content. It removes the exact summary block from system messages, joins the message contents, and reports a stale carrier present only on the summary side. It compares a forbidden-pattern identity, not literal identifier absence. See `.orkestrel/agent/instruments/harness/bench5/matrix/helpers.ts:1264` and `.orkestrel/agent/instruments/harness/bench5/matrix/helpers.ts:1276`.

The body parser includes the identifier line, removing its `Ids:` label, alongside the topic title and prose. The carrier reader normalizes markdown through the existing scorer and returns matched forbidden patterns with nonempty matches. Neither operation propagates the meaning of a withdrawal sentence to a separate identifier-list occurrence. See `.orkestrel/agent/instruments/harness/bench5/aggregates/helpers.ts:608`, `.orkestrel/agent/instruments/harness/bench5/helpers.ts:56`, and `.orkestrel/agent/instruments/harness/bench/rescore.mjs:86`.

The eligible source ends at inclusive seed index 47 for both goals. The scenario records that boundary in each goal; `appendSeed` uses `seed.slice(from, to + 1)`. See `.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:2050`, `.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:2070`, and `.orkestrel/agent/instruments/harness/bench5/Driver.ts:600`. Only identifier-bearing source statements through that boundary are retained in the extraction.

## Request 63: ambiguous ticket list

Request 63 uses selection sequence 62, pass 1. Its actual escalation summary reads as follows. See `.orkestrel/agent/instruments/results/l14/g2-think0/pilot/development/l6-g2-think0-aggregate-v1/requests.jsonl:63`, `.orkestrel/agent/instruments/results/l14/g2-think0/pilot/development/l6-g2-think0-aggregate-v1/selections.jsonl:4`, and `tmp/units/aggregate-final-g2-stale-reading-evidence.json:14`.

```text
#### escalations, as of 2026-10-08
Ids: LH-31055, LH-80941, ESC-2219, ESC-2291
(2026-10-08) user: Third rule: copy Priya Raman from the refunds team on every escalation.
(2026-10-08) user: And never promise a customer a delivery date in writing.
(2026-10-08) user: Halvorsen Interiors, wholesale account LH-31055, is escalating a late $1,240 lighting order, LH-80941.
```

The eligible source establishes the ticket correction unambiguously. The following quotations are `/seed/22/content`, `/seed/23/content`, `/seed/27/content`, and `/seed/28/content`, respectively. See `.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:297`, `.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:312`, `.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:355`, and `.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:372`.

```text
Next: Halvorsen Interiors, wholesale account LH-31055, is escalating a late $1,240 lighting order, LH-80941. Escalations opened ticket ESC-2291 for it.
Logged ESC-2291 against LH-80941 and copied Priya Raman.
Correction on Halvorsen: the ticket is ESC-2219, not ESC-2291. I transposed the digits.
Updated: the Halvorsen escalation is ESC-2219.
```

The summary lists `ESC-2291` without qualification, next to `ESC-2219`. Its prose neither asserts that `ESC-2291` is the valid ticket nor states that it was transposed. Classification: ambiguous identifier-list wording, not an explicit obsolete assertion or a clearly withdrawn reference within the summary itself.

The matched text is `ESC-2291` at normalized summary-body offset 42, in the identifier list. The summary-side stale result contains the goal's ticket pattern; the remaining-message stale result is empty. Both sides carry `esc-2219` as an expected phrase. The remaining system message nevertheless contains the exact line `- Correction on Halvorsen: the ticket is ESC-2219, not ESC-2291.` The word `not` excludes that occurrence from the goal's forbidden pattern. Thus the flagged pattern match is sole-carried; the literal obsolete identifier and its correction are not. See `tmp/units/aggregate-final-g2-stale-reading-evidence.json:106` and `tmp/units/aggregate-final-g2-stale-reading-evidence.json:137`.

## Request 64: the same ambiguous list, with additional correction evidence

Request 64 uses the same selection sequence 62, pass 1, and the verbatim escalation summary quoted for request 63. The eligible source is the same `/seed/22`, `/seed/23`, `/seed/27`, and `/seed/28` sequence through boundary 47. Classification: ambiguous identifier-list wording. See `.orkestrel/agent/instruments/results/l14/g2-think0/pilot/development/l6-g2-think0-aggregate-v1/requests.jsonl:64` and `tmp/units/aggregate-final-g2-stale-reading-evidence.json:182`.

The existing carrier result is identical: `ESC-2291` matches only in the summary identifier list at normalized offset 42; the remaining-message stale result is empty; both sides carry `esc-2219`. In addition to the pinned correction quoted for request 63, the remaining supplied messages include this full source sentence: `Correction on Halvorsen: the ticket is ESC-2219, not ESC-2291. I transposed the digits.` Both obsolete-token occurrences outside the summary are qualified by `not`. The predicate's observation does not mean that the request lacked the correction. See `tmp/units/aggregate-final-g2-stale-reading-evidence.json:282` and `tmp/units/aggregate-final-g2-stale-reading-evidence.json:313`.

## Request 66: explicitly withdrawn approval code

Request 66 uses selection sequence 65, pass 1. Its actual refund summary reads as follows. See `.orkestrel/agent/instruments/results/l14/g2-think0/pilot/development/l6-g2-think0-aggregate-v1/requests.jsonl:66`, `.orkestrel/agent/instruments/results/l14/g2-think0/pilot/development/l6-g2-think0-aggregate-v1/selections.jsonl:5`, and `tmp/units/aggregate-final-g2-stale-reading-evidence.json:359`.

```text
#### refunds, as of 2026-10-08
Ids: MX-4486, MX-4471, LH-44870, LH-79215
(2026-10-08) user: Standing rule: any refund over $200 needs a manager approval code in the internal note.
(2026-10-08) user: Use MX-4486 from now on; MX-4471 is dead.
(2026-10-08) user: Opened-item returns get a full refund again.
```

The eligible source establishes the rotation unambiguously. The following quotations are `/seed/2/content`, `/seed/3/content`, `/seed/29/content`, and `/seed/30/content`, respectively. See `.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:51`, `.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:62`, `.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:384`, and `.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:399`.

```text
Standing rule: any refund over $200 needs a manager approval code in the internal note. This week's code from Marcus Oyelaran, our escalations manager, is MX-4471.
Understood: refunds above $200 carry approval code MX-4471 from Marcus Oyelaran.
Marcus just messaged that the approval code rotated early. Use MX-4486 from now on; MX-4471 is dead.
Switched to approval code MX-4486 and retired MX-4471.
```

The summary explicitly presents `MX-4471` as withdrawn and directs use of `MX-4486`. Classification: clearly withdrawn historical reference when the complete summary is read. Its identifier list alone does not mark status, but the adjacent prose resolves it. No sentence in this summary instructs use of the obsolete code.

The matched text is the identifier-list occurrence of `MX-4471`, at normalized summary-body offset 17. The prose occurrence in `MX-4471 is dead` does not match the existing forbidden pattern. The remaining request contains `- Use MX-4486 from now on; MX-4471 is dead.` Its stale-carrier result is empty for the same reason. Both summary and remaining-message results carry `mx-4486`. The predicate flags the unqualified list occurrence despite an explicit withdrawal in the same summary and outside it. See `tmp/units/aggregate-final-g2-stale-reading-evidence.json:443` and `tmp/units/aggregate-final-g2-stale-reading-evidence.json:476`.

## Coverage and limits

Running the retained reader exited 0. As a negative control outside the request population, empty text produced no stale carrier for either goal. Diagnostic calls on the exact summary prose without its title and identifier line also produced no stale carriers. Those diagnostics locate the existing matches; they do not replace the deciding body predicate. The report retains exact patterns, normalized match offsets, summary bodies, remaining supplied message contents, and eligible identifier-source excerpts in its evidence JSON.

The source status has no unresolved ambiguity in the eligible excerpts: the ticket is corrected and the code is retired before the goals. The Halvorsen summary's unqualified identifier list remains semantically ambiguous. This report does not measure how a model interprets that list, grade any task answer, or establish answer harm.

The pilot manifest still records `accepted: false` and the same request findings. Its hash matches the closed-pilot report. See `.orkestrel/agent/instruments/results/l14/g2-think0/pilot/manifest.json:259`. This unit wrote only its owned temporary reader, extraction, and report. It made no source, build, qualification, or other evidence change, ran no inference, and opened no blind packet, joins, labels, or other run. No adoption or repair recommendation follows from this reading.

The following SHA-256 readings bind the retained artifacts and deciding evidence. Paths resolve from the scaffold checkout.

| File | SHA-256 |
| --- | --- |
| `tmp/units/aggregate-final-g2-stale-reading-reader.ts` | `905b9087b1abe4685db27ea54eee78ed461dbc8f25346688a46ad84ea0047cae` |
| `tmp/units/aggregate-final-g2-stale-reading-evidence.json` | `14a71b9bcd8a8082b38ffb29401b85aa4bbbafbb7fb8c5892a7f46a4bfe15764` |
| `.orkestrel/agent/instruments/results/l14/g2-think0/pilot/development/l6-g2-think0-aggregate-v1/requests.jsonl` | `b1dc18477a82ae65cd43a6be7c9c3268f88eca223edb0c02e4d5f03241ac70ec` |
| `.orkestrel/agent/instruments/results/l14/g2-think0/pilot/development/l6-g2-think0-aggregate-v1/selections.jsonl` | `c0357af0a5844a76a44fc42a19ac3169b25f3935e662537e95f06bc1014c3f01` |
| `.orkestrel/agent/instruments/results/l14/g2-think0/pilot/manifest.json` | `396b37a5ab111f395da213243c131588ed252c666f642e66353bfa98007898c3` |
| `.orkestrel/agent/instruments/harness/bench/variants/long/v1.json` | `24efde87208498722a7b25a69cb98ff12552da6379af0c6972144dbd63bf170b` |
| `.orkestrel/agent/instruments/harness/bench5/matrix/helpers.ts` | `335a1f0923ede50882e8c89a29c2fcaa5485d6f25d82caf0a9de3e15b8932709` |
| `.orkestrel/agent/instruments/harness/.build/bench5/helpers.js` | `05e0ecf759d682ed4e9c81bb69d85167058fd71969ed5a1add400013b42c1a68` |
| `.orkestrel/agent/instruments/harness/.build/bench5/aggregates/helpers.js` | `f91e9b671dd90bd4f98593d4b1479b57859f9613114eef44f6e87e05108d9bf2` |
| `.orkestrel/agent/instruments/harness/.build/bench5/matrix/validators.js` | `e9de7eedd940fe38d7fab223f9208c617ca607eb2ae2cdf11640d195464eca6d` |
| `.orkestrel/agent/instruments/harness/.build/bench5/Driver.js` | `6fb2853fb1e33e3820f808eddad17958d2366bcbfd9c12f935fde620d3daade5` |
| `.orkestrel/agent/instruments/harness/.build/bench/rescore.mjs` | `6019bdd29a6e8ceecf7515c5471ce9026a39ed448b435b2f8f070c62cf0f36fd` |
