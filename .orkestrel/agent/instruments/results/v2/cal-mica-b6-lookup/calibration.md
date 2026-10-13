# Larkspur Home support desk: calibration

state bounded (neighbors 6), criterion lookup, judge mica (num_ctx 4096). 10 goals, 480 questions, total wall time 3440.9 s.

## g01-luis-refund-amount

The following table gives, per threshold, the share of the 3 must-keep messages the selection keeps and the share of the 14 must-drop messages it drops, and the share of all 48 judged messages it keeps (the view the prompt would carry); a message is kept when its yes probability is above 1 minus the threshold, or when the judge gave no answer.

| threshold | keep rate | drop rate | kept share |
| ---: | ---: | ---: | ---: |
| 0.50 | 100% (3/3) | 86% (12/14) | 25% (12/48) |
| 0.55 | 100% (3/3) | 86% (12/14) | 27% (13/48) |
| 0.60 | 100% (3/3) | 86% (12/14) | 27% (13/48) |
| 0.65 | 100% (3/3) | 86% (12/14) | 31% (15/48) |
| 0.70 | 100% (3/3) | 86% (12/14) | 31% (15/48) |
| 0.75 | 100% (3/3) | 86% (12/14) | 33% (16/48) |
| 0.80 | 100% (3/3) | 86% (12/14) | 35% (17/48) |
| 0.85 | 100% (3/3) | 79% (11/14) | 42% (20/48) |
| 0.90 | 100% (3/3) | 79% (11/14) | 54% (26/48) |
| 0.95 | 100% (3/3) | 50% (7/14) | 77% (37/48) |

Questions: 48. Judge prompt tokens: mean 634, max 762. Refused or failed: 0. Judge wall time: 351.9 s.

## g02-luis-card

The following table gives, per threshold, the share of the 1 must-keep messages the selection keeps and the share of the 14 must-drop messages it drops, and the share of all 48 judged messages it keeps (the view the prompt would carry); a message is kept when its yes probability is above 1 minus the threshold, or when the judge gave no answer.

| threshold | keep rate | drop rate | kept share |
| ---: | ---: | ---: | ---: |
| 0.50 | 0% (0/1) | 100% (14/14) | 2% (1/48) |
| 0.55 | 0% (0/1) | 100% (14/14) | 2% (1/48) |
| 0.60 | 0% (0/1) | 100% (14/14) | 2% (1/48) |
| 0.65 | 0% (0/1) | 100% (14/14) | 4% (2/48) |
| 0.70 | 0% (0/1) | 100% (14/14) | 6% (3/48) |
| 0.75 | 0% (0/1) | 100% (14/14) | 13% (6/48) |
| 0.80 | 0% (0/1) | 100% (14/14) | 15% (7/48) |
| 0.85 | 100% (1/1) | 100% (14/14) | 25% (12/48) |
| 0.90 | 100% (1/1) | 93% (13/14) | 29% (14/48) |
| 0.95 | 100% (1/1) | 64% (9/14) | 63% (30/48) |

Questions: 48. Judge prompt tokens: mean 636, max 764. Refused or failed: 0. Judge wall time: 335.8 s.

## g03-grace-escalation

The following table gives, per threshold, the share of the 3 must-keep messages the selection keeps and the share of the 14 must-drop messages it drops, and the share of all 48 judged messages it keeps (the view the prompt would carry); a message is kept when its yes probability is above 1 minus the threshold, or when the judge gave no answer.

| threshold | keep rate | drop rate | kept share |
| ---: | ---: | ---: | ---: |
| 0.50 | 100% (3/3) | 93% (13/14) | 33% (16/48) |
| 0.55 | 100% (3/3) | 86% (12/14) | 35% (17/48) |
| 0.60 | 100% (3/3) | 86% (12/14) | 38% (18/48) |
| 0.65 | 100% (3/3) | 86% (12/14) | 38% (18/48) |
| 0.70 | 100% (3/3) | 86% (12/14) | 38% (18/48) |
| 0.75 | 100% (3/3) | 79% (11/14) | 42% (20/48) |
| 0.80 | 100% (3/3) | 79% (11/14) | 42% (20/48) |
| 0.85 | 100% (3/3) | 79% (11/14) | 44% (21/48) |
| 0.90 | 100% (3/3) | 79% (11/14) | 48% (23/48) |
| 0.95 | 100% (3/3) | 64% (9/14) | 63% (30/48) |

