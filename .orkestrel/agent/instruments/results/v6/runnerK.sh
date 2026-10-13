#!/bin/bash
OUT=/home/user/agent/tmp/bench/results/v6
V3=/home/user/agent/tmp/bench/results/v3
B3=/home/user/agent/tmp/bench3/bench.mjs
run() { name=$1; shift; echo "===== $name start $(date -u +%FT%TZ) [$*]" >> $OUT/run.log; node $B3 "$@" --out $OUT/$name > $OUT/$name.log 2>&1; local code=$?; echo "===== $name end $(date -u +%FT%TZ) exit $code" >> $OUT/run.log; touch $OUT/$name.done; return $code; }
while [ ! -f $OUT/LEDGERGO ]; do sleep 20; done
R=$(cat $OUT/LEDGERGO)
COMMON="--mode ledger --ctx 3072 --judge mica --judge-ctx 4096 --tail 0.35 --horizon 3 --judgments $V3/cal-categories.jsonl --reply $R"
run ledger-smoke $COMMON --gate deny --smoke && { run ledger-deny $COMMON --gate deny; run ledger-admit $COMMON --gate admit; } || echo "===== ledger smoke failed; ledger arms skipped" >> $OUT/run.log
echo "$R" > $OUT/DECIDED
