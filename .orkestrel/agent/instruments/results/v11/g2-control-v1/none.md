# Larkspur Home support desk: none

mode none, scenario /home/user/agent/tmp/bench/variants/v1.json, model gemma4:e2b-it-q4_K_M, think off, ctx 6144, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95, search words, reply terminal, tools 266. Passed 8 of 10; ok any 8 of 10; reply skips 0; reply via final 10, answered 0, tool 0, reminded 0, content 0, none 0; repeats 0; selection faults 0; judge ok 0, judge errors 0.

| goal | success | answer | reply via | ok any | turns | repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | content | final | yes | 1 | 0 | 2247 | 0 | 0 | 0 | 0 | - | - | 43.3 | yes | no | 0 | 0 | 50 |
| g02-luis-card | yes | content | final | yes | 2 | 0 | 2435 | 0 | 0 | 0 | 0 | - | - | 5.8 | yes | yes | 0 | 0 | 54 |
| g03-grace-escalation | yes | content | final | yes | 1 | 0 | 2502 | 0 | 0 | 0 | 0 | - | - | 28.5 | yes | no | 0 | 0 | 56 |
| g04-halvorsen-ticket | yes | content | final | yes | 1 | 0 | 2729 | 0 | 0 | 0 | 0 | - | - | 4.1 | yes | yes | 0 | 0 | 58 |
| g05-luis-approval-note | yes | content | final | yes | 1 | 0 | 2790 | 0 | 0 | 0 | 0 | - | - | 31.6 | yes | no | 0 | 0 | 60 |
| g06-kenji-shipping | no | content | final | no | 2 | 0 | 3156 | 0 | 0 | 0 | 0 | - | - | 36.5 | yes | yes | 0 | 0 | 64 |
| g07-depot-release | yes | content | final | yes | 1 | 0 | 3421 | 0 | 0 | 0 | 0 | - | - | 19.2 | yes | no | 0 | 0 | 66 |
| g08-halvorsen-credit | yes | content | final | yes | 2 | 0 | 3675 | 0 | 0 | 0 | 0 | - | - | 28.4 | yes | yes | 0 | 0 | 70 |
| g09-kenji-gift-note | yes | content | final | yes | 1 | 0 | 3869 | 0 | 0 | 0 | 0 | - | - | 5.3 | yes | no | 0 | 0 | 72 |
| g10-sigrid-callback | no | content | final | no | 1 | 0 | 3941 | 0 | 0 | 0 | 0 | - | - | 10.4 | yes | yes | 0 | 0 | 74 |
