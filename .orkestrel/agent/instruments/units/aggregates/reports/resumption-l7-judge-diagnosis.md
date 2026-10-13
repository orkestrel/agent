# Judge admission diagnosis

Root accepts the independent Qwen 2B diagnosis after reading the complete report, resolving its citations, reproducing the logical joins and runtime resolution, and reading the scorer and fit seams. No inspected implementation defect explains the refusal. The unsupported maximum forces cutoff 0.85 while only one supported occurrence qualifies. Preserve the refusal and complete the other cohort reviews before choosing a method revision.

The analysis does not prove historical wire fidelity or the installed judge superclass's byte continuity. Raw request bodies, response bodies, and token logprobs were not retained. The fixed judge is Mica 4B; Qwen 2B supplies the candidate summaries. The installed judge superclass resolves to agent 0.0.29, separately from the trimmed 0.0.30 selection engine. The missing runtime-byte binding is a measurement limitation, not demonstrated drift.

The following independent report is retained from primary `tmp/units/aggregate-l7-judge-diagnosis-report.md`, SHA-256 `f3cddfa8771d4b2ffdd554adc30e483b23bf5c549e073441426c3eade4f4f7a4`.

# Retained Qwen 2B admission diagnosis

The input identities match the checked brief. All paths in this report resolve from `C:/Users/mikes/WebstormProjects/scaffold`. The following SHA-256 readings precede the analysis; `q2` denotes `.orkestrel/agent/instruments/results/l7/calibration/q2` in this table only.

| Artifact | SHA-256 |
| --- | --- |
| `q2/labels.json` | `4965e298d9bd345bbd0f86a418648a6767ccfb776f5d46b232d3defba070cb78` |
| `q2/fit/diagnosis.json` | `c34c6f9687cdc324c38c2099f5f5f96f0bfaa51c2af8e96193b6b58aaafc320b` |
| `q2/fit/controls.json` | `ef68d00bb430d3b6cd56a8ccf7076f862694fcbf2d08761a38090e0daeb9c499` |
| `q2/generation/manifest.json` | `7cc0e6af513f8f9a65d0cdf35afa6b94b7ab350465328a95e380f42ac9b79216` |
| `q2/generation/evidence.json` | `24fddf4bfc7d870a49395ad72b62d5bf8429ebb27e56d18e8f3d666fc1ba81b2` |
| `q2/generation/attempts.jsonl` | `6258734af06361ee0337236311c04eb970f79e190ea103082dd8d5af6db66a8d` |
| `q2/generation/packet.jsonl` | `64f575e39f5b1cae6237fedb67e3559103ee1bf535c2655fee610bda9094a67e` |
| `q2/corpus/corpus.json` | `ebe04c8ca9a3e80adaa925e550536d3c81077a41d659b184c03350f23cc8cbfa` |
| `q2/cache/judge.jsonl` | `10f26e296350b09e855f4f0b983109e18feef22eb41dc033332197d4933ec486` |
| `q2/cache/summary.jsonl` | `d92a6f4f1d86b18a235fb2a1c7a341db438c244d9356720265c5ea6250223e44` |
| `.orkestrel/agent/instruments/harness/.build/build-manifest.json` | `09c7d936ffaec46ed9deb5bdd300deb0f9643ad639519762d8d84e38ef513ecf` |

The retained refusal follows from severe score overlap under the declared rule. Generated unsupported candidate `fbb56761-030c-4056-bee5-e1def8cc9aba` scores `0.842522895608751`, forcing the first separating grid point to `0.85`. Only `079f08df-5f81-4b0a-9643-350fa127128a`, at `0.8965268029242978`, clears that cutoff among generated supported candidates. The diagnosis remains refused: admission is `1/131 = 0.007633587786259542`, below the unchanged `0.5` floor. See `.orkestrel/agent/instruments/results/l7/calibration/q2/fit/diagnosis.json:1` and `.orkestrel/agent/instruments/harness/bench5/refit/helpers.ts:237`.

