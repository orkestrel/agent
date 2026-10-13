# Larkspur Home support desk: ledger

mode ledger, gate admit, judge mica (num_ctx 4096), categories choice, budget 0.55, tail 0.35, horizon 3, ctx 3072. Seed pass: 1 questions, 38.0 s. Passed 4 of 10; ok any 4 of 10.

| goal | success | answer | ok any | turns | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view | briefing recall | briefing precision | stale | judge questions | pins model/loop | denials |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| g01-luis-refund-amount | no (error) | none | no | 5 | 3040 | 1 | 1 | 0 | 7 | 19/49 | - | 52.8 | yes | no | 0 | 0 | 57 | 1 | 0.125 | 0 | 7 (0 pairs) | 0/1 | 0 |
| g02-luis-card | yes | reply | yes | 3 | 2822 | 0 | 0 | 0 | 7 | 19/58 | - | 53.4 | yes | yes | 0 | 0 | 64 | 1 | 0.063 | 0 | 7 (0 pairs) | 1/1 | 0 |
| g03-grace-escalation | no (error) | none | no | 6 | 3039 | 1 | 1 | 0 | 7 | 14/65 | - | 55.3 | yes | no | 0 | 0 | 75 | 1 | 0.231 | 0 | 7 (0 pairs) | 0/0 | 0 |
| g04-halvorsen-ticket | no | reply | no | 2 | 2837 | 0 | 0 | 0 | 7 | 14/76 | - | 48.5 | yes | yes | 0 | 0 | 80 | 1 | 0.133 | 0 | 7 (0 pairs) | 0/1 | 0 |
| g05-luis-approval-note | yes | reply | yes | 1 | 2495 | 0 | 0 | 0 | 7 | 16/81 | - | 46.9 | no | yes | 0 | 0 | 83 | 0.667 | 0.154 | 0 | 7 (0 pairs) | 0/0 | 0 |
| g06-kenji-shipping | no | reply | no | 2 | 2541 | 0 | 0 | 0 | 7 | 8/84 | - | 49.2 | no | yes | 0 | 0 | 88 | 0.5 | 0.077 | 0 | 7 (0 pairs) | 0/1 | 0 |
| g07-depot-release | no | none | no | 4 | 3049 | 0 | 2 | 0 | 7 | 6/89 | - | 53.9 | yes | no | 0 | 0 | 96 | 1 | 0.063 | 0 | 7 (0 pairs) | 0/1 | 0 |
| g08-halvorsen-credit | yes | reply | yes | 2 | 2618 | 0 | 0 | 0 | 7 | 13/97 | - | 50.5 | yes | yes | 0 | 0 | 101 | 1 | 0.071 | 0 | 7 (0 pairs) | 0/1 | 0 |
| g09-kenji-gift-note | no (error) | none | no | 7 | 3031 | 1 | 1 | 0 | 7 | 14/102 | - | 56.0 | no | no | 0 | 0 | 114 | 0 | 0 | 0 | 7 (0 pairs) | 0/0 | 0 |
| g10-sigrid-callback | yes | reply | yes | 2 | 2542 | 0 | 0 | 0 | 7 | 16/115 | - | 47.2 | yes | yes | 0 | 0 | 119 | 1 | 0.091 | 0 | 7 (0 pairs) | 0/0 | 0 |
