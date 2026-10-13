#!/bin/bash
OUT=/home/user/agent/tmp/bench/results/v5
V3=/home/user/agent/tmp/bench/results/v3
B=/home/user/agent/tmp/bench/bench.mjs
run() { name=$1; shift; echo "===== $name start $(date -u +%FT%TZ) [$*]" >> $OUT/run.log; node $B "$@" --out $OUT/$name > $OUT/$name.log 2>&1; local code=$?; echo "===== $name end $(date -u +%FT%TZ) exit $code" >> $OUT/run.log; touch $OUT/$name.done; return $code; }
while [ ! -f $V3/LEDGER2.done ]; do sleep 30; done
JUDGE="--state bounded --neighbors 2 --criterion lookup --judge mica --judge-ctx 4096"
run cal-exchange --calibrate --unit exchange --goals 10 $JUDGE
T=$(node $OUT/pick-exchange.mjs $OUT/cal-exchange/calibration.jsonl 2>> $OUT/run.log) || T=0.9
echo "===== exchange threshold $T" >> $OUT/run.log
SEL="--mode selection $JUDGE --candidates newest --limit all --ctx 3072 --search words"
run sel-ex-judge-chain $SEL --threshold $T --unit exchange --finished judge --chain corrections
run sel-ex-drop-chain $SEL --threshold $T --unit exchange --finished drop --chain corrections
run sel-msg-chain $SEL --threshold 0.9 --unit message --chain corrections
run c-tuned-guard --mode compaction --ctx 3072 --search words --summary tuned --window 1600 --keep 6 --sections 3
touch $OUT/V5.done
