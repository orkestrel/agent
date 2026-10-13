# Larkspur Home support desk: calibration

unit exchange, state bounded (neighbors 2 exchanges), criterion lookup, judge mica (num_ctx 4096). 10 goals, 220 questions, total wall time 1505.4 s.

## g01-luis-refund-amount

The following table gives, per threshold, the share of the 2 must-keep exchanges (6 messages) the selection keeps, the share of the 7 must-drop exchanges (13 messages) it drops, and the share of all 22 judged exchanges (48 messages) it keeps; each cell gives the share over exchanges, then over the messages they carry. An exchange is kept when its yes probability is above 1 minus the threshold, or when the judge gave no answer.

| threshold | keep rate | drop rate | kept share |
| ---: | ---: | ---: | ---: |
| 0.50 | 50% (1/2); 33% (2/6) | 100% (7/7); 100% (13/13) | 9% (2/22); 8% (4/48) |
| 0.55 | 50% (1/2); 33% (2/6) | 100% (7/7); 100% (13/13) | 14% (3/22); 13% (6/48) |
| 0.60 | 50% (1/2); 33% (2/6) | 86% (6/7); 85% (11/13) | 18% (4/22); 17% (8/48) |
| 0.65 | 50% (1/2); 33% (2/6) | 86% (6/7); 85% (11/13) | 18% (4/22); 17% (8/48) |
| 0.70 | 50% (1/2); 33% (2/6) | 86% (6/7); 85% (11/13) | 27% (6/22); 23% (11/48) |
| 0.75 | 50% (1/2); 33% (2/6) | 86% (6/7); 85% (11/13) | 27% (6/22); 23% (11/48) |
| 0.80 | 100% (2/2); 100% (6/6) | 86% (6/7); 85% (11/13) | 32% (7/22); 31% (15/48) |
| 0.85 | 100% (2/2); 100% (6/6) | 86% (6/7); 85% (11/13) | 36% (8/22); 35% (17/48) |
| 0.90 | 100% (2/2); 100% (6/6) | 71% (5/7); 69% (9/13) | 45% (10/22); 44% (21/48) |
| 0.95 | 100% (2/2); 100% (6/6) | 14% (1/7); 15% (2/13) | 91% (20/22); 92% (44/48) |

Questions: 22, one per exchange. Judge prompt tokens: mean 583, max 763. Refused or failed: 0. Judge wall time: 172.3 s.

## g02-luis-card

The following table gives, per threshold, the share of the 1 must-keep exchanges (4 messages) the selection keeps, the share of the 7 must-drop exchanges (13 messages) it drops, and the share of all 22 judged exchanges (48 messages) it keeps; each cell gives the share over exchanges, then over the messages they carry. An exchange is kept when its yes probability is above 1 minus the threshold, or when the judge gave no answer.

| threshold | keep rate | drop rate | kept share |
| ---: | ---: | ---: | ---: |
| 0.50 | 0% (0/1); 0% (0/4) | 100% (7/7); 100% (13/13) | 0% (0/22); 0% (0/48) |
| 0.55 | 0% (0/1); 0% (0/4) | 100% (7/7); 100% (13/13) | 0% (0/22); 0% (0/48) |
| 0.60 | 0% (0/1); 0% (0/4) | 100% (7/7); 100% (13/13) | 0% (0/22); 0% (0/48) |
| 0.65 | 0% (0/1); 0% (0/4) | 100% (7/7); 100% (13/13) | 0% (0/22); 0% (0/48) |
| 0.70 | 0% (0/1); 0% (0/4) | 100% (7/7); 100% (13/13) | 0% (0/22); 0% (0/48) |
| 0.75 | 0% (0/1); 0% (0/4) | 100% (7/7); 100% (13/13) | 0% (0/22); 0% (0/48) |
| 0.80 | 100% (1/1); 100% (4/4) | 100% (7/7); 100% (13/13) | 9% (2/22); 17% (8/48) |
| 0.85 | 100% (1/1); 100% (4/4) | 100% (7/7); 100% (13/13) | 9% (2/22); 17% (8/48) |
| 0.90 | 100% (1/1); 100% (4/4) | 86% (6/7); 85% (11/13) | 14% (3/22); 21% (10/48) |
| 0.95 | 100% (1/1); 100% (4/4) | 71% (5/7); 69% (9/13) | 36% (8/22); 48% (23/48) |

