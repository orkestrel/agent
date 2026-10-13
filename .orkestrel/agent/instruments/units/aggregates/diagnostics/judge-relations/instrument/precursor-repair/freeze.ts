import { resolve } from 'node:path'
import { UNIT } from './constants.ts'
import { computeOperator, readJSON, readObject, writeArtifact } from './helpers.ts'

writeArtifact(resolve(UNIT, 'plan-ready.json'), { ...readObject(readJSON(resolve(UNIT, 'plan-final.json'))), operator: computeOperator(), frozen: new Date().toISOString(), supersedes: 'plan-final.json operator digest; packet and execution sequence unchanged' })
