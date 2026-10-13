# Larkspur Home support desk: judge drift

g01-luis-refund-amount, state bounded (neighbors 2), criterion lookup, judge mica (num_ctx 4096). 48 paired questions of 48; wall 293.7 s.

Identical request bodies across passes: 48 of 48.
|p1 - p2|: median 0.0000, 90th percentile 0.0000, largest 0.0000 (seed 0: 0.6564 against 0.6564).
Decisions that flip at threshold 0.9 (drop when p <= 0.1000): 0.

| abs(p1 - p2) | questions |
| --- | ---: |
| 0 | 48 |
| (0, 0.001) | 0 |
| [0.001, 0.01) | 0 |
| [0.01, 0.05) | 0 |
| 0.05 or more | 0 |
