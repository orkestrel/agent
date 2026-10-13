# Larkspur Home support desk: both

mode both, judge mica (num_ctx 8192), threshold 0.9, limit all, window 1200, keep 6, sections 3, summary generic, ctx 3072. Passed 5 of 10.

| goal | success | turns | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | 2 | 1468 | 0 | 0 | 1 | 23 | 5/7 | 6/6 | 1036.3 | no | yes | 2 | 1 | 11 |
| g02-luis-card | yes | 2 | 1705 | 0 | 0 | 0 | 11 | 10/12 | 11/11 | 169.5 | no | yes | 0 | 1 | 16 |
| g03-grace-escalation | no | 1 | 1860 | 0 | 0 | 0 | 16 | 16/17 | 16/16 | 348.5 | no | yes | 2 | 2 | 8 |
| g04-halvorsen-ticket | yes | 1 | 2114 | 0 | 0 | 0 | 16 | 9/9 | 8/8 | 379.3 | no | yes | 5 | 3 | 9 |
| g05-luis-approval-note | no | 1 | 1841 | 0 | 0 | 1 | 13 | 8/9 | 8/8 | 489.6 | no | yes | 6 | 3 | 9 |
| g06-kenji-shipping | no | 2 | 2093 | 0 | 0 | 0 | 25 | 9/9 | 8/8 | 734.6 | no | yes | 9 | 3 | 9 |
| g07-depot-release | no | 1 | 1769 | 0 | 0 | 1 | 3 | 10/10 | 2/9 | 124.8 | no | yes | 3 | 3 | 9 |
| g08-halvorsen-credit | yes | 2 | 1969 | 0 | 0 | 0 | 25 | 9/9 | 8/8 | 699.8 | no | yes | 9 | 3 | 9 |
| g09-kenji-gift-note | yes | 4 | 1816 | 0 | 0 | 1 | 26 | 9/9 | 8/8 | 695.0 | no | yes | 12 | 3 | 9 |
| g10-sigrid-callback | no | 2 | 962 | 0 | 0 | 0 | 9 | 3/10 | 9/9 | 162.2 | no | no | 0 | 3 | 13 |
