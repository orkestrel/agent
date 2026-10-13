# Larkspur Home support desk: none

mode none, scenario /home/user/agent/tmp/bench/variants/v4.json, model qwen3.5:2b-q4_K_M, think on (cap 2048), ctx 8192, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95, search words, reply terminal, tools 266. Passed 5 of 10; ok any 5 of 10; reply skips 0; reply via final 10, answered 0, tool 0, reminded 0, content 0, none 0; repeats 0; selection faults 0; judge ok 0, judge errors 0. Think cut 0 of 16 agent calls; thinking 9211 characters.

| goal | success | answer | reply via | ok any | turns | repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | content | final | yes | 1 | 0 | 2538 | 0 | 0 | 0 | 0 | - | - | 30.3 | yes | no | 0 | 0 | 50 |
| g02-luis-card | yes | content | final | yes | 2 | 0 | 2723 | 0 | 0 | 0 | 0 | - | - | 13.5 | yes | yes | 0 | 0 | 54 |
| g03-grace-escalation | no | content | final | no | 3 | 0 | 3047 | 0 | 0 | 0 | 0 | - | - | 74.3 | yes | yes | 0 | 0 | 60 |
| g04-halvorsen-ticket | yes | content | final | yes | 2 | 0 | 3446 | 0 | 0 | 0 | 0 | - | - | 36.4 | yes | yes | 0 | 0 | 64 |
| g05-luis-approval-note | no | content | final | no | 1 | 0 | 3612 | 0 | 0 | 0 | 0 | - | - | 35.0 | yes | no | 0 | 0 | 66 |
| g06-kenji-shipping | no | content | final | no | 2 | 0 | 4030 | 0 | 0 | 0 | 0 | - | - | 34.5 | yes | yes | 0 | 0 | 70 |
| g07-depot-release | no | content | final | no | 1 | 0 | 4225 | 0 | 0 | 0 | 0 | - | - | 39.3 | yes | no | 0 | 0 | 72 |
| g08-halvorsen-credit | yes | content | final | yes | 2 | 0 | 4545 | 0 | 0 | 0 | 0 | - | - | 37.5 | yes | yes | 0 | 0 | 76 |
| g09-kenji-gift-note | yes | content | final | yes | 1 | 0 | 4754 | 0 | 0 | 0 | 0 | - | - | 24.8 | yes | no | 0 | 0 | 78 |
| g10-sigrid-callback | no | content | final | no | 1 | 0 | 4884 | 0 | 0 | 0 | 0 | - | - | 26.6 | yes | yes | 0 | 0 | 80 |
