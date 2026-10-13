#!/bin/bash
OUT=/home/user/agent/tmp/bench/results/v2
B=/home/user/agent/tmp/bench/bench.mjs
run() { name=$1; shift; echo "===== $name start $(date -u +%FT%TZ)" >> $OUT/run.log; node $B "$@" --out $OUT/$name > $OUT/$name.log 2>&1; echo "===== $name end $(date -u +%FT%TZ) exit $?" >> $OUT/run.log; touch $OUT/$name.done; }
run cal-mica-bounded --mode selection --calibrate --goals 10 --state bounded --neighbors 2 --judge mica --judge-ctx 4096
run cal-tev1-bounded --mode selection --calibrate --goals 10 --state bounded --neighbors 2 --judge tev1
run cal-tev1-plain --mode selection --calibrate --goals 3 --state plain --judge tev1
touch $OUT/CAL1.done
run none-words --mode none --ctx 3072 --search words
run c-tuned-s3 --mode compaction --ctx 3072 --search words --summary tuned --window 1600 --keep 6 --sections 3
run c-tuned-s4 --mode compaction --ctx 3072 --search words --summary tuned --window 1600 --keep 6 --sections 4
run c-generic-s3 --mode compaction --ctx 3072 --search words --summary generic --window 1600 --keep 6 --sections 3
touch $OUT/COMP.done
