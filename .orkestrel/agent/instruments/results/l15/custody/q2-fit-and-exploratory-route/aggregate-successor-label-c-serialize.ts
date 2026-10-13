import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { decisions } from './aggregate-successor-label-c-decisions.ts';
import type { Verdict } from './aggregate-successor-label-c-decisions.ts';
import { groups, hash, items } from './aggregate-successor-label-c-reader.ts';

interface Proposition {
  readonly text: string;
  readonly verdict: Verdict;
  readonly evidence: readonly string[];
}
interface Label {
  readonly id: string;
  readonly item: string;
  readonly verdict: Verdict;
  readonly propositions: readonly Proposition[];
}

function readRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Expected record');
  return Object.fromEntries(Object.entries(value));
}

function readString(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Expected string');
  return value;
}

function hashItem(item: unknown): string {
  return createHash('sha256').update(JSON.stringify(item)).digest('hex');
}

function readSources(item: Record<string, unknown>): readonly string[] {
  if (!Array.isArray(item.sources)) throw new Error('Expected sources');
  return item.sources.map(source => readString(readRecord(source).text));
}

function checkLabels(labels: readonly Label[]): void {
  if (labels.length !== items.length) throw new Error('Output count differs');
  if (new Set(labels.map(label => label.id)).size !== items.length) throw new Error('Output IDs duplicate');
  if (new Set(items.map(item => item.id)).size !== items.length) throw new Error('Input IDs duplicate');
  for (const [index, label] of labels.entries()) {
    const item = items[index];
    if (!item || label.id !== item.id || label.item !== hashItem(item)) throw new Error('ID/hash/order mismatch');
    if (!label.propositions.length) throw new Error('Empty propositions');
    const sources = readSources(item);
    for (const proposition of label.propositions) {
      if (!proposition.text || !proposition.evidence.length) throw new Error('Empty proposition/evidence');
      for (const quote of proposition.evidence) {
        if (!quote || !sources.some(source => source.includes(quote))) throw new Error('Nonliteral quotation');
      }
    }
    if (label.verdict === 'supported' && label.propositions.some(proposition => proposition.verdict !== 'supported')) throw new Error('Unsupported supported aggregation');
    if (label.verdict !== 'supported' && !label.propositions.some(proposition => proposition.verdict === label.verdict)) throw new Error('Verdict missing from propositions');
  }
}

function checkRefusal(labels: readonly Label[], name: string): string {
  try { checkLabels(labels); } catch { return `${name}: refused`; }
  throw new Error(`Negative control accepted: ${name}`);
}

