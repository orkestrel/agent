#!/bin/bash
OUT=/home/user/agent/tmp/bench/results/v2
SP=/tmp/claude-0/-home-user/5e260bfe-213d-5ed6-a85a-c681e970c415/scratchpad
B=/home/user/agent/tmp/bench/bench.mjs
run() { name=$1; shift; echo "===== $name start $(date -u +%FT%TZ) [$*]" >> $OUT/run.log; node $B "$@" --out $OUT/$name > $OUT/$name.log 2>&1; echo "===== $name end $(date -u +%FT%TZ) exit $?" >> $OUT/run.log; touch $OUT/$name.done; }
while kill -0 30704 2>/dev/null; do sleep 15; done
CPID=$(ps -eo pid,args | awk '/^ *[0-9]+ \/bin\/bash \/home\/user\/agent\/tmp\/bench\/results\/v2\/runnerC2\.sh/{print $1}'); [ -n "$CPID" ] && kill $CPID
BPID=$(ps -eo pid,args | awk '/^ *[0-9]+ node \/home\/user\/agent\/tmp\/bench\/bench\.mjs --mode both/{print $1}'); [ -n "$BPID" ] && kill $BPID
sleep 3
[ -d $OUT/selection-tuned ] && mv $OUT/selection-tuned $OUT/selection-tuned-oom && mv $OUT/selection-tuned.log $OUT/selection-tuned-oom.log; rm -f $OUT/selection-tuned.done
rm -rf $OUT/both-tuned $OUT/both-tuned.log $OUT/both-tuned.done
OPID=$(ps -eo pid,args | awk '/^ *[0-9]+ ollama serve$/{print $1}'); [ -n "$OPID" ] && kill $OPID
for i in $(seq 1 30); do pgrep -x llama-server > /dev/null || break; sleep 2; done
pgrep -x llama-server > /dev/null && pkill -x llama-server
sleep 2
OLLAMA_MODELS=/opt/ollama/models OLLAMA_HOST=127.0.0.1:11434 OLLAMA_MAX_LOADED_MODELS=1 nohup setsid ollama serve >> $SP/ollama-serve.log 2>&1 &
for i in $(seq 1 60); do curl -s -m 2 http://127.0.0.1:11434/api/version > /dev/null && break; sleep 1; done
echo "===== daemon restarted with OLLAMA_MAX_LOADED_MODELS=1 at $(date -u +%FT%TZ)" >> $OUT/run.log
SEL="--state bounded --neighbors 2 --criterion lookup --candidates newest --limit all --judge mica --judge-ctx 4096 --ctx 3072 --search words"
run selection-tuned --mode selection $SEL --threshold 0.9
run both-tuned --mode both $SEL --threshold 0.9 --summary tuned --window 1600 --keep 6 --sections 3
run selection-keep --mode selection $SEL --threshold 0.95
touch $OUT/FINAL.done
