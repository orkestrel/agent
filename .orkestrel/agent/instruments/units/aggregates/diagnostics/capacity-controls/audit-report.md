# Capacity diagnostic audit

The offline admission and frozen-data checks held. Raw capture and start-receipt writes discard the filesystem's returned byte count. That leaves custody claims false under a short write. This is a static finding against the installed Node contract, not an executed short-write reproduction on this Windows host. Root owns reproduction, ruling, and authorization.

The analyst ran natively on GPT-6 Astra in a clean context, read the supplied claims and exact additions, and spawned no agent. The stakes are admission to a bounded diagnostic, not capacity, quality, or adoption.

## Claim verdicts

1. **CONFIRMED.** Wrong packet and operator digests, absent host condition, missing receipt, occupied output, escaped output, reserved output, repeated arguments, and incomplete execution arguments were attacked through the real functions or entry processes. Each refused. Valid output and argument controls succeeded. Direct `Driver.execute` with the missing receipt rejected before output creation. The default main, prepare, execute, and start entries returned `offline:true`. Source places admission before directory creation and HTTP: `tmp/units/aggregate-capacity-probe/Driver.ts:64`, `tmp/units/aggregate-capacity-probe/Driver.ts:123`. Rebuilt packet equality binds the source and inputs before receipt admission: `tmp/units/aggregate-capacity-probe/helpers.ts:140`, `tmp/units/aggregate-capacity-probe/helpers.ts:147`. This confirms the declared external host condition, not process liveness or exclusive service use.

2. **CONFIRMED.** The independent probe compared the retained request files with rebuilt bodies, checked model sequence, chronological history roles, identical positive/cache/restored bodies, and whole-body equality after changing only overflow context, including Mica. Literal `truncate:false` and `shift:false` held. The instrument has no inference call in preparation. Source analysis attacked the failed-transport ordering: each inference is awaited, its ps capture is awaited immediately afterward, and only then does execution inspect the transport flags or advance: `tmp/units/aggregate-capacity-probe/Driver.ts:78`, `tmp/units/aggregate-capacity-probe/Driver.ts:80`, `tmp/units/aggregate-capacity-probe/Driver.ts:81`. There is no request retry. This ordering finding is static; neither inference nor snapshot transport ran.

3. **BROKEN.** A short filesystem write can produce a falsely complete raw capture. `tmp/units/aggregate-capacity-probe/Driver.ts:134` ignores the return from `writeSync`, and `tmp/units/aggregate-capacity-probe/Driver.ts:135` counts the entire offered buffer. On the concrete adverse state where a 4-byte chunk writes 2 bytes without throwing and the reader next returns EOF, `tmp/units/aggregate-capacity-probe/Driver.ts:131` sets `complete:true`; `tmp/units/aggregate-capacity-probe/Driver.ts:151` then records `bytes:4` while hashing a 2-byte file. A successful ps response lets execution continue, and eventual completion returns success. The installed contract defines the return as the number of bytes written, not an all-bytes guarantee: `node_modules/@types/node/fs.d.ts:2888`, `node_modules/@types/node/fs.d.ts:2890`. This trace is static; no short write was induced, no fetch was replaced, and no Windows disk fault was created. Smallest fix: retain every offered byte with a full-write primitive or an actual-count loop, refuse a zero-progress write, and derive the final persisted byte count from the file after success or failure. Preserve incomplete custody and its prefix when persistence fails. A proof must distinguish EOF following a short write from complete retained custody; the offline suite does not execute this path.

4. **BROKEN.** The same unchecked-write seam reaches the immutable start receipt: `tmp/units/aggregate-capacity-probe/Daemon.ts:38`. A short write can leave truncated JSON while the child is running; the later binding operation only hashes that truncated file and reports a receipt identity. The receipt therefore need not contain the promised child PID and executable identity. This is static under the same native write contract, not an observed daemon launch. Smallest fix: fully write the receipt, handle persistence failure while retaining ownership of the spawned child, and install lifecycle handling before a post-spawn operation can throw. Preserve create-only receipt and terminal files. The adjacent safeguards held under source attack: the explicit flag and Windows gate precede spawning; the executable is fixed; spawn is attached and shell-free; environment keys are filtered case-insensitively and only declared values are serialized; termination targets the recorded child PID and tree: `tmp/units/aggregate-capacity-probe/Daemon.ts:20`, `tmp/units/aggregate-capacity-probe/Daemon.ts:24`, `tmp/units/aggregate-capacity-probe/Daemon.ts:32`, `tmp/units/aggregate-capacity-probe/Daemon.ts:37`, `tmp/units/aggregate-capacity-probe/Daemon.ts:61`. Error and close events have separate terminal-artifact handlers at `tmp/units/aggregate-capacity-probe/Daemon.ts:49` and `tmp/units/aggregate-capacity-probe/Daemon.ts:53`. Forced termination may prevent those handlers; no completion inference follows from their absence.

