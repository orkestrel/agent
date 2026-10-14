import { Resolution } from './Resolution.ts'

/** Holds the inventory controller local to Node's asynchronous hook thread. */
export const RESOLUTION = Object.freeze(new Resolution())
