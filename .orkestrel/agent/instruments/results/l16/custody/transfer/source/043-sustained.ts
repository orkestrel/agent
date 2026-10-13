import { Sustained } from './sustained/Sustained.js'

process.exitCode = await Sustained.execute(process.argv.slice(2))
