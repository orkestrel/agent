# Larkspur Home support desk: none

mode none, scenario /home/user/agent/tmp/bench/variants/v8.json, model gemma4:e2b-it-q4_K_M, think off, ctx 6144, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95, search words, reply terminal, tools 266. Passed 8 of 10; ok any 8 of 10; reply skips 0; reply via final 10, answered 0, tool 0, reminded 0, content 0, none 0; repeats 0; selection faults 0; judge ok 0, judge errors 0.

| goal | success | answer | reply via | ok any | turns | repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | content | final | yes | 1 | 0 | 2249 | 0 | 0 | 0 | 0 | - | - | 38.5 | yes | no | 0 | 0 | 50 |
| g02-luis-card | yes | content | final | yes | 2 | 0 | 2420 | 0 | 0 | 0 | 0 | - | - | 9.9 | yes | yes | 0 | 0 | 54 |
| g03-grace-escalation | yes | content | final | yes | 1 | 0 | 2516 | 0 | 0 | 0 | 0 | - | - | 25.3 | yes | no | 0 | 0 | 56 |
| g04-halvorsen-ticket | yes | content | final | yes | 1 | 0 | 2714 | 0 | 0 | 0 | 0 | - | - | 5.4 | yes | yes | 0 | 0 | 58 |
| g05-luis-approval-note | no | content | final | no | 1 | 0 | 2785 | 0 | 0 | 0 | 0 | - | - | 28.6 | yes | no | 0 | 0 | 60 |
| g06-kenji-shipping | no | content | final | no | 2 | 0 | 3119 | 0 | 0 | 0 | 0 | - | - | 30.8 | yes | yes | 0 | 0 | 64 |
| g07-depot-release | yes | content | final | yes | 1 | 0 | 3365 | 0 | 0 | 0 | 0 | - | - | 25.5 | yes | no | 0 | 0 | 66 |
| g08-halvorsen-credit | yes | content | final | yes | 2 | 0 | 3654 | 0 | 0 | 0 | 0 | - | - | 24.2 | yes | yes | 0 | 0 | 70 |
| g09-kenji-gift-note | yes | content | final | yes | 1 | 0 | 3847 | 0 | 0 | 0 | 0 | - | - | 11.5 | yes | no | 0 | 0 | 72 |
| g10-sigrid-callback | yes | content | final | yes | 1 | 0 | 3956 | 0 | 0 | 0 | 0 | - | - | 13.9 | yes | yes | 0 | 0 | 74 |
