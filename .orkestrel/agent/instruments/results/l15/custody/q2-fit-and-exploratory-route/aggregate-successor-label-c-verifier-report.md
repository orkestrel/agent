# Alias C mechanical verifier execution

The alias C verifier completed once with exit code 0, no signal, and no output cap. The checker reported 168 occurrences, 423 propositions, the released labels digest, and all four preserved rejection controls. The exact bare capture is preserved in the stdout file; launcher status and immutable input seals are recorded in the execution receipt. [capture](tmp/units/aggregate-successor-label-c-verifier-stdout.jsonl:1) [receipt](tmp/units/aggregate-successor-label-c-verifier-execution.json:1) [launcher status](tmp/units/aggregate-successor-label-c-verifier-stderr.txt:1)

The owned C reader and checker are literal path/seal/count adaptations of alias A. Their complete diff is preserved. The adaptation changed only packet path, packet digest, byte length, occurrence census, verifier import, and released C input paths/digests; checks and negative controls were retained. [adaptation diff](tmp/units/aggregate-successor-label-c-verifier-adaptation.diff:1) [reader](tmp/units/aggregate-successor-label-c-verifier-reader.ts:8) [checker](tmp/units/aggregate-successor-label-c-verifier-check.ts:6)

The packet, labels, analyst report, and alias A source helpers had identical before/after sizes and SHA-256 seals. No semantic judgment or root acceptance was performed. [execution receipt](tmp/units/aggregate-successor-label-c-verifier-execution.json:9)
