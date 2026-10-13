# Aggregate continuous transfer proof

Validation passed against the intact emitted build at HEAD `6099fd155d3382e91f80e80b17f9a6d47638c30f`. `readBuild()` confirmed current source equality and the build manifest hash `0db4bd7e9f43a7ba8fff1e79a826a52d114db6c8e90de34b8e139737de43b3fc` (494 sources, 624 outputs, one bound resource).

The accepted inputs were:

| Evidence | Path | SHA-256 |
| --- | --- | --- |
| q4-think0 freeze | `.orkestrel/agent/instruments/results/l15/q4-think0/freeze/manifest.json` | `95da49bbb6f4811f2bcad63e87ace42c380ba15ceb5ee42c0bd113b509ac72a9` |
| q4-think0 resource | `.orkestrel/agent/instruments/results/l15/q4-think0/resource/manifest.json` | `a4db9c340ad82e69b0f8b6b877ca4d330dac8d3375bb363e0378e58c96f1edcb` |
| q4-think1 freeze | `.orkestrel/agent/instruments/results/l15/q4-think1/freeze/manifest.json` | `8c9f816203eb24a8ab3c9d87e94e3da5d841200d1737691fbb91c3596bac0b07` |
| q4-think1 resource | `.orkestrel/agent/instruments/results/l15/q4-think1/resource/manifest.json` | `84d129dc5c67090c2c18462f89d7a15e9a893c3808aa793a1396fe5f88083efd` |
| retained fit | `.orkestrel/agent/instruments/results/l15/calibration/q4/fit/fit.json` | `46f1bcf297ccd0989c20280f3e50bdaf692c8ab47b8d936487d6996eecd928a8` |
| retained diagnosis | `.orkestrel/agent/instruments/results/l15/calibration/q4/fit/diagnosis.json` | `64b9c61fc71fa506390807fdea8e418e434783aa776ce6242277ed0e2a9aefa2` |

Both freeze and resource pairs passed `readFrozen` and `readResource`. Both resource decisions were accepted: q4-think0 reserved 512 with window and ceiling 3072 and predict 0; q4-think1 reserved 1024 with window and ceiling 3584 and predict 512. The fit's model roles, settings hash `760a4598c84f4e94cd22646959858b20eeab03a4e18494778e33f9849eee9bc9`, seed hash `c52b71f94ab1c2e742a6d6b698bc8fc278b2de1885e4ebdde75caf733355d15e`, and 76 source identities matched both freezes. The decision think flag remains false for q4-think0 and true for q4-think1.

`readRefitAssessment` recomputed the accepted diagnosis: cutoff/agreement 0.61, change threshold 0.56, no reasons or operational errors. The deliberate wrong-hash negative control reached `verifyFiles` and was refused with `Error: custody mismatch: C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\results\l15\calibration\q4\fit\diagnosis.json`.

Following the successful validation, the reader archived the exact frozen source references plus the emitted build manifest under `tmp/units/aggregate-continuous-transfer-proof-source-bytes-1791828329929`. The mapping retains each original path spelling and both hashes. All 77 archived files matched their referenced SHA-256 values, totaling 2,493,511 bytes.

The executed reader was `node tmp/units/aggregate-continuous-transfer-proof-reader.ts`, exit code 0, elapsed 22,944 ms. The full stdout capture is `tmp/units/aggregate-continuous-transfer-proof-stdout.txt` (101,344 bytes); stderr is `tmp/units/aggregate-continuous-transfer-proof-stderr.txt` (empty). Its per-guard exit codes and elapsed times are in the receipt at `tmp/units/aggregate-continuous-transfer-proof-receipt.json`. The reader itself records `git rev-parse HEAD` as exit 0 in 46.648 ms; `readBuild` completed with exit 0 in 422.779 ms. No inference about future trajectory feasibility or sustained calibration validity is established by this saved-evidence check.
