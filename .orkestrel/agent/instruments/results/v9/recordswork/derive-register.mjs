// Preload: registers derive-hooks.mjs, which hands bench.mjs's Ledger internals to derive.mjs.
import { register } from 'node:module'
register(new URL('./derive-hooks.mjs', import.meta.url))
