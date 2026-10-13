# Larkspur Home support desk: none

mode none, scenario /home/user/agent/tmp/bench/variants/v7.json, model qwen3.5:4b-q4_K_M, think off, ctx 6144, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95, search words, reply terminal, tools 266. Passed 6 of 10; ok any 6 of 10; reply skips 0; reply via final 10, answered 0, tool 0, reminded 0, content 0, none 0; repeats 0; selection faults 0; judge ok 0, judge errors 0.

| goal | success | answer | reply via | ok any | turns | repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | content | final | yes | 2 | 0 | 2656 | 0 | 0 | 0 | 0 | - | - | 74.9 | yes | yes | 0 | 0 | 52 |
| g02-luis-card | yes | content | final | yes | 2 | 0 | 2829 | 0 | 0 | 0 | 0 | - | - | 11.7 | yes | yes | 0 | 0 | 56 |
| g03-grace-escalation | yes | content | final | yes | 1 | 0 | 2902 | 0 | 0 | 0 | 0 | - | - | 74.1 | yes | no | 0 | 0 | 58 |
| g04-halvorsen-ticket | yes | content | final | yes | 1 | 0 | 3211 | 0 | 0 | 0 | 0 | - | - | 8.0 | yes | yes | 0 | 0 | 60 |
| g05-luis-approval-note | no | content | final | no | 1 | 0 | 3270 | 0 | 0 | 0 | 0 | - | - | 144.4 | yes | no | 0 | 0 | 62 |
| g06-kenji-shipping | no | content | final | no | 2 | 0 | 4201 | 0 | 0 | 0 | 0 | - | - | 43.9 | yes | yes | 0 | 0 | 66 |
| g07-depot-release | yes | content | final | yes | 1 | 0 | 4333 | 0 | 0 | 0 | 0 | - | - | 17.7 | yes | no | 0 | 0 | 68 |
| g08-halvorsen-credit | no | content | final | no | 2 | 0 | 4559 | 0 | 0 | 0 | 0 | - | - | 67.5 | yes | yes | 0 | 0 | 72 |
| g09-kenji-gift-note | yes | content | final | yes | 1 | 0 | 4679 | 0 | 0 | 0 | 0 | - | - | 5.7 | yes | no | 0 | 0 | 74 |
| g10-sigrid-callback | no | content | final | no | 1 | 0 | 4742 | 0 | 0 | 0 | 0 | - | - | 6.9 | yes | yes | 0 | 0 | 76 |
