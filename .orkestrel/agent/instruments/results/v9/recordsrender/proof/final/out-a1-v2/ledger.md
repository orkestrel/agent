# Larkspur Home support desk: ledger

mode ledger, model qwen3.5:2b-q4_K_M, think off, reply terminal, judge mica (num_ctx 4096), categories choice, budget 0.7, tail 0.35, ctx 3072, profile roundA, gate deny, horizon 3, date off, tail-answers keep, rules roundA, handles roundA, cache roundA, autopin roundA, report roundA, arm-tools all, tally roundA, request-questions all, scenario /home/user/agent/tmp/bench/variants/ledger/v2.json, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95. Seed pass: 1 questions, 0.1 s. Passed 6 of 10; ok any 6 of 10. Reply via: final 7, answered 0, held 3, tool 0, reminded 0, content 0, none 0. Lookup repeats 0. Goal facts at entry: 18 of 18 slots; goal facts plus the date line: 18 of 19 slots.

| goal | success | answer | reply via | ok any | turns | lookup repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view | briefing recall | briefing precision | stale | judge questions | pins model/loop | denials |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | reply | held | yes | 5 | 0 | 2686 | 0 | 0 | 0 | 7 | 20/55 | - | 0.1 | yes | yes | 0 | 0 | 58 | 1 | 0.222 | 0 | 7 (0 pairs) | 0/1 | 1 |
| g02-luis-card | yes | reply | held | yes | 4 | 0 | 2243 | 0 | 0 | 0 | 7 | 15/63 | - | 0.1 | yes | yes | 0 | 0 | 66 | 1 | 0.111 | 0 | 7 (0 pairs) | 0/1 | 1 |
| g03-grace-escalation | no | reply | final | no | 6 | 0 | 2711 | 0 | 0 | 0 | 7 | 12/67 | - | 0.1 | yes | yes | 0 | 0 | 78 | 1 | 0.273 | 2 | 7 (0 pairs) | 0/1 | 0 |
| g04-halvorsen-ticket | yes | reply | final | yes | 6 | 0 | 2542 | 0 | 0 | 0 | 7 | 8/79 | - | 0.0 | yes | yes | 0 | 0 | 90 | 1 | 0.2 | 0 | 7 (0 pairs) | 0/2 | 0 |
| g05-luis-approval-note | yes | reply | final | yes | 2 | 0 | 2148 | 0 | 0 | 0 | 7 | 8/91 | - | 0.0 | yes | no | 0 | 0 | 94 | 1 | 0.2 | 0 | 7 (0 pairs) | 0/0 | 0 |
| g06-kenji-shipping | no | reply | held | no | 5 | 0 | 2529 | 0 | 0 | 0 | 7 | 13/101 | - | 0.1 | yes | yes | 0 | 0 | 104 | 1 | 0.143 | 0 | 7 (0 pairs) | 0/1 | 1 |
| g07-depot-release | yes | reply | final | yes | 2 | 0 | 2437 | 0 | 0 | 0 | 7 | 5/105 | - | 0.1 | yes | no | 0 | 0 | 108 | 1 | 0.167 | 0 | 7 (0 pairs) | 0/2 | 0 |
| g08-halvorsen-credit | no | reply | final | no | 3 | 0 | 2041 | 0 | 0 | 0 | 7 | 3/109 | - | 0.1 | yes | yes | 0 | 0 | 114 | 1 | 0.1 | 0 | 7 (0 pairs) | 1/0 | 0 |
| g09-kenji-gift-note | yes | reply | final | yes | 2 | 0 | 2232 | 0 | 0 | 0 | 7 | 7/115 | - | 0.1 | yes | no | 0 | 0 | 118 | 1 | 0 | 0 | 7 (0 pairs) | 0/0 | 0 |
| g10-sigrid-callback | no | reply | final | no | 2 | 0 | 2425 | 0 | 0 | 0 | 7 | 7/119 | - | 0.0 | yes | yes | 0 | 0 | 122 | 1 | 0.091 | 0 | 7 (0 pairs) | 0/0 | 0 |
