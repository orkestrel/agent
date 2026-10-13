# Larkspur Home support desk: ledger

mode ledger, model qwen3.5:4b-q4_K_M, think on (cap 1024), answer pass think off, reply terminal, judge mica (num_ctx 4096), categories choice, budget 0.525, tail 0.35, ctx 4096, profile refined, gate admit, horizon 99, date on, tail-answers drop, tail-requests drop, rules last, handles bare, cache stable, autopin named, report full, arm-tools recall, tally off, request-questions topics, answer-cue on, recall-budget 2, repeat-stop all, answer-view collapsed, recall-split on, recall-category off, records on, scenario /home/user/agent/tmp/bench/variants/ledger/v4.json, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95. Seed pass: 1 questions, 67.6 s. Passed 7 of 10; ok any 7 of 10. Reply via: final 10, answered 0, held 0, tool 0, reminded 0, content 0, none 0. Lookup repeats 0. Goal facts at entry: 18 of 18 slots; goal facts plus the date line: 19 of 19 slots. Think cut 0 of 15 agent calls; thinking 9685 characters.

| goal | success | answer | reply via | ok any | turns | lookup repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view | briefing recall | briefing precision | stale | judge questions | pins model/loop | denials |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | reply | final | yes | 1 | 0 | 1527 | 0 | 0 | 0 | 5 | 16/49 | - | 72.8 | yes | yes | 0 | 0 | 50 | 1 | 0.286 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g02-luis-card | yes | reply | final | yes | 2 | 0 | 1638 | 0 | 0 | 0 | 5 | 16/51 | - | 78.3 | yes | yes | 0 | 0 | 54 | 1 | 0.143 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g03-grace-escalation | yes | reply | final | yes | 2 | 0 | 2009 | 0 | 0 | 0 | 5 | 16/55 | - | 130.7 | yes | yes | 0 | 0 | 58 | 1 | 0.375 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g04-halvorsen-ticket | no | reply | final | no | 2 | 0 | 1938 | 0 | 0 | 0 | 5 | 16/59 | - | 103.4 | yes | yes | 0 | 0 | 62 | 1 | 0.25 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g05-luis-approval-note | no | reply | final | no | 1 | 0 | 1583 | 0 | 0 | 0 | 5 | 16/63 | - | 118.0 | yes | yes | 0 | 0 | 64 | 1 | 0.375 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g06-kenji-shipping | no | reply | final | no | 2 | 0 | 1640 | 0 | 0 | 0 | 5 | 16/65 | - | 112.0 | yes | yes | 0 | 0 | 68 | 1 | 0.125 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g07-depot-release | yes | reply | final | yes | 1 | 0 | 1623 | 0 | 0 | 0 | 5 | 16/69 | - | 91.9 | yes | yes | 0 | 0 | 70 | 1 | 0.25 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g08-halvorsen-credit | yes | reply | final | yes | 2 | 0 | 1737 | 0 | 0 | 0 | 5 | 16/71 | - | 94.6 | yes | yes | 0 | 0 | 74 | 1 | 0.125 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g09-kenji-gift-note | yes | reply | final | yes | 1 | 0 | 1527 | 0 | 0 | 0 | 5 | 16/75 | - | 74.6 | yes | yes | 0 | 0 | 76 | 1 | 0 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g10-sigrid-callback | yes | reply | final | yes | 1 | 0 | 1690 | 0 | 0 | 0 | 5 | 16/77 | - | 69.4 | yes | yes | 0 | 0 | 78 | 1 | 0.111 | 0 | 5 (0 pairs) | 0/0 | 0 |
