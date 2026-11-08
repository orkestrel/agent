# Memory workload sources

This folder holds the public sources of the `memory` driver's scenarios and their custody manifest. The provenance of each projection lives in `../provenance/`.

- `evaluation.json` holds the evaluation world that `../scenarios/endurance.json` projects: 96 linked work products across 24 shifts and 12 customer threads. `../provenance/endurance.json` and `tests/studies/endurance/study.test.ts` pin its size and SHA-256.
- `development.json` holds the development world in the same shape: 128 products across 32 shifts and 8 threads. `../provenance/handoff.json` pins its size and SHA-256.
- `manifest.json` records the exact payload and estimator bytes per population. Its paths are the retired harness's measurement locations. Its token readings use the vendored `estimateTokens` form, `ceil(length / 4)`; they are static corpus bounds, not provider usage, calibrated prices, selected context, or generated history.

Custody rules:

- The evaluation and development oracles and the invalid-mutation fixture are not in the tracked tree. Git history holds them at the parent of the commit that removed them, an untracked copy sits under `tmp/studies/private/endurance/`, and `manifest.json` pins their SHA-256. Never read either copy.
- No oracle text enters an agent prompt, a query, a label, or a selection rule. A loader reads only a named public file and rejects unknown structural fields, nested private objects included.
- The bytes are pinned. A change to any file makes a different source with its own manifest, provenance, and test pins.

These sources establish no live inference result, no calibration, no selection or exposure measurement, and no adoption verdict. The series evidence is recorded in `.orkestrel/agent/research/evidence.md` at commit `db86a3eb`. The manifest's `path` fields name where each file sat in the campaign folder; commit `c179eddc` retired them, and its parent holds every byte the hashes pin.
