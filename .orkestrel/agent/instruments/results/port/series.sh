#!/bin/sh
# Runs the U9 live series over copies 1 to 8, one at a time, and logs each start and end.
OUT=/home/user/agent-port/tmp/bench4/results
LOG=$OUT/run.log
for n in 1 2 3 4 5 6 7 8; do
	if [ -e "$OUT/p1-ledger-v$n" ]; then echo "===== p1-ledger-v$n exists; skipped" >> "$LOG"; continue; fi
	echo "===== p1-ledger-v$n start $(date -u +%Y-%m-%dT%H:%M:%SZ) commit $(git -C /home/user/agent-port rev-parse --short HEAD)" >> "$LOG"
	node /home/user/agent-port/tmp/bench4/driver.mjs --copy "$n" --out "$OUT" --live > "$OUT/p1-ledger-v$n.log" 2>&1
	echo "===== p1-ledger-v$n end $(date -u +%Y-%m-%dT%H:%M:%SZ) exit $?" >> "$LOG"
done
