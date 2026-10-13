# Live boundary screen launch deviation

The live screen did not run. Local admission refused the launch before creating its output directory or making a service request.

The frozen packet SHA-256 was `621dc71f3291fb560753919858800ed06a7b644cefbd721b0ef65c8ada64e055`. Preflight confirmed that value directly. The live launch command supplied `621dc71f3291fb86bd6f71c6e18474fc90f4c9527ff71cc8482ff4c286afbd1cd`, which does not match the packet hash. The executor raised `Error: Expected exact packet/build/operator hashes` at `helpers.ts:164`, before output creation at `Operator.ts:100` and before the inference loop at `Operator.ts:116`.

The attempted command, run from `C:/Users/mikes/WebstormProjects/scaffold`, was:

```text
node C:/Users/mikes/WebstormProjects/agent/node_modules/@orkestrel/scaffold/dist/agents/skills/orkestrel-dispatch/scripts/launch.js --journal tmp/units/aggregate-boundary-screen-live.launch.jsonl --errors tmp/units/aggregate-boundary-screen-live.err --cap 600 --status -- node tmp/units/aggregate-boundary-screen/main.ts --execute --packet 621dc71f3291fb86bd6f71c6e18474fc90f4c9527ff71cc8482ff4c286afbd1cd --build 09c7d936ffaec46ed9deb5bdd300deb0f9643ad639519762d8d84e38ef513ecf --operator cf027a84382bf86bd6f71c6e18474fc90f4c9527ff71cc8482ff4c286afbd1cd --output tmp/units/aggregate-boundary-screen/live-forward-reverse
```

The launcher started PID `24600`, exited `1`, reported `capped=false`, and measured `179 ms` under the `600 s` cap. The run PID is closed. The launcher error file contains the full uncensored stack and ends `exit=1 signal=none capped=false duration_ms=179`. The launcher journal is empty because the child wrote no stdout. Status before and after contain only the pre-existing `.orkestrel/agent/instruments/bench4/Driver.mjs` change. The declared daemon PID `38284` remains running. The live output directory remains absent.

Preflight had confirmed the correct frozen packet, operator, build, all 97 packet bindings, and vacant destination. No inference request or daemon check ran; the launch failed on its first local identity validation. Work completed: preflight evidence and the failed admission are retained. Work not completed: all 88 inference requests, initial/final daemon checks, response custody, arithmetic replay, and live classification.

Hypothesis: the packet argument was mistyped while composing the launch command, using a different hash suffix. No retry was made under the brief's no-retry instruction. Root must issue a successor live brief if it wants another execution attempt.

