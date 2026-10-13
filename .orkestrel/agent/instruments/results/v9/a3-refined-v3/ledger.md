# Larkspur Home support desk: ledger

mode ledger, model qwen3.5:2b-q4_K_M, think off, reply terminal, judge mica (num_ctx 4096), categories choice, budget 0.7, tail 0.35, ctx 3072, profile refined, gate admit, horizon 99, date on, tail-answers drop, tail-requests drop, rules last, handles bare, cache stable, autopin named, report full, arm-tools recall, tally off, request-questions topics, answer-cue on, recall-budget 2, scenario /home/user/agent/tmp/bench/variants/ledger/v3.json, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95. Seed pass: 1 questions, 35.9 s. Passed 6 of 10; ok any 6 of 10. Reply via: final 9, answered 1, held 0, tool 0, reminded 0, content 0, none 0. Lookup repeats 0. Goal facts at entry: 18 of 18 slots; goal facts plus the date line: 19 of 19 slots.

| goal | success | answer | reply via | ok any | turns | lookup repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view | briefing recall | briefing precision | stale | judge questions | pins model/loop | denials |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | reply | final | yes | 3 | 0 | 2061 | 0 | 0 | 0 | 5 | 16/49 | - | 38.8 | yes | yes | 0 | 0 | 54 | 1 | 0.222 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g02-luis-card | yes | reply | final | yes | 2 | 0 | 1723 | 0 | 0 | 0 | 5 | 16/55 | - | 34.2 | yes | yes | 0 | 0 | 58 | 1 | 0.111 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g03-grace-escalation | yes | reply | final | yes | 3 | 0 | 2221 | 0 | 0 | 0 | 5 | 16/59 | - | 54.1 | yes | yes | 0 | 0 | 64 | 1 | 0.25 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g04-halvorsen-ticket | yes | reply | answered | yes | 9 | 0 | 2283 | 0 | 0 | 0 | 5 | 16/65 | - | 72.8 | yes | yes | 0 | 0 | 83 | 1 | 0.167 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g05-luis-approval-note | yes | reply | final | yes | 4 | 0 | 2009 | 0 | 0 | 0 | 5 | 16/84 | - | 68.4 | yes | yes | 0 | 0 | 91 | 1 | 0.2 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g06-kenji-shipping | no | reply | final | no | 2 | 0 | 1753 | 0 | 0 | 0 | 5 | 16/92 | - | 40.2 | yes | yes | 0 | 0 | 95 | 1 | 0.111 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g07-depot-release | no | reply | final | no | 2 | 0 | 2165 | 0 | 0 | 0 | 5 | 16/96 | - | 39.3 | yes | yes | 0 | 0 | 99 | 1 | 0.167 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g08-halvorsen-credit | no | reply | final | no | 2 | 0 | 1858 | 0 | 0 | 0 | 5 | 16/100 | - | 37.4 | yes | yes | 0 | 0 | 103 | 1 | 0.091 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g09-kenji-gift-note | yes | reply | final | yes | 2 | 0 | 1891 | 0 | 0 | 0 | 5 | 16/104 | - | 35.5 | yes | yes | 0 | 0 | 107 | 1 | 0 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g10-sigrid-callback | no | reply | final | no | 2 | 0 | 2311 | 0 | 0 | 0 | 5 | 16/108 | - | 40.5 | yes | yes | 0 | 0 | 111 | 1 | 0.077 | 0 | 5 (0 pairs) | 0/0 | 0 |
