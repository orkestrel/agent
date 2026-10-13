// Preload: registers the in-memory mutation hook.
import { register } from 'node:module'
register(new URL('./mutate-hooks.mjs', import.meta.url))
