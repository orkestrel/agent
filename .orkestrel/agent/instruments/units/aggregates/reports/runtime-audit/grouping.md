# Runtime grouping supplement

The same-message findings are resolved on the root-supplied grouping evidence. Each affected item's supplemental overall verdict is **supported**, with agreement **true**, under the unchanged support standard.

The original audit incorrectly treated separate dated source lines as proof of separate source messages. The packet flattened sentence identity and did not establish that inference. Root supplies message ID `a0f83ddd-123e-448f-977d-18cf754e4ba7`, seed index `6`, and sentence indexes `0` and `1` for these exact source sentences:

> Third rule: copy Priya Raman from the refunds team on every escalation.

> And never promise a customer a delivery date in writing.

This grouping metadata is a root-supplied supplement unavailable in the original packet. The findings that follow rely conditionally on the supplied identity being accurate. I did not inspect the private extraction map.

| Blind ID | Original provenance verdict | Supplemental provenance verdict | Resulting overall verdict |
| --- | --- | --- | --- |
| `0ed98d2fc5646a13e045344ac1bb06d35789a5d8ea56d521d8c592548e10952d-000001` | contradicted | supported; sole contradiction resolved | supported; agrees true |
| `0ed98d2fc5646a13e045344ac1bb06d35789a5d8ea56d521d8c592548e10952d-000002` | contradicted | supported; sole contradiction resolved | supported; agrees true |
| `fa2dfd32fae51a5cf8bb93ba3178486e30f9ae9f4c5ca961df148adbb5e58f91-000001` | contradicted | supported; sole contradiction resolved | supported; agrees true |

For `0ed98d2fc5646a13e045344ac1bb06d35789a5d8ea56d521d8c592548e10952d-000001`, the affected claim is “The same message clarifies.” The shared original message ID supports that relation. Every other proposition retains its original supported assessment.

For `0ed98d2fc5646a13e045344ac1bb06d35789a5d8ea56d521d8c592548e10952d-000002`, the affected claim is “The same message clarifies.” This item's source sentences also carry the supplied shared original message identity. Every other proposition retains its original supported assessment.

For `fa2dfd32fae51a5cf8bb93ba3178486e30f9ae9f4c5ca961df148adbb5e58f91-000001`, the affected claim is “a support desk message instructs to copy Priya Raman from the refunds team on every escalation and to never promise a customer a delivery date in writing.” Both instructions belong to the same original message under the supplied grouping. Every other proposition retains its original supported assessment.

The scope is limited to these provenance claims and the overall verdicts derived from their resolution. No other proposition was re-evaluated. Original packet, verdict, and report artifacts remain unchanged; this supplement does not rewrite them.

The before-and-after SHA256 checks match the original returned hashes:

- Packet: `2f7c267dc8ed24a6fc68adc7609bfe6637df34a30d1d7fd8eb8a2b5926bba45b`.
- Original verdict JSON: `6b16ba75bf88184eec455c6af6cf405bd050ad289ddd2991c5a5c5a1e4704cf6`.
- Original report: `1cd43d38becb9396f4bcadf0af2bea00b435dae1506c1f7677e9b0bc5c22a588`.

Supplement complete. No scores, mapping, service results, or calibration evidence were accessed.
