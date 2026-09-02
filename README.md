# @orkestrel/agent

A typed **conversation runtime** for the `@orkestrel` line. An agent is a
conversation with a model and the loop that carries it forward: messages,
conversations and their compaction, instructions, scopes, prompt assembly, the
authority gate, durable jobs, and a bounded context → provider → tools → repeat
turn you can run as a one-shot `generate` or a live `stream`. The model itself
is the one piece this package does not supply — any backend implementing
`ProviderInterface` drops in. Callable tools come from `@orkestrel/tool` and
documents from `@orkestrel/workspace`; the agent advertises the first to the
model and renders the second into the prompt. Part of the `@orkestrel` line.

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
	if (chunk.category === 'token') process.stdout.write(chunk.content)
}
const result = await stream.result // { content, usage?, partial }
```

## Guide

[`guides/agent.md`](guides/agent.md) documents the agent-owned surface:
the provider boundary, conversations, instructions, scopes, authority, durable
jobs, the loop, and `AgentContext`. The two packages it consumes are mirrored
alongside it — [`guides/tool.md`](guides/tool.md) for callable tools and
[`guides/workspace.md`](guides/workspace.md) for files.

## Package

Published as a single typed entry point per the `exports` field in
`package.json`.

## License

MIT © [Orkestrel](https://github.com/orkestrel) — see [LICENSE](./LICENSE).
