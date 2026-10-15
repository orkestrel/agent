import type { StudyAdjudication } from '@orkestrel/study/server'
import type { JSONValue } from '@orkestrel/contract'
import type { OllamaTiming } from '@orkestrel/ollama'
import type { StudyJudgment, StudyProfile, StudyRole } from '@orkestrel/study'
import type {
	LedgerGauge,
	Message,
	ProviderRequest,
	ProviderResult,
	RequestMeasure,
} from '@orkestrel/agent'
import type {
	StudyMemoryProvenance,
	StudyMemoryProvenanceSource,
	StudyMemoryProvider,
	StudyMemoryRequest,
	StudyMemoryObservation,
	StudyMemorySubject,
	StudyMemoryTerminal,
} from './types.js'
import { createHash } from 'node:crypto'
import {
	attempt as attemptValue,
	canonicalStringify,
	isArray,
	isObject,
	isRecord,
} from '@orkestrel/contract'
import { StudyError } from '@orkestrel/study'
import { isStudyMemoryAssertion, isStudyMemorySettings } from './validators.js'

/** Reads the explicit compaction gauge without supplying a fallback. @param settings - Profile settings. @returns A copy of the declared gauge. @throws StudyError - CONFIG when the settings are absent, malformed or declare no gauge. */
export function readStudyMemoryGauge(settings: unknown): LedgerGauge {
	if (!isStudyMemorySettings(settings) || settings.gauge === undefined)
		throw new StudyError('CONFIG', 'Memory compaction requires an explicit settings gauge')
	return { scale: settings.gauge.scale, overhead: settings.gauge.overhead }
}

/** Translates only a nominal window refusal into the attributable capacity failure. @param error - Caught or reported value. @param subject - Admitted Agent namespace owning the nominal guard. @returns A capacity StudyError for an Agent WINDOW error; every other value with its identity. */
export function readStudyMemoryError(error: unknown, subject: StudyMemorySubject): unknown {
	if (!subject.isAgentError(error) || error.code !== 'WINDOW') return error
	return new StudyError('CAPACITY', error.message, {
		cause: 'capacity',
		message: error.message,
		role: 'agent',
	})
}

/** Prices an estimate through a gauge. @param gauge - Explicit scale and overhead. @param estimate - Subject estimate of one complete request. @returns The projected prompt tokens, rounded up. */
export function projectStudyMemoryRequest(gauge: LedgerGauge, estimate: number): number {
	return Math.ceil(gauge.overhead + gauge.scale * estimate)
}

/** Checks an actual prompt count against a request's projection. @param usage - Usage a successful provider call reported. @param projected - Gauge projection of the dispatched request. @param role - The responsibility whose request was dispatched; every failure retains it. @returns Nothing when a finite positive count does not exceed the projection. @throws StudyError - FAULT when the count is missing or not finite and positive; CAPACITY when it exceeds the projection. */
export function validateStudyMemoryProjection(
	usage: ProviderResult['usage'],
	projected: number,
	role: StudyRole,
): void {
	const prompt = usage?.prompt
	if (typeof prompt !== 'number' || !Number.isFinite(prompt) || prompt <= 0) {
		const message = 'Gauged request returned no usable prompt count'
		throw new StudyError('FAULT', message, { cause: 'infrastructure', message, role })
	}
	if (prompt > projected) {
		const message = 'Actual prompt exceeded the gauged projection'
		throw new StudyError('CAPACITY', message, { cause: 'capacity', message, role })
	}
}

/** Reads the passive observation switches from generic driver settings. @param settings - Optional profile settings. @returns Disabled observation unless `observe` is true; selected goal ids only while enabled. @throws StudyError - CONFIG when present settings are malformed. */
export function readStudyMemorySettings(settings: unknown): StudyMemoryObservation {
	if (settings === undefined) return { observe: false, checkpoints: new Set() }
	if (!isStudyMemorySettings(settings))
		throw new StudyError('CONFIG', 'Memory settings are malformed')
	const observe = settings.observe === true
	return { observe, checkpoints: new Set(observe ? (settings.checkpoints ?? []) : []) }
}

/** Hashes the canonical rendering of a complete request so any change to content, order, ids, tools or options changes the revision. @param request - The exact pre-encoding request. @returns The SHA-256 hex digest, or null when the request cannot be canonically rendered; a rendering failure never throws. */
export function buildStudyMemoryRevision(request: ProviderRequest): string | null {
	const rendered = attemptValue(() => canonicalStringify(request))
	if (!rendered.success || rendered.value === undefined) return null
	return createHash('sha256').update(rendered.value).digest('hex')
}

