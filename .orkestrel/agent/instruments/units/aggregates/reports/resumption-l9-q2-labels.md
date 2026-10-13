# Independent packet labels

The packet received an independent semantic reading against its supplied sources. The labels are proposed judgments for root adjudication, not final acceptance or numerical judge scores.

The verification run of `node tmp/units/aggregate-calibration-labels-check.ts` reported PASS: 168 input items, 168 labels, 449 proposition records, and 661 exact source quotations. Every occurrence ID appears exactly once in packet order. Every item hash is SHA256 of `JSON.stringify(parsedItem)` in its original parsed property order. The check also verified schema, proposition presence, quotation/source identity, and the relation between proposition and whole-candidate verdicts. These are data-integrity checks, not an independent semantic review.

The output census from `node tmp/units/aggregate-calibration-labels-write.ts` is 123 supported, 21 contradicted, 12 unsupported, and 12 ambiguous labels.

| Artifact | SHA256 |
| --- | --- |
| `tmp/units/aggregate-calibration-packet.jsonl` | `606faa019bab5d6724ced6b0e1c118568b2c585befeeb43c1c6943fdf514bd58` |
| `tmp/units/aggregate-calibration-labels.json` | `672627891011b4f2b470ce844af355054854727347ef0c88ee234be0dee0d4bb` |

The packet reader measured 47 exact semantic groups. A group key serializes the complete candidate, complete question, exact rendered state string, complete ordered source objects, and complete component objects with only component IDs omitted. Occurrence ID and revision are not part of that equality key. They remain in the original item used for each individual hash. No candidate, question, state, source, or component focus was truncated or normalized for grouping. Component candidate/evidence fields and exact focus spans were checked against their enclosing item. Analysis was shared only within those exact-equality groups; output records remain separate for every occurrence.

The ambiguous judgments concern candidate-local reference and terminology. Groups 7, 35, and 40 omit Grace while retaining “her replacement”; the evidence supplies Grace, but the complete candidates leave the referent unresolved or suggest Priya or Dalia. Root can adjudicate whether source trace context alone resolves that omission. Groups 30 and 39 call TR-3307 “tracking”; the sources identify it as a locker trace, and group 39 separately supplies parcel tracking PW-5521-9930. “Tracking” can describe the trace process or imply a changed identifier category. Group 39 is unsupported overall because “will receive” additionally exceeds the conditional plan to send.

Other interpretation choices are explicit in proposition evidence. A name followed by a colon is read as a topic label where it reproduces the source wording, rather than inventing speaker attribution. Explicit `user` versus `tool` labels identify sources. Changed source dates are material even where an event date is not separately asserted. A trailing incomplete date fragment without a proposition is a formatting defect; a truncated number presented as an identifier or payment term changes a material value. Instructions to reopen, close, send, or approve do not establish execution. A conditional send plan copied from a source does not expressly waive an earlier approval requirement. The source packet for each item alone determines whether an earlier fact was superseded; facts from another item were not imported.

The manual judgments reside in `tmp/units/aggregate-calibration-labels-write.ts`; the script serializes those judgments and source quotations rather than generating verdicts from text patterns. No prior labels, private mapping, model/settings, generation attempts, or calibration scores were read. No source, build, service, model, or git operation was performed.
