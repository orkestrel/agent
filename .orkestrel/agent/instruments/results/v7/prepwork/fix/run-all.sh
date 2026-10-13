#!/bin/sh
# Runs the validation set with daemon fetches refused; writes each output to $1 and prints exit codes.
out=$1
mkdir -p "$out"
export NODE_OPTIONS="--import=/home/user/agent/tmp/bench/results/v7/prepwork/no-daemon.mjs"
cd /home/user/agent/tmp/bench
for cmd in "--check bench.mjs" "--check rescore.mjs" "bench.mjs --probe-reply" "bench.mjs --probe-search" "bench.mjs --probe-guard" "bench.mjs --probe-chain" "bench.mjs --probe-exchanges --goals 1" "bench.mjs --probe-score"; do
	name=$(echo "main $cmd" | tr -c 'a-z0-9\n' '_')
	node $cmd > "$out/$name.txt" 2>&1
	echo "bench: node $cmd -> $?"
done
cd /home/user/agent/tmp/bench3
for cmd in "--check bench.mjs" "bench.mjs --check-ledger" "bench.mjs --check-ledger --replay /home/user/agent/tmp/bench/results/v3/ledger-deny" "bench.mjs --check-ledger --replay /home/user/agent/tmp/bench/results/v3/ledger-admit"; do
	name=$(echo "b3 $cmd" | tr -c 'a-z0-9\n' '_' | cut -c1-60)
	node $cmd > "$out/$name.txt" 2>&1
	echo "bench3: node $cmd -> $?"
done
