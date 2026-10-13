// Preload: registers hooks.mjs alone, so bench.mjs.pre-refine runs beside scenario.json.pre-refine with no fetch stub.
import { register } from 'node:module'
register(new URL('./hooks.mjs', import.meta.url))
