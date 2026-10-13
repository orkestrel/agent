# Live calibration progress

The corrected model conditions froze successfully on 2026-10-11. Qwen 2B, Gemma 2B, and Gemma 4B calibration completed with admission refusals. Qwen 4B generation completed and is under independent blind review. No goal-quality comparison or adoption verdict follows from calibration alone.

Native verifier Luna ran the accepted primary preparation driver on session checkpoint `2897ba0e4`, using canonical harness build `eb254fd9ff13d2a95fcde5c856a1b0e977e9c9dd363c43c9938498bc1af00b57`. Every requested Qwen/Gemma size and decision-thinking condition froze with exit 0 uncapped. Each freeze binds the same 75 source files, settings, seed, model census, and tag identities; independent hashing found no mismatch. Freeze manifests are under [the l6 result directory](../../../results/l6/).

The q2 corpus contains 162 contexts across 24 request points, with 49 distinct initial prompts. Corpus preparation exited 0 uncapped in 2435 ms. Generation exited 0 uncapped in 271800 ms, under the declared operational watchdog. It produced 251 attempt occurrences covering every context with contiguous ordinals inside the fixed retry limit. The packet contains the same unique IDs. Generation is complete, errors are empty, and all retained source and output hashes matched. The recorded process and descendants exited before the next model started.

The accepted q2 artifacts have these identities.

| Artifact | SHA-256 |
| --- | --- |
| corpus/corpus.json | `c4986d177601b5cffa142d20181a4c8c77c052b001baf72dd48925bbe37abb39` |
| generation/attempts.jsonl | `c0b1ce66f5a8508368fc834b24aa26d235016c8da7b25e009e6fd11664d0dbb8` |
| generation/packet.jsonl | `6b09f8b596108a2119a6905168c23f5f1e561415b23a4dcdd38c8f29afaa8f89` |
| generation/evidence.json | `b77aae8a7a0c6a87dd885d0237453289f63662ef8791eb5801e4e86d8cebb724` |
| generation/manifest.json | `079414f70453989f2f74a5cd52ce72a6491583cdccf9fcf2de77531035be0ebb` |

These paths resolve under `.orkestrel/agent/instruments/results/l6/calibration/q2`. Root read the complete verifier report and launcher result and verified the packet's byte identity before staging an opaque copy for a clean-context Astra analyst. That analyst receives the packet without model names, settings, scores, attempts, or the private generation path. Root adjudicates proposition evidence before fitting.

The immutable native report is primary `tmp/units/aggregate-live-freeze-calibration-q2-report.md`, SHA-256 `580f7c08f93b840199ca304e208cbd9749064fb9714aa736ed1462f259d66e02`. Raw launcher evidence remains under l6/logs. Root accepted the unit and dispatched the remaining g2, g4, and q4 calibrations sequentially; independent cloud labeling can overlap later model generation.

Qwen 2B's adjudicated labels contain 1 supported, 122 unsupported, 123 contradicted, and 5 ambiguous occurrences. The fit returned child exit 3 uncapped in 2273 ms, with end-to-end supported admission 0 against the required 0.5. The supported draft's spelled-out dates failed the exact-number check before scoring. The candidate cutoff 0.91 is not an accepted fit. See [the root adjudication and diagnosis](resumption-q2-adjudication.md).

Root accepts Gemma 2B generation after reading the complete verifier report and raw launcher results and independently checking retained artifact hashes. Corpus preparation exited 0 uncapped in 2439 ms; generation exited 0 uncapped in 828161 ms. Its 162 packet occurrences cover every corpus context, with exact attempt/packet ID membership and no errors. The verifier checked every corpus and generation file binding; the model process exited before Gemma 4B started. The immutable custody report is primary `tmp/units/aggregate-live-calibration-g2-report.md`, SHA-256 `1210e1eaf2980e2040b559e84f56583cd4866585801c877d882c663956ed90fa`.

The accepted g2 artifacts have these identities.

| Artifact | SHA-256 |
| --- | --- |
| corpus/corpus.json | `d96d5b0df18c952e86b94cc44196eb17a23459a6a31b216520babf27c710f44d` |
| generation/attempts.jsonl | `6290ed2d3d369fa3539c5afbec86d2243320736aa4140415799a969cabc2ce04` |
| generation/packet.jsonl | `d634d4b39f4993a80452e8a579772e8b07d1db15dbaf7482605076a1a1880bb9` |
| generation/evidence.json | `d0b0182bacb877669d60b38b5d705c926e8fb65231e22ef908e6e82b642ba8b4` |
| generation/manifest.json | `28fb1257f768651ce636ef3475491aef22e466502f2890ebbcb66a2f48819650` |

These paths resolve under `.orkestrel/agent/instruments/results/l6/calibration/g2`. Root supplied only a byte-identical opaque packet copy to a separate clean-context Astra analyst under `support-audit-c38f`. Root adjudicated every distinct analysis before fitting, including a disclosed supported-to-ambiguous correction for a joined instruction's actor. The resulting labels contain 55 supported, 55 unsupported, 26 contradicted, and 26 ambiguous occurrences. The fit returned child exit 3 uncapped in 2274 ms: all supported occurrences were scored, but none reached the candidate cutoff 0.88. See [the Gemma 2B adjudication](resumption-g2-adjudication.md).

