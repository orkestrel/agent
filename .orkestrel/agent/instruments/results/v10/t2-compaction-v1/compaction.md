# Larkspur Home support desk: compaction

mode compaction, scenario /home/user/agent/tmp/bench/variants/v1.json, model qwen3.5:2b-q4_K_M, think on, window 1600, keep 6, sections 3, summary tuned, summary model qwen3.5:2b-q4_K_M, progressive true, ctx 4096, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95, search words, reply terminal, tools 266 (window 335). Passed 4 of 10; ok any 4 of 10; reply skips 0; reply via final 8, answered 0, tool 0, reminded 0, content 0, none 2; repeats 1; selection faults 0; judge ok 0, judge errors 0. Think cut 1 of 28 agent calls; thinking 21076 characters. Seed folds [25, 13]; goal folds 11 [-; 6, 2; 2, 2; 4; 6, 8; -; 9; 6; 4; 4].

| goal | success | answer | reply via | ok any | turns | repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | content | final | yes | 1 | 0 | 1865 | 0 | 0 | 0 | 0 | - | - | 32.4 | yes | no | 0 | 2 | 14 |
| g02-luis-card | yes | content | final | yes | 2 | 0 | 1858 | 0 | 0 | 0 | 0 | - | - | 180.0 | no | yes | 4 | 3 | 11 |
| g03-grace-escalation | no | content | final | no | 3 | 0 | 2048 | 0 | 0 | 0 | 0 | - | - | 340.9 | no | yes | 6 | 3 | 13 |
| g04-halvorsen-ticket | yes | content | final | yes | 4 | 0 | 2699 | 0 | 0 | 0 | 0 | - | - | 161.9 | no | yes | 3 | 3 | 17 |
| g05-luis-approval-note | no | none | none | no | 4 | 1 | 2919 | 0 | 1 | 0 | 0 | - | - | 407.2 | no | yes | 5 | 3 | 12 |
| g06-kenji-shipping | no | content | final | no | 3 | 0 | 2741 | 0 | 0 | 0 | 0 | - | - | 114.8 | no | yes | 0 | 3 | 18 |
| g07-depot-release | no | content | final | no | 2 | 0 | 3046 | 0 | 0 | 0 | 0 | - | - | 147.4 | no | no | 2 | 3 | 13 |
| g08-halvorsen-credit | yes | content | final | yes | 2 | 0 | 3396 | 0 | 0 | 0 | 0 | - | - | 173.0 | no | yes | 3 | 3 | 11 |
| g09-kenji-gift-note | no | content | final | no | 2 | 0 | 3161 | 0 | 0 | 0 | 0 | - | - | 209.3 | no | no | 4 | 3 | 11 |
| g10-sigrid-callback | no (overflow) | none | none | no (overflow) | 5 | 0 | 4425 | 1 | 0 | 0 | 0 | - | - | 187.4 | no | yes | 3 | 3 | 16 |
