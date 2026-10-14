# Deadline attribution exposure

The recorder timer and native provider timer are redundant for the effective agent/summarizer HTTP deadline in the current composition. A proof need not make removal of each redundant timer individually fail. The earlier verdict's request for independent removal must be scoped to an independently load-bearing deadline source, rather than every timer implementing the same bound.

This is a read-only attribution finding for fix planning. It does not amend the returned verdict, accept the fix, or claim an executed mutation result. No tests, builds, or live calls ran for this exposure.

## Why the timers overlap

`Trial.#createProvider` passes `manifest.timeout` to the Ollama provider. The Ollama provider passes that value to the installed `AgentProvider`. Its `stream` starts its timeout before invoking the custom transport and passes the combined native/caller signal into that transport. It keeps the timeout live until the stream settles. See `.orkestrel/agent/instruments/harness-capacity/vendor/ollama/index.js:403` and `.orkestrel/agent/instruments/harness-capacity/node_modules/@orkestrel/agent/dist/src/core/index.js:3285`.

`Trial.#fetch` receives that signal as `request.signal`, combines it with its own timer and trajectory/goal/series signals, and awaits both `globalThis.fetch` and `response.arrayBuffer` before returning. Therefore the native timeout remains active during stalled headers and during the recorder's complete body read. Removing only the recorder's agent/summarizer timer leaves a native timer with the same duration that started earlier. The agent also has an encompassing run timeout set to `manifest.timeout`; this can expire before a later decision call reaches its per-call bound. The summarizer has its native provider timer even though its own caller controller is separate.

This redundancy depends on preserving `request.signal` in the actual network signal and on keeping the native timeout active while the custom transport is awaited. Both hold in the inspected source. It is not a guarantee that the two timers fire at the same instant or retain the same textual reason.

## Decisive proof without changing native production timers

Yes: exercise the shorter recorder deadline through a flush or judge request with `limits.metadata` shorter than `manifest.timeout`, and separately exercise effective agent/summarizer cancellation with all unrelated lifetimes longer. Calibration is another short-metadata consumer, but its goal-less role must be identified distinctly. Direct inventory metadata has its own method/timer and is not a substitute for exercising the model-request recorder's metadata branch.

- For recorder attribution, make the selected flush/judge endpoint actually receive the request and then stall before headers or after partial body. Keep native, goal, trajectory, and series bounds well beyond the assertion deadline. Assert the selected role and stall were reached, bounded elapsed return measured from that request, a limit outcome consistent with the recorder deadline, server-observed closure, and no later send. Removing the recorder deadline signal or disabling its timer then crosses the test's elapsed bound before any native backup can satisfy it. Ordinary one-token success remains the adjacent control.
- For agent/summarizer behavior, stall their actual request/body and assert the same observable deadline/closure/no-later-send contract under the unmodified composition. Accept native-provider or encompassing agent timeout attribution when it enforces the requested bound. Do not require the recorder's own reason to win a race against the earlier equal-duration native timer.
- For a mutation control of that composed agent/summarizer bound, disable the whole relevant timeout path in a mutation-only copy, or sever the independently load-bearing composed cancellation edge while keeping unrelated lifetimes beyond the assertion deadline. A mutation that deletes only one redundant timer is not a valid negative control for the effective bound. This does not require widening any native production timeout or adding an injection API.

The proof set can therefore establish the public effective deadline plus the recorder's independently load-bearing shorter metadata deadline. It cannot establish that the recorder's agent/summarizer timer independently rescues execution after the native timeout is absent or broken without a mutation that disables that native protection. That isolated fallback property is the remaining unproved seam if root retains it as a claim; it is stronger than the current public requirement that requests stop within their configured bound.

Goal/trajectory/series attribution still needs the selected deadline to be strictly earlier than other active deadlines, evidence that the intended work was in flight, and an elapsed bound that excludes backup success. The corrected child-failure control remains separate from this timer question.
