# Larkspur Home support desk: category calibration

judge mica (num_ctx 4096), seed pass only (`--goals` is not read). 269 rows reuse records imported from `--judgments`; 364 questions, total wall time 765.0 s, 8.05 s per asked question. Judge prompt tokens: mean 162, max 209. Refused or failed: 8.

## Category

### Category, forward option order

The following table gives, per threshold, how many of the 41 messages read their truth category decisively (probability at or above the threshold), how many read another category decisively, and how many stay undecided. Refused or failed: 0. The first option (fact) is the argmax for 15 messages, against 13 whose truth it is, with a mean probability of 0.341.

| threshold | truth decisive | other decisive | undecided |
| ---: | ---: | ---: | ---: |
| 0.50 | 61% (25/41) | 34% (14/41) | 5% (2/41) |
| 0.55 | 61% (25/41) | 29% (12/41) | 10% (4/41) |
| 0.60 | 59% (24/41) | 27% (11/41) | 15% (6/41) |
| 0.65 | 59% (24/41) | 22% (9/41) | 20% (8/41) |
| 0.70 | 56% (23/41) | 17% (7/41) | 27% (11/41) |
| 0.75 | 51% (21/41) | 12% (5/41) | 37% (15/41) |
| 0.80 | 46% (19/41) | 10% (4/41) | 44% (18/41) |
| 0.85 | 39% (16/41) | 10% (4/41) | 51% (21/41) |
| 0.90 | 39% (16/41) | 5% (2/41) | 56% (23/41) |
| 0.95 | 27% (11/41) | 0% (0/41) | 73% (30/41) |

Argmax by truth: fact -> chatter 2; chatter -> request 1; rule -> rule 6; rule -> fact 1; distractor -> fact 2; chatter -> fact 1; fact -> request 1; fact -> fact 9; fact -> rule 1; distractor -> request 2; chatter -> distractor 1; distractor -> distractor 1; chatter -> chatter 4; correction -> correction 4; correction -> fact 2; distractor -> chatter 2; request -> request 1.

### Category, reverse option order

The following table gives, per threshold, how many of the 41 messages read their truth category decisively (probability at or above the threshold), how many read another category decisively, and how many stay undecided. Refused or failed: 0. The first option (distractor) is the argmax for 2 messages, against 7 whose truth it is, with a mean probability of 0.066.

| threshold | truth decisive | other decisive | undecided |
| ---: | ---: | ---: | ---: |
| 0.50 | 56% (23/41) | 29% (12/41) | 15% (6/41) |
| 0.55 | 54% (22/41) | 29% (12/41) | 17% (7/41) |
| 0.60 | 51% (21/41) | 29% (12/41) | 20% (8/41) |
| 0.65 | 51% (21/41) | 24% (10/41) | 24% (10/41) |
| 0.70 | 51% (21/41) | 20% (8/41) | 29% (12/41) |
| 0.75 | 51% (21/41) | 20% (8/41) | 29% (12/41) |
| 0.80 | 44% (18/41) | 15% (6/41) | 41% (17/41) |
| 0.85 | 39% (16/41) | 12% (5/41) | 49% (20/41) |
| 0.90 | 34% (14/41) | 5% (2/41) | 61% (25/41) |
| 0.95 | 20% (8/41) | 0% (0/41) | 80% (33/41) |

Argmax by truth: fact -> fact 11; chatter -> request 1; rule -> rule 6; rule -> fact 1; distractor -> fact 3; chatter -> fact 2; fact -> chatter 1; fact -> rule 1; distractor -> request 2; chatter -> distractor 1; distractor -> distractor 1; chatter -> opinion 1; correction -> correction 4; correction -> fact 2; request -> request 1; chatter -> chatter 2; distractor -> chatter 1.

The two orders agree on the argmax for 36 of 41 messages answered in both.

### Category gates, forward order

The chatter gate closes when the chatter and distractor probabilities sum to the threshold or more; the auto-pin class reads the fact, rule, and correction probabilities summed, over user messages. The following table gives the closures on the 14 truth chatter and distractor messages and on the 27 others, and the auto-pins of the 14 truth fact, rule, and correction user messages and of the 8 other user messages:

