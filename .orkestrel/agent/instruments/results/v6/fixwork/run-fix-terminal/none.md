# Larkspur Home support desk: none

mode none, ctx 6144, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95, search words, reply terminal, tools 266. Passed 5 of 10; ok any 5 of 10; reply skips 0; reply via final 8, answered 1, tool 0, reminded 0, content 0, none 1; repeats 7; selection faults 0; judge ok 0, judge errors 0.

| goal | success | answer | reply via | ok any | turns | repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | content | final | yes | 2 | 0 | 100 | 0 | 0 | 0 | 0 | - | - | 0.1 | yes | yes | 0 | 0 | 52 |
| g02-luis-card | yes | content | final | yes | 2 | 0 | 100 | 0 | 0 | 0 | 0 | - | - | 0.0 | yes | yes | 0 | 0 | 56 |
| g03-grace-escalation | yes | content | final | yes | 2 | 0 | 100 | 0 | 0 | 0 | 0 | - | - | 0.0 | yes | yes | 0 | 0 | 60 |
| g04-halvorsen-ticket | yes | content | final | yes | 2 | 0 | 100 | 0 | 0 | 0 | 0 | - | - | 0.0 | yes | yes | 0 | 0 | 64 |
| g05-luis-approval-note | no | content | final | no | 1 | 0 | 100 | 0 | 0 | 0 | 0 | - | - | 0.0 | yes | no | 0 | 0 | 66 |
| g06-kenji-shipping | no | content | final | no | 2 | 0 | 100 | 0 | 0 | 0 | 0 | - | - | 0.0 | yes | yes | 0 | 0 | 70 |
| g07-depot-release | no | content | answered | no | 9 | 7 | 100 | 0 | 0 | 0 | 0 | - | - | 0.0 | yes | yes | 0 | 0 | 89 |
| g08-halvorsen-credit | yes | content | final | yes | 2 | 0 | 100 | 0 | 0 | 0 | 0 | - | - | 0.0 | yes | yes | 0 | 0 | 93 |
| g09-kenji-gift-note | no | content | final | no | 2 | 0 | 100 | 0 | 0 | 0 | 0 | - | - | 0.0 | yes | yes | 0 | 0 | 97 |
| g10-sigrid-callback | no (overflow) | none | none | no (overflow) | 2 | 0 | 6475 | 1 | 0 | 0 | 0 | - | - | 0.0 | yes | yes | 0 | 0 | 100 |
