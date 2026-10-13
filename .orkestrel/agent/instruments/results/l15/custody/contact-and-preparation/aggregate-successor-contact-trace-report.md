# Trace the completed g20 contact relationship

The unsupported manager-to-buyer contact relationship first becomes explicit in the aggregate final answer. No maintained aggregate was selected for that decision. The original account lookup already puts the manager and the preferred contact in the same sentence with an implicit owner for “preferred contact”; the sent pinned material preserves that wording. This supports the sealed semantic finding but does not support attributing it to an exposed maintained summary.

The trace covers only `g20-copperline-manager`, eligible through seed 137, in the completed q4-think0 pair. The sealed judgments remain unchanged: aggregate semantic fail, records semantic pass, and both system-tool fail. See `tmp/units/aggregate-successor-contact-trace-judgments.json:1`.

## Follow the source relationships

The eligible source establishes these relationships, with source roles preserved in `tmp/units/aggregate-successor-contact-trace-source.json:1`:

- Seed 65, tool `lookup_customer`, names account manager Ines Albrecht and says “preferred contact is the buyer.” Seed 136 replaces the manager with Tobias Lindqvist, effective 2026-10-09. Its exact account text is “Account LH-71592: Copperline Cafes, wholesale tier, net 30 terms, credit limit $6,000.00 with $2,880.00 outstanding. Account manager Tobias Lindqvist since 2026-10-09; preferred contact is the buyer.” See `.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:845` and `.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:1732`.
- Seed 68, user, says “Copperline's buyer is Owen Pritchard. He takes calls before noon on extension 4301.” Seed 92, user, corrects Owen's extension to 4310 and retains the before-noon window; seed 93, assistant, acknowledges it. These are Copperline-to-buyer and buyer-to-extension relationships, not Tobias-to-buyer routing. See `.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:884`, `.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:1195`, and `.orkestrel/agent/instruments/harness/bench/variants/long/v1.json:1210`.
- The goal asks who Copperline's account manager is because its accounts team wants to discuss the reorder. The authored goal ends at seed 137 and lists seed 136 as its fact. Owen/4310 remain eligible; the subsequent Hana correction is outside this boundary. See `tmp/units/aggregate-successor-contact-trace-source.json:1`.

The account wrapper and explicit “Copperline's buyer” establish enough information to name Tobias and keep Owen's contact details attached to Copperline. However, “preferred contact is the buyer” omits an explicit possessive even in the original tool text. That local grammatical ambiguity precedes summarization. None of these eligible assertions explicitly says that Tobias prefers being reached through Owen.

## Separate maintained state from sent material

The g20 maintenance record retains contacts version 2. Its only Copperline prose is “Small fix on Copperline: Owen's extension is 4310, not 4301.” It omits the buyer role, before-noon window, manager, and preferred-contact relationship. Owner `LH-71592` versions 3, 4, and 5 name Tobias but stop at “since 2026-10-0”; they omit the buyer/contact wording. Each records an identifier failure for `2026-10-0`, and version 5 is withheld. No inspected maintained prose introduces Tobias's contact preference. See `tmp/units/aggregate-successor-contact-trace-maintained.json:1`; the preserved raw records bind these entries to original `aggregates.jsonl` lines 299 and 302–305 in `tmp/units/aggregate-successor-contact-trace-aggregate-aggregates.json:1`.

The summarizer input retains tool provenance for the account-manager clause and user provenance for Owen and the correction. The raw source identities include seed 136 message `48ec124f-8a59-463a-9933-16d09c097d2d`, seed 68 message `c6760054-b34b-4991-a133-26cceb7eb188`, and seed 92 message `a6e38ca9-895d-4612-9018-3fdf7e12b3c6`. See `tmp/units/aggregate-successor-contact-trace-aggregate-aggregates.json:1` and `tmp/units/aggregate-successor-contact-trace-aggregate-body-263.txt:1`.

The selected maintained-summary version is **none**. Aggregate selection line 20 has `aggregates: []`; its row reports `summary: 0`, `rendered: []`, owner `LH-71592` withheld, and contacts emptied. See `tmp/units/aggregate-successor-contact-trace-aggregate-selections.json:1` and `tmp/units/aggregate-successor-contact-trace-aggregate-rows.json:1`.

The actual sent aggregate decision body instead places the eligible source clauses in a pinned Copperline account section of the system message. It explicitly retains “Copperline's buyer is Owen Pritchard,” the corrected extension, before-noon window, account wrapper, and “Account manager Tobias Lindqvist since 2026-10-09; preferred contact is the buyer.” Original user/tool roles are absent from these pinned bullets, but the account grouping remains. The body contains no “His preferred contact” assertion. See `tmp/units/aggregate-successor-contact-trace-aggregate-readable-266.txt:9`.

