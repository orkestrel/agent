# Larkspur Home support desk: ledger

mode ledger, model qwen3.5:2b-q4_K_M, think off, reply terminal, judge mica (num_ctx 4096), categories choice, budget 0.7, tail 0.35, ctx 3072, profile refined, gate admit, horizon 99, date on, tail-answers drop, tail-requests drop, rules last, handles bare, cache stable, autopin named, report full, arm-tools recall, tally off, request-questions topics, answer-cue on, recall-budget 2, repeat-stop all, answer-view collapsed, recall-split on, recall-category off, records on, scenario /home/user/agent/tmp/bench/variants/ledger/v4.json, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95. Seed pass: 1 questions, 0.1 s. Passed 5 of 10; ok any 5 of 10. Reply via: final 8, answered 0, held 0, tool 0, reminded 0, content 0, none 2. Lookup repeats 0. Goal facts at entry: 18 of 18 slots; goal facts plus the date line: 19 of 19 slots.

| goal | success | answer | reply via | ok any | turns | lookup repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view | briefing recall | briefing precision | stale | judge questions | pins model/loop | denials |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| g01-luis-refund-amount | no | none | none | no | 4 | 0 | 2056 | 0 | 0 | 0 | 5 | 11/49 | - | 0.1 | yes | yes | 0 | 0 | 58 | 1 | 0.286 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g02-luis-card | yes | reply | final | yes | 2 | 0 | 1731 | 0 | 0 | 0 | 5 | 11/59 | - | 0.0 | yes | yes | 0 | 0 | 62 | 1 | 0.143 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g03-grace-escalation | no | none | none | no | 3 | 0 | 2067 | 0 | 0 | 0 | 5 | 11/63 | - | 0.1 | yes | yes | 0 | 0 | 70 | 1 | 0.375 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g04-halvorsen-ticket | yes | reply | final | yes | 2 | 0 | 2063 | 0 | 0 | 0 | 5 | 11/71 | - | 0.1 | yes | yes | 0 | 0 | 74 | 1 | 0.25 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g05-luis-approval-note | no | reply | final | no | 5 | 0 | 2475 | 0 | 0 | 0 | 5 | 11/75 | - | 0.1 | yes | yes | 0 | 0 | 84 | 1 | 0.375 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g06-kenji-shipping | no | reply | final | no | 2 | 0 | 1720 | 0 | 0 | 0 | 5 | 11/85 | - | 0.0 | yes | yes | 0 | 0 | 88 | 1 | 0.125 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g07-depot-release | yes | reply | final | yes | 2 | 0 | 1838 | 0 | 0 | 0 | 5 | 11/89 | - | 0.0 | yes | yes | 0 | 0 | 92 | 1 | 0.25 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g08-halvorsen-credit | yes | reply | final | yes | 2 | 0 | 1808 | 0 | 0 | 0 | 5 | 11/93 | - | 0.0 | yes | yes | 0 | 0 | 96 | 1 | 0.125 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g09-kenji-gift-note | yes | reply | final | yes | 2 | 0 | 1821 | 0 | 0 | 0 | 5 | 11/97 | - | 0.1 | yes | yes | 0 | 0 | 100 | 1 | 0 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g10-sigrid-callback | no | reply | final | no | 2 | 0 | 1880 | 0 | 0 | 0 | 5 | 11/101 | - | 0.1 | yes | yes | 0 | 0 | 104 | 1 | 0.111 | 0 | 5 (0 pairs) | 0/1 | 0 |
