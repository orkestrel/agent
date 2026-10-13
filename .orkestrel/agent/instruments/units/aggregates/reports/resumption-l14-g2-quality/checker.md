# L14 alias a sealed blind-label checks

The boundary check and mechanical join both passed. The checker scripts and sealed packet/judgment inputs retained their expected SHA-256 identities after execution. No inference or semantic regrading was performed.

## Commands and captures

| Command | Exit | Duration | Raw stdout | Raw stderr |
| --- | ---: | ---: | --- | --- |
| `node tmp/units/aggregate-l14-a-quality-boundary-check.ts` | 0 | 109 ms | `tmp/units/aggregate-final-blind-a-check-boundary.stdout.bin` (766 bytes; SHA-256 `57ace6dd89947c692a71f28570d013bc5b3f429e69b628302a93a8eca6e50fd9`) | `tmp/units/aggregate-final-blind-a-check-boundary.stderr.bin` (0 bytes; SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`) |
| `node tmp/units/aggregate-l14-a-quality-join.ts` | 0 | 134 ms | `tmp/units/aggregate-final-blind-a-check-join.stdout.bin` (6696 bytes; SHA-256 `17814e117adfcf83f1afdd7b398ef1ee1692cbe4533090c5bd559c8eddcb968e`) | `tmp/units/aggregate-final-blind-a-check-join.stderr.bin` (0 bytes; SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`) |

The boundary checker validated 72 packet and 72 judgment entries. It traversed 534 scenario references, including 294 seed references, all of which were nested seed-content references. Its nested seed-boundary control and served-answer semantic-unattempted control were both rejected.

The join validated 72 packet IDs, 72 judgment IDs, and 72 private-join IDs with complete one-to-one coverage. The duplicate/missing-ID control and the served-answer semantic-unattempted control were both rejected.

## Output hashes

| Output | SHA-256 |
| --- | --- |
| `tmp/units/aggregate-l14-a-quality-boundary-addendum.md` | `fc5fce8db48cbe1955d69abbb9b32ca78db7a3a64fdc2081f08dbc8d5133b211` |
| `tmp/units/aggregate-l14-a-quality-joined.json` | `ccd26887ca3c8b4123b1346332e3a53c1bcb67823729a3d1f85e01821d83ad17` |
| `tmp/units/aggregate-l14-a-quality-report.md` | `9ce5c2acd8493e91b5b91cd39b9c73b11b4011742627d5e7353ab9dc6d73f503` |
| `tmp/units/aggregate-l14-a-quality-join-validation.md` | `c3cada137bee6e9101f4f8c79227541433f985c379c485120409f1f248086c4c` |

The packet, judgments, boundary checker, and join checker still match the dispatch seals. The runner saved complete child streams before proceeding; it invoked the join only after the boundary command exited 0. No other source, build, Git, or model operation occurred.
