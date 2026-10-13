# Deployment input custody

These files preserve the temporary data directly bound by the l9 deployment declaration. The stable-input mapping and response mapping name each original path, archived path, SHA-256, and byte size. Every copied file matched its declared hash and original bytes. The response files carry JSON model output or model metadata despite their `.bin` suffix.

Restore the archive bytes to each mapping's original path before reusing a frozen deployment on a fresh checkout. Verify the hash before restoration. Existing frozen manifests retain their original path strings; this archive does not rewrite their identity.

The deployment also binds tracked reports and the installed Ollama executable and runner. Those files were verified in place; installed programs remain host prerequisites. The original temporary inputs remain present while live runs use them.
