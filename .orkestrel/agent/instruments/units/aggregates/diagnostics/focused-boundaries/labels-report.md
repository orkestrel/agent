# Contextual support adjudication

The packet is fully labeled, with unresolved scope interpretations preserved for the root agent's ruling. This report does not accept its own labels.

## Evidence and verification

The SHA-256 of `tmp/units/aggregate-focus-controls/population.json` is `3fc3e23d91c095b5f7935aa40b18b62e62616c75819f6f270fad3b7a0da11309`, matching the brief. The membership check measured 14 rows and 30 exact spans. Every supplied start/end pair reproduces its supplied text with `candidate.slice(start, end)`; no duplicate row id, duplicate span offset pair, or empty source set was found.

Exposure was limited to the population, the assigned brief, AGENTS.md, orchestration, quality and writing rules, and the dispatch skill. I read no oracle, author report, score, earlier label report, pair mapping, prior discriminator result, or unrelated repository content. No network, external model inference, or source edit was performed. The output is `tmp/units/aggregate-focus-controls-labels.json`.

The output preserves source ids, supplied sentence indexes, source roles, source dates, and exact quotations. A supplied sentence index can contain multiple grammatical sentences; it remains unchanged. Every compound span enumerates its assertions. Whole-candidate anchors are the union of its span anchors.

## Unresolved interpretations for root

For row `134528899cc700845d1b7a8df277ad9beb735d6d3ced27a5aead86d3dac6cdec`, span [303,510), and row `3b269190b1ec7d37645a36a1f8326d34b2c507da1fbd60e168e501a661448aab`, span [237,444), the following source-scope questions remain. Both spans are labeled ambiguous and map to false pending root's ruling.

- Replacement receipt: source `2cbf9631-30e5-4426-a424-d77dc3f13b8d`, sentence 0, says "it's a twin duvet set addressed to someone else, not her queen set"; sentence 1 says "She still wants her own replacement." These establish an unfulfilled intended replacement. The candidate says "has not yet received a replacement for her duvet set", which may retain that intended-item restriction or may exclude receipt of any replacement parcel. The latter is not expressly established. Source `0a5618dc-cbca-4cfb-8218-2bea8bcccdce`, sentence 1, gives only a conditional plan: "if nothing turns up by the end of the day we send her replacement." That plan establishes neither dispatch nor receipt.
- Contact availability: source `126ea27f-fcb3-472b-af44-6944806baff6`, sentence 1, says "Their new buyer is Hana Ikeda, email only, at hana.ikeda@copperline.example." The candidate's "only having email contact information available" may paraphrase the contact method, but it may instead assert that no other contact information is available. An exclusive communication instruction does not establish the latter fact. The packet does not settle that scope.

The unsupported electrician prerequisite independently defeats row `134528899cc700845d1b7a8df277ad9beb735d6d3ced27a5aead86d3dac6cdec`, regardless of those scope rulings. Source `389db73e-5aa0-433a-bef4-d4ff52d46ee0`, sentence 1, says "Her electrician found it when unpacking this morning." It supplies discovery, not a required electrician repair before replacement.

No disagreement with another adjudicator can be reported because no other adjudication was exposed.

## High-risk interpretations

The full candidate determines each pronoun's antecedent. In row `172b52e9e40af5c62512ecb14cc6a5494e8dfe20b72e7ecf23391dc8615743df`, "It" denotes the blue crate, making cups contradicted rather than referentially ambiguous. Source `a1d207c57a5f7c4b0959c9d3b75efd2f438cb1b124b9c1219c0473465a464f3b`, sentence 0, says "The blue crate contains linen napkins and no cups." The location assertion remains supported.

Reported speech stays distinct from endorsement. In row `91ed4ec675e79d2208ac0a9fe9856a759fcccbf8454ec052297bcca9760de6d4`, "The claim is that Nora approved the refund" identifies the reported claim and is supported by source `26f06425edd4425f0177423d802a0cdc2dc10705150608f89923c8f565d6cde2`, sentence 0: "Someone claimed that Nora approved the refund." The separate endorsement "That claim is true" is contradicted by source `cf9a490cc841612e846d3152101bd57cd9d30009ba47ad88a93858f8821d0c8e`, sentence 0: "That claim is false. Nora reviewed the request but has not approved the refund." False endorsement elsewhere does not erase the supported fact that the claim was made.

An explicit following historical-status sentence scopes the preceding assertion. In row `96ee113c95ee9066d265a0508aae7b7c67878640e8eb2eadc03984b016048f31`, "That sentence records a withdrawn rule" unambiguously scopes the Friday sentence as inactive history. Source `aac71a44fd0cf9602efb603aa722028487318f06239f2b28364805c500351738`, sentence 0, says "The Friday inspection rule is withdrawn." The candidate need not repeat the active Monday schedule. Where the candidate instead expressly calls the Friday rule active, both the active-Friday claim and that status claim are contradicted.

An earlier-note attribution remains a historical assertion even when a following correction is wrong. In row `b4418cb1f465bdd108c74ad449bbf0aba435cfb08b3dcebc5020ce292cdb50cb`, the D-6 earlier note is supported by source `60a537490014d187010682d8d0b3707c1637437a710b41eeef3a83846bc25ed4`, sentence 0: "The delivery is assigned to dock D-6." The candidate's correction to D-6 is contradicted by source `6db585cb84d36e657352406d06ed2eaa4f77a060c628b31f4d0e23e47c9131a7`, sentence 0: "the delivery is assigned to dock D-9, replacing D-6." The distinct historical assertion is not treated as a fresh assignment.

Actual completion and a completion report require separate labels. In row `378a30bd89e45045ee90460fc6f5a9a2b9ea3c76ac34377b4caf2ae6f1c87f96`, dispatch completion is unsupported. The claim that the conversation records completion is contradicted. Source `98286f27827c5b0a44b127c8c2cbb493e734224e65f1fc5d98a5f7a357308f89`, sentence 0, says "No dispatch completion has been reported in this conversation." Absence of a report does not prove that the external action never happened.

The customer-service date and role prefixes identify reporting sources. They do not turn the user into Sigrid, Grace, or Owen, and they do not date every event to 2026-10-10. Owen's "yesterday" retains the 2026-10-10 source frame. The reopen wording remains an instruction; it is not labeled as completed reopening. A semicolon between Grace's status and the buyer updates does not assert a causal connection.

## Packet measurements

The whole-candidate labels measured 6 supported, 6 contradicted, 1 unsupported, and 1 ambiguous. The contextual-span labels measured 19 supported, 7 contradicted, 2 unsupported, and 2 ambiguous. These counts describe this packet and are not quality scores or acceptance targets.

Every non-supported label maps to false for the supplied binary question. Root owns the final ruling and any subsequent inference.
