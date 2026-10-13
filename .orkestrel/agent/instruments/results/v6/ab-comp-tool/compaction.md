# Larkspur Home support desk: compaction

mode compaction, window 1600, keep 6, sections 3, summary tuned, progressive true, ctx 3072, search words, reply tool, tools 335. Passed 3 of 10; ok any 3 of 10; reply skips 0; reply via final 0, answered 0, tool 8, reminded 2, content 0, none 0; selection faults 0; judge ok 0, judge errors 0. Seed folds [25]; goal folds 4 [19; -; -; 13; -; -; 12; -; -; 8].

| goal | success | answer | reply via | ok any | turns | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | reply | reminded | yes | 2 | 1912 | 0 | 0 | 0 | 0 | - | - | 40.9 | yes | yes | 2 | 2 | 11 |
| g02-luis-card | no | reply | reminded | no | 3 | 1766 | 0 | 0 | 0 | 0 | - | - | 10.3 | no | yes | 0 | 2 | 18 |
| g03-grace-escalation | yes | reply | tool | yes | 1 | 1885 | 0 | 0 | 0 | 0 | - | - | 10.0 | no | yes | 0 | 2 | 21 |
| g04-halvorsen-ticket | no | reply | tool | no | 1 | 1510 | 0 | 0 | 0 | 0 | - | - | 15.4 | no | yes | 2 | 3 | 12 |
| g05-luis-approval-note | no | reply | tool | no | 1 | 1620 | 0 | 0 | 0 | 0 | - | - | 7.8 | no | yes | 0 | 3 | 15 |
| g06-kenji-shipping | no | reply | tool | no | 2 | 1904 | 0 | 0 | 0 | 0 | - | - | 12.5 | no | yes | 0 | 3 | 20 |
| g07-depot-release | no | reply | tool | no | 1 | 1553 | 0 | 0 | 0 | 0 | - | - | 60.0 | no | yes | 4 | 3 | 11 |
| g08-halvorsen-credit | no | reply | tool | no | 2 | 1823 | 0 | 0 | 0 | 0 | - | - | 10.8 | no | yes | 0 | 3 | 16 |
| g09-kenji-gift-note | yes | reply | tool | yes | 1 | 1965 | 0 | 0 | 0 | 0 | - | - | 8.1 | no | no | 0 | 3 | 19 |
| g10-sigrid-callback | no | reply | tool | no | 1 | 1684 | 0 | 0 | 0 | 0 | - | - | 62.6 | no | no | 4 | 3 | 14 |
