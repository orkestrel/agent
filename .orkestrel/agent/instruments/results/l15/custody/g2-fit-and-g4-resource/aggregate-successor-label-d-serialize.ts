import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { entries, items, readRecord, readText } from './aggregate-successor-label-d-reader.ts';
import { judgments } from './aggregate-successor-label-d-judgments.ts';
import type { Label, Verdict } from './aggregate-successor-label-d-types.ts';

const prefix = 'C:/Users/mikes/WebstormProjects/scaffold/tmp/units/aggregate-successor-label-d';
const input = readFileSync(`${prefix}-packet.jsonl`);
const hash = createHash('sha256').update(input).digest('hex');
if (hash !== '9ae5f8622b50bfd09672c243499fccf01b775451cba03671a33c46755025cb2d' || input.length !== 3208183 || items.length !== 174) throw new Error('Released packet mismatch');
if (entries.length !== 45 || judgments.length !== entries.length) throw new Error('Judgment census mismatch');
const labels = new Map<string, Label>();
const groupcounts: Record<Verdict, number> = { supported: 0, unsupported: 0, contradicted: 0, ambiguous: 0 };
const counts: Record<Verdict, number> = { supported: 0, unsupported: 0, contradicted: 0, ambiguous: 0 };
const catalog: string[] = [];
const ambiguity: string[] = [];
let quotations = 0;
let components = 0;
for (const [index, entry] of entries.entries()) {
  const judgment = judgments[index];
  if (judgment === undefined || judgment.length === 0 || !Array.isArray(entry.item.sources)) throw new Error('Missing group');
  const sources = entry.item.sources.map(readRecord);
  const propositions = judgment.map(([text, verdict, references]) => ({
    text,
    verdict,
    evidence: references.map((reference) => {
      const source = sources[reference];
      if (source === undefined) throw new Error(`Missing source ${reference} for group ${index}`);
      return readText(source.text);
    }),
  }));
  let verdict: Verdict = 'supported';
  if (propositions.some((proposition) => proposition.verdict === 'contradicted')) verdict = 'contradicted';
  else if (propositions.some((proposition) => proposition.verdict === 'unsupported')) verdict = 'unsupported';
  else if (propositions.some((proposition) => proposition.verdict === 'ambiguous')) verdict = 'ambiguous';
  groupcounts[verdict]++;
  for (const proposition of propositions) {
    if (proposition.verdict === 'ambiguous') ambiguity.push(`- Group ${index}, occurrences ${entry.ids.join(', ')}: ${proposition.text}`);
  }
  for (const id of entry.ids) {
    const item = items.find((candidate) => candidate.id === id);
    if (item === undefined || labels.has(id) || !Array.isArray(item.components)) throw new Error('Duplicate or absent occurrence');
    const digest = createHash('sha256').update(JSON.stringify(item)).digest('hex');
    labels.set(id, { id, item: digest, verdict, propositions });
    counts[verdict]++;
    quotations += propositions.reduce((sum, proposition) => sum + proposition.evidence.length, 0);
    const identities = item.components.map((component) => readText(readRecord(component).id));
    components += identities.length;
    catalog.push(`| ${id} | ${readText(item.revision)} | ${index} | ${verdict} | ${identities.join(', ')} |`);
  }
}
const output = items.map((item) => {
  const label = labels.get(readText(item.id));
  if (label === undefined) throw new Error('Output coverage gap');
  return label;
});
function validateLabels(value: unknown): void {
  if (!Array.isArray(value) || value.length !== items.length) throw new Error('Output census mismatch');
  const ids = new Set<string>();
  for (const raw of value) {
    const label = readRecord(raw);
    const id = readText(label.id);
    const item = items.find((candidate) => candidate.id === id);
    if (item === undefined || ids.has(id) || !Array.isArray(item.sources)) throw new Error('ID bijection failure');
    ids.add(id);
    if (label.item !== createHash('sha256').update(JSON.stringify(item)).digest('hex')) throw new Error('Item hash mismatch');
    if (!['supported', 'unsupported', 'contradicted', 'ambiguous'].includes(readText(label.verdict)) || !Array.isArray(label.propositions) || label.propositions.length === 0) throw new Error('Invalid label shape');
    const sourceTexts = item.sources.map((source) => readText(readRecord(source).text));
    const statuses: string[] = [];
    for (const rawProposition of label.propositions) {
      const proposition = readRecord(rawProposition);
      if (readText(proposition.text).length === 0 || !['supported', 'unsupported', 'contradicted', 'ambiguous'].includes(readText(proposition.verdict)) || !Array.isArray(proposition.evidence) || proposition.evidence.length === 0) throw new Error('Invalid proposition');
      statuses.push(readText(proposition.verdict));
      for (const rawQuote of proposition.evidence) {
        const quote = readText(rawQuote);
        if (quote.length === 0 || !sourceTexts.some((source) => source.includes(quote))) throw new Error('Nonliteral quotation');
      }
    }
    const expected = statuses.includes('contradicted') ? 'contradicted' : statuses.includes('unsupported') ? 'unsupported' : statuses.includes('ambiguous') ? 'ambiguous' : 'supported';
    if (label.verdict !== expected) throw new Error('Inconsistent aggregate');
  }
}
validateLabels(output);
let controls = 0;
const first = output[0];
if (first === undefined) throw new Error('Missing control base');
for (const altered of [
  [ ...output.slice(1) ],
  [ { ...first, id: 'absent-control' }, ...output.slice(1) ],
  [ { ...first, item: 'invalid-control' }, ...output.slice(1) ],
  [ { ...first, propositions: [{ text: 'Negative quotation control', verdict: 'contradicted', evidence: ['not a source quotation [control]'] }] }, ...output.slice(1) ],
]) {
  try { validateLabels(altered); } catch { controls++; }
}
if (controls !== 4) throw new Error('Validation negative control escaped');
const text = `${JSON.stringify(output, null, 2)}\n`;
const digest = createHash('sha256').update(text).digest('hex');
const report = `Independent support labeling is complete for the released packet. Root owns adjudication and acceptance.\n\nThe packet run measured 174 occurrences, 45 exact semantic groups, and ${components} component identities. Each complete candidate and its complete supplied sources were read. Candidate truncation was treated as a property of that candidate, not as an incomplete packet.\n\nInput: aggregate-successor-label-d-packet.jsonl; ${input.length} bytes; SHA256 ${hash}.\nOutput: aggregate-successor-label-d.json; ${Buffer.byteLength(text)} bytes; SHA256 ${digest}.\n\nThe exact grouping key is JSON.stringify({candidate: item.candidate, question: item.question, state: item.state, sources: item.sources}). Equality includes the raw state string, complete candidate, complete question, and all source fields in original parsed order. A different evidence slice remains a different group even when candidate text matches. Component candidate/evidence equality and focus-span consistency were checked against each occurrence. The grouped analysis was expanded to every original occurrence ID. Each item field is SHA256(JSON.stringify(parsedItem)), preserving original property order. The identity table retains revision and component identities without changing the required output schema.\n\nThe serialization run measured these occurrence verdict counts: ${JSON.stringify(counts)}. Group verdict counts: ${JSON.stringify(groupcounts)}. No semantic verdict was inferred by pattern matching or a previous label. The helper serializes manually authored proposition judgments and derives only their aggregate verdict.\n\nValidation closed ID/hash bijection, nonempty propositions, permitted verdicts, aggregate consistency, and ${quotations} literal source-quotation occurrences. The check reads the written JSON again. Negative controls for missing occurrence, unknown ID, wrong item hash, and nonliteral quotation were rejected (${controls} controls). This validates artifact integrity, not semantic truth.\n\nRun the owned checker with: node tmp/units/aggregate-successor-label-d-serialize.ts check.\n\nSemantic treatment: later explicit address corrections and delivery/resolution govern the facts they change. A source date prefix alone does not designate an obsolete value as inactive. A later delivery statement inside a candidate can make its earlier late status historical. Attributed customer reports remain attributed; requests and conditional plans remain uncompleted. Alias resolution uses only the supplied sources. A bounded delegation to Ruth remains bounded; after its stated endpoint the original Marcus requirement is not treated as permanently erased. In the group ending on 2026-10-09, the active exception makes an unqualified Marcus requirement conflict.\n\nThe source framing omitted from undated today clauses is materially unresolved. Explicit date prefixes or tomorrow paired with a full date retain the frame. Complete year-month delivery value 2026-10 is entailed by source date 2026-10-09 (group 38); a dangling separator, partial year, clause, or lookup is routed as ambiguous where it leaves meaning unresolved. Missing final punctuation and omission after a complete Gold-tier assertion are not defects. Group 19 presents shortened pro number FL-6604 as the visible identifier and is contradicted by FL-660412; its candidate-end placement could alternatively be treated as a truncation ambiguity without removing the separate stale-status conflict.\n\nThe fragment cases deserve root adjudication: a nonassertive trailing token might be ruled an omission instead of unresolved assertion. They were not labeled unsupported merely for omitting an unrelated fact. Their supported propositions remain separately recorded. The following ambiguity inventory includes ambiguities inside otherwise contradicted candidates.\n\n${ambiguity.join('\n')}\n\nThe following identity ledger is measured from the same sealed packet.\n\n| Occurrence | Revision | Semantic group | Verdict | Component identities |\n| --- | --- | --- | --- | --- |\n${catalog.join('\n')}\n`;
if (process.argv[2] === 'write') {
  writeFileSync(`${prefix}.json`, text);
  writeFileSync(`${prefix}-report.md`, report);
}
const written = readFileSync(`${prefix}.json`);
validateLabels(JSON.parse(written.toString('utf8')));
if (createHash('sha256').update(written).digest('hex') !== digest) throw new Error('Written output differs from judgments');
console.log(JSON.stringify({ input:hash, output:digest, bytes:written.length, occurrences:output.length, groups:entries.length, components, counts, groupcounts, quotations, controls, validated:true }));
