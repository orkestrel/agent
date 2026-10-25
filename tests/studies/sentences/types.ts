import type { StudyAdjudication } from '@orkestrel/study/server'
import type { StudySessionInterface } from '@orkestrel/study'
import type {
	MemoryContextFixture,
	MemoryServerFixture,
	MemoryWireFixture,
} from '../memory/types.js'
import type {
	StudySentenceDeclarations,
	StudySentenceLabel,
	StudySentenceManifest,
	StudySentenceSample,
} from '../../../studies/sentences/types.js'

/** Holds an independent fixed rank and membership oracle for one noise cell. */
export interface StudySentenceNoiseVector {
	readonly partition: string
	readonly category: string
	readonly label: string
	readonly expected: readonly StudySentenceNoiseMember[]
}

/** Holds fixed canonical tuple bytes and their independently computed SHA-256 rank. */
export interface StudySentenceNoiseMember {
	readonly id: string
	readonly tuple: ReadonlyArray<string | number>
	readonly rank: string
}

/** Holds synthetic calibration labels and declarations for CPU proofs. */
export interface StudySentenceFixture {
	readonly manifest: StudySentenceManifest
	readonly labels: readonly StudySentenceLabel[]
	readonly sample: StudySentenceSample
	readonly declarations: StudySentenceDeclarations
	readonly input: StudyAdjudication
}

/** Holds protocol responses and native lifetime controls for one sentence session. */
export interface StudySentenceSessionFixtureOptions {
	readonly responses?: readonly MemoryWireFixture[]
	readonly signal?: AbortSignal
	readonly duration?: number
}

/** Owns a real sentence session, its accounting, and its ephemeral HTTP peer. */
export interface StudySentenceSessionFixture {
	readonly fixture: StudySentenceFixture
	readonly session: StudySessionInterface
	readonly context: MemoryContextFixture
	readonly server: MemoryServerFixture
	close(): Promise<void>
}
