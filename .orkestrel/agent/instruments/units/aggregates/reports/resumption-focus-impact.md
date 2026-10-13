# Aggregate focus impact lookup, corrected paths

## Finding

Across the four retained l7 cohorts, the exact `cause-removed` candidate occurred zero times and the exact `both-removed` candidate occurred zero times. The declared substring occurred once, in Qwen 2B. Its settled label is `unsupported`; no substring match is labeled supported.

## Target wording

The candidates came from `tmp/units/aggregate-admission-screen-r2/packet-final.json`:

- `cause-removed`: `(2026-10-10) user: Grace Okafor still wants her own replacement duvet set despite the locker trace revealing a twin duvet addressed to someone else.\n(2026-10-10) user: Escalation ESC-2219 remains open because Sigrid reports two of the 8 pendants have cracked glass, requiring an electrician's repair before replacement can proceed.\n(2026-10-10) user: Grace Okafor has not yet received a replacement for her duvet set; Owen Pritchard leaving Copperline yesterday and the new buyer Hana Ikeda only having email contact information available.`
- `both-removed`: `(2026-10-10) user: Grace Okafor still wants her own replacement duvet set despite the locker trace revealing a twin duvet addressed to someone else.\n(2026-10-10) user: Escalation ESC-2219 remains open because Sigrid reports two of the 8 pendants have cracked glass.\n(2026-10-10) user: Grace Okafor has not yet received a replacement for her duvet set; Owen Pritchard leaving Copperline yesterday and the new buyer Hana Ikeda only having email contact information available.`

The exact substring searched was `Escalation ESC-2219 remains open because Sigrid reports`.

## Cohort enumeration and joins

All paths below resolve from `.orkestrel/agent/instruments`, so the artifact root is `.orkestrel/agent/instruments/results/l7/calibration`. Generated text was read from each cohort's `generation/attempts.jsonl`; generated item IDs were checked against `generation/packet.jsonl`, then joined to settled `labels.json` by the shared `id`. The label record's `item` hash is included for the matching item.

| Cohort | Generated attempts | Packet items | Settled labels | Exact cause-removed | Exact both-removed | Substring | Unjoined IDs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Qwen 2B (`q2`) | 168 | 168 | 168 | 0 | 0 | 1 | 0 |
| Gemma 2B (`g2`) | 174 | 174 | 174 | 0 | 0 | 0 | 0 |
| Gemma 4B (`g4`) | 179 | 179 | 179 | 0 | 0 | 0 | 0 |
| Qwen 4B (`q4`) | 171 | 171 | 171 | 0 | 0 | 0 | 0 |
| **Total** | **692** | **692** | **692** | **0** | **0** | **1** | **0** |

The substring match is Qwen 2B item `fbb56761-030c-4056-bee5-e1def8cc9aba`, label item hash `8a4dcaf39a0081bdabbaaaf83659fc3b28f80745d6d7353651e4526833e077aa`, settled label `unsupported`. Its exact generated text is:

> (2026-10-10) user: Grace Okafor still wants her own replacement duvet set despite the locker trace revealing a twin duvet addressed to someone else.  
> (2026-10-10) user: Escalation ESC-2219 remains open because Sigrid reports two of the 8 pendants have cracked glass, requiring an electrician's repair before replacement can proceed.  
> (2026-10-10) user: Grace Okafor has not yet received a replacement for her duvet set due to Owen Pritchard leaving Copperline yesterday and the new buyer Hana Ikeda only having email contact information available.

## Paths

| Cohort | Generated items | Settled labels | Location reference |
| --- | --- | --- | --- |
| Qwen 2B (`q2`) | `.orkestrel/agent/instruments/results/l7/calibration/q2/generation/attempts.jsonl` and `packet.jsonl` | `.orkestrel/agent/instruments/results/l7/calibration/q2/labels.json` | `.orkestrel/agent/instruments/units/aggregates/reports/resumption-l7-q2-adjudication.md` |
| Gemma 2B (`g2`) | `.orkestrel/agent/instruments/results/l7/calibration/g2/generation/attempts.jsonl` and `packet.jsonl` | `.orkestrel/agent/instruments/results/l7/calibration/g2/labels.json` | `.orkestrel/agent/instruments/units/aggregates/reports/resumption-l7-g2-adjudication.md` |
| Gemma 4B (`g4`) | `.orkestrel/agent/instruments/results/l7/calibration/g4/generation/attempts.jsonl` and `packet.jsonl` | `.orkestrel/agent/instruments/results/l7/calibration/g4/labels.json` | `.orkestrel/agent/instruments/units/aggregates/reports/resumption-l7-g4-adjudication.md` |
| Qwen 4B (`q4`) | `.orkestrel/agent/instruments/results/l7/calibration/q4/generation/attempts.jsonl` and `packet.jsonl` | `.orkestrel/agent/instruments/results/l7/calibration/q4/labels.json` | `.orkestrel/agent/instruments/units/aggregates/reports/resumption-l7-q4-adjudication.md` |

## Evidence and limits

The bounded PowerShell enumeration parsed only generated `id` and `prose`, packet `id`, and settled label `id`, `item`, and `verdict`. It counted full-string equality separately for each target candidate and used ordinal substring containment for the declared phrase. Every generated ID appeared in its packet and settled labels; there were no unresolved joins. The exact-match incidence is limited to these retained l7 calibration artifacts. It does not establish any broader label-validity claim.
