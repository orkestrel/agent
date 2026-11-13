import type { AgentBuiltin, AgentCaller, AuthorityDecision, AuthorityVerdict } from './types.js'
import {
	arrayOf,
	holds,
	isObject,
	isRecord,
	isString,
	matchesExactKeys,
	objectOf,
} from '@orkestrel/contract'

/**
 * Checks whether a value names a built-in: `load`, `unload`, `memo`, `remember`, or `switch`.
 *
 * @param value - The unknown name candidate
 * @returns True if the value names a built-in; false otherwise
 *
 * @example
 * ```ts
 * isAgentBuiltin('load') // true
 * isAgentBuiltin('open') // false
 * ```
 */
export function isAgentBuiltin(value: unknown): value is AgentBuiltin {
	return (
		value === 'load' ||
		value === 'unload' ||
		value === 'memo' ||
		value === 'remember' ||
		value === 'switch'
	)
}

/**
 * Checks whether a value is an authority verdict: `allow`, `ask`, or `deny`.
 *
 * @param value - The unknown verdict candidate
 * @returns True if the value names a verdict; false otherwise
 *
 * @example
 * ```ts
 * isAuthorityVerdict('ask') // true
 * isAuthorityVerdict('maybe') // false
 * ```
 */
export function isAuthorityVerdict(value: unknown): value is AuthorityVerdict {
	return value === 'allow' || value === 'ask' || value === 'deny'
}

/**
 * Checks whether a value is an authority decision: an object whose `zone` is a string, whose
 * `verdict` is `allow`, `ask`, or `deny`, and whose `reason` is absent or a string.
 *
 * @remarks
 * Total: each member is read once, unknown members are admitted, and a non-object, a 0.0.34
 * `{ zone, allowed }` decision, an unknown verdict, a throwing getter, and a revoked or throwing
 * `Proxy` return false rather than throw.
 *
 * @param value - The unknown decision candidate
 * @returns True if the value satisfies the decision contract; false otherwise
 *
 * @example
 * ```ts
 * isAuthorityDecision({ zone: 'default', verdict: 'ask', reason: 'confirm' }) // true
 * isAuthorityDecision({ zone: 'default', allowed: true }) // false
 * ```
 */
export function isAuthorityDecision(value: unknown): value is AuthorityDecision {
	return objectOf({ zone: isString, verdict: isAuthorityVerdict, reason: isString }, ['reason'])(
		value,
	)
}

/**
 * Checks whether a value is an agent caller: a plain record whose own keys are exactly `workspace`
 * and `files`, whose `workspace` is `undefined` or an object, and whose `files` is `undefined` or an
 * array of strings.
 *
 * @remarks
 * Total: each member is read once, and an omitted, inherited, or undeclared member, a throwing
 * accessor, and a revoked `Proxy` return false rather than throw. It checks the shape a caller
 * carries, never that `workspace` is a live workspace: a value that crossed a wire passes when it
 * holds that shape, so accept its `workspace` only as the very instance your own registry holds
 * under that id.
 *
 * @param value - The unknown caller candidate, such as `ToolContext.caller`
 * @returns True if the value satisfies the caller contract; false otherwise
 *
 * @example
 * ```ts
 * isAgentCaller({ workspace: undefined, files: undefined }) // true
 * isAgentCaller({ workspace: 'returns' }) // false
 * ```
 */
export function isAgentCaller(value: unknown): value is AgentCaller {
	return holds(() => {
		if (!isRecord(value) || !matchesExactKeys(value, ['workspace', 'files'])) return false
		const workspace = value.workspace
		const files = value.files
		return (
			(workspace === undefined || isObject(workspace)) &&
			(files === undefined || arrayOf(isString)(files))
		)
	})
}