| threshold | gate closes on chatter and distractors | gate closes on others | auto-pins truth | auto-pins others |
| ---: | ---: | ---: | ---: | ---: |
| 0.50 | 57% (8/14) | 7% (2/27) | 86% (12/14) | 25% (2/8) |
| 0.55 | 57% (8/14) | 7% (2/27) | 86% (12/14) | 13% (1/8) |
| 0.60 | 57% (8/14) | 4% (1/27) | 86% (12/14) | 13% (1/8) |
| 0.65 | 57% (8/14) | 4% (1/27) | 86% (12/14) | 13% (1/8) |
| 0.70 | 57% (8/14) | 4% (1/27) | 86% (12/14) | 13% (1/8) |
| 0.75 | 50% (7/14) | 0% (0/27) | 86% (12/14) | 13% (1/8) |
| 0.80 | 36% (5/14) | 0% (0/27) | 79% (11/14) | 13% (1/8) |
| 0.85 | 29% (4/14) | 0% (0/27) | 71% (10/14) | 13% (1/8) |
| 0.90 | 29% (4/14) | 0% (0/27) | 64% (9/14) | 13% (1/8) |
| 0.95 | 29% (4/14) | 0% (0/27) | 64% (9/14) | 0% (0/8) |

Correction probability on the truth user corrections: m27 0.9689, m29 0.7171, m44 0.8156. The floor that opens every one is 0.7171, which also opens 0 other user messages (none).

## Topic

### All desk topics

The following table gives, per threshold, the share of the 38 truth topic pairs that read yes (probability at or above the threshold) and the share of the 208 other pairs that do not. Refused or failed: 8.

| threshold | truth yes read yes | truth no read not yes |
| ---: | ---: | ---: |
| 0.50 | 82% (31/38) | 96% (199/208) |
| 0.55 | 82% (31/38) | 97% (201/208) |
| 0.60 | 82% (31/38) | 97% (201/208) |
| 0.65 | 79% (30/38) | 97% (202/208) |
| 0.70 | 79% (30/38) | 98% (204/208) |
| 0.75 | 74% (28/38) | 99% (205/208) |
| 0.80 | 71% (27/38) | 99% (206/208) |
| 0.85 | 66% (25/38) | 99% (206/208) |
| 0.90 | 63% (24/38) | 100% (207/208) |
| 0.95 | 47% (18/38) | 100% (208/208) |

Largest grid threshold that reads every truth yes as yes: none. Lowest truth-yes probability: 0.0087; highest truth-no probability: 0.9449. Truth yes rows below 0.50: topic m6 delivery 0.44, topic m18 delivery 0.10, topic m22 delivery 0.01, topic m7 delivery 0.11, topic m19 delivery 0.03, topic m30 refunds 0.16, topic m43 returns 0.30.

### Topic refunds

The following table gives, per threshold, the share of the 8 messages whose truth carries refunds that read yes (probability at or above the threshold) and the share of the 33 other messages that do not. Refused or failed: 1.

| threshold | truth yes read yes | truth no read not yes |
| ---: | ---: | ---: |
| 0.50 | 88% (7/8) | 97% (32/33) |
| 0.55 | 88% (7/8) | 97% (32/33) |
| 0.60 | 88% (7/8) | 97% (32/33) |
| 0.65 | 75% (6/8) | 97% (32/33) |
| 0.70 | 75% (6/8) | 97% (32/33) |
| 0.75 | 75% (6/8) | 97% (32/33) |
| 0.80 | 63% (5/8) | 97% (32/33) |
| 0.85 | 63% (5/8) | 97% (32/33) |
| 0.90 | 63% (5/8) | 97% (32/33) |
| 0.95 | 38% (3/8) | 100% (33/33) |

Largest grid threshold that reads every truth yes as yes: none. Lowest truth-yes probability: 0.1590; highest truth-no probability: 0.9449. Truth yes rows below 0.50: topic m30 refunds 0.16.

### Topic returns

The following table gives, per threshold, the share of the 6 messages whose truth carries returns that read yes (probability at or above the threshold) and the share of the 35 other messages that do not. Refused or failed: 1.

