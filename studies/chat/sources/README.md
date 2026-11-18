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

The session measures seconds from immediately before `respond` to the first nonempty assistant-content frame across all calls for that request. Empty streams remain unknown. Replay produces no first-text measurement. `buildStudyChatSummary` joins Study-verified assessments, sealed evidence, scenarios, and criteria to emit original conversation ids and 1-based turns, the eight primary parity groups, right-and-not-denying, and follow-up first-text median and p90 through Study's `computeStudyQuantile`, which interpolates linearly between the closest ranks. Follow-up timing includes ungraded requests but excludes each conversation's first turn. It adds no model grading or general report API. Protocol fixtures prove mechanics, not semantic quality or historical model parity.

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
| scenarios/changed-mul0354.json  | `067c387110cc9f038e46e18192e005f6e49e160076ab87daec65629906a26b44` |
| scenarios/changed-mul0941.json  | `315f3efc32a6cf1dc35c6996b5a7a2990f6b2952e6a79161bed021872f4db14b` |
| scenarios/changed-mul1493.json  | `09b0fb138bb99d9bcc24019a41946526082993112a8e0edf61c1c145316b476d` |
| scenarios/changed-mul1860.json  | `56fbd772a0be7d8cbe396672c1ac0a18d4da001c08b3ff09621f6273c2ce6577` |
| scenarios/changed-pmul0795.json | `bd0025774cc5178e4a19213b76942958f63c3234d795e14180b7d94983570463` |
| scenarios/changed-pmul1521.json | `744aa666b04a1cb1616e7cf32a6721c8c0318fdb7a4c84f47ca28457bcd04ae3` |
| scenarios/changed-pmul3940.json | `86bbe7f13b80c04fec9189ee2e0bec7d6c50108746c00f718fc33277d89aaffa` |
| scenarios/changed-sng0840.json  | `046fe0849fa0a3e0b129f3f3ead3f8ac4114e2d41d506ed26aedc48d9e1165e0` |
| scenarios/picked-mul0454.json   | `68b41393a80fd18c2d99d2cb46d472682a011238593efd18517ca17f5971df8b` |
| scenarios/picked-mul0912.json   | `269d557ca734eeb3cb61211ae29e2e469cd024bb96b5e7d149e50654c3c0a7a9` |
| scenarios/picked-mul1137.json   | `518359e1a5a5e17c77240437b85ffc9f47cd4c68d8683921c7fbc29ac05bff43` |
| scenarios/picked-mul1491.json   | `1f01e5400adace11ac4fb065bbddb1e93eb6068e4caf4980ee8e4d1edd57e91a` |
| scenarios/picked-mul1612.json   | `ae0f04e2788b1198e28ae83171a57296f5617200e68ef141639d1d3280ed8807` |
| scenarios/picked-mul1627.json   | `59adb2573a74172417c840aeb58d22f57899c1d5b61a062b5164c07f2eb92374` |
| scenarios/picked-mul2074.json   | `5dbbd52ff00e824473a5150c5b6394f18db260a2ab80f2215d772d8c49452c18` |
| scenarios/picked-mul2119.json   | `d08382ba677275bc3ecc15d214a7948901493a6d88e870f56b5a038b04dc9db9` |
| scenarios/picked-mul2137.json   | `a02eb7b30f0c9455bb9eb153f476080cb2b7a5501d0a0468578a76dc0769e5bf` |
| scenarios/picked-mul2162.json   | `e7f77f88b5f7d36ed497a12d2add876928b473e02b8b62e936f2b4b46d988aec` |
| scenarios/picked-mul2290.json   | `6d861f70e14bef156c5830787070373b5a655541bbea0dfc628aba46f264c592` |
| scenarios/picked-pmul0079.json  | `4b52f95254dab8540bc925ded1d178ab340c960f00f328dde9926729dffcd02c` |
| scenarios/picked-pmul0095.json  | `1a66cbb71dafc59d81a66501cad705abc886247d077dd6971479f47b7599eabe` |
| scenarios/picked-pmul1002.json  | `aab689e5599ff1b160a00484d8a5e1def7eb1fa97aa289a215c9f9a3b7c1b569` |
| scenarios/picked-pmul1137.json  | `7cbc4f9a48cf130cbf78b645d010c8081a8bdcd9d16607738872407585696472` |
| scenarios/picked-pmul1526.json  | `b4ce4b434ae193004ca2f0f22b9f1ee86b51a90df72fbd2d372f6c1b755f82a8` |
| scenarios/picked-pmul1537.json  | `a60b6f89b0b8c7467da007641038827a2445d56e65a2731cd86cb208d481eb22` |
| scenarios/picked-pmul2009.json  | `029c6bae245009c3ae4a000da816feea1b56923de44fcb1ecd8392863f94398c` |
| scenarios/picked-pmul2123.json  | `61f89106046e04a4df5da9ceeda1c6a5a2a3af13cc9ed3697371097c6be1fea6` |
| scenarios/picked-pmul2489.json  | `7b445f2c8da669281f0bcd9cc1da4dc5b24de2d3640683a641242360eb2debd9` |
| scenarios/picked-pmul3162.json  | `65b393d10d3b46f8eeca5befdae5bd88251bb2555060a2c7d3a0b4a8d9955359` |
| scenarios/picked-pmul3858.json  | `21bf2443ba0bf83baff54f2954d09cc5376a164b11082e3c796094e55b5912a9` |
| scenarios/picked-pmul4234.json  | `6981ca0a942fe90cf40b1e0f2f838fffefc215559cd8057ae5e1c050c22c31f5` |
| scenarios/picked-sng01165.json  | `faf77bc52263204cb38e12119fbceb4b5e79b1f3c754d4f7e02e8ca4d5c4ade8` |
| scenarios/script-bx-88.json     | `491567600661993d47108f29c545cb5090b9d5175ab250f9bbac2a2d9fa22f29` |
| scenarios/script-kt-204.json    | `f692364a6c78caedc5762496f34e68d5db7d24042cd578b8ce58be27e4812e0d` |
| scenarios/script-or-31.json     | `a99dd4a0d695cdfba4cd02a742167aa20421a26283a58a96d416520ba94fe1ad` |
| scenarios/script-or-7.json      | `9a071655e84efc952f9a2c1099e025e29a0ea1194fbeb79db5f92197c2a26dfc` |
| scenarios/script-rm-1402.json   | `92e8f49751af6a4b8cfc4f34b8d1f2ff0bacbf4003533fd3a9e2e8256c3cf4e9` |
| scenarios/script-zd-56.json     | `6e002b419f733e2730f903a09ad265a3c96c656cccec952473ff338aa2749c88` |
| profiles/compact.json           | `9f7e0a5bd01788feb2691bebecca6a9de22f1ee9c0be44da7a8e195f6e0e6e68` |
| profiles/full.json              | `1f368f23ea3b69a6b1f3e847c76ec8d530ac043c76ace01cb51f261fb507b39f` |
| profiles/tight.json             | `c7b084c19d23804a453f65fe3dd5b5ebdf2698dbed90c4b5d2e2a634200f9fc7` |
