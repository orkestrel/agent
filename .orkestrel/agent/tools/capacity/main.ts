import { parseCapacityOptions } from './parsers.ts'
import { Qualifier } from './Qualifier.ts'

try {
	process.exitCode = await new Qualifier(parseCapacityOptions(process.argv.slice(2))).execute()
} catch (error) {
	process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
	process.exitCode = 3
}
