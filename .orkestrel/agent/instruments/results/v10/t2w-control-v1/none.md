# Larkspur Home support desk: none

mode none, scenario /home/user/agent/tmp/bench/variants/v1.json, model qwen3.5:2b-q4_K_M, think on (cap 2048), ctx 8192, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95, search words, reply terminal, tools 266. Passed 5 of 10; ok any 5 of 10; reply skips 0; reply via final 10, answered 0, tool 0, reminded 0, content 0, none 0; repeats 0; selection faults 0; judge ok 0, judge errors 0. Think cut 0 of 13 agent calls; thinking 7101 characters.

| goal | success | answer | reply via | ok any | turns | repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | content | final | yes | 1 | 0 | 2537 | 0 | 0 | 0 | 0 | - | - | 34.1 | yes | no | 0 | 0 | 50 |
| g02-luis-card | yes | content | final | yes | 2 | 0 | 2715 | 0 | 0 | 0 | 0 | - | - | 13.3 | yes | yes | 0 | 0 | 54 |
| g03-grace-escalation | no | content | final | no | 1 | 0 | 2787 | 0 | 0 | 0 | 0 | - | - | 39.2 | yes | no | 0 | 0 | 56 |
| g04-halvorsen-ticket | yes | content | final | yes | 1 | 0 | 3035 | 0 | 0 | 0 | 0 | - | - | 19.7 | yes | yes | 0 | 0 | 58 |
| g05-luis-approval-note | no | content | final | no | 1 | 0 | 3175 | 0 | 0 | 0 | 0 | - | - | 34.1 | yes | no | 0 | 0 | 60 |
| g06-kenji-shipping | no | content | final | no | 2 | 0 | 3483 | 0 | 0 | 0 | 0 | - | - | 35.3 | yes | yes | 0 | 0 | 64 |
| g07-depot-release | no | content | final | no | 1 | 0 | 3666 | 0 | 0 | 0 | 0 | - | - | 29.6 | yes | no | 0 | 0 | 66 |
| g08-halvorsen-credit | yes | content | final | yes | 2 | 0 | 3891 | 0 | 0 | 0 | 0 | - | - | 29.1 | yes | yes | 0 | 0 | 70 |
| g09-kenji-gift-note | yes | content | final | yes | 1 | 0 | 4061 | 0 | 0 | 0 | 0 | - | - | 18.0 | yes | no | 0 | 0 | 72 |
| g10-sigrid-callback | no | content | final | no | 1 | 0 | 4155 | 0 | 0 | 0 | 0 | - | - | 23.8 | yes | yes | 0 | 0 | 74 |
