# Agent 0.0.30 downstream publication

The user authorized this session to publish Toolbox 0.0.19 and Ollama 0.0.23 and finish Desk's registry re-pin on 2026-10-11. This supersedes the handoff's earlier assignment of Ollama publication to another owner. Supervisor and Tactica are excluded by the user.

| Consumer | Registry or branch outcome | Verification |
| --- | --- | --- |
| Toolbox | 0.0.19 published from main `979d725d90dd3e02722e3dd673126a1769a7c98a`; Agent `^0.0.30` | Full release chain: 860 passed, 2 skipped, 65538 ms. Distribution unchanged from 0.0.18; the runtime pin requires the release. |
| Ollama | 0.0.23 published from main `93ea1cbc80d8fb67b2ab2cc8cd6f98823053860d`; Agent `^0.0.30` | Full release chain: 899 passed, 3 skipped, 267354 ms, including 76/76 live service tests. Four core distribution files differ materially from 0.0.22. |
| Desk | Session branch `claude/confident-maxwell-6nd0f3` pushed at `af774cd`, using registry Agent `^0.0.30` and Ollama `^0.0.23` | Format, lint, type checks, 532 passed with 4 conditional skips (including 6/6 browser journeys), and production build; chain 260997 ms. All 119 tracked hashes remained unchanged through gates. |

Every gate was uncapped and independently run by the native verifier. Root read the complete logs and accepted the results. The published versions and gitHeads are registry-confirmed. Both registry archive integrities exactly match the prepared packages; no additional code or build change occurred between gates and publication.

| Archive | Bytes | SHA256 | Registry integrity |
| --- | ---: | --- | --- |
| Toolbox 0.0.19 | 272220 | `c5e666632c84fb65735af344b66b326c8061ac5aec631f4ffe206c89b56641cf` | `sha512-rYuyIIPk42qN2SnwX1I62jQvrTXhm4IEalCGs4/gcau6zaJqnizDJSDqy49cp1gbyfHVWl/0gFK1nbVPZLmwVQ==` |
| Ollama 0.0.23 | 52083 | `514ded412403f79ac398bc486cef9e2fe955fc0536249a9079c450ab8c3fe50c` | `sha512-CSAEEJoLr66iJ/6KyZqNZPXxGVOfN9HAHADQXNsPV8CdWcN2qga5o2UcTu1GjZOEMC+sGZ3P3v7RwkMaWVghDg==` |

npm accepted both serial uploads. Its first Toolbox registry check outlasted the runner's confirmation period while npm processed the package; a later read confirmed it without another upload. No credential is retained in this record.

Ollama's X2 migration consumes Agent's encode/replay and instruction contracts. The live compaction tests now assert complete retained exchanges and exact outgoing requests. A repeated-fold fixture requires two dependent tool calls and two distinct folds under unchanged generation limits. Its original whole-suite failure lacked the assertion detail needed to reconstruct a cause; one diagnostic passed. The final fixture shortens its opaque challenge within the existing output allowance and retains full failure details. The final scoped 4/4 and full chain passed. This is a test repair, not evidence of an Agent production defect.

The primary Agent checkout remains clean on published main `ee734c3`. Toolbox and Ollama are clean on their published main tips. Desk remains on its existing session branch; its default branch was not changed. No local tarball dependency remains in the two re-pins.

The obsolete Ollama compatibility worktree was removed after all 15 changed source blobs matched pushed `0a36af3`, its named proof reports were retained, and no live consumer remained. Native Git removal completed in 1757 ms; only the primary Ollama checkout remains. The rejected Agent dependency-junction cleanup and unrelated worktrees were left untouched.

The immediate primary-manifest census found no Toolbox runtime/peer dependents and only Desk as an Ollama runtime dependent within the authorized scope. The downstream wave is closed. Aggregate evaluation remains separate on the scaffold session branch and makes no adoption claim in this release record.
