# Larkspur Home support desk: ledger

mode ledger, model qwen3.5:2b-q4_K_M, think off, reply terminal, judge mica (num_ctx 4096), categories choice, budget 0.7, tail 0.35, ctx 3072, profile roundA, gate deny, horizon 3, date off, tail-answers keep, rules roundA, handles roundA, cache roundA, autopin roundA, report roundA, arm-tools all, tally roundA, request-questions all, scenario /home/user/agent/tmp/bench/variants/ledger/v3.json, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95. Seed pass: 1 questions, 0.1 s. Passed 4 of 10; ok any 4 of 10. Reply via: final 3, answered 0, held 5, tool 0, reminded 0, content 0, none 2. Lookup repeats 0. Goal facts at entry: 18 of 18 slots; goal facts plus the date line: 18 of 19 slots.

| goal | success | answer | reply via | ok any | turns | lookup repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view | briefing recall | briefing precision | stale | judge questions | pins model/loop | denials |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | reply | held | yes | 4 | 0 | 2423 | 0 | 0 | 0 | 7 | 20/55 | - | 0.1 | yes | yes | 0 | 0 | 56 | 1 | 0.222 | 0 | 7 (0 pairs) | 0/1 | 1 |
| g02-luis-card | yes | reply | held | yes | 4 | 0 | 2219 | 0 | 0 | 0 | 7 | 18/61 | - | 0.1 | yes | yes | 0 | 0 | 64 | 1 | 0.111 | 0 | 7 (0 pairs) | 0/1 | 1 |
| g03-grace-escalation | no | none | none | no | 9 | 0 | 2970 | 0 | 0 | 0 | 7 | 13/65 | - | 0.1 | yes | no | 0 | 0 | 82 | 1 | 0.25 | 0 | 7 (0 pairs) | 0/0 | 0 |
| g04-halvorsen-ticket | no | none | none | no | 9 | 0 | 2619 | 0 | 1 | 0 | 7 | 13/83 | - | 0.1 | yes | yes | 0 | 0 | 100 | 1 | 0.182 | 0 | 7 (0 pairs) | 0/6 | 0 |
| g05-luis-approval-note | no | reply | held | no | 8 | 0 | 2926 | 0 | 0 | 0 | 7 | 26/113 | - | 0.1 | yes | yes | 0 | 0 | 116 | 1 | 0.2 | 0 | 7 (0 pairs) | 0/2 | 1 |
| g06-kenji-shipping | no | reply | held | no | 6 | 0 | 2733 | 0 | 0 | 0 | 7 | 19/125 | - | 0.1 | yes | yes | 0 | 0 | 128 | 1 | 0.111 | 0 | 7 (0 pairs) | 0/1 | 1 |
| g07-depot-release | no | reply | final | no | 2 | 0 | 2258 | 0 | 0 | 0 | 7 | 8/129 | - | 0.1 | yes | no | 0 | 0 | 132 | 1 | 0.083 | 0 | 7 (0 pairs) | 0/0 | 0 |
| g08-halvorsen-credit | yes | reply | held | yes | 4 | 0 | 2479 | 0 | 0 | 0 | 7 | 11/137 | - | 0.1 | yes | yes | 0 | 0 | 140 | 1 | 0.1 | 0 | 7 (0 pairs) | 0/1 | 1 |
| g09-kenji-gift-note | yes | reply | final | yes | 2 | 0 | 2201 | 0 | 0 | 0 | 7 | 7/141 | - | 0.1 | yes | no | 0 | 0 | 144 | 1 | 0 | 0 | 7 (0 pairs) | 0/0 | 0 |
| g10-sigrid-callback | no | reply | final | no | 2 | 0 | 2498 | 0 | 0 | 0 | 7 | 7/145 | - | 0.1 | yes | yes | 0 | 0 | 148 | 1 | 0.091 | 0 | 7 (0 pairs) | 0/0 | 0 |
