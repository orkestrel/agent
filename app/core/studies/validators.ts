import type {
	StudyBounds,
	StudyDefinition,
	StudyGoal,
	StudyLimit,
	StudyProfile,
	StudyProvider,
	StudyRoom,
	StudyScenario,
} from './types.js'
import { isArray, isJSONValue, isRecord } from '@orkestrel/contract'
import { STUDY_DURATION, STUDY_GOALS, STUDY_NAME, STUDY_TRIALS } from './constants.js'

/**
 * Checks whether an identifier is portable and bounded.
 * @param value - The candidate identifier
 * @returns True if it is a portable study identifier; false otherwise
 * @example
 * ```ts
 * isStudyName('memory') // true
 * ```
 */
export function isStudyName(value: unknown): value is string {
	return typeof value === 'string' && value.length <= 128 && STUDY_NAME.test(value)
}

/**
 * Checks whether all allowances are positive safe integers within timer bounds.
 * @param value - The candidate limit
 * @returns True if it defines finite positive allowances; false otherwise
 * @example
 * ```ts
 * isStudyLimit({ duration: 1000, calls: 1, tokens: 100, bytes: 1024 }) // true
 * ```
 */
export function isStudyLimit(value: unknown): value is StudyLimit {
	try {
		if (!isRecord(value)) return false
		return (
			['duration', 'calls', 'tokens', 'bytes'].every(
				(key) => typeof value[key] === 'number' && Number.isSafeInteger(value[key]) && value[key] > 0,
			) &&
			typeof value.duration === 'number' &&
			value.duration <= STUDY_DURATION
		)
	} catch {
		return false
	}
}

/**
 * Checks whether nested scopes admit no larger allowance than their parent.
 * @param value - The candidate bounds
 * @returns True if every nested allowance is ordered; false otherwise
 * @example
 * ```ts
 * isStudyBounds({}) // false
 * ```
 */
export function isStudyBounds(value: unknown): value is StudyBounds {
	try {
		if (
			!isRecord(value) ||
			!isStudyLimit(value.request) ||
			!isStudyLimit(value.goal) ||
			!isStudyLimit(value.trial) ||
			!isStudyLimit(value.series)
		) return false
		const limits = [value.request, value.goal, value.trial, value.series]
		for (const [index, limit] of limits.entries()) {
			const next = limits[index + 1]
			if (next === undefined) continue
			if (
				limit.duration > next.duration || limit.calls > next.calls ||
				limit.tokens > next.tokens || limit.bytes > next.bytes
			) return false
		}
		return value.request.calls === 1
	} catch {
		return false
	}
}

/**
 * Checks whether a goal has a bounded identifier and exact JSON input.
 * @param value - The candidate goal
 * @returns True if the goal is valid; false otherwise
 * @example
 * ```ts
 * isStudyGoal({ id: 'write', input: { text: 'hello' } }) // true
 * ```
 */
export function isStudyGoal(value: unknown): value is StudyGoal {
	try {
		return isRecord(value) && isStudyName(value.id) && isJSONValue(value.input)
	} catch {
		return false
	}
}

/**
 * Checks whether a scenario declares a nonempty horizon with unique goal ids.
 * @param value - The candidate scenario
 * @returns True if the scenario has a valid horizon; false otherwise
 * @example
 * ```ts
 * isStudyScenario({ id: 'shift', goals: [{ id: 'handoff', input: 'Prepare handoff' }] }) // true
 * ```
 */
export function isStudyScenario(value: unknown): value is StudyScenario {
	try {
		if (!isRecord(value) || !isStudyName(value.id) || !isArray(value.goals)) return false
		return value.goals.length > 0 && value.goals.length <= STUDY_GOALS &&
			value.goals.every(isStudyGoal) &&
			new Set(value.goals.map((goal) => goal.id)).size === value.goals.length
	} catch {
		return false
	}
}

/**
 * Checks whether a study freezes a complete arm order for every repetition.
 * @param value - The candidate definition
 * @returns True if its population and repetition orders are valid; false otherwise
 * @example
 * ```ts
 * isStudyDefinition({ name: 'tools' }) // false
 * ```
 */