Questions: 22, one per exchange. Judge prompt tokens: mean 585, max 765. Refused or failed: 0. Judge wall time: 150.4 s.

## g03-grace-escalation

The following table gives, per threshold, the share of the 3 must-keep exchanges (9 messages) the selection keeps, the share of the 7 must-drop exchanges (13 messages) it drops, and the share of all 22 judged exchanges (48 messages) it keeps; each cell gives the share over exchanges, then over the messages they carry. An exchange is kept when its yes probability is above 1 minus the threshold, or when the judge gave no answer.

| threshold | keep rate | drop rate | kept share |
| ---: | ---: | ---: | ---: |
| 0.50 | 100% (3/3); 100% (9/9) | 100% (7/7); 100% (13/13) | 23% (5/22); 27% (13/48) |
| 0.55 | 100% (3/3); 100% (9/9) | 100% (7/7); 100% (13/13) | 23% (5/22); 27% (13/48) |
| 0.60 | 100% (3/3); 100% (9/9) | 100% (7/7); 100% (13/13) | 23% (5/22); 27% (13/48) |
| 0.65 | 100% (3/3); 100% (9/9) | 100% (7/7); 100% (13/13) | 23% (5/22); 27% (13/48) |
| 0.70 | 100% (3/3); 100% (9/9) | 100% (7/7); 100% (13/13) | 23% (5/22); 27% (13/48) |
| 0.75 | 100% (3/3); 100% (9/9) | 100% (7/7); 100% (13/13) | 23% (5/22); 27% (13/48) |
| 0.80 | 100% (3/3); 100% (9/9) | 86% (6/7); 85% (11/13) | 36% (8/22); 38% (18/48) |
| 0.85 | 100% (3/3); 100% (9/9) | 86% (6/7); 85% (11/13) | 36% (8/22); 38% (18/48) |
| 0.90 | 100% (3/3); 100% (9/9) | 57% (4/7); 54% (7/13) | 45% (10/22); 46% (22/48) |
| 0.95 | 100% (3/3); 100% (9/9) | 43% (3/7); 46% (6/13) | 82% (18/22); 79% (38/48) |

Questions: 22, one per exchange. Judge prompt tokens: mean 596, max 776. Refused or failed: 0. Judge wall time: 150.2 s.

## g04-halvorsen-ticket

The following table gives, per threshold, the share of the 2 must-keep exchanges (4 messages) the selection keeps, the share of the 7 must-drop exchanges (13 messages) it drops, and the share of all 22 judged exchanges (48 messages) it keeps; each cell gives the share over exchanges, then over the messages they carry. An exchange is kept when its yes probability is above 1 minus the threshold, or when the judge gave no answer.

| threshold | keep rate | drop rate | kept share |
| ---: | ---: | ---: | ---: |
| 0.50 | 100% (2/2); 100% (4/4) | 100% (7/7); 100% (13/13) | 18% (4/22); 21% (10/48) |
| 0.55 | 100% (2/2); 100% (4/4) | 100% (7/7); 100% (13/13) | 18% (4/22); 21% (10/48) |
| 0.60 | 100% (2/2); 100% (4/4) | 100% (7/7); 100% (13/13) | 18% (4/22); 21% (10/48) |
| 0.65 | 100% (2/2); 100% (4/4) | 86% (6/7); 85% (11/13) | 23% (5/22); 25% (12/48) |
| 0.70 | 100% (2/2); 100% (4/4) | 86% (6/7); 85% (11/13) | 23% (5/22); 25% (12/48) |
| 0.75 | 100% (2/2); 100% (4/4) | 57% (4/7); 54% (7/13) | 36% (8/22); 38% (18/48) |
| 0.80 | 100% (2/2); 100% (4/4) | 57% (4/7); 54% (7/13) | 36% (8/22); 38% (18/48) |
| 0.85 | 100% (2/2); 100% (4/4) | 57% (4/7); 54% (7/13) | 55% (12/22); 56% (27/48) |
| 0.90 | 100% (2/2); 100% (4/4) | 43% (3/7); 46% (6/13) | 64% (14/22); 63% (30/48) |
| 0.95 | 100% (2/2); 100% (4/4) | 29% (2/7); 31% (4/13) | 86% (19/22); 88% (42/48) |

