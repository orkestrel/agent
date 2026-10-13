# Larkspur Home support desk: ledger

mode ledger, model qwen3.5:2b-q4_K_M, think on (cap 2048), reply terminal, judge mica (num_ctx 4096), categories choice, budget 0.42, tail 0.35, ctx 5120, profile refined, gate admit, horizon 99, date on, tail-answers drop, tail-requests drop, rules last, handles bare, cache stable, autopin named, report full, arm-tools recall, tally off, request-questions topics, answer-cue on, recall-budget 2, repeat-stop all, answer-view collapsed, recall-split on, recall-category off, records on, scenario /home/user/agent/tmp/bench/variants/ledger/v1.json, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95. Seed pass: 1 questions, 39.4 s. Passed 6 of 10; ok any 6 of 10. Reply via: final 8, answered 0, held 0, tool 0, reminded 0, content 0, none 2. Lookup repeats 0. Goal facts at entry: 18 of 18 slots; goal facts plus the date line: 19 of 19 slots. Think cut 2 of 21 agent calls; thinking 26809 characters.

| goal | success | answer | reply via | ok any | turns | lookup repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view | briefing recall | briefing precision | stale | judge questions | pins model/loop | denials |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| g01-luis-refund-amount | no | none | none | no | 4 | 0 | 1864 | 0 | 1 | 0 | 5 | 16/49 | - | 233.6 | yes | yes | 0 | 0 | 57 | 1 | 0.286 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g02-luis-card | yes | reply | final | yes | 2 | 0 | 1741 | 0 | 0 | 0 | 5 | 18/58 | - | 47.5 | yes | yes | 0 | 0 | 61 | 1 | 0.125 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g03-grace-escalation | yes | reply | final | yes | 2 | 0 | 2051 | 0 | 0 | 0 | 5 | 16/62 | - | 104.7 | yes | yes | 0 | 0 | 65 | 1 | 0.375 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g04-halvorsen-ticket | yes | reply | final | yes | 2 | 0 | 1975 | 0 | 0 | 0 | 5 | 16/66 | - | 70.1 | yes | yes | 0 | 0 | 69 | 1 | 0.25 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g05-luis-approval-note | yes | reply | final | yes | 2 | 0 | 1816 | 0 | 0 | 0 | 5 | 16/70 | - | 107.6 | yes | yes | 0 | 0 | 73 | 1 | 0.375 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g06-kenji-shipping | no | reply | final | no | 2 | 0 | 1640 | 0 | 0 | 0 | 5 | 16/74 | - | 143.1 | yes | yes | 0 | 0 | 77 | 1 | 0.125 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g07-depot-release | yes | reply | final | yes | 1 | 0 | 1618 | 0 | 0 | 0 | 5 | 16/78 | - | 74.9 | yes | yes | 0 | 0 | 79 | 1 | 0.25 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g08-halvorsen-credit | no | reply | final | no | 2 | 0 | 1739 | 0 | 0 | 0 | 5 | 16/80 | - | 60.0 | yes | yes | 0 | 0 | 83 | 1 | 0.125 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g09-kenji-gift-note | yes | reply | final | yes | 1 | 0 | 1525 | 0 | 0 | 0 | 5 | 16/84 | - | 45.1 | yes | yes | 0 | 0 | 85 | 1 | 0 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g10-sigrid-callback | no | none | none | no | 3 | 0 | 1773 | 0 | 1 | 0 | 5 | 16/86 | - | 203.6 | yes | yes | 0 | 0 | 92 | 1 | 0.111 | 0 | 5 (0 pairs) | 0/0 | 0 |