const labelsById = new Map<string, Label>();
const entries = Array.from(groups.values());
if (decisions.length !== entries.length || new Set(decisions.map(decision => decision.group)).size !== entries.length) throw new Error('Decision coverage differs');
for (const decision of decisions) {
  const group = entries[decision.group];
  if (!group) throw new Error('Unknown decision group');
  for (const item of group) {
    const sources = readSources(item);
    const propositions = decision.propositions.map(proposition => ({
      text: proposition.text,
      verdict: proposition.verdict,
      evidence: proposition.sources.map(index => {
        const source = sources[index];
        if (source === undefined) throw new Error('Quotation index out of range');
        return source;
      }),
    }));
    const id = readString(item.id);
    if (labelsById.has(id)) throw new Error('Duplicate expansion ID');
    labelsById.set(id, { id, item: hashItem(item), verdict: decision.verdict, propositions });
  }
}
const labels = items.map(item => {
  const label = labelsById.get(readString(item.id));
  if (!label) throw new Error('Missing label');
  return label;
});
checkLabels(labels);
const first = labels[0];
if (!first) throw new Error('Missing first label');
const proposition = first.propositions[0];
if (!proposition) throw new Error('Missing first proposition');
const controls = [
  checkRefusal([{ ...first, id: 'outside-population-id' }, ...labels.slice(1)], 'altered ID'),
  checkRefusal([{ ...first, item: 'outside-population-hash' }, ...labels.slice(1)], 'altered item hash'),
  checkRefusal([{ ...first, propositions: [{ ...proposition, evidence: ['OUTSIDE_POPULATION_QUOTATION_CONTROL'] }] }, ...labels.slice(1)], 'invented quotation'),
  checkRefusal(labels.slice(1), 'omitted occurrence'),
];
const counts = { supported: 0, unsupported: 0, contradicted: 0, ambiguous: 0 };
const groupCounts = { supported: 0, unsupported: 0, contradicted: 0, ambiguous: 0 };
for (const label of labels) counts[label.verdict] += 1;
for (const decision of decisions) groupCounts[decision.verdict] += 1;
const root = 'C:/Users/mikes/WebstormProjects/scaffold/tmp/units/aggregate-successor-label-c';
const output = `${JSON.stringify(labels, null, 2)}\n`;
writeFileSync(`${root}.json`, output, 'utf8');
const reopened: unknown = JSON.parse(readFileSync(`${root}.json`, 'utf8'));
if (JSON.stringify(reopened) !== JSON.stringify(labels)) throw new Error('Serialized output differs');
const outputHash = createHash('sha256').update(readFileSync(`${root}.json`)).digest('hex');
const ambiguity = decisions.flatMap(decision => decision.propositions.filter(value => value.verdict === 'ambiguous').map(value => `- Group ${decision.group}, occurrences ${entries[decision.group]?.map(item => readString(item.id)).join(', ')}: ${value.text}`));
const identity = items.map(item => {
  if (!Array.isArray(item.components)) throw new Error('Expected components');
  return `| ${readString(item.id)} | ${readString(item.revision)} | ${item.components.map(value => readString(readRecord(value).id)).join(', ')} | ${hashItem(item)} |`;
});
const componentCount = items.reduce((count, item) => count + (Array.isArray(item.components) ? item.components.length : 0), 0);
const propositionCount = labels.reduce((count, label) => count + label.propositions.length, 0);
const quotationCount = labels.reduce((count, label) => count + label.propositions.reduce((total, value) => total + value.evidence.length, 0), 0);
const report = [
  '# Independent support labels: alias c',
  '',
  'The alias-c labels and their mechanical checks are closed. Root owns adjudication and acceptance. The semantic judgments use only the released packet and the supplied support criteria.',
  '',
  `Input: aggregate-successor-label-c-packet.jsonl; SHA256 ${hash}; 2,719,417 bytes; ${items.length} measured occurrences.`,
  `Output: aggregate-successor-label-c.json; SHA256 ${outputHash}; ${Buffer.byteLength(output)} bytes.`,
  '',
  `The serialization run measured ${groups.size} exact semantic groups, ${labels.length} labels, ${componentCount} input component identities, ${propositionCount} expanded propositions, and ${quotationCount} evidence quotations.`,
  `Occurrence verdict census: ${JSON.stringify(counts)}.`,
  `Semantic-group verdict census: ${JSON.stringify(groupCounts)}.`,
  '',
  'Grouping compares the exact JSON.stringify value of [candidate, question, state, sources] for every parsed item, without normalizing, sorting, truncating, or omitting source fields. Complete candidate and source arrays were read for every group. The reader checked that every state contains exactly evidence and candidate, that its evidence equals the full ordered source text with date/role framing, and that each component state carries the same evidence and candidate. Component focus spans were checked against the full candidate. The packet contains the same complete-question and focus-question templates read in the initial item; the measured distinct question census is 2.',
  '',
  'Judgments were authored manually by proposition in the alias-c decisions file. The serializer performs no semantic classification. It copies the manually selected verdict and exact source text to each occurrence only after exact group equality. Each output item hash is SHA256(JSON.stringify(parsedItem)) with original parsed property order, including revision and component structures. Output order is input order. The identity appendix preserves occurrence, revision, and component IDs explicitly.',
  '',
  'The check verified complete ordered ID/hash coverage, unique IDs, nonempty propositions and quotations, literal contiguous source quotation membership, and consistency between positive candidate verdicts and proposition verdicts. Output was read back and compared with the serialized labels. Negative controls outside the input population were rejected: ' + controls.join('; ') + '.',
  '',
  'No model call, external evidence, source/build/HEAD/Git operation, service operation, installation, cleanup, private mapping, score, or prior label was used. Writes are confined to the authorized alias-c outputs and their TypeScript reader/serialization files.',
  '',
  'The reasoning distinguishes source framing from event time, subject/topic labels from unproved speaker claims, instructions from completed actions, and later corrections from still-active facts. Repeated names and adjacent facts do not by themselves establish a causal connection. A source absent from a particular item is not imported from another group. Literal extraction is insufficient when the candidate changes a source date, leaves a superseded instruction active, or loses a material antecedent.',
  '',
  'Truncated numeric identifiers and terms were assessed as the literal asserted values: FL-66 differs from FL-660412, and net 3 differs from net 30. The isolated trailing date fragment in group 39 states no additional fact, so its otherwise supported assertions remain supported. In group 29 the supplied signer initial S is preserved, but the candidate changes tool attribution to user. The Tomasz and Sigrid topic labels in groups 2 and 8 copy the same third-person source construction and do not introduce a distinct speaker assertion.',
  '',
  'Material ambiguities remain for root adjudication:',
  '',
  ...ambiguity,
  '',
  'The following identity appendix is measured from the immutable packet and bound by the item hashes in the labels:',
  '',
  '| Occurrence ID | Revision | Component IDs | Item SHA256 |',
  '| --- | --- | --- | --- |',
  ...identity,
  '',
].join('\n');
writeFileSync(`${root}-report.md`, report, 'utf8');
const reportBytes = readFileSync(`${root}-report.md`);
console.log(JSON.stringify({ status: 'closed', input: hash, output: outputHash, report: createHash('sha256').update(reportBytes).digest('hex'), bytes: { output: Buffer.byteLength(output), report: reportBytes.length }, groups: groups.size, occurrences: items.length, components: componentCount, propositions: propositionCount, quotations: quotationCount, verdicts: counts, groupVerdicts: groupCounts, controls }, null, 2));
