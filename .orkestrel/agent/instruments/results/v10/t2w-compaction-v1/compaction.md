# Larkspur Home support desk: compaction

mode compaction, scenario /home/user/agent/tmp/bench/variants/v1.json, model qwen3.5:2b-q4_K_M, think on (cap 2048), window 1600, keep 6, sections 3, summary tuned, summary model qwen3.5:2b-q4_K_M, progressive true, ctx 5120, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95, search words, reply terminal, tools 266 (window 335). Passed 6 of 10; ok any 6 of 10; reply skips 0; reply via final 9, answered 1, tool 0, reminded 0, content 0, none 0; repeats 0; selection faults 0; judge ok 0, judge errors 0. Think cut 0 of 20 agent calls; thinking 14609 characters. Seed folds [25, 2, 2, 2, 2, 1, 4, 2]; goal folds 12 [4; 2, 2; 4; 4; -; 4; 4, 2; 4; 4, 2; 4].

| goal | success | answer | reply via | ok any | turns | repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | content | final | yes | 2 | 0 | 2604 | 0 | 0 | 0 | 0 | - | - | 337.2 | yes | yes | 4 | 3 | 11 |
| g02-luis-card | yes | content | final | yes | 2 | 0 | 2916 | 0 | 0 | 0 | 0 | - | - | 538.1 | no | yes | 5 | 3 | 11 |
| g03-grace-escalation | no | content | final | no | 2 | 0 | 2984 | 0 | 0 | 0 | 0 | - | - | 287.7 | no | yes | 3 | 3 | 11 |
| g04-halvorsen-ticket | yes | content | final | yes | 2 | 0 | 3273 | 0 | 0 | 0 | 0 | - | - | 277.7 | no | yes | 2 | 3 | 11 |
| g05-luis-approval-note | no | content | final | no | 1 | 0 | 3537 | 0 | 0 | 0 | 0 | - | - | 61.0 | no | no | 0 | 3 | 13 |
| g06-kenji-shipping | no | content | final | no | 2 | 0 | 3816 | 0 | 0 | 0 | 0 | - | - | 242.4 | yes | yes | 2 | 3 | 13 |
| g07-depot-release | yes | content | answered | yes | 3 | 0 | 3996 | 0 | 0 | 0 | 0 | - | - | 655.7 | no | yes | 7 | 3 | 13 |
| g08-halvorsen-credit | yes | content | final | yes | 2 | 0 | 3463 | 0 | 0 | 0 | 0 | - | - | 253.3 | yes | yes | 2 | 3 | 13 |
| g09-kenji-gift-note | no | content | final | no | 2 | 0 | 3677 | 0 | 0 | 0 | 0 | - | - | 380.3 | yes | no | 5 | 3 | 11 |
| g10-sigrid-callback | yes | content | final | yes | 2 | 0 | 3908 | 0 | 0 | 0 | 0 | - | - | 344.2 | yes | yes | 3 | 3 | 11 |
