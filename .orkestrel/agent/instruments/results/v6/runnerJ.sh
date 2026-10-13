#!/bin/bash
OUT=/home/user/agent/tmp/bench/results/v6
V5=/home/user/agent/tmp/bench/results/v5
B=/home/user/agent/tmp/bench/bench.mjs
run() { name=$1; shift; echo "===== $name start $(date -u +%FT%TZ) [$*]" >> $OUT/run.log; node $B "$@" --out $OUT/$name > $OUT/$name.log 2>&1; local code=$?; echo "===== $name end $(date -u +%FT%TZ) exit $code" >> $OUT/run.log; touch $OUT/$name.done; return $code; }
while [ ! -f $OUT/REPLYFIX.done ]; do sleep 30; done
run smoke-terminal --mode none --ctx 3072 --search words --reply terminal --smoke || { echo "===== smoke failed; nothing else run" >> $OUT/run.log; touch $OUT/AB.done $OUT/CORE.done; exit 1; }
COMP="--mode compaction --ctx 3072 --search words --summary tuned --window 1600 --keep 6 --sections 3"
run ab-none-terminal --mode none --ctx 6144 --search words --reply terminal
run ab-none-tool --mode none --ctx 6144 --search words --reply tool
run ab-comp-terminal $COMP --reply terminal
run ab-comp-tool $COMP --reply tool
touch $OUT/AB.done
while [ ! -f $OUT/DECIDED ]; do sleep 30; done
R=$(cat $OUT/DECIDED)
echo "===== reply mode $R" >> $OUT/run.log
T=$(node $V5/pick-exchange.mjs $V5/cal-exchange/calibration.jsonl 2>> $OUT/run.log) || T=0.9
echo "===== exchange threshold $T" >> $OUT/run.log
JUDGE="--state bounded --neighbors 2 --criterion lookup --judge mica --judge-ctx 4096"
SEL="--mode selection $JUDGE --candidates newest --limit all --ctx 3072 --search words --reply $R"
run none-3072 --mode none --ctx 3072 --search words --reply $R
[ "$R" = terminal ] && cp -r $OUT/ab-none-terminal $OUT/none-6144 && cp -r $OUT/ab-comp-terminal $OUT/c-tuned
[ "$R" = tool ] && cp -r $OUT/ab-none-tool $OUT/none-6144 && cp -r $OUT/ab-comp-tool $OUT/c-tuned
run both --mode both $JUDGE --candidates newest --limit all --ctx 3072 --search words --threshold 0.9 --chain corrections --summary tuned --window 1000 --keep 6 --sections 3 --reply $R
run sel-ex-drop $SEL --threshold $T --unit exchange --finished drop --chain corrections
run sel-ex-judge $SEL --threshold $T --unit exchange --finished judge --chain corrections
run sel-msg $SEL --threshold 0.9 --unit message --chain corrections
touch $OUT/CORE.done
