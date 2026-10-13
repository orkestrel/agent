// Usage: node bench5/continuous.ts freeze|run|series [arguments]. Exit 3 means a run ended at a retained design outcome; 1 means an invalid invocation, a custody refusal, or an operational fault.
import { Continuous } from './continuous/Continuous.js'
import { describeError } from './helpers.js'

try {
	process.exitCode = await Continuous.execute(process.argv.slice(2))
} catch (error) {
	process.stderr.write(`${describeError(error)}\n`)
	process.exitCode = 1
}
