import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

function readRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Expected record');
  return Object.fromEntries(Object.entries(value));
}

const path = 'C:/Users/mikes/WebstormProjects/scaffold/tmp/units/aggregate-successor-label-c-packet.jsonl';
const bytes = readFileSync(path);
export const hash = createHash('sha256').update(bytes).digest('hex');
if (hash !== 'a67c510650eaa2ffae29fe5c461fcf56d4cd91e9e3376a3ac4b5fba2b3c14999' || bytes.length !== 2719417) throw new Error('Packet seal mismatch');
export const items = bytes.toString('utf8').trim().split('\n').map(line => readRecord(JSON.parse(line)));
if (items.length !== 168) throw new Error('Census mismatch');
export const groups = new Map<string, Record<string, unknown>[]>();
const questions = new Set<string>();
for (const item of items) {
  if (typeof item.id !== 'string' || typeof item.candidate !== 'string' || typeof item.state !== 'string' || !Array.isArray(item.sources) || !Array.isArray(item.components)) throw new Error('Invalid item');
  const state = readRecord(JSON.parse(item.state));
  const sources = item.sources.map(source => readRecord(source));
  const evidence = sources.map(source => `(${source.day}) ${source.role}: ${source.text}`);
  if (JSON.stringify(Object.keys(state)) !== JSON.stringify(['evidence', 'candidate']) || state.candidate !== item.candidate || JSON.stringify(state.evidence) !== JSON.stringify(evidence)) throw new Error('State differs from source/candidate');
  questions.add(JSON.stringify(item.question));
  for (const componentValue of item.components) {
    const component = readRecord(componentValue);
    if (typeof component.state !== 'string') throw new Error('Invalid component state');
    const componentState = readRecord(JSON.parse(component.state));
    if (componentState.candidate !== item.candidate || JSON.stringify(componentState.evidence) !== JSON.stringify(evidence)) throw new Error('Component differs from source/candidate');
    questions.add(JSON.stringify(component.question));
    if (component.focus !== undefined) {
      const focus = readRecord(component.focus);
      if (typeof focus.start !== 'number' || typeof focus.end !== 'number' || item.candidate.slice(focus.start, focus.end) !== focus.text || JSON.stringify(componentState.focus) !== JSON.stringify(component.focus)) throw new Error('Focus differs');
    }
  }
  const key = JSON.stringify([item.candidate, item.question, item.state, item.sources]);
  const prior = groups.get(key) ?? [];
  prior.push(item);
  groups.set(key, prior);
}
const start = Number(process.argv[2] ?? 0);
const end = Number(process.argv[3] ?? 0);
const display = process.argv[1]?.endsWith('aggregate-successor-label-c-reader.ts');
if (display) console.log(JSON.stringify({ hash, bytes: bytes.length, count: items.length, groups: groups.size, sizes: Array.from(groups.values(), group => group.length), distinctQuestions: questions.size }));
if (display && start === end) for (const question of questions) console.log(question);
for (const [index, group] of Array.from(groups.values()).entries()) {
  if (!display || index < start || index >= end) continue;
  const item = group[0];
  if (!item) throw new Error('Empty group');
  console.log(JSON.stringify({ group: index, ids: group.map(entry => entry.id), candidate: item.candidate, sources: item.sources }, null, 2));
}
