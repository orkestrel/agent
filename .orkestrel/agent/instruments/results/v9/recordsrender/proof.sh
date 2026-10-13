#!/bin/bash
# Offline proofs of the records render (RECORDS-PLAN.md runs 2 and 3). Usage: proof.sh LABEL; writes under proof/LABEL,
# the dry renders under proof/LABEL/dry and the snapshots of a run in progress under proof/LABEL/snap, so a new LABEL
# leaves every earlier proof in place.
# Every node run preloads a fetch stand-in: no-net.mjs for --check-ledger, wire-replay.mjs for the Round A wires, and
# this folder's rescaling dry-run.mjs (through dry.sh) for the dry renders, so no request leaves the process.
W=/home/user/agent/tmp/bench/results/v9/recordsrender
REFINE=/home/user/agent/tmp/bench/results/v8/refinework
V9=/home/user/agent/tmp/bench/results/v9
VARIANTS=/home/user/agent/tmp/bench/variants/ledger
CAL=/home/user/agent/tmp/bench/results/v3/cal-categories.jsonl
BENCH=/home/user/agent/tmp/bench3/bench.mjs
OUT=$W/proof/$1
rm -rf $OUT; mkdir -p $OUT
PRE=(--import $W/use-file.mjs)
export DRY_ROOT=$OUT/dry
summary() { echo "$1 exit $2 | $(grep -c '^ok ' $3) ok, $(grep -c '^FAIL' $3) failed | $(tail -1 $3)"; }

echo "== (a) syntax, --check-ledger, records-check"
cp $W/bench.mjs $OUT/syntax.mjs; node --check $OUT/syntax.mjs; echo "node --check exit $?"; rm $OUT/syntax.mjs
for profile in refined roundA; do
	node --import $REFINE/no-net.mjs $BENCH --check-ledger --profile $profile > $OUT/frozen-check-$profile.txt 2>&1
	summary "frozen check-ledger $profile" $? $OUT/frozen-check-$profile.txt
	SERVE_FILE=$W/bench.mjs SERVE_RECORDS=$W/records.mjs node "${PRE[@]}" --import $REFINE/no-net.mjs $BENCH --check-ledger --profile $profile > $OUT/check-$profile.txt 2>&1
	summary "candidate check-ledger $profile" $? $OUT/check-$profile.txt
	diff <(grep -v '^ok   records on: ' $OUT/check-$profile.txt) $OUT/frozen-check-$profile.txt > /dev/null && echo "candidate check-ledger $profile: every other line equals the frozen output"
done
(cd $W && node records-check.mjs > $OUT/records-check.txt 2>&1); echo "records-check exit $? | $(grep '^total' $OUT/records-check.txt)"

echo "== (b) Round A wires replayed on the candidate under --profile roundA"
export SERVE_FILE=$W/bench.mjs SERVE_RECORDS=$W/records.mjs
WIRE_DIR=/home/user/agent/tmp/bench/results/v8/ledger-wire WIRE_REPORT=$OUT/wire-v8.jsonl node "${PRE[@]}" --import $REFINE/wire-replay.mjs $BENCH --mode ledger --profile roundA --scenario /home/user/agent/tmp/bench3/scenario.json.pre-refine --reply terminal --judge mica --judge-ctx 4096 --ctx 3072 --judgments $CAL --out $OUT/out-v8 > $OUT/wire-v8.txt 2>&1
echo "wire v8/ledger-wire exit $? | $(node $REFINE/wire-summary.mjs $OUT/wire-v8.jsonl) | recorded $(ls /home/user/agent/tmp/bench/results/v8/ledger-wire | grep -c -- -request.json)"
for v in v1 v2 v3 v4; do
	WIRE_DIR=$V9/a1-ledger-$v-wire WIRE_REPORT=$OUT/wire-a1-$v.jsonl node "${PRE[@]}" --import $REFINE/wire-replay.mjs $BENCH --mode ledger --profile roundA --scenario $VARIANTS/$v.json --gate deny --ctx 3072 --judge mica --judge-ctx 4096 --tail 0.35 --horizon 3 --judgments $CAL --reply terminal --out $OUT/out-a1-$v > $OUT/wire-a1-$v.txt 2>&1
	echo "wire a1-ledger-$v-wire exit $? | $(node $REFINE/wire-summary.mjs $OUT/wire-a1-$v.jsonl) | recorded $(ls $V9/a1-ledger-$v-wire | grep -c -- -request.json)"
done
unset SERVE_FILE SERVE_RECORDS

echo "== (b) refined wires: frozen against the candidate under --records off"
COMPLETE=()
for dir in $V9/a3-refined-v[0-9]-wire $V9/a4-refined-v[0-9]-wire; do
	[ -d $dir ] || continue
	name=$(basename $dir -wire)
	variant=$(grep "===== $name start" $V9/run.log | grep -o 'scenario [^ ]*' | cut -d' ' -f2)
	wire=$dir
	if grep -q "===== $name end" $V9/run.log; then COMPLETE+=("$name $variant")
	else
		# A run in progress: its complete request and response pairs, copied once.
		wire=$OUT/snap/$name-wire; mkdir -p $wire
		for request in $dir/*-request.json; do response=${request%-request.json}-response.json; [ -s $response ] && node -e 'JSON.parse(require("fs").readFileSync(process.argv[1]))' $response 2>/dev/null && cp $request $response $wire/; done
		echo "$name in progress: $(ls $wire | grep -c -- -request.json) complete pairs snapshotted"
	fi
	$W/dry.sh frozen $wire $variant frozen-$name > /dev/null
	$W/dry.sh candidate $wire $variant off-$name --records off > /dev/null
	result=$(node $W/compare-dry.mjs $DRY_ROOT/frozen-$name $DRY_ROOT/off-$name)
	echo "$name ($(basename $variant)) exit $? | $result"
done

echo "== (c) run 3: the candidate under --records on"
for entry in "${COMPLETE[@]}" "a1-ledger-v1 $VARIANTS/v1.json" "a1-ledger-v2 $VARIANTS/v2.json" "a1-ledger-v3 $VARIANTS/v3.json" "a1-ledger-v4 $VARIANTS/v4.json"; do
	set -- $entry
	name=$1; variant=$2
	# The baseline renders again here, so it reads the same preload as the arm.
	$W/dry.sh frozen $V9/$name-wire $variant frozen-$name > /dev/null
	$W/dry.sh candidate $V9/$name-wire $variant on-$name --records on | sed "s/^/$name /"
	node $W/records-report.mjs $DRY_ROOT/on-$name $variant $DRY_ROOT/frozen-$name > $OUT/run3-$name.jsonl
done
node $W/records-totals.mjs $OUT/run3-*.jsonl
