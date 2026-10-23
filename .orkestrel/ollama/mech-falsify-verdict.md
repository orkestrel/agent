# Mechanisms campaign — falsify verdict, Ollama

The integrated audit of 2026-10-23 (`mech-falsify`), Ollama's share. Lanes: GPT-6 Astra (objective) and Claude Opus 5.5 (subjective), blind, one claims file; the subject was Ollama `3582325..d7f91dc`.

| Claim | Ruling | Carried into |
| --- | --- | --- |
| 1 (proof strength) | held, but no committed test fails if `OllamaDaemon` stops calling the inventory digest comparison; the pure helper tests alone cover it (Opus) | `mech-fix-ollama` ruling 1 |
| 6 | overstated claim, no code defect: a rejection during `unload()` rejects that call and leaves the daemon running until `stop()`; a rejection during `start()` stops and joins the child; the guide and TSDoc state it | `mech-fix-ollama` ruling 2 |
| 21 | the U22 limits in the guide match the code, but the guide omits that on a host where the session's child is detached an abrupt host death can leave the daemon root itself running, not only its runners (Opus) | `mech-fix-ollama` ruling 3 |
| 20 | UNRESOLVED (Astra): fresh ES and CJS builds and the full Node matrix | `mech-verify` |
| 2 to 5, 7 | CONFIRMED by both lanes; the fake-daemon proofs ran on Node 22.18.0 and 24 | — |
