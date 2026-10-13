#!/bin/bash
V2=/home/user/agent/tmp/bench/results/v2
OUT=/home/user/agent/tmp/bench/results/v3
B=/home/user/agent/tmp/bench3/bench.mjs
run() { name=$1; shift; echo "===== $name start $(date -u +%FT%TZ) [$*]" >> $OUT/run.log; node $B "$@" --out $OUT/$name > $OUT/$name.log 2>&1; echo "===== $name end $(date -u +%FT%TZ) exit $?" >> $OUT/run.log; touch $OUT/$name.done; }
while [ ! -f /home/user/agent/tmp/bench/results/dump/DUMP.done ]; do sleep 20; done
COMMON="--ctx 3072 --judge mica --judge-ctx 4096 --budget 0.55 --tail 0.35 --horizon 3 --judgments $OUT/cal-categories.jsonl"
run ledger-deny --mode ledger --gate deny $COMMON
run ledger-admit --mode ledger --gate admit $COMMON
touch $OUT/LEDGER.done