/** Projects structural request components onto plain JSON without storing a total. @param measure - Disjoint per-message, tools and schema estimates. @returns The same components in request order. */
export function buildStudyMemoryParts(measure: RequestMeasure): JSONValue {
	return {
		messages: measure.messages.map((message) => ({
			id: message.id,
			role: message.role,
			content: message.content,
			framing: message.framing,
			calls: message.calls,
			thinking: message.thinking,
			images: message.images,
		})),
		tools: measure.tools,
		schema: measure.schema,
	}
}

/** Reads one message's origin from session-held joins only, never from its text or position. @param message - A message of a measured request. @param source - The session's explicit ids, section ids and conversation membership. @returns The nonadditive origin; `unknown` when no join applies. */
export function readStudyMemoryProvenance(
	message: Message,
	source: StudyMemoryProvenanceSource,
): StudyMemoryProvenance {
	const explicit = source.explicit.get(message.id)
	if (explicit !== undefined) return explicit
	if (source.sections.has(message.id)) return { origin: 'summary', source: message.id }
	if (message.role === 'tool') return { origin: 'tool' }
	if (message.role === 'system')
		return source.composed ? { origin: 'mixed' } : { origin: 'instructions', source: 'desk' }
	return source.members.has(message.id) ? { origin: 'history' } : { origin: 'unknown' }
}

/** Builds the JSON origin annotations of a request's messages, aligned to them one to one. @param messages - The measured request's messages, duplicates included. @param source - The session's joins. @returns One origin object per message, with `source` only when known. */
export function buildStudyMemoryOrigins(
	messages: readonly Message[],
	source: StudyMemoryProvenanceSource,
): JSONValue {
	return messages.map((message) => {
		const found = readStudyMemoryProvenance(message, source)
		return found.source === undefined
			? { origin: found.origin }
			: { origin: found.origin, source: found.source }
	})
}

/** Measures the raw prompt of a body that carries a string `prompt`, as sent. @param body - The encoded request body. @returns UTF-16 code units and UTF-8 bytes of that prompt, labeled with its encoding; undefined when there is no string prompt. These are readings of the actual text, not token allocations. */
export function buildStudyMemoryRaw(body: unknown): JSONValue | undefined {
	if (typeof body !== 'string') return undefined
	const parsed = attemptValue((): unknown => JSON.parse(body))
	if (!parsed.success || !isRecord(parsed.value) || typeof parsed.value.prompt !== 'string')
		return undefined
	return {
		encoding: 'utf-8',
		units: parsed.value.prompt.length,
		bytes: new TextEncoder().encode(parsed.value.prompt).byteLength,
	}
}

/** Reads the pinned serving digest of an admitted request. @param profile - Runtime profile with the required digests. @param request - Admitted dispatch. @returns The pinned digest, or null for an inventory request. */
export function readStudyMemoryDigest(
	profile: StudyProfile,
	request: StudyMemoryRequest,
): string | null {
	const provider = profile.provider
	if (provider === undefined) return null
	if (request.role === 'judge') return provider.digest.judge
	if (request.role !== 'metadata') return provider.digest.model
	if (request.model === provider.model) return provider.digest.model
	return request.model === provider.judge ? provider.digest.judge : null
}

/** Extracts daemon timing from a validated terminal row without letting an observation fail the request. @param extract - Admitted extractor. @param record - Validated terminal row. @returns The raw timing, or undefined when absent or the extractor refuses. */
export function readStudyMemoryTiming(
	extract: StudyMemoryProvider['extractTiming'],
	record: Readonly<Record<string, unknown>>,
): OllamaTiming | undefined {
	try {
		return extract(record)
	} catch {
		return undefined
	}
}

/** Builds the JSON evidence form of a timing observation, keeping raw nanoseconds and counts. @param timing - Extracted timing. @returns Null when no terminal timing was observed, else unknown fields as null. */
export function buildStudyMemoryTiming(timing: OllamaTiming | undefined): JSONValue {
	if (timing === undefined) return null
	return {
		durations: {
			total: timing.durations.total ?? null,
			load: timing.durations.load ?? null,
			prompt: timing.durations.prompt ?? null,
			decode: timing.durations.decode ?? null,
		},
		counts: {
			prompt: timing.counts.prompt ?? null,
			decode: timing.counts.decode ?? null,
			cached: timing.counts.cached ?? null,
		},
		invalid: [...timing.invalid],
	}
}

