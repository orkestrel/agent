# Larkspur Home support desk: selection

mode selection, judge mica (num_ctx 4096), threshold 0.9, limit all, state bounded (neighbors 2), candidates newest, criterion lookup, ctx 3072, search words. Passed 0 of 3; ok any 1 of 3; reply skips 1; selection faults 0; judge ok 154, judge errors 0.

| goal | success | answer | ok any | turns | max prompt tokens | overflow | truncated | faults | judge calls | selection/view | asked/screened | wall s | in prompt | tools ok | summaries | sections | view |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: |
| g01-luis-refund-amount | no | reply | no | 1 | 1427 | 0 | 0 | 0 | 48 | 19/49 | 48/48 | 685.8 | yes | yes | 0 | 0 | 51 |
| g02-luis-card | no | content | yes | 2 | 1174 | 0 | 0 | 0 | 51 | 7/52 | 51/51 | 273.6 | yes | no | 0 | 0 | 55 |
| g03-grace-escalation | no | reply | no | 1 | 1586 | 0 | 0 | 0 | 55 | 20/56 | 55/55 | 310.5 | yes | yes | 0 | 0 | 58 |
