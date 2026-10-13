# Trimmed vendor acceptance

Bench5 consumes the verified agent commit ee734c30151c7d431e480aff7a0d54306d387f13 in the added vendor directory agent-0.0.30-trimmed. The original agent and ollama vendor bytes remain unchanged.

Independent verification on 2026-10-10 passed TypeScript, the runtime seam probe with no fetches, and the complete offline test population: 338/338 tests in 23,470 ms, with no skips. The source JavaScript SHA-256 is 8f040acf72b6426246b79e5c2f31d3644291e4c08f49434ad1224e16f176311d; declarations hash to f6f28cab8a2d417510e68f308563f1f53eb86b600e0a57208799adc8d783d171. The declared bare dependencies match the harness installation. Hashes remained unchanged for 2,691 preserved files and 34 changed or added source/artifact files during verification.

The mechanical migration updates every bench5 and refit import and the final gauge, note, projection, and lookup names. Threshold keys remain unchanged. The refit inventory binds the additional vendor entry. Calibration manifests must be regenerated after the lifecycle work.

Conformance debt remains. Scoped lint has the same 13 diagnostics as the checkpoint, including the arbitrary-build probe's dynamic import and preexisting calibration/test findings. Scoped formatting flags the same 13 files as the checkpoint. The diagnostic lists were compared directly with immutable baseline copies; no additional diagnostic or failing-format file appeared. This acceptance establishes the mechanical migration and records those nonzero gates. It does not claim repository-wide conformance. The lifecycle and matrix units must make their added and edited mechanisms conform without suppressing a gate.