Questions: 22, one per exchange. Judge prompt tokens: mean 584, max 764. Refused or failed: 0. Judge wall time: 147.4 s.

## g05-luis-approval-note

The following table gives, per threshold, the share of the 3 must-keep exchanges (8 messages) the selection keeps, the share of the 7 must-drop exchanges (13 messages) it drops, and the share of all 22 judged exchanges (48 messages) it keeps; each cell gives the share over exchanges, then over the messages they carry. An exchange is kept when its yes probability is above 1 minus the threshold, or when the judge gave no answer.

| threshold | keep rate | drop rate | kept share |
| ---: | ---: | ---: | ---: |
| 0.50 | 67% (2/3); 75% (6/8) | 100% (7/7); 100% (13/13) | 23% (5/22); 25% (12/48) |
| 0.55 | 67% (2/3); 75% (6/8) | 100% (7/7); 100% (13/13) | 23% (5/22); 25% (12/48) |
| 0.60 | 67% (2/3); 75% (6/8) | 100% (7/7); 100% (13/13) | 27% (6/22); 33% (16/48) |
| 0.65 | 67% (2/3); 75% (6/8) | 100% (7/7); 100% (13/13) | 27% (6/22); 33% (16/48) |
| 0.70 | 67% (2/3); 75% (6/8) | 100% (7/7); 100% (13/13) | 36% (8/22); 40% (19/48) |
| 0.75 | 67% (2/3); 75% (6/8) | 86% (6/7); 85% (11/13) | 41% (9/22); 44% (21/48) |
| 0.80 | 67% (2/3); 75% (6/8) | 86% (6/7); 85% (11/13) | 41% (9/22); 44% (21/48) |
| 0.85 | 67% (2/3); 75% (6/8) | 57% (4/7); 54% (7/13) | 55% (12/22); 56% (27/48) |
| 0.90 | 100% (3/3); 100% (8/8) | 43% (3/7); 38% (5/13) | 73% (16/22); 73% (35/48) |
| 0.95 | 100% (3/3); 100% (8/8) | 29% (2/7); 31% (4/13) | 91% (20/22); 92% (44/48) |

Questions: 22, one per exchange. Judge prompt tokens: mean 581, max 761. Refused or failed: 0. Judge wall time: 145.7 s.

## g06-kenji-shipping

The following table gives, per threshold, the share of the 2 must-keep exchanges (4 messages) the selection keeps, the share of the 7 must-drop exchanges (13 messages) it drops, and the share of all 22 judged exchanges (48 messages) it keeps; each cell gives the share over exchanges, then over the messages they carry. An exchange is kept when its yes probability is above 1 minus the threshold, or when the judge gave no answer.

