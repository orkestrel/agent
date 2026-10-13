# q2 full-view recovery preparation

The unchanged full-view trajectory can be launched into a fresh q2-think0/full-retry-1 directory using the emitted matrix CLI and the pinned frozen/resource inputs. The existing matrix plan cannot consume that retry directory: its full-arm planner reads only q2-think0/full/manifest.json. This unit made no model request and changed no frozen or failed-run evidence.

## Verified custody

The frozen build manifest remains SHA-256 09c7d936ffaec46ed9deb5bdd300deb0f9643ad639519762d8d84e38ef513ecf. The l7 operator is 6949f241540dc3ac19514f775f89f3d54ae29f09411501b04b2269dd9bc2f082 and the emitted matrix entry is 6bc562837484dc2bc90fb9677fd4d40a977a2efce3abe8bd70475431a39547cb.

The q2-think0 frozen manifest is SHA-256 026ae06de9f2d132d93b20f5077ce17f77898c241bc94a4fa071f6579166d172. Its model is qwen3.5:2b-q4_K_M, digest 78a738cc751e89cba72bb1feabf70f30c31772eb81a89a66af94ecea90dc5d11, thinking disabled. All 79 frozen file and metadata bindings matched disk. The accepted records resource manifest is SHA-256 b7b098fd96e3a7d4058685f3d8f5a7491dfd257e3ca9c8fd1122a43be9689686; it references this frozen hash and records reserve 512, window 3,072, prediction reservation 0.

The original full-view manifest remains at .orkestrel/agent/instruments/results/l7/q2-think0/full/manifest.json with SHA-256 eb56191859179bf3bfaf2204fad9ec073a632b112dc105577436dc4a2d4ff3d4 and accepted=false. Its original bound file remains SHA-256 a0526fbde09a1418e6a0ab13e160dd91099b8e0c5ad8d7541d960777f8c2e47e. The original run, requests, execution, resource, and bound references checked here total 39 declarations with zero hash mismatches. The retained failure report identifies request 20 as a transport HTTP 500 with an XML parser error; that is operational evidence, not resource infeasibility (tmp/units/aggregate-q2-full-failure-report.md:3, tmp/units/aggregate-q2-full-failure-report.md:5). Its citation errata supplies the corrected extraction line references (tmp/units/aggregate-q2-full-failure/citation-errata.md:5).

The following retry output and journal paths were vacant at inspection:

- .orkestrel/agent/instruments/results/l7/q2-think0/full-retry-1/
- .orkestrel/agent/instruments/results/l7/logs/q2-think0-full-retry-1.log
- .orkestrel/agent/instruments/results/l7/logs/q2-think0-full-retry-1.err
- .orkestrel/agent/instruments/results/l7/logs/q2-think0-full-retry-1.log.pid
- tmp/units/aggregate-q2-full-recovery-report.md

## Prepared retry command

The no-execution operator preparation command printed a canonical full invocation using the existing q2-think0/freeze/manifest.json and accepted q2-think0/resource/manifest.json. It prints the fixed full directory and a 14,400-second cap. The operator source has no output-path option; it would target the already occupied full directory (tmp/units/aggregate-live-feasibility-l7.ts:58, tmp/units/aggregate-live-feasibility-l7.ts:66, tmp/units/aggregate-live-feasibility-l7.ts:75).

The emitted matrix CLI accepts full, --frozen, --resource, --out, and --live. Its full path reads and checks the frozen and accepted resource manifests, derives a bound, then writes under the explicit out path with create-only manifest writes (.orkestrel/agent/instruments/harness/bench5/matrix/Matrix.ts:54, .orkestrel/agent/instruments/harness/bench5/matrix/Matrix.ts:94, .orkestrel/agent/instruments/harness/bench5/matrix/Matrix.ts:326). readFrozen checks the bound bytes and protocol identity (.orkestrel/agent/instruments/harness/bench5/matrix/helpers.ts:132); readResource requires its frozen reference to equal the supplied freeze reference and validates each attempt (.orkestrel/agent/instruments/harness/bench5/matrix/helpers.ts:173). The frozen and resource inputs checked above match those guards. Because this phase starts a fresh copy-1 trajectory, it does not replay the failed request byte-for-byte or guarantee the same service state.

The exact proposed canonical launch, not executed by this unit, is:

    node .agents/skills/orkestrel-dispatch/scripts/launch.ts --journal .orkestrel/agent/instruments/results/l7/logs/q2-think0-full-retry-1.log --errors .orkestrel/agent/instruments/results/l7/logs/q2-think0-full-retry-1.err --cap 14400 --status -- node .orkestrel/agent/instruments/harness/.build/bench5/matrix.js full --frozen .orkestrel/agent/instruments/results/l7/q2-think0/freeze/manifest.json --resource .orkestrel/agent/instruments/results/l7/q2-think0/resource/manifest.json --out .orkestrel/agent/instruments/results/l7/q2-think0/full-retry-1 --live

