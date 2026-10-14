import { join } from 'node:path'
import { HARNESS } from '../constants.js'

export const REFIT_GRID = Object.freeze(
	Array.from({ length: 50 }, (_unused, at) => (51 + at) / 100),
)
export const REFIT_LIMITATION =
	'Cold-build and lexical-retry candidates on copy-1 seed-only runtime projections. Later states do not reproduce diverged live histories. CHANGE 0.56 is retained; its old calibration does not certify repaired future summary states.'
export const REFIT_CONTROLS = join(HARNESS, '..', 'units', 'aggregates', 'reports', 'runtime-audit')
export const REFIT_CONTROL_HASHES = Object.freeze({
	'packet.jsonl': '2f7c267dc8ed24a6fc68adc7609bfe6637df34a30d1d7fd8eb8a2b5926bba45b',
	'mapping.jsonl': '8c935f627ff5f8dabc38c57398276ddf612738bea2e80545a2e3c8ab261228ac',
	'verdicts.json': '6b16ba75bf88184eec455c6af6cf405bd050ad289ddd2991c5a5c5a1e4704cf6',
	'adjudication.json': 'c7be44cbba2321b233a0bd30023a0eb150f2ae003bb43352473ab2e8d6b3033a',
})
export const REFIT_IMPLEMENTATION = Object.freeze([
	'bench5/refit.ts',
	'bench5/refit/Refit.ts',
	'bench5/refit/types.ts',
	'bench5/refit/index.ts',
	'bench5/refit/constants.ts',
	'bench5/refit/helpers.ts',
	'bench5/refit/validators.ts',
	'bench5/Driver.ts',
	'bench5/Mirror.ts',
	'bench5/helpers.ts',
	'bench5/types.ts',
	'bench5/constants.ts',
	'bench5/Summarizer.ts',
	'bench5/JudgeCache.ts',
	'bench5/aggregates/Aggregator.ts',
	'bench5/aggregates/Support.ts',
	'bench5/aggregates/validators.ts',
	'bench5/aggregates/helpers.ts',
	'bench5/aggregates/constants.ts',
	'bench5/calibrate.ts',
	'bench5/report.ts',
	'vendor/agent-0.0.30-trimmed/index.d.ts',
	'vendor/ollama/index.d.ts',
	'vendor/agent-0.0.30-trimmed/index.js',
	'vendor/ollama/index.js',
])
