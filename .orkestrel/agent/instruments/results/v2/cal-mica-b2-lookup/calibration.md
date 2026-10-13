# Larkspur Home support desk: calibration

state bounded (neighbors 2), criterion lookup, judge mica (num_ctx 4096). 10 goals, 480 questions, total wall time 2287.4 s.

## g01-luis-refund-amount

The following table gives, per threshold, the share of the 3 must-keep messages the selection keeps and the share of the 14 must-drop messages it drops, and the share of all 48 judged messages it keeps (the view the prompt would carry); a message is kept when its yes probability is above 1 minus the threshold, or when the judge gave no answer.

| threshold | keep rate | drop rate | kept share |
| ---: | ---: | ---: | ---: |
| 0.50 | 100% (3/3) | 100% (14/14) | 19% (9/48) |
| 0.55 | 100% (3/3) | 100% (14/14) | 19% (9/48) |
| 0.60 | 100% (3/3) | 100% (14/14) | 23% (11/48) |
| 0.65 | 100% (3/3) | 100% (14/14) | 23% (11/48) |
| 0.70 | 100% (3/3) | 100% (14/14) | 23% (11/48) |
| 0.75 | 100% (3/3) | 100% (14/14) | 23% (11/48) |
| 0.80 | 100% (3/3) | 100% (14/14) | 25% (12/48) |
| 0.85 | 100% (3/3) | 100% (14/14) | 25% (12/48) |
| 0.90 | 100% (3/3) | 86% (12/14) | 31% (15/48) |
| 0.95 | 100% (3/3) | 71% (10/14) | 44% (21/48) |

Questions: 48. Judge prompt tokens: mean 387, max 522. Refused or failed: 0. Judge wall time: 248.4 s.

## g02-luis-card

The following table gives, per threshold, the share of the 1 must-keep messages the selection keeps and the share of the 14 must-drop messages it drops, and the share of all 48 judged messages it keeps (the view the prompt would carry); a message is kept when its yes probability is above 1 minus the threshold, or when the judge gave no answer.

| threshold | keep rate | drop rate | kept share |
| ---: | ---: | ---: | ---: |
| 0.50 | 0% (0/1) | 100% (14/14) | 4% (2/48) |
| 0.55 | 100% (1/1) | 100% (14/14) | 6% (3/48) |
| 0.60 | 100% (1/1) | 100% (14/14) | 6% (3/48) |
| 0.65 | 100% (1/1) | 100% (14/14) | 8% (4/48) |
| 0.70 | 100% (1/1) | 100% (14/14) | 8% (4/48) |
| 0.75 | 100% (1/1) | 100% (14/14) | 10% (5/48) |
| 0.80 | 100% (1/1) | 100% (14/14) | 13% (6/48) |
| 0.85 | 100% (1/1) | 100% (14/14) | 13% (6/48) |
| 0.90 | 100% (1/1) | 100% (14/14) | 15% (7/48) |
| 0.95 | 100% (1/1) | 100% (14/14) | 19% (9/48) |

Questions: 48. Judge prompt tokens: mean 389, max 524. Refused or failed: 1. Judge wall time: 240.6 s.

## g03-grace-escalation

The following table gives, per threshold, the share of the 3 must-keep messages the selection keeps and the share of the 14 must-drop messages it drops, and the share of all 48 judged messages it keeps (the view the prompt would carry); a message is kept when its yes probability is above 1 minus the threshold, or when the judge gave no answer.

| threshold | keep rate | drop rate | kept share |
| ---: | ---: | ---: | ---: |
| 0.50 | 67% (2/3) | 100% (14/14) | 13% (6/48) |
| 0.55 | 67% (2/3) | 100% (14/14) | 15% (7/48) |
| 0.60 | 67% (2/3) | 100% (14/14) | 17% (8/48) |
| 0.65 | 67% (2/3) | 100% (14/14) | 19% (9/48) |
| 0.70 | 67% (2/3) | 100% (14/14) | 19% (9/48) |
| 0.75 | 100% (3/3) | 100% (14/14) | 21% (10/48) |
| 0.80 | 100% (3/3) | 93% (13/14) | 23% (11/48) |
| 0.85 | 100% (3/3) | 93% (13/14) | 23% (11/48) |
| 0.90 | 100% (3/3) | 86% (12/14) | 35% (17/48) |
| 0.95 | 100% (3/3) | 79% (11/14) | 48% (23/48) |

