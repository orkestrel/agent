# Larkspur Home support desk: none

mode none, scenario /home/user/agent/tmp/bench/variants/v6.json, model qwen3.5:2b-q4_K_M, think off, ctx 6144, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95, search words, reply terminal, tools 266. Passed 5 of 10; ok any 5 of 10; reply skips 0; reply via final 10, answered 0, tool 0, reminded 0, content 0, none 0; repeats 0; selection faults 0; judge ok 0, judge errors 0.

| goal | success | answer | reply via | ok any | turns | repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | content | final | yes | 1 | 0 | 2544 | 0 | 0 | 0 | 0 | - | - | 41.7 | yes | no | 0 | 0 | 50 |
| g02-luis-card | yes | content | final | yes | 2 | 0 | 2793 | 0 | 0 | 0 | 0 | - | - | 5.3 | yes | yes | 0 | 0 | 54 |
| g03-grace-escalation | no | content | final | no | 1 | 0 | 2860 | 0 | 0 | 0 | 0 | - | - | 16.0 | yes | no | 0 | 0 | 56 |
| g04-halvorsen-ticket | yes | content | final | yes | 3 | 0 | 3360 | 0 | 0 | 0 | 0 | - | - | 44.6 | yes | yes | 0 | 0 | 62 |
| g05-luis-approval-note | no | content | final | no | 1 | 0 | 3623 | 0 | 0 | 0 | 0 | - | - | 19.1 | yes | no | 0 | 0 | 64 |
| g06-kenji-shipping | no | content | final | no | 2 | 0 | 3978 | 0 | 0 | 0 | 0 | - | - | 17.0 | yes | yes | 0 | 0 | 68 |
| g07-depot-release | no | content | final | no | 2 | 0 | 4650 | 0 | 0 | 0 | 0 | - | - | 17.1 | yes | no | 0 | 0 | 72 |
| g08-halvorsen-credit | yes | content | final | yes | 2 | 0 | 4931 | 0 | 0 | 0 | 0 | - | - | 20.3 | yes | yes | 0 | 0 | 76 |
| g09-kenji-gift-note | yes | content | final | yes | 1 | 0 | 5122 | 0 | 0 | 0 | 0 | - | - | 6.0 | yes | no | 0 | 0 | 78 |
| g10-sigrid-callback | no | content | final | no | 2 | 0 | 5321 | 0 | 0 | 0 | 0 | - | - | 8.4 | yes | yes | 0 | 0 | 82 |
