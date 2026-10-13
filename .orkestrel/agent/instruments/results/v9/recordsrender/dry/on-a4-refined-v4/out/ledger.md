# Larkspur Home support desk: ledger

mode ledger, model qwen3.5:2b-q4_K_M, think off, reply terminal, judge mica (num_ctx 4096), categories choice, budget 0.7, tail 0.35, ctx 3072, profile refined, gate admit, horizon 99, date on, tail-answers drop, tail-requests drop, rules last, handles bare, cache stable, autopin named, report full, arm-tools recall, tally off, request-questions topics, answer-cue on, recall-budget 2, repeat-stop all, answer-view collapsed, recall-split on, recall-category off, records on, scenario /home/user/agent/tmp/bench/variants/ledger/v4.json, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95. Seed pass: 1 questions, 0.1 s. Passed 7 of 10; ok any 7 of 10. Reply via: final 10, answered 0, held 0, tool 0, reminded 0, content 0, none 0. Lookup repeats 0. Goal facts at entry: 18 of 18 slots; goal facts plus the date line: 19 of 19 slots.

| goal | success | answer | reply via | ok any | turns | lookup repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view | briefing recall | briefing precision | stale | judge questions | pins model/loop | denials |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | reply | final | yes | 2 | 0 | 1776 | 0 | 0 | 0 | 5 | 16/49 | - | 0.1 | yes | yes | 0 | 0 | 52 | 1 | 0.286 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g02-luis-card | yes | reply | final | yes | 2 | 0 | 1656 | 0 | 0 | 0 | 5 | 16/53 | - | 0.0 | yes | yes | 0 | 0 | 56 | 1 | 0.143 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g03-grace-escalation | yes | reply | final | yes | 2 | 0 | 2040 | 0 | 0 | 0 | 5 | 16/57 | - | 0.0 | yes | yes | 0 | 0 | 60 | 1 | 0.375 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g04-halvorsen-ticket | yes | reply | final | yes | 2 | 0 | 2006 | 0 | 0 | 0 | 5 | 16/61 | - | 0.1 | yes | yes | 0 | 0 | 64 | 1 | 0.25 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g05-luis-approval-note | no | reply | final | no | 2 | 0 | 2005 | 0 | 0 | 0 | 5 | 16/65 | - | 0.1 | yes | yes | 0 | 0 | 68 | 1 | 0.375 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g06-kenji-shipping | no | reply | final | no | 2 | 0 | 1717 | 0 | 0 | 0 | 5 | 16/69 | - | 0.0 | yes | yes | 0 | 0 | 72 | 1 | 0.111 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g07-depot-release | yes | reply | final | yes | 2 | 0 | 1777 | 0 | 0 | 0 | 5 | 16/73 | - | 0.0 | yes | yes | 0 | 0 | 76 | 1 | 0.25 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g08-halvorsen-credit | no | reply | final | no | 2 | 0 | 1758 | 0 | 0 | 0 | 5 | 16/77 | - | 0.0 | yes | yes | 0 | 0 | 80 | 1 | 0.125 | 0 | 5 (0 pairs) | 0/1 | 0 |
| g09-kenji-gift-note | yes | reply | final | yes | 2 | 0 | 1747 | 0 | 0 | 0 | 5 | 16/81 | - | 0.1 | yes | yes | 0 | 0 | 84 | 1 | 0 | 0 | 5 (0 pairs) | 0/0 | 0 |
| g10-sigrid-callback | yes | reply | final | yes | 1 | 0 | 1724 | 0 | 0 | 0 | 5 | 16/85 | - | 0.0 | yes | yes | 0 | 0 | 86 | 1 | 0.111 | 0 | 5 (0 pairs) | 0/0 | 0 |
