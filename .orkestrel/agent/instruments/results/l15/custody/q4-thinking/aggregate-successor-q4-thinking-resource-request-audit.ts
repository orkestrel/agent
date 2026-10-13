import { resolve } from 'node:path'
import { hashFile } from '../../.orkestrel/agent/instruments/harness/.build/bench5/refit/helpers.js'
import { measureMatrixCosts, readAttempt, readFrozen, readResource } from '../../.orkestrel/agent/instruments/harness/.build/bench5/matrix/helpers.js'

const frozen = hashFile(resolve('.orkestrel/agent/instruments/results/l15/q4-think1/freeze/manifest.json'))
const resource = readResource(hashFile(resolve('.orkestrel/agent/instruments/results/l15/q4-think1/resource/manifest.json')), frozen)
const attempts = resource.attempts.map((attempt) => {
  const run = readAttempt(attempt)
  if (run === undefined) throw new Error(`No decoded raw request evidence for reserve ${attempt.budget.reserve}`)
  const costs = measureMatrixCosts(run)
  const sent = run.requests.filter((request) => request.sent)
  const failures = run.requests
    .filter((request) => request.error !== undefined || request.reason !== undefined)
    .map((request) => ({
      sequence: request.sequence,
      role: request.role,
      goal: request.goal,
      turn: request.turn,
      sent: request.sent,
      status: request.status,
      error: request.error,
      reason: request.reason,
      prompt: request.prompt,
      completion: request.completion,
      estimate: request.estimate,
      wall: request.wall
    }))
  return {
    reserve: attempt.budget.reserve,
    accepted: attempt.accepted,
    requestCount: run.requests.length,
    sentCount: sent.length,
    unsentCount: run.requests.length - sent.length,
    sentWithoutReportedPromptOrCompletion: sent.filter((request) => request.prompt === undefined || request.completion === undefined).length,
    failures,
    wire: costs.wire
  }
})
process.stdout.write(`${JSON.stringify({ attempts }, null, 2)}\n`)
