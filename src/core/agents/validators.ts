import type { AuthorityDecision, AuthorityVerdict } from './types.js'
import { isString, objectOf } from '@orkestrel/contract'

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
