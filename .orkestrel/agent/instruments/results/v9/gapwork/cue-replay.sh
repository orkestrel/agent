#!/bin/bash
# Replays a1-ledger-v1 with its g04 answer pass recorded as cued, the record a refined run writes: the pass
# carries `note` ANSWER_CUE and every view from g04 on holds the cue message. Usage: cue-replay.sh installed|FILE, as in proof.sh.
WORK=/home/user/agent/tmp/bench/results/v9/gapwork
REC=$WORK/cue-record
mkdir -p $REC
cp /home/user/agent/tmp/bench/results/v9/a1-ledger-v1/seed.json $REC/
node -e '
const fs = require("fs")
const cue = "[Desk] Give your complete answer now as your final message, from what you already have."
const rows = fs.readFileSync(process.argv[1], "utf8").trim().split("\n").map((line) => JSON.parse(line))
let shift = 0
for (const row of rows) {
	if (row.goal.startsWith("g04")) for (const pass of row.passes) if (pass.kind === "answer") (pass.note = cue), (shift += 1)
	row.view += shift
}
fs.writeFileSync(process.argv[2], rows.map((row) => JSON.stringify(row)).join("\n") + "\n")
' /home/user/agent/tmp/bench/results/v9/a1-ledger-v1/ledger.jsonl $REC/ledger.jsonl
PRE=(); TAG=installed
if [ "$1" != installed ]; then export SERVE_FILE=$1; PRE=(--import $WORK/use-file.mjs); TAG=$(basename $1); fi
node "${PRE[@]}" --import /home/user/agent/tmp/bench/results/v8/refinework/no-net.mjs /home/user/agent/tmp/bench3/bench.mjs --check-ledger --profile refined --replay $REC --scenario /home/user/agent/tmp/bench/variants/ledger/v1.json --judgments /home/user/agent/tmp/bench/results/v3/cal-categories.jsonl > $WORK/cue-replay-$TAG.txt 2>&1
echo "cue replay $TAG exit $? | $(grep 'recorded message count' $WORK/cue-replay-$TAG.txt | cut -c1-140)"
