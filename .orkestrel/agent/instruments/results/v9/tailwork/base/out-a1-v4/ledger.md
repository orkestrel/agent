# Larkspur Home support desk: ledger

mode ledger, model qwen3.5:2b-q4_K_M, think off, reply terminal, judge mica (num_ctx 4096), categories choice, budget 0.7, tail 0.35, ctx 3072, profile roundA, gate deny, horizon 3, date off, tail-answers keep, rules roundA, handles roundA, cache roundA, autopin roundA, report roundA, arm-tools all, tally roundA, request-questions all, scenario /home/user/agent/tmp/bench/variants/ledger/v4.json, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95. Seed pass: 1 questions, 0.1 s. Passed 6 of 10; ok any 6 of 10. Reply via: final 3, answered 0, held 6, tool 0, reminded 0, content 0, none 1. Lookup repeats 0. Goal facts at entry: 18 of 18 slots; goal facts plus the date line: 18 of 19 slots.

| goal | success | answer | reply via | ok any | turns | lookup repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view | briefing recall | briefing precision | stale | judge questions | pins model/loop | denials |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | reply | held | yes | 7 | 0 | 2335 | 0 | 0 | 0 | 7 | 24/59 | - | 0.1 | yes | yes | 0 | 0 | 62 | 1 | 0.222 | 0 | 7 (0 pairs) | 0/1 | 1 |
| g02-luis-card | yes | reply | held | yes | 4 | 0 | 2221 | 0 | 0 | 0 | 7 | 19/67 | - | 0.1 | yes | yes | 0 | 0 | 70 | 1 | 0.111 | 0 | 7 (0 pairs) | 0/1 | 1 |
| g03-grace-escalation | no | none | none | no | 9 | 0 | 2551 | 0 | 0 | 0 | 7 | 14/71 | - | 0.1 | yes | yes | 0 | 0 | 88 | 1 | 0.273 | 0 | 7 (0 pairs) | 0/2 | 0 |
| g04-halvorsen-ticket | yes | reply | final | yes | 2 | 0 | 2377 | 0 | 0 | 0 | 7 | 13/89 | - | 0.1 | yes | yes | 0 | 0 | 92 | 1 | 0.2 | 0 | 7 (0 pairs) | 0/2 | 0 |
| g05-luis-approval-note | no | reply | final | no | 5 | 0 | 2778 | 0 | 0 | 0 | 7 | 13/93 | - | 0.1 | yes | no | 0 | 0 | 102 | 1 | 0.2 | 0 | 7 (0 pairs) | 0/0 | 0 |
| g06-kenji-shipping | no | reply | held | no | 4 | 0 | 2490 | 0 | 0 | 0 | 7 | 13/107 | - | 0.1 | yes | yes | 0 | 0 | 110 | 1 | 0.111 | 0 | 7 (0 pairs) | 0/2 | 1 |
| g07-depot-release | yes | reply | held | yes | 4 | 0 | 2599 | 0 | 0 | 0 | 7 | 11/115 | - | 0.1 | yes | yes | 0 | 0 | 118 | 1 | 0.167 | 0 | 7 (0 pairs) | 0/1 | 1 |
| g08-halvorsen-credit | yes | reply | held | yes | 3 | 0 | 2361 | 0 | 0 | 0 | 7 | 10/123 | - | 0.1 | yes | yes | 0 | 0 | 124 | 1 | 0.1 | 0 | 7 (0 pairs) | 0/1 | 1 |
| g09-kenji-gift-note | yes | reply | final | yes | 2 | 0 | 2189 | 0 | 0 | 0 | 7 | 8/125 | - | 0.1 | yes | no | 0 | 0 | 128 | 1 | 0 | 0 | 7 (0 pairs) | 0/0 | 0 |
| g10-sigrid-callback | no | reply | held | no | 4 | 0 | 2448 | 0 | 0 | 0 | 7 | 12/133 | - | 0.1 | yes | yes | 0 | 0 | 136 | 1 | 0.1 | 0 | 7 (0 pairs) | 0/1 | 1 |
