# Correct the prospective exporter command

Use `.orkestrel/agent/instruments/harness/bench/variants/long/v1.json` for the copy argument. The lookup report incorrectly inserts a `bench5` segment. Root checked both exact paths: the authored scenario exists at the former path; the latter does not exist. The lookup's denominator and status findings remain supported by the exporter and retained rows.

Use the unversioned `tmp/units/aggregate-development-blind-packet-export.ts` exporter, which includes run identity in each opaque goal identifier, checks global uniqueness, and shuffles the combined population by those identifiers. The older `-1` file would repeat identifiers across arms and retain arm grouping. Root caught that mismatch before execution; the exact native lookup and direct source reading confirmed the accepted pipeline's unversioned command. The earlier lookup's status-enumeration finding also holds in that command.

The closed pilot was exported to the opaque output folder `tmp/units/aggregate-development-blind-packet-l14-b`. The unversioned command exited 0 and emitted 72 unique entries at SHA-256 `14b3d53e58eeb7dac1f975c6160974df0a133b6ae8a0cb76a0558c6e73ebfef7`. The public audit brief carries no model or arm identity. This correction changes no retained input or audit verdict.
