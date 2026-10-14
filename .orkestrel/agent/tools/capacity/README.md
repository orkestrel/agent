# Capacity qualification

This prospective policy qualifies operational execution separately from semantic task success. Plans and results identify `policy: "execution-only"`. Every cell freezes `failure: continue`, so an ordinary unfinished or empty product remains unsuccessful while subsequent goals are attempted. Earlier strict-policy attempts and their receipts remain failed and unchanged; this policy does not resume or reclassify them. Root must bind the new qualifier policy, code and tests in a fresh verified receipt or policy record before another create-only live attempt.

Materialize the public fixture and immutable launch plan without calls:

```text
node .orkestrel/agent/tools/capacity/main.ts --out tmp/units/capacity-initial-plan --url http://127.0.0.1:11435 --plan
```

Execute after root verifies the successor build and its protocol proofs:

```text
node .orkestrel/agent/tools/capacity/main.ts --out tmp/units/capacity-initial-live --url http://127.0.0.1:11435 --proof tmp/units/capacity-proof.json
```

Every output directory must be absent; its parent must already exist. The URL is required. There is no default daemon or automatic escalation. Root may select `--profile extended` for a separate attempt after inspecting the initial evidence.

The receipt is `{ "passed": true, "build": { "path": "absolute successor .build/build-manifest.json", "hash": "SHA256" }, "report": { "path": "absolute root gate report", "hash": "SHA256" } }`. The driver hashes both artifacts and records the receipt hash before calls. The canonical emitted CLI additionally verifies its complete build custody before each command. Missing, failed or stale receipts refuse execution.

The initial physical window is 16384, output reserve 4096, safety 512 and decision/summary timeout 180000ms. The output-only contingency uses 20480/8192/512/360000ms, preserving prompt room; it requires a separate root decision on observed output exhaustion. Both use recap 2048, metadata 90000ms, goal 900000ms and goal request limit 128. A single 1800000ms/512-call/1000000-token allowance covers q4 records, q4 compaction, q2 records and q2 compaction serially, including freeze inventory and post-cell capacity checks. Actual prior trajectory totals reduce subsequent frozen allowances. Individual child deadlines use the same absolute qualification deadline. There are no retries.

The retained first live attempt used a 30000ms auxiliary deadline and stopped during a 9668-token calibration prefill before serving a goal. Its observed processing rate projected roughly 45 seconds for that cold request. The 90000ms selection accommodates that prompt processing; it also permits metadata/judge/flush stalls up to 90 seconds because those roles share the frozen flag.

The retained 12288/4096 prefill attempt completed two goals, then refused a tool-expanded prompt before sending it. The guard priced that input at 8241.866 prompt tokens; with output and safety it exceeded admission by 561.866. The 16384/4096 candidate adds context without relaxing admission or increasing output and deadlines. Larger context can also enlarge future selections and recalls, so qualification must still pass. Both changes are explicit policies for separately retained attempts, never automatic retries.

The public fixture uses one synthetic shift, twelve arrivals plus opening, fictitious customers and orders, an arrival-six quantity correction, and status/reconciliation/queue/handoff goals after the final arrival. Each goal requests roughly 300–500 words. This shape retains the harness's required four-product shift contract. It exercises a long initial history and repeated requests; it does not qualify transitions between shifts. Fixture bytes are identical across candidates and cells. The derived public oracle provides the well-formed schema companion; qualification never grades semantic correctness or sends oracle content to a model.

A sufficient execution result requires every prescribed goal to have a row, observation and actual agent-request evidence in the exact frozen order, with run status complete and no operational terminal, error or faults. Every row and wire request must remain free of operational errors, overflow and failure flags. Existing usage, output/headroom/options, loaded-model/context, custody and aggregate bounds still apply. Each model must produce an observed lookup and an actual compaction fold across its cells. Missing horizon or mechanism coverage remains insufficient qualification.

Attempted means the goal was executed and recorded; served means its product succeeded. Each cell's `reading.outcome` reports attempted, successful, unsuccessful, partial and empty counts. A partial remains unsuccessful, and its observation keeps `complete: false`; observation presence is distinct from product completion. The observed completion flag and retained unserved count must agree with the actual rows. A clean child exit0 is accepted only without unserved goals. A clean child exit3 is accepted only with a complete operationally valid horizon and consistent unserved goals. Expired, signaled or errored children and operational exit3 remain invalid. Even zero successful products can qualify execution if every operational and mechanism requirement is met; that is no evidence of task capability.

The driver records aggregate role counts, usage maxima, finish reasons, thinking presence where supplied, wire options and safe loaded-capacity/memory metadata. It never prints product bodies and does not infer exact token fit from character counts. Public synthetic preflight measures execution coverage and capacity, not semantic quality on the original workload.

Negative capacity/output controls and stalled-request/body cancellation belong to the successor's protocol-faithful offline proofs. Root must verify them before issuing the receipt. The driver does not manufacture passing controls or deliberately spend live model calls on failures. Passing capacity qualification cannot guarantee full-horizon answer quality. No live-success claim is made here.

Run the driver proofs with `node --test .orkestrel/agent/tools/capacity/Runner.test.ts .orkestrel/agent/tools/capacity/Qualifier.test.ts`. Protocol fixtures drive actual frozen canonical children through unfinished eight-step loops and operational faults; they make no live model calls.
