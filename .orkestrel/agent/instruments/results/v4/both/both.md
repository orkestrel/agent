# Larkspur Home support desk: both

mode both, judge mica (num_ctx 4096), threshold 0.9, limit all, state bounded (neighbors 2), candidates newest, criterion lookup, window 1000 (tools 305), keep 6, sections 3, summary tuned, progressive true, ctx 3072, search words. Passed 2 of 10; ok any 5 of 10; reply skips 3; selection faults 0; judge ok 228, judge errors 0. Seed folds [8, 3, 2, 5, 4, 5, 4, 3, 4]; goal folds 9 [2, 4; 4; 11; -; 12; -; 10; -; 14; 5, 8].

| goal | success | answer | ok any | turns | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | reply | yes | 3 | 1256 | 0 | 0 | 0 | 26 | 8/10 | 9/9 | 189.1 | yes | yes | 4 | 3 | 14 |
| g02-luis-card | no | content | yes | 2 | 1260 | 0 | 0 | 0 | 19 | 8/11 | 10/10 | 259.2 | no | no | 2 | 3 | 14 |
| g03-grace-escalation | no | content | yes | 6 | 1498 | 0 | 0 | 0 | 25 | 12/12 | 11/11 | 198.3 | no | no | 2 | 3 | 15 |
| g04-halvorsen-ticket | no | reply | no | 3 | 1955 | 0 | 0 | 0 | 15 | 16/16 | 15/15 | 104.3 | no | yes | 0 | 3 | 22 |
| g05-luis-approval-note | no | reply | no | 1 | 1277 | 0 | 1 | 0 | 27 | 11/11 | 10/10 | 336.6 | no | yes | 3 | 3 | 13 |
| g06-kenji-shipping | no | reply | no | 3 | 1276 | 0 | 0 | 0 | 13 | 8/14 | 13/13 | 91.6 | no | yes | 0 | 3 | 20 |
| g07-depot-release | no | reply | no | 3 | 1156 | 0 | 0 | 0 | 25 | 4/11 | 10/10 | 186.4 | no | yes | 2 | 3 | 17 |
| g08-halvorsen-credit | yes | reply | yes | 2 | 1304 | 0 | 0 | 0 | 17 | 8/18 | 17/17 | 114.8 | no | yes | 0 | 3 | 22 |
| g09-kenji-gift-note | no | content | yes | 4 | 1071 | 0 | 0 | 0 | 27 | 1/9 | 8/8 | 187.7 | no | no | 2 | 3 | 16 |
| g10-sigrid-callback | no | reply | no | 4 | 1350 | 0 | 0 | 0 | 34 | 7/10 | 9/9 | 258.4 | no | yes | 4 | 3 | 12 |
