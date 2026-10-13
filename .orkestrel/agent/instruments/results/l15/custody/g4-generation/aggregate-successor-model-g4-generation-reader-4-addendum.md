# G4 generation reader 4 addendum

The prior generation report and all earlier reader captures remain unchanged. Reader 4 corrected only the temporary import path to the emitted vendor module resolved by the canonical fit caller, then ran once against retained evidence. It exited 0 in 775.761 ms with empty stderr.

The emitted readers accepted the generation manifest as complete with zero generation errors. Corpus hash is `918b239b97d41d98e7c18d9ab2d0ef4060011eb50c1fc8ccb34d391ed34d3aa6`, covering 162 contexts and 24 points. Attempts hash is `a47701990322dce8ea572b41be2454feed000e691bf79b60c2e8947c27191591`; the file is 3,754,306 bytes with 179 attempts: 53 sent, 126 unsent, zero unmeasured, and zero errors. Packet hash is `64b0f89566458745c8099e9351db3b44686102145721ef9395bbd8e06e9d57f5`; it is 3,263,411 bytes with 179 items. The reader verified the exact packet-to-attempt join and full coverage of all 162 corpus contexts.

The retained evidence hash is `d15258229eaea08aa0431bde2b95750f4e8deb6ae7a7a90754ddc803ebbbcac8`; it contains 12 controls, 53 cache summary rows, and 190 cache judge rows. Emitted cost recomputation reported:

| Phase and role | Requests | Wall time | Prompt tokens | Completion tokens | Missing usage |
|---|---:|---:|---:|---:|---:|
| trajectory summarizer | 53 | 688,320.8044 ms | 37,103 | 6,342 | 0 |
| trajectory judge | 165 | 634,676.1719 ms | 177,349 | 165 | 0 |
| controls judge | 25 | 56,496.7934 ms | 18,236 | 25 | 0 |

There were zero cost failures and 448 replayed cache reads. Model identity and answer content are omitted.

Complete captures are `tmp/units/aggregate-successor-model-g4-generation-read-4.stdout.txt`, `tmp/units/aggregate-successor-model-g4-generation-read-4.stderr.txt`, `tmp/units/aggregate-successor-model-g4-generation-read-4.exit.txt`, and `tmp/units/aggregate-successor-model-g4-generation-read-4.duration-ms.txt`. The stdout contains the emitted reader's machine summary; exit and duration receipts are independently retained. This addendum validates generation artifacts only; no fit or labels were run.

Evidence: the successful emitted-reader summary is [reader-4 stdout](tmp/units/aggregate-successor-model-g4-generation-read-4.stdout.txt:1); its exact process outcome and duration are [reader-4 exit](tmp/units/aggregate-successor-model-g4-generation-read-4.exit.txt:1) and [reader-4 duration](tmp/units/aggregate-successor-model-g4-generation-read-4.duration-ms.txt:1). The frozen generation terminal receipt remains [generation stage error capture](.orkestrel/agent/instruments/results/l15/logs/g4-calibration-generate.err:1).
