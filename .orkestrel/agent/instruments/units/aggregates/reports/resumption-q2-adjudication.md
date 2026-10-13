# Qwen 2B support adjudication

Root accepts the independent proposition labels before inspecting judge scores or fitting a cutoff. The calibration supplies evidence about summary support; it does not measure goal or sustained-work quality.

The clean-context Astra analyst read the opaque packet with SHA-256 `6b09f8b596108a2119a6905168c23f5f1e561415b23a4dcdd38c8f29afaa8f89`. Its labels have SHA-256 `b326d87421f58c54a3cefede53e63113b81bf6f70312f6ff4ccad2dcbfe99839`; its report has SHA-256 `7bf42c450240b3fee82170188d890d9f1301ca71cb63a969a09a2253bccffbc5`. The review covers 251 occurrences, 74 exact semantic inputs, 1,512 proposition occurrences, and 2,370 exact source quotations. These counts come from the analyst's 2026-10-11 assembly and validation run. Duplicate reuse required exact equality of the question, candidate, and grouped sources.

Root read every distinct proposition analysis and the independent report. Root also inspected the original candidates and grouped sources for the supported item and the attribution, fee-duration, completed-transaction, and relative-date questions. The final labels retain the analyst's judgments unchanged. The following rulings resolve the material acceptance questions.

| Representative | Ruling |
| --- | --- |
| `00adce39-e7a6-445d-9836-26fe6b5e349b` | Unsupported. The source records a ticket correction from the user role. The candidate identifies the correcting actor as a support desk agent without source evidence of that role. The otherwise accurate ticket and shipping facts do not establish the actor. |
| `26d7aa38-78a4-40e0-8eef-5f0849924509` | Ambiguous. Removing a fee “this morning” dates the policy change. Removing it “for this morning” can limit its duration. The candidate does not reliably preserve the policy's temporal scope. |
| `2a4362b4-af3f-4751-9ded-af2c39da5f78` | Ambiguous. A previous fee reduction “applied” can describe the policy governing a request or a completed transaction adjustment. The source records the request and policy change, without proving the transaction. |
| `a7894ea0-8387-42b8-b92e-d83eb643e5f9` | Ambiguous. “Yesterday” under an October 10 frame can relocate the evidenced October 8 release. The replacement condition and deadline also lose their source anchoring. |
| `c0c50b4d-c9b7-461a-b27f-e19d3e0cdc6d` | Supported. The ticket opening, chair quantity and amount, corrected extension, and retained contact window follow from this item's exact source group. |

The remaining rejected analyses identify unsupported completion or causality, reversed responsibilities, incorrect dates, invented amounts, or merged customer cases. Missing coverage alone is not a support failure. An omitted qualifier that changes an assertion is a support failure. Ambiguity remains nonpositive under the frozen fitting contract.

The root label container binds the corpus, attempts, packet, and generation manifest. The offline fit must reject invalid custody or quotations and preserve any inability to separate supported drafts from negative or ambiguous drafts. No threshold or label changes are authorized to improve that result.

The accepted labels contain 122 unsupported, 123 contradicted, 5 ambiguous, and 1 supported occurrences. The root container SHA-256 is `2da67ec028286e49c191068b65d3cf15efdede9a6d8bb0938f711b4057d9f7a3`.

The offline fit returned a measured refusal: child exit 3, uncapped, 2273 ms. The operator returned exit 1 because its launcher maps a nonzero child exit to failure. The retained diagnosis reports a candidate cutoff of 0.91 but zero supported occurrences scored or admitted, below the frozen admission floor of 0.5. No accepted fit file was produced. See [the full diagnosis](../../../results/l6/calibration/q2/fit/diagnosis.json) and [the adjudicated labels](../../../results/l6/calibration/q2/labels.json).

The supported draft spells source dates as “October 8, 2026” and “October 9, 2026”. The code check rejects the separate number tokens 8, 2026, and 9 because the source uses ISO dates. This is a concrete false rejection to consider in a bounded development revision. It does not repair the unsupported assertions in the other drafts or establish an accepted judge cutoff. Preserve this refusal while the other fixed model conditions finish; do not reinterpret it as an operational error or a quality comparison.
