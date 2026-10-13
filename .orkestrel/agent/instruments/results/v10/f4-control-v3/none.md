# Larkspur Home support desk: none

mode none, scenario /home/user/agent/tmp/bench/variants/v3.json, model qwen3.5:4b-q4_K_M, think off, ctx 6144, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95, search words, reply terminal, tools 266. Passed 7 of 10; ok any 7 of 10; reply skips 0; reply via final 10, answered 0, tool 0, reminded 0, content 0, none 0; repeats 0; selection faults 0; judge ok 0, judge errors 0.

| goal | success | answer | reply via | ok any | turns | repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | content | final | yes | 2 | 0 | 2646 | 0 | 0 | 0 | 0 | - | - | 52.4 | yes | no | 0 | 0 | 52 |
| g02-luis-card | yes | content | final | yes | 2 | 0 | 2819 | 0 | 0 | 0 | 0 | - | - | 14.5 | yes | yes | 0 | 0 | 56 |
| g03-grace-escalation | yes | content | final | yes | 1 | 0 | 2903 | 0 | 0 | 0 | 0 | - | - | 28.7 | yes | no | 0 | 0 | 58 |
| g04-halvorsen-ticket | yes | content | final | yes | 1 | 0 | 3113 | 0 | 0 | 0 | 0 | - | - | 10.7 | yes | yes | 0 | 0 | 60 |
| g05-luis-approval-note | yes | content | final | yes | 1 | 0 | 3193 | 0 | 0 | 0 | 0 | - | - | 36.9 | yes | no | 0 | 0 | 62 |
| g06-kenji-shipping | no | content | final | no | 2 | 0 | 3583 | 0 | 0 | 0 | 0 | - | - | 35.1 | yes | yes | 0 | 0 | 66 |
| g07-depot-release | yes | content | final | yes | 1 | 0 | 3778 | 0 | 0 | 0 | 0 | - | - | 14.6 | yes | no | 0 | 0 | 68 |
| g08-halvorsen-credit | no | content | final | no | 2 | 0 | 4007 | 0 | 0 | 0 | 0 | - | - | 25.6 | yes | yes | 0 | 0 | 72 |
| g09-kenji-gift-note | yes | content | final | yes | 1 | 0 | 4138 | 0 | 0 | 0 | 0 | - | - | 8.4 | yes | no | 0 | 0 | 74 |
| g10-sigrid-callback | no | content | final | no | 1 | 0 | 4216 | 0 | 0 | 0 | 0 | - | - | 9.5 | yes | yes | 0 | 0 | 76 |
