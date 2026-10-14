# Scaffold cleanup custody

The user requested moving Agent work to Agent and generic Study work to Study before any series restart on 2026-10-14. Scaffold's `PARALLEL.md` coordinates disjoint ownership with the Veneer session. Its package code, canonical guides and rules remain in scaffold.

The comparison report moved from scaffold to Agent's root `RESULTS.md`. The original 40,947 bytes matched SHA256 `e7f402c7a54c5c72f1120d76823ca1ac50fa7c9d1651bc4afc204ab368087381` before the source was removed. The report records the bounded capacity failures separately from graded baselines. Current links resolve in Agent. Retired references point at verified blobs in Agent commit `e85f5eea2e0f3150213d767cd414a3385fa429c7` or scaffold commit `6124f4c240043ed4749257f97beee86001d8d51f`; the link repair resolved 32 historical destinations.

The Veneer session handed over scaffold's `.orkestrel/veneer/lifecycle/` records. They moved unchanged into `lifecycle/` beside this file. These are historical campaign records; path strings inside them describe the recorded workspace. Scaffold's release record links to the relocated small-model matrix. The source removal followed byte comparisons for every file.

The handed-over driver patch moved into `history/bench4-Driver.mjs.diff`. It replaces the old driver with a self-importing stub and remains an unapplied historical draft. It supplies no accepted implementation or runtime evidence. The lifecycle and patch transfer covered 251,717 bytes across 8 files. The frozen harnesses were untouched.

Detailed receipts are in Agent's `tmp/units/scaffold-report-relocation.json`, `scaffold-report-links.json` and `scaffold-lifecycle-relocation.json`. The destination commit preserves the transferred content. Temporary scaffold artifacts and live daemon paths remain under inventory; this record does not close the restart prerequisite.
