import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import {
  buildMatrixBound,
  measureMatrixCosts,
  readAttempt,
  readExecution,
  readFrozen,
  readResource,
  verifyMatrixFeasibility,
} from '../../.orkestrel/agent/instruments/harness/.build/bench5/matrix/helpers.js';
import { hashFile } from '../../.orkestrel/agent/instruments/harness/.build/bench5/refit/helpers.js';
import type { MatrixBound, MatrixResource } from '../../.orkestrel/agent/instruments/harness/.build/bench5/matrix/types.js';

const frozenPath = resolve('.orkestrel/agent/instruments/results/l15/q4-think0/freeze/manifest.json');
const resourcePath = resolve('.orkestrel/agent/instruments/results/l15/q4-think0/resource/manifest.json');
const fullPath = resolve('.orkestrel/agent/instruments/results/l15/q4-think0/full/manifest.json');
const storedBoundPath = resolve('.orkestrel/agent/instruments/results/l15/q4-think0/full/bound.json');
const outputPath = resolve('tmp/units/aggregate-successor-q4-full-evidence.json');

const frozenReference = hashFile(frozenPath);
const frozen = readFrozen(frozenReference);
const recordsResourceReference = hashFile(resourcePath);
const recordsResource = readResource(recordsResourceReference, frozenReference);
if (!recordsResource.accepted || recordsResource.budget === undefined) {
  throw new Error('accepted records resource decision is unavailable');
}

const fullReference = hashFile(fullPath);
const full = readResource(fullReference, frozenReference) as MatrixResource & { readonly bound: MatrixBound };
if (!full.accepted || full.attempts.length !== 1 || full.budget === undefined) {
  throw new Error('full-view manifest is not one accepted attempt');
}

const sourceAttempt = recordsResource.attempts.at(-1);
const attempt = full.attempts[0];
if (sourceAttempt === undefined || attempt === undefined) {
  throw new Error('full-view source or attempt is absent');
}
const recordsRun = readAttempt(sourceAttempt);
const run = readAttempt(attempt);
if (recordsRun === undefined || run === undefined) {
  throw new Error('full-view or records run did not decode');
}
verifyMatrixFeasibility(run);
const execution = readExecution(attempt.execution.path);
if (execution.execution.phase !== 'full' || execution.execution.arm !== 'full') {
  throw new Error('attempt execution is not full-view development');
}
const recomputedBound = buildMatrixBound(recordsRun);
const storedBound = JSON.parse(readFileSync(storedBoundPath, 'utf8')) as MatrixBound;
if (!isDeepStrictEqual(storedBound, full.bound) || !isDeepStrictEqual(recomputedBound, full.bound)) {
  throw new Error('stored full-view empirical bound differs from emitted recomputation');
}

const costs = measureMatrixCosts(run);
const resourceRunHash = hashFile(resolve(recordsRun.path, 'run.json'));
const runHash = hashFile(resolve(run.path, 'run.json'));
const rowSuccesses = run.rows.filter((row) => row.success).length;
const rowFailures = run.rows.length - rowSuccesses;
const missingUsage = costs.wire.reduce((total, entry) => total + entry.missing, 0);
const report = {
  frozen: frozenReference,
  recordsResource: recordsResourceReference,
  full: fullReference,
  storedBound: hashFile(storedBoundPath),
  accepted: full.accepted,
  budget: full.budget,
  bound: full.bound,
  attempt: {
    accepted: attempt.accepted,
    resource: attempt.resource,
    failures: attempt.failures,
    budget: attempt.budget,
    execution: attempt.execution,
    run: {
      path: run.path,
      hash: runHash.hash,
      status: run.status,
      rows: run.rows.length,
      successes: rowSuccesses,
      failedRows: rowFailures,
      unattemptedRows: Math.max(0, full.bound.goals - run.rows.length),
      requests: run.requests.length,
      files: attempt.files,
    },
    recordsRun: {
      path: recordsRun.path,
      hash: resourceRunHash.hash,
      rows: recordsRun.rows.length,
      requests: recordsRun.requests.length,
    },
    costs,
    missingUsage,
    allUsageComplete: missingUsage === 0,
  },
  execution: execution.execution,
};

writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
process.stdout.write(`${outputPath}\n`);