export function isStudyDefinition(value: unknown): value is StudyDefinition {
	try {
		if (
			!isRecord(value) || !isStudyName(value.name) || !isStudyName(value.driver) ||
			typeof value.version !== 'string' || value.version.length === 0 ||
			typeof value.question !== 'string' || value.question.length === 0 ||
			(value.purpose !== 'mechanism' && value.purpose !== 'quality' && value.purpose !== 'capacity') ||
			!isArray(value.arms) || value.arms.length === 0 || !value.arms.every(isStudyName) ||
			new Set(value.arms).size !== value.arms.length ||
			!isArray(value.scenarios) || value.scenarios.length === 0 || !value.scenarios.every(isStudyName) ||
			new Set(value.scenarios).size !== value.scenarios.length ||
			!isArray(value.order) || value.order.length === 0 || value.retries !== 0 ||
			typeof value.rubric !== 'string' || value.rubric.length === 0
		) return false
		const arms = value.arms
		if (arms.length * value.scenarios.length * value.order.length > STUDY_TRIALS) return false
		return value.order.every((order) =>
			isArray(order) && order.length === arms.length && new Set(order).size === arms.length &&
			order.every((arm) => typeof arm === 'string' && arms.includes(arm)),
		)
	} catch {
		return false
	}
}

/**
 * Checks whether generation room leaves positive context for input.
 * @param value - The candidate room
 * @returns True if input, output and safety allowances fit; false otherwise
 * @example
 * ```ts
 * isStudyRoom({ context: 20480, output: 8192, safety: 512, recap: 2048, think: true }) // true
 * ```
 */
export function isStudyRoom(value: unknown): value is StudyRoom {
	try {
		if (!isRecord(value) || typeof value.think !== 'boolean') return false
		if (!['context', 'output', 'safety', 'recap'].every(
			(key) => typeof value[key] === 'number' && Number.isSafeInteger(value[key]) && value[key] > 0,
		)) return false
		return typeof value.context === 'number' && typeof value.output === 'number' &&
			typeof value.safety === 'number' && typeof value.recap === 'number' &&
			value.output + value.safety < value.context && value.recap + value.safety < value.context
	} catch {
		return false
	}
}

/**
 * Checks whether a provider declaration names artifacts, an HTTP origin and models.
 * @param value - The candidate provider declaration
 * @returns True if the declaration has a supported origin and nonempty names; false otherwise
 * @example
 * ```ts
 * isStudyProvider({ entry: 'dist/index.js', url: 'http://127.0.0.1:11435', model: 'qwen', judge: 'mica' }) // true
 * ```
 */
export function isStudyProvider(value: unknown): value is StudyProvider {
	try {
		if (!isRecord(value) || !['entry', 'url', 'model', 'judge'].every(
			(key) => typeof value[key] === 'string' && value[key].length > 0,
		) || typeof value.url !== 'string') return false
		const url = new URL(value.url)
		return ['http:', 'https:'].includes(url.protocol) && url.username === '' && url.password === '' &&
			url.search === '' && url.hash === '' && url.pathname === '/'
	} catch {
		return false
	}
}

/**
 * Checks whether a profile carries finite bounds and an optional explicit provider.
 * @param value - The candidate profile
 * @returns True if the profile is structurally valid; false otherwise
 * @example
 * ```ts
 * isStudyProfile({ name: 'local' }) // false
 * ```
 */
export function isStudyProfile(value: unknown): value is StudyProfile {
	try {
		return isRecord(value) && isStudyName(value.name) &&
			typeof value.subject === 'string' && value.subject.length > 0 &&
			isStudyBounds(value.bounds) && isStudyRoom(value.room) &&
			(value.provider === undefined || isStudyProvider(value.provider)) &&
			(value.qualification === undefined ||
				(typeof value.qualification === 'string' && value.qualification.length > 0))
	} catch {
		return false
	}
}
