# Focus adjudication

Both focused spans fail the supplied support criteria. The `cause-removed` span asserts an unsupported repair prerequisite and an unsupported completed open state. The `both-removed` span removes the repair prerequisite but retains the unsupported open state. The supplied evidence instructs reopening; it does not establish that reopening occurred.

This adjudication uses only the complete `sources` array and the complete named candidates in `tmp/units/aggregate-admission-screen-r2/packet-final.json`, with the question and span selection in `.orkestrel/agent/instruments/units/aggregates/admission-focus.json`. Candidate prose resolves references only. No historical labels, scores, method reports, or ranking output informed the rulings.

## Exact spans

Each named candidate contains one matching focus line. Offsets are UTF-16 half-open positions in the unchanged candidate, including its dated user prefix.

For `cause-removed`, the focus occupies `[149, 331)`:

```text
(2026-10-10) user: Escalation ESC-2219 remains open because Sigrid reports two of the 8 pendants have cracked glass, requiring an electrician's repair before replacement can proceed.
```

For `both-removed`, the focus occupies `[149, 265)`:

```text
(2026-10-10) user: Escalation ESC-2219 remains open because Sigrid reports two of the 8 pendants have cracked glass.
```

## Source chronology

The citations in this report identify source object `id` and the packet's zero-based `sentence` value. All cited source objects have role `user`. The complete source array was read in its supplied order, including sources concerning Grace, Copperline, and general escalation rules.

The relevant source history is as follows.

| Date | Source object and sentence | Exact source text | Consequence for the focus |
| --- | --- | --- | --- |
| 2026-10-08 | `ee87630b-9611-48af-b722-dbb37955e8d0`, sentence `0` | Next: Halvorsen Interiors, wholesale account LH-31055, is escalating a late $1,240 lighting order, LH-80941. | Establishes the lighting-order escalation. |
| 2026-10-08 | `2e4f06ef-d1aa-465e-a15e-b07a65e63408`, sentence `0` | Correction on Halvorsen: the ticket is ESC-2219, not ESC-2291. | Establishes the corrected ticket identity. Sentence `1`, “I transposed the digits.”, explains this correction. |
| 2026-10-09 | `e3d77635-a783-480a-84eb-e5b20da5ba57`, sentence `0` | Sigrid confirmed by email that all 8 pendants are in. | Establishes the reported receipt of the pendants. Receipt does not establish freedom from defects. |
| 2026-10-09 | `e3d77635-a783-480a-84eb-e5b20da5ba57`, sentence `1` | Ticket ESC-2219 is resolved, close it. | Reports resolution and instructs closure. It does not report completed closure. |
| 2026-10-10 | `389db73e-5aa0-433a-bef4-d4ff52d46ee0`, sentence `0` | Reopen ESC-2219: Sigrid says 2 of the 8 pendants have cracked glass. | Supplies the defect report and the reason to request reopening. It does not report completed reopening. |
| 2026-10-10 | `389db73e-5aa0-433a-bef4-d4ff52d46ee0`, sentence `1` | Sigrid: Her electrician found it when unpacking this morning. | Attributes discovery to her electrician, with “this morning” anchored to this source. It states no repair duty or replacement prerequisite. |

The 2026-10-10 report changes the earlier resolution assessment by requesting renewed handling of the defect. It does not retract receipt of the pendants. No later source reports an open status, a completed reopening, an electrician's repair, or a replacement condition for ESC-2219. The earlier closure instruction likewise cannot establish completed closure. These omissions warrant an unsupported status label, rather than a finding that a known completed closure contradicts the focus.

## Shared assertions

The following assertions occur in both exact spans.

| Assertion or relationship | Label | Evidence and ruling |
| --- | --- | --- |
| `(2026-10-10) user:` identifies the source date and role. | Supported | `389db73e-5aa0-433a-bef4-d4ff52d46ee0`, sentences `0` and `1`, have that day and role. The prefix need not identify Sigrid as the user or date every underlying event. |
| The subject is escalation ticket ESC-2219. | Supported | `ee87630b-9611-48af-b722-dbb37955e8d0`, sentence `0`, establishes the escalation; `2e4f06ef-d1aa-465e-a15e-b07a65e63408`, sentence `0`, corrects its identifier to ESC-2219. The 2026-10-10 reopening instruction uses that identifier. |
| Sigrid reports that two of the eight pendants have cracked glass. | Supported | `389db73e-5aa0-433a-bef4-d4ff52d46ee0`, sentence `0`: “Sigrid says 2 of the 8 pendants have cracked glass.” The paraphrase preserves reporter, quantity, object, and defect. |
| ESC-2219 “remains open.” | Unsupported | The operative 2026-10-10 text is “Reopen ESC-2219”, an instruction. The question's true criterion states: “A request, instruction, or plan is not proof of completion.” No supplied source reports completion or an open ticket status. “Remains open” asserts an actual continuing state and is stronger than an instruction to reopen. |
| Sigrid's defect report is the reason the ticket remains open. | Unsupported as expressed | The colon in `389db73e-5aa0-433a-bef4-d4ff52d46ee0`, sentence `0`, connects the defect report to the reopening instruction. This supports a reason for requesting reopening. It does not establish the asserted causal explanation of an actual open state. The causal subject cannot acquire factual support from the supported defect report alone. |

