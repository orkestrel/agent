# Larkspur Home support desk: selection

mode selection, judge mica (num_ctx 4096), threshold 0.9, limit all, state bounded (neighbors 2), candidates newest, criterion lookup, ctx 3072, search words. Passed 2 of 10; ok any 4 of 10; reply skips 3; selection faults 0; judge ok 629, judge errors 0.

| goal | success | answer | ok any | turns | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: |
| g01-luis-refund-amount | no | reply | no | 1 | 1427 | 0 | 0 | 0 | 48 | 19/49 | 48/48 | 258.3 | yes | yes | 0 | 0 | 51 |
| g02-luis-card | no | content | yes | 2 | 1174 | 0 | 0 | 0 | 51 | 7/52 | 51/51 | 271.9 | yes | no | 0 | 0 | 55 |
| g03-grace-escalation | no | reply | no | 1 | 1586 | 0 | 0 | 0 | 55 | 20/56 | 55/55 | 295.4 | yes | yes | 0 | 0 | 58 |
| g04-halvorsen-ticket | yes | reply | yes | 1 | 1905 | 0 | 0 | 0 | 58 | 28/59 | 58/58 | 297.9 | yes | yes | 0 | 0 | 61 |
| g05-luis-approval-note | no | reply | no | 1 | 2383 | 0 | 0 | 0 | 61 | 36/62 | 61/61 | 324.8 | yes | yes | 0 | 0 | 64 |
| g06-kenji-shipping | no | content | no | 2 | 2051 | 0 | 0 | 0 | 64 | 22/65 | 64/64 | 338.8 | no | no | 0 | 0 | 68 |
| g07-depot-release | no | reply | no | 1 | 1867 | 0 | 0 | 0 | 68 | 22/69 | 68/68 | 334.6 | yes | yes | 0 | 0 | 71 |
| g08-halvorsen-credit | no | content | yes | 2 | 2120 | 0 | 0 | 0 | 71 | 26/72 | 71/71 | 356.0 | yes | no | 0 | 0 | 75 |
| g09-kenji-gift-note | yes | reply | yes | 1 | 1583 | 0 | 0 | 0 | 75 | 16/76 | 75/75 | 384.7 | yes | yes | 0 | 0 | 78 |
| g10-sigrid-callback | no | reply | no | 1 | 2276 | 0 | 0 | 0 | 78 | 30/79 | 78/78 | 382.0 | yes | yes | 0 | 0 | 81 |
