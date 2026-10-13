import { it } from 'node:test'
import { ContextProof } from './context/ContextProof.js'

it('preserves full initial, tool, and real recovery wire history, exact pricing, unsent turns, and paired reserve plans with failing scope-only and capacity controls', async () => {
	await new ContextProof().execute()
})
