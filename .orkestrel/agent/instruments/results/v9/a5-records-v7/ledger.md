# Larkspur Home support desk: ledger

mode ledger, model qwen3.5:2b-q4_K_M, think off, reply terminal, judge mica (num_ctx 4096), categories choice, budget 0.7, tail 0.35, ctx 3072, profile refined, gate admit, horizon 99, date on, tail-answers drop, tail-requests drop, rules last, handles bare, cache stable, autopin named, report full, arm-tools recall, tally off, request-questions topics, answer-cue on, recall-budget 2, repeat-stop all, answer-view collapsed, recall-split on, recall-category off, records on, scenario /home/user/agent/tmp/bench/variants/ledger/v7.json, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95. Seed pass: 1 questions, 37.0 s. Passed 7 of 10; ok any 7 of 10. Reply via: final 8, answered 2, held 0, tool 0, reminded 0, content 0, none 0. Lookup repeats 0. Goal facts at entry: 18 of 18 slots; goal facts plus the date line: 19 of 19 slots.

| goal | success | answer | reply via | ok any | turns | lookup repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view | briefing recall | briefing precision | stale | judge questions | pins model/loop | denials |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | reply | final | yes | 3 | 0 | 1976 | 0 | 0 | 0 | 5 | 16/49 | - | 38.6 | yes | yes | 0 | 0 | 54 | 1 | 0.286 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g02-luis-card | yes | reply | final | yes | 2 | 0 | 1643 | 0 | 0 | 0 | 5 | 16/55 | - | 33.3 | yes | yes | 0 | 0 | 58 | 1 | 0.143 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g03-grace-escalation | yes | reply | final | yes | 2 | 0 | 2054 | 0 | 0 | 0 | 5 | 16/59 | - | 49.7 | yes | yes | 0 | 0 | 62 | 1 | 0.375 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g04-halvorsen-ticket | yes | reply | answered | yes | 4 | 0 | 2296 | 0 | 0 | 0 | 5 | 16/63 | - | 51.7 | yes | yes | 0 | 0 | 72 | 1 | 0.25 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g05-luis-approval-note | no | reply | final | no | 1 | 0 | 1593 | 0 | 0 | 0 | 5 | 16/73 | - | 48.1 | yes | yes | 0 | 0 | 74 | 1 | 0.25 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g06-kenji-shipping | no | reply | final | no | 2 | 0 | 1641 | 0 | 0 | 0 | 5 | 16/75 | - | 38.3 | yes | yes | 0 | 0 | 78 | 1 | 0.125 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g07-depot-release | yes | reply | answered | yes | 4 | 0 | 2398 | 0 | 0 | 0 | 5 | 16/79 | - | 56.9 | yes | yes | 0 | 0 | 88 | 1 | 0.25 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g08-halvorsen-credit | no | reply | final | no | 2 | 0 | 1741 | 0 | 0 | 0 | 5 | 16/89 | - | 37.2 | yes | yes | 0 | 0 | 92 | 1 | 0.125 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g09-kenji-gift-note | yes | reply | final | yes | 2 | 0 | 1738 | 0 | 0 | 0 | 5 | 16/93 | - | 33.8 | yes | yes | 0 | 0 | 96 | 1 | 0 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g10-sigrid-callback | yes | reply | final | yes | 1 | 0 | 1688 | 0 | 0 | 0 | 5 | 16/97 | - | 32.2 | yes | yes | 0 | 0 | 98 | 1 | 0.111 | 0 | 5 (0 pairs) | 0/0 | 0 |
