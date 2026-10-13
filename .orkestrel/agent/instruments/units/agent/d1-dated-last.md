The complete requested output is in [output.json](/home/user/agent/tmp/bench/dated/output.json), with separate files for each section:

- [Date table and derivations](/home/user/agent/tmp/bench/dated/table.json).
- [Every changed string, per file, with source and rendered text](/home/user/agent/tmp/bench/dated/changes.json).
- [Rendered seed 0, seed 8, and LH-81660 lookup for v1 and v8](/home/user/agent/tmp/bench/dated/samples.json).
- [Rendered g06 scoring fields, including staged rules](/home/user/agent/tmp/bench/dated/scoring.json).
- [Each pre-implementation check failure](/home/user/agent/tmp/bench/dated/failures.json).
- [Each gate’s exit code](/home/user/agent/tmp/bench/dated/gates.json).

All seven check groups initially failed because implementation modules were absent. They subsequently passed. Syntax, identity, rendering, after-file verification, and protected-input gates exit **0**. All eight after files exist.

The broad unchanged-files gate exits **1**: three existing benchmark logs changed during a separate run. This unit wrote only within the permitted directories; all 278 protected non-result files retained their hashes.

The sources contain no order dates. Luis’s recorded delivery date remains the anchor for the 30-day return interval.