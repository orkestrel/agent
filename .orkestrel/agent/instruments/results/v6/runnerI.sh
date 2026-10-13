#!/bin/bash
OUT=/home/user/agent/tmp/bench/results/v6
V5=/home/user/agent/tmp/bench/results/v5
B=/home/user/agent/tmp/bench/bench.mjs
run() { name=$1; shift; echo "===== $name start $(date -u +%FT%TZ) [$*]" >> $OUT/run.log; node $B "$@" --out $OUT/$name > $OUT/$name.log 2>&1; local code=$?; echo "===== $name end $(date -u +%FT%TZ) exit $code" >> $OUT/run.log; touch $OUT/$name.done; return $code; }
while kill -0 8591 2>/dev/null; do sleep 30; done
echo "===== cal-exchange finished $(date -u +%FT%TZ)" >> $OUT/run.log
while [ ! -f $OUT/REPLYFIX.done ]; do sleep 30; done
T=$(node $V5/pick-exchange.mjs $V5/cal-exchange/calibration.jsonl 2>> $OUT/run.log) || T=0.9
echo "===== exchange threshold $T" >> $OUT/run.log
JUDGE="--state bounded --neighbors 2 --criterion lookup --judge mica --judge-ctx 4096"
SEL="--mode selection $JUDGE --candidates newest --limit all --ctx 3072 --search words"
run smoke --mode none --ctx 3072 --search words --smoke || { echo "===== smoke failed; arms not run" >> $OUT/run.log; touch $OUT/CORE.done; exit 1; }
run none-3072 --mode none --ctx 3072 --search words
run none-6144 --mode none --ctx 6144 --search words
run c-tuned --mode compaction --ctx 3072 --search words --summary tuned --window 1600 --keep 6 --sections 3
run both --mode both $JUDGE --candidates newest --limit all --ctx 3072 --search words --threshold 0.9 --chain corrections --summary tuned --window 1000 --keep 6 --sections 3
run sel-ex-drop $SEL --threshold $T --unit exchange --finished drop --chain corrections
run sel-ex-judge $SEL --threshold $T --unit exchange --finished judge --chain corrections
run sel-msg $SEL --threshold 0.9 --unit message --chain corrections
touch $OUT/CORE.done
