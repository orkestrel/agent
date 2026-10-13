#!/bin/bash
OUT=/home/user/agent/tmp/bench/results/v2
B=/home/user/agent/tmp/bench/bench.mjs
run() { name=$1; shift; echo "===== $name start $(date -u +%FT%TZ) [$*]" >> $OUT/run.log; node $B "$@" --out $OUT/$name > $OUT/$name.log 2>&1; echo "===== $name end $(date -u +%FT%TZ) exit $?" >> $OUT/run.log; touch $OUT/$name.done; }
while [ ! -f $OUT/CAL2.done ]; do sleep 20; done
SEL="--state bounded --neighbors 2 --criterion lookup --candidates newest --limit all --judge mica --judge-ctx 4096 --ctx 3072 --search words"
run selection-tuned --mode selection $SEL --threshold 0.9
run both-tuned --mode both $SEL --threshold 0.9 --summary tuned --window 1600 --keep 6 --sections 3
run selection-keep --mode selection $SEL --threshold 0.95
touch $OUT/FINAL.done
