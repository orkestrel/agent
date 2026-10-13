# Larkspur Home support desk: none

mode none, scenario /home/user/agent/tmp/bench/variants/v3.json, model qwen3.5:2b-q4_K_M, think off, ctx 6144, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95, search words, reply terminal, tools 266. Passed 5 of 10; ok any 5 of 10; reply skips 0; reply via final 9, answered 1, tool 0, reminded 0, content 0, none 0; repeats 1; selection faults 0; judge ok 0, judge errors 0.

| goal | success | answer | reply via | ok any | turns | repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | content | final | yes | 3 | 0 | 2760 | 0 | 0 | 0 | 0 | - | - | 26.4 | yes | yes | 0 | 0 | 54 |
| g02-luis-card | yes | content | final | yes | 2 | 0 | 2935 | 0 | 0 | 0 | 0 | - | - | 5.4 | yes | yes | 0 | 0 | 58 |
| g03-grace-escalation | no | content | final | no | 2 | 0 | 3231 | 0 | 0 | 0 | 0 | - | - | 18.7 | yes | yes | 0 | 0 | 63 |
| g04-halvorsen-ticket | yes | content | answered | yes | 4 | 1 | 3687 | 0 | 0 | 0 | 0 | - | - | 41.3 | yes | yes | 0 | 0 | 72 |
| g05-luis-approval-note | no | content | final | no | 1 | 0 | 3978 | 0 | 0 | 0 | 0 | - | - | 17.4 | yes | no | 0 | 0 | 74 |
| g06-kenji-shipping | no | content | final | no | 2 | 0 | 4359 | 0 | 0 | 0 | 0 | - | - | 13.3 | yes | yes | 0 | 0 | 78 |
| g07-depot-release | no | content | final | no | 2 | 0 | 4652 | 0 | 0 | 0 | 0 | - | - | 18.4 | yes | yes | 0 | 0 | 82 |
| g08-halvorsen-credit | yes | content | final | yes | 2 | 0 | 5007 | 0 | 0 | 0 | 0 | - | - | 16.8 | yes | yes | 0 | 0 | 86 |
| g09-kenji-gift-note | yes | content | final | yes | 2 | 0 | 5334 | 0 | 0 | 0 | 0 | - | - | 10.4 | yes | yes | 0 | 0 | 90 |
| g10-sigrid-callback | no | content | final | no | 2 | 0 | 5560 | 0 | 0 | 0 | 0 | - | - | 6.9 | yes | yes | 0 | 0 | 94 |
