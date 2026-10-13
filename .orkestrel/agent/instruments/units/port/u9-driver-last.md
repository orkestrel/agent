Implemented `tmp/bench4/driver.mjs`. No daemon requests were sent.

Gate exit codes:

| Gate | Exit |
|---|---:|
| `node --check tmp/bench4/driver.mjs` | 0 |
| Copy 1 dry check | 0 |
| Copy 8 dry check | 0 |
| Run without `--live` | 1, expected |
| Reference copy and byte/read-only verification | 0 |
| `band.ts` reading copied references | 0 |
| `git diff --stat` | 0; empty |
| `git status --porcelain` | 0; empty |

The guard output was:

```text
Error: Fetch guard: request 1 (agent) refused; --live is required
```

No result row was written.

Copy 1 dry-check output:

```text
OK copy: "/home/user/agent/tmp/bench/variants/ledger/v1.json" | measured "/home/user/agent/tmp/bench/variants/ledger/v1.json"
OK agent.model: "qwen3.5:2b-q4_K_M" | measured "qwen3.5:2b-q4_K_M"
OK agent.think: false | measured false
OK agent.temperature: 0 | measured 0
OK agent.seed: 7 | measured 7
OK agent.presence_penalty: 1.5 | measured 1.5
OK agent.top_k: 20 | measured 20
OK agent.top_p: 0.95 | measured 0.95
OK capacity: 3072 | measured 3072
OK share.prompt: 0.7 | measured 0.7
OK share.tail: 0.35 | measured 0.35
OK recall.limit: 2 | measured 2
OK profile: {"mode":"ledger","reply":"terminal","categories":"choice","profile":"refined","gate":"admit","horizon":"99","date":"on","tail-answers":"drop","tail-requests":"drop","rules":"last","handles":"bare","cache":"stable","autopin":"named","report":"full","arm-tools":"recall","tally":"off","request-questions":"topics","answer-cue":"on","repeat-stop":"all","answer-view":"collapsed","recall-split":"on","recall-category":"off","records":"on"} | measured {"mode":"ledger","reply":"terminal","categories":"choice","profile":"refined","gate":"admit","horizon":"99","date":"on","tail-answers":"drop","tail-requests":"drop","rules":"last","handles":"bare","cache":"stable","autopin":"named","report":"full","arm-tools":"recall","tally":"off","request-questions":"topics","answer-cue":"on","repeat-stop":"all","answer-view":"collapsed","recall-split":"on","recall-category":"off","records":"on"}
OK judge.model: "hf.co/sky7350/Mica-v0.1-4B:Q4_K_M" | measured "hf.co/sky7350/Mica-v0.1-4B:Q4_K_M"
OK judge.system.sha256: "89747f4bf3311c927808aa91c37f9c016e0ed655a72e93f62c9dad0d497303ac" | measured "89747f4bf3311c927808aa91c37f9c016e0ed655a72e93f62c9dad0d497303ac"
OK judge.num_ctx: 4096 | measured 4096
OK judge.calibration: 1.1244734010661372 | measured 1.1244734010661372
OK thresholds: {"category":0.7,"topic":0.6,"amends":0.75,"supersedes":0.95,"correction":0.3} | measured {"category":0.7,"topic":0.6,"amends":0.75,"supersedes":0.95,"correction":0.3}
OK topics.sha256: "1f8f8d780dcb39aa60fb71c469da73d5bce038bda858303acad5e3d72e790187" | measured "1f8f8d780dcb39aa60fb71c469da73d5bce038bda858303acad5e3d72e790187"
OK questions.match: 364 | measured 364
OK judgments.imported: 356 | measured 356
OK judgments.source: "/home/user/agent/tmp/bench/results/v3/cal-categories.jsonl" | measured "/home/user/agent/tmp/bench/results/v3/cal-categories.jsonl"
OK held.seed: 5 | measured 5
OK system.sha256: "88b6137db15475ba57d806b425d02b42b1c799bc5122fdadf1da595a94c86842" | measured "88b6137db15475ba57d806b425d02b42b1c799bc5122fdadf1da595a94c86842"
OK agent.keep_alive: "30m" | measured "30m"
OK lookups.sha256: "4ba727de43491994d57851c5ab3e51c36d5eb75ff88fe48d348b0b18af1a6df5" | measured "4ba727de43491994d57851c5ab3e51c36d5eb75ff88fe48d348b0b18af1a6df5"
OK seed.messages: 48 | measured 48
OK gauge.injected: false | measured false
OK agent.limit: 8 | measured 8
OK timeout: 3600000 | measured 3600000
Gauge: live calibration pending; seed scale=1.1634671320535195, fixed=498; no gauge injected.
Dry v1: PASS; fetches=0
```

