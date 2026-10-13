# Citation corrections for the immutable report

The immutable report's extraction citations need the following exact locations. These corrections change no finding or subject byte.

- The request/response identity values are at `tmp/units/aggregate-q2-full-failure/summary.json:258`, replacing the report's citation to line 201 of that file.
- The preserved-prefix and XML-tag checks are at `tmp/units/aggregate-q2-full-failure/custody.json:142`, replacing the report's citation to line 141 of that file.
- The selected goal row is at `tmp/units/aggregate-q2-full-failure/summary.json:219`; selected turns, including answer recovery, begin at `tmp/units/aggregate-q2-full-failure/summary.json:238`, replacing the report's citation to line 165 of that file. Raw request citations in that paragraph remain unchanged.

After creating the report, `node .agents/skills/orkestrel-dispatch/scripts/cite.ts tmp/units/aggregate-q2-full-failure-report.md` reported `cite: 29 citation(s) in tmp/units/aggregate-q2-full-failure-report.md, 0 unresolved`. That check validates file/line existence, not semantic attribution; the corrections here follow direct inspection.

The immutable report has SHA-256 `612605be511d6824d084a0c6e210b42cabb6820b9b34bf2e207fbda137086022`.
