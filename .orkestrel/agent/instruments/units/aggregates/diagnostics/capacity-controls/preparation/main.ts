import { Driver } from './Driver.ts'

process.exitCode = await new Driver().main(process.argv.slice(2))
