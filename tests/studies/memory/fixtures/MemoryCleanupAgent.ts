import type { AgentInterface, AgentOptions, ProviderInterface } from '@orkestrel/agent'
import { createRecorder } from '@orkestrel/test'
import { Agent } from '../../../../dist/src/core/index.js'

/** Records only actual constructor results; all runtime behavior is inherited unchanged. */
export class MemoryCleanupAgent extends Agent {
	static readonly constructed = createRecorder<readonly [AgentInterface]>()
	/** Retains public resources for cleanup assertions. @param provider - Real provider. @param options - Actual session managers. */
	constructor(provider: ProviderInterface, options?: AgentOptions) {
		super(provider, options)
		MemoryCleanupAgent.constructed.handler(this)
	}
}