| threshold | keep rate | drop rate | kept share |
| ---: | ---: | ---: | ---: |
| 0.50 | 0% (0/2); 0% (0/4) | 100% (7/7); 100% (13/13) | 0% (0/22); 0% (0/48) |
| 0.55 | 0% (0/2); 0% (0/4) | 100% (7/7); 100% (13/13) | 0% (0/22); 0% (0/48) |
| 0.60 | 0% (0/2); 0% (0/4) | 100% (7/7); 100% (13/13) | 0% (0/22); 0% (0/48) |
| 0.65 | 0% (0/2); 0% (0/4) | 100% (7/7); 100% (13/13) | 0% (0/22); 0% (0/48) |
| 0.70 | 0% (0/2); 0% (0/4) | 100% (7/7); 100% (13/13) | 0% (0/22); 0% (0/48) |
| 0.75 | 0% (0/2); 0% (0/4) | 100% (7/7); 100% (13/13) | 5% (1/22); 4% (2/48) |
| 0.80 | 0% (0/2); 0% (0/4) | 100% (7/7); 100% (13/13) | 5% (1/22); 4% (2/48) |
| 0.85 | 50% (1/2); 50% (2/4) | 100% (7/7); 100% (13/13) | 9% (2/22); 8% (4/48) |
| 0.90 | 50% (1/2); 50% (2/4) | 71% (5/7); 69% (9/13) | 23% (5/22); 19% (9/48) |
| 0.95 | 50% (1/2); 50% (2/4) | 43% (3/7); 46% (6/13) | 64% (14/22); 67% (32/48) |

Questions: 22, one per exchange. Judge prompt tokens: mean 583, max 763. Refused or failed: 0. Judge wall time: 145.2 s.

## g07-depot-release

The following table gives, per threshold, the share of the 2 must-keep exchanges (5 messages) the selection keeps, the share of the 7 must-drop exchanges (13 messages) it drops, and the share of all 22 judged exchanges (48 messages) it keeps; each cell gives the share over exchanges, then over the messages they carry. An exchange is kept when its yes probability is above 1 minus the threshold, or when the judge gave no answer.

| threshold | keep rate | drop rate | kept share |
| ---: | ---: | ---: | ---: |
| 0.50 | 100% (2/2); 100% (5/5) | 71% (5/7); 69% (9/13) | 41% (9/22); 38% (18/48) |
| 0.55 | 100% (2/2); 100% (5/5) | 71% (5/7); 69% (9/13) | 41% (9/22); 38% (18/48) |
| 0.60 | 100% (2/2); 100% (5/5) | 57% (4/7); 54% (7/13) | 50% (11/22); 46% (22/48) |
| 0.65 | 100% (2/2); 100% (5/5) | 57% (4/7); 54% (7/13) | 55% (12/22); 54% (26/48) |
| 0.70 | 100% (2/2); 100% (5/5) | 57% (4/7); 54% (7/13) | 59% (13/22); 58% (28/48) |
| 0.75 | 100% (2/2); 100% (5/5) | 57% (4/7); 54% (7/13) | 59% (13/22); 58% (28/48) |
| 0.80 | 100% (2/2); 100% (5/5) | 57% (4/7); 54% (7/13) | 59% (13/22); 58% (28/48) |
| 0.85 | 100% (2/2); 100% (5/5) | 57% (4/7); 54% (7/13) | 59% (13/22); 58% (28/48) |
| 0.90 | 100% (2/2); 100% (5/5) | 43% (3/7); 46% (6/13) | 68% (15/22); 71% (34/48) |
| 0.95 | 100% (2/2); 100% (5/5) | 14% (1/7); 15% (2/13) | 95% (21/22); 96% (46/48) |

Questions: 22, one per exchange. Judge prompt tokens: mean 597, max 777. Refused or failed: 0. Judge wall time: 149.7 s.

## g08-halvorsen-credit

The following table gives, per threshold, the share of the 1 must-keep exchanges (2 messages) the selection keeps, the share of the 7 must-drop exchanges (13 messages) it drops, and the share of all 22 judged exchanges (48 messages) it keeps; each cell gives the share over exchanges, then over the messages they carry. An exchange is kept when its yes probability is above 1 minus the threshold, or when the judge gave no answer.

