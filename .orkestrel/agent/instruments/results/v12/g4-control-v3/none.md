# Larkspur Home support desk: none

mode none, scenario /home/user/scaffold/.orkestrel/agent/instruments/harness/bench/variants/v3.json, model gemma4:e4b-it-q4_K_M, think off, ctx 6144, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95, search words, reply terminal, tools 266. Passed 9 of 10; ok any 9 of 10; reply skips 0; reply via final 10, answered 0, tool 0, reminded 0, content 0, none 0; repeats 0; selection faults 0; judge ok 0, judge errors 0.

| goal | success | answer | reply via | ok any | turns | repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | content | final | yes | 1 | 0 | 2257 | 0 | 0 | 0 | 0 | - | - | 63.6 | yes | no | 0 | 0 | 50 |
| g02-luis-card | yes | content | final | yes | 2 | 0 | 2425 | 0 | 0 | 0 | 0 | - | - | 11.3 | yes | yes | 0 | 0 | 54 |
| g03-grace-escalation | yes | content | final | yes | 2 | 0 | 2840 | 0 | 0 | 0 | 0 | - | - | 32.0 | yes | no | 0 | 0 | 58 |
| g04-halvorsen-ticket | yes | content | final | yes | 2 | 0 | 3372 | 0 | 0 | 0 | 0 | - | - | 17.9 | yes | yes | 0 | 0 | 62 |
| g05-luis-approval-note | yes | content | final | yes | 1 | 0 | 3443 | 0 | 0 | 0 | 0 | - | - | 30.5 | yes | no | 0 | 0 | 64 |
| g06-kenji-shipping | no | content | final | no | 2 | 0 | 3761 | 0 | 0 | 0 | 0 | - | - | 24.2 | yes | yes | 0 | 0 | 68 |
| g07-depot-release | yes | content | final | yes | 1 | 0 | 3904 | 0 | 0 | 0 | 0 | - | - | 17.3 | yes | no | 0 | 0 | 70 |
| g08-halvorsen-credit | yes | content | final | yes | 2 | 0 | 4135 | 0 | 0 | 0 | 0 | - | - | 16.8 | yes | yes | 0 | 0 | 74 |
| g09-kenji-gift-note | yes | content | final | yes | 1 | 0 | 4240 | 0 | 0 | 0 | 0 | - | - | 7.0 | yes | no | 0 | 0 | 76 |
| g10-sigrid-callback | yes | content | final | yes | 1 | 0 | 4310 | 0 | 0 | 0 | 0 | - | - | 9.4 | yes | yes | 0 | 0 | 78 |
