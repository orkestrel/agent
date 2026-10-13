import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const path = 'C:/Users/mikes/WebstormProjects/scaffold/tmp/units/aggregate-successor-label-d-packet.jsonl';
const bytes = readFileSync(path);
const lines = bytes.toString('utf8').trim().split('\n');
export function readRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Expected object');
  return Object.fromEntries(Object.entries(value));
}
export function readText(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Expected string');
  return value;
}
export const items = lines.map((line) => readRecord(JSON.parse(line)));
const groups = new Map<string, { readonly item: Record<string, unknown>; readonly ids: string[] }>();
const questions = new Set<string>();
for (const item of items) {
  const state = readRecord(JSON.parse(readText(item.state)));
  if (state.candidate !== item.candidate || !Array.isArray(item.sources) || !Array.isArray(state.evidence) || !Array.isArray(item.components)) throw new Error('Bad structure');
  const sources = item.sources.map(readRecord);
  const evidence = sources.map((source) => `(${readText(source.day)}) ${readText(source.role)}: ${readText(source.text)}`);
  if (JSON.stringify(evidence) !== JSON.stringify(state.evidence)) throw new Error('Evidence mismatch');
  for (const raw of item.components) {
    const component = readRecord(raw);
    const componentState = readRecord(JSON.parse(readText(component.state)));
    if (componentState.candidate !== item.candidate || JSON.stringify(componentState.evidence) !== JSON.stringify(state.evidence)) throw new Error('Component mismatch');
    questions.add(JSON.stringify(component.question));
    if (component.focus !== undefined) {
      const focus = readRecord(component.focus);
      if (typeof focus.start !== 'number' || typeof focus.end !== 'number' || readText(item.candidate).slice(focus.start, focus.end) !== focus.text || JSON.stringify(componentState.focus) !== JSON.stringify(focus)) throw new Error('Focus mismatch');
    }
  }
  questions.add(JSON.stringify(item.question));
  const key = JSON.stringify({candidate:item.candidate,question:item.question,state:item.state,sources:item.sources});
  const group = groups.get(key);
  if (group) group.ids.push(readText(item.id));
  else groups.set(key, {item,ids:[readText(item.id)]});
}
export const entries = [...groups.values()];
if (process.argv[2] === 'census') {
  console.log(JSON.stringify({ bytes: bytes.length, hash: createHash('sha256').update(bytes).digest('hex'), occurrences: items.length, groups: entries.length, questions: [...questions].map((question) => JSON.parse(question)) }));
} else if (process.argv[2] !== undefined && process.argv[2] !== 'write' && process.argv[2] !== 'check') {
  const start = Number(process.argv[2] ?? 0);
  const end = Number(process.argv[3] ?? start + 10);
  for (const [index, entry] of entries.entries()) {
    if (index < start || index >= end) continue;
    console.log(JSON.stringify({group:index,ids:entry.ids,candidate:entry.item.candidate,sources:entry.item.sources}));
  }
}
