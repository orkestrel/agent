# Larkspur Home support desk: ledger

mode ledger, model qwen3.5:2b-q4_K_M, think off, reply terminal, judge mica (num_ctx 4096), categories choice, budget 0.7, tail 0.35, ctx 3072, profile refined, gate admit, horizon 99, date on, tail-answers drop, rules last, handles bare, cache stable, autopin named, report full, arm-tools recall, tally off, request-questions topics, scenario /home/user/agent/tmp/bench3/scenario.json, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95. Seed pass: 1 questions, 0.1 s. Passed 7 of 10; ok any 7 of 10. Reply via: final 10, answered 0, held 0, tool 0, reminded 0, content 0, none 0. Lookup repeats 0. Goal facts at entry: 18 of 18 slots; goal facts plus the date line: 19 of 19 slots.

| goal | success | answer | reply via | ok any | turns | lookup repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view | briefing recall | briefing precision | stale | judge questions | pins model/loop | denials |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | reply | final | yes | 3 | 0 | 2319 | 0 | 0 | 0 | 5 | 11/49 | - | 0.1 | yes | yes | 0 | 0 | 54 | 1 | 0.222 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g02-luis-card | yes | reply | final | yes | 2 | 0 | 1950 | 0 | 0 | 0 | 5 | 8/55 | - | 0.0 | yes | yes | 0 | 0 | 58 | 1 | 0.111 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g03-grace-escalation | yes | reply | final | yes | 7 | 0 | 2869 | 0 | 0 | 0 | 5 | 9/59 | - | 0.1 | yes | yes | 0 | 0 | 72 | 1 | 0.3 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g04-halvorsen-ticket | yes | reply | final | yes | 3 | 0 | 2399 | 0 | 0 | 0 | 5 | 10/73 | - | 0.0 | yes | yes | 0 | 0 | 78 | 1 | 0.222 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g05-luis-approval-note | yes | reply | final | yes | 5 | 0 | 2586 | 0 | 0 | 0 | 5 | 9/79 | - | 0.0 | yes | yes | 0 | 0 | 88 | 1 | 0.2 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g06-kenji-shipping | no | reply | final | no | 3 | 0 | 2094 | 0 | 0 | 0 | 5 | 10/89 | - | 0.0 | yes | yes | 0 | 0 | 94 | 1 | 0.125 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g07-depot-release | no | reply | final | no | 2 | 0 | 2387 | 0 | 0 | 0 | 5 | 10/95 | - | 0.0 | yes | yes | 0 | 0 | 98 | 1 | 0.182 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g08-halvorsen-credit | yes | reply | final | yes | 2 | 0 | 1945 | 0 | 0 | 0 | 5 | 8/99 | - | 0.0 | yes | yes | 0 | 0 | 102 | 1 | 0.1 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g09-kenji-gift-note | yes | reply | final | yes | 2 | 0 | 2112 | 0 | 0 | 0 | 5 | 11/103 | - | 0.0 | yes | yes | 0 | 0 | 106 | 1 | 0 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g10-sigrid-callback | no | reply | final | no | 2 | 0 | 2444 | 0 | 0 | 0 | 5 | 11/107 | - | 0.0 | yes | yes | 0 | 0 | 110 | 1 | 0.083 | 0 | 5 (0 pairs) | 0/0 | 0 |
