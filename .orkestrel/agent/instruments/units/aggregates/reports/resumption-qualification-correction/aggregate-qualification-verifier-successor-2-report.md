# Aggregate qualification verifier: successor `-2` stopped at formatting

The `-2` successor run stopped at the formatter gate. It followed root's release after applying the production patch and the sealed lexical rename repair. The seven released paths remain the only paths listed by scoped Git status. Their observed SHA-256 hashes match the repair-4 sealed test hashes and previously released production hashes [repair report](tmp/units/aggregate-final-qualification-repair-4-report.md:13):

| File | SHA-256 |
| --- | --- |
| `matrix/helpers.ts` | `A7DE6C270478C5E41FC6CA09A78EBCBE1362E16C95E2E69035535DB4D57F595A` |
| `aggregates/Aggregator.ts` | `2AB69C0948B69180417B766A694F9419AD2CEC36730AC0E50ED44DBDC73A244B` |
| `aggregates/helpers.ts` | `15671B0A876F6DC229A9E826AC3C7DED629C033A17C603FC28ED2F4E2DEB523E` |
| `tests/aggregates.test.ts` | `606FC9F908CAB1D3805A743FAE686F40044FA8AF0A59CBCA788C93CD59771F1C` |
| `tests/matrix.test.ts` | `A5C7BF1AC0932DFAF14A13234E56B5250FE48451A714658606D83F025AB9C9CB` |
| `tests/development.test.ts` | `07AB4BEC5C40109089AA89A5163EFB33D3C9CA038EFB8B2D2A519F171C04415D` |
| `tests/sustained/audit/Comparison.test.ts` | `A2197E27E49E46350855ADCE11FC13A9C20EDDA8731F9D24900CB2434F0C8C63` |

The fresh no-emit TypeScript check passed: `node node_modules/typescript/bin/tsc --noEmit --project .orkestrel/agent/instruments/harness/build.json --typeRoots node_modules/@types`. Dispatch exited 0, uncapped, in 3,134 ms [result](tmp/units/aggregate-qualification-verifier-successor-2-noemit.err:1).

The next exact scoped gate was `node node_modules/oxfmt/bin/oxfmt --config .oxfmtrc.json --ignore-path tmp/units/aggregate-final-qualification-repair-empty.ignore --check .orkestrel/agent/instruments/harness/bench5/matrix/helpers.ts .orkestrel/agent/instruments/harness/bench5/aggregates/Aggregator.ts .orkestrel/agent/instruments/harness/bench5/aggregates/helpers.ts .orkestrel/agent/instruments/harness/bench5/tests/aggregates.test.ts .orkestrel/agent/instruments/harness/bench5/tests/matrix.test.ts .orkestrel/agent/instruments/harness/bench5/tests/development.test.ts .orkestrel/agent/instruments/harness/bench5/tests/sustained/audit/Comparison.test.ts`. It exited 1, uncapped, in 79 ms. The complete child output identifies only `tests/matrix.test.ts` as not formatted; the other six files passed this formatter invocation [formatter output](tmp/units/aggregate-qualification-verifier-successor-2-format.jsonl:1), [result](tmp/units/aggregate-qualification-verifier-successor-2-format.err:1). The command and stop-on-failure sequence are prescribed in the checked verifier brief [brief](tmp/units/aggregate-qualification-verifier-brief-2.md:48).

I stopped immediately at this failure. The scoped lint, canonical build, all touched-file tests, and remaining core test census were not run for `-2`; the previous successor's lint failure and the accepted predecessor baseline remain preserved separately. The emitted build remains unrefreshed successor evidence and was not used. No source edits, installs, model calls, or service actions occurred in this run. Gate journals, child stdout/stderr, and status captures are under `tmp/units/aggregate-qualification-verifier-successor-2-{noemit,format}*` [released run boundary](tmp/units/aggregate-qualification-verifier-brief-2.md:48).