Questions: 48. Judge prompt tokens: mean 647, max 775. Refused or failed: 0. Judge wall time: 341.8 s.

## g04-halvorsen-ticket

The following table gives, per threshold, the share of the 3 must-keep messages the selection keeps and the share of the 14 must-drop messages it drops, and the share of all 48 judged messages it keeps (the view the prompt would carry); a message is kept when its yes probability is above 1 minus the threshold, or when the judge gave no answer.

| threshold | keep rate | drop rate | kept share |
| ---: | ---: | ---: | ---: |
| 0.50 | 100% (3/3) | 93% (13/14) | 21% (10/48) |
| 0.55 | 100% (3/3) | 86% (12/14) | 23% (11/48) |
| 0.60 | 100% (3/3) | 86% (12/14) | 23% (11/48) |
| 0.65 | 100% (3/3) | 86% (12/14) | 23% (11/48) |
| 0.70 | 100% (3/3) | 86% (12/14) | 25% (12/48) |
| 0.75 | 100% (3/3) | 86% (12/14) | 29% (14/48) |
| 0.80 | 100% (3/3) | 79% (11/14) | 35% (17/48) |
| 0.85 | 100% (3/3) | 79% (11/14) | 48% (23/48) |
| 0.90 | 100% (3/3) | 57% (8/14) | 67% (32/48) |
| 0.95 | 100% (3/3) | 36% (5/14) | 85% (41/48) |

Questions: 48. Judge prompt tokens: mean 635, max 763. Refused or failed: 0. Judge wall time: 342.9 s.

## g05-luis-approval-note

The following table gives, per threshold, the share of the 4 must-keep messages the selection keeps and the share of the 14 must-drop messages it drops, and the share of all 48 judged messages it keeps (the view the prompt would carry); a message is kept when its yes probability is above 1 minus the threshold, or when the judge gave no answer.

| threshold | keep rate | drop rate | kept share |
| ---: | ---: | ---: | ---: |
| 0.50 | 50% (2/4) | 100% (14/14) | 31% (15/48) |
| 0.55 | 50% (2/4) | 100% (14/14) | 31% (15/48) |
| 0.60 | 50% (2/4) | 93% (13/14) | 33% (16/48) |
| 0.65 | 50% (2/4) | 93% (13/14) | 33% (16/48) |
| 0.70 | 50% (2/4) | 86% (12/14) | 40% (19/48) |
| 0.75 | 50% (2/4) | 86% (12/14) | 44% (21/48) |
| 0.80 | 50% (2/4) | 79% (11/14) | 50% (24/48) |
| 0.85 | 50% (2/4) | 79% (11/14) | 58% (28/48) |
| 0.90 | 50% (2/4) | 64% (9/14) | 67% (32/48) |
| 0.95 | 100% (4/4) | 36% (5/14) | 88% (42/48) |

Questions: 48. Judge prompt tokens: mean 632, max 760. Refused or failed: 0. Judge wall time: 337.8 s.

## g06-kenji-shipping

The following table gives, per threshold, the share of the 2 must-keep messages the selection keeps and the share of the 14 must-drop messages it drops, and the share of all 48 judged messages it keeps (the view the prompt would carry); a message is kept when its yes probability is above 1 minus the threshold, or when the judge gave no answer.

