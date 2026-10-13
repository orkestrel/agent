import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Names the owned runtime directory. */
export const UNIT = dirname(fileURLToPath(import.meta.url))
/** Names the frozen input archive. */
export const ARCHIVE = resolve(UNIT, '../../../.orkestrel/agent/instruments/units/aggregates/diagnostics/focused-boundaries')
/** Names the immutable population. */
export const POPULATION = resolve(ARCHIVE, 'population.json')
/** Binds the accepted population bytes. */
export const POPULATION_HASH = '3fc3e23d91c095b5f7935aa40b18b62e62616c75819f6f270fad3b7a0da11309'
/** Names the root label map. */
export const LABELS = resolve(ARCHIVE, 'root-labels.json')
/** Binds the settled label bytes. */
export const LABELS_HASH = 'e8bf158894f791dda40ec239d7bf2d7d4fb764bf9fc82bd8644e5dda7fb0b23c'
/** Names the frozen composition specification. */
export const SPECIFICATION = resolve(ARCHIVE, 'screen.json')
/** Binds the frozen screen bytes. */
export const SPECIFICATION_HASH = 'd565a6ce3c26a73fa8c6f47edf2ee49f14312744f87462e3bd602a57f2e8f306'
/** Names the unchanged l8 admission packet. */
export const PREDECESSOR = resolve(UNIT, '../aggregate-admission-screen-r2/packet-final.json')
/** Binds the accepted l8 packet. */
export const PREDECESSOR_HASH = '5bcb670e5304dce5fd688500f1a8e62e1edbc01f14124513441ead0a51bb6470'
/** Names the accepted contextual packet. */
export const FOCUSED = resolve(UNIT, '../aggregate-focused-screen/packet-final.json')
/** Binds the accepted contextual packet. */
export const FOCUSED_HASH = '52aa96b66f45b9cad0275cd6db52e63f1a12ffb9f4b80e84132831f9f885cf11'
/** Names the create-only execution packet. */
export const PACKET = resolve(UNIT, 'prepared-final/packet-final.json')
/** Names every owned runtime source in operator custody. */
export const OPERATOR_FILES = Object.freeze(['types.ts', 'constants.ts', 'helpers.ts', 'validators.ts', 'Operator.ts', 'main.ts', 'prepare.ts', 'offline.config.ts'])
/** Names accepted source modules and their closed import dependencies. */
export const REUSED_FILES = Object.freeze([
	'../aggregate-judge-counterfactual/types.ts', '../aggregate-judge-counterfactual/constants.ts', '../aggregate-judge-counterfactual/helpers.ts', '../aggregate-judge-counterfactual/Recorder.ts', '../aggregate-judge-counterfactual/Completion.ts', '../aggregate-judge-counterfactual/NetworkWitness.ts',
	'../aggregate-focused-screen/types.ts', '../aggregate-focused-screen/constants.ts', '../aggregate-focused-screen/helpers.ts',
	'../aggregate-admission-screen-r2/types.ts', '../aggregate-admission-screen-r2/constants.ts', '../aggregate-admission-screen-r2/helpers.ts',
])
/** Names emitted source-renderer and partition dependencies added to custody. */
export const EMITTED_FILES = Object.freeze(['bench5/aggregates/helpers.js', 'bench5/aggregates/helpers.d.ts', 'bench5/aggregates/constants.js', 'bench5/aggregates/constants.d.ts', 'bench5/types.js', 'bench5/types.d.ts', 'vendor/agent-0.0.30-trimmed/index.js', 'vendor/agent-0.0.30-trimmed/index.d.ts'])
