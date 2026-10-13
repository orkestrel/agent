#!/bin/sh
# Pulls, pilots, and removes each candidate in turn, so the disk holds one candidate at a time:
#   G06_RESULTS=DIR sh sweep.sh TAG...
# Each candidate's capabilities and pilot rows land in caps.jsonl and pilot.jsonl beside this script.
DIR=$(dirname "$0")
G=${G06_RESULTS:?set G06_RESULTS to the results directory that holds the f2-*-wire recordings}
REQS="$G/f2-records-plain-2026-10-09-v1-wire/00010_api_chat-request.json $G/f2-view-plain-2026-10-09-v1-wire/00001_api_chat-request.json"
for tag in "$@"; do
	echo "===== $tag pull $(date -u +%H:%M:%S)"
	if ! ollama pull "$tag" > /dev/null 2>&1; then echo "===== $tag pull failed"; continue; fi
	caps=$(curl -s http://127.0.0.1:11434/api/show -d "{\"model\":\"$tag\"}" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s); console.log(JSON.stringify({tag:process.argv[1], capabilities:j.capabilities, details:j.details, context:Object.entries(j.model_info||{}).find(([k])=>k.endsWith("context_length"))?.[1], parameters:j.parameters}))})' "$tag")
	echo "$caps" >> "$DIR/caps.jsonl"
	echo "$caps"
	think=""
	case "$caps" in *'"thinking"'*) think="--think" ;; esac
	node "$DIR/pilot.mjs" --model "$tag" $think --out "$DIR/pilot.jsonl" $REQS
	echo "===== $tag pilot exit $? $(date -u +%H:%M:%S)"
	ollama rm "$tag" > /dev/null 2>&1
done
