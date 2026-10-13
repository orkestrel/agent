# Larkspur Home support desk: ledger

mode ledger, model gemma4:e4b-it-q4_K_M, think off, reply terminal, judge mica (num_ctx 4096), categories choice, budget 0.7, tail 0.35, ctx 3072, profile refined, gate admit, horizon 99, date on, tail-answers drop, tail-requests drop, rules last, handles bare, cache stable, autopin named, report full, arm-tools recall, tally off, request-questions topics, answer-cue on, recall-budget 2, repeat-stop all, answer-view collapsed, recall-split on, recall-category off, records on, scenario /home/user/scaffold/.orkestrel/agent/instruments/harness/bench/variants/ledger/v4.json, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95. Seed pass: 1 questions, 89.6 s. Passed 8 of 10; ok any 8 of 10. Reply via: final 10, answered 0, held 0, tool 0, reminded 0, content 0, none 0. Lookup repeats 0. Goal facts at entry: 18 of 18 slots; goal facts plus the date line: 19 of 19 slots.

| goal | success | answer | reply via | ok any | turns | lookup repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view | briefing recall | briefing precision | stale | judge questions | pins model/loop | denials |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | reply | final | yes | 3 | 0 | 1553 | 0 | 0 | 0 | 5 | 20/49 | - | 53.7 | yes | yes | 0 | 0 | 54 | 1 | 0.286 | 0 | 5 (0 pairs) | 0/2 | 0 |
| g02-luis-card | yes | reply | final | yes | 2 | 0 | 1520 | 0 | 0 | 0 | 5 | 20/55 | - | 45.0 | yes | yes | 0 | 0 | 58 | 1 | 0.125 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g03-grace-escalation | yes | reply | final | yes | 3 | 0 | 1791 | 0 | 0 | 0 | 5 | 20/59 | - | 76.6 | yes | yes | 0 | 0 | 64 | 1 | 0.375 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g04-halvorsen-ticket | yes | reply | final | yes | 2 | 0 | 1750 | 0 | 0 | 0 | 5 | 20/65 | - | 50.5 | yes | yes | 0 | 0 | 68 | 1 | 0.25 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g05-luis-approval-note | yes | reply | final | yes | 3 | 0 | 1618 | 0 | 0 | 0 | 5 | 20/69 | - | 63.1 | yes | yes | 0 | 0 | 74 | 1 | 0.25 | 0 | 5 (0 pairs) | 0/2 | 0 |
| g06-kenji-shipping | no | reply | final | no | 2 | 0 | 1463 | 0 | 0 | 0 | 5 | 20/75 | - | 65.1 | yes | yes | 0 | 0 | 78 | 1 | 0.125 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g07-depot-release | yes | reply | final | yes | 2 | 0 | 1779 | 0 | 0 | 0 | 5 | 20/79 | - | 55.0 | yes | yes | 0 | 0 | 82 | 1 | 0.25 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g08-halvorsen-credit | no | reply | final | no | 2 | 0 | 1553 | 0 | 0 | 0 | 5 | 20/83 | - | 56.0 | yes | yes | 0 | 0 | 86 | 1 | 0.125 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g09-kenji-gift-note | yes | reply | final | yes | 2 | 0 | 1545 | 0 | 0 | 0 | 5 | 20/87 | - | 41.5 | yes | yes | 0 | 0 | 90 | 1 | 0 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g10-sigrid-callback | yes | reply | final | yes | 1 | 0 | 1522 | 0 | 0 | 0 | 5 | 20/91 | - | 40.8 | yes | yes | 0 | 0 | 92 | 1 | 0.111 | 0 | 5 (0 pairs) | 0/0 | 0 |
