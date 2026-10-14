# Capacity qualification

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

The initial physical window is 12288, output reserve 4096, safety 512 and decision/summary timeout 180000ms. The extended candidate uses 16384/8192/512/360000ms. Both use recap 2048, metadata 90000ms, goal 900000ms and goal request limit 128. A single 1800000ms/512-call/1000000-token allowance covers q4 records, q4 compaction, q2 records and q2 compaction serially, including freeze inventory and post-cell capacity checks. Actual prior trajectory totals reduce subsequent frozen allowances. Individual child deadlines use the same absolute qualification deadline. There are no retries.

The retained first live attempt used a 30000ms auxiliary deadline and stopped during a 9668-token calibration prefill before serving a goal. Its observed processing rate projected roughly 45 seconds for that cold request. The 90000ms selection accommodates that prompt processing; it also permits metadata/judge/flush stalls up to 90 seconds because those roles share the frozen flag. Context, output, decision, goal and outer allowances are unchanged. This is an explicit revised qualification policy, not an automatic retry.

The public fixture uses one synthetic shift, twelve arrivals plus opening, fictitious customers and orders, an arrival-six quantity correction, and status/reconciliation/queue/handoff goals after the final arrival. Each goal requests roughly 300–500 words. This shape retains the harness's required four-product shift contract. It exercises a long initial history and repeated requests; it does not qualify transitions between shifts. Fixture bytes are identical across candidates and cells. The derived public oracle provides the well-formed schema companion; qualification never grades semantic correctness or sends oracle content to a model.

A sufficient result requires every cell's complete nonempty nonpartial horizon, valid wire evidence, matching loaded model digest and loaded context at least the physical window. Each model must produce an observed lookup and an actual compaction fold across its cells. Missing coverage ends the attempt as insufficient qualification. The driver records aggregate role counts, usage maxima, finish reasons, thinking presence where supplied, wire options and safe loaded-capacity/memory metadata. It never prints product bodies and does not infer exact token fit from character counts.

Negative capacity/output controls and stalled-request/body cancellation belong to the successor's protocol-faithful offline proofs. Root must verify them before issuing the receipt. The driver does not manufacture passing controls or deliberately spend live model calls on failures. Passing capacity qualification cannot guarantee full-horizon answer quality. No live-success claim is made here.

Run the driver proofs with `node --test .orkestrel/agent/tools/capacity/Runner.test.ts`.
