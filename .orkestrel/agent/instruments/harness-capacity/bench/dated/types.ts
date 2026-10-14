export interface DateEntry {
  readonly date: string
  readonly name: string
  readonly basis: 'run' | 'business' | 'calendar' | 'fixed'
  readonly anchor?: string
  readonly offset?: number
  readonly reason: string
}
export interface RenderOptions {
  readonly date: string
  readonly source: string
  readonly out: string
  readonly goals?: string
  readonly rules?: string
  readonly 'rules-out'?: string
}
