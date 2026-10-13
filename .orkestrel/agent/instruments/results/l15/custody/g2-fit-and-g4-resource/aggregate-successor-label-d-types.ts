export type Verdict = 'supported' | 'unsupported' | 'contradicted' | 'ambiguous';
export type Judgment = readonly [text: string, verdict: Verdict, sources: readonly number[]];
export interface Proposition {
  readonly text: string;
  readonly verdict: Verdict;
  readonly evidence: readonly string[];
}
export interface Label {
  readonly id: string;
  readonly item: string;
  readonly verdict: Verdict;
  readonly propositions: readonly Proposition[];
}
