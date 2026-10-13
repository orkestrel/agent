# Qwen4 thinking-disabled pilot evidence

The pilot emitted 24 goal rows and exposed summaries on 18, then exited 1 uncapped after 3030068 ms. Judge request 302 and flush request 315 had headers timeouts and unknown usage. Known usage totals 350266 tokens across 343 sent requests. No paired-configuration failure was found, but the operational faults keep the pilot unaccepted. No retry ran.

See [root's ruling](aggregate-successor-q4-pilot-root-acceptance.md), [the original report](aggregate-successor-q4-pilot-report.md), [its correction addendum](aggregate-successor-q4-pilot-citation-addendum.md), and [the original-path restoration map](restoration.json). The copies match their originals at retention. The raw model artifacts remain under the l15 pilot directory.

The report's missing-status-file claim is incorrect. Root read both retained launcher snapshots: `../../logs/q4-think0-pilot.jsonl.status-before.txt` and `../../logs/q4-think0-pilot.jsonl.status-after.txt`. They contain the pre-existing bench4 and nested-harness dirt, followed by root's campaign records and pilot artifacts; they show no canonical harness-source change. The pilot PID file contains 34820. The original heading and trajectory-agent timing mistakes are corrected by root's ruling and the addendum; original report bytes remain unchanged.

Observed GPU contention qualifies the timing measurement. The anonymous task-quality audit is separate from this execution record and was released only after closure and custody checks.
