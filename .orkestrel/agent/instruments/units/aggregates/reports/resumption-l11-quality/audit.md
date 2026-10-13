# Blind quality judgment

The supplied packet yields 7 complete-work passes from 48 planned opaque IDs. Semantic correctness is higher than completed work because correct replies often omit the system-required fresh lookup. These are judgments of this packet, not a comparison between inferred trajectories.

See [structured judgments](judgments.json). Every row preserves its opaque ID and retained status, separates the verdicts, and cites the exact packet and original-scenario locations with JSON pointers. Coverage validation found 48 unique IDs, matching every supplied ID, status, and eligible prefix. See [the archive path mapping](README.md) for the retained packet and launch-path references.

The measured population and verdicts are:

| Dimension | Pass | Fail | Ambiguous |
| --- | ---: | ---: | ---: |
| Semantic content | 18 | 29 | 1 |
| System-wide tool obligations | 11 | 37 | 0 |
| Explicit per-goal tool lists | 39 | 9 | 0 |
| Complete work | 7 | 41 | 0 |

The retained statuses are 47 served and 1 failed. The failed row, `8824924c415a31102f5533649c3beb09`, has an empty reply and only a recall action. Its retrieved rules are useful evidence but are not a delivered refund note; see failed row (`tmp/units/aggregate-development-blind-packet-l11-baselines/packet.json:3827`).

## Grading conventions

The original scenario's `ledger.system` controls execution; see protocol (`.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:4`). A final message replaces `send_reply`, and `recall` replaces `search_history`. Seed indices after a goal's inclusive boundary never supply its judgment. Later lookup revisions apply only after their original `from` boundary.

A request about a known customer's order or account requires a fresh relevant lookup even when the request names the customer rather than spelling the numeric identifier. A recalled old lookup result is not that action. The generic walk-in-counter question concerns no account and needs no lookup. The morning call and shipment-chase questions concern identifiable orders, so their system-wide obligation remains active.

The narrower listed-tool verdict checks the original goal's tool names, mapping the protocol replacements and requiring a relevant identifier for a lookup. An omitted lookup in that list does not waive the system rule. For `4daedcac21dc6eb5810edd444a599057`, the lookup and recall names satisfy the list, but the refunds-topic recall does not recover the gift wording that the reply admits is missing. That row fails the system recovery obligation and semantics.

A semantic pass requires the requested substance without material contradictions, invented policy, or unsupported operational claims. Equivalent formatting and optional arithmetic are accepted. Mentioning a replaced value to correct it is accepted. For example, `710453ca13b5fb4b4ddbca4dd735ffa5` repeats former counter hours but explicitly overrides them with all-day closure and Monday in the same sentence; see counter reply (`tmp/units/aggregate-development-blind-packet-l11-baselines/packet.json:3601`).

Complete work requires a served answer, semantic fulfillment, and the applicable action obligations. Tool failures and successful semantic fragments do not become completed work.

## Ambiguity and delivery limits

For `a4ecab1742aa5e69822c45344dcb8807`, extension 4127 and the after-2-pm restriction are correct. “Voicemail is at 2 pm” can be malformed availability wording or an invented voicemail timestamp. The structured judgment preserves both semantic readings. Missing fresh lookup makes complete work fail under either reading; see callback reply (`tmp/units/aggregate-development-blind-packet-l11-baselines/packet.json:3971`).

The raw g06 rows remain in the judgments and denominator. Both fulfill the fresh lookup and explicit action list but fail semantics: `31013bc5405879bffc3cc4024fef8eea` falsely says “Has Arrived” in the subject, and `d64efdac67a45a6f61b7653d8e1ca34f` includes the forbidden written arrival estimate. The original g06 request asks for a draft the shift lead can send, so external delivery is not required; see g06 request (`.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:2098`), arrival assertion (`tmp/units/aggregate-development-blind-packet-l11-baselines/packet.json:2983`), and dated draft (`tmp/units/aggregate-development-blind-packet-l11-baselines/packet.json:4277`).

The original g04 request does ask to send Priya the ticket; see g04 request (`.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:2050`). The protocol delivers the final message to the shift lead and supplies no represented action proving delivery to Priya. The correct ticket in `1f3102671020f5d5867d6b245bbfc35f` passes content under a draft-only bound; its historical copied-Priya statement does not prove this message was sent. The other g04 reply adds an unsupported approval-code instruction. Both lack fresh lookup, so both fail complete work independently of the external-delivery limit; see ticket reply (`tmp/units/aggregate-development-blind-packet-l11-baselines/packet.json:2746`) and expanded ticket reply (`tmp/units/aggregate-development-blind-packet-l11-baselines/packet.json:3686`).

The packet excludes each request's full visible context. Except for the admitted missing gift wording, a missing recall is not independently penalized because visibility cannot be reconstructed. Fresh lookup, final-answer presence, and retained action results remain directly assessable.

## Seal and scope

The packet SHA256 matches the released value:

`a901cd61add05421bf19ab766c33e33bf13c73265c484d147c8b79235323241e`

The original scenario SHA256 is:

`24efde87208498722a7b25a69cb98ff12552da6379af0c6972144dbd63bf170b`

The sealed judgments SHA256 is:

`1fda4d33ce55e970b7f3095f83c396f1f2203b5e4fddbc111b0a0685a896b8f4`

Only the permitted instructions, public packet, and original scenario supplied evidence. No private join, other audit, automatic scorer, model service, source change, or identity inference supplied a judgment. Totals derive mechanically from the manually authored verdicts. The population alone cannot establish adoption or a held-out comparison.
