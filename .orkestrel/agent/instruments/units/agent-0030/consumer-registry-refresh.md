# Agent 0.0.30 consumer registry refresh

Read-only registry and desk-lock check for the recorded Ollama prerequisite. No package, source, build, Git, daemon, model, or credential operations were performed.

The current desk manifest still requests `@orkestrel/agent: ^0.0.29` and `@orkestrel/ollama: ^0.0.22`. Its lockfile resolves agent 0.0.29 from `https://registry.npmjs.org/@orkestrel/agent/-/agent-0.0.29.tgz` with integrity `sha512-7SVrSo8bttBn2snQQyEK4pG0PzhFBVapq9HxPjc+13ralyxrg7WJHTd4Pk2S+dg8tb2G7Ohnov7qrrvl3lhkWw==`. It resolves Ollama 0.0.22 from `https://registry.npmjs.org/@orkestrel/ollama/-/ollama-0.0.22.tgz` with integrity `sha512-BMzKqSF60g2jgF7N24Qy2mGNYwV+1Zegu+YcyZ3gJtDorO71RI3/JekdAtLXxyCwnaZIg62v3ZNM6JrjbqNIQQ==`; the locked Ollama dependency is `@orkestrel/agent: ^0.0.29` (also tool `^0.0.19`, budget `^0.0.13`, ndjson `^0.0.12`, contract `^0.0.19`).

Registry reads (against the public npm registry, with online preference and no retries):

1. Command: `npm view @orkestrel/ollama version dependencies dist.integrity --json --registry=https://registry.npmjs.org/ --prefer-online --fetch-timeout=15000 --fetch-retries=0`
   Exit: `0`.
   Output:
   ```json
   [
     {
       "version": "0.0.22",
       "dependencies": {
         "@orkestrel/tool": "^0.0.19",
         "@orkestrel/agent": "^0.0.29",
         "@orkestrel/budget": "^0.0.13",
         "@orkestrel/ndjson": "^0.0.12",
         "@orkestrel/contract": "^0.0.19"
       },
       "dist.integrity": "sha512-BMzKqSF60g2jgF7N24Qy2mGNYwV+1Zegu+YcyZ3gJtDorO71RI3/JekdAtLXxyCwnaZIg62v3ZNM6JrjbqNIQQ=="
     }
   ]
   ```
2. Command: `npm view @orkestrel/ollama@0.0.23 version dependencies dist.integrity --json --registry=https://registry.npmjs.org/ --prefer-online --fetch-timeout=15000 --fetch-retries=0`
   npm exit: `1`. The registry response was `E404`, summary `No match found for version 0.0.23`; no metadata was returned.

The outstanding prerequisite is unchanged: no later Ollama version appeared in the registry, and the available 0.0.22 manifest still depends on agent `^0.0.29`. The release consumer metadata records that desk needs a next Ollama release whose dependency advances to `^0.0.30`, followed by verification of the published tarball’s actual X2 artifact and manifest before desk can repin. These registry/manifest facts do not establish runtime compatibility or prove X2 behavior in any published artifact.
