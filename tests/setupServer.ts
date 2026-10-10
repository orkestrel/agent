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
