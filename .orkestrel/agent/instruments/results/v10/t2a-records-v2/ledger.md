# Larkspur Home support desk: ledger

mode ledger, model qwen3.5:2b-q4_K_M, think on (cap 2048), answer-think off, reply terminal, judge mica (num_ctx 4096), categories choice, budget 0.42, tail 0.35, ctx 5120, profile refined, gate admit, horizon 99, date on, tail-answers drop, tail-requests drop, rules last, handles bare, cache stable, autopin named, report full, arm-tools recall, tally off, request-questions topics, answer-cue on, recall-budget 2, repeat-stop all, answer-view collapsed, recall-split on, recall-category off, records on, scenario /home/user/agent/tmp/bench/variants/ledger/v2.json, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95. Seed pass: 1 questions, 40.1 s. Passed 9 of 10; ok any 9 of 10. Reply via: final 8, answered 2, held 0, tool 0, reminded 0, content 0, none 0. Lookup repeats 0. Goal facts at entry: 18 of 18 slots; goal facts plus the date line: 19 of 19 slots. Think cut 0 of 22 agent calls; thinking 11245 characters.

| goal | success | answer | reply via | ok any | turns | lookup repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view | briefing recall | briefing precision | stale | judge questions | pins model/loop | denials |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | reply | final | yes | 1 | 0 | 1529 | 0 | 0 | 0 | 5 | 16/49 | - | 52.1 | yes | yes | 0 | 0 | 50 | 1 | 0.286 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g02-luis-card | yes | reply | final | yes | 2 | 0 | 1639 | 0 | 0 | 0 | 5 | 16/51 | - | 144.6 | yes | yes | 0 | 0 | 54 | 1 | 0.143 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g03-grace-escalation | yes | reply | final | yes | 2 | 0 | 2053 | 0 | 0 | 0 | 5 | 16/55 | - | 194.5 | yes | yes | 0 | 0 | 58 | 1 | 0.375 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g04-halvorsen-ticket | yes | reply | final | yes | 2 | 0 | 1990 | 0 | 0 | 0 | 5 | 16/59 | - | 90.3 | yes | yes | 0 | 0 | 62 | 1 | 0.25 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g05-luis-approval-note | yes | reply | answered | yes | 4 | 0 | 2097 | 0 | 0 | 0 | 5 | 16/63 | - | 105.6 | yes | yes | 0 | 0 | 71 | 1 | 0.375 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g06-kenji-shipping | no | reply | final | no | 2 | 0 | 1601 | 0 | 0 | 0 | 5 | 16/72 | - | 86.4 | yes | yes | 0 | 0 | 75 | 1 | 0.143 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g07-depot-release | yes | reply | final | yes | 2 | 0 | 1963 | 0 | 0 | 0 | 5 | 16/76 | - | 76.7 | yes | yes | 0 | 0 | 79 | 1 | 0.25 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g08-halvorsen-credit | yes | reply | final | yes | 2 | 0 | 1743 | 0 | 0 | 0 | 5 | 16/80 | - | 60.1 | yes | yes | 0 | 0 | 83 | 1 | 0.125 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g09-kenji-gift-note | yes | reply | final | yes | 2 | 0 | 1725 | 0 | 0 | 0 | 5 | 16/84 | - | 50.3 | yes | yes | 0 | 0 | 87 | 1 | 0 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g10-sigrid-callback | yes | reply | answered | yes | 3 | 0 | 1774 | 0 | 0 | 0 | 5 | 16/88 | - | 73.7 | yes | yes | 0 | 0 | 94 | 1 | 0.111 | 0 | 5 (0 pairs) | 0/0 | 0 |
