import { resolve } from 'node:path'

/** Names the frozen artifacts from the documented checkout-root test invocation. */
export const ENDURANCE_ROOT = resolve('.orkestrel/agent/instruments/units/aggregates/endurance')

/** Names the two disjoint frozen populations. */
export const ENDURANCE_CORPORA = Object.freeze(['evaluation', 'development'])