**Raw-evidence limit:** the retained judge records contain the logical state, question, normalized answer, usage, timing, configured model identity, and origin. They contain no request body, response body, raw token logprobs, generated token text, finish reason, or tokenizer trace. A source trace can explain the declared transformation; it cannot prove the historical transport bytes, recompute historical logprob arithmetic, or exclude hidden daemon truncation. Root explicitly resolved the brief's stop condition to permit this bounded analysis with that limit. See `.orkestrel/agent/instruments/results/l7/calibration/q2/generation/evidence.json:1356` and `.orkestrel/agent/instruments/harness/bench5/JudgeCache.ts:171`.

## Recorded population and distributions

The extraction joins all 168 attempt occurrences to their exact packet, corpus sources, final labels, and diagnosis readings. The generated population has 47 distinct question/state/ordered seed-and-sentence identities. Of its 168 occurrences, 131 are supported, 12 unsupported, 10 contradicted, and 15 ambiguous. The scored population contains 162 occurrences and 44 distinct identities. Those scores come from 44 retained live-origin judge rows and 118 recorded cache replays. Repeated occurrences are not independent observations. The identity formula is the SHA-256 of `[question, state, sources.map(({seed, sentence}) => [seed, sentence])]`; see `.orkestrel/agent/instruments/harness/bench5/refit/helpers.ts:291`.

The following distributions are derived only from scored entries in the immutable diagnosis. The `population/scored` column retains unscored lexical failures in its first denominator. Means and medians are descriptive score summaries, not calibrated factual-support probabilities. The extraction command is `node tmp/units/aggregate-l7-judge-diagnosis/measure.ts`; its input is `.orkestrel/agent/instruments/results/l7/calibration/q2/fit/diagnosis.json:21`.

| Population | Identity unit | Population/scored | Minimum | Median | Mean | Maximum | Admitted at 0.85 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Generated supported | occurrence | 131/130 | 0.331705 | 0.467793 | 0.516537 | 0.896527 | 1 |
| Generated supported | distinct | 33/32 | 0.331705 | 0.517647 | 0.534739 | 0.896527 | 1 |
| Generated nonpositive | occurrence | 37/32 | 0.261784 | 0.415483 | 0.461700 | 0.842523 | 0 |
| Generated nonpositive | distinct | 14/12 | 0.261784 | 0.574032 | 0.566418 | 0.842523 | 0 |
| Generated unsupported | occurrence | 12/12 | 0.261784 | 0.261784 | 0.335828 | 0.842523 | 0 |
| Generated unsupported | distinct | 3/3 | 0.261784 | 0.569577 | 0.557961 | 0.842523 | 0 |
| Generated contradicted | occurrence | 10/9 | 0.289143 | 0.415483 | 0.401445 | 0.415483 | 0 |
| Generated contradicted | distinct | 3/2 | 0.289143 | 0.352313 | 0.352313 | 0.415483 | 0 |
| Generated ambiguous | occurrence | 15/11 | 0.504879 | 0.590128 | 0.648313 | 0.787802 | 0 |
| Generated ambiguous | distinct | 8/7 | 0.504879 | 0.590128 | 0.631215 | 0.787802 | 0 |
| Archived supported | occurrence | 5/4 | 0.472187 | 0.504321 | 0.498015 | 0.511230 | 0 |
| Archived supported | distinct | 4/3 | 0.472187 | 0.497412 | 0.493610 | 0.511230 | 0 |
| Archived nonpositive | occurrence | 7/5 | 0.480117 | 0.530867 | 0.597214 | 0.775360 | 0 |
| Archived nonpositive | distinct | 7/5 | 0.480117 | 0.530867 | 0.597214 | 0.775360 | 0 |

The generated score bins show the overlap without conflating repetition and distinct content. Each interval includes its left endpoint and excludes its right endpoint, except the final interval includes 1.