| threshold | keep rate | drop rate | kept share |
| ---: | ---: | ---: | ---: |
| 0.50 | 0% (0/1); 0% (0/2) | 100% (7/7); 100% (13/13) | 5% (1/22); 8% (4/48) |
| 0.55 | 100% (1/1); 100% (2/2) | 100% (7/7); 100% (13/13) | 9% (2/22); 13% (6/48) |
| 0.60 | 100% (1/1); 100% (2/2) | 100% (7/7); 100% (13/13) | 9% (2/22); 13% (6/48) |
| 0.65 | 100% (1/1); 100% (2/2) | 100% (7/7); 100% (13/13) | 9% (2/22); 13% (6/48) |
| 0.70 | 100% (1/1); 100% (2/2) | 100% (7/7); 100% (13/13) | 9% (2/22); 13% (6/48) |
| 0.75 | 100% (1/1); 100% (2/2) | 86% (6/7); 85% (11/13) | 14% (3/22); 17% (8/48) |
| 0.80 | 100% (1/1); 100% (2/2) | 71% (5/7); 69% (9/13) | 23% (5/22); 29% (14/48) |
| 0.85 | 100% (1/1); 100% (2/2) | 71% (5/7); 69% (9/13) | 23% (5/22); 29% (14/48) |
| 0.90 | 100% (1/1); 100% (2/2) | 71% (5/7); 69% (9/13) | 32% (7/22); 38% (18/48) |
| 0.95 | 100% (1/1); 100% (2/2) | 14% (1/7); 15% (2/13) | 82% (18/22); 77% (37/48) |

Questions: 22, one per exchange. Judge prompt tokens: mean 595, max 775. Refused or failed: 0. Judge wall time: 146.8 s.

## g09-kenji-gift-note

The following table gives, per threshold, the share of the 1 must-keep exchanges (2 messages) the selection keeps, the share of the 7 must-drop exchanges (13 messages) it drops, and the share of all 22 judged exchanges (48 messages) it keeps; each cell gives the share over exchanges, then over the messages they carry. An exchange is kept when its yes probability is above 1 minus the threshold, or when the judge gave no answer.

| threshold | keep rate | drop rate | kept share |
| ---: | ---: | ---: | ---: |
| 0.50 | 100% (1/1); 100% (2/2) | 100% (7/7); 100% (13/13) | 5% (1/22); 4% (2/48) |
| 0.55 | 100% (1/1); 100% (2/2) | 100% (7/7); 100% (13/13) | 5% (1/22); 4% (2/48) |
| 0.60 | 100% (1/1); 100% (2/2) | 100% (7/7); 100% (13/13) | 5% (1/22); 4% (2/48) |
| 0.65 | 100% (1/1); 100% (2/2) | 100% (7/7); 100% (13/13) | 5% (1/22); 4% (2/48) |
| 0.70 | 100% (1/1); 100% (2/2) | 100% (7/7); 100% (13/13) | 5% (1/22); 4% (2/48) |
| 0.75 | 100% (1/1); 100% (2/2) | 100% (7/7); 100% (13/13) | 5% (1/22); 4% (2/48) |
| 0.80 | 100% (1/1); 100% (2/2) | 100% (7/7); 100% (13/13) | 5% (1/22); 4% (2/48) |
| 0.85 | 100% (1/1); 100% (2/2) | 86% (6/7); 85% (11/13) | 14% (3/22); 13% (6/48) |
| 0.90 | 100% (1/1); 100% (2/2) | 86% (6/7); 85% (11/13) | 18% (4/22); 15% (7/48) |
| 0.95 | 100% (1/1); 100% (2/2) | 57% (4/7); 54% (7/13) | 64% (14/22); 71% (34/48) |

Questions: 22, one per exchange. Judge prompt tokens: mean 582, max 762. Refused or failed: 0. Judge wall time: 147.0 s.

## g10-sigrid-callback

The following table gives, per threshold, the share of the 1 must-keep exchanges (1 messages) the selection keeps, the share of the 7 must-drop exchanges (13 messages) it drops, and the share of all 22 judged exchanges (48 messages) it keeps; each cell gives the share over exchanges, then over the messages they carry. An exchange is kept when its yes probability is above 1 minus the threshold, or when the judge gave no answer.