/** Builds the JSON evidence form of a Ledger result's logical classifier readings. @param result - Value returned by the Ledger. @returns Null when the result carries no readings array, else one entry per well-formed reading in asking order. */
export function buildStudyMemoryReadings(result: unknown): JSONValue {
	if (!isObject(result) || !('readings' in result) || !isArray(result.readings)) return null
	const readings: JSONValue[] = []
	for (const entry of result.readings) {
		if (
			!isObject(entry) ||
			!('key' in entry) ||
			typeof entry.key !== 'string' ||
			!('phase' in entry) ||
			typeof entry.phase !== 'string' ||
			!('outcome' in entry) ||
			typeof entry.outcome !== 'string'
		)
			continue
		readings.push({
			key: entry.key,
			phase: entry.phase,
			outcome: entry.outcome,
			duration: 'duration' in entry && typeof entry.duration === 'number' ? entry.duration : null,
		})
	}
	return readings
}

/** Checks finite room, required immutable serving identities and well-formed driver settings. @param profile - Runtime profile. @returns Nothing when admitted. */
export function validateStudyMemoryProfile(profile: StudyProfile): void {
	const { room, provider } = profile
	if (profile.settings !== undefined && !isStudyMemorySettings(profile.settings))
		throw new StudyError('CONFIG', 'Memory settings are malformed')
	if (
		provider === undefined ||
		!/^(?:sha256:)?[a-f0-9]{64}$/.test(provider.digest.model) ||
		!/^(?:sha256:)?[a-f0-9]{64}$/.test(provider.digest.judge)
	)
		throw new StudyError('CONFIG', 'Memory requires exact model and judge digests')
	for (const number of [room.context, room.output, room.safety, room.recap])
		if (!Number.isSafeInteger(number) || number <= 0)
			throw new StudyError('CONFIG', 'Memory room allowances must be positive finite integers')
	if (room.context <= Math.max(room.output, room.recap) + room.safety)
		throw new StudyError('CONFIG', 'Memory room leaves no prompt capacity')
	const url = new URL(provider.url)
	if (
		!['http:', 'https:'].includes(url.protocol) ||
		url.username !== '' ||
		url.password !== '' ||
		url.search !== '' ||
		url.hash !== '' ||
		url.pathname !== '/'
	)
		throw new StudyError('CONFIG', 'Memory requires an uncredentialed exact origin')
}

/** Validates exact outbound Ollama policy before admission. @param profile - Runtime settings. @param role - Responsible model role. @param input - Requested URL. @param init - Native fetch settings. @returns Safe dispatch facts. */
export function readStudyMemoryRequest(
	profile: StudyProfile,
	role: StudyRole,
	input: string | URL | Request,
	init?: RequestInit,
): StudyMemoryRequest {
	const provider = profile.provider
	if (provider === undefined || input instanceof Request)
		throw new StudyError('CONFIG', 'Memory requires explicit URL requests')
	const url = new URL(input)
	const path =
		role === 'metadata'
			? init?.method === 'POST'
				? '/api/show'
				: '/api/tags'
			: role === 'judge'
				? '/api/generate'
				: '/api/chat'
	if (
		url.origin !== new URL(provider.url).origin ||
		url.pathname !== path ||
		url.search !== '' ||
		url.hash !== '' ||
		url.username !== '' ||
		url.password !== ''
	)
		throw new StudyError(
			'CONFIG',
			'Memory transport endpoint differs from the admitted origin and path',
		)
	if (role === 'metadata') {
		if (path === '/api/show') {
			if (typeof init?.body !== 'string')
				throw new StudyError('CONFIG', 'Invalid model metadata request')
			const body: unknown = JSON.parse(init.body)
			if (
				!isRecord(body) ||
				Object.keys(body).length !== 1 ||
				typeof body.model !== 'string' ||
				![provider.model, provider.judge].includes(body.model)
			)
				throw new StudyError('CONFIG', 'Invalid model metadata identity')
			return {
				role,
				path,
				model: body.model,
				output: 0,
				bytes: new TextEncoder().encode(init.body).byteLength,
				options: {},
			}
		}
		if (init?.method !== 'GET' || init.body !== undefined)
			throw new StudyError('CONFIG', 'Invalid inventory request')
		return { role, path, model: undefined, output: 0, bytes: 0, options: {} }
	}
	if (init?.method !== 'POST' || typeof init.body !== 'string')
		throw new StudyError('CONFIG', 'Memory requires an encoded JSON POST')
	const body: unknown = JSON.parse(init.body)
	const model = role === 'judge' ? provider.judge : provider.model
	const output =
		role === 'judge' ? 1 : role === 'summary' ? profile.room.recap : profile.room.output
	const options = {
		num_ctx: profile.room.context,
		num_predict: output,
		temperature: role === 'judge' ? 1 : 0,
		seed: 0,
	}
	if (
		!isRecord(body) ||
		body.model !== model ||
		!isRecord(body.options) ||
		canonicalStringify(body.options) !== canonicalStringify(options) ||
		body.stream !== (role !== 'judge')
	)
		throw new StudyError(
			'CONFIG',
			'Memory transport model or effective options differ from the profile',
		)
	if (
		role === 'judge'
			? body.raw !== true || body.logprobs !== true
			: typeof body.think !== 'boolean' ||
				(role === 'summary' && body.think !== false) ||
				(body.think === true && !profile.room.think)
	)
		throw new StudyError('CONFIG', 'Memory transport flags differ from the declared treatment')
	return {
		role,
		path,
		model,
		output,
		bytes: new TextEncoder().encode(init.body).byteLength,
		options,
	}
}

