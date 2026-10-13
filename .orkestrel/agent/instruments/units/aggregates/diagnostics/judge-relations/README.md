# Judge relation-deletion diagnostic

Root accepts the recorded requests, response probabilities, repeated scores, and independent arithmetic. The positive-control label was corrected on 2026-10-11: the relation-deletion variant still asserts an unsupported continuing open state. This run therefore supplies no supported-versus-unsupported comparison and no judge-misranking conclusion. See [the validity correction](../../reports/resumption-focus-control-correction.md).

The live sequence ran in 22635 ms, exit 0 uncapped, with 8 inference requests and 2 daemon checks. The fixed variants produced the following normalized Yes weights; each repeated exactly in the reverse sequence.

| Variant | Settled support | Score |
| --- | --- | ---: |
| Original | Unsupported | 0.842522895608751 |
| Invented prerequisite removed | Unsupported causal relation remains | 0.7995156693414494 |
| Invented cause removed | Unsupported prerequisite remains | 0.8600901565538989 |
| Both invented relationships removed | Unsupported open-state assertion; corrected label | 0.8409998800116883 |

Independent replay differed by zero for every request. Reported usage totals are 8184 prompt and 8 completion tokens. These normalized weights are not calibrated probabilities of factual support. The model's sampled answer token can differ while the underlying weight stays identical. The one-token length finish is the declared judge readout, not a truncated prose answer.

Root read the complete verifier report, actual original and supported raw responses, daemon identity comparisons, and compact sequence readings, and reproduced the original arithmetic directly. The accepted live report SHA-256 is `71ac5792f83e91f8f5fbd584c29db82194a210e20e4dcbb484c33705c64f352d`. See [the live verification report](aggregate-judge-counterfactual-live-report.md). Exact live evidence is retained in `instrument/live-reviewed-repair-1`; its copied file hashes match the working output.

The `instrument` directory preserves the exact contents of scaffold's `tmp/units/aggregate-judge-counterfactual` on 2026-10-11. Root compared the directory diff and every file's SHA-256 after copying: no differences across the retained 270 files, totaling 1130264 bytes. Precursor plans and failed proof attempts remain separate from the accepted successor.

The executable working location is `tmp/units/aggregate-judge-counterfactual` beneath the scaffold checkout. The instrument resolves its frozen inputs against that location and the retained campaign records. Restore this directory to that vacant working location to reproduce its offline checks. Do not execute the archive in place or overwrite an existing run.

The accepted identities are recorded in the following table.

| Artifact | SHA-256 |
| --- | --- |
| Frozen packet | `438710a277663ca0c28a2b6bf3f6c47b354312c12ddb02d0cd697a212499c11f` |
| `plan-ready-repair-typed.json` | `e4f5dfce5b1d6c6fdaf62ddded496c8bb69483c7e4e98f5923ba3d2fcd481f88` |
| Operator digest | `33570ee0bb82af8786854543ab9edafcde11c5309fa2a684aa16b5e438fa6756` |
| Canonical build manifest | `09c7d936ffaec46ed9deb5bdd300deb0f9643ad639519762d8d84e38ef513ecf` |
| Independent repair-verification report | `d2baa7a024a132afd9b1351a72fe1e8cd3200e7b7a1b4d2a6e202af0c151ed98` |

Root accepts the prescribed failure-record repair after independent verification. The collection passed 5 general and 3 completion tests, types, and syntax, with the expected failing direction control. Launcher duration was 5739 ms, uncapped. The mutation's collected test failed after suppressing the unavailable-result write and passed after exact restoration; its launcher took 791 ms, uncapped. The completed live sequence closes actual forwarding and arithmetic for this run. Cancellation and historical runtime continuity remain outside its proof.

The immutable verification report contains a copied hash error. Its independent `instrument/proof-repair-mutation-1791704973893/summary.json` hashes to `67e842ae2ad3b3278fa48fdfc6477f567792f8c0629fdacb0fc07847b1a75571`. The report's `ef7544381e5407d42e052e0d6ab9465e48e832ffd9a63f1f9aab98487e2c927d` instead identifies the writer's `proof-repair-mutation-1791704661272/summary.json`. Root checked the raw independent red/green outputs and restored bytes; the returned report remains unchanged.

The archive retains the exact unified patch in `instrument/proof-1791704617916/repair.diff`. The staged whitespace check reports its context markers before tab-indented source and blank context lines; root preserves these measured patch bytes. The check reports no other path. No source or report is reformatted during evidence promotion.

For the settled semantic evidence and the unresolved historical transport limits, see [the judge diagnosis](../../reports/resumption-l7-judge-diagnosis.md).
