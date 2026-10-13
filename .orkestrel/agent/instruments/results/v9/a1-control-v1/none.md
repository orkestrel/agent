# Larkspur Home support desk: none

mode none, scenario /home/user/agent/tmp/bench/variants/v1.json, model qwen3.5:2b-q4_K_M, think off, ctx 6144, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95, search words, reply terminal, tools 266. Passed 5 of 10; ok any 5 of 10; reply skips 0; reply via final 10, answered 0, tool 0, reminded 0, content 0, none 0; repeats 0; selection faults 0; judge ok 0, judge errors 0.

| goal | success | answer | reply via | ok any | turns | repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | content | final | yes | 3 | 0 | 2752 | 0 | 0 | 0 | 0 | - | - | 28.5 | yes | yes | 0 | 0 | 54 |
| g02-luis-card | yes | content | final | yes | 2 | 0 | 2948 | 0 | 0 | 0 | 0 | - | - | 5.7 | yes | yes | 0 | 0 | 58 |
| g03-grace-escalation | no | content | final | no | 2 | 0 | 3245 | 0 | 0 | 0 | 0 | - | - | 18.3 | yes | yes | 0 | 0 | 63 |
| g04-halvorsen-ticket | yes | content | final | yes | 3 | 0 | 3687 | 0 | 0 | 0 | 0 | - | - | 19.2 | yes | yes | 0 | 0 | 69 |
| g05-luis-approval-note | yes | content | final | yes | 1 | 0 | 3882 | 0 | 0 | 0 | 0 | - | - | 23.3 | yes | no | 0 | 0 | 71 |
| g06-kenji-shipping | no | content | final | no | 2 | 0 | 4354 | 0 | 0 | 0 | 0 | - | - | 22.9 | yes | yes | 0 | 0 | 75 |
| g07-depot-release | no | content | final | no | 2 | 0 | 4764 | 0 | 0 | 0 | 0 | - | - | 20.2 | yes | yes | 0 | 0 | 79 |
| g08-halvorsen-credit | yes | content | final | yes | 2 | 0 | 5118 | 0 | 0 | 0 | 0 | - | - | 18.2 | yes | yes | 0 | 0 | 83 |
| g09-kenji-gift-note | no | content | final | no | 2 | 0 | 5472 | 0 | 0 | 0 | 0 | - | - | 11.4 | yes | yes | 0 | 0 | 87 |
| g10-sigrid-callback | no | content | final | no | 2 | 0 | 5715 | 0 | 0 | 0 | 0 | - | - | 7.7 | yes | yes | 0 | 0 | 91 |
