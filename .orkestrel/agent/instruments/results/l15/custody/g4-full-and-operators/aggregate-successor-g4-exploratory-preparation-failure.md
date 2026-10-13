# Exploratory preparation failure

The G4 thinking-disabled materializer stopped before inference at HEAD `b33dc98e13f589b0196b9f1aad9bd100306926f5`. The exact command was `node tmp/units/aggregate-successor-g4-exploratory-prepare.ts g4-think0 --head b33dc98e13f589b0196b9f1aad9bd100306926f5`. Exec session 69600 returned exit 1 with `development cutoff or fresh calibration custody differs`. Complete duration was not captured.

The original materializer created the policy under the cell's exploration directory, then failed inside readDevelopment before writing an execution manifest or creating a cache/run. Preserve that policy. Root read the deciding guard and the saved diagnosis preparation references: their hashes match the policy, but the diagnosis preserves relative paths while the materializer constructs absolute paths. The guard compares the complete reference objects.

The bounded successor brief preserves the guard and all calibrated values. It requires exact retained calibration references, checks their resolved file identity and fixed hash, and uses a fresh G4 exploration-2 destination. Root will read every predicate and the actual diff before materializing that successor. This is an operator-artifact correction; it does not authorize a canonical source change, repeated calibration, or model retry.
