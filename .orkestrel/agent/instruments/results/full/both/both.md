# Larkspur Home support desk: both

mode both, judge mica (num_ctx 8192), threshold 0.9, limit all, window 1200, keep 6, summary generic, ctx 3072. Passed 3 of 10.

| goal | success | turns | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | 2 | 1468 | 0 | 0 | 1 | 29 | 5/7 | 6/6 | 1343.1 | no | yes | 2 | 1 | 11 |
| g02-luis-card | yes | 2 | 1645 | 0 | 0 | 0 | 11 | 8/12 | 11/11 | 170.9 | no | yes | 0 | 1 | 16 |
| g03-grace-escalation | no | 1 | 1860 | 0 | 0 | 0 | 16 | 16/17 | 16/16 | 343.2 | no | yes | 2 | 2 | 8 |
| g04-halvorsen-ticket | yes | 1 | 2037 | 0 | 0 | 0 | 16 | 9/9 | 8/8 | 333.6 | no | yes | 4 | 4 | 10 |
| g05-luis-approval-note | no | 1 | 2365 | 0 | 0 | 0 | 20 | 11/11 | 10/10 | 418.8 | no | yes | 4 | 6 | 12 |
| g06-kenji-shipping | no (error) | 2 | 2813 | 1 | 0 | 1 | 26 | 14/14 | 1/13 | 546.4 | no | no | 4 | 8 | 14 |
| g07-depot-release | no (error) | 1 | 0 | 1 | 0 | 0 | 28 | 15/15 | 14/14 | 875.1 | no | no | 2 | 9 | 15 |
| g08-halvorsen-credit | no (error) | 1 | 0 | 1 | 0 | 0 | 30 | 15/16 | 15/15 | 737.4 | no | no | 2 | 10 | 16 |
| g09-kenji-gift-note | no (error) | 1 | 0 | 1 | 0 | 0 | 32 | 17/17 | 16/16 | 784.2 | no | no | 2 | 11 | 17 |
| g10-sigrid-callback | no (error) | 1 | 0 | 1 | 0 | 0 | 34 | 18/18 | 17/17 | 914.6 | no | no | 2 | 12 | 18 |
