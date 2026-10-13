# Larkspur Home support desk: compaction

mode compaction, window 1600, keep 6, sections 3, summary tuned, progressive true, ctx 3072, search words, reply terminal, tools 266. Passed 7 of 10; ok any 7 of 10; reply skips 0; reply via final 10, answered 0, tool 0, reminded 0, content 0, none 0; selection faults 0; judge ok 0, judge errors 0. Seed folds [29]; goal folds 8 [-; -; 21; 4; 6; 10; 8; 4; 4; 4].

| goal | success | answer | reply via | ok any | turns | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | content | final | yes | 1 | 1740 | 0 | 0 | 0 | 0 | - | - | 11.6 | yes | yes | 0 | 1 | 22 |
| g02-luis-card | yes | content | final | yes | 2 | 1914 | 0 | 0 | 0 | 0 | - | - | 5.1 | yes | yes | 0 | 1 | 26 |
| g03-grace-escalation | yes | content | final | yes | 3 | 1982 | 0 | 0 | 0 | 0 | - | - | 53.6 | no | yes | 1 | 2 | 12 |
| g04-halvorsen-ticket | yes | content | final | yes | 5 | 2689 | 0 | 0 | 0 | 0 | - | - | 42.5 | no | yes | 2 | 3 | 19 |
| g05-luis-approval-note | no | content | final | no | 4 | 2690 | 0 | 0 | 0 | 0 | - | - | 99.7 | no | yes | 4 | 3 | 21 |
| g06-kenji-shipping | no | content | final | no | 2 | 2070 | 0 | 0 | 0 | 0 | - | - | 108.6 | no | yes | 4 | 3 | 15 |
| g07-depot-release | yes | content | final | yes | 2 | 2288 | 0 | 0 | 0 | 0 | - | - | 96.2 | no | yes | 4 | 3 | 11 |
| g08-halvorsen-credit | no | content | final | no | 2 | 2031 | 0 | 0 | 0 | 0 | - | - | 87.1 | no | yes | 4 | 3 | 11 |
| g09-kenji-gift-note | yes | content | final | yes | 2 | 2477 | 0 | 0 | 0 | 0 | - | - | 88.3 | no | yes | 4 | 3 | 11 |
| g10-sigrid-callback | yes | content | final | yes | 2 | 2727 | 0 | 0 | 0 | 0 | - | - | 99.1 | no | yes | 4 | 3 | 11 |
