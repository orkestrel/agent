import { existsSync, writeFileSync } from 'node:fs'
import { isRecord } from '@orkestrel/contract'
import { readJSON, readRows } from '../../.orkestrel/agent/instruments/harness/.build/bench5/helpers.js'
import { hashFile, readRefitAssessment, readRefitCosts, selectMajorityCutoff } from '../../.orkestrel/agent/instruments/harness/.build/bench5/refit/helpers.js'
import { isRefitAttempt, isRefitGeneration } from '../../.orkestrel/agent/instruments/harness/.build/bench5/refit/validators.js'

const diagnosisPath = '.orkestrel/agent/instruments/results/l15/calibration/g2/fit/diagnosis.json'
const fitPath = '.orkestrel/agent/instruments/results/l15/calibration/g2/fit/fit.json'
const attemptsPath = '.orkestrel/agent/instruments/results/l15/calibration/g2/generation/attempts.jsonl'
const manifestPath = '.orkestrel/agent/instruments/results/l15/calibration/g2/generation/manifest.json'
const assessment = readRefitAssessment(hashFile(diagnosisPath))
const attemptRows = readRows(attemptsPath)
const attempts = attemptRows.filter(isRefitAttempt)
if (attemptRows.length !== attempts.length) throw new Error('attempt rows failed emitted validator')
const manifestValue = readJSON(manifestPath)
if (!isRefitGeneration(manifestValue)) throw new Error('generation manifest failed emitted validator')
const costs = readRefitCosts(attempts, manifestValue)
const fitExists = existsSync(fitPath)
let fitAgrees: boolean | undefined
if (assessment.accepted !== fitExists) throw new Error('fit artifact presence does not agree with diagnosis')
if (fitExists) {
  const fitValue = readJSON(fitPath)
  if (!isRecord(fitValue)) throw new Error('fit artifact is not an object')
  fitAgrees = fitValue.agree === assessment.cutoff && fitValue.separated === assessment.accepted
  if (!fitAgrees) throw new Error('fit artifact does not agree with recomputed diagnosis')
}
const lexicalFailures = assessment.readings.filter((reading) => reading.generated && !reading.lexical).length
const missingScores = assessment.readings.filter((reading) => reading.generated && reading.lexical && reading.score === undefined).length
const result = {
  validated: true,
  fit: { present: fitExists, agrees: fitAgrees },
  diagnosis: {
    accepted: assessment.accepted,
    strictCutoff: assessment.cutoff,
    exploratoryCutoff: selectMajorityCutoff(assessment),
    reasons: assessment.reasons,
    errors: assessment.errors,
    occurrences: assessment.occurrences,
    distinct: assessment.distinct,
    lexicalFailures,
    missingScores
  },
  cost: costs,
  rowCounts: { attemptRows: attemptRows.length, validAttempts: attempts.length, readings: assessment.readings.length },
  hashes: {
    diagnosis: hashFile(diagnosisPath).hash,
    ...(fitExists ? { fit: hashFile(fitPath).hash } : {}),
    controls: hashFile('.orkestrel/agent/instruments/results/l15/calibration/g2/fit/controls.json').hash,
    generationManifest: hashFile(manifestPath).hash,
    attempts: hashFile(attemptsPath).hash
  }
}
writeFileSync('C:/Users/mikes/WebstormProjects/scaffold/tmp/units/aggregate-successor-g2-fit-validation.json', `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' })
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)