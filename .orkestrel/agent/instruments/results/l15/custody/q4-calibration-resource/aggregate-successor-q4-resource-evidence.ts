import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  measureMatrixCosts,
  readAttempt,
  readFrozen,
  readResource,
} from '../../.orkestrel/agent/instruments/harness/.build/bench5/matrix/helpers.js';
import { hashFile } from '../../.orkestrel/agent/instruments/harness/.build/bench5/refit/helpers.js';

const frozenPath = resolve('.orkestrel/agent/instruments/results/l15/q4-think0/freeze/manifest.json');
const resourcePath = resolve('.orkestrel/agent/instruments/results/l15/q4-think0/resource/manifest.json');
const outputPath = resolve('tmp/units/aggregate-successor-q4-resource-evidence.json');
const frozenReference = hashFile(frozenPath);
const frozen = readFrozen(frozenReference);
const resource = readResource(hashFile(resourcePath), frozenReference);

const attempts = resource.attempts.map((attempt, index) => {
  const run = readAttempt(attempt);
  if (run === undefined) {
    throw new Error(`resource attempt ${index} has no decoded run`);
  }
  const costs = measureMatrixCosts(run);
  return {
    index,
    accepted: attempt.accepted,
    resource: attempt.resource,
    failures: attempt.failures,
    budget: attempt.budget,
    execution: attempt.execution,
    run: {
      path: run.path,
      hash: hashFile(resolve(run.path, 'run.json')).hash,
      status: run.status,
      rows: run.rows.length,
      requests: run.requests.length,
      files: attempt.files,
    },
    costs,
    allRoleUsageComplete: costs.wire.every((entry) => entry.missing === 0),
  };
});

const report = {
  frozen: frozenReference,
  deployment: frozen.deployment,
  resource: hashFile(resourcePath),
  accepted: resource.accepted,
  budget: resource.budget,
  attempts,
  allAttemptsUsageComplete: attempts.every((attempt) => attempt.allRoleUsageComplete),
};

writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
process.stdout.write(`${outputPath}\n`);
