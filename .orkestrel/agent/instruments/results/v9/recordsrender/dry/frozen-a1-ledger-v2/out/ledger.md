# Larkspur Home support desk: ledger

mode ledger, model qwen3.5:2b-q4_K_M, think off, reply terminal, judge mica (num_ctx 4096), categories choice, budget 0.7, tail 0.35, ctx 3072, profile refined, gate admit, horizon 99, date on, tail-answers drop, tail-requests drop, rules last, handles bare, cache stable, autopin named, report full, arm-tools recall, tally off, request-questions topics, answer-cue on, recall-budget 2, repeat-stop all, answer-view collapsed, recall-split on, recall-category off, scenario /home/user/agent/tmp/bench/variants/ledger/v2.json, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95. Seed pass: 1 questions, 0.1 s. Passed 6 of 10; ok any 6 of 10. Reply via: final 9, answered 0, held 0, tool 0, reminded 0, content 0, none 1. Lookup repeats 0. Goal facts at entry: 18 of 18 slots; goal facts plus the date line: 19 of 19 slots.

| goal | success | answer | reply via | ok any | turns | lookup repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view | briefing recall | briefing precision | stale | judge questions | pins model/loop | denials |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | reply | final | yes | 3 | 0 | 2082 | 0 | 0 | 0 | 5 | 11/49 | - | 0.1 | yes | yes | 0 | 0 | 54 | 1 | 0.222 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g02-luis-card | yes | reply | final | yes | 2 | 0 | 1745 | 0 | 0 | 0 | 5 | 11/55 | - | 0.0 | yes | yes | 0 | 0 | 58 | 1 | 0.111 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g03-grace-escalation | no | none | none | no | 4 | 0 | 2550 | 0 | 0 | 0 | 5 | 11/59 | - | 0.1 | yes | yes | 0 | 0 | 68 | 1 | 0.25 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g04-halvorsen-ticket | yes | reply | final | yes | 6 | 0 | 2256 | 0 | 0 | 0 | 5 | 11/69 | - | 0.1 | yes | yes | 0 | 0 | 80 | 1 | 0.182 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g05-luis-approval-note | yes | reply | final | yes | 2 | 0 | 1851 | 0 | 0 | 0 | 5 | 11/81 | - | 0.0 | yes | yes | 0 | 0 | 84 | 1 | 0.2 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g06-kenji-shipping | no | reply | final | no | 3 | 0 | 1887 | 0 | 0 | 0 | 5 | 11/85 | - | 0.0 | yes | yes | 0 | 0 | 90 | 1 | 0.125 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g07-depot-release | yes | reply | final | yes | 2 | 0 | 2266 | 0 | 0 | 0 | 5 | 15/91 | - | 0.0 | yes | yes | 0 | 0 | 94 | 1 | 0.167 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g08-halvorsen-credit | no | reply | final | no | 3 | 0 | 1980 | 0 | 0 | 0 | 5 | 11/95 | - | 0.0 | yes | yes | 0 | 0 | 100 | 1 | 0.091 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g09-kenji-gift-note | yes | reply | final | yes | 2 | 0 | 2065 | 0 | 0 | 0 | 5 | 15/101 | - | 0.0 | yes | yes | 0 | 0 | 104 | 1 | 0 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g10-sigrid-callback | no | reply | final | no | 2 | 0 | 2333 | 0 | 0 | 0 | 5 | 11/105 | - | 0.0 | yes | yes | 0 | 0 | 108 | 1 | 0.077 | 0 | 5 (0 pairs) | 0/0 | 0 |