Copy 8 dry-check output:

```text
OK copy: "/home/user/agent/tmp/bench/variants/ledger/v8.json" | measured "/home/user/agent/tmp/bench/variants/ledger/v8.json"
OK agent.model: "qwen3.5:2b-q4_K_M" | measured "qwen3.5:2b-q4_K_M"
OK agent.think: false | measured false
OK agent.temperature: 0 | measured 0
OK agent.seed: 7 | measured 7
OK agent.presence_penalty: 1.5 | measured 1.5
OK agent.top_k: 20 | measured 20
OK agent.top_p: 0.95 | measured 0.95
OK capacity: 3072 | measured 3072
OK share.prompt: 0.7 | measured 0.7
OK share.tail: 0.35 | measured 0.35
OK recall.limit: 2 | measured 2
OK profile: {"mode":"ledger","reply":"terminal","categories":"choice","profile":"refined","gate":"admit","horizon":"99","date":"on","tail-answers":"drop","tail-requests":"drop","rules":"last","handles":"bare","cache":"stable","autopin":"named","report":"full","arm-tools":"recall","tally":"off","request-questions":"topics","answer-cue":"on","repeat-stop":"all","answer-view":"collapsed","recall-split":"on","recall-category":"off","records":"on"} | measured {"mode":"ledger","reply":"terminal","categories":"choice","profile":"refined","gate":"admit","horizon":"99","date":"on","tail-answers":"drop","tail-requests":"drop","rules":"last","handles":"bare","cache":"stable","autopin":"named","report":"full","arm-tools":"recall","tally":"off","request-questions":"topics","answer-cue":"on","repeat-stop":"all","answer-view":"collapsed","recall-split":"on","recall-category":"off","records":"on"}
OK judge.model: "hf.co/sky7350/Mica-v0.1-4B:Q4_K_M" | measured "hf.co/sky7350/Mica-v0.1-4B:Q4_K_M"
OK judge.system.sha256: "89747f4bf3311c927808aa91c37f9c016e0ed655a72e93f62c9dad0d497303ac" | measured "89747f4bf3311c927808aa91c37f9c016e0ed655a72e93f62c9dad0d497303ac"
OK judge.num_ctx: 4096 | measured 4096
OK judge.calibration: 1.1244734010661372 | measured 1.1244734010661372
OK thresholds: {"category":0.7,"topic":0.6,"amends":0.75,"supersedes":0.95,"correction":0.3} | measured {"category":0.7,"topic":0.6,"amends":0.75,"supersedes":0.95,"correction":0.3}
OK topics.sha256: "1f8f8d780dcb39aa60fb71c469da73d5bce038bda858303acad5e3d72e790187" | measured "1f8f8d780dcb39aa60fb71c469da73d5bce038bda858303acad5e3d72e790187"
OK questions.match: 364 | measured 364
OK judgments.imported: 356 | measured 356
OK judgments.source: "/home/user/agent/tmp/bench/results/v3/cal-categories.jsonl" | measured "/home/user/agent/tmp/bench/results/v3/cal-categories.jsonl"
OK held.seed: 5 | measured 5
OK system.sha256: "88b6137db15475ba57d806b425d02b42b1c799bc5122fdadf1da595a94c86842" | measured "88b6137db15475ba57d806b425d02b42b1c799bc5122fdadf1da595a94c86842"
OK agent.keep_alive: "30m" | measured "30m"
OK lookups.sha256: "4ba727de43491994d57851c5ab3e51c36d5eb75ff88fe48d348b0b18af1a6df5" | measured "4ba727de43491994d57851c5ab3e51c36d5eb75ff88fe48d348b0b18af1a6df5"
OK seed.messages: 48 | measured 48
OK gauge.injected: false | measured false
OK agent.limit: 8 | measured 8
OK timeout: 3600000 | measured 3600000
Gauge: live calibration pending; seed scale=1.1634671320535195, fixed=498; no gauge injected.
Dry v8: PASS; fetches=0
```

`git status --porcelain` produced no output.