| Score interval | Supported occurrences | Supported distinct | Nonpositive occurrences | Nonpositive distinct |
| --- | --- | --- | --- | --- |
| [0, 0.25) | 0 | 0 | 0 | 0 |
| [0.25, 0.5) | 73 | 15 | 19 | 3 |
| [0.5, 0.6) | 24 | 8 | 7 | 5 |
| [0.6, 0.7) | 18 | 5 | 1 | 1 |
| [0.7, 0.8) | 10 | 1 | 4 | 2 |
| [0.8, 0.85) | 4 | 2 | 1 | 1 |
| [0.85, 1] | 1 | 1 | 0 | 0 |

The lexical exclusions remain actual exclusions, not assigned zero scores. Supported `a1aef41a-099a-4d74-a1fd-2af89737c6d7` fails `id: 2026-10`. Ambiguous `6c652fe6-ac03-41ca-93e8-4cc8c8266499`, `b9de8554-c103-4881-8b46-b9de5cb4b1c8`, `91992233-12ad-49b2-8e14-cb3c6fe368dd`, and `fa465dda-6dc4-42ef-92d3-f8e2138d425d` share the `id: FL-66` failure. Contradicted `ef052ee0-0627-4308-ac57-980c6bdaecff` fails `number: 3`. These are 6 occurrences across 3 distinct identities; none has an AGREE score. See `.orkestrel/agent/instruments/results/l7/calibration/q2/generation/attempts.jsonl:21`, `.orkestrel/agent/instruments/results/l7/calibration/q2/generation/attempts.jsonl:72`, and `.orkestrel/agent/instruments/results/l7/calibration/q2/generation/attempts.jsonl:147`.

The archived controls remain separate: 12 occurrences, 11 distinct identities, 9 scored occurrences, and 8 scored identities. Their highest nonpositive score is `0.7753600931549042`, from `797dffb6c68900f1e432f3f9f631eb1ac6618557709519d80e70a8fbda47abd7-000001`, labeled unsupported. They do not force the observed 0.85 cutoff because the generated unsupported maximum is higher. Archived supported entries never enter generated recall's numerator or denominator; see `.orkestrel/agent/instruments/harness/bench5/refit/helpers.ts:215` and the retained controls at `.orkestrel/agent/instruments/results/l7/calibration/q2/fit/controls.json:1`. This report does not reopen archived adjudication.

## Decisive and representative readings

The decisive unsupported item invents material relations while retaining many correct entities. Candidate `fbb56761-030c-4056-bee5-e1def8cc9aba` asserts that cracked pendant glass requires an electrician's repair before replacement can proceed, and that Grace's missing duvet replacement is caused by Owen's departure from Copperline and Hana's email-only contact. The source says only “Sigrid: Her electrician found it when unpacking this morning.” The Copperline buyer update and Grace's duvet request occur in separate messages; the source supplies no causal connection. Root's settled propositions retain both invented relations as unsupported. Its score `0.842522895608751` exceeds every supported score except the admitted maximum. Exact evidence: `.orkestrel/agent/instruments/results/l7/calibration/q2/generation/attempts.jsonl:164`, `.orkestrel/agent/instruments/results/l7/calibration/q2/generation/packet.jsonl:165`, `.orkestrel/agent/instruments/results/l7/calibration/q2/labels.json:5691`, and `.orkestrel/agent/instruments/results/l7/calibration/q2/cache/judge.jsonl:991`.

The highest ambiguous reading also remains nonpositive. Candidate `e2fe232d-a49d-4a84-a3c8-64cc8db258cd` scores `0.7878017389429337`. It calls trace reference TR-3307 “tracking,” although the source separately names parcel tracking PW-5521-9930, and changes the conditional plan “we send her replacement” into “will receive a replacement.” Root preserves ambiguity about trace versus tracking and dispatch versus receipt. Exact evidence: `.orkestrel/agent/instruments/results/l7/calibration/q2/generation/packet.jsonl:153`, `.orkestrel/agent/instruments/results/l7/calibration/q2/labels.json:5249`, and `.orkestrel/agent/instruments/results/l7/calibration/q2/cache/judge.jsonl:963`.

