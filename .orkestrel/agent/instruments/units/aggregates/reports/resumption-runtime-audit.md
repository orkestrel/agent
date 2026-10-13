# Runtime summary audit

The archived runtime scores cannot satisfy the revised feasibility rule by changing the cutoff alone. At the lowest separating grid cutoff, 0.78, the diagnostic recalls 0 of 4 scored supported drafts and accepts 0 of 4 scored unsupported drafts. The declared recall floor is 0.5. This diagnostic does not deploy a fit or replace the archived STOP.

## Population and custody

The blinded population contains every AGREE-scored g01 build and the final build of every withheld g01 topic. The extraction run produced 12 items: 9 scored builds and 7 final builds, with 4 overlapping memberships. It retains a repeated draft as a separate operational item. The remaining 3 items have no archived AGREE score; no score was invented for them.

See [the blinded packet](runtime-audit/packet.jsonl), [the private source mapping](runtime-audit/mapping.jsonl), [the original verdicts](runtime-audit/verdicts.json), and [the root adjudication](runtime-audit/adjudication.json). The extraction verified each scored question and state against the archived judge cache and reconstructed the source projection from the recorded messages. The packet excludes scores, topic labels, build order, and acceptance outcomes. The original verdict file remains unchanged.

The packet SHA-256 is `2f7c267dc8ed24a6fc68adc7609bfe6637df34a30d1d7fd8eb8a2b5926bba45b`. The mapping SHA-256 is `8c935f627ff5f8dabc38c57398276ddf612738bea2e80545a2e3c8ab261228ac`. The original verdict SHA-256 is `6b16ba75bf88184eec455c6af6cf405bd050ad289ddd2991c5a5c5a1e4704cf6`.

## Source grouping correction

Root rejects the original audit's inference that separate dated source lines establish separate messages. The two escalation-rule sentences share message ID `a0f83ddd-123e-448f-977d-18cf754e4ba7`, seed index 6, and sentence indexes 0 and 1. The raw archived message contains both sentences in that order. The blinded packet renders each sentence separately and omits this grouping information.

The affected IDs are `0ed98d2fc5646a13e045344ac1bb06d35789a5d8ea56d521d8c592548e10952d-000001`, its `-000002` duplicate, and `fa2dfd32fae51a5cf8bb93ba3178486e30f9ae9f4c5ca961df148adbb5e58f91-000001`. Their only adverse proposition was the same-message relation. The independent auditor received the grouping metadata without scores and resolved those propositions as supported; see [the grouping supplement](runtime-audit/grouping.md). Root accepts that correction after checking the raw message and the mapping. Every other proposition retains its original ruling.

The packet format needs explicit source grouping in any later human audit. This presentation defect does not establish the cause of the automated judge's scores.

## Adjudicated findings

The adjudicated population has 5 supported items, 6 unsupported or contradicted items, and 1 ambiguous item. The ambiguous approval-threshold wording remains ambiguous; it is not relabeled as supported to improve recall. Among scored items, the supported scores range from 0.47218748995940685 to 0.5112304729912349. An unsupported completed-return claim scores 0.7753600931549042. No cutoff on the retained 0.51-to-1 grid rejects every scored negative while recalling half the scored positives. Conservatively refusing the ambiguous item leaves this conclusion unchanged.

The supported delivery draft has no AGREE score because its date wording failed the lexical check. Semantic support does not exempt that draft from the declared exact-value filter. Other rejected drafts turn requests into completed actions, turn standing responsibilities into completed events, change actor relationships, or reverse an absence into a return. These findings justify a bounded generation-prompt repair. They do not justify relaxing a checker or lowering a cutoff to produce exposure.

The command `node tmp/units/runtime-adjudicate.ts` exited 0 in the session worktree. It checked the packet and verdict hashes, the mapping/verdict ID bijection, the exact archived grouping, each corrected item's sole adverse proposition, population totals, and every candidate grid cutoff. Its result is the retained adjudication file. The original auditor separately verified 55 propositions and 90 source quotations over the 12 items, with missing and extra IDs both 0.

## Implementation direction

Use the revision's permitted prompt repair to preserve actor relationships, conditional rules, requested versus completed actions, and literal copied values. State the information directly instead of narrating message provenance. Include exact offending copied tokens in retry feedback. Keep the judge question, lexical checks, source-selection mechanism, and render filter unchanged.

A generated draft must receive an independent support label before it can be a positive calibration item. Use runtime source projections in the development calibration. Preserve unsupported and ambiguous drafts in the record, refuse a fit that misses the declared recall floor, and retain the archived STOP. A cached draft cannot establish that the repaired prompt improves generation. The bounded live development run and its costs remain necessary.