/** Reads the declared model context ceiling without claiming daemon allocation. @param value - Actual Ollama show response. @param profile - Requested total context. @returns The unambiguous model context ceiling. */
export function readStudyMemorySupport(value: unknown, profile: StudyProfile): number {
	if (
		!isRecord(value) ||
		!isRecord(value.model_info) ||
		typeof value.model_info['general.architecture'] !== 'string'
	)
		throw new StudyError('FAULT', 'Missing model context metadata')
	const architecture = value.model_info['general.architecture']
	const keys = Object.keys(value.model_info).filter((key) => key.endsWith('.context_length'))
	const ceiling = value.model_info[`${architecture}.context_length`]
	if (
		keys.length !== 1 ||
		typeof ceiling !== 'number' ||
		!Number.isSafeInteger(ceiling) ||
		ceiling < profile.room.context
	)
		throw new StudyError(
			'CAPACITY',
			'Model context metadata does not support the requested context',
		)
	return ceiling
}

/** Reads one Ollama terminal without inventing absent usage. @param value - Parsed wire row. @param request - Admitted dispatch. @returns Terminal facts or undefined for a nonterminal row. */
export function readStudyMemoryTerminal(
	value: unknown,
	request: StudyMemoryRequest,
): StudyMemoryTerminal | undefined {
	if (!isRecord(value) || typeof value.done !== 'boolean' || 'error' in value)
		throw new StudyError('FAULT', 'Malformed Ollama response row')
	if (value.model !== request.model)
		throw new StudyError('FAULT', 'Ollama response model differs from the dispatched model')
	if (request.role !== 'judge') {
		if (
			!isRecord(value.message) ||
			typeof value.message.content !== 'string' ||
			(value.message.thinking !== undefined && typeof value.message.thinking !== 'string')
		)
			throw new StudyError('FAULT', 'Malformed Ollama message')
		if (value.message.tool_calls !== undefined) {
			if (!Array.isArray(value.message.tool_calls))
				throw new StudyError('FAULT', 'Malformed Ollama tool calls')
			for (const call of value.message.tool_calls)
				if (
					!isRecord(call) ||
					!isRecord(call.function) ||
					typeof call.function.name !== 'string' ||
					!isRecord(call.function.arguments)
				)
					throw new StudyError('FAULT', 'Malformed Ollama tool call')
		}
	}
	if (!value.done) return undefined
	if (typeof value.done_reason !== 'string' || value.done_reason.length === 0)
		throw new StudyError('FAULT', 'Missing Ollama finish reason')
	for (const key of ['prompt_eval_count', 'eval_count'])
		if (
			value[key] !== undefined &&
			(typeof value[key] !== 'number' || !Number.isSafeInteger(value[key]) || value[key] < 0)
		)
			throw new StudyError('FAULT', 'Malformed Ollama usage')
	const prompt = typeof value.prompt_eval_count === 'number' ? value.prompt_eval_count : undefined
	const completion = typeof value.eval_count === 'number' ? value.eval_count : undefined
	return { prompt, completion, reason: value.done_reason }
}