The admitted supported item preserves the conditional plan. Candidate `079f08df-5f81-4b0a-9643-350fa127128a` scores `0.8965268029242978`; it reports Grace's missing order and retains “if nothing turns up by the end of the day we send her replacement.” Root's propositions explicitly distinguish that plan from dispatch or receipt. Exact evidence: `.orkestrel/agent/instruments/results/l7/calibration/q2/generation/packet.jsonl:7`, `.orkestrel/agent/instruments/results/l7/calibration/q2/labels.json:216`, and `.orkestrel/agent/instruments/results/l7/calibration/q2/cache/judge.jsonl:962`.

The next-highest supported item falls below the decisive unsupported reading. Candidate `607a10e5-5389-44de-a532-f2751d5779a9` scores `0.8167389347840125`; its supported propositions retain Tomasz's reported depot release, Grace's conditional replacement plan, and Marcus's revised preference for free freight. The source directly states “instead of the $50 store credit, he'd rather we offer free freight on their next order.” Exact evidence: `.orkestrel/agent/instruments/results/l7/calibration/q2/generation/packet.jsonl:69`, `.orkestrel/agent/instruments/results/l7/calibration/q2/labels.json:2440`, and `.orkestrel/agent/instruments/results/l7/calibration/q2/cache/judge.jsonl:968`.

A supported extractive example scores near the middle. Candidate `66fcf6ca-9400-48c2-ac72-b583b9629f04` scores `0.5364715654732044`; its clauses about the approval-code requirement, MX-4486 replacing MX-4471, and full refunds for opened-item returns occur verbatim in its source lines. This identity repeats across 10 occurrences with the same score. Exact evidence: `.orkestrel/agent/instruments/results/l7/calibration/q2/generation/packet.jsonl:71`, `.orkestrel/agent/instruments/results/l7/calibration/q2/labels.json:2527`, and `.orkestrel/agent/instruments/results/l7/calibration/q2/cache/judge.jsonl:949`.

The minimum supported score is `0.33170452348068125`. Candidate `23060fe4-7c70-451b-b414-90e13412f9a1` preserves Farah's corrected address, the curtains' order facts, and her request for something off her next order. Root's settled propositions bind “91 Quarry Lane, not 19” to the correction and distinguish the compensation request from a grant. Exact evidence: `.orkestrel/agent/instruments/results/l7/calibration/q2/generation/packet.jsonl:19`, `.orkestrel/agent/instruments/results/l7/calibration/q2/labels.json:642`, and `.orkestrel/agent/instruments/results/l7/calibration/q2/cache/judge.jsonl:982`. These examples establish disagreement with the settled support labels; they do not reveal the judge's internal reason.

## Logical request, rendering, score, and fit

The AGREE question asks “Does the summary agree with its source messages?” Its positive criterion requires every statement to match the source after later replacement; its negative criterion covers contradiction, replacement, and assertions the sources do not state. The positive criterion does not require complete coverage of every source fact. See `.orkestrel/agent/instruments/harness/bench5/aggregates/constants.ts:20`.

The state is the complete candidate prose, followed by `Source messages:` and every supplied source rendered as `(day) role: text`. The direct implementation performs no clipping at this seam. The extraction independently reconstructs every logical state from the packet's source rows and compares it against both the attempt and corpus group; all 168 match. Every scored attempt also matches its retained judge question, state, answer, and usage. This establishes no missing candidate or source input in the retained logical records, not historical wire completeness. See `.orkestrel/agent/instruments/harness/bench5/aggregates/helpers.ts:308`, `.orkestrel/agent/instruments/harness/bench5/aggregates/helpers.ts:449`, and `.orkestrel/agent/instruments/harness/bench5/refit/Refit.ts:564`.

The vendored renderer places that full state inside `<state>` tags, renders false and true descriptions, and directs “Answer Yes if true, or No if false.” It adds the configured system prompt and an empty thinking block. Control-token escaping inserts a zero-width character; it does not remove ordinary summary/source text. The body requests raw, non-streaming `/api/generate` output with first-position top-20 logprobs, `num_predict: 1`, `temperature: 1`, and `num_ctx: 4096`. These are implementation facts, not captured wire observations. See `.orkestrel/agent/instruments/harness/vendor/ollama/index.js:81`, `.orkestrel/agent/instruments/harness/vendor/ollama/index.js:113`, `.orkestrel/agent/instruments/harness/vendor/ollama/index.js:533`, and `.orkestrel/agent/instruments/harness/vendor/ollama/index.js:566`.

