import type { TokenUsage } from '@orkestrel/budget'
import type { MatrixFreeze } from '../matrix/types.js'
import type { Message, NoulQuestion } from '../../vendor/agent-0.0.30-trimmed/index.js'
import type {
	AggregateFailure,
	AggregateBundle,
	AggregateComponent,
	AggregateSource,
	AggregateTopic,
	CacheRow,
	Settings,
	SummaryRow,
} from '../types.js'

/** Holds a file's immutable byte identity. */
export interface RefitFile {
	readonly path: string
	readonly hash: string
}

/** Holds the exact observed cache rows independently of later live cache changes. */
export interface RefitEvidence {
	readonly summary: ReadonlyArray<{ readonly path: string; readonly row: SummaryRow }>
	readonly judge: ReadonlyArray<{ readonly path: string; readonly row: CacheRow }>
}

/** Holds a projected source with its original seed and message grouping. */
export interface RefitSource extends AggregateSource {
	readonly seed: number
}

/** Holds one cold-build occurrence, without equating duplicate checker contexts. */
export interface RefitContext {
	readonly id: string
	readonly goal: string
	readonly after: number
	readonly topic: AggregateTopic
	readonly date: string
	readonly sources: readonly RefitSource[]
	readonly owners: readonly string[]
	readonly listed: readonly string[]
	readonly stale: readonly string[]
	readonly members: readonly string[]
	readonly prompt: readonly Message[]
}

/** Holds the exact serialized projection and classification inputs at a request. */
export interface RefitPoint {
	readonly goal: string
	readonly request: Message
	readonly input: unknown
	readonly projection: unknown
}

/** Holds all development occurrences and the evidence needed to reproduce them. */
export interface RefitCorpus {
	readonly sustained?: { readonly runtime: RefitFile; readonly classification: RefitFile }
	readonly mode: 'cold-build seed-only development'
	readonly files: readonly RefitFile[]
	readonly contexts: readonly RefitContext[]
	readonly points: readonly RefitPoint[]
}

/** Holds every attempted generation, including operational refusals. */
export interface RefitAttempt {
	/** Records the actual fresh request boundary; absent in historical evidence. */
	readonly sent?: boolean
	readonly id: string
	readonly context: string
	readonly ordinal: number
	readonly prompt: readonly Message[]
	readonly key: string
	readonly raw?: string
	readonly prose?: string
	readonly failures?: readonly AggregateFailure[]
	readonly usage?: TokenUsage
	readonly wall: number
	readonly duration?: number
	readonly cached?: boolean
	readonly state?: string
	readonly judge?: AggregateBundle
	readonly error?: string
}

/** Holds blinded support evidence with opaque ids and explicit message grouping. */
export interface RefitItem {
	readonly revision: string
	readonly candidate: string
	readonly components: readonly AggregateComponent[]
	readonly id: string
	readonly question: NoulQuestion
	readonly state: string
	readonly sources: readonly RefitSource[]
}

/** Holds a completed generation manifest and its exact artifact identities. */
export interface RefitGeneration {
	readonly controls: RefitFile
	readonly sustained?: { readonly runtime: RefitFile; readonly classification: RefitFile }
	readonly matrix?: MatrixFreeze
	readonly corpus: string
	readonly attempts: string
	readonly packet: string
	readonly evidence: RefitFile
	readonly files: readonly RefitFile[]
	readonly model: string
	readonly settings: Settings
	readonly complete: boolean
	readonly errors: readonly string[]
	readonly lineage: {
		readonly before: readonly RefitFile[]
		readonly after: readonly RefitFile[]
	}
}

/** Names an adjudicated support ruling; ambiguity is never positive. */
export type RefitVerdict = 'supported' | 'unsupported' | 'contradicted' | 'ambiguous'

/** Holds a proposition's support ruling and exact evidence quotations. */
export interface RefitProposition {
	readonly text: string
	readonly verdict: RefitVerdict
	readonly evidence: readonly string[]
}

