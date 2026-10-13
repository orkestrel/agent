// Preload: registers serve-hooks.mjs, so `SERVE_FILE=PATH node --import ./use-file.mjs bench3/bench.mjs` runs PATH.
import { register } from 'node:module'
if (!process.env.SERVE_FILE) throw new Error('use-file: set SERVE_FILE')
register(new URL('./serve-hooks.mjs', import.meta.url))
