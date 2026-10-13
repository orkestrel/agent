# Larkspur Home support desk: ledger

mode ledger, model gemma4:e4b-it-q4_K_M, think off, reply terminal, judge mica (num_ctx 4096), categories choice, budget 0.7, tail 0.35, ctx 3072, profile refined, gate admit, horizon 99, date on, tail-answers drop, tail-requests drop, rules last, handles bare, cache stable, autopin named, report full, arm-tools recall, tally off, request-questions topics, answer-cue on, recall-budget 2, repeat-stop all, answer-view collapsed, recall-split on, recall-category off, records on, scenario /home/user/scaffold/.orkestrel/agent/instruments/harness/bench/variants/ledger/v8.json, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95. Seed pass: 1 questions, 93.4 s. Passed 9 of 10; ok any 9 of 10. Reply via: final 10, answered 0, held 0, tool 0, reminded 0, content 0, none 0. Lookup repeats 0. Goal facts at entry: 18 of 18 slots; goal facts plus the date line: 19 of 19 slots.

| goal | success | answer | reply via | ok any | turns | lookup repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view | briefing recall | briefing precision | stale | judge questions | pins model/loop | denials |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | reply | final | yes | 2 | 0 | 1468 | 0 | 0 | 0 | 5 | 20/49 | - | 55.1 | yes | yes | 0 | 0 | 52 | 1 | 0.286 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g02-luis-card | yes | reply | final | yes | 2 | 0 | 1461 | 0 | 0 | 0 | 5 | 20/53 | - | 44.9 | yes | yes | 0 | 0 | 56 | 1 | 0.143 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g03-grace-escalation | yes | reply | final | yes | 3 | 0 | 1834 | 0 | 0 | 0 | 5 | 20/57 | - | 74.5 | yes | yes | 0 | 0 | 62 | 1 | 0.375 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g04-halvorsen-ticket | yes | reply | final | yes | 2 | 0 | 1785 | 0 | 0 | 0 | 5 | 20/63 | - | 48.1 | yes | yes | 0 | 0 | 66 | 1 | 0.25 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g05-luis-approval-note | yes | reply | final | yes | 3 | 0 | 1620 | 0 | 0 | 0 | 5 | 20/67 | - | 72.0 | yes | yes | 0 | 0 | 72 | 1 | 0.25 | 0 | 5 (0 pairs) | 0/2 | 0 |
| g06-kenji-shipping | no | reply | final | no | 2 | 0 | 1459 | 0 | 0 | 0 | 5 | 20/73 | - | 55.2 | yes | yes | 0 | 0 | 76 | 1 | 0.125 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g07-depot-release | yes | reply | final | yes | 2 | 0 | 1780 | 0 | 0 | 0 | 5 | 20/77 | - | 60.2 | yes | yes | 0 | 0 | 80 | 1 | 0.25 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g08-halvorsen-credit | yes | reply | final | yes | 2 | 0 | 1557 | 0 | 0 | 0 | 5 | 20/81 | - | 50.7 | yes | yes | 0 | 0 | 84 | 1 | 0.125 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g09-kenji-gift-note | yes | reply | final | yes | 2 | 0 | 1546 | 0 | 0 | 0 | 5 | 20/85 | - | 43.1 | yes | yes | 0 | 0 | 88 | 1 | 0 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g10-sigrid-callback | yes | reply | final | yes | 2 | 0 | 1908 | 0 | 0 | 0 | 5 | 20/89 | - | 50.7 | yes | yes | 0 | 0 | 92 | 1 | 0.111 | 0 | 5 (0 pairs) | 0/0 | 0 |
