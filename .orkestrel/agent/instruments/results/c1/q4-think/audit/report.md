valid: true; verdict: inconclusive
- The records arm ended with status overflow after 47 complete goals.
- The full arm ended with status overflow after 2 complete goals.
- The records arm did not complete the horizon, so no arm verdict follows.
status: {"records":"overflow","compaction":"complete","full":"overflow"}; served: {"records":48,"compaction":96,"full":5}
audit: leaks {}; foreign 0; controls missed ["missed ambiguous control ev-control-ambiguous"]

### Overall: shifts 1 to 24, 96 goals

| Arm | Served | Judged | facts | work | obligations | revision | evidence | Critical | Folded | Omitted |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| records | 48 | 48 | 55% (105/190) | 37% (53/144) | 33% (58/176) | 30% (35/116) | 81% (78/96) | 11 | 0 | 46 |
| compaction | 92 | 92 | 51% (201/391) | 28% (82/292) | 26% (87/332) | 32% (68/213) | 62% (114/184) | 26 | 91 | 21 |
| full | 2 | 2 | 58% (7/12) | 17% (1/6) | 30% (3/10) | 75% (3/4) | 100% (4/4) | 0 | 0 | 1 |

| Pair vs records | Goals | Wins | Losses | Ties | Gain low..high | Critical regressions |
| --- | --- | --- | --- | --- | --- | --- |
| compaction | 44 | 0 | 1 | 43 | -1..-1 | 9 |
| full | 2 | 0 | 0 | 2 | 0..0 | 0 |

### Interval: shifts 1 to 4, 16 goals

| Arm | Served | Judged | facts | work | obligations | revision | evidence | Critical | Folded | Omitted |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| records | 16 | 16 | 65% (44/68) | 44% (23/52) | 37% (25/68) | 64% (18/28) | 81% (26/32) | 4 | 0 | 15 |
| compaction | 15 | 15 | 74% (49/66) | 39% (19/49) | 41% (26/63) | 69% (18/26) | 73% (22/30) | 2 | 14 | 4 |
| full | 2 | 2 | 58% (7/12) | 17% (1/6) | 30% (3/10) | 75% (3/4) | 100% (4/4) | 0 | 0 | 1 |

| Pair vs records | Goals | Wins | Losses | Ties | Gain low..high | Critical regressions |
| --- | --- | --- | --- | --- | --- | --- |
| compaction | 15 | 0 | 0 | 15 | 0..0 | 2 |
| full | 2 | 0 | 0 | 2 | 0..0 | 0 |

### Interval: shifts 5 to 8, 16 goals

| Arm | Served | Judged | facts | work | obligations | revision | evidence | Critical | Folded | Omitted |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| records | 16 | 16 | 46% (23/50) | 38% (18/48) | 27% (15/56) | 12% (6/50) | 81% (26/32) | 3 | 0 | 16 |
| compaction | 15 | 15 | 49% (23/47) | 40% (18/45) | 16% (8/51) | 16% (7/43) | 57% (17/30) | 7 | 15 | 3 |
| full | 0 | 0 | - | - | - | - | - | 0 | 0 | 0 |

| Pair vs records | Goals | Wins | Losses | Ties | Gain low..high | Critical regressions |
| --- | --- | --- | --- | --- | --- | --- |
| compaction | 15 | 0 | 0 | 15 | 0..0 | 5 |
| full | 0 | 0 | 0 | 0 | 0..0 | 0 |

### Interval: shifts 9 to 12, 16 goals

| Arm | Served | Judged | facts | work | obligations | revision | evidence | Critical | Folded | Omitted |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| records | 16 | 16 | 53% (38/72) | 27% (12/44) | 35% (18/52) | 29% (11/38) | 81% (26/32) | 4 | 0 | 15 |
| compaction | 14 | 14 | 55% (36/66) | 26% (10/38) | 18% (8/44) | 50% (16/32) | 71% (20/28) | 2 | 14 | 3 |
| full | 0 | 0 | - | - | - | - | - | 0 | 0 | 0 |

| Pair vs records | Goals | Wins | Losses | Ties | Gain low..high | Critical regressions |
| --- | --- | --- | --- | --- | --- | --- |
| compaction | 14 | 0 | 1 | 13 | -1..-1 | 2 |
| full | 0 | 0 | 0 | 0 | 0..0 | 0 |

### Interval: shifts 13 to 16, 16 goals

| Arm | Served | Judged | facts | work | obligations | revision | evidence | Critical | Folded | Omitted |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| records | 0 | 0 | - | - | - | - | - | 0 | 0 | 0 |
| compaction | 16 | 16 | 32% (22/68) | 18% (10/56) | 33% (24/72) | 13% (7/52) | 59% (19/32) | 5 | 16 | 4 |
| full | 0 | 0 | - | - | - | - | - | 0 | 0 | 0 |

| Pair vs records | Goals | Wins | Losses | Ties | Gain low..high | Critical regressions |
| --- | --- | --- | --- | --- | --- | --- |
| compaction | 0 | 0 | 0 | 0 | 0..0 | 0 |
| full | 0 | 0 | 0 | 0 | 0..0 | 0 |

