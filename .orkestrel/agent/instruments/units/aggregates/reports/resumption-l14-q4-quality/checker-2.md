# Blind B mechanical check stopped on a verdict assumption

The B boundary stage passed after the sealed-file reference correction. The join stage stopped before writing joined outputs because the inherited verdict rule rejected a sealed `systemTool=unattempted` entry for the absent planned goal.

## Inputs and boundary result

The packet SHA-256 matched `14b3d53e58eeb7dac1f975c6160974df0a133b6ae8a0cb76a0558c6e73ebfef7`; the judgment SHA-256 matched `237856cc30584657963c71c5fb3ec89636a6b7e05ce1bdb632e39d38b783f1a7`. Private joins hash to `cc1ef80f9f5bed19ae84956195e0accae726a5ad05a645ae4e5a1f278900b69d`; authored scenario hash is `24efde87208498722a7b25a69cb98ff12552da6379af0c6972144dbd63bf170b`. Packet and judgment population is 72 planned entries, statuses served=70, failed=1, unattempted=1; private joins contain 72 entries across three runs.

The boundary stage ran `node tmp/units/aggregate-l14-b-quality-boundary-check-2.ts` from `C:/Users/mikes/WebstormProjects/scaffold`; exit `0`, duration `103.0718 ms`. It validated 291 packet references, 465 scenario references and 231 nested seed references across 72 judgments. Eligible-goal pointers and all citations resolved against the exact sealed packet/scenario allowlist. The wrong-file control was rejected, the nested seed-boundary control was rejected at inclusive boundary 0, the served-answer semantic-unattempted control was rejected, and relative and absolute names of the sealed scenario resolved to the same file and fragment. Addendum output: `tmp/units/aggregate-l14-b-quality-boundary-addendum-2.md`, SHA-256 `5e1878d687349005df36742573ff647fd021b565f822263abd9f7dd66a415bb4`.

The boundary stage’s complete captured output is in `tmp/units/aggregate-final-blind-b-check-2-boundary.stdout.log` (SHA-256 `3da3ccad8721b31c36fe6a057cff9af91b0c3c16e0cd226ba97978209282eaf2`) and `tmp/units/aggregate-final-blind-b-check-2-boundary.stderr.log` (empty, SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`). Timing and argv are in `tmp/units/aggregate-final-blind-b-check-2-boundary.meta.json` (SHA-256 `f0081bb34e7d740444b5097eac3fc44535055e6131a2ee8efa645f57d9f0a08a`).

## Join deviation

The join stage ran `node tmp/units/aggregate-l14-b-quality-join-2.ts` from `C:/Users/mikes/WebstormProjects/scaffold`; exit `1`, duration `108.691 ms`. Its complete captured stdout is empty (SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`); stderr is retained at `tmp/units/aggregate-final-blind-b-check-2-join.stderr.log` (SHA-256 `5aea0bc14617c89ce57f3779fffd23303091e77a78180e9663e66a607960d649`). Timing and argv are in `tmp/units/aggregate-final-blind-b-check-2-join.meta.json` (SHA-256 `645437e4e71b3059f0fcda49c3f720e20c480f2c2a61c70fc995b50a04f31a31`). The diagnostic is `Invalid sealed verdict unattempted at 5aa4589dfcdaeae856136f8b9c8a0f79/systemTool`.

The copied A helper's `allowsVerdict` rule permits `unattempted` only for `semantic`. The successor brief permits semantic-unattempted validation and separately requires failed/unattempted `completeWork` to be `fail`; it does not direct a change to `systemTool` verdict eligibility. I stopped without widening that rule. The missing-row-specific checks and controls after this point did not run, and no joined JSON, Markdown or validation report was written by the join stage.

The sealed input status denominator remains 72 planned goals: 70 served, 1 failed and 1 unattempted. Per-arm joined counts were not computed because the join stage stopped before completion; the 3 private run identities were established from the input joins, but no output arm counts are claimed.

## Changes and retained diff

Fresh helper copies are `tmp/units/aggregate-l14-b-quality-boundary-check-2.ts` and `tmp/units/aggregate-l14-b-quality-join-2.ts`. Both resolve citation file portions against only the sealed packet/scenario paths before JSON-pointer resolution and preserve the original citation strings. The boundary helper adds the wrong-file control and tests relative/absolute path equivalence. The join copy contains the scoped missing-row/status/reply/completion checks, but the process stopped before those checks completed. The prior helpers and prior report remain unchanged.

The actual A-to-successor helper diff is retained at `tmp/units/aggregate-final-blind-b-check-helper-diff-2.patch`, SHA-256 `3530271809c4ed987e9188a8e75d4c24ccfbef19d6d0d1be53073eff89cdd5e4`.

The dispatch citation checker ran as `node .agents/skills/orkestrel-dispatch/scripts/cite.ts tmp/units/aggregate-final-blind-b-check-report-2.md` and reported 0 citations and 0 unresolved references.

No sealed input, judgment, A helper, source, build, service or Git mutation was issued by this unit. At the final read-only status observation, the working tree showed changes in `bench5/aggregates/Aggregator.ts`, `bench5/aggregates/helpers.ts`, and harness test files; their origin and relationship to the concurrent canonical work were not investigated. No semantic judgment or adoption conclusion is made.
