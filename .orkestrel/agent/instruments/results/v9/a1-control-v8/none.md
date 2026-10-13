# Larkspur Home support desk: none

mode none, scenario /home/user/agent/tmp/bench/variants/v8.json, model qwen3.5:2b-q4_K_M, think off, ctx 6144, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95, search words, reply terminal, tools 266. Passed 7 of 10; ok any 7 of 10; reply skips 0; reply via final 10, answered 0, tool 0, reminded 0, content 0, none 0; repeats 0; selection faults 0; judge ok 0, judge errors 0.

| goal | success | answer | reply via | ok any | turns | repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | content | final | yes | 1 | 0 | 2540 | 0 | 0 | 0 | 0 | - | - | 24.7 | yes | no | 0 | 0 | 50 |
| g02-luis-card | yes | content | final | yes | 2 | 0 | 2763 | 0 | 0 | 0 | 0 | - | - | 6.3 | yes | yes | 0 | 0 | 54 |
| g03-grace-escalation | no | content | final | no | 2 | 0 | 3067 | 0 | 0 | 0 | 0 | - | - | 32.2 | yes | yes | 0 | 0 | 59 |
| g04-halvorsen-ticket | yes | content | final | yes | 2 | 0 | 3570 | 0 | 0 | 0 | 0 | - | - | 8.3 | yes | yes | 0 | 0 | 63 |
| g05-luis-approval-note | no | content | final | no | 1 | 0 | 3643 | 0 | 0 | 0 | 0 | - | - | 23.1 | yes | no | 0 | 0 | 65 |
| g06-kenji-shipping | no | content | final | no | 2 | 0 | 4118 | 0 | 0 | 0 | 0 | - | - | 11.4 | yes | yes | 0 | 0 | 69 |
| g07-depot-release | yes | content | final | yes | 2 | 0 | 4605 | 0 | 0 | 0 | 0 | - | - | 16.9 | yes | no | 0 | 0 | 73 |
| g08-halvorsen-credit | yes | content | final | yes | 2 | 0 | 4862 | 0 | 0 | 0 | 0 | - | - | 11.3 | yes | yes | 0 | 0 | 77 |
| g09-kenji-gift-note | yes | content | final | yes | 1 | 0 | 4992 | 0 | 0 | 0 | 0 | - | - | 3.9 | yes | no | 0 | 0 | 79 |
| g10-sigrid-callback | yes | content | final | yes | 2 | 0 | 5570 | 0 | 0 | 0 | 0 | - | - | 12.6 | yes | yes | 0 | 0 | 83 |
