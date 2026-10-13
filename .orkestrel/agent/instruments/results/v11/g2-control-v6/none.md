# Larkspur Home support desk: none

mode none, scenario /home/user/agent/tmp/bench/variants/v6.json, model gemma4:e2b-it-q4_K_M, think off, ctx 6144, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95, search words, reply terminal, tools 266. Passed 6 of 10; ok any 6 of 10; reply skips 0; reply via final 10, answered 0, tool 0, reminded 0, content 0, none 0; repeats 0; selection faults 0; judge ok 0, judge errors 0.

| goal | success | answer | reply via | ok any | turns | repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | content | final | yes | 1 | 0 | 2252 | 0 | 0 | 0 | 0 | - | - | 38.7 | yes | no | 0 | 0 | 50 |
| g02-luis-card | yes | content | final | yes | 2 | 0 | 2418 | 0 | 0 | 0 | 0 | - | - | 8.1 | yes | yes | 0 | 0 | 54 |
| g03-grace-escalation | yes | content | final | yes | 1 | 0 | 2499 | 0 | 0 | 0 | 0 | - | - | 31.7 | yes | no | 0 | 0 | 56 |
| g04-halvorsen-ticket | yes | content | final | yes | 1 | 0 | 2757 | 0 | 0 | 0 | 0 | - | - | 4.8 | yes | yes | 0 | 0 | 58 |
| g05-luis-approval-note | no | content | final | no | 1 | 0 | 2824 | 0 | 0 | 0 | 0 | - | - | 25.2 | yes | no | 0 | 0 | 60 |
| g06-kenji-shipping | no | content | final | no | 2 | 0 | 3140 | 0 | 0 | 0 | 0 | - | - | 23.0 | yes | yes | 0 | 0 | 64 |
| g07-depot-release | no | content | final | no | 1 | 0 | 3336 | 0 | 0 | 0 | 0 | - | - | 12.3 | yes | no | 0 | 0 | 66 |
| g08-halvorsen-credit | yes | content | final | yes | 2 | 0 | 3552 | 0 | 0 | 0 | 0 | - | - | 25.5 | yes | yes | 0 | 0 | 70 |
| g09-kenji-gift-note | no | content | final | no | 1 | 0 | 3742 | 0 | 0 | 0 | 0 | - | - | 8.6 | yes | no | 0 | 0 | 72 |
| g10-sigrid-callback | yes | content | final | yes | 1 | 0 | 3825 | 0 | 0 | 0 | 0 | - | - | 5.6 | yes | yes | 0 | 0 | 74 |
