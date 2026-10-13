# Corrected focus adjudication

`statement-a` is **unsupported / false** because its electrician-repair prerequisite is absent from the evidence. `statement-b` is **supported / true** because it accurately represents the source's reopening instruction and attributed defect report without asserting completed reopening.

These rulings apply only to the declared focus spans. The complete ordered `sources` array in `tmp/units/aggregate-admission-screen-r2/packet-final.json` supplies the facts. The complete candidates and support criteria come from `.orkestrel/agent/instruments/units/aggregates/admission-focus-r2.json`. Candidate context supplies interpretation only. No scores, other analyst reports, or other design reports were read. The preceding report remains unchanged.

## Exact focus equality

Each declared focus equals a unique complete line in its corresponding candidate. Ordinal substring equality and uniqueness were checked through read-only parsing. The following offsets are UTF-16 half-open positions, including the dated user prefix.

For `statement-a`, the exact span is `[149, 302)`:

```text
(2026-10-10) user: Reopen ESC-2219: Sigrid says 2 of the 8 pendants have cracked glass, requiring an electrician's repair before replacement can proceed.
```

For `statement-b`, the exact span is `[149, 236)`:

```text
(2026-10-10) user: Reopen ESC-2219: Sigrid says 2 of the 8 pendants have cracked glass.
```

## Ordered evidence

Source citations use the packet's object `id` and zero-based `sentence` value. All cited objects have role `user`. The entire source array was read in message order.

| Date | Source object and sentence | Exact text | Effect on the focus |
| --- | --- | --- | --- |
| 2026-10-08 | `ee87630b-9611-48af-b722-dbb37955e8d0`, sentence `0` | Next: Halvorsen Interiors, wholesale account LH-31055, is escalating a late $1,240 lighting order, LH-80941. | Establishes the lighting-order escalation. |
| 2026-10-08 | `2e4f06ef-d1aa-465e-a15e-b07a65e63408`, sentence `0` | Correction on Halvorsen: the ticket is ESC-2219, not ESC-2291. | Establishes the corrected identifier. Sentence `1`, “I transposed the digits.”, explains the correction. |
| 2026-10-09 | `e3d77635-a783-480a-84eb-e5b20da5ba57`, sentence `0` | Sigrid confirmed by email that all 8 pendants are in. | Establishes reported receipt; it does not deny later-discovered damage. |
| 2026-10-09 | `e3d77635-a783-480a-84eb-e5b20da5ba57`, sentence `1` | Ticket ESC-2219 is resolved, close it. | Reports resolution and directs closure; it does not establish completed closure. |
| 2026-10-10 | `389db73e-5aa0-433a-bef4-d4ff52d46ee0`, sentence `0` | Reopen ESC-2219: Sigrid says 2 of the 8 pendants have cracked glass. | Directs reopening and attributes the defect report to Sigrid. |
| 2026-10-10 | `389db73e-5aa0-433a-bef4-d4ff52d46ee0`, sentence `1` | Sigrid: Her electrician found it when unpacking this morning. | Identifies the electrician as the person who discovered the damage. It states no required repair. |

The later instruction governs the requested handling of ESC-2219 after the earlier resolution report. The receipt of the pendants remains compatible with the later defect report. Neither corrected focus presents the earlier resolution as active, asserts completed closure or reopening, or assigns the source date to the actual discovery event. No later supplied evidence withdraws the reopening instruction or defect report.

## Shared assertions and instruction status

The following analysis applies to the wording shared by both focuses.

| Assertion or relationship | Label | Evidence and interpretation |
| --- | --- | --- |
| `(2026-10-10) user:` identifies the source day and role. | Supported | `389db73e-5aa0-433a-bef4-d4ff52d46ee0`, sentences `0` and `1`, carry that day and role. The prefix does not make Sigrid the user or the person performing the reopening. |
| “Reopen ESC-2219” represents a reopening instruction concerning that ticket. | Supported | Sentence `0` begins with those exact words. The imperative preserves action status. It neither reports a completed reopening nor asserts that the ticket remains open. |
| Sigrid reports that 2 of the 8 pendants have cracked glass. | Supported | Sentence `0` states this attribution, quantity, object, and defect verbatim. The focus reports Sigrid's account; it does not claim that Sigrid personally discovered the damage. |
| The defect report is attached to the instruction to reopen ESC-2219. | Supported | Sentence `0` joins the same clauses with the same colon. The focus preserves this relationship without turning it into a claim about an achieved open state. |

