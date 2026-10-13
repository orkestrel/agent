# Larkspur Home support desk: none

mode none, scenario /home/user/agent/tmp/bench/variants/v5.json, model qwen3.5:4b-q4_K_M, think off, ctx 6144, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95, search words, reply terminal, tools 266. Passed 8 of 10; ok any 8 of 10; reply skips 0; reply via final 10, answered 0, tool 0, reminded 0, content 0, none 0; repeats 0; selection faults 0; judge ok 0, judge errors 0.

| goal | success | answer | reply via | ok any | turns | repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | content | final | yes | 1 | 0 | 2547 | 0 | 0 | 0 | 0 | - | - | 45.7 | yes | no | 0 | 0 | 50 |
| g02-luis-card | yes | content | final | yes | 2 | 0 | 2742 | 0 | 0 | 0 | 0 | - | - | 11.0 | yes | yes | 0 | 0 | 54 |
| g03-grace-escalation | yes | content | final | yes | 1 | 0 | 2811 | 0 | 0 | 0 | 0 | - | - | 48.3 | yes | no | 0 | 0 | 56 |
| g04-halvorsen-ticket | yes | content | final | yes | 1 | 0 | 3167 | 0 | 0 | 0 | 0 | - | - | 11.6 | yes | yes | 0 | 0 | 58 |
| g05-luis-approval-note | yes | content | final | yes | 1 | 0 | 3235 | 0 | 0 | 0 | 0 | - | - | 39.7 | yes | no | 0 | 0 | 60 |
| g06-kenji-shipping | no | content | final | no | 2 | 0 | 3639 | 0 | 0 | 0 | 0 | - | - | 21.9 | yes | yes | 0 | 0 | 64 |
| g07-depot-release | yes | content | final | yes | 1 | 0 | 3754 | 0 | 0 | 0 | 0 | - | - | 13.3 | yes | no | 0 | 0 | 66 |
| g08-halvorsen-credit | no | content | final | no | 2 | 0 | 3991 | 0 | 0 | 0 | 0 | - | - | 23.7 | yes | yes | 0 | 0 | 70 |
| g09-kenji-gift-note | yes | content | final | yes | 1 | 0 | 4119 | 0 | 0 | 0 | 0 | - | - | 14.3 | yes | no | 0 | 0 | 72 |
| g10-sigrid-callback | yes | content | final | yes | 1 | 0 | 4240 | 0 | 0 | 0 | 0 | - | - | 9.5 | yes | yes | 0 | 0 | 74 |
