import type { RouteInput } from '@orkestrel/router'
import type { ServerInterface } from '@orkestrel/server'
import { createDispatcher } from '@orkestrel/router'
import { createServer } from '@orkestrel/server'

/**
 * Creates a protocol fixture server bound to IPv4 loopback on an ephemeral port.
 *
 * @remarks
 * The caller owns start and stop. After start resolves, stop it in a finally block.
 * Each call creates its own dispatcher and listener; no process lifecycle hook is installed.
 *
 * @param routes - The real dispatcher routes served by this fixture
 * @returns An unstarted server whose caller owns cleanup
 * @example
 * ```ts
 * const server = createFixtureServer([{ method: 'POST', path: '/answer', handler: () => Response.json({ answer: 1 }) }])
 * const port = await server.start()
 * try { await fetch('http://127.0.0.1:' + port + '/answer', { method: 'POST' }) }
 * finally { await server.stop() }
 * ```
 */
export function createFixtureServer(routes: readonly RouteInput[]): ServerInterface<undefined> {
	return createServer({
		dispatcher: createDispatcher({ routes }),
		state: () => undefined,
		host: '127.0.0.1',
		port: 0,
	})
}

/**
 * Releases a parked scenario, stops a started fixture server, and times the stop.
 *
 * @remarks
 * The interval opens after `release` returns, so it measures what the server spends draining
 * the work the release unparked, never the release itself. The caller supplies the failure path:
 * stopping from a rejection handler runs the same cleanup before the error is rethrown.
 *
 * @param server - The started server to stop
 * @param release - Unparks the work the server is holding, such as a gate's `resolve`
 * @returns The milliseconds `server.stop()` took, read with `performance.now()`
 * @example
 * ```ts
 * const gate = Promise.withResolvers<void>()
 * const elapsed = await stopTimed(server, gate.resolve)
 * ```
 */
export async function stopTimed(
	server: ServerInterface<undefined>,
	release: () => void,
): Promise<number> {
	release()
	const closing = performance.now()
	await server.stop()
	return performance.now() - closing
}
