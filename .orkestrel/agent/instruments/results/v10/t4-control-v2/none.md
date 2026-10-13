# Larkspur Home support desk: none

mode none, scenario /home/user/agent/tmp/bench/variants/v2.json, model qwen3.5:4b-q4_K_M, think on (cap 1024), ctx 7168, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95, search words, reply terminal, tools 266. Passed 9 of 10; ok any 9 of 10; reply skips 0; reply via final 10, answered 0, tool 0, reminded 0, content 0, none 0; repeats 0; selection faults 0; judge ok 0, judge errors 0. Think cut 0 of 14 agent calls; thinking 7426 characters.

| goal | success | answer | reply via | ok any | turns | repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | content | final | yes | 1 | 0 | 2540 | 0 | 0 | 0 | 0 | - | - | 97.8 | yes | no | 0 | 0 | 50 |
| g02-luis-card | yes | content | final | yes | 2 | 0 | 2721 | 0 | 0 | 0 | 0 | - | - | 72.1 | yes | yes | 0 | 0 | 54 |
| g03-grace-escalation | yes | content | final | yes | 1 | 0 | 2800 | 0 | 0 | 0 | 0 | - | - | 90.6 | yes | no | 0 | 0 | 56 |
| g04-halvorsen-ticket | yes | content | final | yes | 1 | 0 | 2991 | 0 | 0 | 0 | 0 | - | - | 20.1 | yes | yes | 0 | 0 | 58 |
| g05-luis-approval-note | yes | content | final | yes | 1 | 0 | 3044 | 0 | 0 | 0 | 0 | - | - | 72.0 | yes | no | 0 | 0 | 60 |
| g06-kenji-shipping | no | content | final | no | 2 | 0 | 3393 | 0 | 0 | 0 | 0 | - | - | 68.6 | yes | yes | 0 | 0 | 64 |
| g07-depot-release | yes | content | final | yes | 1 | 0 | 3524 | 0 | 0 | 0 | 0 | - | - | 63.9 | yes | no | 0 | 0 | 66 |
| g08-halvorsen-credit | yes | content | final | yes | 2 | 0 | 3811 | 0 | 0 | 0 | 0 | - | - | 74.1 | yes | yes | 0 | 0 | 70 |
| g09-kenji-gift-note | yes | content | final | yes | 2 | 0 | 4470 | 0 | 0 | 0 | 0 | - | - | 78.1 | yes | no | 0 | 0 | 74 |
| g10-sigrid-callback | yes | content | final | yes | 1 | 0 | 4595 | 0 | 0 | 0 | 0 | - | - | 45.0 | yes | yes | 0 | 0 | 76 |
