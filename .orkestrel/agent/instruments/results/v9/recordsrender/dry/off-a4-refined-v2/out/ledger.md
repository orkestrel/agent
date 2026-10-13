# Larkspur Home support desk: ledger

mode ledger, model qwen3.5:2b-q4_K_M, think off, reply terminal, judge mica (num_ctx 4096), categories choice, budget 0.7, tail 0.35, ctx 3072, profile refined, gate admit, horizon 99, date on, tail-answers drop, tail-requests drop, rules last, handles bare, cache stable, autopin named, report full, arm-tools recall, tally off, request-questions topics, answer-cue on, recall-budget 2, repeat-stop all, answer-view collapsed, recall-split on, recall-category off, scenario /home/user/agent/tmp/bench/variants/ledger/v2.json, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95. Seed pass: 1 questions, 0.1 s. Passed 8 of 10; ok any 8 of 10. Reply via: final 8, answered 2, held 0, tool 0, reminded 0, content 0, none 0. Lookup repeats 0. Goal facts at entry: 18 of 18 slots; goal facts plus the date line: 19 of 19 slots.

| goal | success | answer | reply via | ok any | turns | lookup repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view | briefing recall | briefing precision | stale | judge questions | pins model/loop | denials |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | reply | final | yes | 2 | 0 | 1691 | 0 | 0 | 0 | 5 | 16/49 | - | 0.0 | yes | yes | 0 | 0 | 52 | 1 | 0.222 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g02-luis-card | yes | reply | final | yes | 2 | 0 | 1685 | 0 | 0 | 0 | 5 | 16/53 | - | 0.0 | yes | yes | 0 | 0 | 56 | 1 | 0.111 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g03-grace-escalation | yes | reply | final | yes | 2 | 0 | 2215 | 0 | 0 | 0 | 5 | 16/57 | - | 0.0 | yes | yes | 0 | 0 | 60 | 1 | 0.25 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g04-halvorsen-ticket | yes | reply | answered | yes | 3 | 0 | 2069 | 0 | 0 | 0 | 5 | 16/61 | - | 0.0 | yes | yes | 0 | 0 | 68 | 1 | 0.182 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g05-luis-approval-note | yes | reply | answered | yes | 4 | 0 | 2354 | 0 | 0 | 0 | 5 | 16/69 | - | 0.1 | yes | yes | 0 | 0 | 78 | 1 | 0.2 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g06-kenji-shipping | no | reply | final | no | 2 | 0 | 1677 | 0 | 0 | 0 | 5 | 16/79 | - | 0.0 | yes | yes | 0 | 0 | 82 | 1 | 0.125 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g07-depot-release | yes | reply | final | yes | 2 | 0 | 2124 | 0 | 0 | 0 | 5 | 16/83 | - | 0.0 | yes | yes | 0 | 0 | 86 | 1 | 0.167 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g08-halvorsen-credit | yes | reply | final | yes | 2 | 0 | 1821 | 0 | 0 | 0 | 5 | 16/87 | - | 0.0 | yes | yes | 0 | 0 | 90 | 1 | 0.091 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g09-kenji-gift-note | yes | reply | final | yes | 2 | 0 | 1882 | 0 | 0 | 0 | 5 | 16/91 | - | 0.0 | yes | yes | 0 | 0 | 94 | 1 | 0 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g10-sigrid-callback | no | reply | final | no | 2 | 0 | 2277 | 0 | 0 | 0 | 5 | 16/95 | - | 0.0 | yes | yes | 0 | 0 | 98 | 1 | 0.077 | 0 | 5 (0 pairs) | 0/0 | 0 |
