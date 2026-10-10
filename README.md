# @orkestrel/agent

> The conversation runtime for the `@orkestrel` line: the `ProviderInterface` inference
> boundary with the host-independent HTTP engine and browser relay that implement it, the
> conversation layer that feeds it — messages, compaction, instructions, scopes, and prompt
> assembly — and the bounded context → provider → tools → repeat loop that carries a turn to
> its end.

Build an agent with the `createAgent` function over a `ProviderInterface` implementation,
seed the conversation through `agent.context.messages`, then run the turn as a one-shot
`generate` or a live `stream`. Extend the `AgentProvider` class to reach a new wire, or
compose the `createRelayProvider` and `createRelay` functions to reach a model through your
own server. Callable tools come from `@orkestrel/tool` and documents from
`@orkestrel/workspace`. Part of the `@orkestrel` line.

## Install

Install the package from npm:

```sh
npm install @orkestrel/agent
```

## Requirements

The package targets the following runtime and module formats:

- Node.js >= 22.12.0
- Dual ESM + CommonJS builds (`import` and `require` both supported)

## Usage

The following example builds an agent with one tool and streams a turn:

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

See [Agent](guides/agent.md) for the agent-owned surface:
the provider boundary, the `AgentProvider` HTTP engine, the relay, conversations,
instructions, scopes, authority, durable jobs, the loop, `AgentContext`, and the
ledger. The packages it consumes are mirrored alongside it; see
[Tool](guides/tool.md) for callable tools and [Workspace](guides/workspace.md) for files.

## Package

Published as a single typed entry point per the `exports` field in
`package.json`.

## License

MIT © [Orkestrel](https://github.com/orkestrel) — see [LICENSE](./LICENSE).
