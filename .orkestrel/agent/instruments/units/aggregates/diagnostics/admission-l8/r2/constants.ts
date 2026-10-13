import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Names the owned instrument directory. */
export const UNIT = dirname(fileURLToPath(import.meta.url))
/** Names the frozen specification. */
export const SPECIFICATION = resolve(UNIT, '../../../.orkestrel/agent/instruments/units/aggregates/admission-l8.json')
/** Binds the root-selected specification bytes. */
export const SPECIFICATION_HASH = '1559a844e9593577995c748fed379e3c8fd5b107446e7327d786001dec251828'
/** Names the accepted diagnostic packet. */
export const PREDECESSOR = resolve(UNIT, '../aggregate-judge-counterfactual/packet-final.json')
/** Binds the accepted diagnostic packet bytes. */
export const PREDECESSOR_HASH = '438710a277663ca0c28a2b6bf3f6c47b354312c12ddb02d0cd697a212499c11f'
/** Names the create-only prepared packet. */
export const PACKET = resolve(UNIT, 'packet-final.json')
/** Names the executable source population bound by the operator digest. */
export const OPERATOR_FILES = Object.freeze(['types.ts', 'constants.ts', 'helpers.ts', 'Operator.ts', 'main.ts', 'prepare.ts', 'offline.config.ts'])
/** Names emitted modules added to the predecessor runtime bindings. */
export const EMITTED_FILES = Object.freeze(['bench5/aggregates/helpers.js', 'bench5/aggregates/helpers.d.ts', 'bench5/aggregates/constants.js', 'bench5/aggregates/constants.d.ts', 'bench5/types.js', 'bench5/types.d.ts', 'vendor/agent-0.0.30-trimmed/index.js', 'vendor/agent-0.0.30-trimmed/index.d.ts'])
/** Names accepted instrument files imported at runtime. */
export const REUSED_FILES = Object.freeze(['types.ts', 'constants.ts', 'helpers.ts', 'Recorder.ts', 'Completion.ts', 'NetworkWitness.ts'])
/** Names the frozen forward and reverse request order. */
export const SEQUENCE = Object.freeze(['original', 'repair-removed', 'cause-removed', 'both-removed', 'both-removed', 'cause-removed', 'repair-removed', 'original'])