| threshold | truth yes read yes | truth no read not yes |
| ---: | ---: | ---: |
| 0.50 | 83% (5/6) | 97% (34/35) |
| 0.55 | 83% (5/6) | 97% (34/35) |
| 0.60 | 83% (5/6) | 97% (34/35) |
| 0.65 | 83% (5/6) | 97% (34/35) |
| 0.70 | 83% (5/6) | 100% (35/35) |
| 0.75 | 83% (5/6) | 100% (35/35) |
| 0.80 | 83% (5/6) | 100% (35/35) |
| 0.85 | 83% (5/6) | 100% (35/35) |
| 0.90 | 83% (5/6) | 100% (35/35) |
| 0.95 | 67% (4/6) | 100% (35/35) |

Largest grid threshold that reads every truth yes as yes: none. Lowest truth-yes probability: 0.3038; highest truth-no probability: 0.6567. Truth yes rows below 0.50: topic m43 returns 0.30.

### Topic escalations

The following table gives, per threshold, the share of the 8 messages whose truth carries escalations that read yes (probability at or above the threshold) and the share of the 33 other messages that do not. Refused or failed: 1.

| threshold | truth yes read yes | truth no read not yes |
| ---: | ---: | ---: |
| 0.50 | 100% (8/8) | 94% (31/33) |
| 0.55 | 100% (8/8) | 94% (31/33) |
| 0.60 | 100% (8/8) | 94% (31/33) |
| 0.65 | 100% (8/8) | 94% (31/33) |
| 0.70 | 100% (8/8) | 97% (32/33) |
| 0.75 | 100% (8/8) | 97% (32/33) |
| 0.80 | 100% (8/8) | 97% (32/33) |
| 0.85 | 100% (8/8) | 97% (32/33) |
| 0.90 | 88% (7/8) | 100% (33/33) |
| 0.95 | 63% (5/8) | 100% (33/33) |

Largest grid threshold that reads every truth yes as yes: 0.85. Lowest truth-yes probability: 0.8538; highest truth-no probability: 0.8714.

### Topic delivery

The following table gives, per threshold, the share of the 12 messages whose truth carries delivery that read yes (probability at or above the threshold) and the share of the 29 other messages that do not. Refused or failed: 0.

| threshold | truth yes read yes | truth no read not yes |
| ---: | ---: | ---: |
| 0.50 | 58% (7/12) | 97% (28/29) |
| 0.55 | 58% (7/12) | 97% (28/29) |
| 0.60 | 58% (7/12) | 97% (28/29) |
| 0.65 | 58% (7/12) | 97% (28/29) |
| 0.70 | 58% (7/12) | 97% (28/29) |
| 0.75 | 50% (6/12) | 100% (29/29) |
| 0.80 | 50% (6/12) | 100% (29/29) |
| 0.85 | 50% (6/12) | 100% (29/29) |
| 0.90 | 50% (6/12) | 100% (29/29) |
| 0.95 | 42% (5/12) | 100% (29/29) |

Largest grid threshold that reads every truth yes as yes: none. Lowest truth-yes probability: 0.0087; highest truth-no probability: 0.7128. Truth yes rows below 0.50: topic m6 delivery 0.44, topic m18 delivery 0.10, topic m22 delivery 0.01, topic m7 delivery 0.11, topic m19 delivery 0.03.

### Topic warehouse

The following table gives, per threshold, the share of the 2 messages whose truth carries warehouse that read yes (probability at or above the threshold) and the share of the 39 other messages that do not. Refused or failed: 5.

| threshold | truth yes read yes | truth no read not yes |
| ---: | ---: | ---: |
| 0.50 | 100% (2/2) | 95% (37/39) |
| 0.55 | 100% (2/2) | 97% (38/39) |
| 0.60 | 100% (2/2) | 97% (38/39) |
| 0.65 | 100% (2/2) | 97% (38/39) |
| 0.70 | 100% (2/2) | 97% (38/39) |
| 0.75 | 100% (2/2) | 97% (38/39) |
| 0.80 | 100% (2/2) | 100% (39/39) |
| 0.85 | 0% (0/2) | 100% (39/39) |
| 0.90 | 0% (0/2) | 100% (39/39) |
| 0.95 | 0% (0/2) | 100% (39/39) |

Largest grid threshold that reads every truth yes as yes: 0.80. Lowest truth-yes probability: 0.8473; highest truth-no probability: 0.7558.

### Topic contacts

