import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const root = '.orkestrel/agent/instruments/results/l7/q2-think0';
const run = join(root, 'full/preflight/l6-q2-think0-full-v1');
const output = 'tmp/units/aggregate-q2-full-failure';

function readObject(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Expected object');
  return Object.fromEntries(Object.entries(value));
}

function readRows(name: string): readonly Record<string, unknown>[] {
  return readFileSync(join(run, name), 'utf8').split(/\r\n|\n/).filter(Boolean).map((line) => readObject(JSON.parse(line)));
}

const requests = readRows('requests.jsonl');
const calls = readRows('calls.jsonl');
const rows = readRows('rows.jsonl');
const turns = readRows('turns.jsonl');
const result = {
  requests: requests.length,
  calls: calls.length,
  rows: rows.length,
  turns: turns.length,
  requestKeys: Object.keys(requests[19] ?? {}),
  callKeys: Object.keys(calls[19] ?? {}),
  rowKeys: Object.keys(rows[0] ?? {}),
  turnKeys: Object.keys(turns[0] ?? {}),
};
console.log(JSON.stringify(result, null, 2));
for (const name of ['requests.jsonl', 'calls.jsonl']) {
  const records = name === 'requests.jsonl' ? requests : calls;
  for (const index of [18, 19, 20]) {
    const text = JSON.stringify(records[index], null, 2) + '\n';
    writeFileSync(join(output, `${name}-${index + 1}.json`), text, { flag: 'wx' });
    console.log(`${name}:${index + 1} ${JSON.stringify(records[index]).length} chars extracted`);
  }
}
for (const name of ['run.json', 'rows.jsonl', 'selections.jsonl', 'requests.jsonl', 'turns.jsonl', 'calls.jsonl', 'messages.jsonl', 'judgments.jsonl', 'model-inventory.json']) {
  console.log(`${name} ${createHash('sha256').update(readFileSync(join(run, name))).digest('hex')}`);
}
