# Aggregate capacity-probe independent verification report

Status: **stopped at a location-bound packet conflict; offline validation is incomplete.** No source, prepared artifact, writer report, or service was modified or invoked.

## Expected and found

The verification copy was intended to let the unchanged offline validator run while keeping its output inside the verifier-owned directory. Its packet builder derives identity paths from the unit location, however, so the copy rebuilds a different packet. The gate stops at the exact serialized-packet comparison, before the sequence, custody, arithmetic, or refusal-control assertions. The original packet binds `tmp/units/aggregate-capacity-probe/types.ts` and operator digest `b054ebc86779435ff2935b9a1a669d9a7eac6f20b538ab5fe5d8d6dcce50aa6f`; the copy resolves `tmp/units/aggregate-capacity-probe-verify/types.ts` and computes `b73f2c581ec1f54ce9b0d11adac426560310db5026894dbb1340838b2e4aff76`.

I did not rerun against the original unit or adjust the validator, constants, packet, or output boundary. The validator binds its output custody to the original unit, while the task limits verifier-owned writes to the separate verifier directory. A successful run would require crossing one of those boundaries. This is the scope conflict anticipated by the brief's stop instruction.

## Completed evidence

- Scoped strict TypeScript command `node node_modules/typescript/bin/tsc -p tmp/units/aggregate-capacity-probe/tsconfig.json` exited 0.
- `node --check tmp/units/aggregate-capacity-probe/inventory.ts` exited 0.
- The unchanged `verify.ts` and validation sources were copied with the prepared fixture into the verifier-owned mirror, preserving directory depth. Running `node tmp/units/aggregate-capacity-probe-verify/verify.ts` exited 1 at the packet equality described above. No gate result was persisted by that failed run.
- Read-only post-run hashes still match the writer-recorded values: `prepared/packet.json` SHA-256 `27ff15eb80f8dba7d236cdf08e4330a3e37ddd8fd9a46afaaf11ddd77f2a9f7d2`; `final-source-inventory.json` SHA-256 `cdfead2e08c018d73fab43e274b8c8abef7103f231517064ede4ace99bfcb0e2`; original `checks/offline.json` SHA-256 `db5daf8d0277e563db9ce4fa89091fca33f107f85a32e5156a6d66f382919cfe`.
- The verification attempt made no network, model, or service calls. The actual sequence/body binding and admission/refusal gates remain **not independently verified** by this run.

## Raw logs and owned artifacts

- TypeScript stdout: `C:\Users\mikes\WebstormProjects\scaffold\tmp\units\aggregate-capacity-probe-verify-types.stdout.txt`
- TypeScript stderr: `C:\Users\mikes\WebstormProjects\scaffold\tmp\units\aggregate-capacity-probe-verify-types.stderr.txt`
- Inventory syntax stdout: `C:\Users\mikes\WebstormProjects\scaffold\tmp\units\aggregate-capacity-probe-verify-inventory-syntax.stdout.txt`
- Inventory syntax stderr: `C:\Users\mikes\WebstormProjects\scaffold\tmp\units\aggregate-capacity-probe-verify-inventory-syntax.stderr.txt`
- Mirror gate stdout: `C:\Users\mikes\WebstormProjects\scaffold\tmp\units\aggregate-capacity-probe-verify-check.stdout.txt`
- Mirror gate stderr (full assertion diff): `C:\Users\mikes\WebstormProjects\scaffold\tmp\units\aggregate-capacity-probe-verify-check.stderr.txt`
- Owned mirror and copied prepared fixture: `C:\Users\mikes\WebstormProjects\scaffold\tmp\units\aggregate-capacity-probe-verify\`

Hypothesis: the packet is intentionally location-bound through canonical relative paths and operator-file hashing, so an isolated copy cannot pass byte equality without changing the validation identity or exercising writes within the original unit.


