# L12 maintenance verifier evidence

The released verifier run completed uncapped with exit 0 in 123,018 ms. Both prescribed Driver mutations reached their named assertions, restored the exact original bytes, and the restored focused, development, and capacity tests passed. The canonical build manifest matches root's supplied identity. This report records evidence only; root retains source/build custody and makes the acceptance decision.

## Launch and execution

The tracked command was:

```text
node .agents/skills/orkestrel-dispatch/scripts/launch.ts --journal tmp/units/aggregate-l12-maintenance-verifier-2.jsonl --errors tmp/units/aggregate-l12-maintenance-verifier-2.err --cap 900 --status -- node tmp/units/aggregate-l12-maintenance-verifier-run.ts
```

The TypeScript runner invoked each stage using `node` with the exact argument arrays retained in `aggregate-l12-maintenance-verifier-logs/*.json`; stdout and stderr are retained as separate bare files beside them. Static gates were read-only: harness typecheck exit 0 in 3,298 ms, scoped Oxlint exit 0 in 302 ms, and scoped Oxfmt check exit 0 in 81 ms. The checks covered all eight writer-owned bench5 files. No format-write stage ran.

The first launcher attempt, `aggregate-l12-maintenance-verifier.jsonl`, stopped at the initial hash gate in 97 ms (exit 1) before any stage or mutation. The Driver hash had been mistyped while transcribing the supplied custody record. The config was corrected directly from `aggregate-l12-maintenance-fix-custody.json`; the final run rechecked all eight exact hashes before gates and mutations. There was no source or build write from this failed preflight.

## Reached mutations

Both mutations used the unique anchor in `bench5/Driver.ts`:

```text
qualification = new Error(`local capped summary unavailable at request ${sequence}`)
```

The focused selector was `withholds a capped rebuilt summary while real development decisions and later recovery continue`.

The sticky-stop mutation restored the global integrity stop using the exact replacement in `aggregate-l12-maintenance-fix-anchors.json`. Its build exited 0 in 4,455 ms. The focused test exited 1 in 9,495 ms with 1 test, 0 pass, 1 fail. Bare output contains the assertion `a capped summary must leave later development decisions reachable` and the actual refusal `development integrity failure at request 523`. This reaches the required later-decision assertion after the authentic refusal.

After byte-exact restoration, the content-leak mutation bypassed only the refusal throw (`qualification = undefined`). Its build exited 0 in 4,291 ms. The same focused test exited 1 in 11,501 ms with 1 test, 0 pass, 1 fail. Bare output contains `refused candidate must never enter the summary cache`; the candidate reached the cache assertion despite the retained rendering checks.

After each mutation, `Driver.ts` was restored from the saved original bytes in a `finally` path. Both restoration records report `byteExact: true` and SHA-256 `d03ae92dc7fdfc2e38b7d4073ae78e305fafffa0788fd543ec94b57f61a5d14d`. The mutations and restoration records are in `aggregate-l12-maintenance-verifier-logs/`.

## Restored build and tests

After both restorations, the canonical resource-free harness build exited 0 in 4,407 ms. The focused test exited 0 in 12,001 ms with 1 test, 1 pass, 0 fail. The complete development file exited 0 in 71,843 ms with 6 tests, 6 pass, 0 fail. The complete capacity file exited 0 in 404 ms with 7 tests, 7 pass, 0 fail. These runs retain the writer's decision, judge, flush, XML, and missing-usage controls in the touched test files.

The emitted `.build/build-manifest.json` SHA-256 is `51880a44f7f11e509e0c797e8b3321c6921c551fcc24ff26b2d1c0f97747da9b`, matching root's expected hash. All 1,318 manifest input/source/resource/output records passed on-disk hash verification. The manifest contains one resource and no fixture-resource binding (`fixtureResourceBinding: false`). Structured identity is in `aggregate-l12-maintenance-verifier-logs/manifest.json`.

The final eight source hashes exactly match the supplied custody record:

| Source | SHA-256 |
| --- | --- |
| `bench5/Driver.ts` | `d03ae92dc7fdfc2e38b7d4073ae78e305fafffa0788fd543ec94b57f61a5d14d` |
| `bench5/matrix/types.ts` | `b93948d2878f7846a86a518f4d9637ff13990d6e50e5d2946ecad432e390407d` |
| `bench5/matrix/validators.ts` | `f1183260e4f29f622f7591222e4881c8c72e52705ee951cdf4c610ab45478c1b` |
| `bench5/matrix/helpers.ts` | `21c889f7af34206db51f9b3db3cfd7c5e6ee58f6f775ae9315aafc43d1994b64` |
| `bench5/tests/development.test.ts` | `ab6ef99708024e75d15e5838924043acb5524571f2f019a7570d0d4176373a03` |
| `bench5/tests/matrixFixture.ts` | `8bd4d108668273de77f3b55deb6b7cf1df0ce1d43f91744d37bf77603805cadf` |
| `bench5/tests/refit/helpers.ts` | `06732a06c5c79ef18082d8bbbeb85af6038b5009a9e0108395d18a8e7a1df8ba` |
| `bench5/matrix/tests/capacity.test.ts` | `8231fb5bbdc325ba53279f9330a702a67dcd88468ef4293c5568babef34d90e1` |

## Status and process custody

The launcher's before and after status files are byte-identical. They show the same pre-existing changes in bench4 and the eight writer-owned bench5 files, plus the same untracked nested harness cache. No Git operation was run, and the verifier added only files beneath its `tmp/units/aggregate-l12-maintenance-verifier` prefix.

The launch used exec session 84088, launcher PID 24892, and a 900-second cap. Terminal result: exit 0, `capped=false`, duration 123,018 ms. A TypeScript-owned query found the launcher and all 11 stage PIDs absent from the Windows CIM process snapshot, with no remaining descendants. Its evidence is `aggregate-l12-maintenance-verifier-process-closure-typescript.json`. The earlier `aggregate-l12-maintenance-verifier-process-closure.json` is retained as historical evidence only: I had produced it with a PowerShell `.ps1` script, which violated the repository's TypeScript-only script rule. I did not execute or change that PowerShell script again. The TypeScript query independently confirms the same empty process tree. The stage log records every command's PID, exit, and duration. Source bytes and canonical build output are restored and match the supplied identities; source/build custody is returned to root.
