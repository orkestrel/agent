# Larkspur Home support desk: ledger

mode ledger, model qwen3.5:2b-q4_K_M, think off, reply terminal, judge mica (num_ctx 4096), categories choice, budget 0.7, tail 0.35, ctx 3072, profile roundA, gate deny, horizon 3, date off, tail-answers keep, rules roundA, handles roundA, cache roundA, autopin roundA, report roundA, arm-tools all, tally roundA, request-questions all, scenario /home/user/agent/tmp/bench3/scenario.json.pre-refine, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95. Seed pass: 1 questions, 36.5 s. Passed 7 of 10; ok any 7 of 10. Reply via: final 6, answered 0, held 4, tool 0, reminded 0, content 0, none 0. Lookup repeats 0. Goal facts at entry: 18 of 18 slots; goal facts plus the date line: 18 of 19 slots.

| goal | success | answer | reply via | ok any | turns | lookup repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view | briefing recall | briefing precision | stale | judge questions | pins model/loop | denials |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | reply | held | yes | 4 | 0 | 2419 | 0 | 0 | 0 | 7 | 20/55 | - | 61.5 | yes | yes | 0 | 0 | 56 | 1 | 0.222 | 0 | 7 (0 pairs) | 0/1 | 1 |
| g02-luis-card | yes | reply | held | yes | 4 | 0 | 2219 | 0 | 0 | 0 | 7 | 18/61 | - | 59.4 | yes | yes | 0 | 0 | 64 | 1 | 0.111 | 0 | 7 (0 pairs) | 0/1 | 1 |
| g03-grace-escalation | yes | reply | final | yes | 7 | 0 | 2869 | 0 | 0 | 0 | 7 | 13/65 | - | 78.3 | yes | no | 0 | 0 | 78 | 1 | 0.25 | 0 | 7 (0 pairs) | 0/0 | 0 |
| g04-halvorsen-ticket | yes | reply | final | yes | 3 | 0 | 2399 | 0 | 0 | 0 | 7 | 8/79 | - | 46.0 | yes | yes | 0 | 0 | 84 | 1 | 0.2 | 0 | 7 (0 pairs) | 0/2 | 0 |
| g05-luis-approval-note | yes | reply | final | yes | 5 | 0 | 2586 | 0 | 0 | 0 | 7 | 9/85 | - | 76.2 | yes | no | 0 | 0 | 94 | 1 | 0.2 | 0 | 7 (0 pairs) | 0/0 | 0 |
| g06-kenji-shipping | no | reply | held | no | 5 | 0 | 2452 | 0 | 0 | 0 | 7 | 11/101 | - | 98.6 | yes | yes | 0 | 0 | 104 | 1 | 0.111 | 0 | 7 (0 pairs) | 0/1 | 1 |
| g07-depot-release | no | reply | final | no | 2 | 0 | 2387 | 0 | 0 | 0 | 7 | 5/105 | - | 52.8 | yes | no | 0 | 0 | 108 | 1 | 0.167 | 0 | 7 (0 pairs) | 0/0 | 0 |
| g08-halvorsen-credit | yes | reply | held | yes | 4 | 0 | 2368 | 0 | 0 | 0 | 7 | 7/113 | - | 77.5 | yes | yes | 0 | 0 | 116 | 1 | 0.1 | 0 | 7 (0 pairs) | 0/1 | 1 |
| g09-kenji-gift-note | yes | reply | final | yes | 2 | 0 | 2112 | 0 | 0 | 0 | 7 | 6/117 | - | 43.8 | yes | no | 0 | 0 | 120 | 1 | 0 | 0 | 7 (0 pairs) | 0/0 | 0 |
| g10-sigrid-callback | no | reply | final | no | 2 | 0 | 2444 | 0 | 0 | 0 | 7 | 7/121 | - | 47.7 | yes | yes | 0 | 0 | 124 | 1 | 0.091 | 0 | 7 (0 pairs) | 0/0 | 0 |
