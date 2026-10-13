# Larkspur Home support desk: none

mode none, scenario /home/user/scaffold/.orkestrel/agent/instruments/harness/bench/variants/v8.json, model gemma4:e4b-it-q4_K_M, think off, ctx 6144, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95, search words, reply terminal, tools 266. Passed 7 of 10; ok any 7 of 10; reply skips 0; reply via final 10, answered 0, tool 0, reminded 0, content 0, none 0; repeats 0; selection faults 0; judge ok 0, judge errors 0.

| goal | success | answer | reply via | ok any | turns | repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | content | final | yes | 1 | 0 | 2249 | 0 | 0 | 0 | 0 | - | - | 67.1 | yes | no | 0 | 0 | 50 |
| g02-luis-card | yes | content | final | yes | 2 | 0 | 2413 | 0 | 0 | 0 | 0 | - | - | 11.2 | yes | yes | 0 | 0 | 54 |
| g03-grace-escalation | no | content | final | no | 2 | 0 | 2827 | 0 | 0 | 0 | 0 | - | - | 32.0 | yes | no | 0 | 0 | 58 |
| g04-halvorsen-ticket | yes | content | final | yes | 1 | 0 | 2986 | 0 | 0 | 0 | 0 | - | - | 4.3 | yes | yes | 0 | 0 | 60 |
| g05-luis-approval-note | no | content | final | no | 1 | 0 | 3043 | 0 | 0 | 0 | 0 | - | - | 30.9 | yes | no | 0 | 0 | 62 |
| g06-kenji-shipping | no | content | final | no | 2 | 0 | 3360 | 0 | 0 | 0 | 0 | - | - | 33.5 | yes | yes | 0 | 0 | 66 |
| g07-depot-release | yes | content | final | yes | 2 | 0 | 3856 | 0 | 0 | 0 | 0 | - | - | 24.7 | yes | no | 0 | 0 | 70 |
| g08-halvorsen-credit | yes | content | final | yes | 2 | 0 | 4070 | 0 | 0 | 0 | 0 | - | - | 17.6 | yes | yes | 0 | 0 | 74 |
| g09-kenji-gift-note | yes | content | final | yes | 1 | 0 | 4174 | 0 | 0 | 0 | 0 | - | - | 6.2 | yes | no | 0 | 0 | 76 |
| g10-sigrid-callback | yes | content | final | yes | 1 | 0 | 4242 | 0 | 0 | 0 | 0 | - | - | 8.7 | yes | yes | 0 | 0 | 78 |