### Interval: shifts 17 to 20, 16 goals

| Arm | Served | Judged | facts | work | obligations | revision | evidence | Critical | Folded | Omitted |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| records | 0 | 0 | - | - | - | - | - | 0 | 0 | 0 |
| compaction | 16 | 16 | 47% (34/72) | 25% (14/56) | 15% (8/52) | 38% (12/32) | 56% (18/32) | 3 | 16 | 4 |
| full | 0 | 0 | - | - | - | - | - | 0 | 0 | 0 |

| Pair vs records | Goals | Wins | Losses | Ties | Gain low..high | Critical regressions |
| --- | --- | --- | --- | --- | --- | --- |
| compaction | 0 | 0 | 0 | 0 | 0..0 | 0 |
| full | 0 | 0 | 0 | 0 | 0..0 | 0 |

### Interval: shifts 21 to 24, 16 goals

| Arm | Served | Judged | facts | work | obligations | revision | evidence | Critical | Folded | Omitted |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| records | 0 | 0 | - | - | - | - | - | 0 | 0 | 0 |
| compaction | 16 | 16 | 51% (37/72) | 23% (11/48) | 26% (13/50) | 29% (8/28) | 56% (18/32) | 7 | 16 | 3 |
| full | 0 | 0 | - | - | - | - | - | 0 | 0 | 0 |

| Pair vs records | Goals | Wins | Losses | Ties | Gain low..high | Critical regressions |
| --- | --- | --- | --- | --- | --- | --- |
| compaction | 0 | 0 | 0 | 0 | 0..0 | 0 |
| full | 0 | 0 | 0 | 0 | 0..0 | 0 |

### Final: shifts 21 to 24, 16 goals

| Arm | Served | Judged | facts | work | obligations | revision | evidence | Critical | Folded | Omitted |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| records | 0 | 0 | - | - | - | - | - | 0 | 0 | 0 |
| compaction | 16 | 16 | 51% (37/72) | 23% (11/48) | 26% (13/50) | 29% (8/28) | 56% (18/32) | 7 | 16 | 3 |
| full | 0 | 0 | - | - | - | - | - | 0 | 0 | 0 |

| Pair vs records | Goals | Wins | Losses | Ties | Gain low..high | Critical regressions |
| --- | --- | --- | --- | --- | --- | --- |
| compaction | 0 | 0 | 0 | 0 | 0..0 | 0 |
| full | 0 | 0 | 0 | 0 | 0..0 | 0 |

### Costs

- records: {"arm":"records","status":"overflow","served":48,"truncated":36,"reading":{"wire":[{"role":"agent","phase":"calibration","requests":2,"wall":19269,"prompt":3207,"completion":2,"missing":0},{"role":"agent","phase":"trajectory","requests":136,"wall":2526168,"prompt":288337,"completion":100058,"missing":1},{"role":"judge","phase":"trajectory","requests":1291,"wall":1822109,"prompt":362350,"completion":1291,"missing":0},{"role":"flush","phase":"trajectory","requests":48,"wall":260319,"prompt":1056,"completion":48,"missing":0}],"elapsed":4638362,"flush":260353.25470000046},"total":{"prompt":654950,"completion":101399,"missing":1},"judge":{"requests":1291,"prompt":362350,"completion":1291},"summarizer":{"requests":0,"prompt":0,"completion":0}}
- compaction: {"arm":"compaction","status":"complete","served":96,"truncated":53,"reading":{"wire":[{"role":"agent","phase":"calibration","requests":2,"wall":18001,"prompt":3207,"completion":2,"missing":0},{"role":"agent","phase":"trajectory","requests":152,"wall":3349599,"prompt":278308,"completion":113474,"missing":0},{"role":"summarizer","phase":"trajectory","requests":107,"wall":1066005,"prompt":114917,"completion":31275,"missing":0},{"role":"flush","phase":"trajectory","requests":96,"wall":522950,"prompt":2112,"completion":96,"missing":0}],"elapsed":4958892,"flush":523029.97029999946},"total":{"prompt":398544,"completion":144847,"missing":0},"judge":{"requests":0,"prompt":0,"completion":0},"summarizer":{"requests":107,"prompt":114917,"completion":31275}}
- full: {"arm":"full","status":"overflow","served":5,"truncated":4,"reading":{"wire":[{"role":"agent","phase":"calibration","requests":2,"wall":17904,"prompt":3207,"completion":2,"missing":0},{"role":"agent","phase":"trajectory","requests":7,"wall":140239,"prompt":15399,"completion":3795,"missing":1},{"role":"flush","phase":"trajectory","requests":5,"wall":27452,"prompt":110,"completion":5,"missing":0}],"elapsed":185741,"flush":27456.484600001015},"total":{"prompt":18716,"completion":3802,"missing":1},"judge":{"requests":0,"prompt":0,"completion":0},"summarizer":{"requests":0,"prompt":0,"completion":0}}