The following table gives, per threshold, the share of the 2 messages whose truth carries contacts that read yes (probability at or above the threshold) and the share of the 39 other messages that do not. Refused or failed: 0.

| threshold | truth yes read yes | truth no read not yes |
| ---: | ---: | ---: |
| 0.50 | 100% (2/2) | 95% (37/39) |
| 0.55 | 100% (2/2) | 97% (38/39) |
| 0.60 | 100% (2/2) | 97% (38/39) |
| 0.65 | 100% (2/2) | 100% (39/39) |
| 0.70 | 100% (2/2) | 100% (39/39) |
| 0.75 | 50% (1/2) | 100% (39/39) |
| 0.80 | 50% (1/2) | 100% (39/39) |
| 0.85 | 50% (1/2) | 100% (39/39) |
| 0.90 | 50% (1/2) | 100% (39/39) |
| 0.95 | 50% (1/2) | 100% (39/39) |

Largest grid threshold that reads every truth yes as yes: 0.70. Lowest truth-yes probability: 0.7406; highest truth-no probability: 0.6312.

### Topic acceptance

The following table gives, per topic threshold, the goal facts and ground-truth pair members that carry no topic (entity topics from the registry plus the decided desk topics) and the ground-truth pairs that share no topic:

| threshold | untopiced facts | untopiced pair members | pairs sharing no topic |
| ---: | --- | --- | --- |
| 0.50 | none | none | none |
| 0.55 | none | none | none |
| 0.60 | none | none | none |
| 0.65 | m29 | m29 | m2-m29, m3-m29 |
| 0.70 | m29 | m29 | m2-m29, m3-m29 |
| 0.75 | m29 | m29 | m2-m29, m3-m29 |
| 0.80 | m2, m29 | m2, m29 | m2-m29, m3-m29 |
| 0.85 | m2, m29 | m2, m29 | m2-m29, m3-m29 |
| 0.90 | m2, m29 | m2, m29 | m2-m29, m3-m29 |
| 0.95 | m2, m6, m8, m18, m29 | m2, m29 | m2-m29, m3-m29 |

## Supersession

### amends

The following table gives, per threshold, the share of the 6 ground-truth pairs that read yes (probability at or above the threshold) and the share of the 12 other screened pairs that do not. Refused or failed: 0.

| threshold | truth yes read yes | truth no read not yes |
| ---: | ---: | ---: |
| 0.50 | 100% (6/6) | 75% (9/12) |
| 0.55 | 100% (6/6) | 75% (9/12) |
| 0.60 | 100% (6/6) | 75% (9/12) |
| 0.65 | 100% (6/6) | 75% (9/12) |
| 0.70 | 100% (6/6) | 83% (10/12) |
| 0.75 | 100% (6/6) | 83% (10/12) |
| 0.80 | 83% (5/6) | 92% (11/12) |
| 0.85 | 83% (5/6) | 100% (12/12) |
| 0.90 | 83% (5/6) | 100% (12/12) |
| 0.95 | 83% (5/6) | 100% (12/12) |

Largest grid threshold that reads every truth yes as yes: 0.75. Lowest truth-yes probability: 0.7736; highest truth-no probability: 0.8346.

### supersedes

The following table gives, per threshold, the share of the 2 ground-truth supersessions that read yes (probability at or above the threshold) and the share of the 16 other screened pairs that do not. Refused or failed: 0.

| threshold | truth yes read yes | truth no read not yes |
| ---: | ---: | ---: |
| 0.50 | 100% (2/2) | 81% (13/16) |
| 0.55 | 100% (2/2) | 81% (13/16) |
| 0.60 | 100% (2/2) | 81% (13/16) |
| 0.65 | 100% (2/2) | 88% (14/16) |
| 0.70 | 100% (2/2) | 94% (15/16) |
| 0.75 | 100% (2/2) | 94% (15/16) |
| 0.80 | 100% (2/2) | 94% (15/16) |
| 0.85 | 100% (2/2) | 94% (15/16) |
| 0.90 | 100% (2/2) | 94% (15/16) |
| 0.95 | 100% (2/2) | 100% (16/16) |

Largest grid threshold that reads every truth yes as yes: 0.95. Lowest truth-yes probability: 0.9735; highest truth-no probability: 0.9461.
