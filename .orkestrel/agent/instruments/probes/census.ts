import { renderBrowserJourney } from '@orkestrel/browser'
import {
	extractJourneyEvidence,
	findBoundParameter,
	findJourneyLoops,
	findUnlistedReferences,
	matchesJourneySequence,
	matchesRemovedCart,
	matchesStoreOracles,
	STORE_BOUNDS,
	STORE_TASKS,
} from '../../tests/setupStore.js'
import type { StoreTranscript } from '../../tests/setupStore.js'

// Shared readers for the recorded-attempt censuses: why an attempt fails its oracle, its refusals, and its call shape.

/** Normalizes a refusal's first line so one class counts once across names, references, and numbers. */
export function normalizeRefusal(text: string): string {
	return (text.split('\n')[0] ?? '')
		.replace(/"[^"]*"/g, '"…"')
		.replace(/\be\d+\b/g, 'eN')
		.replace(/\d+/g, 'N')
}

/** Counts the refused calls that named a reference absent from the results since the page last changed. */
export function countStale(transcript: StoreTranscript): number {
	return findUnlistedReferences(transcript.seed, transcript.calls).filter((call) => !call.success).length
}

/** Lists the tool names an attempt called, in order, marking refusals with `!`. */
export function shapeOf(transcript: StoreTranscript): string {
	return transcript.calls.map((call) => `${call.name}${call.success ? '' : '!'}`).join('>')
}

/** Names every oracle clause a failing attempt breaks, with the facts behind it. */
export function describeReasons(task: string, transcript: StoreTranscript): readonly string[] {
	const reasons: string[] = []
	if (transcript.failure !== undefined) reasons.push(`failure: ${String(transcript.failure).slice(0, 90)}`)
	if (transcript.partial) reasons.push('partial')
	const limit = task === 'journey' ? (1 + STORE_TASKS.journey.followups.length) * STORE_BOUNDS.limit : STORE_BOUNDS.limit
	if (transcript.calls.length > limit) reasons.push(`calls ${transcript.calls.length} > ${limit}`)
	const unlisted = findUnlistedReferences(transcript.seed, transcript.calls)
	if (unlisted.length > 0)
		reasons.push(`unlisted: ${unlisted.map((call) => `${call.name}(${String(call.arguments['ref'])})${call.success ? '' : '!'}`).join(' ')}`)
	if (transcript.ended > 0) reasons.push(`ended ${transcript.ended}`)
	if (transcript.violations > 0) reasons.push(`malformed ${transcript.violations}`)
	if (task === 'journey') {
		if (!matchesJourneySequence(transcript.calls)) reasons.push('sequence')
		const evidence = extractJourneyEvidence(transcript.files)
		if (evidence === undefined) reasons.push('no stored journey')
		else {
			if (findBoundParameter(evidence.journey) === undefined) reasons.push('no bound parameter')
			if (!matchesRemovedCart(transcript.calls, renderBrowserJourney(evidence.journey))) reasons.push('cart click kept or submissions differ')
			if (!evidence.runs.some((run) => run.outcome === 'complete')) reasons.push('no complete run')
		}
		reasons.push(`orders ${JSON.stringify(transcript.state.orders)}`)
		const loops = findJourneyLoops(transcript.calls)
		if (loops.length > 0) reasons.push(`loops ${loops.length}`)
	}
	if (task === 'paging' && transcript.mentioned !== true) reasons.push('token not mentioned')
	if (!matchesStoreOracles(transcript, limit) && reasons.length === 0) reasons.push('shared oracle')
	return reasons
}
