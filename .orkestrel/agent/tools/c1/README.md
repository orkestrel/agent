Run the parent-owned Codex bench probe before executing any labeling invocation. Run planning without a probe; planning writes nothing and launches only the local checker for existing labels.

Use the bounded invocation from the repository root, replacing `PACKET_PATH`, `PACKET_HASH`, `KEYS_HASH`, and `UNIT_NAME` with the public packet path, its SHA-256 digest, the separately supplied opaque keys digest, and a lowercase unit name.

```text
node .orkestrel/agent/tools/c1/main.ts --packet PACKET_PATH --packet-hash PACKET_HASH --keys-hash KEYS_HASH --unit UNIT_NAME --cap 900 --limit 1 --plan
node .orkestrel/agent/tools/c1/main.ts --packet PACKET_PATH --packet-hash PACKET_HASH --keys-hash KEYS_HASH --unit UNIT_NAME --cap 900 --limit 1
```

The driver defaults to serial execution. `--concurrency N` controls simultaneous dispatches; `--limit N` bounds launched batches per invocation. Each stable batch holds sorted opaque item IDs, with a maximum batch size of 2. Existing output must match the envelope, exact assigned IDs, and canonical checker before the driver skips it. A failed child or invalid output stops scheduling; running dispatches finish under their caps.

Each dispatch gets a unique directory under `tmp/codex/`, containing its brief, streamed journal, errors, and last message. The driver prints the canonical result reader's session metadata. It pins GPT-6.1 Sol high and performs no retries or model substitutions.

Labeling subprocesses disable the unused `tactica-probe` MCP server for that invocation with `-c mcp_servers.tactica-probe.enabled=false`; global configuration is unchanged. The parallel pilot measured startup handshake failures without this override. The setting is documented in the [OpenAI configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference).

The audit directory's `c1-label.lock` excludes concurrent invocations. After abnormal termination, confirm the recorded driver and every dispatch process are dead before explicitly removing the stale lock. Inspect any incomplete batch output and preserve the attempt artifacts before resuming. No lock recovery is automatic.

Run the standalone checks with these commands.

```text
node node_modules/typescript/bin/tsc --ignoreConfig --noEmit --target esnext --module nodenext --strict --allowImportingTsExtensions --types node .orkestrel/agent/tools/c1/main.ts .orkestrel/agent/tools/c1/Driver.test.ts
node --test .orkestrel/agent/tools/c1/Driver.test.ts
```
