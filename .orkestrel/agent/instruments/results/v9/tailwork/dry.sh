#!/bin/bash
# Dry render of a2-refined-v1 under the work copy. Usage: dry.sh LABEL [FLAG...]; the flags follow --profile refined.
WORK=/home/user/agent/tmp/bench/results/v9/tailwork
REFINE=/home/user/agent/tmp/bench/results/v8/refinework
V1=/home/user/agent/tmp/bench/variants/ledger/v1.json
WIRE=/home/user/agent/tmp/bench/results/v9/a2-refined-v1-wire
LABEL=$1; shift
OUT=$WORK/dry-$LABEL
rm -rf $OUT; mkdir -p $OUT
cd $OUT
SERVE_FILE=${SERVE_FILE:-$WORK/bench.mjs} WIRE_DIR=$WIRE DRY_BODIES=$OUT/bodies DRY_REPORT=$OUT/report.jsonl DRY_SCENARIO=$V1 node --import $WORK/use-file.mjs --import $REFINE/dry-run.mjs /home/user/agent/tmp/bench3/bench.mjs --mode ledger --profile refined --scenario $V1 --ctx 3072 --judge mica --judge-ctx 4096 --tail 0.35 --judgments /home/user/agent/tmp/bench/results/v3/cal-categories.jsonl --reply terminal --out $OUT/out "$@" > $OUT/run.txt 2>&1
echo "dry $LABEL exit $?"
node $WORK/tail-view.mjs $OUT/bodies $OUT/report.jsonl $V1 $WIRE > $OUT/tail.txt; echo "tail-view exit $?"
