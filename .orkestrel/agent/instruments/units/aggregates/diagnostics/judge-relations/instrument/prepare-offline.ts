import { NetworkWitness } from './NetworkWitness.ts'

const witness = new NetworkWitness()
try {
	await import('./prepare.ts')
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error))
	process.exitCode = 1
} finally {
	console.log(`Observed native fetch dispatches during preparation: ${witness.count}`)
	witness.close()
}
