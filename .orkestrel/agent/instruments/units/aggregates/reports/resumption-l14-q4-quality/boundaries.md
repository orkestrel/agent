# L14 alias b quality-boundary validation addendum

The read-only boundary check resolved 291 packet references and 465 scenario references across 72 sealed judgments, including 231 nested seed-content pointers. It rejected the nested seed path /seed/1/content at inclusive boundary 0, a wrong-file reference, and semantic unattempted with status served and a nonempty reply. Relative and absolute references to the sealed scenario resolved to the same file and fragment.

## Sealed input hashes

- `tmp/units/aggregate-development-blind-packet-l14-b/packet.json`: 14b3d53e58eeb7dac1f975c6160974df0a133b6ae8a0cb76a0558c6e73ebfef7
- `tmp/units/aggregate-final-blind-b-judgments.json`: 237856cc30584657963c71c5fb3ec89636a6b7e05ce1bdb632e39d38b783f1a7
- `.orkestrel/agent/instruments/harness/bench/variants/long/v1.json`: 24efde87208498722a7b25a69cb98ff12552da6379af0c6972144dbd63bf170b

## Check result

```json
{
  "validated": true,
  "population": {
    "packet": 72,
    "judgments": 72
  },
  "scenarioReferences": 465,
  "packetReferences": 291,
  "seedReferences": 231,
  "nestedSeedReferences": 231,
  "controls": {
    "nestedBoundaryControlRejected": true,
    "servedAnswerControlRejected": true,
    "wrongFileControlRejected": true,
    "referenceFormsAgree": true
  },
  "hashes": {
    "tmp/units/aggregate-development-blind-packet-l14-b/packet.json": "14b3d53e58eeb7dac1f975c6160974df0a133b6ae8a0cb76a0558c6e73ebfef7",
    "tmp/units/aggregate-final-blind-b-judgments.json": "237856cc30584657963c71c5fb3ec89636a6b7e05ce1bdb632e39d38b783f1a7",
    ".orkestrel/agent/instruments/harness/bench/variants/long/v1.json": "24efde87208498722a7b25a69cb98ff12552da6379af0c6972144dbd63bf170b"
  }
}
```
