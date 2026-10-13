import { Daemon } from './Daemon.ts'

process.exitCode = await new Daemon().main(process.argv.slice(2))