The declared scoring direction is correct. `false` maps to the exact token `No`; `true` maps to `Yes`. The scorer extracts their first-position logprobs, refuses missing candidates, forms weights `exp((logprob - peak) / T)` with `T = 1.1244734010661372`, normalizes over those candidate weights, and returns the `true` weight as `noul`. It does not return the probability of the generated token, invert the answer, or normalize over every vocabulary token. See `.orkestrel/agent/instruments/harness/vendor/ollama/index.js:135` and `.orkestrel/agent/instruments/harness/vendor/ollama/index.js:167`. Raw logprobs are absent, so historical arithmetic cannot be independently reproduced. A configured calibration temperature and a normalized candidate weight do not establish empirical calibration as a probability of factual support on this corpus.

The cache identity is the SHA-256 of `[configured judge identity, state, question]`. The configured identity carries the model tag, system prompt, calibration temperature, effective options, and rendering revision. All 162 scored attempt joins reproduce their retained cache key and score; all 44 retained judge rows are present verbatim in the completed cache and carry the same configuration and live origin. Replay returns the stored answer without score transformation. The observed attempts record 44 fresh judge requests and 118 replays, with no missing score after lexical success. See `.orkestrel/agent/instruments/harness/bench5/helpers.ts:326`, `.orkestrel/agent/instruments/harness/bench5/JudgeCache.ts:88`, `.orkestrel/agent/instruments/harness/bench5/JudgeCache.ts:111`, and `.orkestrel/agent/instruments/harness/vendor/ollama/index.js:215`. This refutes a mismatch among these logical records; it does not attest daemon model bytes on each request.

The retained role identity distinguishes the summarizer from the judge. Qwen `qwen3.5:2b-q4_K_M` is the summarizer, digest `78a738cc751e89cba72bb1feabf70f30c31772eb81a89a66af94ecea90dc5d11`. Mica `hf.co/sky7350/Mica-v0.1-4B:Q4_K_M` is the fixed judge, digest `ccc93a29870522845fccafeb24fbef6c7307995fd9db105cb5c0abff8da3ce9b`. These are frozen configuration bindings in `.orkestrel/agent/instruments/results/l7/calibration/q2/generation/manifest.json:1`; they are not evidence about another candidate model's result.

The judge superclass also differs from the trimmed selection engine. Refit imports classifier/ledger exports from `agent-0.0.30-trimmed`, while vendored Ollama imports `AgentJudge` through bare `@orkestrel/agent`. Exact ESM resolution from the emitted Ollama module points to the harness-local installed `@orkestrel/agent` version 0.0.29, whose `AgentJudge.ask` calls `this.body(part)`. The trimmed engine's `this.encode(part)` does not govern this judge. See `.orkestrel/agent/instruments/harness/bench5/refit/Refit.ts:17`, `.orkestrel/agent/instruments/harness/vendor/ollama/index.js:1`, `.orkestrel/agent/instruments/harness/node_modules/@orkestrel/agent/package.json:29`, and `.orkestrel/agent/instruments/harness/node_modules/@orkestrel/agent/dist/src/core/index.js:3618`. The declared operator launches emitted `bench5/refit.js` without a loader argument; see `tmp/units/aggregate-live-preparation-l7.ts:122` and `tmp/units/aggregate-live-feasibility-l7.ts:68`.

