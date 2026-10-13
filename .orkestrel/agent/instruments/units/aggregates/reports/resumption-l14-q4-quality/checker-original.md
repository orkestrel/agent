# Blind B mechanical check stopped at boundary validation

The B boundary helper stopped before the join stage because its inherited scenario-reference prefix check refused the sealed reference form.

Expected by the copied helper: scenario references begin with the relative path `.orkestrel/agent/instruments/harness/bench/variants/long/v1.json#`.

Found in the sealed judgments: `C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/harness/bench/variants/long/v1.json#/ledger/system`. The file exists at that absolute path and hashes to `24efde87208498722a7b25a69cb98ff12552da6379af0c6972144dbd63bf170b`. A bounded structural read found 465 scenario references with that exact absolute prefix. No reference was rewritten or accepted by a changed checker.

The exact stage command was `node tmp/units/aggregate-l14-b-quality-boundary-check.ts`, run from `C:/Users/mikes/WebstormProjects/scaffold`. It exited `1` after `89.5743 ms`. Complete captured stage output is retained at `tmp/units/aggregate-final-blind-b-check-boundary.stdout.log` and `tmp/units/aggregate-final-blind-b-check-boundary.stderr.log`; stage metadata and hashes are at `tmp/units/aggregate-final-blind-b-check-boundary.meta.json`. The first stderr diagnostic is `Scenario reference outside source` for the reference above.

Sealed input checks before the stage matched: packet SHA-256 `14b3d53e58eeb7dac1f975c6160974df0a133b6ae8a0cb76a0558c6e73ebfef7`, judgment SHA-256 `237856cc30584657963c71c5fb3ec89636a6b7e05ce1bdb632e39d38b783f1a7`, private joins SHA-256 `cc1ef80f9f5bed19ae84956195e0accae726a5ad05a645ae4e5a1f278900b69d`, and authored scenario SHA-256 `24efde87208498722a7b25a69cb98ff12552da6379af0c6972144dbd63bf170b`. Packet and judgment each retain 72 planned entries with statuses served=70, failed=1, unattempted=1; the private joins cover 72 entries across three runs.

Done: created B-prefixed copies of the existing boundary and join helpers with B input aliases and supplied packet/judgment hashes, then ran the boundary stage once and preserved its output. The join stage did not run. No sealed input, A helper, source, build, service, or Git state changed. The B join helper contains only the alias/hash substitutions so far; the requested absent-row correction and controls are not implemented.

The exact A-to-B helper diffs are retained at `tmp/units/aggregate-final-blind-b-check-helper-diff.patch`, SHA-256 `9c2ece8318c1559309f31ae3500864450083ea1f91012e57d0884623167ccf23`.

One hypothesis: the B exporter stores scenario citations as absolute canonical paths while the A checker requires the relative alias, so path identity may need an explicitly scoped adjustment before the sealed references can resolve through this checker.