| threshold | keep rate | drop rate | kept share |
| ---: | ---: | ---: | ---: |
| 0.50 | 0% (0/2) | 100% (14/14) | 4% (2/48) |
| 0.55 | 0% (0/2) | 100% (14/14) | 4% (2/48) |
| 0.60 | 0% (0/2) | 100% (14/14) | 6% (3/48) |
| 0.65 | 0% (0/2) | 100% (14/14) | 8% (4/48) |
| 0.70 | 50% (1/2) | 100% (14/14) | 10% (5/48) |
| 0.75 | 50% (1/2) | 100% (14/14) | 13% (6/48) |
| 0.80 | 50% (1/2) | 100% (14/14) | 17% (8/48) |
| 0.85 | 50% (1/2) | 86% (12/14) | 23% (11/48) |
| 0.90 | 50% (1/2) | 79% (11/14) | 38% (18/48) |
| 0.95 | 100% (2/2) | 43% (6/14) | 65% (31/48) |

Questions: 48. Judge prompt tokens: mean 634, max 762. Refused or failed: 0. Judge wall time: 339.5 s.

## g07-depot-release

The following table gives, per threshold, the share of the 2 must-keep messages the selection keeps and the share of the 14 must-drop messages it drops, and the share of all 48 judged messages it keeps (the view the prompt would carry); a message is kept when its yes probability is above 1 minus the threshold, or when the judge gave no answer.

| threshold | keep rate | drop rate | kept share |
| ---: | ---: | ---: | ---: |
| 0.50 | 0% (0/2) | 86% (12/14) | 29% (14/48) |
| 0.55 | 50% (1/2) | 86% (12/14) | 31% (15/48) |
| 0.60 | 50% (1/2) | 86% (12/14) | 31% (15/48) |
| 0.65 | 50% (1/2) | 86% (12/14) | 38% (18/48) |
| 0.70 | 50% (1/2) | 86% (12/14) | 38% (18/48) |
| 0.75 | 50% (1/2) | 86% (12/14) | 42% (20/48) |
| 0.80 | 100% (2/2) | 86% (12/14) | 46% (22/48) |
| 0.85 | 100% (2/2) | 71% (10/14) | 52% (25/48) |
| 0.90 | 100% (2/2) | 57% (8/14) | 63% (30/48) |
| 0.95 | 100% (2/2) | 36% (5/14) | 79% (38/48) |

Questions: 48. Judge prompt tokens: mean 648, max 776. Refused or failed: 0. Judge wall time: 343.7 s.

## g08-halvorsen-credit

The following table gives, per threshold, the share of the 1 must-keep messages the selection keeps and the share of the 14 must-drop messages it drops, and the share of all 48 judged messages it keeps (the view the prompt would carry); a message is kept when its yes probability is above 1 minus the threshold, or when the judge gave no answer.

| threshold | keep rate | drop rate | kept share |
| ---: | ---: | ---: | ---: |
| 0.50 | 100% (1/1) | 100% (14/14) | 6% (3/48) |
| 0.55 | 100% (1/1) | 100% (14/14) | 10% (5/48) |
| 0.60 | 100% (1/1) | 100% (14/14) | 10% (5/48) |
| 0.65 | 100% (1/1) | 100% (14/14) | 15% (7/48) |
| 0.70 | 100% (1/1) | 93% (13/14) | 21% (10/48) |
| 0.75 | 100% (1/1) | 93% (13/14) | 23% (11/48) |
| 0.80 | 100% (1/1) | 93% (13/14) | 29% (14/48) |
| 0.85 | 100% (1/1) | 86% (12/14) | 40% (19/48) |
| 0.90 | 100% (1/1) | 64% (9/14) | 48% (23/48) |
| 0.95 | 100% (1/1) | 36% (5/14) | 75% (36/48) |

Questions: 48. Judge prompt tokens: mean 646, max 774. Refused or failed: 0. Judge wall time: 346.6 s.

## g09-kenji-gift-note

The following table gives, per threshold, the share of the 1 must-keep messages the selection keeps and the share of the 14 must-drop messages it drops, and the share of all 48 judged messages it keeps (the view the prompt would carry); a message is kept when its yes probability is above 1 minus the threshold, or when the judge gave no answer.

