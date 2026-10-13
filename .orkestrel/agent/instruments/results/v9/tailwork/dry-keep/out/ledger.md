# Larkspur Home support desk: ledger

mode ledger, model qwen3.5:2b-q4_K_M, think off, reply terminal, judge mica (num_ctx 4096), categories choice, budget 0.7, tail 0.35, ctx 3072, profile refined, gate admit, horizon 99, date on, tail-answers drop, rules last, handles bare, cache stable, autopin named, report full, arm-tools recall, tally off, request-questions topics, answer-cue on, recall-budget 2, scenario /home/user/agent/tmp/bench/variants/ledger/v1.json, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95. Seed pass: 1 questions, 0.1 s. Passed 6 of 10; ok any 6 of 10. Reply via: final 9, answered 1, held 0, tool 0, reminded 0, content 0, none 0. Lookup repeats 0. Goal facts at entry: 18 of 18 slots; goal facts plus the date line: 19 of 19 slots.

| goal | success | answer | reply via | ok any | turns | lookup repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view | briefing recall | briefing precision | stale | judge questions | pins model/loop | denials |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | reply | final | yes | 3 | 0 | 2053 | 0 | 0 | 0 | 5 | 16/49 | - | 0.1 | yes | yes | 0 | 0 | 54 | 1 | 0.222 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g02-luis-card | yes | reply | final | yes | 2 | 0 | 1640 | 0 | 0 | 0 | 5 | 14/55 | - | 0.0 | yes | yes | 0 | 0 | 58 | 1 | 0.111 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g03-grace-escalation | no | reply | final | no | 6 | 0 | 2686 | 0 | 0 | 0 | 5 | 15/59 | - | 0.0 | yes | yes | 0 | 0 | 70 | 1 | 0.25 | 0 | 5 (0 pairs) | 0/2 | 0 |
| g04-halvorsen-ticket | yes | reply | final | yes | 3 | 0 | 2278 | 0 | 0 | 0 | 5 | 14/71 | - | 0.1 | yes | yes | 0 | 0 | 76 | 1 | 0.182 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g05-luis-approval-note | yes | reply | final | yes | 3 | 0 | 2089 | 0 | 0 | 0 | 5 | 15/77 | - | 0.1 | yes | yes | 0 | 0 | 82 | 1 | 0.2 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g06-kenji-shipping | no | reply | final | no | 2 | 0 | 1768 | 0 | 0 | 0 | 5 | 16/83 | - | 0.0 | yes | yes | 0 | 0 | 86 | 1 | 0.125 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g07-depot-release | yes | reply | final | yes | 2 | 0 | 1966 | 0 | 0 | 0 | 5 | 14/87 | - | 0.0 | yes | yes | 0 | 0 | 90 | 1 | 0.182 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g08-halvorsen-credit | no | reply | final | no | 3 | 0 | 2113 | 0 | 0 | 0 | 5 | 18/91 | - | 0.0 | yes | yes | 0 | 0 | 96 | 1 | 0.1 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g09-kenji-gift-note | yes | reply | answered | yes | 9 | 0 | 2425 | 0 | 0 | 0 | 5 | 18/97 | - | 0.1 | yes | yes | 0 | 0 | 115 | 1 | 0 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g10-sigrid-callback | no | reply | final | no | 2 | 0 | 2250 | 0 | 0 | 0 | 5 | 16/116 | - | 0.1 | yes | yes | 0 | 0 | 119 | 1 | 0.083 | 0 | 5 (0 pairs) | 0/0 | 0 |
