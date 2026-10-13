# Larkspur Home support desk: none

mode none, scenario /home/user/agent/tmp/bench/variants/v3.json, model qwen3.5:2b-q4_K_M, think on (cap 2048), ctx 8192, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95, search words, reply terminal, tools 266. Passed 5 of 10; ok any 5 of 10; reply skips 0; reply via final 9, answered 1, tool 0, reminded 0, content 0, none 0; repeats 0; selection faults 0; judge ok 0, judge errors 0. Think cut 0 of 16 agent calls; thinking 7095 characters.

| goal | success | answer | reply via | ok any | turns | repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | content | final | yes | 1 | 0 | 2545 | 0 | 0 | 0 | 0 | - | - | 41.4 | yes | no | 0 | 0 | 50 |
| g02-luis-card | yes | content | final | yes | 2 | 0 | 2745 | 0 | 0 | 0 | 0 | - | - | 14.8 | yes | yes | 0 | 0 | 54 |
| g03-grace-escalation | no | content | final | no | 1 | 0 | 2811 | 0 | 0 | 0 | 0 | - | - | 34.6 | yes | no | 0 | 0 | 56 |
| g04-halvorsen-ticket | yes | content | final | yes | 1 | 0 | 3016 | 0 | 0 | 0 | 0 | - | - | 19.9 | yes | yes | 0 | 0 | 58 |
| g05-luis-approval-note | no | content | final | no | 1 | 0 | 3151 | 0 | 0 | 0 | 0 | - | - | 34.4 | yes | no | 0 | 0 | 60 |
| g06-kenji-shipping | no | content | final | no | 2 | 0 | 3496 | 0 | 0 | 0 | 0 | - | - | 33.5 | yes | yes | 0 | 0 | 64 |
| g07-depot-release | no | content | final | no | 1 | 0 | 3689 | 0 | 0 | 0 | 0 | - | - | 29.1 | yes | no | 0 | 0 | 66 |
| g08-halvorsen-credit | yes | content | final | yes | 2 | 0 | 3954 | 0 | 0 | 0 | 0 | - | - | 52.5 | yes | yes | 0 | 0 | 70 |
| g09-kenji-gift-note | yes | content | final | yes | 1 | 0 | 4116 | 0 | 0 | 0 | 0 | - | - | 11.1 | yes | no | 0 | 0 | 72 |
| g10-sigrid-callback | no | content | answered | no | 4 | 0 | 5131 | 0 | 0 | 0 | 0 | - | - | 142.2 | yes | yes | 0 | 0 | 80 |
