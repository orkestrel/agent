import { readFileSync, appendFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { isRecord, isString, isArray } from '@orkestrel/contract';
import { items } from './aggregate-successor-label-a-reader.ts';

function checkLabels(value: unknown): number {
  if (!isArray(value) || value.length !== items.length) throw Error('Coverage');
  const ids = new Set<string>();
  let count = 0;
  for (const label of value) {
    if (!isRecord(label) || !isString(label.id) || !isString(label.item) || !isArray(label.propositions) || label.propositions.length===0) throw Error('Label schema');
    if (ids.has(label.id)) throw Error('Duplicate occurrence');
    ids.add(label.id);
    const item=items.find(item=>item.id===label.id);
    if (!item || createHash('sha256').update(JSON.stringify(item)).digest('hex')!==label.item) throw Error('Item hash');
    const verdicts=[];
    for (const proposition of label.propositions) {
      if (!isRecord(proposition) || !isString(proposition.text) || proposition.text.length===0 || !isString(proposition.verdict) || !['supported','unsupported','contradicted','ambiguous'].includes(proposition.verdict) || !isArray(proposition.evidence) || proposition.evidence.length===0) throw Error('Proposition schema');
      verdicts.push(proposition.verdict);
      for (const quote of proposition.evidence) {
        if (!isString(quote) || quote.length===0 || !item.sources.some(source=>isRecord(source)&&isString(source.text)&&source.text.includes(quote))) throw Error('Quotation');
      }
      count++;
    }
    const expected=verdicts.includes('contradicted')?'contradicted':verdicts.includes('unsupported')?'unsupported':verdicts.includes('ambiguous')?'ambiguous':'supported';
    if (label.verdict!==expected) throw Error('Verdict aggregation');
  }
  return count;
}
const path='tmp/units/aggregate-successor-label-a.json';
const raw=readFileSync(path);
const data:unknown=JSON.parse(raw.toString('utf8'));
const propositions=checkLabels(data);
if (!isArray(data)) throw Error('Array');
const first=data[0];
if (!isRecord(first) || !isArray(first.propositions)) throw Error('First');
const proposition=first.propositions[0];
if (!isRecord(proposition)) throw Error('Proposition');
const controls=[
  {name:'missing occurrence',value:data.slice(1)},
  {name:'wrong item hash',value:[{...first,item:'0'.repeat(64)},...data.slice(1)]},
  {name:'non-source quotation',value:[{...first,propositions:[{...proposition,evidence:['CONTROL: an assertion absent from every supplied source.']},...first.propositions.slice(1)]},...data.slice(1)]},
  {name:'incorrect verdict aggregation',value:[{...first,verdict:'unsupported'},...data.slice(1)]},
];
const rejected=[];
for (const control of controls) {
  let failed=false;
  try { checkLabels(control.value); } catch { failed=true; }
  if (!failed) throw Error(`Control unexpectedly passed: ${control.name}`);
  rejected.push(control.name);
}
const summary={occurrences:data.length,propositions,sha256:createHash('sha256').update(raw).digest('hex'),rejected};
appendFileSync('tmp/units/aggregate-successor-label-a-report.md',`\n## Completed verification\n\nThe separate read-only checker ran against the emitted JSON array and passed coverage, schema, exact item hashing, source-local literal quotations, and verdict aggregation for ${data.length} occurrences and ${propositions} propositions. In-memory negative controls were rejected for: ${rejected.join('; ')}. The controls did not alter the packet or labels. These checks establish serialization and evidence-reference integrity, not an automated semantic verdict.\n\nCommands: \`node tmp/units/aggregate-successor-label-a-reader.ts census\`, \`node tmp/units/aggregate-successor-label-a-labels.ts\`, and \`node tmp/units/aggregate-successor-label-a-check.ts\`. Each completed with exit code 0. Output SHA-256 read by the independent checker: ${summary.sha256}.\n`);
console.log(JSON.stringify(summary));
