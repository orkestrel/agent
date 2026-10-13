# Calibration and pilot verification

Calibration artifacts pass independent verification. The final pilot does not pass acceptance: its report exits 0 but returns STOP for soleStale and plan. Later measurement stages remain on hold.

The verifier ran the commands in aggregate-calibration-brief-2.md, read their output bare, made no daemon request, and edited no file. The Orchestrator captured this report from its return.

## Calibration

The copied fit is byte-identical to the recorded source. The offline check-calibration.ts command exits 0 and reconstructs the saved question tallies from items.jsonl. CHANGE is 0.56 and AGREE is 0.82; both are finite and within the allowed range. The completed calibration log reports 36 passed and 54 failed summaries out of 90, no question failures or refusals, and exit 0 in 523314 ms. The item log omits failed summaries, so the summary totals are supported by the completed calibration log. Separation is the fitted negative-set result, not an accuracy claim.

## Launcher and control

The first Windows pilot failed before model calls because Node received an absolute drive path for --import. tools/run-one.ts now uses pathToFileURL for that argument. The control retry reached real scored rows and exited 0 in 62359 ms, with 9 of 12 goals passing.

The control's minimum headroom is 555 tokens. At g03 the largest prompt is 2252 tokens and the largest completion is 265 tokens: 3072 - 2252 - 265 = 555. The verifier checked the saved table, its generating script, and the sequence 12 raw response.

The provisional aggregate run observed a largest summary completion of 145 tokens, rounded up to a cap of 160. Persistent failures stopped after 3 builds at a read point under retry 2. The final settings retain that bound and cap and set the allowance to 555. The final aggregate pilot exited 0 in 67990 ms with 9 of 12 goals passing.

## Final pilot gate

Command: node bench5/report.ts --base tmp/l5/pilot-retry --pair q2,1-1

Exit: 0. Acceptance: failed.

```text
copy 1 control l5-q2-control-v1 9 aggregate l5-q2-aggregate-v1 9 d 0 (recall closed only in aggregate: 0 goals d 0; rest 11 goals d 0) plans equal 0/12 first-call drift max 0.17
builds 249 (first 83, retry 166) failed 249 consistency 1 failures number 385, name 148, agree 93, id 11 withheld 83 stale 249
change asked 0 yes 0; agree asked 93 failed 93; summarizer calls 0 hits 249 s 0; mica s change 0 agree 0 ledger 0
zero rendered 12/12 (withheld 12, cut 0) majority true
invariant sole PASS
invariant soleScored PASS
invariant soleStale FAIL v1 g03-grace-escalation: soleStale 1
invariant check PASS
invariant overflow PASS
invariant plan FAIL v1 g01-luis-refund-amount: the first select's tail differs
invariant scale PASS
invariant timeout PASS
verdict STOP (invariant soleStale, plan)
```

The final rerun uses cached summary and judge answers; its zero live summary/judge cost is not the cost of filling those caches. The preserved provisional aggregate run records those costs separately. Equal pass totals do not establish a null effect when every goal renders no summary.

The complete runs, raw wire, calibration items, caches, measured headroom, provisional cost readings, and SHA-256 manifest are preserved under the session branch's .orkestrel/agent/instruments/results/l5/pilot-resumption. These new recordings do not replace the missing release replay oracle.

## Host finding

The apparently modified bench4/Driver.mjs exists in both scaffold checkouts before any bench4 edit. Git tracks both Driver.mjs and driver.mjs, and their paths collide on this Windows filesystem. In each checkout the physical file hashes to the lowercase entry blob 9056b9187b965a8165c56f658e017ba1bf7cb1e7; the uppercase class blob is 3d9dc29197655322b0e76ad319c84a98ec1f05e1. Preserve both Git blobs when X3 and the bench4 move repair their paths. No bench4 edit is included in this calibration unit.
