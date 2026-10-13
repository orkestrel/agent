import { NetworkWitness } from './NetworkWitness.ts'

const witness = new NetworkWitness()
try {
	await import('./main.ts')
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error))
	process.exitCode = 1
} finally {
	console.log(`Observed native fetch dispatches: ${witness.count}`)
	witness.close()
}