The installed superclass has a historical custody limit. Its measured package manifest hash is `f55b1af71c557680b033156f98bbea837d5514b24d66ecda4f87739ee443029b`; its ESM runtime hash is `ecee2bbe5da411b8234d4dc931eb85a14e39e3f6999e9a7ce41ab7c044de5636`. The generation-bound canonical build manifest binds that package's declaration file, hash `34ccc26adf79ea4f28ed5acd9d43a5fc0c09c27a34089ec276146a7d10341604`, but contains no source/output entry for its runtime file or package manifest. The runtime reading explains present resolution; it does not establish that those installed runtime bytes were identical during generation. No package drift is demonstrated, and this gap does not alter the retained normalized scores or fit arithmetic.

The usage records argue against ordinary context exhaustion without proving its absence. All 44 retained judge rows report one completion token and prompt usage between 296 and 1363 tokens, below the configured 4096 context. The decisive unsupported item reports 1029 prompt tokens; the admitted supported item reports 850. One completion token is the intended label readout, not evidence of an incomplete prose answer. The raw finish reason and original token sequence are absent, so these counts cannot exclude truncation that occurred before the reported counts. See `.orkestrel/agent/instruments/results/l7/calibration/q2/cache/judge.jsonl:991`, `.orkestrel/agent/instruments/results/l7/calibration/q2/cache/judge.jsonl:962`, and `.orkestrel/agent/instruments/harness/vendor/ollama/index.js:593`.

The cutoff and recall arithmetic follow the declared rule. The grid runs from 0.51 through 1.00 in 0.01 steps. Negatives include unsupported, contradicted, and ambiguous scored readings from generated and archived populations. Every negative must score strictly below the cutoff; supported admission uses `score >= cutoff`. A cutoff of 0.84 would admit the decisive unsupported item, and 0.85 is the first grid value that excludes it. Generated conditional recall is `1/130 = 0.007692307692307693`; generated end-to-end admission remains `1/131`. Distinct conditional recall is `1/32 = 0.03125`; distinct admission is `1/33 = 0.030303030303030304`. See `.orkestrel/agent/instruments/harness/bench5/refit/constants.ts:4`, `.orkestrel/agent/instruments/harness/bench5/refit/helpers.ts:215`, and `.orkestrel/agent/instruments/harness/bench5/aggregates/Aggregator.ts:382`. The fit entry writes the diagnosis and returns exit 3 before writing an accepted fit, at `.orkestrel/agent/instruments/harness/bench5/refit/Refit.ts:714`. The retained root report records that exit uncapped in 2079 ms; this unit did not rerun fitting.

## Bounded finding and next hypothesis

No inspected implementation defect explains the refusal. The evidence establishes a faithful logical join, the intended answer direction, unchanged cutoff arithmetic, and poor separation under the retained labels. It does not establish wire fidelity, historical logprob arithmetic, installed-superclass byte continuity, or the semantic reason Mica assigned these readings. The source-clause prompt can improve supported output while this unchanged classifier still refuses qualification; the refusal is not a records-versus-aggregate work-quality verdict.

The smallest defensible semantic hypothesis is that the whole-summary AGREE readout responds to overall semantic compatibility while failing to enforce the universal requirement that every asserted relation be supported. The decisive candidate preserves many correct entities and events but invents a prerequisite and a cross-customer causal relation; the high score is consistent with that hypothesis. The retained records do not distinguish it from rendering sensitivity or another model-internal cause. A future controlled comparison, if separately authorized, would hold this exact source state and judge configuration fixed while removing only those unsupported relations, with raw request and logprob evidence retained. This report authorizes no request, prompt change, model change, threshold change, budget change, classifier change, or protocol change. Root retains the measured refusal and decides after the completed cohort.

## Relevant artifact custody and commands

The extraction compares the named source hashes against the generation manifest and emitted hashes against its bound build manifest. The following paths are relative to `.orkestrel/agent/instruments/harness`; emitted paths use `.build/` and replace `.ts` with `.js`.

