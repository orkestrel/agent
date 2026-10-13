# Larkspur Home support desk: none

mode none, scenario /home/user/agent/tmp/bench/variants/v7.json, model qwen3.5:2b-q4_K_M, think off, ctx 6144, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95, search words, reply terminal, tools 266. Passed 7 of 10; ok any 7 of 10; reply skips 0; reply via final 9, answered 1, tool 0, reminded 0, content 0, none 0; repeats 1; selection faults 0; judge ok 0, judge errors 0.

| goal | success | answer | reply via | ok any | turns | repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | content | answered | yes | 4 | 1 | 2755 | 0 | 0 | 0 | 0 | - | - | 69.1 | yes | yes | 0 | 0 | 57 |
| g02-luis-card | yes | content | final | yes | 2 | 0 | 3097 | 0 | 0 | 0 | 0 | - | - | 23.2 | yes | yes | 0 | 0 | 61 |
| g03-grace-escalation | no | content | final | no | 2 | 0 | 3409 | 0 | 0 | 0 | 0 | - | - | 46.1 | yes | yes | 0 | 0 | 66 |
| g04-halvorsen-ticket | yes | content | final | yes | 2 | 0 | 3716 | 0 | 0 | 0 | 0 | - | - | 6.6 | yes | yes | 0 | 0 | 70 |
| g05-luis-approval-note | no | content | final | no | 1 | 0 | 3772 | 0 | 0 | 0 | 0 | - | - | 13.2 | yes | no | 0 | 0 | 72 |
| g06-kenji-shipping | yes | content | final | yes | 2 | 0 | 4119 | 0 | 0 | 0 | 0 | - | - | 12.0 | yes | yes | 0 | 0 | 76 |
| g07-depot-release | yes | content | final | yes | 1 | 0 | 4260 | 0 | 0 | 0 | 0 | - | - | 13.1 | yes | no | 0 | 0 | 78 |
| g08-halvorsen-credit | yes | content | final | yes | 2 | 0 | 4504 | 0 | 0 | 0 | 0 | - | - | 15.8 | yes | yes | 0 | 0 | 82 |
| g09-kenji-gift-note | yes | content | final | yes | 2 | 0 | 4763 | 0 | 0 | 0 | 0 | - | - | 10.1 | yes | yes | 0 | 0 | 86 |
| g10-sigrid-callback | no | content | final | no | 1 | 0 | 4875 | 0 | 0 | 0 | 0 | - | - | 6.8 | yes | yes | 0 | 0 | 88 |
