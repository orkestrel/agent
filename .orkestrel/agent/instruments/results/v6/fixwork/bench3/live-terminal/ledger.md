# Larkspur Home support desk: ledger

mode ledger, reply terminal, gate admit, judge mica (num_ctx 4096), categories choice, budget 0.7, tail 0.35, horizon 3, ctx 3072, temperature 0, seed 7, presence_penalty 1.5, top_k 20, top_p 0.95. Seed pass: 1 questions, 0.1 s. Passed 1 of 2; ok any 1 of 2. Reply via: final 1, answered 0, held 0, tool 0, reminded 0, content 0, none 1. Lookup repeats 1.

| goal | success | answer | reply via | ok any | turns | lookup repeats | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view | briefing recall | briefing precision | stale | judge questions | pins model/loop | denials |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| g01-luis-refund-amount | yes | reply | final | yes | 3 | 1 | 1705 | 0 | 0 | 8 | 8 | 32/49 | - | 0.0 | yes | yes | 0 | 0 | 54 | 1 | 0.182 | 0 | 8 (1 pairs) | 0/1 | 0 |
| g02-luis-card | no (error) | none | none | no | 1 | 0 | 3095 | 1 | 0 | 15 | 15 | 24/55 | - | 0.0 | yes | no | 0 | 0 | 55 | 1 | 0.111 | 0 | 15 (1 pairs) | 0/0 | 0 |
