import type { Message, NoulQuestion, extractTokens, splitSentences } from '@orkestrel/agent'
import type { StudyScenario } from '@orkestrel/study'

/** Names the frozen case partition. */
export type StudySentencePartition = 'fitting' | 'validation'

/** Names the population strata before blind labeling. */
export type StudySentenceStratum = 'same' | 'standing' | 'cross' | 'control'

/** Holds the public register's continuing identity and known names. */
export interface StudySentenceCase {
	readonly id: string
	readonly account: string
	readonly names: readonly string[]
	readonly partition: StudySentencePartition
}

/** Holds a canonical source and released version. */
export interface StudySentenceIdentity {
	readonly id: string
	readonly version: number
}

/** Holds an exact original sentence target between released sources. */
export interface StudySentenceTarget {
	readonly earlier: StudySentenceIdentity
	readonly later: StudySentenceIdentity
	readonly sentence: number
}

/** Holds complete rendered source bytes and their public chronology. */
export interface StudySentenceSource extends StudySentenceIdentity {
	readonly category: 'arrival' | 'lookup' | 'fictional'
	readonly role: Message['role']
	readonly text: string
	readonly boundary: number
	readonly position: number
	readonly cases: readonly string[]
	readonly digest: string
}

/** Holds one recorded alias with its independently retained rendered bytes. */
export interface StudySentenceAlias {
	readonly id: string
	readonly source: StudySentenceIdentity
	readonly role: Message['role']
	readonly text: string
	readonly evidence: string
}

/** Holds an explicit supplemental pair, retaining the recorded reading version. */
export interface StudySentencePair {
	readonly earlier: StudySentenceIdentity
	readonly later: StudySentenceIdentity
	readonly required: boolean
	readonly evidence: string
}

/** Holds authored control intent separately from blind packets. */
export interface StudySentenceControl {
	readonly id: string
	readonly category: string
	readonly partition: StudySentencePartition
	readonly earlier: string
	readonly later: string
	readonly sentence: number
	readonly intent: boolean
}

/** Holds explicit public membership and source declarations. */
export interface StudySentencePopulation {
	readonly cases: readonly StudySentenceCase[]
	readonly membership: Readonly<Record<string, readonly string[]>>
	readonly neutral: readonly string[]
	readonly standing: readonly string[]
	readonly aliases: readonly StudySentenceAlias[]
	readonly pairs: readonly StudySentencePair[]
	readonly controls: readonly StudySentenceControl[]
}

/** Holds the real admitted Agent lexical capabilities. */
export interface StudySentenceRuntime {
	readonly extractTokens: typeof extractTokens
	readonly splitSentences: typeof splitSentences
}

/** Holds the complete public inputs; contains no labels or model results. */
export interface StudySentenceInput {
	readonly scenario: StudyScenario
	readonly population: StudySentencePopulation
	readonly agent: StudySentenceRuntime
}

/** Holds one deterministic observation target and its index-bearing request. */
export interface StudySentencePacket {
	readonly id: string
	readonly earlier: StudySentenceSource
	readonly later: StudySentenceSource
	readonly sentence: number
	readonly text: string
	readonly state: string
	readonly key: string
	readonly rank: string
	readonly cases: readonly string[]
	readonly partition: StudySentencePartition
	readonly stratum: StudySentenceStratum
	readonly required: boolean
	readonly control: StudySentenceControl | undefined
	/** Carries the accepted hard-control intent, never an independently assigned label. */
	readonly constraint: { readonly category: string; readonly intent: boolean } | undefined
}

/** Holds every candidate omitted by partition, eligibility, or bounded drawing. */
export interface StudySentenceExclusion {
	readonly packet: StudySentencePacket
	readonly reason: 'register' | 'partition' | 'draw' | 'ineligible'
}

/** Holds only the public texts and opaque target identity for blind labeling. */
export interface StudySentenceBlind {
	readonly id: string
	readonly earlier: { readonly role: Message['role']; readonly text: string }
	readonly later: { readonly role: Message['role']; readonly text: string }
	readonly sentence: number
	readonly target: string
}

/** Holds the unconditional minimum forecast without asserting label adequacy. */
export interface StudySentenceForecast {
	readonly base: number
	readonly added: number
	readonly requests: number
	readonly seconds: number
	readonly excess: number
	readonly refused: boolean
}

/** Holds the full canonical population and all exclusion and alias dispositions. */
export interface StudySentenceManifest {
	readonly question: NoulQuestion
	readonly sources: readonly StudySentenceSource[]
	readonly population: StudySentencePopulation
	readonly packets: readonly StudySentencePacket[]
	readonly blind: readonly StudySentenceBlind[]
	readonly excluded: readonly StudySentenceExclusion[]
	readonly duplicates: readonly string[]
	readonly aliases: ReadonlyArray<{
		readonly id: string
		readonly source: StudySentenceIdentity
		readonly disposition: 'collapsed'
	}>
	readonly forecast: StudySentenceForecast
}
