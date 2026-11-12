# Chat source and treatment

The seal supplies 38 conversations, 294 requests, and 102 primary graded rows. The `chat` study preserves their membership, order, prompts, lookup records, and mechanical predicates. No model reading of this Study bundle is recorded yet.

## Provenance

The 24 picked and 8 changed dialogues excerpt user turns from MultiWOZ 2.4. The supplied dataset README identifies Fanghua Ye, Jarana Manotumruksa, and Emine Yilmaz, _MultiWOZ 2.4: A Multi-Domain Task-Oriented Dialogue Dataset with Essential Annotation Corrections to Improve State Tracking Evaluation_, SIGDIAL 2022; see [the paper](https://arxiv.org/abs/2104.00773). The exact upstream dataset revision has not been established. The six order conversations are authored fictional scripts, not corpus excerpts. The [MIT notice](LICENSE) retains the supplied Copyright (c) 2022 Fanghua Ye notice verbatim, stored with LF line endings; the supplied copy uses CRLF and reads SHA-256 `fe9ac1fecd745958e6f59b229540fcfa052c3bb94d97a30d024c1cc84f16f7b6`.

The original seal SHA-256 is `3635e05278e78347f1d51208ff2d77ff170f26e5e68c6f16ae270dfeba85bba4`. Repository formatting rewrites its whitespace; the tracked formatted representation has SHA-256 `6c50bc254a746c9fef0a6371067ad9463ced107b8c63f4dad60aecd24bb2b791`. The conversion helper accepts exactly these two byte identities. The original digest describes provenance, not the generated scenarios. No formatter exclusion applies.

The seal was selected before the historical battery arms ran. The selection sorts available test-split dialogue ids by the SHA-256 of `records-battery:` followed by the id. A dialogue needs at least 6 user turns. Eligible slot values come from the following assistant turn's metadata, restricted to the battery's booking questions, and must occur literally in a user's text with ASCII word boundaries. Empty values, unspecified values, indifference, yes/no, and free are excluded. Assistant turns supply slot annotations only; the study never preloads their replies.

For changed dialogues, the selector takes the first stated change from an earlier stated value, before user index 12, until it has 8 dialogues. Each conversation includes user turns through that change, followed by the latest-value question. These dialogues do not also enter the picked set. For picked dialogues, it retains the first 6 user turns and selects at most one distinct value from each depth: last, 1 or 2 turns back, and further back. A picked dialogue needs at least 2 probes, including a far probe; selection stops at 24. The seal preserves number-word, clock, and centre/center spellings. The six scripts retain the original lookup, shortening, friendlier reply, depot question, and delivery-code correction steps.

The guarded conversion writes stable lowercase scenario ids and 1-based `turn-N` goals. Public inputs hold only prompt, system, topic, and an optional lookup record. Accepted spellings, refusals, and row classifications reside in the rubric. The conversion proof compares the complete tracked declarations to the sealed conversion, including every prompt and criterion join.

## Composition and wire policy

Each conversation opens a fresh ledger. Booking dialogues use the seal's booking system and `bookings` topic; scripts use its desk system, `orders` topic, and exact per-order `lookup` tool. Both topics set `requested: false`. The tool execution compares `String(args.id)` with the order id; its ownership reader compares `args.id` strictly. The ledger receives `LEDGER_QUESTIONS`, cutoffs category 0.7, topic 0.7, correction 0.5, amends 0.7, supersedes 0.7, prediction budget 1024, thinking off, prompt share 1, tail share 0.35, and agent limit 8.

The agent role declares context 20480, prediction limit 1024, temperature 0, seed 0, and thinking off. The provider's defaults retain streaming and a 5-minute keep-alive. Both roles use `strict: false` and permit length finishes; the observer records measurements with no gauge and `enforced: false`. Study therefore adds neither `truncate: false` nor `shift: false` to the agent's options. Length completion remains an operational outcome, and a partial product grades unknown.

The judge factory receives the battery options unchanged: context 8192, prediction limit 1, CPU placement `num_gpu: 0`, temperature 0, seed 0, timeout 180000 ms, and the exact system text in `constants.ts`. The judge is Mica alone. As ruled, the judge factory fixes its wire temperature at 1 (`@orkestrel/ollama` 0.0.32, `OllamaJudgeOptions`); the declared policy is the effective wire, equal to the battery's. The factory also emits raw generation, log probabilities, its candidate log-probability count, no streaming, `truncate: false`, and a 5-minute keep-alive. The direct-versus-Study proof compares the complete effective bodies, including these defaults, messages, tools, prompts, model options, and flags.

The bounded conversation proof exercises the real ledger and lookup. In that fresh-ledger conversation, submitted requests are excluded from category judging and requested-false topics, while generated replies and tool results receive mechanical categories. It produces no Mica generation. A separate real `createOllamaJudge` question proves equality of its direct and transported effective bodies and a retained `judge` wire event. Every judge created by the chat session receives that custody fetch route.

The tracked profiles declare no daemon. They run on the Ollama at their provider URL, `http://127.0.0.1:11434`, which is Ollama's default, so Study starts no runner and sends no maintenance requests; it verifies the model pins against the serving inventory. The protocol rehearsal rebinds model identities and the endpoint to the existing test daemon; it measures no model behavior. The tracked profiles retain the model digests, roots, and endpoint. They differ only in name and ledger capacity: full 19968, compact 2400, tight 1600.

## Allowances

Allowances are finite refusal ceilings, not allocations or estimates of expected work. The conversion proof bounds the longest conversation by 16 requests. Each generation pass can issue 8 agent calls; the ledger can also run an answer recovery pass after an empty or partial response. The goal headroom covers both passes and 2 calibration calls. Every agent response has a prediction limit of 1024. The request ceiling allows 19968 charged tokens (20480 minus 512 safety), 2 MiB of combined wire bytes, and 180 seconds. The byte ceiling leaves room for the prompt, streamed JSON framing, and tool data as well as generated text; oversized or unterminated wire responses refuse.

The filing reserve includes category, topic, amendment, and supersession questions rather than pricing only user turns. For 16 user units, 2 questions per unit plus 2 per ordered pair gives at most `2 * 16 + 2 * 16 * 16 = 544` questions before cache reuse, plus up to 16 agent calls across both passes and calibration. This exact composition excludes submitted requests from category/topic asks, assigns generated/tool messages and recovery annotations mechanically, and has no other seeded units; it does not assume one tool result per agent call. The goal ceiling rounds well beyond that reserve to 262144 calls. Each call reserves the full request token and byte ceiling. The goal duration is 1800000 ms.

The following arithmetic defines the larger ceilings. Recording reserves space for base64 expansion, framing, and metadata; Study reserves each trial's recording byte ceiling upfront.

| Scope               | Calls                    | Tokens                           | Bytes                              | Duration, ms |
| ------------------- | ------------------------ | -------------------------------- | ---------------------------------- | ------------ |
| Request             | 1                        | 19968                            | 2097152                            | 180000       |
| Goal                | 262144                   | 262144 × 19968 = 5234491392      | 262144 × 2097152 = 549755813888    | 1800000      |
| Trial               | 16 × 262144 = 4194304    | 16 × 5234491392 = 83751862272    | 16 × 549755813888 = 8796093022208  | 86400000     |
| Series              | 38 × 4194304 = 159383552 | 38 × 83751862272 = 3182570766336 | 1125899906842624                   | 86400000     |
| Recording per trial | 4194304 + 64 = 4194368   | Separate wire custody            | 2 × 8796093022208 = 17592186044416 | 86400000     |
| Metadata per trial  | 64                       | Separate metadata quota          | 67108864                           | 600000       |

The series byte ceiling is 1 PiB, exceeding `38 * (recording bytes + trial bytes)` (912 TiB). The metadata quota covers preflight and postflight version/inventory/model verification for both model roles, with room for maintenance. The 24-hour trial and series limits are independent operational deadlines, not a promise to spend the sum of every request's timeout. The full 38-conversation fixture schedule is tested under each capacity with these same allowances.

## Reading the evidence

The primary predicate lowercases text and matches any accepted spelling at ASCII word boundaries. Shortening also requires a strictly smaller JavaScript string length than the immediately previous completed reply. Missing or partial replies remain unknown. Denial and older-value diagnostics remain separate even when a reply passes the primary predicate. Study requires criterion coverage for every goal, so ungraded turns have completion criteria; those criteria make no answer-success claim and never enter the 102-row primary denominator.

The session measures seconds from immediately before `respond` to the first nonempty assistant-content frame across all calls for that request. Empty streams remain unknown. Replay produces no first-text measurement. `buildStudyChatSummary` joins Study-verified assessments, sealed evidence, scenarios, and criteria to emit original conversation ids and 1-based turns, the eight primary parity groups, right-and-not-denying, and follow-up first-text median and p90 using index `floor(p * (n - 1))`. Follow-up timing includes ungraded requests but excludes each conversation's first turn. It adds no model grading or general report API. Protocol fixtures prove mechanics, not semantic quality or historical model parity.

## Scenario mapping and generated digests

The following tables pin the original-to-scenario mapping and SHA-256 identities of the generated declarations and notice.

| Original id   | Scenario id      |
| ------------- | ---------------- |
| MUL2162.json  | picked-mul2162   |
| MUL0454.json  | picked-mul0454   |
| MUL1137.json  | picked-mul1137   |
| PMUL4234.json | picked-pmul4234  |
| MUL2290.json  | picked-mul2290   |
| PMUL3162.json | picked-pmul3162  |
| PMUL1537.json | picked-pmul1537  |
| PMUL2489.json | picked-pmul2489  |
| PMUL0095.json | picked-pmul0095  |
| SNG01165.json | picked-sng01165  |
| PMUL1137.json | picked-pmul1137  |
| MUL2119.json  | picked-mul2119   |
| PMUL2009.json | picked-pmul2009  |
| MUL2074.json  | picked-mul2074   |
| MUL0912.json  | picked-mul0912   |
| PMUL0079.json | picked-pmul0079  |
| PMUL3858.json | picked-pmul3858  |
| MUL2137.json  | picked-mul2137   |
| PMUL1526.json | picked-pmul1526  |
| MUL1627.json  | picked-mul1627   |
| MUL1491.json  | picked-mul1491   |
| PMUL2123.json | picked-pmul2123  |
| MUL1612.json  | picked-mul1612   |
| PMUL1002.json | picked-pmul1002  |
| MUL1860.json  | changed-mul1860  |
| MUL1493.json  | changed-mul1493  |
| MUL0354.json  | changed-mul0354  |
| SNG0840.json  | changed-sng0840  |
| MUL0941.json  | changed-mul0941  |
| PMUL3940.json | changed-pmul3940 |
| PMUL0795.json | changed-pmul0795 |
| PMUL1521.json | changed-pmul1521 |
| OR-7          | script-or-7      |
| OR-31         | script-or-31     |
| KT-204        | script-kt-204    |
| BX-88         | script-bx-88     |
| RM-1402       | script-rm-1402   |
| ZD-56         | script-zd-56     |

The generated declarations and copied source artifacts have the following digests:

| File, relative to chat          | SHA-256                                                            |
| ------------------------------- | ------------------------------------------------------------------ |
| study.json                      | `16db6386d5609b743a71c70684d61aa58664bb77ce1fa2e821721509e7c0b03b` |
| rubric.json                     | `594f2c60db63a39dc0065e9b88201bce85142943a6ba82df07262dda9cd56345` |
| sources/LICENSE                 | `9f7e5026730439fc5835d3cd84ba46e2c23534cc29e1a6c65401b5f2bdd5c6c0` |
| sources/sealed.json             | `6c50bc254a746c9fef0a6371067ad9463ced107b8c63f4dad60aecd24bb2b791` |
| scenarios/changed-mul0354.json  | `f806c1867e78c9d279c2ff441d2785406d1f71695361da515e7a5e604ce2543c` |
| scenarios/changed-mul0941.json  | `f0ae4160fc6cea1a0fbc47c63e1b51d1a277ee84ab091fc3b0c5312c9174d43d` |
| scenarios/changed-mul1493.json  | `9faa7fba080a83a99ae1535d8734ddfd05e0028f28c52d816a0c47c8025ba11e` |
| scenarios/changed-mul1860.json  | `c36017c11887b412ba7dfd0872593ba57938becaf0b60634713804f6ce509ebb` |
| scenarios/changed-pmul0795.json | `eacbde9f114f65e7590cb6adff78df054a606653d21d253276bdeb16df58b35c` |
| scenarios/changed-pmul1521.json | `2a07f3fc81a8f882e179408ebb3681757b4b117e15fd728ec604b0a7d5a469d6` |
| scenarios/changed-pmul3940.json | `3b96deff7952ae8c1f82445f707365704f769d126225c71502f17d39bc78811f` |
| scenarios/changed-sng0840.json  | `d6d91d04dae0f5c7e317422d94d168b664a711b845af500e9830790631312504` |
| scenarios/picked-mul0454.json   | `3bd98f23cb3c46fe99c456b3f53bc861180fc6e3290349d4736a1914850acf5b` |
| scenarios/picked-mul0912.json   | `dcee19c8dbe9ba831660a1feaf554df6005a7f8b69a8bcc4364b13e9c285b143` |
| scenarios/picked-mul1137.json   | `07bb087dc7c413249dbdbaf4357477160d68a8b972070b5204c8a0abf5acd396` |
| scenarios/picked-mul1491.json   | `32a31bf754ce2a6d2ab1a4899ba9b75d15436784b7bbe024d35e30f09bdcd60b` |
| scenarios/picked-mul1612.json   | `b763cd47ed797e8fefa4867edad2a52106dcc24a9cdef617684abaf26e7eb07b` |
| scenarios/picked-mul1627.json   | `e931e25e21aae052d797088edcfffcff4b7be94294a651283fe9890cc3c70855` |
| scenarios/picked-mul2074.json   | `22e8656bc89a345b91cc45f83fbd23381d94694cd92f9e93e8842502b288a2de` |
| scenarios/picked-mul2119.json   | `2fb4be5386f79d1a4dd507558f7d76b7122c010f7858b99659f932258e8b7ebd` |
| scenarios/picked-mul2137.json   | `7b869156a343b66d30b4fd9946c4c4950d96fc9d4115494648890f357a2226a4` |
| scenarios/picked-mul2162.json   | `3e7828095675d686dc2a63a1f34a3edc54dc0a20c04a5c0e38c5695db5cb8f56` |
| scenarios/picked-mul2290.json   | `30b6231e05697ffac6abec6bd72e9ecd41dee5751aec66829d1522d71596052c` |
| scenarios/picked-pmul0079.json  | `617f3966e6799323f95a74fda8ca5866acc159e1bdd66fde1819725a5bcad651` |
| scenarios/picked-pmul0095.json  | `1186d85c6759d36e98164ee36c166190134d2e538c2e349bacc096e2dc1a5dd0` |
| scenarios/picked-pmul1002.json  | `155b577477a250652643e4d10f2a0af2bf353c50a6d96822f644af419d2ef6e5` |
| scenarios/picked-pmul1137.json  | `7f2cde57ace338af225d470685c3db6da7893457cf1efca39e9367973493e4e5` |
| scenarios/picked-pmul1526.json  | `f0f86b2e99777ed56132e94a6f2f821dcbcfcd505528c4b4184ba457b89aad96` |
| scenarios/picked-pmul1537.json  | `8254e1617a8ebdb737f746eda2935e16fd10a29403f13587bc826ef3b1e84a25` |
| scenarios/picked-pmul2009.json  | `37dae1b4b8c03460f92aa7391d1f046de7bae0deacf7653ecf2e95a3781589be` |
| scenarios/picked-pmul2123.json  | `749e03759e009a841530e200b6bed06267ade7017fd8dadc93edc2bfd732d90d` |
| scenarios/picked-pmul2489.json  | `832432bc812e0f77bf6f7e2f4f14699c6c8eb9e3ca478667e93399d7c08683b3` |
| scenarios/picked-pmul3162.json  | `c85bc4ed78078c60d9a6dec235e0e55aa0194fe7fe41c743a268392d9f5d664b` |
| scenarios/picked-pmul3858.json  | `746fff0e6fac3efa1bfef2f654aef7fa48112d2a3d4aa05d605af82516b531ec` |
| scenarios/picked-pmul4234.json  | `3fc694859e39ea8bef1ed767ae469fae2b33b28647c346fa03020c702f84a5cd` |
| scenarios/picked-sng01165.json  | `043f77849e006734bc39ed7e5e1450b4bde53f1299c59d858e5e001d48de045d` |
| scenarios/script-bx-88.json     | `df96b8c403aa615d43c1d834e037a72eb946784f30e973ced49e304d49afaaab` |
| scenarios/script-kt-204.json    | `8e4c026922c31c8c755276d09a23588f8a34c02243385713091ff4204f2915fc` |
| scenarios/script-or-31.json     | `b1339e794c906a78893bfe4bc46da5cdba80edb64a0cd61f714d1a5f145b9da2` |
| scenarios/script-or-7.json      | `015f46f5ea8bcb933f68408c91bab947ac637defa128bf7e6f7808859d871152` |
| scenarios/script-rm-1402.json   | `1324b1ca2a39f5947b00c0f5998ef1a05ae78416b810e9294ac799cd16a9aba8` |
| scenarios/script-zd-56.json     | `8854ff87950c88c5d74e0bbac7145b73e0fda29a9fc6f802ab9e19dd15ac512c` |
| profiles/compact.json           | `ec0a0973e79e020895ca0ec3280339f2291d1a98a52d3beea66ad2f853bc61bc` |
| profiles/full.json              | `41e6458031f934d1f3efeb3f1c963ef872fe8fa5d736196f59920b2b20386339` |
| profiles/tight.json             | `b781ef2835ced87e29671d7f0bffbca90e692d32fc1887c74a881f8f58874fcf` |
