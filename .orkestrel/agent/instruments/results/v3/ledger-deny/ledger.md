# Larkspur Home support desk: ledger

mode ledger, gate deny, judge mica (num_ctx 4096), categories choice, budget 0.55, tail 0.35, horizon 3, ctx 3072. Seed pass: 1 questions, 38.8 s. Passed 2 of 10; ok any 2 of 10.

| goal | success | answer | ok any | turns | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view | briefing recall | briefing precision | stale | judge questions | pins model/loop | denials |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| g01-luis-refund-amount | no (error) | none | no | 5 | 3029 | 1 | 1 | 0 | 7 | 19/49 | - | 52.7 | yes | no | 0 | 0 | 57 | 1 | 0.125 | 0 | 7 (0 pairs) | 0/1 | 0 |
| g02-luis-card | yes | reply | yes | 3 | 2845 | 0 | 0 | 0 | 7 | 19/58 | - | 55.0 | yes | yes | 0 | 0 | 64 | 1 | 0.063 | 0 | 7 (0 pairs) | 1/1 | 0 |
| g03-grace-escalation | no | none | no | 5 | 3062 | 0 | 2 | 0 | 7 | 14/65 | - | 54.3 | yes | no | 0 | 0 | 74 | 1 | 0.231 | 0 | 7 (0 pairs) | 0/0 | 0 |
| g04-halvorsen-ticket | no | reply | no | 2 | 2835 | 0 | 0 | 0 | 7 | 15/75 | - | 48.0 | yes | yes | 0 | 0 | 79 | 1 | 0.154 | 0 | 7 (0 pairs) | 0/1 | 0 |
| g05-luis-approval-note | yes | reply | yes | 2 | 2825 | 0 | 0 | 0 | 7 | 16/80 | - | 50.5 | no | yes | 0 | 0 | 84 | 0.667 | 0.154 | 0 | 7 (0 pairs) | 0/0 | 0 |
| g06-kenji-shipping | no | reply | no | 2 | 2636 | 0 | 0 | 0 | 7 | 12/85 | - | 49.5 | no | no | 0 | 0 | 89 | 0.5 | 0.091 | 0 | 7 (0 pairs) | 0/0 | 0 |
| g07-depot-release | no | reply | no | 2 | 2800 | 0 | 0 | 0 | 7 | 8/90 | - | 52.3 | yes | yes | 0 | 0 | 94 | 1 | 0.143 | 0 | 7 (0 pairs) | 0/1 | 0 |
| g08-halvorsen-credit | no | none | no | 4 | 3027 | 0 | 1 | 0 | 7 | 8/95 | - | 65.6 | yes | yes | 0 | 0 | 102 | 1 | 0.071 | 0 | 7 (0 pairs) | 1/1 | 1 |
| g09-kenji-gift-note | no (error) | none | no | 4 | 3004 | 1 | 1 | 0 | 7 | 9/103 | - | 50.2 | no | no | 0 | 0 | 109 | 0 | 0 | 0 | 7 (0 pairs) | 0/0 | 0 |
| g10-sigrid-callback | no (error) | none | no | 5 | 3027 | 1 | 1 | 0 | 7 | 11/110 | - | 55.5 | yes | no | 0 | 0 | 118 | 1 | 0.083 | 0 | 7 (0 pairs) | 0/0 | 0 |
