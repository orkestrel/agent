import { resolve } from 'node:path'
import { hashFile } from '../../.orkestrel/agent/instruments/harness/.build/bench5/refit/helpers.js'
import { measureMatrixCosts, readAttempt, readFrozen, readResource } from '../../.orkestrel/agent/instruments/harness/.build/bench5/matrix/helpers.js'

const frozen = hashFile(resolve('.orkestrel/agent/instruments/results/l15/g4-think0/freeze/manifest.json'))
const manifest = hashFile(resolve('.orkestrel/agent/instruments/results/l15/g4-think0/resource/manifest.json'))
const resource = readResource(manifest, frozen)
const attempts = resource.attempts.map((attempt) => {
  const run = readAttempt(attempt)
  if (run === undefined) {
    return {
      reserve: attempt.budget.reserve,
      window: attempt.budget.window,
      ceiling: attempt.budget.ceiling,
      predict: attempt.budget.predict,
      accepted: attempt.accepted,
      resource: attempt.resource,
      failures: attempt.failures,
      cost: undefined
    }
  }
  const cost = measureMatrixCosts(run)
  return {
    reserve: attempt.budget.reserve,
    window: attempt.budget.window,
    ceiling: attempt.budget.ceiling,
    predict: attempt.budget.predict,
    accepted: attempt.accepted,
    resource: attempt.resource,
    failures: attempt.failures,
    cost: {
      metadata: cost.metadata,
      wire: cost.wire,
      stage: cost.stage,
      flush: cost.flush
    }
  }
})
process.stdout.write(`${JSON.stringify({ frozen, manifest, accepted: resource.accepted, budget: resource.budget, attempts }, null, 2)}\n`)
