#!/bin/bash
V4=/home/user/agent/tmp/bench/results/v4
OUT=/home/user/agent/tmp/bench/results/v3
B=/home/user/agent/tmp/bench3/bench.mjs
run() { name=$1; shift; echo "===== $name start $(date -u +%FT%TZ) [$*]" >> $OUT/run.log; node $B "$@" --out $OUT/$name > $OUT/$name.log 2>&1; local code=$?; echo "===== $name end $(date -u +%FT%TZ) exit $code" >> $OUT/run.log; touch $OUT/$name.done; return $code; }
while [ ! -f $V4/V4.done ]; do sleep 30; done
COMMON="--ctx 3072 --judge mica --judge-ctx 4096 --budget 0.55 --tail 0.35 --horizon 3 --judgments $OUT/cal-categories.jsonl"
run ledger-smoke --mode ledger --gate deny --smoke $COMMON || { echo "===== smoke failed; arms not run" >> $OUT/run.log; touch $OUT/LEDGER2.done; exit 1; }
run ledger-deny --mode ledger --gate deny $COMMON
run ledger-admit --mode ledger --gate admit $COMMON
touch $OUT/LEDGER2.done
