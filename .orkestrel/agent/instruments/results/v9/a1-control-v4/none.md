# Larkspur Home support desk: none

mode none, scenario /home/user/agent/tmp/bench/variants/v4.json, model qwen3.5:2b-q4_K_M, think off, ctx 6144, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95, search words, reply terminal, tools 266. Passed 8 of 10; ok any 8 of 10; reply skips 0; reply via final 8, answered 2, tool 0, reminded 0, content 0, none 0; repeats 2; selection faults 0; judge ok 0, judge errors 0.

| goal | success | answer | reply via | ok any | turns | repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | content | answered | yes | 4 | 1 | 2753 | 0 | 0 | 0 | 0 | - | - | 65.5 | yes | yes | 0 | 0 | 57 |
| g02-luis-card | yes | content | final | yes | 2 | 0 | 3074 | 0 | 0 | 0 | 0 | - | - | 6.1 | yes | yes | 0 | 0 | 61 |
| g03-grace-escalation | yes | content | final | yes | 2 | 0 | 3368 | 0 | 0 | 0 | 0 | - | - | 16.4 | yes | yes | 0 | 0 | 66 |
| g04-halvorsen-ticket | yes | content | answered | yes | 4 | 1 | 3856 | 0 | 0 | 0 | 0 | - | - | 28.7 | yes | yes | 0 | 0 | 75 |
| g05-luis-approval-note | no | content | final | no | 1 | 0 | 4042 | 0 | 0 | 0 | 0 | - | - | 18.1 | yes | no | 0 | 0 | 77 |
| g06-kenji-shipping | no | content | final | no | 2 | 0 | 4447 | 0 | 0 | 0 | 0 | - | - | 19.1 | yes | yes | 0 | 0 | 81 |
| g07-depot-release | yes | content | final | yes | 2 | 0 | 4893 | 0 | 0 | 0 | 0 | - | - | 17.3 | yes | yes | 0 | 0 | 85 |
| g08-halvorsen-credit | yes | content | final | yes | 2 | 0 | 5131 | 0 | 0 | 0 | 0 | - | - | 12.2 | yes | yes | 0 | 0 | 89 |
| g09-kenji-gift-note | yes | content | final | yes | 1 | 0 | 5269 | 0 | 0 | 0 | 0 | - | - | 3.8 | yes | no | 0 | 0 | 91 |
| g10-sigrid-callback | yes | content | final | yes | 1 | 0 | 5350 | 0 | 0 | 0 | 0 | - | - | 6.7 | yes | yes | 0 | 0 | 93 |
