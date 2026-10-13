/** Holds an external source message and its scheduled arrival. */
export interface EnduranceMessage {
	readonly id: string
	readonly shift: number
	readonly date: string
	readonly role: 'user'
	readonly content: string
}

/** Holds an external work request without private evaluation fields. */
export interface EnduranceRequest {
	readonly id: string
	readonly shift: number
	readonly after: number
	readonly request: string
}

/** Holds a lookup version released at one external arrival boundary. */
export interface EnduranceLookup {
	readonly id: string
	readonly tool: 'lookup_order' | 'lookup_customer'
	readonly from: number
	readonly text: string
}

/** Holds external conversation input separately from the offline oracle. */
export interface EnduranceRuntime {
	readonly id: string
	readonly system: string
	readonly topics: ReadonlyArray<{
		readonly name: string
		readonly criterion: string
	}>
	readonly days: ReadonlyArray<{
		readonly date: string
		readonly from: number
	}>
	readonly seed: readonly EnduranceMessage[]
	readonly tools: Readonly<Record<string, Readonly<Record<string, string>>>>
	readonly lookups: readonly EnduranceLookup[]
	readonly goals: readonly EnduranceRequest[]
}

/** Names the substantive work product requested at a shift boundary. */
export type EnduranceProduct = 'queue' | 'packet' | 'reconciliation' | 'handoff'

/** Names the externally supported change of an enduring fact. */
export type EnduranceTransition =
	| 'arrival'
	| 'repetition'
	| 'correction'
	| 'withdrawal'
	| 'supersession'
	| 'tool'

/** Holds the external lifespan and provenance of one fact version. */
export interface EnduranceFact {
	readonly id: string
	readonly version: number
	readonly value: string
	readonly from: number
	readonly until?: number
	readonly sources: readonly string[]
	readonly transition: EnduranceTransition
	readonly case: string
}

/** Holds an externally governed obligation and its evidence prerequisites. */
export interface EnduranceObligation {
	readonly id: string
	readonly version: number
	readonly case: string
	readonly from: number
	readonly due: number
	readonly closed?: number
	readonly withdrawn?: number
	readonly prerequisites: readonly string[]
	readonly sources: readonly string[]
	readonly description: string
	readonly evidence: readonly string[]
}

/** Holds one atomic offline requirement and acceptable alternatives. */
export interface EnduranceAtom {
	readonly id: string
	readonly dimension: 'facts' | 'work' | 'obligations' | 'revision' | 'evidence'
	readonly requirement: string
	readonly alternatives: readonly string[]
	readonly sources: readonly string[]
	readonly mandatory: boolean
}

/** Holds a goal's private truth and references to actual earlier arm products. */
export interface EnduranceRubric {
	readonly goal: string
	readonly product: EnduranceProduct
	readonly case: string
	readonly earlier: readonly string[]
	readonly atoms: readonly EnduranceAtom[]
	readonly critical: readonly string[]
	readonly distant: ReadonlyArray<{
		readonly source: string
		readonly requirement: string
	}>
	readonly lookups: ReadonlyArray<{
		readonly tool: string
		readonly id: string
		readonly from: number
	}>
	readonly obligations: readonly string[]
}

/** Holds a prefrozen offline artifact used to verify blind audit sensitivity. */
export interface EnduranceControl {
	readonly id: string
	readonly goal: string
	readonly artifact: string
	readonly verdict: 'stale' | 'fabricated' | 'ambiguous'
	readonly reason: string
}

/** Holds private evaluation truth that a runtime reader must never load. */
export interface EnduranceOracle {
	readonly runtime: string
	readonly facts: readonly EnduranceFact[]
	readonly obligations: readonly EnduranceObligation[]
	readonly goals: readonly EnduranceRubric[]
	readonly controls: readonly EnduranceControl[]
	readonly calculations: readonly EnduranceCalculation[]
}

/** Holds an independently recorded arithmetic assertion using integer minor units. */
export interface EnduranceCalculation {
	readonly id: string
	readonly goal: string
	readonly sources: readonly string[]
	readonly terms: readonly number[]
	readonly divisor: number
	readonly result: number
	readonly explanation: string
}

/** Holds a runtime projection structurally assignable to the existing bench5 Copy seam. */
export interface EnduranceCopy {
	readonly system: string
	readonly topics: ReadonlyArray<{
		readonly name: string
		readonly criterion: string
		readonly requested: boolean
	}>
	readonly days: EnduranceRuntime['days']
	readonly seed: ReadonlyArray<{ readonly role: 'user'; readonly content: string }>
	readonly tables: {
		readonly tools: EnduranceRuntime['tools']
		readonly lookups: EnduranceRuntime['lookups']
	}
	readonly goals: ReadonlyArray<{
		readonly id: string
		readonly request: string
		readonly after: number
		readonly facts: readonly never[]
		readonly stale: readonly never[]
		readonly expected: readonly never[]
		readonly expectedAny: readonly never[]
		readonly forbidden: readonly never[]
		readonly forbiddenPatterns: readonly never[]
	}>
}

/** Holds a hash and raw-text price, separately from provider usage. */
export interface EnduranceReading {
	readonly bytes: number
	readonly characters: number
	readonly tokens: number
	readonly hash: string
}

/** Holds the finite horizon and measured text populations of a frozen workload. */
export interface EnduranceCensus {
	readonly shifts: number
	readonly goals: number
	readonly threads: number
	readonly system: EnduranceReading
	readonly arrivals: EnduranceReading
	readonly requests: EnduranceReading
	readonly lookups: EnduranceReading
	readonly bounds: {
		readonly initial: number
		readonly shift: number
		readonly request: number
		readonly sources: number
		readonly current: number
	}
	readonly checkpoints: ReadonlyArray<{
		readonly shift: number
		readonly goal: string
		readonly arrivals: EnduranceReading
		readonly requests: EnduranceReading
	}>
}
