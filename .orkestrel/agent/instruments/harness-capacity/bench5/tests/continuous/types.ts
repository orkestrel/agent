/** Describes a deliberate protocol fault at an actual HTTP boundary. */
export interface CapacityFault {
	readonly role: 'agent' | 'summarizer' | 'flush' | 'judge' | 'metadata' | 'calibration'
	readonly response: 'length' | 'usage' | 'http' | 'oom' | 'body' | 'request' | 'headroom' | 'boundary' | 'truncated' | 'truncation' | 'protocol' | 'combined'
	readonly path?: string
}

/** Records a fixture request deliberately held open at the real network boundary. */
export interface CapacityStall {
	readonly role: CapacityFault['role']
	readonly started: number
}
