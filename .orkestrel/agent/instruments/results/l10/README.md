# Preserve the stopped development attempt

The records attempt stopped before an answer because its successful one-token flush was classified as a development integrity failure. Aggregate and full view were not launched. See [the execution report](../../units/aggregates/reports/resumption-l10-development-stop.md).

The launched command also used relative cache arguments despite prepared absolute paths. The original cache remains under `harness/.orkestrel/agent/instruments/results/l10/q2-think0/records/cache/`, relative to the instruments directory. Byte-identical copies are under `q2-think0/records/cache-preserved/`; the execution report records their hashes. Preserve the original references in `run.json` and the lineage file. No artifact from this attempt is an accepted quality comparison.