“Remains” does not require an interpretation that the ticket was continuously open through every prior message. Even a reading that permits an intervening closure and reopening still asserts an actual open state without evidence of the instructed reopening's completion. The status failure therefore does not depend on treating “remains” as a contradiction of the earlier resolution report.

## Repair assertions in `cause-removed`

The repair clause adds assertions and relations that the sources do not establish.

| Assertion or relationship | Label | Evidence and ruling |
| --- | --- | --- |
| The cracked glass requires repair. | Unsupported | `389db73e-5aa0-433a-bef4-d4ff52d46ee0`, sentence `0`, reports the defect; sentence `1` reports discovery. Neither states a required remedy. |
| An electrician must perform that repair. | Unsupported | Sentence `1` says “Her electrician found it when unpacking this morning.” Discovery is the only electrician action reported. Assigning a required repair changes that actor's stated role. The source does not explicitly forbid such a repair, so unsupported is the appropriate label rather than contradicted. |
| Repair is a prerequisite that must precede replacement proceeding. | Unsupported | Neither sentence of `389db73e-5aa0-433a-bef4-d4ff52d46ee0` mentions replacement, permission to replace, repair completion, or an ordering condition. The asserted “before” relation and the permission implied by “can proceed” have no supporting source. |
| A replacement is contemplated for the pendants, if “replacement” refers to the local pendant subject. | Unsupported | The ESC-2219 sources identify receipt, defects, discovery, and handling instructions, but no pendant replacement plan. The complete candidate cannot establish that plan. |
| “Replacement” denotes a particular replacement when the complete candidate is considered. | Ambiguous referent; no supported repair condition on either reading | The adjacent candidate sentences concern Grace's replacement duvet. The local repair clause concerns pendants. Neither reading supplies factual support for requiring an electrician's repair before replacement. The evidence concerning Grace, quoted next, has a different prerequisite. |

The Grace sources do not supply the missing repair condition. On 2026-10-08, `f0029308-0698-467b-a17c-4426839dca28`, sentence `1`, says: “Because of her two earlier claims, any replacement for Grace needs Marcus to sign off first.” On that date, `104c1b31-19f4-468f-bec4-8d24a2cc294b`, sentence `1`, says: “Until 2026-10-09, Ruth Adeyemi, our deputy manager, gives any sign-off that would normally need Marcus.” These statements concern approval and its temporary delegate, not repair.

On 2026-10-09, `0a5618dc-cbca-4cfb-8218-2bea8bcccdce`, sentence `1`, says: “Parcelway has no answer on TR-3307 yet, so if nothing turns up by the end of the day we send her replacement.” On 2026-10-10, `2cbf9631-30e5-4426-a424-d77dc3f13b8d`, sentence `0`, says: “Reopen TR-3307: Grace opened the parcel from locker 14 and it's a twin duvet set addressed to someone else, not her queen set.” Its sentence `1` says: “Grace: She still wants her own replacement.” These sources support Grace's continued replacement request. They do not establish an electrician's repair prerequisite for Grace or for Sigrid.

## Candidate context and settled rulings

The complete candidates have identical surrounding sentences. Their preceding sentence concerns Grace's desired duvet replacement and the wrong parcel. Their following sentence concerns Grace's replacement status and Copperline's buyer change. Neither surrounding sentence reports an ESC-2219 status transition or identifies a source for the repair condition. No wording makes the focus a quotation of an inactive proposal, a hypothetical statement, or an instruction. The complete candidate therefore does not change the declarative meaning of “remains open.” Its other assertions were used only to interpret the focus, not as corroboration or as additional audit targets.

For `cause-removed`, the settled focus label is **unsupported**, and the supplied question's Boolean result is **false**. The open-state assertion and its causal formulation lack action-status support. The repair obligation, electrician assignment, and repair-before-replacement prerequisite also lack support. The replacement referent remains ambiguous, but neither plausible referent rescues the clause.

For `both-removed`, the settled focus label is **unsupported**, and the supplied question's Boolean result is **false**. Ticket identity, attribution, date prefix, defect, and quantities are supported. The actual continuing open state and its causal formulation are not established by the reopening instruction.

The remaining factual uncertainty is whether the instructed reopening occurred. The supplied sources cannot settle that event. This uncertainty does not leave the support ruling unresolved: the explicit instruction-versus-completion criterion requires refusal of an assertion of the resulting state without supporting evidence. No assertion in either focus requires a contradicted label to reach these rulings.
