# Larkspur Home support desk: selection

mode selection, judge mica (num_ctx 4096), threshold 0.9, limit all, state bounded (neighbors 2), candidates newest, criterion lookup, ctx 3072, search words. Passed 1 of 10; ok any 3 of 10.

| goal | success | answer | ok any | turns | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: |
| g01-luis-refund-amount | no | content | yes | 1 | 1263 | 0 | 0 | 0 | 48 | 16/49 | 48/48 | 255.3 | yes | no | 0 | 0 | 50 |
| g02-luis-card | no | content | yes | 2 | 1166 | 0 | 0 | 0 | 50 | 9/51 | 50/50 | 262.6 | yes | no | 0 | 0 | 54 |
| g03-grace-escalation | yes | reply | yes | 1 | 2776 | 0 | 0 | 1 | 7 | 55/55 | 6/54 | 53.2 | yes | yes | 0 | 0 | 57 |
| g04-halvorsen-ticket | no | reply | no | 1 | 1398 | 0 | 0 | 0 | 57 | 17/58 | 57/57 | 318.2 | yes | yes | 0 | 0 | 60 |
| g05-luis-approval-note | no | reply | no | 1 | 1848 | 0 | 0 | 0 | 60 | 28/61 | 60/60 | 327.1 | no | yes | 0 | 0 | 63 |
| g06-kenji-shipping | no (error) | none | no | 1 | 0 | 1 | 0 | 1 | 5 | 64/64 | 4/63 | 22.8 | no | no | 0 | 0 | 64 |
| g07-depot-release | no (error) | none | no | 1 | 0 | 1 | 0 | 1 | 59 | 65/65 | 58/64 | 312.1 | no | no | 0 | 0 | 65 |
| g08-halvorsen-credit | no (error) | none | no | 1 | 0 | 1 | 0 | 1 | 60 | 66/66 | 59/65 | 312.5 | no | no | 0 | 0 | 66 |
| g09-kenji-gift-note | no | reply | no | 2 | 1214 | 0 | 0 | 0 | 66 | 8/67 | 66/66 | 365.0 | yes | yes | 0 | 0 | 71 |
| g10-sigrid-callback | no (error) | none | no | 1 | 0 | 1 | 0 | 1 | 58 | 72/72 | 57/71 | 487.9 | no | no | 0 | 0 | 72 |
