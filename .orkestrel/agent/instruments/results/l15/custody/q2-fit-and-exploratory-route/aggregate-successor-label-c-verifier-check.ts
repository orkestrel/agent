import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { isRecord, isString, isArray } from '@orkestrel/contract';
import { items } from './aggregate-successor-label-c-verifier-reader.ts';

const seals = {
  packet: 'a67c510650eaa2ffae29fe5c461fcf56d4cd91e9e3376a3ac4b5fba2b3c14999',
  labels: '0fd4b82e90bf22f7abf661c6c13465481c68c8df7a2bf9c6666614196c82e394',
  report: '67195a66780cf92488fc2159efa141aecee59932263ed900e2769243c9732168',
};
const path='tmp/units/aggregate-successor-label-c.json';
const packet = readFileSync('tmp/units/aggregate-successor-label-c-packet.jsonl');
const labelBytes = readFileSync(path);
const report = readFileSync('tmp/units/aggregate-successor-label-c-report.md');
const hash = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex');
if (hash(packet) !== seals.packet) throw Error('Packet seal');
if (hash(labelBytes) !== seals.labels) throw Error('Label seal');
if (hash(report) !== seals.report) throw Error('Auditor report seal');

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
const raw=labelBytes;
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
console.log(JSON.stringify(summary));
