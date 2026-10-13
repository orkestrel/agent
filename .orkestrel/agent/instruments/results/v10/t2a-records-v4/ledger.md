# Larkspur Home support desk: ledger

mode ledger, model qwen3.5:2b-q4_K_M, think on (cap 2048), answer-think off, reply terminal, judge mica (num_ctx 4096), categories choice, budget 0.42, tail 0.35, ctx 5120, profile refined, gate admit, horizon 99, date on, tail-answers drop, tail-requests drop, rules last, handles bare, cache stable, autopin named, report full, arm-tools recall, tally off, request-questions topics, answer-cue on, recall-budget 2, repeat-stop all, answer-view collapsed, recall-split on, recall-category off, records on, scenario /home/user/agent/tmp/bench/variants/ledger/v4.json, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95. Seed pass: 1 questions, 39.2 s. Passed 8 of 10; ok any 8 of 10. Reply via: final 10, answered 0, held 0, tool 0, reminded 0, content 0, none 0. Lookup repeats 0. Goal facts at entry: 18 of 18 slots; goal facts plus the date line: 19 of 19 slots. Think cut 0 of 17 agent calls; thinking 10332 characters.

| goal | success | answer | reply via | ok any | turns | lookup repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view | briefing recall | briefing precision | stale | judge questions | pins model/loop | denials |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | reply | final | yes | 2 | 0 | 1734 | 0 | 0 | 0 | 5 | 16/49 | - | 56.9 | yes | yes | 0 | 0 | 52 | 1 | 0.286 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g02-luis-card | yes | reply | final | yes | 2 | 0 | 1638 | 0 | 0 | 0 | 5 | 16/53 | - | 46.9 | yes | yes | 0 | 0 | 56 | 1 | 0.143 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g03-grace-escalation | yes | reply | final | yes | 2 | 0 | 2009 | 0 | 0 | 0 | 5 | 16/57 | - | 121.9 | yes | yes | 0 | 0 | 60 | 1 | 0.375 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g04-halvorsen-ticket | yes | reply | final | yes | 2 | 0 | 1941 | 0 | 0 | 0 | 5 | 16/61 | - | 57.7 | yes | yes | 0 | 0 | 64 | 1 | 0.25 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g05-luis-approval-note | yes | reply | final | yes | 1 | 0 | 1583 | 0 | 0 | 0 | 5 | 16/65 | - | 77.8 | yes | yes | 0 | 0 | 66 | 1 | 0.375 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g06-kenji-shipping | no | reply | final | no | 2 | 0 | 1640 | 0 | 0 | 0 | 5 | 16/67 | - | 53.8 | yes | yes | 0 | 0 | 70 | 1 | 0.125 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g07-depot-release | yes | reply | final | yes | 1 | 0 | 1623 | 0 | 0 | 0 | 5 | 16/71 | - | 49.6 | yes | yes | 0 | 0 | 72 | 1 | 0.25 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g08-halvorsen-credit | yes | reply | final | yes | 2 | 0 | 1738 | 0 | 0 | 0 | 5 | 16/73 | - | 49.9 | yes | yes | 0 | 0 | 76 | 1 | 0.125 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g09-kenji-gift-note | yes | reply | final | yes | 2 | 0 | 1725 | 0 | 0 | 0 | 5 | 16/77 | - | 44.0 | yes | yes | 0 | 0 | 80 | 1 | 0 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g10-sigrid-callback | no | reply | final | no | 1 | 0 | 1690 | 0 | 0 | 0 | 5 | 16/81 | - | 47.0 | yes | yes | 0 | 0 | 82 | 1 | 0.111 | 0 | 5 (0 pairs) | 0/0 | 0 |
