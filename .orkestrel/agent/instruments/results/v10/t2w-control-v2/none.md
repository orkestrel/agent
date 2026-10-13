# Larkspur Home support desk: none

mode none, scenario /home/user/agent/tmp/bench/variants/v2.json, model qwen3.5:2b-q4_K_M, think on (cap 2048), ctx 8192, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95, search words, reply terminal, tools 266. Passed 7 of 10; ok any 7 of 10; reply skips 0; reply via final 8, answered 1, tool 0, reminded 0, content 0, none 1; repeats 1; selection faults 0; judge ok 0, judge errors 0. Think cut 2 of 21 agent calls; thinking 26008 characters.

| goal | success | answer | reply via | ok any | turns | repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | content | final | yes | 1 | 0 | 2540 | 0 | 0 | 0 | 0 | - | - | 34.0 | yes | no | 0 | 0 | 50 |
| g02-luis-card | yes | content | final | yes | 2 | 0 | 2720 | 0 | 0 | 0 | 0 | - | - | 13.7 | yes | yes | 0 | 0 | 54 |
| g03-grace-escalation | yes | content | final | yes | 1 | 0 | 2789 | 0 | 0 | 0 | 0 | - | - | 30.0 | yes | no | 0 | 0 | 56 |
| g04-halvorsen-ticket | yes | content | final | yes | 1 | 0 | 3000 | 0 | 0 | 0 | 0 | - | - | 16.0 | yes | yes | 0 | 0 | 58 |
| g05-luis-approval-note | no | content | final | no | 1 | 0 | 3104 | 0 | 0 | 0 | 0 | - | - | 31.3 | yes | no | 0 | 0 | 60 |
| g06-kenji-shipping | no | content | final | no | 2 | 0 | 3443 | 0 | 0 | 0 | 0 | - | - | 30.3 | yes | yes | 0 | 0 | 64 |
| g07-depot-release | no | none | none | no | 2 | 0 | 3608 | 0 | 2 | 0 | 0 | - | - | 322.6 | yes | no | 0 | 0 | 68 |
| g08-halvorsen-credit | yes | content | final | yes | 2 | 0 | 3804 | 0 | 0 | 0 | 0 | - | - | 37.2 | yes | yes | 0 | 0 | 72 |
| g09-kenji-gift-note | yes | content | final | yes | 2 | 0 | 4373 | 0 | 0 | 0 | 0 | - | - | 33.5 | yes | no | 0 | 0 | 76 |
| g10-sigrid-callback | yes | content | answered | yes | 7 | 1 | 6729 | 0 | 0 | 0 | 0 | - | - | 108.1 | yes | yes | 0 | 0 | 91 |
