# Larkspur Home support desk: compaction

mode compaction, window 1600, keep 6, sections 3, summary tuned, progressive true, ctx 3072, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95, search words, reply terminal, tools 266 (window 335). Passed 4 of 10; ok any 4 of 10; reply skips 0; reply via final 9, answered 1, tool 0, reminded 0, content 0, none 0; repeats 1; selection faults 0; judge ok 0, judge errors 0. Seed folds [25, 13]; goal folds 12 [6, 2; 2; 6; 4, 10; -; 7, 2; 4; 4; 6; 4].

| goal | success | answer | reply via | ok any | turns | repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | content | final | yes | 3 | 0 | 1931 | 0 | 0 | 0 | 0 | - | - | 144.1 | yes | yes | 4 | 3 | 11 |
| g02-luis-card | yes | content | final | yes | 2 | 0 | 2141 | 0 | 0 | 0 | 0 | - | - | 100.6 | no | yes | 3 | 3 | 13 |
| g03-grace-escalation | yes | content | final | yes | 5 | 0 | 2253 | 0 | 0 | 0 | 0 | - | - | 105.0 | no | yes | 2 | 3 | 17 |
| g04-halvorsen-ticket | no | content | answered | no | 4 | 1 | 2646 | 0 | 0 | 0 | 0 | - | - | 136.9 | no | yes | 6 | 3 | 12 |
| g05-luis-approval-note | yes | content | final | yes | 2 | 0 | 2210 | 0 | 0 | 0 | 0 | - | - | 26.6 | no | yes | 0 | 3 | 16 |
| g06-kenji-shipping | no | content | final | no | 2 | 0 | 2355 | 0 | 0 | 0 | 0 | - | - | 151.8 | no | yes | 5 | 3 | 11 |
| g07-depot-release | no | content | final | no | 3 | 0 | 2550 | 0 | 0 | 0 | 0 | - | - | 122.1 | no | yes | 4 | 3 | 13 |
| g08-halvorsen-credit | no | content | final | no | 2 | 0 | 2378 | 0 | 0 | 0 | 0 | - | - | 101.1 | no | yes | 4 | 3 | 13 |
| g09-kenji-gift-note | no | content | final | no | 3 | 0 | 2536 | 0 | 0 | 0 | 0 | - | - | 111.7 | no | yes | 4 | 3 | 13 |
| g10-sigrid-callback | no | content | final | no | 3 | 0 | 2866 | 0 | 0 | 0 | 0 | - | - | 129.7 | no | yes | 4 | 3 | 15 |
