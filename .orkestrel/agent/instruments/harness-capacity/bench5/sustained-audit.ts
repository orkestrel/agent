import { Audit } from './sustained/audit/Audit.js'

process.exitCode = Audit.execute(process.argv.slice(2))