The accepted l7 wrapper declares 14,400 seconds for full, matching the translated matrix command. The original full run took 1,043,149 ms uncapped; the proposed limit preserves the canonical cap rather than deriving a smaller run-specific cap (tmp/units/aggregate-live-feasibility-l7.ts:83; .orkestrel/agent/instruments/units/aggregates/matrix-commands.md:81). Expected output includes full-retry-1/bound.json, full-retry-1/manifest.json, and its preflight execution/run artifacts. Post-run custody must check the unchanged freeze/resource hashes, accepted outcome or authentic operational refusal, the manifest's exact frozen/resource/budget references, all bound/run hashes, raw launch logs, cap/exit/duration, and process/descendant closure. A transport error remains operational and must not be recast as infeasibility.

## Downstream path guard

The evaluation driver accepts an explicit --manifest FILE argument and calls readExecution on that execution manifest (.orkestrel/agent/instruments/harness/bench5/Driver.ts:371). readExecution requires a full manifest reference for full evaluation, then checks accepted=true, exact frozen identity, the execution budget, one attempt, and the retained attempt's full phase, budget, and resource identity (.orkestrel/agent/instruments/harness/bench5/matrix/helpers.ts:320). The comparison reader also requires each plan entry's --manifest value to decode to the actual run execution (.orkestrel/agent/instruments/harness/bench5/matrix/Comparison.ts:86).

The existing plan command does not accept a full-manifest path. It derives each base from --root and the key/thinking suffix, then hard-codes <base>/full/manifest.json. It refuses a missing or unaccepted full manifest and writes the resulting full reference into execution.full (.orkestrel/agent/instruments/harness/bench5/matrix/Matrix.ts:423, .orkestrel/agent/instruments/harness/bench5/matrix/Matrix.ts:431, .orkestrel/agent/instruments/harness/bench5/matrix/Matrix.ts:486, .orkestrel/agent/instruments/harness/bench5/matrix/Matrix.ts:503). Therefore the current plan command will ignore full-retry-1 and continue to see the preserved failed full manifest.

A fresh base with byte-for-byte copies of the frozen and resource manifests does not avoid that guard. Matrix.#plan hashes the copied freeze at its new path; readResource compares that path-bearing reference against resource.frozen by deep equality. The copied resource manifest still names the original freeze path. Repointing only resource.frozen would leave every retained resource attempt's execution and run bound to the original freeze path, which readResource and readAttempt validate. hashFile records the supplied path together with its hash (.orkestrel/agent/instruments/harness/bench5/refit/helpers.ts:58; .orkestrel/agent/instruments/harness/bench5/matrix/helpers.ts:178; .orkestrel/agent/instruments/harness/bench5/matrix/helpers.ts:188; .orkestrel/agent/instruments/harness/bench5/matrix/helpers.ts:212). I made no copied base or rewritten reference.

Thus the retry is prepared as an isolated full preflight but downstream planning is not ready to consume its output. The narrow contract gap is that Matrix.#plan lacks an explicit full-manifest input path (or equivalent resolved retry selection). A separately prepared execution manifest could carry execution.full to the accepted retry path and pass readExecution, but no existing plan command produces that binding. This report proposes no source change or alternate manifest writer.

## Daemon diagnostics and process metadata

The named daemon launcher PID file tmp/units/aggregate-ollama-daemon-resume.log.pid contains PID 60740. At the metadata check, PID 60740 was ollama.exe with parent 47380, and its child PID 47420 owned the 127.0.0.1:11434 listener. I made no daemon request and did not start, stop, or signal it.

Named diagnostics exist at tmp/units/aggregate-ollama-daemon-resume.log (105,775 bytes) and tmp/units/aggregate-ollama-daemon-resume.err (18,723,968 bytes); the latter was actively updated at 2026-10-11T08:34:08Z and is not hash-pinned because it changes while the daemon runs. The associated PID file is 6 bytes. These are availability observations, not a read of daemon diagnostics for the original failure.

## Verification record

- Source/build hashes: build manifest 09c7d936ffaec46ed9deb5bdd300deb0f9643ad639519762d8d84e38ef513ecf; matrix entry 6bc562837484dc2bc90fb9677fd4d40a977a2efce3abe8bd70475431a39547cb; Matrix.ts 342c823e94263c7e7dadbb28e89c4b5f3599362bb00b60e75f2111520eb9408f; helpers.ts cee36a0af7bf8030b39423cdb1d109a3ec21e28185607b4db4d5af44c511b940; Comparison.ts 833f75607e8b42736e18600109f68d9e1dcff570a75adfcdb6418a32e355a7e7; validators.ts 6b54c4e0e7d450aafdb1e475e9648b05645ef5e7545fe31056d3de95be3ef23b; Driver.ts c3123195164e7a83acc945d9fe1af1a8bcefbaa6ccd61bb08c4b6597a4b734aa; refit/helpers.ts d5b3fc08991d29c859b25e1a222c5b97e9198df7dac447cc4375e52cc6c73009.
- Failure report: SHA-256 612605be511d6824d084a0c6e210b42cabb6820b9b34bf2e207fbda137086022. Citation errata: 88824c0029c503b1363c843ce77b6bbc968a341a2e48fbef63a2b3c31c728dbc.
- git status showed the unrelated bench4/Driver.mjs modification, q4-think0/resource output, and q2-full-failure diagnostic output; this unit changed none of them.

No inference, retry, daemon mutation, source change, build, test, gate, or cleanup was performed.