Questions: 48. Judge prompt tokens: mean 400, max 535. Refused or failed: 0. Judge wall time: 229.2 s.

## g04-halvorsen-ticket

The following table gives, per threshold, the share of the 3 must-keep messages the selection keeps and the share of the 14 must-drop messages it drops, and the share of all 48 judged messages it keeps (the view the prompt would carry); a message is kept when its yes probability is above 1 minus the threshold, or when the judge gave no answer.

| threshold | keep rate | drop rate | kept share |
| ---: | ---: | ---: | ---: |
| 0.50 | 100% (3/3) | 100% (14/14) | 15% (7/48) |
| 0.55 | 100% (3/3) | 100% (14/14) | 15% (7/48) |
| 0.60 | 100% (3/3) | 100% (14/14) | 17% (8/48) |
| 0.65 | 100% (3/3) | 100% (14/14) | 17% (8/48) |
| 0.70 | 100% (3/3) | 100% (14/14) | 19% (9/48) |
| 0.75 | 100% (3/3) | 100% (14/14) | 19% (9/48) |
| 0.80 | 100% (3/3) | 100% (14/14) | 19% (9/48) |
| 0.85 | 100% (3/3) | 100% (14/14) | 23% (11/48) |
| 0.90 | 100% (3/3) | 100% (14/14) | 27% (13/48) |
| 0.95 | 100% (3/3) | 79% (11/14) | 42% (20/48) |

Questions: 48. Judge prompt tokens: mean 388, max 523. Refused or failed: 0. Judge wall time: 228.0 s.

## g05-luis-approval-note

The following table gives, per threshold, the share of the 4 must-keep messages the selection keeps and the share of the 14 must-drop messages it drops, and the share of all 48 judged messages it keeps (the view the prompt would carry); a message is kept when its yes probability is above 1 minus the threshold, or when the judge gave no answer.

| threshold | keep rate | drop rate | kept share |
| ---: | ---: | ---: | ---: |
| 0.50 | 50% (2/4) | 100% (14/14) | 21% (10/48) |
| 0.55 | 50% (2/4) | 100% (14/14) | 21% (10/48) |
| 0.60 | 50% (2/4) | 100% (14/14) | 25% (12/48) |
| 0.65 | 50% (2/4) | 100% (14/14) | 25% (12/48) |
| 0.70 | 50% (2/4) | 100% (14/14) | 25% (12/48) |
| 0.75 | 50% (2/4) | 93% (13/14) | 27% (13/48) |
| 0.80 | 50% (2/4) | 93% (13/14) | 29% (14/48) |
| 0.85 | 50% (2/4) | 93% (13/14) | 33% (16/48) |
| 0.90 | 75% (3/4) | 86% (12/14) | 40% (19/48) |
| 0.95 | 100% (4/4) | 57% (8/14) | 69% (33/48) |

Questions: 48. Judge prompt tokens: mean 385, max 520. Refused or failed: 0. Judge wall time: 226.6 s.

## g06-kenji-shipping

The following table gives, per threshold, the share of the 2 must-keep messages the selection keeps and the share of the 14 must-drop messages it drops, and the share of all 48 judged messages it keeps (the view the prompt would carry); a message is kept when its yes probability is above 1 minus the threshold, or when the judge gave no answer.

