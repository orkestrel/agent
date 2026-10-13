#!/bin/bash
V3=/home/user/agent/tmp/bench/results/v3
OUT=/home/user/agent/tmp/bench/results/v4
B=/home/user/agent/tmp/bench/bench.mjs
mkdir -p $OUT
run() { name=$1; shift; echo "===== $name start $(date -u +%FT%TZ) [$*]" >> $OUT/run.log; node $B "$@" --out $OUT/$name > $OUT/$name.log 2>&1; echo "===== $name end $(date -u +%FT%TZ) exit $?" >> $OUT/run.log; touch $OUT/$name.done; }
while [ ! -f $V3/LEDGER.done ] || [ ! -f $V3/FIX2.done ]; do sleep 30; done
echo "===== judge drift probe start $(date -u +%FT%TZ)" >> $OUT/run.log
node $B --probe-judge-drift --state bounded --neighbors 2 --criterion lookup --judge mica --judge-ctx 4096 --out $OUT/drift > $OUT/drift.log 2>&1; echo "===== judge drift probe end $(date -u +%FT%TZ) exit $?" >> $OUT/run.log
SEL="--state bounded --neighbors 2 --criterion lookup --candidates newest --limit all --judge mica --judge-ctx 4096 --ctx 3072 --search words --threshold 0.9"
run none-3072 --mode none --ctx 3072 --search words
run none-6144 --mode none --ctx 6144 --search words
run c-tuned --mode compaction --ctx 3072 --search words --summary tuned --window 1600 --keep 6 --sections 3
run selection --mode selection $SEL
run both --mode both $SEL --summary tuned --window 1000 --keep 6 --sections 3
touch $OUT/V4.done
