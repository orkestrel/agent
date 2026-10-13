#!/bin/bash
OUT=/home/user/agent/tmp/bench/results/v2
B=/home/user/agent/tmp/bench/bench.mjs
run() { name=$1; shift; echo "===== $name start $(date -u +%FT%TZ)" >> $OUT/run.log; node $B "$@" --out $OUT/$name > $OUT/$name.log 2>&1; echo "===== $name end $(date -u +%FT%TZ) exit $?" >> $OUT/run.log; touch $OUT/$name.done; }
while [ ! -f $OUT/COMP.done ]; do sleep 20; done
run cal-mica-b2-lookup --mode selection --calibrate --goals 10 --state bounded --neighbors 2 --criterion lookup --judge mica --judge-ctx 4096
run cal-mica-b6-lookup --mode selection --calibrate --goals 10 --state bounded --neighbors 6 --criterion lookup --judge mica --judge-ctx 4096
run cal-tev1-b2-lookup --mode selection --calibrate --goals 10 --state bounded --neighbors 2 --criterion lookup --judge tev1
touch $OUT/CAL2.done
