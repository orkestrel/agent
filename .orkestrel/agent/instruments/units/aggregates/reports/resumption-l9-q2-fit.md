# L9 Q2 offline fit-v3 — measured refusal

The exact fit-v3 command completed once with child exit 3, no signal, `capped=false`, duration 2513 ms. Launcher PID 31616 is closed. No model/service call occurred. The emitted diagnosis is a measured refusal: `accepted: false`, `end-to-end admission below 0.5`, cutoff `0.93`. No `fit.json` was written and nothing was deployed.

The decision counts distinguish repeated occurrences from distinct candidate identities:

- Occurrences: 123 supported, 122 scored, 0 admitted, 0 conditional, admission 0.
- Distinct identities: 31 supported, 30 scored, 0 admitted, 0 conditional, admission 0.
- The diagnosis contains 180 readings total: 168 generated occurrence readings and 12 archived-control readings.

The build manifest, freeze manifest, deployment, and labels-v3 hashes matched the brief: `76c3c9c4718f69dbb4cd76eb5f95e49c42b3bfe8924ad7ef89de8832db720734`, `87c3b7b5b5756b0285f26302f3dbf4beb377e20f394973d011a7d192dc9df3ac`, `3403efae36af29daf63123faac2017c82f94b5be3c8816c8611828faa59eef31`, and `eede8c57cff36b858494df2e500168caca37f004dfed2718bd238df76f3d14f2`. The root and independent label arrays each contained 168 entries; every ID, item hash, whole verdict, and proposition verdict matched in order. Root's checked projection had already validated the exact source quotations.

Preparation costs were read from the unchanged, generation-bound attempts and control rows using the existing refit cost-accounting semantics; they are separate from the fit decision and cached replays are excluded from fresh request charges. The cost ledger is unchanged from the predecessor report: 52 fresh summary requests (110,781.44 ms, 37,215 prompt tokens, 5,764 completion tokens); 152 fresh trajectory judge requests (414,348.94 ms, 165,311 prompt tokens, 152 completion tokens); 25 fresh control judge requests (55,116.78 ms, 18,236 prompt tokens, 25 completion tokens). All fresh sends had usage. There were 388 cached judge-component replays. The fit-v3 command made no model requests or retries.

Generation and input custody remained unchanged: generation manifest `d44390638081f8ad1e206c341f75dd3e1f7ae76dd3d5256a8cecaaaab7d1f7c1`; corpus `27d07d8b2a0954f25c64867370730c86f8665b0207868263b96ada531bedf226`; attempts `72cfb53842ca1dc408ecc34cfcb4d56d3e6f16a1472c2527919c933fc4497d98`; packet `606faa019bab5d6724ced6b0e1c118568b2c585befeeb43c1c6943fdf514bd58`; controls `b5198eaab196d1b218a1bc8728d2e1d3c2496f8fbe64a7b089c9966a089da570`; evidence `ac97984f7db6dd8ebadb2d393b4f11842234e4db7cb6788af084b7e62851b531`; corpus `corpus.json` `27d07d8b2a0954f25c64867370730c86f8665b0207868263b96ada531bedf226`; judge cache `5c60f1add1452cc21f09eecc204e078c24b2f4cfd7ed72fc38aa2ee66a5a7b3e`; summary cache `3f95adbb92bcfe395e857e0e690a507e3407b7b1cd32150e73ba498b77cf9f67`.

Exact command:

```text
node .orkestrel/agent/instruments/harness/.build/bench5/refit.js fit --frozen .orkestrel/agent/instruments/results/l9/q2-think0/freeze/manifest.json --corpus .orkestrel/agent/instruments/results/l9/calibration/q2/corpus --attempts .orkestrel/agent/instruments/results/l9/calibration/q2/generation --labels .orkestrel/agent/instruments/results/l9/calibration/q2/labels-v3.json --model qwen3.5:2b-q4_K_M --out .orkestrel/agent/instruments/results/l9/calibration/q2/fit-v3
```

The child wrote no stdout: `tmp/units/aggregate-l9-q2-fit-3.jsonl` is empty, SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`. The complete launcher/exit record is `tmp/units/aggregate-l9-q2-fit-3.err`, SHA-256 `1ed8f8ef393ef130d5d0669adf0ab6849772a0208ba2c1f550d671fd37122b50`. `fit-v3/diagnosis.json` SHA-256 `063c4ed9917f4db61b1cb6cecb47863d32e813009e329e66f47c44c8cf0c5a37`; `fit-v3/controls.json` SHA-256 `ef68d00bb430d3b6cd56a8ccf7076f862694fcbf2d08761a38090e0daeb9c499`.

The earlier serialization refusals in `fit/` and `fit-v2/` remain preserved. No source, build, label, cache, or deployment changes occurred during this fit.
