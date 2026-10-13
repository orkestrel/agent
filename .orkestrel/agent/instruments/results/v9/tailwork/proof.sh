#!/bin/bash
# Offline proof matrix. Usage: proof.sh installed|FILE LABEL, where FILE, such as bench3/bench.mjs.pre-tail, runs in
# place of the installed harness. Every run preloads a fetch stand-in, so no request leaves the process: no-net.mjs
# for --check-ledger, wire-replay.mjs for the wire replays.
IMPL=$1; LABEL=$2
WORK=/home/user/agent/tmp/bench/results/v9/tailwork
REFINE=/home/user/agent/tmp/bench/results/v8/refinework
BENCH=/home/user/agent/tmp/bench3/bench.mjs
V9=/home/user/agent/tmp/bench/results/v9
CAL=/home/user/agent/tmp/bench/results/v3/cal-categories.jsonl
OUT=$WORK/$LABEL
mkdir -p $OUT
PRE=()
SRC=$BENCH
if [ "$IMPL" != installed ]; then export SERVE_FILE=$IMPL; SRC=$IMPL; PRE=(--import $WORK/use-file.mjs); fi
summary() { local name=$1 code=$2 file=$3; echo "$name exit $code | $(grep -c '^ok ' $file) ok, $(grep -c '^FAIL\|^fail ' $file) failed | $(grep -E 'every ledger check held|ledger checks failed' $file | tail -1)"; }
# node --check reads the extension, so a copy such as bench.mjs.pre-gap is checked as a .mjs file.
cp $SRC $OUT/syntax.mjs; node --check $OUT/syntax.mjs; echo "node --check exit $?"; rm $OUT/syntax.mjs
for profile in refined roundA; do
	node "${PRE[@]}" --import $REFINE/no-net.mjs $BENCH --check-ledger --profile $profile > $OUT/check-$profile.txt 2>&1
	summary "check-ledger $profile" $? $OUT/check-$profile.txt
	node "${PRE[@]}" --import $REFINE/no-net.mjs $BENCH --check-ledger --profile $profile --replay /home/user/agent/tmp/bench/results/v8/ledger --judgments $CAL > $OUT/replay-v8-$profile.txt 2>&1
	summary "replay v8/ledger $profile" $? $OUT/replay-v8-$profile.txt
	for dir in $V9/a1-ledger-v[0-9]; do
		v=${dir##*-}; [ -f $dir/ledger.jsonl ] || continue
		node "${PRE[@]}" --import $REFINE/no-net.mjs $BENCH --check-ledger --profile $profile --replay $dir --scenario /home/user/agent/tmp/bench/variants/ledger/$v.json --judgments $CAL > $OUT/replay-a1-$v-$profile.txt 2>&1
		summary "replay a1-ledger-$v $profile" $? $OUT/replay-a1-$v-$profile.txt
	done
done
cd $OUT
WIRE_DIR=/home/user/agent/tmp/bench/results/v8/ledger-wire WIRE_REPORT=$OUT/wire-v8.jsonl node "${PRE[@]}" --import $REFINE/wire-replay.mjs $BENCH --mode ledger --profile roundA --scenario /home/user/agent/tmp/bench3/scenario.json.pre-refine --reply terminal --judge mica --judge-ctx 4096 --ctx 3072 --judgments $CAL --out $OUT/out-v8 > $OUT/wire-v8.txt 2>&1
echo "wire v8/ledger-wire exit $? | $(node $REFINE/wire-summary.mjs $OUT/wire-v8.jsonl)"
for dir in $V9/a1-ledger-v[0-9]; do
	v=${dir##*-}; [ -d $dir-wire ] && [ -f $dir/ledger.jsonl ] || continue
	WIRE_DIR=$dir-wire WIRE_REPORT=$OUT/wire-a1-$v.jsonl node "${PRE[@]}" --import $REFINE/wire-replay.mjs $BENCH --mode ledger --profile roundA --scenario /home/user/agent/tmp/bench/variants/ledger/$v.json --gate deny --ctx 3072 --judge mica --judge-ctx 4096 --tail 0.35 --horizon 3 --judgments $CAL --reply terminal --out $OUT/out-a1-$v > $OUT/wire-a1-$v.txt 2>&1
	echo "wire a1-ledger-$v-wire exit $? | $(node $REFINE/wire-summary.mjs $OUT/wire-a1-$v.jsonl) | recorded $(ls $dir-wire | grep -c -- -request.json)"
done
