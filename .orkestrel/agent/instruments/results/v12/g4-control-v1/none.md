# Larkspur Home support desk: none

mode none, scenario /home/user/scaffold/.orkestrel/agent/instruments/harness/bench/variants/v1.json, model gemma4:e4b-it-q4_K_M, think off, ctx 6144, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95, search words, reply terminal, tools 266. Passed 9 of 10; ok any 9 of 10; reply skips 0; reply via final 10, answered 0, tool 0, reminded 0, content 0, none 0; repeats 0; selection faults 0; judge ok 0, judge errors 0.

| goal | success | answer | reply via | ok any | turns | repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | content | final | yes | 2 | 0 | 2346 | 0 | 0 | 0 | 0 | - | - | 70.8 | yes | yes | 0 | 0 | 52 |
| g02-luis-card | yes | content | final | yes | 2 | 0 | 2519 | 0 | 0 | 0 | 0 | - | - | 11.5 | yes | yes | 0 | 0 | 56 |
| g03-grace-escalation | yes | content | final | yes | 2 | 0 | 2925 | 0 | 0 | 0 | 0 | - | - | 37.9 | yes | no | 0 | 0 | 60 |
| g04-halvorsen-ticket | yes | content | final | yes | 2 | 0 | 3513 | 0 | 0 | 0 | 0 | - | - | 16.9 | yes | yes | 0 | 0 | 64 |
| g05-luis-approval-note | yes | content | final | yes | 1 | 0 | 3573 | 0 | 0 | 0 | 0 | - | - | 46.4 | yes | no | 0 | 0 | 66 |
| g06-kenji-shipping | no | content | final | no | 2 | 0 | 3941 | 0 | 0 | 0 | 0 | - | - | 43.5 | yes | no | 0 | 0 | 70 |
| g07-depot-release | yes | content | final | yes | 1 | 0 | 4132 | 0 | 0 | 0 | 0 | - | - | 23.6 | yes | no | 0 | 0 | 72 |
| g08-halvorsen-credit | yes | content | final | yes | 2 | 0 | 4384 | 0 | 0 | 0 | 0 | - | - | 18.8 | yes | yes | 0 | 0 | 76 |
| g09-kenji-gift-note | yes | content | final | yes | 1 | 0 | 4486 | 0 | 0 | 0 | 0 | - | - | 8.0 | yes | no | 0 | 0 | 78 |
| g10-sigrid-callback | yes | content | final | yes | 2 | 0 | 4962 | 0 | 0 | 0 | 0 | - | - | 19.0 | yes | yes | 0 | 0 | 82 |
