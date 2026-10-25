import type { Message, NoulQuestion, extractTokens, splitSentences } from '@orkestrel/agent'
import type { StudyScenario, StudyProfile, StudyRubric } from '@orkestrel/study'
import type { createOllamaJudge, extractTiming } from '@orkestrel/ollama'
import type { StudyDriverOptions, StudyOllamaMetadata } from '@orkestrel/study/server'

/** Holds the admitted provider's real judge and timing capabilities. */
export interface StudySentenceProvider {
	readonly createOllamaJudge: typeof createOllamaJudge
	readonly extractTiming: typeof extractTiming
}

/** Holds one trial's admitted provider and source-bound execution settings. */
export interface StudySentenceSessionOptions extends StudyDriverOptions {
	readonly provider: StudySentenceProvider
	readonly signal: AbortSignal
}

/** Holds label-free frozen execution receipts alongside the Study recording settings. */
export interface StudySentenceSettings {
	readonly binding: StudySentenceBinding
	readonly inputs: Readonly<Record<string, string>>
	readonly goals: readonly string[]
	readonly version: string
	readonly metadata: StudyOllamaMetadata
}

/** Holds pure generated declarations before the node-only launcher runs. */
export interface StudySentenceDeclarations {
	readonly scenario: StudyScenario
	readonly initial: StudyRubric
	readonly fitting: StudyRubric
	readonly validation: StudyRubric
	readonly profile: StudyProfile
}

/** Holds the public memory input admitted by the sentence enumerator's local mirror. */
export interface StudySentenceMemory {
	readonly prompt: string
	readonly arrivals: ReadonlyArray<{ readonly id: string; readonly content: string }>
	readonly records: ReadonlyArray<{
		readonly id: string
		readonly name: string
		readonly content: string
	}>
}

/** Holds a frozen blind label, with unresolved entries removed before admission. */
export interface StudySentenceLabel {
	readonly id: string
	readonly label: 'yes' | 'no' | 'unresolved'
}

/** Names the independently dispatched observation category. */
export type StudySentenceCategory = 'base' | 'repeat' | 'sham'

/** Holds the declared public goal fields, without labels or control intent. */
export interface StudySentenceGoal {
	readonly id: string
	readonly observation: string
	/** Mirrors the goal input field mandated by the calibration declaration. */
	readonly kind: StudySentenceCategory
	readonly state: string
	readonly key: string
	readonly digests: readonly string[]
}

/** Holds the selected noise count for one partition, category, and label. */
export interface StudySentenceCell {
	readonly partition: StudySentencePartition
	readonly category: 'repeat' | 'sham'
	readonly label: 'yes' | 'no'
	readonly packets: readonly StudySentencePacket[]
	readonly count: number
}

/** Holds deterministic sample admission, separate from the enumerator's minimum forecast. */
export interface StudySentenceSample {
	readonly packets: readonly StudySentencePacket[]
	readonly excluded: readonly string[]
	readonly initial: readonly StudySentenceCell[]
	readonly cells: readonly StudySentenceCell[]
	readonly goals: readonly StudySentenceGoal[]
	readonly requests: number
	readonly seconds: number
}

/** Holds immutable calibration inputs shared by independent grading declarations. */
export interface StudySentenceBinding {
	readonly manifest: string
	readonly labels: string
	readonly scenario: string
	readonly agent: string
	readonly fitting: string
	readonly validation: string
}

/** Holds a validated complete score with its request identity. */
export interface StudySentenceObservation {
	readonly observation: string
	readonly id: string
	readonly score: number
	readonly digest: string
	readonly binding: string
}

/** Holds one partition's independent grading target and hard control. */
export interface StudySentenceTargetLabel {
	readonly id: string
	readonly label: boolean
	readonly control: boolean | undefined
}

/** Holds finite-set performance at one cutoff. */
export interface StudySentenceMatrix {
	readonly cutoff: number
	readonly tp: number
	readonly fp: number
	readonly tn: number
	readonly fn: number
	readonly precision: number
	readonly recall: number
	readonly margin: number
}

/** Holds the immutable fitting result copied through the Study judgment reason. */
export interface StudySentenceSelection {
	readonly binding: StudySentenceBinding
	readonly cutoff: number
	readonly noise: number
	readonly matrices: readonly StudySentenceMatrix[]
	readonly observations: string
	readonly targets: readonly StudySentenceTargetLabel[]
	readonly policy: string
}

/** Holds the consumer grading declaration outside public goals. */
export interface StudySentenceAssertion {
	readonly phase: 'initial' | 'fitting' | 'validation'
	readonly binding: StudySentenceBinding
	readonly targets: readonly StudySentenceTargetLabel[]
	readonly selection: StudySentenceSelection | undefined
	readonly digest: string | undefined
	readonly grading: string | undefined
}

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