| threshold | keep rate | drop rate | kept share |
| ---: | ---: | ---: | ---: |
| 0.50 | 0% (0/2) | 100% (14/14) | 0% (0/48) |
| 0.55 | 0% (0/2) | 100% (14/14) | 0% (0/48) |
| 0.60 | 0% (0/2) | 100% (14/14) | 0% (0/48) |
| 0.65 | 0% (0/2) | 100% (14/14) | 0% (0/48) |
| 0.70 | 0% (0/2) | 100% (14/14) | 0% (0/48) |
| 0.75 | 0% (0/2) | 100% (14/14) | 2% (1/48) |
| 0.80 | 0% (0/2) | 100% (14/14) | 2% (1/48) |
| 0.85 | 50% (1/2) | 100% (14/14) | 6% (3/48) |
| 0.90 | 50% (1/2) | 100% (14/14) | 8% (4/48) |
| 0.95 | 50% (1/2) | 100% (14/14) | 15% (7/48) |

Questions: 48. Judge prompt tokens: mean 387, max 522. Refused or failed: 0. Judge wall time: 222.8 s.

## g07-depot-release

The following table gives, per threshold, the share of the 2 must-keep messages the selection keeps and the share of the 14 must-drop messages it drops, and the share of all 48 judged messages it keeps (the view the prompt would carry); a message is kept when its yes probability is above 1 minus the threshold, or when the judge gave no answer.

| threshold | keep rate | drop rate | kept share |
| ---: | ---: | ---: | ---: |
| 0.50 | 100% (2/2) | 100% (14/14) | 19% (9/48) |
| 0.55 | 100% (2/2) | 100% (14/14) | 19% (9/48) |
| 0.60 | 100% (2/2) | 100% (14/14) | 19% (9/48) |
| 0.65 | 100% (2/2) | 100% (14/14) | 19% (9/48) |
| 0.70 | 100% (2/2) | 100% (14/14) | 21% (10/48) |
| 0.75 | 100% (2/2) | 100% (14/14) | 23% (11/48) |
| 0.80 | 100% (2/2) | 100% (14/14) | 23% (11/48) |
| 0.85 | 100% (2/2) | 100% (14/14) | 23% (11/48) |
| 0.90 | 100% (2/2) | 86% (12/14) | 27% (13/48) |
| 0.95 | 100% (2/2) | 64% (9/14) | 40% (19/48) |

Questions: 48. Judge prompt tokens: mean 401, max 536. Refused or failed: 0. Judge wall time: 221.9 s.

## g08-halvorsen-credit

The following table gives, per threshold, the share of the 1 must-keep messages the selection keeps and the share of the 14 must-drop messages it drops, and the share of all 48 judged messages it keeps (the view the prompt would carry); a message is kept when its yes probability is above 1 minus the threshold, or when the judge gave no answer.

| threshold | keep rate | drop rate | kept share |
| ---: | ---: | ---: | ---: |
| 0.50 | 0% (0/1) | 100% (14/14) | 2% (1/48) |
| 0.55 | 0% (0/1) | 100% (14/14) | 2% (1/48) |
| 0.60 | 0% (0/1) | 100% (14/14) | 2% (1/48) |
| 0.65 | 0% (0/1) | 100% (14/14) | 6% (3/48) |
| 0.70 | 0% (0/1) | 100% (14/14) | 6% (3/48) |
| 0.75 | 0% (0/1) | 100% (14/14) | 10% (5/48) |
| 0.80 | 100% (1/1) | 100% (14/14) | 15% (7/48) |
| 0.85 | 100% (1/1) | 100% (14/14) | 17% (8/48) |
| 0.90 | 100% (1/1) | 93% (13/14) | 19% (9/48) |
| 0.95 | 100% (1/1) | 86% (12/14) | 33% (16/48) |

Questions: 48. Judge prompt tokens: mean 399, max 534. Refused or failed: 0. Judge wall time: 226.9 s.

## g09-kenji-gift-note

The following table gives, per threshold, the share of the 1 must-keep messages the selection keeps and the share of the 14 must-drop messages it drops, and the share of all 48 judged messages it keeps (the view the prompt would carry); a message is kept when its yes probability is above 1 minus the threshold, or when the judge gave no answer.

