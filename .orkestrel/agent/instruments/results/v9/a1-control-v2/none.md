# Larkspur Home support desk: none

mode none, scenario /home/user/agent/tmp/bench/variants/v2.json, model qwen3.5:2b-q4_K_M, think off, ctx 6144, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95, search words, reply terminal, tools 266. Passed 6 of 10; ok any 6 of 10; reply skips 0; reply via final 9, answered 1, tool 0, reminded 0, content 0, none 0; repeats 1; selection faults 0; judge ok 0, judge errors 0.

| goal | success | answer | reply via | ok any | turns | repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | content | final | yes | 1 | 0 | 2542 | 0 | 0 | 0 | 0 | - | - | 23.0 | yes | no | 0 | 0 | 50 |
| g02-luis-card | yes | content | final | yes | 2 | 0 | 2756 | 0 | 0 | 0 | 0 | - | - | 6.3 | yes | yes | 0 | 0 | 54 |
| g03-grace-escalation | no | content | final | no | 2 | 0 | 3064 | 0 | 0 | 0 | 0 | - | - | 19.8 | yes | yes | 0 | 0 | 59 |
| g04-halvorsen-ticket | yes | content | answered | yes | 4 | 1 | 3578 | 0 | 0 | 0 | 0 | - | - | 38.5 | yes | yes | 0 | 0 | 68 |
| g05-luis-approval-note | no | content | final | no | 2 | 0 | 3966 | 0 | 0 | 0 | 0 | - | - | 20.2 | yes | yes | 0 | 0 | 73 |
| g06-kenji-shipping | no | content | final | no | 2 | 0 | 4322 | 0 | 0 | 0 | 0 | - | - | 15.9 | yes | yes | 0 | 0 | 77 |
| g07-depot-release | no | content | final | no | 2 | 0 | 4678 | 0 | 0 | 0 | 0 | - | - | 18.2 | yes | yes | 0 | 0 | 81 |
| g08-halvorsen-credit | yes | content | final | yes | 2 | 0 | 5002 | 0 | 0 | 0 | 0 | - | - | 11.2 | yes | yes | 0 | 0 | 85 |
| g09-kenji-gift-note | yes | content | final | yes | 2 | 0 | 5262 | 0 | 0 | 0 | 0 | - | - | 9.0 | yes | yes | 0 | 0 | 89 |
| g10-sigrid-callback | yes | content | final | yes | 2 | 0 | 5481 | 0 | 0 | 0 | 0 | - | - | 7.5 | yes | yes | 0 | 0 | 93 |
