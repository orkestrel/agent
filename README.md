# @orkestrel/agent

A typed **agent runtime** for the `@orkestrel` line — providers,
conversations, authority, durable jobs, and a composable agent context.
`createAgent` consumes tool and workspace registries from their originating
packages, composing a bounded context → provider → tools → repeat turn as a
one-shot `generate` or live `stream`. Part of the `@orkestrel` line.

## Install

```sh
npm install @orkestrel/agent
```

## Requirements

- Node.js >= 22
- Dual ESM + CommonJS builds (`import` and `require` both supported)

## Usage

```ts
import { createAgent } from '@orkestrel/agent'
import { createTool, createToolManager } from '@orkestrel/tool'

const tools = createToolManager()
tools.add(
	createTool({
		name: 'add',
		description: 'Add two numbers',
		execute: (args) => Number(args.a) + Number(args.b),
	}),
)

// `provider` is your ProviderInterface implementation (see the guide)
const agent = createAgent(provider, { system: 'You are concise.', tools })
agent.context.messages.add({ role: 'user', content: 'Say hi.' })

const stream = agent.stream()
for await (const chunk of stream.events) {
	if (chunk.type === 'token') process.stdout.write(chunk.content)
}
const result = await stream.result // { content, usage?, partial }
```

## Guide

For the agent-owned surface — providers, conversations, authority, durable
jobs, the loop, and `AgentContext` — see
[`guides/src/agent.md`](guides/src/agent.md). Its consumed dependency
surfaces are mirrored in [`guides/src/tool.md`](guides/src/tool.md) and
[`guides/src/workspace.md`](guides/src/workspace.md).

## Package

Published as a single typed entry point per the `exports` field in
`package.json`.

## License

MIT © [Orkestrel](https://github.com/orkestrel) — see [LICENSE](./LICENSE).
