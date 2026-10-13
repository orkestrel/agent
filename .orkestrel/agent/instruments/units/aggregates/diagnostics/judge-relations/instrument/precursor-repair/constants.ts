import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const UNIT = dirname(fileURLToPath(import.meta.url))
export const ROOT = resolve(UNIT, '../../..')
export const HARNESS = resolve(ROOT, '.orkestrel/agent/instruments/harness')
export const GENERATION = resolve(ROOT, '.orkestrel/agent/instruments/results/l7/calibration/q2/generation')
export const LABELS = resolve(GENERATION, '../labels.json')
export const BUILD = resolve(HARNESS, '.build/build-manifest.json')
export const VENDOR = resolve(HARNESS, '.build/vendor/ollama/index.js')
export const PACKET = resolve(UNIT, 'packet-final.json')
export const CANDIDATE_ID = 'fbb56761-030c-4056-bee5-e1def8cc9aba'
export const PACKET_HASH = '64f575e39f5b1cae6237fedb67e3559103ee1bf535c2655fee610bda9094a67e'
export const LABELS_HASH = '4965e298d9bd345bbd0f86a418648a6767ccfb776f5d46b232d3defba070cb78'
export const BUILD_HASH = '09c7d936ffaec46ed9deb5bdd300deb0f9643ad639519762d8d84e38ef513ecf'
export const MANIFEST_HASH = '7cc0e6af513f8f9a65d0cdf35afa6b94b7ab350465328a95e380f42ac9b79216'
export const ATTEMPTS_HASH = '6258734af06361ee0337236311c04eb970f79e190ea103082dd8d5af6db66a8d'
export const EVIDENCE_HASH = '24fddf4bfc7d870a49395ad72b62d5bf8429ebb27e56d18e8f3d666fc1ba81b2'
export const REPAIR_TARGET = ", requiring an electrician's repair before replacement can proceed"
export const CAUSE_TARGET = ' due to Owen Pritchard'
export const CAUSE_REPLACEMENT = '; Owen Pritchard'
export const SOURCE_SEPARATOR = '\nSource messages:\n'
export const DAEMON = 'http://127.0.0.1:11434'
export const OPERATOR_FILES = Object.freeze(['types.ts', 'constants.ts', 'helpers.ts', 'Recorder.ts', 'Operator.ts', 'main.ts'])
export const VARIANT_EDITS = Object.freeze([
	Object.freeze({ name: 'original', repair: false, cause: false, expectation: 'unsupported' }),
	Object.freeze({ name: 'repair-removed', repair: true, cause: false, expectation: 'unsupported' }),
	Object.freeze({ name: 'cause-removed', repair: false, cause: true, expectation: 'unsupported' }),
	Object.freeze({ name: 'both-removed', repair: true, cause: true, expectation: 'supported' }),
])
export const SEQUENCE = Object.freeze(['original', 'repair-removed', 'cause-removed', 'both-removed', 'both-removed', 'cause-removed', 'repair-removed', 'original'])