/** Holds the adjudicator's proposition evidence for an immutable packet item. */
export interface RefitLabel {
	readonly id: string
	readonly item: string
	readonly verdict: RefitVerdict
	readonly propositions: readonly RefitProposition[]
}

/** Binds root's adjudication to exact corpus, attempts, packet, and generation manifest bytes. */
export interface RefitLabels {
	readonly authority: 'root-adjudicated'
	readonly corpus: string
	readonly attempts: string
	readonly packet: string
	readonly manifest: string
	readonly labels: readonly RefitLabel[]
}

/** Holds an audited draft's independent semantic and operational readings. */
export interface RefitReading {
	readonly id: string
	readonly identity: string
	readonly generated: boolean
	readonly verdict: RefitVerdict
	readonly lexical: boolean
	readonly score?: number
}

/** Binds a whole-candidate archived label to unchanged semantic inputs and successor support. */
export interface RefitControl {
	readonly id: string
	readonly candidate: string
	readonly sources: readonly RefitSource[]
	readonly verdict: RefitVerdict
	readonly lexical: boolean
	readonly original: {
		readonly item: string
		readonly mapping: string
		readonly build: string
	}
	readonly support?: AggregateBundle
}

/** Holds occurrence or distinct-identity admission readings. */
export interface RefitRecall {
	readonly supported: number
	readonly scored: number
	readonly admitted: number
	readonly conditional: number
	readonly admission: number
}

/** Holds distinct support identities and their consistency failures. */
export interface RefitPopulation {
	readonly readings: readonly RefitReading[]
	readonly errors: readonly string[]
}

/** Holds a refused or usable fit diagnosis. */
export interface RefitDiagnosis {
	readonly accepted: boolean
	readonly cutoff?: number
	readonly reasons: readonly string[]
	readonly occurrences: RefitRecall
	readonly distinct: RefitRecall
	readonly readings: readonly RefitReading[]
	readonly change: 0.56
	readonly limitation: string
}

/** Binds fitting to immutable generation, sources, and independent labels. */
export interface RefitPreparation {
	readonly manifest: RefitFile
	readonly attempts: RefitFile
	readonly packet: RefitFile
	readonly corpus: RefitFile
	readonly labels: RefitFile
}

/** Holds the reproducible fitted diagnosis and its underlying evidence. */
export interface RefitAssessment extends RefitDiagnosis {
	/** Retains preparation and cost failures independently of strict separation. */
	readonly errors: readonly string[]
	readonly preparation: RefitPreparation
	readonly custody: {
		readonly corpus: string
		readonly attempts: string
		readonly packet: string
		readonly manifest: string
		readonly labels: RefitFile
		readonly controls: Readonly<Record<string, string>>
	}
}

/** Holds sent fresh preparation expenditure independently of overlapping timers. */
export interface RefitCosts {
	readonly controls: ReadonlyArray<{
		readonly role: 'judge'
		readonly requests: number
		readonly wall: number
		readonly prompt: number
		readonly completion: number
		readonly missing: number
	}>
	readonly replay: number
	readonly wire: ReadonlyArray<{
		readonly phase: 'trajectory'
		readonly role: string
		readonly requests: number
		readonly wall: number
		readonly prompt: number
		readonly completion: number
		readonly missing: number
	}>
	readonly failures: readonly string[]
}

/** Holds the closed command configuration. */
export interface RefitOptions {
	readonly runtime?: string
	readonly classification?: string
	readonly frozen?: string
	readonly phase: 'freeze' | 'generate' | 'fit'
	readonly out: string
	readonly cache: string
	readonly corpus: string
	readonly attempts: string
	readonly labels: string
	readonly controls: string
	readonly scenario: string
	readonly settings: string
	readonly model: string
	readonly url: string
	readonly live: boolean
}
