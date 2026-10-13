# Larkspur Home support desk: selection

mode selection, judge mica (num_ctx 4096), threshold 0.95, limit all, state bounded (neighbors 2), candidates newest, criterion lookup, ctx 3072, search words. Passed 4 of 10; ok any 7 of 10.

| goal | success | answer | ok any | turns | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: |
| g01-luis-refund-amount | no | content | yes | 3 | 1730 | 0 | 0 | 0 | 48 | 22/49 | 48/48 | 253.7 | yes | no | 0 | 0 | 54 |
| g02-luis-card | no | content | yes | 2 | 1424 | 0 | 0 | 0 | 54 | 14/55 | 54/54 | 277.0 | yes | no | 0 | 0 | 58 |
| g03-grace-escalation | yes | reply | yes | 1 | 1738 | 0 | 0 | 0 | 58 | 25/59 | 58/58 | 317.7 | yes | yes | 0 | 0 | 61 |
| g04-halvorsen-ticket | yes | reply | yes | 1 | 1899 | 0 | 0 | 0 | 61 | 30/62 | 61/61 | 323.2 | yes | yes | 0 | 0 | 64 |
| g05-luis-approval-note | yes | reply | yes | 1 | 2713 | 0 | 0 | 0 | 64 | 50/65 | 64/64 | 367.6 | yes | yes | 0 | 0 | 67 |
| g06-kenji-shipping | no | content | no | 2 | 1931 | 0 | 0 | 0 | 67 | 22/68 | 67/67 | 367.6 | no | no | 0 | 0 | 71 |
| g07-depot-release | no | reply | no | 1 | 2129 | 0 | 0 | 0 | 71 | 34/72 | 71/71 | 397.0 | yes | yes | 0 | 0 | 74 |
| g08-halvorsen-credit | no | content | yes | 2 | 2769 | 0 | 0 | 0 | 74 | 40/75 | 74/74 | 416.3 | yes | no | 0 | 0 | 78 |
| g09-kenji-gift-note | yes | reply | yes | 1 | 2166 | 0 | 0 | 0 | 78 | 28/79 | 78/78 | 458.2 | yes | yes | 0 | 0 | 81 |
| g10-sigrid-callback | no | reply | no | 1 | 2362 | 0 | 0 | 0 | 81 | 34/82 | 81/81 | 1229.0 | yes | yes | 0 | 0 | 84 |
