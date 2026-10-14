import type {
	LoadHookContext,
	LoadFnOutput,
	ResolveHookContext,
	ResolveFnOutput,
} from 'node:module'
import type { ArtifactHookInput, ArtifactLoadHandler, ArtifactResolveHandler } from './types.ts'
import { RESOLUTION } from './constants.ts'

/** Adapts Node's hook initialization callback to the inventory controller.
 * @param input - Data supplied by node:module register.
 */
export function initialize(input: ArtifactHookInput): void {
	RESOLUTION.initialize(input)
}

/** Adapts Node's resolution callback to the inventory controller.
 * @param specifier - The requested import.
 * @param context - Node's resolution context.
 * @param next - The native resolution continuation.
 * @returns An admitted native resolution.
 */
export function resolve(
	specifier: string,
	context: ResolveHookContext,
	next: ArtifactResolveHandler,
): Promise<ResolveFnOutput> {
	return RESOLUTION.resolve(specifier, context, next)
}

/** Adapts Node's source callback to the inventory controller.
 * @param href - The resolved URL.
 * @param context - Node's load context.
 * @param next - The native load continuation.
 * @returns Captured bytes for admitted modules.
 */
export function load(
	href: string,
	context: LoadHookContext,
	next: ArtifactLoadHandler,
): Promise<LoadFnOutput> {
	return RESOLUTION.load(href, context, next)
}
