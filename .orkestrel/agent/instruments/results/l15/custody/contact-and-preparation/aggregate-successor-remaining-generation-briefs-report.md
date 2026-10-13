# Remaining generation brief preparation

Prepared the q2 and g2 generation briefs as literal adaptations of the accepted g4 brief. Both fresh briefs pass `brief.ts --check`. Generation remains unattempted for both prepared lanes; the root release hold and `RELEASED_HEAD` placeholder remain intact.

The complete direct diffs are retained at tmp/units/aggregate-successor-remaining-generation-briefs.diff:1. The supplied source-brief and plan seals matched before preparation and remained unchanged afterward.

The q2 adaptation changes only `g4` to `q2`, `Gemma4` to `Qwen2`, the fixed g4 plan seal to the supplied q2 seal, and the historical duration from 1456410 ms to 594801 ms. The g2 adaptation changes only `g4` to `g2`, `Gemma4` to `Gemma2`, the fixed g4 plan seal to the supplied g2 seal, and the historical duration to 1155940 ms. The durations are supplied observations from closed l14 generations; no future duration was measured. See tmp/units/aggregate-successor-model-q2-generation-brief.md:13, tmp/units/aggregate-successor-model-q2-generation-brief.md:55, tmp/units/aggregate-successor-model-g2-generation-brief.md:13, and tmp/units/aggregate-successor-model-g2-generation-brief.md:55.

The accepted runner seal, build/deployment references, endpoint, service identifier, caps, stage order, custody checks, no-fit boundary, no-retry rule, and root release requirement remain unchanged. See tmp/units/aggregate-successor-model-q2-generation-brief.md:33 and tmp/units/aggregate-successor-model-g2-generation-brief.md:33. Each brief must wait for root to release its model lane and HEAD.

The source and prepared artifact seals follow.

| Artifact under tmp/units | SHA-256 |
| --- | --- |
| `aggregate-successor-model-g4-generation-brief.md` | `5e9638c5b5ef1baf0b8eaa22ee885d9268679f67c6fb2cdfe7e036ab6984e801` |
| `aggregate-successor-model-q2-plan.json` | `5cd2cb31ae98c6643cdb83d7253c7259cd3afcf1bf3670d70adce270377ec622` |
| `aggregate-successor-model-g2-plan.json` | `4f875648d30934971697bd0959cc148ac32b5ddbb7b431dc3f672177a82c2619` |
| `aggregate-successor-model-q2-generation-brief.md` | `661bfa4ca26b05baeb83dd1617f92d6f0bc9f56f5561ae5c9cae6bdaf229d67c` |
| `aggregate-successor-model-g2-generation-brief.md` | `a8905db71c40671c4e222eeb69c59a4952d2279b1cfb76a512e9f11990363b09` |
| `aggregate-successor-remaining-generation-briefs.diff` | `5d6bc9b0e8c82d239f406a9162c7fa12ed1390fe715f679689c37f0730c9d08a` |

The preparation commands ran on Windows PowerShell from explicit cwd `C:/Users/mikes/WebstormProjects/scaffold`; every patch used an absolute scaffold path.

| Command | Exit | Result |
| --- | ---: | --- |
| `node .agents/skills/orkestrel-dispatch/scripts/brief.ts --unit aggregate-successor-model-q2-generation --lane units` | 0 | Fresh brief created, then filled from the accepted brief. |
| `node .agents/skills/orkestrel-dispatch/scripts/brief.ts --unit aggregate-successor-model-g2-generation --lane units` | 0 | Fresh brief created, then filled from the accepted brief. |
| `node .agents/skills/orkestrel-dispatch/scripts/brief.ts --check tmp/units/aggregate-successor-model-q2-generation-brief.md` | 0 | 10 paths checked; missing list empty. |
| `node .agents/skills/orkestrel-dispatch/scripts/brief.ts --check tmp/units/aggregate-successor-model-g2-generation-brief.md` | 0 | 10 paths checked; missing list empty. |
| `git --no-pager diff --no-index -- tmp/units/aggregate-successor-model-g4-generation-brief.md tmp/units/aggregate-successor-model-q2-generation-brief.md` | 1 | Complete allowed-only diff; exit 1 means differing files. |
| `git --no-pager diff --no-index -- tmp/units/aggregate-successor-model-g4-generation-brief.md tmp/units/aggregate-successor-model-g2-generation-brief.md` | 1 | Complete allowed-only diff; exit 1 means differing files. |

The diff file concatenates the complete unfiltered output of the direct comparisons. SHA-256 readings establish unchanged source brief and plans. No runner, dry run, plan preparer, model call, service operation, canonical edit, Git mutation, installation, publication, cleanup, or extra gate occurred. No actual run artifact or private grade was opened. Builder performed the preparation itself and spawned nothing.

`node .agents/skills/orkestrel-dispatch/scripts/cite.ts tmp/units/aggregate-successor-remaining-generation-briefs-report.md` exited 0 with 7 citations and 0 unresolved.