## Bind the decisions and contrast the answer

The following identities are original `requests.jsonl` line/sequence identities. Each retained record is sent, status 200, and names g20. SHA-256 values hash the original JSON record bytes excluding its line terminator. The extracted `.jsonl` files preserve those bytes with an LF terminator; their `request` and streamed `response` fields retain the complete recorded bodies. Human-readable message and decoded response extracts accompany them.

| Arm and sequence | Role | Original record SHA-256 |
| --- | --- | --- |
| aggregate 266 | agent, turn 32 | `a599eea725a6cbf07e4e2590f99e0764cd6b119c0580c86c83adb8140d6293b0` |
| records 54 | agent, turn 32 | `24e75fc4c27e4f1d835707f015eac802e2aac0d4160800acbc482a106c156362` |
| records 55 | agent, turn 33 | `d89e5dbed11ccbdb4734a2ad47294a0f92b94e53fa1a4c2653559ea822e6bd6e` |

See `tmp/units/aggregate-successor-contact-trace-aggregate-request-266.jsonl:1`, `tmp/units/aggregate-successor-contact-trace-records-request-54.jsonl:1`, and `tmp/units/aggregate-successor-contact-trace-records-request-55.jsonl:1`.

Aggregate request 266 produces this final answer, also retained in its g20 row and message:

> Copperline Cafes' account manager is Tobias Lindqvist, who has been managing their account since 2026-10-09. His preferred contact method is directly with their buyer, Owen Pritchard.
>
> Owen's extension is 4310 (not 4301 as previously noted).

See `tmp/units/aggregate-successor-contact-trace-aggregate-response-266.txt:1`. “His” attaches the preference to Tobias, and “directly with their buyer” adds a route. The manager name and Owen's extension are correct; the added relationship is unsupported. Neither the source nor the sent body explicitly supplies that relationship.

Records request 54 has an exactly equal system message to aggregate request 266, including the pinned account section. Its surrounding retained conversation differs: it also contains an earlier unrelated user/assistant exchange. See `tmp/units/aggregate-successor-contact-trace-comparison.json:1` and the complete body extracts. Its response calls `recall` with topic `Copperline Cafes`; request 55 includes that call and the returned account sources, newest first. The recalled material names Tobias, the correction to 4310, Owen's buyer role, and the earlier Ines account lookup. See `tmp/units/aggregate-successor-contact-trace-records-readable-55.txt:109`.

Records request 55 produces this final answer:

> Copperline's account manager is Tobias Lindqvist, who has been managing their account since 2026-10-09. However, please note that there was an earlier mention of Ines Albrecht as well; the most recent information indicates Tobias Lindqvist is the current account manager.
>
> Their preferred contact is Owen Pritchard, the buyer, who can be reached on extension 4310 (corrected from 4301).

See `tmp/units/aggregate-successor-contact-trace-records-response-55.txt:1`. The plural possessive retains Copperline as the natural owner of the contact preference; it does not explicitly make Owen a route to Tobias. Ines is labelled historical. The records answer supports the sealed semantic pass despite its automatic stale-name failure. Both answers omit the before-noon detail, which the manager question does not require.

## Bound the finding

Neither arm performs a fresh lookup for g20. Aggregate answers immediately; records recalls prior lookup text. The system requires a fresh account/order lookup, so this is a separate shared failure. A recalled line beginning `lookup_customer` is not a fresh tool invocation. See `tmp/units/aggregate-successor-contact-trace-aggregate-calls.json:1`, `tmp/units/aggregate-successor-contact-trace-records-calls.json:1`, and `tmp/units/aggregate-successor-contact-trace-records-readable-55.txt:111`.

The narrow future hypothesis concerns how the decision answer resolves the owner of “preferred contact” in the pinned account clause. A future proposal would have to test that source/pinned-clause-to-answer boundary. This trace supplies no direct target in selected maintained-summary wording because no such wording reached this decision. It does not establish why records recalled, why the answers diverged, or whether clearer wording or recall would improve another run. Source grammar, different retained messages, and the records recall remain distinct observations, not isolated causal effects.

The reader and exact extracts are preserved under the `tmp/units/aggregate-successor-contact-trace-` prefix. Full input-file hashes are in `tmp/units/aggregate-successor-contact-trace-hashes.json:1`; the reader is `tmp/units/aggregate-successor-contact-trace-reader.ts:1`. No grade, canonical source, prompt, model request, or implementation was changed. No runtime gate or performance conclusion belongs to this read-only trace.
