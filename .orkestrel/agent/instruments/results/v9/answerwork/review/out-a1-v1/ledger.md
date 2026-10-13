# Larkspur Home support desk: ledger

mode ledger, model qwen3.5:2b-q4_K_M, think off, reply terminal, judge mica (num_ctx 4096), categories choice, budget 0.7, tail 0.35, ctx 3072, profile roundA, gate deny, horizon 3, date off, tail-answers keep, rules roundA, handles roundA, cache roundA, autopin roundA, report roundA, arm-tools all, tally roundA, request-questions all, scenario /home/user/agent/tmp/bench/variants/ledger/v1.json, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95. Seed pass: 1 questions, 0.1 s. Passed 4 of 10; ok any 4 of 10. Reply via: final 5, answered 0, held 4, tool 0, reminded 0, content 0, none 1. Lookup repeats 1. Goal facts at entry: 18 of 18 slots; goal facts plus the date line: 18 of 19 slots.

| goal | success | answer | reply via | ok any | turns | lookup repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view | briefing recall | briefing precision | stale | judge questions | pins model/loop | denials |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | reply | held | yes | 7 | 0 | 2734 | 0 | 0 | 0 | 7 | 20/55 | - | 0.1 | yes | yes | 0 | 0 | 62 | 1 | 0.222 | 0 | 7 (0 pairs) | 0/1 | 1 |
| g02-luis-card | yes | reply | final | yes | 3 | 0 | 2062 | 0 | 0 | 0 | 7 | 10/63 | - | 0.0 | yes | yes | 0 | 0 | 68 | 1 | 0.111 | 0 | 7 (0 pairs) | 1/0 | 0 |
| g03-grace-escalation | no | reply | final | no | 3 | 0 | 2589 | 0 | 0 | 0 | 7 | 10/69 | - | 0.1 | yes | no | 0 | 0 | 74 | 1 | 0.273 | 1 | 7 (0 pairs) | 0/0 | 0 |
| g04-halvorsen-ticket | no | none | none | no | 6 | 1 | 2301 | 0 | 0 | 0 | 7 | 7/75 | - | 0.1 | yes | yes | 0 | 0 | 86 | 1 | 0.182 | 0 | 7 (0 pairs) | 0/3 | 0 |
| g05-luis-approval-note | no | reply | final | no | 5 | 0 | 2689 | 0 | 0 | 0 | 7 | 9/87 | - | 0.1 | yes | no | 0 | 0 | 96 | 1 | 0.2 | 0 | 7 (0 pairs) | 0/1 | 0 |
| g06-kenji-shipping | no | reply | held | no | 5 | 0 | 2548 | 0 | 0 | 0 | 7 | 12/103 | - | 0.1 | yes | yes | 0 | 0 | 106 | 1 | 0.111 | 0 | 7 (0 pairs) | 0/1 | 1 |
| g07-depot-release | no | reply | held | no | 4 | 0 | 2526 | 0 | 0 | 0 | 7 | 9/111 | - | 0.1 | yes | yes | 0 | 0 | 114 | 1 | 0.083 | 0 | 7 (0 pairs) | 0/1 | 1 |
| g08-halvorsen-credit | yes | reply | held | yes | 4 | 0 | 2425 | 0 | 0 | 0 | 7 | 9/119 | - | 0.1 | yes | yes | 0 | 0 | 122 | 1 | 0.1 | 0 | 7 (0 pairs) | 0/1 | 1 |
| g09-kenji-gift-note | yes | reply | final | yes | 2 | 0 | 2089 | 0 | 0 | 0 | 7 | 5/123 | - | 0.0 | yes | no | 0 | 0 | 126 | 1 | 0 | 0 | 7 (0 pairs) | 0/0 | 0 |
| g10-sigrid-callback | no | reply | final | no | 3 | 0 | 2467 | 0 | 0 | 0 | 7 | 6/127 | - | 0.1 | yes | yes | 0 | 0 | 132 | 1 | 0.1 | 0 | 7 (0 pairs) | 0/0 | 0 |