| threshold | keep rate | drop rate | kept share |
| ---: | ---: | ---: | ---: |
| 0.50 | 100% (1/1); 100% (1/1) | 86% (6/7); 85% (11/13) | 27% (6/22); 27% (13/48) |
| 0.55 | 100% (1/1); 100% (1/1) | 86% (6/7); 85% (11/13) | 27% (6/22); 27% (13/48) |
| 0.60 | 100% (1/1); 100% (1/1) | 86% (6/7); 85% (11/13) | 27% (6/22); 27% (13/48) |
| 0.65 | 100% (1/1); 100% (1/1) | 71% (5/7); 69% (9/13) | 32% (7/22); 31% (15/48) |
| 0.70 | 100% (1/1); 100% (1/1) | 71% (5/7); 69% (9/13) | 32% (7/22); 31% (15/48) |
| 0.75 | 100% (1/1); 100% (1/1) | 57% (4/7); 62% (8/13) | 41% (9/22); 38% (18/48) |
| 0.80 | 100% (1/1); 100% (1/1) | 57% (4/7); 62% (8/13) | 41% (9/22); 38% (18/48) |
| 0.85 | 100% (1/1); 100% (1/1) | 57% (4/7); 62% (8/13) | 45% (10/22); 46% (22/48) |
| 0.90 | 100% (1/1); 100% (1/1) | 57% (4/7); 62% (8/13) | 55% (12/22); 52% (25/48) |
| 0.95 | 100% (1/1); 100% (1/1) | 29% (2/7); 31% (4/13) | 68% (15/22); 65% (31/48) |

Questions: 22, one per exchange. Judge prompt tokens: mean 591, max 771. Refused or failed: 0. Judge wall time: 150.6 s.

## All goals

The following table gives, per threshold, the share of the 18 must-keep exchanges (45 messages) the selection keeps, the share of the 70 must-drop exchanges (130 messages) it drops, and the share of all 220 judged exchanges (480 messages) it keeps; each cell gives the share over exchanges, then over the messages they carry. An exchange is kept when its yes probability is above 1 minus the threshold, or when the judge gave no answer.

| threshold | keep rate | drop rate | kept share |
| ---: | ---: | ---: | ---: |
| 0.50 | 67% (12/18); 64% (29/45) | 96% (67/70); 95% (124/130) | 15% (33/220); 16% (76/480) |
| 0.55 | 72% (13/18); 69% (31/45) | 96% (67/70); 95% (124/130) | 16% (35/220); 17% (80/480) |
| 0.60 | 72% (13/18); 69% (31/45) | 93% (65/70); 92% (120/130) | 18% (39/220); 19% (90/480) |
| 0.65 | 72% (13/18); 69% (31/45) | 90% (63/70); 89% (116/130) | 19% (42/220); 20% (98/480) |
| 0.70 | 72% (13/18); 69% (31/45) | 90% (63/70); 89% (116/130) | 21% (47/220); 22% (106/480) |
| 0.75 | 72% (13/18); 69% (31/45) | 83% (58/70); 82% (107/130) | 25% (55/220); 25% (121/480) |
| 0.80 | 83% (15/18); 87% (39/45) | 80% (56/70); 79% (103/130) | 29% (63/220); 30% (144/480) |
| 0.85 | 89% (16/18); 91% (41/45) | 76% (53/70); 75% (97/130) | 34% (75/220); 36% (171/480) |
| 0.90 | 94% (17/18); 96% (43/45) | 63% (44/70); 62% (81/130) | 44% (96/220); 44% (211/480) |
| 0.95 | 94% (17/18); 96% (43/45) | 34% (24/70); 35% (46/130) | 76% (167/220); 77% (371/480) |

Questions: 220, one per exchange. Judge prompt tokens: mean 587, max 777. Refused or failed: 0. Judge wall time: 1505.3 s.
