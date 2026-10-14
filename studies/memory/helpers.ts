import type { StudyAdjudication } from '@orkestrel/study/server'
import type { StudyJudgment, StudyProfile, StudyRole } from '@orkestrel/study'
import type { StudyMemoryRequest, StudyMemoryTerminal } from './types.js'
import { canonicalStringify, isObject, isRecord } from '@orkestrel/contract'
import { StudyError } from '@orkestrel/study'
import { isStudyMemoryAssertion } from './validators.js'

/** Checks finite room and required immutable serving identities. @param profile - Runtime profile. @returns Nothing when admitted. */
export function validateStudyMemoryProfile(profile: StudyProfile): void {
	const { room, provider } = profile
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

/** Grades observable mechanisms while leaving meaning for blind labels. @param input - Sealed attempts, evidence and independent rubric. @returns Attributable mechanical readings. */
export function gradeStudyMemory(input: StudyAdjudication): readonly StudyJudgment[] {
	const judgments: StudyJudgment[] = []
	for (const attempt of input.attempts)
		for (const criterion of input.rubric.criteria) {
			if (criterion.scenario !== attempt.trial.scenario) continue
			const observation = attempt.observations.find((entry) => entry.goal === criterion.goal)
			const rows = input.evidence[attempt.trial.id] ?? []
			let verdict: StudyJudgment['verdict'] = 'unknown'
			let reference: number | undefined
			const assertion = criterion.assertion
			if (
				criterion.method !== 'semantic' &&
				isStudyMemoryAssertion(assertion) &&
				observation !== undefined
			) {
				if (assertion.observation === 'operational')
					verdict =
						observation.failure === undefined &&
						observation.product !== undefined &&
						attempt.failure === undefined
							? 'achieved'
							: 'unsuccessful'
				else if (assertion.observation === 'result' && observation.product !== undefined)
					verdict = observation.product.partial === assertion.partial ? 'achieved' : 'unsuccessful'
				else {
					reference = rows.findIndex(
						(row) =>
							row.goal === criterion.goal &&
							row.event === assertion.observation &&
							(assertion.observation === 'summary' ||
								(isRecord(row.value) && 'id' in assertion && row.value.id === assertion.id)),
					)
					verdict =
						reference >= 0
							? 'achieved'
							: observation.failure === undefined && observation.product !== undefined
								? 'unsuccessful'
								: 'unknown'
				}
			}
			judgments.push({
				trial: attempt.trial.id,
				criterion: criterion.id,
				verdict,
				method: criterion.method === 'semantic' ? 'human' : criterion.method,
				reason:
					criterion.method === 'semantic'
						? 'Requires an independent blind semantic label'
						: 'Retained observable mechanism evidence',
				references:
					reference !== undefined && reference >= 0
						? [`${attempt.trial.id}:evidence:${reference}`]
						: [],
			})
		}
	return judgments
}
