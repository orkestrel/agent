# Pins, lifetimes, and the gate: v8 ledger run

Sources: rows in `results/v8/ledger/ledger.jsonl`; agent calls in `results/v8/ledger-wire` (`agent_calls.json` here, built by `wire_dump.py`); pin numbering and topics from `results/v7/ledger-smoke.log` lines 32-49; horizon replay in `horizon_sim.py`, which reproduces every row's `ends` and `routes.touch`.

## Pin register

| pin | source | route | value | rendered in | end |
|---|---|---|---|---|---|
| p1 | r1 (LH-77302) | settle, seed | whole | g03 | retired after g06; right (no later Grace goal) |
| p2 | r2 (LH-20418) | settle, seed | whole | g03 | retired after g06; right |
| p3 | r3 (LH-80941) | settle, seed | whole | none before it ended | retired after g03; restored by p20 at g04; net zero |
| p4 | r4 (LH-79215) | settle, seed | whole | g01 | superseded by r5 in g01 (same lookup, identical text); right, no effect |
| p5 | m2 (MX-4471 rule) | auto | whole | 10 of 10, with m29 beside it | never (rule) |
| p6 | m4 (15 percent fee) | auto | whole | none | superseded by m44 at seed (judge); right; fee never rendered |
| p7 | m6 (Priya; no dates) | auto | whole | 10 of 10 | never (rule) |
| p8 | m8 (Tomasz) | auto | whole | 10 of 10 | never (rule) |
| p9 | m9 (printer jam, distractor) | auto | whole | g03, g06, g07, g10 | never; wrong pin (judge read fact 0.902) |
| p10 | m13 (Grace ticket) | auto | whole | g03, g06, g07, g10 | never |
| p11 | m18 (Marcus sign-off) | auto | whole | 10 of 10 | never (judge read rule) |
| p12 | m22 (ESC-2291) | auto | whole | g03, g04, g07, g08, g10 with m27 | never |
| p13 | m24 (Sigrid, ext 4127) | auto | whole | none before it ended | retired after g03; restored by p21 at g04 |
| p14 | m27 (ESC-2219) | auto | whole | 10 of 10 | never |
| p15 | m29 (MX-4486) | auto | whole | 10 of 10 | retired after g08; still renders through m2's amend chain |
| p16 | m40 (Luis return) | auto | whole | g05 | retired after g08; right |
| p17 | m44 (fee withdrawn) | auto | whole | g04-g08 | retired after g08; drops from g09, g10 |
| p18 | r5 (LH-79215) | deny, g01 | whole | g02, g05 | retired after g08; right |
| p19 | r7 (LH-44870) | deny, g02 | whole | g05 | retired after g08; right |
| p20 | r3 | touch, g04 | whole | g04, g07, g08, g10 | live |
| p21 | m24 | touch, g04 | whole | g04, g07, g08, g10 | live |
| p22 | r19 (LH-81660) | deny, g06 | whole | g09 | live |
| p23 | r22 (LH-31055, switchboard 555-0142) | deny, g08 | whole | g10 | live; renders the decoy g10 failed on |

Loose units rendered under `## Pinned` without a pin: m11 (g06, g07, g09), m34 (g04, g06, g07, g08, g10), m40 (g05 before p16 ended). No `## Values` section rendered in any of the 10 briefings.

## Model tool calls

| goal | call (wire) | tool and arguments | returned | needed |
|---|---|---|---|---|
| g01 | 00013 | recall LH-79215 | p4 ended line, r5, m43, r4, m40 | no; r4 in briefing, r5 in turn |
| g02 | 00026 | pin r7, value = whole r7 text | `pinned p19 from r7 (whole)`, the deny pin | no; no-op |
| g03 | 00036 | recall LH-20418 Grace Okafor | m19, m18, m17, r2, r1, m13 | no; m18, r1, r2, m13, m6 in briefing |
| g03 | 00037 | recall m19 assistant | nothing | no; handle plus role word fails |
| g03 | 00038 | recall escalations | Halvorsen m28, m27, m23, m22 | no |
| g03 | 00039, 00040 | recall m18 user, twice | nothing; then repeat notice | no |
| g03 | 00041 | recall escalations | closed refusal | no |
| g04 | 00051, 00052 | recall LH-31055 Halvorsen Interiors; recall ESC-2219 | r3, m34, m28, m27, m24, m22; m27 | no; m27 in briefing |
| g05 | 00062-00065 | recall refunds; escalations x3 | p6 ended line, m45, m44, m40, m29, m5, m4, m3, m2; Halvorsen and Grace lines; repeat; closed | no; m2, m29, m44, r5 in briefing |
| g06 | 00076 | recall m11 | m11 | no; m11 in briefing, not needed by request |
| g06 | 00078 | pin r19, value = whole r19 text | `pin is closed for the rest of this request` | no |
| g07 | 00088 | recall LH-80941 | m37, r3, m23, m27, m22 | no; r3 in briefing; m8 not returned |
| g08 | 00100 | pin r22, value = whole r22 text | `pinned p23 from r22 (whole)`, the deny pin | no; no-op |
| g09 | 00110 | recall LH-81660 | r19, m11 | no; both in briefing |
| g10 | 00120 | recall LH-31055 | r22 first (555-0142), r3, m34, m28, m27, m24 | no; m24 in briefing; repeats the decoy |

read: 0 calls in 38 agent calls.
