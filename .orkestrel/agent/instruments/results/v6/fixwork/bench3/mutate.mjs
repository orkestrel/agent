// Preload: registers the in-memory mutation hook for bench3/bench.mjs.
import { register } from 'node:module'
register(new URL('./mutate-hooks.mjs', import.meta.url))
