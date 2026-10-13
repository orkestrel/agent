# Successor G4 exploration lookup addendum

The earlier lookup used `results/l6` input paths. The current released inputs are under `results/l15`; existence checks confirmed the named corpus, complete generation files, root labels, and both frozen thinking manifests:

- `.orkestrel/agent/instruments/results/l15/calibration/g4/corpus/corpus.json`
- `.orkestrel/agent/instruments/results/l15/calibration/g4/generation/manifest.json`
- `.orkestrel/agent/instruments/results/l15/calibration/g4/generation/attempts.jsonl`
- `.orkestrel/agent/instruments/results/l15/calibration/g4/generation/packet.jsonl`
- `.orkestrel/agent/instruments/results/l15/calibration/g4/labels.json`
- `.orkestrel/agent/instruments/results/l15/g4-think0/freeze/manifest.json`
- `.orkestrel/agent/instruments/results/l15/g4-think1/freeze/manifest.json`

For any reuse of the quoted commands, replace only the `.orkestrel/agent/instruments/results/l6/` input prefix with `.orkestrel/agent/instruments/results/l15/`. The binary path, model tag, flags, output placeholders, and `http://127.0.0.1:11435` endpoint stay the same. The strict fit and exploratory cutoff validation already completed for L15 per root; do not rerun the fit command. Root reports strict refusal at 0.79 and exploratory cutoff 0.61. This addendum does not change the earlier finding that current matrix aggregate execution enforces separated-fit identity.
