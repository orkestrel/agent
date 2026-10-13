#!/bin/bash
# Dry render of one recorded wire. Usage: dry.sh frozen|candidate WIRE VARIANT LABEL [FLAG...]; `frozen` runs the
# installed bench3/bench.mjs, `candidate` this folder's bench.mjs and records.mjs. The command line is the refined
# arm's (a3 and a4 runs), and each FLAG follows it. The dry-run preload, this folder's rescaling copy, answers every
# request in-process. Each render writes under $DRY_ROOT/LABEL, by default recordsrender/dry/LABEL.
W=/home/user/agent/tmp/bench/results/v9/recordsrender
IMPL=$1; WIRE=$2; VARIANT=$3; LABEL=$4; shift 4
OUT=${DRY_ROOT:-$W/dry}/$LABEL
rm -rf $OUT; mkdir -p $OUT
cd $OUT
PRE=()
if [ "$IMPL" = candidate ]; then export SERVE_FILE=$W/bench.mjs SERVE_RECORDS=$W/records.mjs; PRE=(--import $W/use-file.mjs); fi
WIRE_DIR=$WIRE DRY_BODIES=$OUT/bodies DRY_REPORT=$OUT/report.jsonl DRY_SCENARIO=$VARIANT node "${PRE[@]}" --import $W/dry-run.mjs /home/user/agent/tmp/bench3/bench.mjs --mode ledger --profile refined --scenario $VARIANT --ctx 3072 --judge mica --judge-ctx 4096 --tail 0.35 --judgments /home/user/agent/tmp/bench/results/v3/cal-categories.jsonl --reply terminal --out $OUT/out "$@" > $OUT/run.txt 2>&1
echo "dry $LABEL exit $?"
