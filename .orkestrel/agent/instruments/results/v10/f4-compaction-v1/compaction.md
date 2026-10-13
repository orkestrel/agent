# Larkspur Home support desk: compaction

mode compaction, scenario /home/user/agent/tmp/bench/variants/v1.json, model qwen3.5:4b-q4_K_M, think off, window 1600, keep 6, sections 3, summary tuned, summary model qwen3.5:4b-q4_K_M, progressive true, ctx 3072, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95, search words, reply terminal, tools 266 (window 335). Passed 6 of 10; ok any 6 of 10; reply skips 0; reply via final 10, answered 0, tool 0, reminded 0, content 0, none 0; repeats 0; selection faults 0; judge ok 0, judge errors 0. Seed folds [25, 15]; goal folds 10 [-; 6, 2; 4; 4; -; 5; 4; 2; 4, 2; 4].

| goal | success | answer | reply via | ok any | turns | repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | content | final | yes | 2 | 0 | 1930 | 0 | 0 | 0 | 0 | - | - | 35.1 | yes | yes | 0 | 2 | 14 |
| g02-luis-card | yes | content | final | yes | 2 | 0 | 1955 | 0 | 0 | 0 | 0 | - | - | 300.5 | no | yes | 4 | 3 | 11 |
| g03-grace-escalation | no | content | final | no | 2 | 0 | 2057 | 0 | 0 | 0 | 0 | - | - | 339.8 | no | yes | 5 | 3 | 12 |
| g04-halvorsen-ticket | yes | content | final | yes | 2 | 0 | 2668 | 0 | 0 | 0 | 0 | - | - | 181.4 | no | yes | 2 | 3 | 12 |
| g05-luis-approval-note | no | content | final | no | 1 | 0 | 2745 | 0 | 0 | 0 | 0 | - | - | 27.4 | no | no | 0 | 3 | 14 |
| g06-kenji-shipping | no | content | final | no | 2 | 0 | 2747 | 0 | 0 | 0 | 0 | - | - | 210.6 | no | yes | 2 | 3 | 13 |
| g07-depot-release | yes | content | final | yes | 1 | 0 | 2618 | 0 | 0 | 0 | 0 | - | - | 249.0 | no | no | 2 | 3 | 11 |
| g08-halvorsen-credit | yes | content | final | yes | 2 | 0 | 2599 | 0 | 0 | 0 | 0 | - | - | 291.9 | no | yes | 3 | 3 | 13 |
| g09-kenji-gift-note | yes | content | final | yes | 2 | 0 | 2501 | 0 | 0 | 0 | 0 | - | - | 397.2 | no | no | 4 | 3 | 11 |
| g10-sigrid-callback | no | content | final | no | 2 | 0 | 2611 | 0 | 0 | 0 | 0 | - | - | 373.4 | no | no | 3 | 3 | 11 |