| Source path | Source SHA-256 | Emitted SHA-256 |
| --- | --- | --- |
| `bench5/refit/Refit.ts` | `7adc4aa7e21c98bdb41ab1fd615be287d7a77d6558de814bb86dd7efadd9ac97` | `788a1a5d88b5698c9a089b85ed20e42065427380a9471c552cff50f5cd3555fd` |
| `bench5/refit/helpers.ts` | `d5b3fc08991d29c859b25e1a222c5b97e9198df7dac447cc4375e52cc6c73009` | `8887936bfaf6dcec7af63eed7d136650b02bf629108a8db746474ff685eab272` |
| `bench5/refit/constants.ts` | `9f2ad1143191951eb5760ef863e074c1a276c2194ee3c5dca842e2959cab926a` | `f8de7f8f3bc66c85f73d0869f66a62c181ad510d4d8888662962747ab12818dc` |
| `bench5/aggregates/Aggregator.ts` | `36878026f7671409c90fd98cc7aebc9198783a640a322fa094c34f46c90d46eb` | `bdee625099771647b3fd098950f7991ad466428e5f7c9e9281ae8d698e118c0b` |
| `bench5/aggregates/helpers.ts` | `8eec22db214fe5dd1089b2b615db05f9874e2fcf8af2f868479f645842f3a3c4` | `6451ba655507b37b37acec1034eb769a1aa45532559e9270960ae662420dd19b` |
| `bench5/aggregates/constants.ts` | `c37b28de4ddc02111bed0768d6df9697bce7c977e1c8282f360d620c1efdd15f` | `b8d32fcd8144351b377c06459b2fe9b70be610e18b87dfabd0c9ccc23032555e` |
| `bench5/JudgeCache.ts` | `95aeb9e3325c1b8339d7eaaacefc2fd5f7fb8257ace3139d67c14354f27305cc` | `b72af7e7320c4512b56151562e4750c4e3053136271222ee37ba5c807b883630` |
| `bench5/helpers.ts` | `df9453215a1c67c8f4ebf7bf0f5be97f2088187b0acab690e72c4bfac96f513a` | `0e8092f1673ccbdd67f1ad44f0bad407ccfa514fd86a42a913ce80bbdc319d70` |
| `vendor/ollama/index.js` | `e09277478a425e6227f37730a29b2df5d9f80cfc595740cd0335fa05da22b4a7` | same |
| `vendor/agent-0.0.30-trimmed/index.js` | `8f040acf72b6426246b79e5c2f31d3644291e4c08f49434ad1224e16f176311d` | same |

The read-only analytical commands ran on Windows on 2026-10-11. They read completed q2 evidence and the named source boundaries; they do not import model modules, call a model, invoke fitting, rebuild, run project gates, or edit source. Host model load is not measured by this offline analysis, and it makes no timing claim of its own.

```text
node tmp/units/aggregate-l7-judge-diagnosis/measure.ts
node tmp/units/aggregate-l7-judge-diagnosis/verify.ts fbb56761-030c-4056-bee5-e1def8cc9aba 079f08df-5f81-4b0a-9643-350fa127128a 23060fe4-7c70-451b-b414-90e13412f9a1 607a10e5-5389-44de-a532-f2751d5779a9 e2fe232d-a49d-4a84-a3c8-64cc8db258cd 66fcf6ca-9400-48c2-ac72-b583b9629f04 a1aef41a-099a-4d74-a1fd-2af89737c6d7
node tmp/units/aggregate-l7-judge-diagnosis/cases.ts fbb56761-030c-4056-bee5-e1def8cc9aba 079f08df-5f81-4b0a-9643-350fa127128a 23060fe4-7c70-451b-b414-90e13412f9a1
node tmp/units/aggregate-l7-judge-diagnosis/cases.ts e2fe232d-a49d-4a84-a3c8-64cc8db258cd 607a10e5-5389-44de-a532-f2751d5779a9
node --experimental-import-meta-resolve tmp/units/aggregate-l7-judge-diagnosis/resolve.ts
```

The extraction scripts initially exposed an empty-control median case and an incorrect package-root assumption; both script errors were corrected before the reported successful readings. These are extraction-tool errors, not defects in the retained experiment. The ESM resolver only resolves an identifier and reads bytes; it performs no module import. The `lines.ts` helper and bounded `rg -n` reads supplied the source citations. No label, result, threshold, shared record, project, or runtime artifact was changed.
