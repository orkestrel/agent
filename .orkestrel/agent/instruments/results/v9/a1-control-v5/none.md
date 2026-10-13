# Larkspur Home support desk: none

mode none, scenario /home/user/agent/tmp/bench/variants/v5.json, model qwen3.5:2b-q4_K_M, think off, ctx 6144, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95, search words, reply terminal, tools 266. Passed 5 of 10; ok any 5 of 10; reply skips 0; reply via final 10, answered 0, tool 0, reminded 0, content 0, none 0; repeats 0; selection faults 0; judge ok 0, judge errors 0.

| goal | success | answer | reply via | ok any | turns | repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | content | final | yes | 3 | 0 | 2760 | 0 | 0 | 0 | 0 | - | - | 28.2 | yes | yes | 0 | 0 | 54 |
| g02-luis-card | yes | content | final | yes | 2 | 0 | 2955 | 0 | 0 | 0 | 0 | - | - | 4.9 | yes | yes | 0 | 0 | 58 |
| g03-grace-escalation | no | content | final | no | 2 | 0 | 3244 | 0 | 0 | 0 | 0 | - | - | 22.7 | yes | yes | 0 | 0 | 63 |
| g04-halvorsen-ticket | yes | content | final | yes | 2 | 0 | 3641 | 0 | 0 | 0 | 0 | - | - | 10.1 | yes | yes | 0 | 0 | 67 |
| g05-luis-approval-note | no | content | final | no | 1 | 0 | 3747 | 0 | 0 | 0 | 0 | - | - | 14.9 | yes | no | 0 | 0 | 69 |
| g06-kenji-shipping | no | content | final | no | 2 | 0 | 4116 | 0 | 0 | 0 | 0 | - | - | 13.0 | yes | yes | 0 | 0 | 73 |
| g07-depot-release | no | content | final | no | 2 | 0 | 4408 | 0 | 0 | 0 | 0 | - | - | 12.4 | yes | yes | 0 | 0 | 77 |
| g08-halvorsen-credit | yes | content | final | yes | 2 | 0 | 4674 | 0 | 0 | 0 | 0 | - | - | 14.1 | yes | yes | 0 | 0 | 81 |
| g09-kenji-gift-note | yes | content | final | yes | 2 | 0 | 4975 | 0 | 0 | 0 | 0 | - | - | 7.9 | yes | yes | 0 | 0 | 85 |
| g10-sigrid-callback | no | content | final | no | 2 | 0 | 5579 | 0 | 0 | 0 | 0 | - | - | 10.3 | yes | yes | 0 | 0 | 89 |