The rule “A request, instruction, or plan is not proof of completion” does not forbid faithfully representing an instruction. Both corrected focuses preserve the imperative. The unresolved question of whether reopening occurred therefore does not undermine either focus's shared wording.

## Additional assertions in `statement-a`

The added clause asserts requirements that neither the defect report nor the electrician's discovery supplies.

| Assertion or relationship | Label | Evidence and interpretation |
| --- | --- | --- |
| The cracked glass requires repair. | Unsupported | `389db73e-5aa0-433a-bef4-d4ff52d46ee0`, sentence `0`, reports damage, while sentence `1` reports discovery. Neither prescribes a repair. |
| An electrician must perform the repair. | Unsupported | Sentence `1` assigns discovery to “Her electrician.” It does not assign a repair duty to that person or to another electrician. |
| Replacement cannot proceed until the electrician's repair. | Unsupported | Neither source sentence states this prerequisite, temporal order, or restriction on replacement. An electrician discovering damage does not establish a repair-before-replacement condition. |
| A replacement is contemplated for the pendants, on the local reading of “replacement.” | Unsupported | The ESC-2219 sources mention receipt, defects, discovery, and handling instructions. They contain no pendant replacement plan. |

The sources do not explicitly deny an electrician's repair or a replacement condition. The added assertions are unsupported, rather than contradicted. Reading the repair clause as part of Sigrid's reported speech does not rescue it: the source attributes only the defect report and discovery account to Sigrid, not the added requirement.

## Complete candidate context and ambiguity

The candidates' surrounding lines concern Grace's duvet replacement and Copperline's buyer change. They do not change “Reopen” into a report of completed work, alter the ticket identifier, negate the defect report, or make the focus hypothetical. Those surrounding statements are not factual evidence and are not separately adjudicated here.

In `statement-a`, the nearest subject for “replacement” is the damaged pendants, but the surrounding lines also mention Grace's replacement. The supplied evidence supports no electrician-repair prerequisite under either reading. For Grace, the relevant approval instruction is `f0029308-0698-467b-a17c-4426839dca28`, sentence `1`, dated 2026-10-08: “Because of her two earlier claims, any replacement for Grace needs Marcus to sign off first.” The temporary delegation is `104c1b31-19f4-468f-bec4-8d24a2cc294b`, sentence `1`, also dated 2026-10-08: “Until 2026-10-09, Ruth Adeyemi, our deputy manager, gives any sign-off that would normally need Marcus.” Neither concerns an electrician.

Grace's later sources also supply no repair prerequisite. On 2026-10-09, `0a5618dc-cbca-4cfb-8218-2bea8bcccdce`, sentence `1`, says: “Parcelway has no answer on TR-3307 yet, so if nothing turns up by the end of the day we send her replacement.” On 2026-10-10, `2cbf9631-30e5-4426-a424-d77dc3f13b8d`, sentence `0`, says: “Reopen TR-3307: Grace opened the parcel from locker 14 and it's a twin duvet set addressed to someone else, not her queen set.” Its sentence `1` says: “Grace: She still wants her own replacement.” The source concerns continued replacement demand, not an electrician's repair.

The possible replacement-reference ambiguity does not determine `statement-a`'s ruling; its prerequisite fails even on the locally natural pendant reading. `statement-b` contains no replacement clause and has no unresolved reference that affects support.

## Settled labels

The focus labels follow the supplied criteria.

| Focus | Settled label | Boolean result | Decisive reason |
| --- | --- | --- | --- |
| `statement-a` | Unsupported | `false` | Adds a repair obligation, electrician assignment, and repair-before-replacement prerequisite absent from the complete sources. |
| `statement-b` | Supported | `true` | Reproduces the source instruction and attributed defect report with matching source day and role, without claiming completion. |

Actual reopening completion remains unknown, but neither corrected focus asserts it. No score or adoption ruling is made.
