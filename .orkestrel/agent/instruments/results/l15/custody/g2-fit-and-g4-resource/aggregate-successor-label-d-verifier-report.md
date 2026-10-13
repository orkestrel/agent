# Aggregate successor label D mechanical verifier report

The released inputs matched the sealed packet, labels, and analyst report hashes before execution; the reader copy uses the released packet seal and 174 item census. See `tmp/units/aggregate-successor-label-d-verifier-brief.md:59`, `tmp/units/aggregate-successor-label-d-verifier-reader.ts:8`, and `tmp/units/aggregate-successor-label-d-verifier-reader.ts:29`.

The checker ran once through the checkout's existing built dispatch launcher with a 60-second cap. It exited 0 after 150 ms, with `capped=false`; the launcher recorded PID 45972. See `tmp/units/aggregate-successor-label-d-verifier-execution.txt:2` and `tmp/units/aggregate-successor-label-d-verifier-stderr.txt:2`.

The complete checker stdout is `{"occurrences":174,"propositions":681,"sha256":"5f2c0c2a781a9e3888b07e17ee9a3fd484984be9a0916c37d6514fcb7ce7a923","rejected":["missing occurrence","wrong item hash","non-source quotation","incorrect verdict aggregation"]}`. The checker stderr was empty; the dispatch launcher appended `exit=0 signal=none capped=false duration_ms=150` to its errors capture. See `tmp/units/aggregate-successor-label-d-verifier-stdout.jsonl:1` and `tmp/units/aggregate-successor-label-d-verifier-stderr.txt:2`.

The existing controls rejected missing coverage, an incorrect item hash, a quotation absent from the source set, and incorrect verdict aggregation. The copied checker retains those controls and its coverage, item-hash, quotation, and aggregation predicates. See `tmp/units/aggregate-successor-label-d-verifier-check.ts:20`, `tmp/units/aggregate-successor-label-d-verifier-check.ts:32`, `tmp/units/aggregate-successor-label-d-verifier-check.ts:42`, and `tmp/units/aggregate-successor-label-d-verifier-check.ts:52`.

The literal adaptation diff changes only the packet and label/report paths, input seals, packet byte length, item census, and reader import. See `tmp/units/aggregate-successor-label-d-verifier-adaptation.diff:7`, `tmp/units/aggregate-successor-label-d-verifier-adaptation.diff:9`, and `tmp/units/aggregate-successor-label-d-verifier-adaptation.diff:31`.

The packet, labels, analyst report, and original alias-A reader/checker remained byte-identical across the run. Their before/after sizes and SHA-256 hashes are recorded in the comparison artifact. See `tmp/units/aggregate-successor-label-d-verifier-comparison.txt:2`, `tmp/units/aggregate-successor-label-d-verifier-comparison.txt:3`, `tmp/units/aggregate-successor-label-d-verifier-comparison.txt:4`, `tmp/units/aggregate-successor-label-d-verifier-comparison.txt:5`, and `tmp/units/aggregate-successor-label-d-verifier-comparison.txt:6`.

This report records mechanical checks only. It makes no semantic grading or root acceptance claim.