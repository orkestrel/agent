## results/v7/none-6144/none.jsonl

| goal | old success | new success | old ok any | new ok any | reasons |
| --- | --- | --- | --- | --- | --- |
| g01-luis-refund-amount | yes | yes | yes | yes | answer via content |
| g02-luis-card | yes | yes | yes | yes | answer via content |
| g03-grace-escalation | yes | yes | yes | yes | answer via content |
| g04-halvorsen-ticket | yes | yes | yes | yes | answer via content |
| g05-luis-approval-note | no | no | no | no | answer via content; reply missing mx-4486; answer missing mx-4486 |
| g06-kenji-shipping | no | no | no | no | answer via content; reply forbidden 2026-10-12; reply pattern #1; answer forbidden 2026-10-12; answer pattern #1 |
| g07-depot-release | no | no | no | no | answer via content; reply missing tomasz, any of today/2026-10-08; answer missing tomasz, any of today/2026-10-08 |
| g08-halvorsen-credit | yes | yes | yes | yes | answer via content |
| g09-kenji-gift-note | no | no | no | no | answer via content; reply pattern #1; answer pattern #1 |
| g10-sigrid-callback | no | no | no | no | answer via content; reply missing 4127, any of 2 pm/2pm/2:00 pm/2:00pm/2 p.m./2:00 p.m./14:00; reply pattern #2; answer missing 4127, any of 2 pm/2pm/2:00 pm/2:00pm/2 p.m./2:00 p.m./14:00; answer pattern #2 |

Passed 5 -> 5 of 10; ok any 5 -> 5 of 10. Wrote /home/user/agent/tmp/bench/results/v7/prepwork/fix/rescored/results/v7/none-6144/none.jsonl.rescored.jsonl.

## results/v7/compaction/compaction.jsonl

| goal | old success | new success | old ok any | new ok any | reasons |
| --- | --- | --- | --- | --- | --- |
| g01-luis-refund-amount | yes | yes | yes | yes | answer via content |
| g02-luis-card | yes | yes | yes | yes | answer via content |
| g03-grace-escalation | yes | no | yes | no | answer via content; reply pattern #7; answer pattern #7 |
| g04-halvorsen-ticket | no | no | no | no | answer via content; reply missing esc-2219; reply pattern #1; answer missing esc-2219; answer pattern #1 |
| g05-luis-approval-note | yes | yes | yes | yes | answer via content |
| g06-kenji-shipping | no | no | no | no | answer via content; reply forbidden october 12; reply pattern #1; answer forbidden october 12; answer pattern #1 |
| g07-depot-release | no | no | no | no | answer via content; reply pattern #3; answer pattern #3 |
| g08-halvorsen-credit | no | yes | no | yes | answer via content |
| g09-kenji-gift-note | no | no | no | no | answer via content; reply pattern #1; answer pattern #1 |
| g10-sigrid-callback | no | no | no | no | answer via content; reply pattern #2; answer pattern #2 |

Passed 4 -> 4 of 10; ok any 4 -> 4 of 10. Wrote /home/user/agent/tmp/bench/results/v7/prepwork/fix/rescored/results/v7/compaction/compaction.jsonl.rescored.jsonl.

## results/v7/both/both.jsonl

| goal | old success | new success | old ok any | new ok any | reasons |
| --- | --- | --- | --- | --- | --- |
| g01-luis-refund-amount | no | no | no | no | answer via content; reply pattern #1, #2; answer pattern #1, #2 |
| g02-luis-card | yes | yes | yes | yes | answer via content |
| g03-grace-escalation | yes | no | yes | no | answer via content; reply pattern #8; answer pattern #8 |
| g04-halvorsen-ticket | yes | yes | yes | yes | answer via content |
| g05-luis-approval-note | no | no | no | no | answer via content; reply missing mx-4486; reply pattern #1; answer missing mx-4486; answer pattern #1 |
| g06-kenji-shipping | no | no | no | no | answer via content; reply missing pw-6013-2280; answer missing pw-6013-2280 |
| g07-depot-release | no | no | no | no | answer via content; reply missing tomasz; answer missing tomasz |
| g08-halvorsen-credit | yes | yes | yes | yes | answer via content |
| g09-kenji-gift-note | no | no | no | no | answer via content; reply pattern #1; answer pattern #1 |
| g10-sigrid-callback | no | no | no | no | answer via content; reply missing 4127, any of 2 pm/2pm/2:00 pm/2:00pm/2 p.m./2:00 p.m./14:00; reply pattern #2; answer missing 4127, any of 2 pm/2pm/2:00 pm/2:00pm/2 p.m./2:00 p.m./14:00; answer pattern #2 |

Passed 4 -> 3 of 10; ok any 4 -> 3 of 10. Wrote /home/user/agent/tmp/bench/results/v7/prepwork/fix/rescored/results/v7/both/both.jsonl.rescored.jsonl.

## results/v7/ledger/ledger.jsonl

| goal | old success | new success | old ok any | new ok any | reasons |
| --- | --- | --- | --- | --- | --- |
| g01-luis-refund-amount | yes | yes | yes | yes | - |
| g02-luis-card | yes | yes | yes | yes | - |
| g03-grace-escalation | yes | yes | yes | yes | - |
| g04-halvorsen-ticket | yes | yes | yes | yes | - |
| g05-luis-approval-note | no | yes | no | yes | - |
| g06-kenji-shipping | no | no | no | no | reply forbidden october 12; reply pattern #1 |
| g07-depot-release | no | no | no | no | reply missing tomasz; reply pattern #1 |
| g08-halvorsen-credit | no | yes | no | yes | - |
| g09-kenji-gift-note | yes | yes | yes | yes | - |
| g10-sigrid-callback | no | no | no | no | reply pattern #2 |

Passed 5 -> 7 of 10; ok any 5 -> 7 of 10. Wrote /home/user/agent/tmp/bench/results/v7/prepwork/fix/rescored/results/v7/ledger/ledger.jsonl.rescored.jsonl.

## Pass counts

| file | goals | old success | new success | old ok any | new ok any |
| --- | ---: | ---: | ---: | ---: | ---: |
| results/v7/none-6144/none.jsonl | 10 | 5 | 5 | 5 | 5 |
| results/v7/compaction/compaction.jsonl | 10 | 4 | 4 | 4 | 4 |
| results/v7/both/both.jsonl | 10 | 4 | 3 | 4 | 3 |
| results/v7/ledger/ledger.jsonl | 10 | 5 | 7 | 5 | 7 |

