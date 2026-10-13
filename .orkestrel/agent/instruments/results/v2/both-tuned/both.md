# Larkspur Home support desk: both

mode both, judge mica (num_ctx 4096), threshold 0.9, limit all, state bounded (neighbors 2), candidates newest, criterion lookup, window 1600, keep 6, sections 3, summary tuned, ctx 3072, search words. Passed 5 of 10; ok any 8 of 10.

| goal | success | answer | ok any | turns | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: |
| g01-luis-refund-amount | no | content | yes | 1 | 1263 | 0 | 0 | 0 | 48 | 16/49 | 48/48 | 256.7 | yes | no | 0 | 0 | 50 |
| g02-luis-card | no | content | yes | 2 | 1166 | 0 | 0 | 0 | 50 | 9/51 | 50/50 | 266.9 | yes | no | 0 | 0 | 54 |
| g03-grace-escalation | yes | reply | yes | 1 | 1412 | 0 | 0 | 0 | 54 | 17/55 | 54/54 | 301.9 | yes | yes | 0 | 0 | 57 |
| g04-halvorsen-ticket | yes | reply | yes | 1 | 1404 | 0 | 0 | 0 | 57 | 17/58 | 57/57 | 310.1 | yes | yes | 0 | 0 | 60 |
| g05-luis-approval-note | yes | reply | yes | 1 | 1854 | 0 | 0 | 0 | 60 | 28/61 | 60/60 | 321.9 | no | yes | 0 | 0 | 63 |
| g06-kenji-shipping | no | content | no | 2 | 1526 | 0 | 0 | 0 | 63 | 12/64 | 63/63 | 340.9 | no | no | 0 | 0 | 67 |
| g07-depot-release | no | reply | no | 1 | 1496 | 0 | 0 | 0 | 67 | 19/68 | 67/67 | 370.5 | yes | yes | 0 | 0 | 70 |
| g08-halvorsen-credit | no | content | yes | 2 | 1380 | 0 | 0 | 0 | 70 | 13/71 | 70/70 | 359.9 | yes | no | 0 | 0 | 74 |
| g09-kenji-gift-note | yes | reply | yes | 1 | 1180 | 0 | 0 | 0 | 74 | 10/75 | 74/74 | 377.0 | yes | yes | 0 | 0 | 77 |
| g10-sigrid-callback | yes | reply | yes | 1 | 1939 | 0 | 0 | 0 | 77 | 24/78 | 77/77 | 386.5 | yes | yes | 0 | 0 | 80 |
