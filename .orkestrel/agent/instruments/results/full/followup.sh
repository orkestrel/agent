#!/bin/bash
cd /home/user/agent/tmp/bench
OUT=/home/user/agent/tmp/bench/results/full
until [ -f $OUT/ALL.done ]; do sleep 60; done
for spec in "compaction:12:3" "both:all:3"; do
  mode=${spec%%:*}; rest=${spec#*:}; limit=${rest%%:*}; sections=${rest##*:}
  echo "===== $mode-s$sections (limit $limit, sections $sections) start $(date -u +%Y-%m-%dT%H:%M:%SZ) =====" >> $OUT/run.log
  node bench.mjs --mode $mode --judge mica --threshold 0.9 --limit $limit --ctx 3072 --window 1200 --sections $sections --summary generic --goals 10 --out $OUT/$mode-s$sections > $OUT/$mode-s$sections.log 2>&1
  echo "exit=$?" >> $OUT/$mode-s$sections.log
  echo "===== $mode-s$sections end $(date -u +%Y-%m-%dT%H:%M:%SZ) =====" >> $OUT/run.log
  touch $OUT/$mode-s$sections.done
done
touch $OUT/FOLLOWUP.done
