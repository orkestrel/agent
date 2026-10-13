# Larkspur Home support desk: ledger

mode ledger, model qwen3.5:4b-q4_K_M, think off, reply terminal, judge mica (num_ctx 4096), categories choice, budget 0.7, tail 0.35, ctx 3072, profile refined, gate admit, horizon 99, date on, tail-answers drop, tail-requests drop, rules last, handles bare, cache stable, autopin named, report full, arm-tools recall, tally off, request-questions topics, answer-cue on, recall-budget 2, repeat-stop all, answer-view collapsed, recall-split on, recall-category off, records on, scenario /home/user/agent/tmp/bench/variants/ledger/v6.json, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95. Seed pass: 1 questions, 77.7 s. Passed 9 of 10; ok any 9 of 10. Reply via: final 10, answered 0, held 0, tool 0, reminded 0, content 0, none 0. Lookup repeats 0. Goal facts at entry: 18 of 18 slots; goal facts plus the date line: 19 of 19 slots.

| goal | success | answer | reply via | ok any | turns | lookup repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view | briefing recall | briefing precision | stale | judge questions | pins model/loop | denials |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | reply | final | yes | 2 | 0 | 1761 | 0 | 0 | 0 | 5 | 16/49 | - | 58.6 | yes | yes | 0 | 0 | 52 | 1 | 0.286 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g02-luis-card | yes | reply | final | yes | 2 | 0 | 1635 | 0 | 0 | 0 | 5 | 16/53 | - | 51.1 | yes | yes | 0 | 0 | 56 | 1 | 0.143 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g03-grace-escalation | yes | reply | final | yes | 2 | 0 | 2312 | 0 | 0 | 0 | 5 | 16/57 | - | 80.6 | yes | yes | 0 | 0 | 61 | 1 | 0.375 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g04-halvorsen-ticket | yes | reply | final | yes | 2 | 0 | 1973 | 0 | 0 | 0 | 5 | 16/62 | - | 55.1 | yes | yes | 0 | 0 | 65 | 1 | 0.25 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g05-luis-approval-note | yes | reply | final | yes | 2 | 0 | 1866 | 0 | 0 | 0 | 5 | 16/66 | - | 80.7 | yes | yes | 0 | 0 | 69 | 1 | 0.375 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g06-kenji-shipping | no | reply | final | no | 2 | 0 | 1636 | 0 | 0 | 1 | 5 | 16/70 | - | 76.4 | yes | yes | 0 | 0 | 73 | 1 | 0.125 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g07-depot-release | yes | reply | final | yes | 1 | 0 | 1623 | 0 | 0 | 0 | 5 | 16/74 | - | 66.2 | yes | yes | 0 | 0 | 75 | 1 | 0.25 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g08-halvorsen-credit | yes | reply | final | yes | 2 | 0 | 1738 | 0 | 0 | 0 | 5 | 16/76 | - | 94.6 | yes | yes | 0 | 0 | 79 | 1 | 0.125 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g09-kenji-gift-note | yes | reply | final | yes | 2 | 0 | 1726 | 0 | 0 | 0 | 5 | 16/80 | - | 66.9 | yes | yes | 0 | 0 | 83 | 1 | 0 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g10-sigrid-callback | yes | reply | final | yes | 2 | 0 | 1771 | 0 | 0 | 0 | 5 | 16/84 | - | 59.9 | yes | yes | 0 | 0 | 87 | 1 | 0.111 | 0 | 5 (0 pairs) | 0/0 | 0 |
