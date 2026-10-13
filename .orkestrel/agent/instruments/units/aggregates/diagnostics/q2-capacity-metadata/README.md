# Observe deployed capacity metadata

Root accepts this bounded metadata observation. The captured endpoints returned HTTP 200 without redirects. The service reports version 0.40.2; the selected Qwen 2B model reports context metadata 262144 and the frozen digest. The running-model response is empty, so this run establishes no active allocation or per-request truncation fact. See [the immutable verifier report](report.md) and [the raw request/response manifest](manifest.json).

The HTTP requests ran at 2026-10-11T09:29:11Z; the report also records a process observation at 2026-10-11T09:30:10Z. PID 60740 parented PID 47420, the listener owner. No generation request ran. The script, manifest, and raw bodies are byte copies from the report's historical tmp paths; those basenames resolve in this directory. The script is an observation recipe, not a general certified capacity parser.

This evidence does not qualify the earlier full-view run or prove that its failed request fit. Before implementing the capacity proposal, map the deployed service's observable allocation and truncation behavior. Do not substitute training metadata for a measured serving allocation.
