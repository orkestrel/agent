# Pilot report citation and fact corrections

The original report remains unchanged. Its title identifies the **q4-think0** cell; “think0” denotes thinking disabled. The emitted stage accounting records trajectory-agent wall time as 467,268 ms; 78,265 is the prompt-token count, not wall time. The pilot's emitted elapsed value is 2,989,853 ms, while the outer launcher duration is 3,030,068 ms. [tmp/units/aggregate-successor-q4-pilot-validator-2.jsonl:3102] [tmp/units/aggregate-successor-q4-pilot-validator-2.jsonl:3198] [.orkestrel/agent/instruments/results/l15/logs/q4-think0-pilot.err:15]

The exact released command was:

```text
node .agents/skills/orkestrel-dispatch/scripts/launch.ts --journal .orkestrel/agent/instruments/results/l15/logs/q4-think0-pilot.jsonl --errors .orkestrel/agent/instruments/results/l15/logs/q4-think0-pilot.err --cap 10800 --status -- node .orkestrel/agent/instruments/harness/.build/bench5/matrix.js pilot --frozen .orkestrel/agent/instruments/results/l15/q4-think0/freeze/manifest.json --resource .orkestrel/agent/instruments/results/l15/q4-think0/resource/manifest.json --fit .orkestrel/agent/instruments/results/l15/calibration/q4/fit/fit.json --out .orkestrel/agent/instruments/results/l15/q4-think0/pilot --live --url http://127.0.0.1:11435
```

This is the exact command from the checked pilot brief. The pilot launcher ended with exit 1, no signal, uncapped, after 3,030,068 ms. [tmp/units/aggregate-successor-q4-pilot-brief.md:30] [.orkestrel/agent/instruments/results/l15/logs/q4-think0-pilot.err:15]

The accepted closure reader is `tmp/units/aggregate-successor-q4-pilot-closure-2.ts`; its launcher ended exit 0, no signal, uncapped, after 37,237 ms. The preceding reader's exit 1 after 25,032 ms is preserved in its original capture. [tmp/units/aggregate-successor-q4-pilot-validator-2.err:2] [tmp/units/aggregate-successor-q4-pilot-validator.err:11]

The direct emitted custody section records HEAD and each frozen input hash at lines 3331–3338, and the build inventory counts at lines 3350–3355. Those are the relevant source lines for the custody values in the original report. [tmp/units/aggregate-successor-q4-pilot-validator-2.jsonl:3331] [tmp/units/aggregate-successor-q4-pilot-validator-2.jsonl:3338] [tmp/units/aggregate-successor-q4-pilot-validator-2.jsonl:3350] [tmp/units/aggregate-successor-q4-pilot-validator-2.jsonl:3355]

For process closure, the recorded pilot PID is 34820 and the accepted reader PID is 27212. The post-run process query checked those two PIDs and returned no process. Root's recorded WMI query matched `ProcessId = 34820 OR ParentProcessId = 34820` and returned no process: this supports absence of the recorded pilot PID and any process with it as direct parent. It does not establish the pilot's own parent PID or deeper descendant closure; no such parent/descendant IDs were retained. The separate dedicated service was not queried as a closure target or changed. The PID file records 34820. [tmp/units/aggregate-successor-q4-pilot-validator-2.jsonl.pid:1]
