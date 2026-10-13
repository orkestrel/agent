// Preload: registers the `.pre-fix` loader hook.
import { register } from 'node:module'
register(new URL('./hooks.mjs', import.meta.url))
