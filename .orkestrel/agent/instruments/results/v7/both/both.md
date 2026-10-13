# Larkspur Home support desk: both

mode both, judge mica (num_ctx 4096), threshold 0.9, limit all, state bounded (neighbors 2), candidates newest, chain corrections, criterion lookup, window 1000, keep 6, sections 3, summary tuned, progressive true, ctx 3072, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95, search words, reply terminal, tools 266 (window 335). Passed 4 of 10; ok any 4 of 10; reply skips 0; reply via final 10, answered 0, tool 0, reminded 0, content 0, none 0; repeats 0; selection faults 0; judge ok 225, judge errors 0. Seed folds [6, 3, 2, 2, 5, 2, 2, 2, 1, 2, 2, 2, 2, 1, 4, 2]; goal folds 11 [4; 2, 2; 4; 4; 8; 6; 6; 6; 6; 4].

| goal | success | answer | reply via | ok any | turns | repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: |
| g01-luis-refund-amount | no | content | final | no | 2 | 0 | 1568 | 0 | 0 | 0 | 21 | 8/10 | 9/9 | 222.8 | yes | no | 4 | 3 | 11 |
| g02-luis-card | yes | content | final | yes | 2 | 0 | 1626 | 0 | 0 | 0 | 24 | 10/10 | 9/9 | 292.5 | no | yes | 5 | 3 | 11 |
| g03-grace-escalation | yes | content | final | yes | 4 | 0 | 1691 | 0 | 0 | 0 | 27 | 6/10 | 9/9 | 241.7 | no | yes | 3 | 3 | 15 |
| g04-halvorsen-ticket | yes | content | final | yes | 3 | 0 | 2351 | 0 | 0 | 0 | 20 | 12/12 | 11/11 | 217.5 | no | yes | 3 | 3 | 17 |
| g05-luis-approval-note | no | content | final | no | 3 | 0 | 2048 | 0 | 0 | 0 | 22 | 10/10 | 9/9 | 261.7 | no | yes | 3 | 3 | 15 |
| g06-kenji-shipping | no | content | final | no | 3 | 0 | 1548 | 0 | 0 | 0 | 20 | 7/10 | 9/9 | 230.5 | no | yes | 3 | 3 | 15 |
| g07-depot-release | no | content | final | no | 3 | 0 | 2206 | 0 | 0 | 0 | 26 | 10/10 | 9/9 | 271.0 | no | yes | 3 | 3 | 15 |
| g08-halvorsen-credit | yes | content | final | yes | 2 | 0 | 2021 | 0 | 0 | 0 | 20 | 10/10 | 9/9 | 274.6 | no | yes | 4 | 3 | 13 |
| g09-kenji-gift-note | no | content | final | no | 4 | 0 | 2377 | 0 | 0 | 0 | 25 | 10/10 | 9/9 | 304.9 | no | yes | 4 | 3 | 15 |
| g10-sigrid-callback | no | content | final | no | 2 | 0 | 2738 | 0 | 0 | 0 | 20 | 12/12 | 11/11 | 287.6 | no | yes | 4 | 3 | 15 |
