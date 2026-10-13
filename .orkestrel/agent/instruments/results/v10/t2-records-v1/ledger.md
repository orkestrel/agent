# Larkspur Home support desk: ledger

mode ledger, model qwen3.5:2b-q4_K_M, think on, reply terminal, judge mica (num_ctx 4096), categories choice, budget 0.525, tail 0.35, ctx 4096, profile refined, gate admit, horizon 99, date on, tail-answers drop, tail-requests drop, rules last, handles bare, cache stable, autopin named, report full, arm-tools recall, tally off, request-questions topics, answer-cue on, recall-budget 2, repeat-stop all, answer-view collapsed, recall-split on, recall-category off, records on, scenario /home/user/agent/tmp/bench/variants/ledger/v1.json, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95. Seed pass: 1 questions, 37.8 s. Passed 6 of 10; ok any 6 of 10. Reply via: final 8, answered 0, held 0, tool 0, reminded 0, content 0, none 2. Lookup repeats 0. Goal facts at entry: 18 of 18 slots; goal facts plus the date line: 19 of 19 slots. Think cut 2 of 22 agent calls; thinking 22347 characters.

| goal | success | answer | reply via | ok any | turns | lookup repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view | briefing recall | briefing precision | stale | judge questions | pins model/loop | denials |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| g01-luis-refund-amount | no | none | none | no | 4 | 0 | 1864 | 0 | 1 | 0 | 5 | 16/49 | - | 187.9 | yes | yes | 0 | 0 | 57 | 1 | 0.286 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g02-luis-card | yes | reply | final | yes | 2 | 0 | 1741 | 0 | 0 | 0 | 5 | 18/58 | - | 62.8 | yes | yes | 0 | 0 | 61 | 1 | 0.125 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g03-grace-escalation | yes | reply | final | yes | 2 | 0 | 2051 | 0 | 0 | 0 | 5 | 16/62 | - | 95.2 | yes | yes | 0 | 0 | 65 | 1 | 0.375 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g04-halvorsen-ticket | yes | reply | final | yes | 3 | 0 | 2357 | 0 | 0 | 0 | 5 | 16/66 | - | 81.8 | yes | yes | 0 | 0 | 71 | 1 | 0.25 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g05-luis-approval-note | yes | reply | final | yes | 2 | 0 | 2026 | 0 | 0 | 0 | 5 | 16/72 | - | 94.0 | yes | yes | 0 | 0 | 75 | 1 | 0.375 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g06-kenji-shipping | no | reply | final | no | 2 | 0 | 1640 | 0 | 0 | 0 | 5 | 16/76 | - | 59.5 | yes | yes | 0 | 0 | 79 | 1 | 0.125 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g07-depot-release | yes | reply | final | yes | 1 | 0 | 1618 | 0 | 0 | 0 | 5 | 16/80 | - | 157.2 | yes | yes | 0 | 0 | 81 | 1 | 0.25 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g08-halvorsen-credit | no | reply | final | no | 2 | 0 | 1739 | 0 | 0 | 0 | 5 | 16/82 | - | 52.9 | yes | yes | 0 | 0 | 85 | 1 | 0.125 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g09-kenji-gift-note | yes | reply | final | yes | 1 | 0 | 1525 | 0 | 0 | 0 | 5 | 16/86 | - | 62.1 | yes | yes | 0 | 0 | 87 | 1 | 0 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g10-sigrid-callback | no | none | none | no | 3 | 0 | 1773 | 0 | 1 | 0 | 5 | 16/88 | - | 183.8 | yes | yes | 0 | 0 | 94 | 1 | 0.111 | 0 | 5 (0 pairs) | 0/0 | 0 |
