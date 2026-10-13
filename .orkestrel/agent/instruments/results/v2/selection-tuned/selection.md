# Larkspur Home support desk: selection

mode selection, judge mica (num_ctx 4096), threshold 0.9, limit all, state bounded (neighbors 2), candidates newest, criterion lookup, ctx 3072, search words. Passed 4 of 10; ok any 7 of 10.

| goal | success | answer | ok any | turns | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: |
| g01-luis-refund-amount | no | content | yes | 1 | 1263 | 0 | 0 | 0 | 48 | 16/49 | 48/48 | 358.4 | yes | no | 0 | 0 | 50 |
| g02-luis-card | no | content | yes | 2 | 1166 | 0 | 0 | 0 | 50 | 9/51 | 50/50 | 390.6 | yes | no | 0 | 0 | 54 |
| g03-grace-escalation | yes | reply | yes | 1 | 1412 | 0 | 0 | 0 | 54 | 17/55 | 54/54 | 431.6 | yes | yes | 0 | 0 | 57 |
| g04-halvorsen-ticket | no | reply | no | 1 | 1365 | 0 | 0 | 0 | 57 | 16/58 | 57/57 | 448.4 | yes | yes | 0 | 0 | 60 |
| g05-luis-approval-note | yes | reply | yes | 1 | 1858 | 0 | 0 | 0 | 60 | 28/61 | 60/60 | 493.6 | no | yes | 0 | 0 | 63 |
| g06-kenji-shipping | no | reply | no | 2 | 1427 | 0 | 0 | 0 | 63 | 10/64 | 63/63 | 521.3 | no | yes | 0 | 0 | 68 |
| g07-depot-release | no | reply | no | 1 | 1383 | 0 | 0 | 0 | 68 | 16/69 | 68/68 | 750.2 | yes | yes | 0 | 0 | 71 |
| g08-halvorsen-credit | no | content | yes | 2 | 1650 | 0 | 0 | 0 | 71 | 16/72 | 71/71 | 371.8 | yes | no | 0 | 0 | 75 |
| g09-kenji-gift-note | yes | reply | yes | 1 | 1386 | 0 | 0 | 0 | 75 | 12/76 | 75/75 | 396.0 | yes | yes | 0 | 0 | 78 |
| g10-sigrid-callback | yes | reply | yes | 1 | 1935 | 0 | 0 | 0 | 78 | 23/79 | 78/78 | 438.1 | yes | yes | 0 | 0 | 81 |
