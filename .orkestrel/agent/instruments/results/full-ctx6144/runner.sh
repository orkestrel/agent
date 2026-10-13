#!/bin/bash
cd /home/user/agent/tmp/bench
OUT=/home/user/agent/tmp/bench/results/full
for spec in "none:12" "compaction:12" "both:all" "selection:12"; do
  mode=${spec%%:*}; limit=${spec##*:}
  echo "===== $mode (limit $limit) start $(date -u +%Y-%m-%dT%H:%M:%SZ) =====" >> $OUT/run.log
  node bench.mjs --mode $mode --judge mica --threshold 0.9 --limit $limit --ctx 6144 --window 3000 --summary generic --goals 10 --out $OUT/$mode > $OUT/$mode.log 2>&1
  echo "exit=$?" >> $OUT/$mode.log
  echo "===== $mode end $(date -u +%Y-%m-%dT%H:%M:%SZ) =====" >> $OUT/run.log
  touch $OUT/$mode.done
done
touch $OUT/ALL.done
