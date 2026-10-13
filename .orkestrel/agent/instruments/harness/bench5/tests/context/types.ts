import type {
	Message,
	ProviderRequest,
	Selection,
} from '../../../vendor/agent-0.0.30-trimmed/index.js'

export interface TurnReading {
	readonly scope: string | undefined
	readonly messages: readonly Message[]
	readonly estimate: number
}

export interface ProbeReading {
	readonly reserve: number
	readonly capacity: number
	readonly predict: number
	readonly selection: Selection
	readonly wire: ProviderRequest
}