| threshold | keep rate | drop rate | kept share |
| ---: | ---: | ---: | ---: |
| 0.50 | 100% (1/1) | 100% (14/14) | 2% (1/48) |
| 0.55 | 100% (1/1) | 100% (14/14) | 2% (1/48) |
| 0.60 | 100% (1/1) | 100% (14/14) | 2% (1/48) |
| 0.65 | 100% (1/1) | 100% (14/14) | 4% (2/48) |
| 0.70 | 100% (1/1) | 100% (14/14) | 4% (2/48) |
| 0.75 | 100% (1/1) | 100% (14/14) | 4% (2/48) |
| 0.80 | 100% (1/1) | 100% (14/14) | 4% (2/48) |
| 0.85 | 100% (1/1) | 100% (14/14) | 4% (2/48) |
| 0.90 | 100% (1/1) | 100% (14/14) | 4% (2/48) |
| 0.95 | 100% (1/1) | 93% (13/14) | 17% (8/48) |

Questions: 48. Judge prompt tokens: mean 386, max 521. Refused or failed: 0. Judge wall time: 218.8 s.

## g10-sigrid-callback

The following table gives, per threshold, the share of the 1 must-keep messages the selection keeps and the share of the 14 must-drop messages it drops, and the share of all 48 judged messages it keeps (the view the prompt would carry); a message is kept when its yes probability is above 1 minus the threshold, or when the judge gave no answer.

| threshold | keep rate | drop rate | kept share |
| ---: | ---: | ---: | ---: |
| 0.50 | 100% (1/1) | 93% (13/14) | 15% (7/48) |
| 0.55 | 100% (1/1) | 93% (13/14) | 15% (7/48) |
| 0.60 | 100% (1/1) | 93% (13/14) | 15% (7/48) |
| 0.65 | 100% (1/1) | 93% (13/14) | 15% (7/48) |
| 0.70 | 100% (1/1) | 93% (13/14) | 15% (7/48) |
| 0.75 | 100% (1/1) | 93% (13/14) | 17% (8/48) |
| 0.80 | 100% (1/1) | 93% (13/14) | 17% (8/48) |
| 0.85 | 100% (1/1) | 93% (13/14) | 21% (10/48) |
| 0.90 | 100% (1/1) | 93% (13/14) | 23% (11/48) |
| 0.95 | 100% (1/1) | 86% (12/14) | 27% (13/48) |

Questions: 48. Judge prompt tokens: mean 395, max 530. Refused or failed: 0. Judge wall time: 224.0 s.

## All goals

The following table gives, per threshold, the share of the 21 must-keep messages the selection keeps and the share of the 140 must-drop messages it drops, and the share of all 480 judged messages it keeps (the view the prompt would carry); a message is kept when its yes probability is above 1 minus the threshold, or when the judge gave no answer.

| threshold | keep rate | drop rate | kept share |
| ---: | ---: | ---: | ---: |
| 0.50 | 67% (14/21) | 99% (139/140) | 11% (52/480) |
| 0.55 | 71% (15/21) | 99% (139/140) | 11% (54/480) |
| 0.60 | 71% (15/21) | 99% (139/140) | 13% (60/480) |
| 0.65 | 71% (15/21) | 99% (139/140) | 14% (65/480) |
| 0.70 | 71% (15/21) | 99% (139/140) | 14% (67/480) |
| 0.75 | 76% (16/21) | 99% (138/140) | 16% (75/480) |
| 0.80 | 81% (17/21) | 98% (137/140) | 17% (81/480) |
| 0.85 | 86% (18/21) | 98% (137/140) | 19% (90/480) |
| 0.90 | 90% (19/21) | 93% (130/140) | 23% (110/480) |
| 0.95 | 95% (20/21) | 81% (114/140) | 35% (169/480) |

Questions: 480. Judge prompt tokens: mean 392, max 536. Refused or failed: 1. Judge wall time: 2287.3 s.
