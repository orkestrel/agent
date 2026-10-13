# Larkspur Home support desk: none

mode none, scenario /home/user/agent/tmp/bench/variants/v4.json, model gemma4:e2b-it-q4_K_M, think off, ctx 6144, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95, search words, reply terminal, tools 266. Passed 6 of 10; ok any 6 of 10; reply skips 0; reply via final 10, answered 0, tool 0, reminded 0, content 0, none 0; repeats 0; selection faults 0; judge ok 0, judge errors 0.

| goal | success | answer | reply via | ok any | turns | repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | content | final | yes | 1 | 0 | 2247 | 0 | 0 | 0 | 0 | - | - | 42.4 | yes | no | 0 | 0 | 50 |
| g02-luis-card | yes | content | final | yes | 2 | 0 | 2445 | 0 | 0 | 0 | 0 | - | - | 7.5 | yes | yes | 0 | 0 | 54 |
| g03-grace-escalation | yes | content | final | yes | 1 | 0 | 2528 | 0 | 0 | 0 | 0 | - | - | 23.1 | yes | no | 0 | 0 | 56 |
| g04-halvorsen-ticket | yes | content | final | yes | 1 | 0 | 2729 | 0 | 0 | 0 | 0 | - | - | 5.9 | yes | yes | 0 | 0 | 58 |
| g05-luis-approval-note | no | content | final | no | 1 | 0 | 2794 | 0 | 0 | 0 | 0 | - | - | 27.9 | yes | no | 0 | 0 | 60 |
| g06-kenji-shipping | no | content | final | no | 2 | 0 | 3128 | 0 | 0 | 0 | 0 | - | - | 27.3 | yes | yes | 0 | 0 | 64 |
| g07-depot-release | yes | content | final | yes | 1 | 0 | 3352 | 0 | 0 | 0 | 0 | - | - | 14.8 | yes | no | 0 | 0 | 66 |
| g08-halvorsen-credit | yes | content | final | yes | 2 | 0 | 3584 | 0 | 0 | 0 | 0 | - | - | 32.9 | yes | yes | 0 | 0 | 70 |
| g09-kenji-gift-note | no | content | final | no | 1 | 0 | 3800 | 0 | 0 | 0 | 0 | - | - | 11.5 | yes | no | 0 | 0 | 72 |
| g10-sigrid-callback | no | content | final | no | 1 | 0 | 3903 | 0 | 0 | 0 | 0 | - | - | 11.7 | yes | yes | 0 | 0 | 74 |
