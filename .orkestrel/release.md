# Study and Scaffold release preparation, 2026-10-24

The user requested preparation of Study and Scaffold for their next publication and a readiness report before supplying the one-time code. This authorizes the repository visits, necessary release repairs, commits, and pushes for these packages. Upload waits for the code. It opens scaffold work previously held by U23 and Study release preparation previously held by U25; it does not authorize an Agent release or an unrelated roadmap campaign.

## Entry and order

Registry readings on 2026-10-24: Scaffold 0.0.105 at `b40ed8a6536251455f3a1b647b46e204631ca6e8`; Study 0.0.3 at `89c58bfe1ebeb9bb598e2573a63c168e103962aa`. Initial clean tips: Scaffold `ce5393a26`, Study `6e30457`. Both fetched origin without incoming commits. Node is 24.22.1 with npm 12.0.2; the floor runtime is Agent's `tmp/runtimes/node-v22.18.0-npm11-win-x64`.

Scaffold publishes ahead as the development authority, then Study. Candidate versions are Scaffold 0.0.106 and Study 0.0.4, subject to the artifact comparison and independent review. The catalog reports Scaffold L3 and Study L7. Study's runtime dependencies remain registry releases; its development Scaffold pin can stay on the registry-served 0.0.105 for this preparation, then adopt 0.0.106 after publication with the required checks. No local pin exists in either release checkout.

## Parallel ownership

The Orchestrator ran independent visit preparation in the disjoint main checkouts. Each checkout has one writer. D1's read-only reviews remain in Agent; no D1 source or GPU run starts while this release is prepared. Preserve their results and the original campaign objective. Heavy gate chains run serially under a verifier; read-only review can overlap them. Every subagent performs its own assignment and spawns nothing. No broad cleanup runs over retained campaign evidence.

## Visits

| Package | Preparation | Evidence | Remaining |
| --- | --- | --- | --- |
| Scaffold | `wave --visit --to record --prior 0.0.105` exited 0, 15.069 seconds; registry audit and installs passed; self-pin sweep found 41 hits for ruling; no self-overwrite ran | `../scaffold/tmp/units/release-20261024-scaffold-visit.log`; matching `.err` | self-pin disposition, rebuilt artifact comparison, release review, bump, full release gates and floor proofs, pack identity, commit and push |
| Study | `wave --visit --to record --prior 0.0.3` exited 0, 18.356 seconds; re-pinned Scaffold to 0.0.105, overwrite and audit passed, no self-pin hit | `../study/tmp/units/release-20261024-study-visit.log`; matching `.err` | rebuilt artifact comparison, release review, bump, full release gates and floor proofs, pack identity, commit and push |

No upload, login, one-time-code request, model request, or GPU charge has occurred. Agent's local Study pin and dependent unpublished commits remain under custody until the published Study adoption is proved. Save unit IDs and each gate result here before handing work back.

## Active dispatch

Verifier GPT-6 Luna medium, T3 task `node:delegated-task:command%3Amcp%3A0cc53948-e0cd-428d-bcba-9827c577dde4%3Adelegate-task%3Arelease-20261024-compare-r1`, owns serial builds and registry artifact comparisons only. Brief: `tmp/units/release-20261024-compare-brief.md`; report: `tmp/units/release-20261024-compare-report.md`. No other build or gate runner starts before it exits. Release review, bump, final gates, packing and pushes remain pending.

RELEASE: OPEN — Scaffold and Study are in preparation.
