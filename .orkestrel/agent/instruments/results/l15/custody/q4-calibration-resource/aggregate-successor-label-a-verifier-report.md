# Independent label mechanics verification

The adapted checker exited 0 and mechanically validated all 171 occurrences and 523 propositions. It retained the original ID/hash, source-quotation, verdict-aggregation checks and rejected all four in-memory negative controls: missing occurrence, wrong item hash, non-source quotation, and incorrect verdict aggregation (`tmp/units/aggregate-successor-label-a-verifier-check.ts:20`, `:40`, `:52-56`, `:65`). This confirms serialization and evidence-reference mechanics only; it does not assess semantic support.

The packet, labels, and auditor report matched their pre-execution seals and remained byte-identical afterward:

| File | Before and after SHA-256 |
| --- | --- |
| `tmp/units/aggregate-successor-label-a-packet.jsonl` | `0e3eaecbf38d7dad2450fb2748db860aeb8117679f06f8a7bf27ea93ad5f9541` |
| `tmp/units/aggregate-successor-label-a.json` | `532865b974936adafddbba040b38a54224b08ba6060c5c4cad5ce652d488adae` |
| `tmp/units/aggregate-successor-label-a-report.md` | `867f5c34f765d280f268cca403e8ce63f5d0e3f2acf9e621704a150dae0560b0` |

The auditor report was hash-read only. The successor checker adds explicit guards for those three files and removes the original `appendFileSync` report mutation; the original checker and reader remain unchanged (`tmp/units/aggregate-successor-label-a-verifier-check.ts:6-18`, `tmp/units/aggregate-successor-label-a-verifier-adaptation.patch`). These are the exact sealed inputs supplied in the brief (`tmp/units/aggregate-successor-label-a-verifier-brief.md:13`, `:33`).

Successor checker SHA-256 is `3f05be0f95b30230e5d4d57e153e08785c9214367aa97397366e231d685e3a40`; exact adaptation diff SHA-256 is `17ad00b570c8082973d20d8950da295a74d8853c2983c4a6e41c3fb973042150`; run metadata SHA-256 is `99d8ee3ab23f1795d5ded67da18aa635a5722480107fdab0f95f95595b77c0e4b`.

Execution used `node tmp/units/aggregate-successor-label-a-verifier-run.ts`, which launched `node tmp/units/aggregate-successor-label-a-verifier-check.ts` from the scaffold root once. Child PID `60076` exited `0`, with no signal; monotonic duration was `208.52 ms`. Complete stdout is `tmp/units/aggregate-successor-label-a-verifier.stdout.log` (222 bytes, SHA-256 `e4b082077714276400957bbb9333993c7556c8fcb4bfcbff72d48dc6daec3cb0`); complete stderr is `tmp/units/aggregate-successor-label-a-verifier.stderr.log` (empty, SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`). Exact argv, duration, child exit and before/after seals are in `tmp/units/aggregate-successor-label-a-verifier.meta.json`.

The dispatch citation checker must resolve every cited file and line before review. No model, build, source, service, or Git action was performed.