Root accepts Gemma 4B generation after the complete custody report, raw launcher results, and direct retained-hash checks. Corpus preparation exited 0 uncapped in 2390 ms; generation exited 0 uncapped in 1099747 ms. Its 162 packet occurrences cover all corpus contexts, with exact attempt/packet ID membership, unchanged file bindings, and no errors. The model process exited before Qwen 4B started. The immutable custody report is primary `tmp/units/aggregate-live-calibration-g4-report.md`, SHA-256 `97ca73dce62e092f55ceb40aea4a5a762d17256c15e233ae59e9afba804483d9`.

The accepted g4 artifacts have these identities.

| Artifact | SHA-256 |
| --- | --- |
| corpus/corpus.json | `cd2aedd390de0533012b9b8edffd70e09921239d542e3bdbd4d3eb346dffff6f` |
| generation/attempts.jsonl | `255f1dcfd45a0b876a28c6a76b37f32c46cda0e3d5b367c7e7e9cc5118d8ecb7` |
| generation/packet.jsonl | `9ef9164e8f0dad5828d1f36aac0d4169dec0a6f623980849bbcb60c4ee985733` |
| generation/evidence.json | `c5099a3620d51dbe13dd3d7d9415c513a0ba0ef76ae637f900c0e7e953466621` |
| generation/manifest.json | `3d20b473c0d142e73fe38a37ae1d43e22268b2ab1615bb363a3b529a767d6e8c` |

These paths resolve under `.orkestrel/agent/instruments/results/l6/calibration/g4`. The separate clean-context Astra analyst reviewed only the opaque byte-identical packet under `support-audit-e64b`. Root adjudicated every distinct analysis before score inspection, correcting unsupported release-actor and reported-cause attributions. The resulting labels contain 93 supported, 36 unsupported, 20 contradicted, and 13 ambiguous occurrences. Native verifier Luna ran the offline fit: child exit 3 uncapped in 2046 ms, with all 93 supported occurrences scored and none admitted at candidate cutoff 0.82. See [the Gemma 4B adjudication](resumption-g4-adjudication.md).

Root accepts Qwen 4B generation after the complete custody report, raw launcher results, and direct retained-hash checks. Corpus preparation exited 0 uncapped in 2569 ms; generation exited 0 uncapped in 839550 ms. Its 163 packet occurrences cover all 162 corpus contexts, with exact attempt/packet ID membership, unchanged file bindings, and no errors. The model process and descendants exited. The immutable custody report is primary `tmp/units/aggregate-live-calibration-q4-report.md`, SHA-256 `a4a70270fb83886cd794905a4416199eee04759e0a9449c255f08d7162a5de19`.

The accepted q4 artifacts have these identities.

| Artifact | SHA-256 |
| --- | --- |
| corpus/corpus.json | `8bf2e93126be0a5af34a54d78f15970dc18ab7bbeb97818be1dab0e2e74eafde` |
| generation/attempts.jsonl | `15b970b7ee14ec5184c2f731ec07d0c40972bb4c47c88318a6ce7d0019dbb6c7` |
| generation/packet.jsonl | `7eeba7b8fa135fe4ad8adcd12323a593cb7167ccc2d889e227709781cde1b0c1` |
| generation/evidence.json | `95c0a837d6c3d634ad1f45f9870c787d42d568f2d56f636da11eb46ddad7487e` |
| generation/manifest.json | `9756c24da51b4db6e21263547b06c3961b579cf964b0323ddd1890b3ee5380b4` |

These paths resolve under `.orkestrel/agent/instruments/results/l6/calibration/q4`. The separate clean-context Astra analyst completed the opaque packet under `support-audit-f92d`. Root settled labels before score inspection: 43 supported, 72 unsupported, 18 contradicted, and 30 ambiguous. Native verifier Luna ran the unchanged fit: child exit 3 uncapped in 2064 ms, candidate cutoff 0.89, and zero admissions among 43 scored supported occurrences. See [the Qwen 4B adjudication](resumption-q4-adjudication.md).

The accepted objective Qwen diagnosis proposes a source-clause prompt experiment with unchanged lexical, judge, fit, and admission requirements. Its report is primary `tmp/units/aggregate-calibration-diagnosis-report.md`, SHA-256 `a92f53386397f1b345a9d9ce24c60383cf32dbb4d38025d2664a124d92e65ab0`. The original supported draft's retry passed lexical checks but introduced factual errors. The highest scored negative forced cutoff 0.91, while generated supported judge sensitivity remained unmeasured. Cursor Opus completed its bounded subjective design pass in 258648 ms, exit 0 uncapped, in session `c9c60b0b-33b7-4b41-b53c-216c964b86d4`. Its captured report SHA-256 is `3b7b904cd1687a5f99538d05e7253c1a8f7db87a39427eb8a2f064003a5f6252`; the report lives at primary `tmp/cursor/aggregate-calibration-prompt-design-report.md`. Its source citations resolve against the explicitly named aggregate source directory. Root is reconciling the proposed source-date framing, unresolved-pronoun risk, and useful-coverage limit. No successor source or prompt has been implemented.

Root has closed the original calibration cohort and authorized the separately recorded [source-clause development revision](resumption-prompt-l7.md). That ruling supersedes the proposal's pending status in the preceding historical paragraph. Resource preflight, pilots, matrix quality, separate judge runs, and the mandatory continuous comparison remain pending. Publication remains held.
