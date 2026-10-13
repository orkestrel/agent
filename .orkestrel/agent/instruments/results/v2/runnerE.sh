#!/bin/bash
V2=/home/user/agent/tmp/bench/results/v2
OUT=/home/user/agent/tmp/bench/results/dump
B=/home/user/agent/tmp/bench/bench.mjs
mkdir -p $OUT
run() { name=$1; shift; echo "===== dump $name start $(date -u +%FT%TZ) [$*]" >> $V2/run.log; node $B "$@" --goals 3 --out $OUT/$name --dump $OUT/$name/wire > $OUT/$name.log 2>&1; echo "===== dump $name end $(date -u +%FT%TZ) exit $?" >> $V2/run.log; }
while [ ! -f $V2/FINAL.done ]; do sleep 20; done
run none --mode none --ctx 3072 --search words
run compaction --mode compaction --ctx 3072 --search words --summary tuned --window 1600 --keep 6 --sections 3
run selection --mode selection --state bounded --neighbors 2 --criterion lookup --candidates newest --limit all --judge mica --judge-ctx 4096 --ctx 3072 --search words --threshold 0.9
touch $OUT/DUMP.done