| threshold | keep rate | drop rate | kept share |
| ---: | ---: | ---: | ---: |
| 0.50 | 100% (1/1) | 100% (14/14) | 2% (1/48) |
| 0.55 | 100% (1/1) | 100% (14/14) | 2% (1/48) |
| 0.60 | 100% (1/1) | 100% (14/14) | 2% (1/48) |
| 0.65 | 100% (1/1) | 100% (14/14) | 2% (1/48) |
| 0.70 | 100% (1/1) | 100% (14/14) | 4% (2/48) |
| 0.75 | 100% (1/1) | 100% (14/14) | 8% (4/48) |
| 0.80 | 100% (1/1) | 100% (14/14) | 10% (5/48) |
| 0.85 | 100% (1/1) | 93% (13/14) | 15% (7/48) |
| 0.90 | 100% (1/1) | 86% (12/14) | 33% (16/48) |
| 0.95 | 100% (1/1) | 71% (10/14) | 52% (25/48) |

Questions: 48. Judge prompt tokens: mean 633, max 761. Refused or failed: 0. Judge wall time: 349.2 s.

## g10-sigrid-callback

The following table gives, per threshold, the share of the 1 must-keep messages the selection keeps and the share of the 14 must-drop messages it drops, and the share of all 48 judged messages it keeps (the view the prompt would carry); a message is kept when its yes probability is above 1 minus the threshold, or when the judge gave no answer.

| threshold | keep rate | drop rate | kept share |
| ---: | ---: | ---: | ---: |
| 0.50 | 100% (1/1) | 86% (12/14) | 19% (9/48) |
| 0.55 | 100% (1/1) | 79% (11/14) | 21% (10/48) |
| 0.60 | 100% (1/1) | 79% (11/14) | 25% (12/48) |
| 0.65 | 100% (1/1) | 79% (11/14) | 27% (13/48) |
| 0.70 | 100% (1/1) | 79% (11/14) | 31% (15/48) |
| 0.75 | 100% (1/1) | 71% (10/14) | 38% (18/48) |
| 0.80 | 100% (1/1) | 64% (9/14) | 42% (20/48) |
| 0.85 | 100% (1/1) | 64% (9/14) | 42% (20/48) |
| 0.90 | 100% (1/1) | 57% (8/14) | 50% (24/48) |
| 0.95 | 100% (1/1) | 36% (5/14) | 65% (31/48) |

Questions: 48. Judge prompt tokens: mean 642, max 770. Refused or failed: 0. Judge wall time: 351.7 s.

## All goals

The following table gives, per threshold, the share of the 21 must-keep messages the selection keeps and the share of the 140 must-drop messages it drops, and the share of all 480 judged messages it keeps (the view the prompt would carry); a message is kept when its yes probability is above 1 minus the threshold, or when the judge gave no answer.

| threshold | keep rate | drop rate | kept share |
| ---: | ---: | ---: | ---: |
| 0.50 | 67% (14/21) | 94% (132/140) | 17% (83/480) |
| 0.55 | 71% (15/21) | 92% (129/140) | 19% (90/480) |
| 0.60 | 71% (15/21) | 91% (128/140) | 20% (95/480) |
| 0.65 | 71% (15/21) | 91% (128/140) | 22% (105/480) |
| 0.70 | 76% (16/21) | 90% (126/140) | 24% (117/480) |
| 0.75 | 76% (16/21) | 89% (124/140) | 28% (136/480) |
| 0.80 | 81% (17/21) | 86% (121/140) | 32% (154/480) |
| 0.85 | 86% (18/21) | 81% (114/140) | 39% (186/480) |
| 0.90 | 86% (18/21) | 71% (100/140) | 50% (238/480) |
| 0.95 | 100% (21/21) | 47% (66/140) | 71% (341/480) |

Questions: 480. Judge prompt tokens: mean 638, max 776. Refused or failed: 0. Judge wall time: 3440.8 s.
