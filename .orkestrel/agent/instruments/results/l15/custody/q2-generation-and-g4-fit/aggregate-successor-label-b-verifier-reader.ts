import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { isRecord, isString, isArray } from '@orkestrel/contract';

const path = 'tmp/units/aggregate-successor-label-b-packet.jsonl';
const bytes = readFileSync(path);
const seal = createHash('sha256').update(bytes).digest('hex');
if (seal !== '64b0f89566458745c8099e9351db3b44686102145721ef9395bbd8e06e9d57f5' || bytes.length !== 3263411) throw Error('Seal mismatch');
export const items = bytes.toString('utf8').trim().split('\n').map(line => {
  const item: unknown = JSON.parse(line);
  if (!isRecord(item) || !isString(item.id) || !isString(item.revision) || !isString(item.candidate) || !isString(item.state) || !isRecord(item.question) || !isArray(item.components) || !isArray(item.sources)) throw Error('Item shape');
  const state: unknown = JSON.parse(item.state);
  if (!isRecord(state) || state.candidate !== item.candidate || !isArray(state.evidence)) throw Error('State shape');
  for (const [index, source] of item.sources.entries()) {
    if (!isRecord(source) || !isString(source.text) || !isString(source.id) || !isString(source.day) || !isString(source.role)) throw Error('Source shape');
    if (state.evidence[index] !== `(${source.day}) ${source.role}: ${source.text}`) throw Error('Evidence mismatch');
  }
  if (state.evidence.length !== item.sources.length) throw Error('Evidence size');
  for (const component of item.components) {
    if (!isRecord(component) || !isString(component.id) || !isString(component.state) || !isRecord(component.question)) throw Error('Component shape');
    const cs: unknown = JSON.parse(component.state);
    if (!isRecord(cs) || cs.candidate !== item.candidate || JSON.stringify(cs.evidence) !== JSON.stringify(state.evidence)) throw Error('Component state mismatch');
    if (component.focus !== undefined) {
      if (!isRecord(component.focus) || typeof component.focus.start !== 'number' || typeof component.focus.end !== 'number' || component.focus.text !== item.candidate.slice(component.focus.start, component.focus.end) || JSON.stringify(cs.focus) !== JSON.stringify(component.focus)) throw Error('Focus mismatch');
    }
  }
  return item;
});
if (items.length !== 179 || new Set(items.map(item => item.id)).size !== items.length) throw Error('Census mismatch');
export const groups = [...Map.groupBy(items, item => JSON.stringify({candidate:item.candidate,question:item.question,state:item.state,sources:item.sources})).values()];
export const sources = [...new Map(items.map(item => [JSON.stringify(item.sources), item.sources])).values()];
const mode = process.argv[2];
if (mode === 'census') console.log(JSON.stringify({seal, bytes:bytes.length,items:items.length,groups:groups.length,sources:sources.length,questions:new Set(items.map(item => JSON.stringify(item.question))).size,components:items.reduce((n,item)=>n+item.components.length,0)}));
if (mode === 'sources') for (const [index, source] of sources.entries()) console.log(JSON.stringify({source:index,entries:source}));
export const entries = [...new Map(sources.flat().map(source => [JSON.stringify(source), source])).values()];
if (mode === 'entries') for (const [index, entry] of entries.entries()) console.log(JSON.stringify({entry:index,value:entry}));
if (mode === 'sets') for (const [index, source] of sources.entries()) console.log(JSON.stringify({source:index,entries:source.map(entry=>entries.findIndex(value=>JSON.stringify(value)===JSON.stringify(entry)))}));
if (mode === 'groups') for (const [index, group] of groups.entries()) {
  if (index < Number(process.argv[3]) || index >= Number(process.argv[4])) continue;
  const item = group[0];
  if (!item) throw Error('Missing group');
  console.log(JSON.stringify({group:index,count:group.length,source:sources.findIndex(source=>JSON.stringify(source)===JSON.stringify(item.sources)),candidate:item.candidate}));
}