5. **CONFIRMED.** Independent execution distinguished a valid bounded plan from changed body/hash, empty and excessive plans, missing admission, and default entry behavior. Frozen source inventory hashes, prepared packet/inventory hashes, and check-artifact hashes matched their actual files. The source rebuild matched the frozen packet byte for byte. The writer's offline checks expose explicit expected failures rather than a success-only self-comparison: `tmp/units/aggregate-capacity-probe/Validation.ts:67`, `tmp/units/aggregate-capacity-probe/Validation.ts:75`, `tmp/units/aggregate-capacity-probe/Validation.ts:79`. Proof mutations: removing body/hash refusal would make the changed-body/hash assertions fail; removing plan-length refusal would make empty/excessive-plan assertions fail; allowing missing receipt through would fail the expected ENOENT assertion or no-output assertion; changing default output away from `offline:true` would fail the entry assertions. These mutations were named and assessed, not applied to frozen source. The checks do not establish streaming, daemon lifecycle, runtime identity, or service exclusivity.

## Findings outside the claims

None. No performance advisory is carried.

## Attacked and held

The response limit retains only the prefix fitting the ceiling before aborting, and execution checks both `complete` and `breached`: `tmp/units/aggregate-capacity-probe/Driver.ts:132`, `tmp/units/aggregate-capacity-probe/Driver.ts:136`, `tmp/units/aggregate-capacity-probe/Driver.ts:81`. Request, snapshot, and outer deadlines are combined in the capture signal at `tmp/units/aggregate-capacity-probe/Driver.ts:111`. HTTP failure status does not become a model-quality verdict; the capture deliberately records transport custody without decoding inference content. An exactly-at-limit complete response is valid. An over-limit response is incomplete even if its prefix is valid JSON. These are static observations, subject to the persistence defect in claim 3.

The short-write finding does not establish that ordinary writes on this Windows volume are short, that the prepared bytes are corrupt, or that any live observation occurred. Normal complete writes are unaffected. A repair must not convert a short retained prefix into an inference-capacity conclusion or retry the inference to hide failed custody.

## Commands and bare results

The independent probe ran through the repository probe project with the cache disabled. It created no fixture, network peer, service operation, or capture output. Its named test file was deleted before return.

```text
node node_modules/vitest/vitest.mjs run --config vite.config.ts --project probe tmp/probes/aggregate-capacity-probe-audit.test.ts --no-cache
exit 0
RUN v4.1.11 C:/Users/mikes/WebstormProjects/scaffold
Test Files 1 passed (1)
Tests 3 passed (3)
Start at 06:45:54
Duration 982ms (transform 164ms, setup 183ms, import 40ms, tests 635ms, environment 0ms)
```

The passing tests covered inventory/source binding and request data; real admission refusal with valid boundary controls; and default child-process entries plus incomplete execute arguments. The test did not invoke the writer's `verify.ts`, because that entry creates an already-owned checks directory. It did not run prepare, inventory, affirmative start, or admitted execution. No source mutation, network, inference, install, process termination, or tree-wide gate ran.

The status readings were:

```text
git status --porcelain
initial:
 M .orkestrel/agent/instruments/bench4/Driver.mjs

later:
 M .orkestrel/agent/instruments/bench4/Driver.mjs
?? .orkestrel/agent/instruments/units/aggregates/diagnostics/focused-boundaries/
```

## Deviation

Expected status contained only the preexisting bench4 change. The later status included the diagnostics directory. The analyst stopped adjudication, reported the discrepancy, and deleted only the owned temporary probe. The initial hypothesis was concurrent root archive work. Root confirmed that the archive and subsequent RESULTS/plan/progress/ledger staging were its disjoint campaign-record work and explicitly instructed this audit to finish its existing scope. Root confirmed that no capacity source or binding changed. The audit resumed without another pass or an added claim. The owned report is the only retained audit output.

VERDICT: FAIL 3, 4; outside the claims: none
