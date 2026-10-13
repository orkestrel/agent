# Larkspur Home support desk: selection

mode selection, judge mica (num_ctx 8192), threshold 0.9, limit 12, ctx 3072. Passed 3 of 10.

| goal | success | turns | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | 1 | 2516 | 0 | 0 | 1 | 7 | 49/49 | 6/48 | 323.3 | yes | yes | 0 | 0 | 51 |
| g02-luis-card | no | 2 | 2689 | 0 | 0 | 0 | 12 | 50/52 | 12/51 | 692.0 | yes | no | 0 | 0 | 55 |
| g03-grace-escalation | yes | 1 | 2784 | 0 | 0 | 0 | 12 | 55/56 | 12/55 | 266.9 | yes | yes | 0 | 0 | 58 |
| g04-halvorsen-ticket | yes | 1 | 2901 | 0 | 0 | 0 | 12 | 57/59 | 12/58 | 267.8 | yes | yes | 0 | 0 | 61 |
| g05-luis-approval-note | no (error) | 1 | 0 | 1 | 0 | 1 | 6 | 62/62 | 5/61 | 101.9 | no | no | 0 | 0 | 62 |
| g06-kenji-shipping | no (error) | 1 | 0 | 1 | 0 | 0 | 12 | 62/63 | 12/62 | 848.4 | no | no | 0 | 0 | 63 |
| g07-depot-release | no (error) | 1 | 0 | 1 | 0 | 0 | 12 | 64/64 | 12/63 | 221.4 | no | no | 0 | 0 | 64 |
| g08-halvorsen-credit | no (error) | 1 | 0 | 1 | 0 | 0 | 12 | 65/65 | 12/64 | 222.4 | no | no | 0 | 0 | 65 |
| g09-kenji-gift-note | no (error) | 1 | 0 | 1 | 0 | 1 | 3 | 66/66 | 2/65 | 38.3 | no | no | 0 | 0 | 66 |
| g10-sigrid-callback | no (error) | 1 | 0 | 1 | 0 | 0 | 12 | 64/67 | 12/66 | 910.3 | no | no | 0 | 0 | 67 |
