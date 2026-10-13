import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  readFrozen,
  readResource,
} from '../../.orkestrel/agent/instruments/harness/.build/bench5/matrix/helpers.js';
import {
  hashFile,
  readRefitAssessment,
} from '../../.orkestrel/agent/instruments/harness/.build/bench5/refit/helpers.js';

const frozenReference = hashFile(resolve('.orkestrel/agent/instruments/results/l15/q4-think0/freeze/manifest.json'));
const frozen = readFrozen(frozenReference);
const resourceReference = hashFile(resolve('.orkestrel/agent/instruments/results/l15/q4-think0/resource/manifest.json'));
const resource = readResource(resourceReference, frozenReference);
const fitPath = resolve('.orkestrel/agent/instruments/results/l15/calibration/q4/fit/fit.json');
const fitReference = hashFile(fitPath);
const assessmentReference = hashFile(resolve('.orkestrel/agent/instruments/results/l15/calibration/q4/fit/diagnosis.json'));
const assessment = readRefitAssessment(assessmentReference);

if (!resource.accepted || resource.budget === undefined || !assessment.accepted || assessment.cutoff !== 0.61 || assessment.change !== 0.56) {
  throw new Error('released records resource or strict fit assessment differs');
}

const output = {
  frozen: frozenReference,
  deployment: frozen.deployment,
  resource: resourceReference,
  resourceAccepted: resource.accepted,
  resourceBudget: resource.budget,
  fit: fitReference,
  assessment: assessmentReference,
  fitAccepted: assessment.accepted,
  agree: assessment.cutoff,
  change: assessment.change,
};
const outputPath = resolve('tmp/units/aggregate-successor-q4-pilot-preflight.json');
writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
process.stdout.write(`${outputPath}\n`);