/** Checks terminal policy after actual wire cost has been retained. @param terminal - Valid terminal facts. @param profile - Reserved context and output. @param request - Admitted responsibility. */
export function validateStudyMemoryCompletion(
	terminal: StudyMemoryTerminal,
	profile: StudyProfile,
	request: StudyMemoryRequest,
): void {
	const { prompt, completion, reason } = terminal
	if (prompt !== undefined && prompt > profile.room.context - request.output - profile.room.safety)
		throw new StudyError('CAPACITY', 'Actual prompt exceeded reserved context capacity')
	if (completion !== undefined && completion > request.output)
		throw new StudyError('CAPACITY', 'Actual generation exceeded the output allowance')
	if (
		request.role !== 'judge' &&
		(reason === 'length' || (completion !== undefined && completion >= request.output))
	)
		throw new StudyError('CAPACITY', 'Substantive generation reached its output cap')
	if (reason !== 'stop' && !(request.role === 'judge' && reason === 'length'))
		throw new StudyError('FAULT', 'Unsupported Ollama finish reason')
}

/** Verifies both names resolve to the required inventory digests. @param value - Inventory response. @param profile - Required serving identities. @returns Nothing for a matching inventory. */
export function validateStudyMemoryInventory(value: unknown, profile: StudyProfile): void {
	if (
		!isObject(value) ||
		!('models' in value) ||
		!Array.isArray(value.models) ||
		profile.provider === undefined
	)
		throw new StudyError('FAULT', 'Unsupported Ollama inventory')
	for (const [name, digest] of [
		[profile.provider.model, profile.provider.digest.model],
		[profile.provider.judge, profile.provider.digest.judge],
	]) {
		const matches = value.models.filter((model: unknown) => isRecord(model) && model.name === name)
		const model: unknown = matches[0]
		if (
			matches.length !== 1 ||
			!isRecord(model) ||
			typeof model.digest !== 'string' ||
			model.digest.replace(/^sha256:/, '') !== digest?.replace(/^sha256:/, '')
		)
			throw new StudyError('FAULT', 'Serving inventory does not match the required model digest')
	}
}

/** Grades observable mechanisms while leaving meaning for blind labels. @param input - Sealed attempts, evidence and independent rubric. @returns Attributable mechanical readings citing retained attempt files and one-based evidence rows. */
export function gradeStudyMemory(input: StudyAdjudication): readonly StudyJudgment[] {
	const judgments: StudyJudgment[] = []
	for (const attempt of input.attempts)
		for (const criterion of input.rubric.criteria) {
			if (criterion.scenario !== attempt.trial.scenario) continue
			const observation = attempt.observations.find((entry) => entry.goal === criterion.goal)
			const rows = input.evidence[attempt.trial.id] ?? []
			const file = `trials/${attempt.trial.id}/attempt.json`
			const evidence = `trials/${attempt.trial.id}/evidence.jsonl`
			let verdict: StudyJudgment['verdict'] = 'unknown'
			let references: readonly string[] = []
			const assertion = criterion.assertion
			if (
				criterion.method !== 'semantic' &&
				isStudyMemoryAssertion(assertion) &&
				observation !== undefined
			) {
				const complete = observation.failure === undefined && observation.product !== undefined
				if (assertion.observation === 'operational') {
					verdict = complete && attempt.failure === undefined ? 'achieved' : 'unsuccessful'
					references = [file]
				} else if (assertion.observation === 'result') {
					if (observation.product !== undefined) {
						verdict =
							observation.product.partial === assertion.partial ? 'achieved' : 'unsuccessful'
						references = [file]
					}
				} else {
					const index = rows.findIndex(
						(row) =>
							row.goal === criterion.goal &&
							row.event === assertion.observation &&
							(assertion.observation === 'summary' ||
								(isRecord(row.value) && 'id' in assertion && row.value.id === assertion.id)),
					)
					if (index >= 0) {
						verdict = 'achieved'
						references = [`${evidence}#${index + 1}`]
					} else if (complete) {
						verdict = 'unsuccessful'
						references = [file, evidence]
					}
				}
			}
			judgments.push(
				Object.freeze({
					trial: attempt.trial.id,
					criterion: criterion.id,
					verdict,
					method: criterion.method === 'semantic' ? 'human' : criterion.method,
					reason:
						criterion.method === 'semantic'
							? 'Requires an independent blind semantic label'
							: verdict === 'unknown'
								? 'No retained observation for the declared mechanism'
								: 'Retained observable mechanism evidence',
					references: Object.freeze(references),
				}),
			)
		}
	return Object.freeze(judgments)
}
