import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const root = '.orkestrel/agent/instruments/results/l7/q2-think0';
const run = join(root, 'full/preflight/l6-q2-think0-full-v1');
function readObject(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Expected object');
  return Object.fromEntries(Object.entries(value));
}
function readRows(name: string): readonly Record<string, unknown>[] {
  return readFileSync(join(run, name), 'utf8').split(/\r\n|\n/).filter(Boolean).map((line) => readObject(JSON.parse(line)));
}
const requests = readRows('requests.jsonl');
const calls = readRows('calls.jsonl');
let prompt = 0;
let completion = 0;
let maximum = 0;
const adjacent = [];
const categories = new Map<string, number>();
for (const request of requests) {
  const body = readObject(request.request);
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const responses = typeof request.response === 'string' ? request.response.split(/\r\n|\n/).filter(Boolean).map((line) => readObject(JSON.parse(line))) : [];
  const terminal = responses.at(-1) ?? {};
  if (typeof terminal.prompt_eval_count === 'number') { prompt += terminal.prompt_eval_count; maximum = Math.max(maximum, terminal.prompt_eval_count); }
  if (typeof terminal.eval_count === 'number') completion += terminal.eval_count;
  const category = `${request.status}:${request.role}`;
  categories.set(category, (categories.get(category) ?? 0) + 1);
  if (typeof request.sequence === 'number' && request.sequence >= 18 && request.sequence <= 23) {
    adjacent.push({ line: requests.indexOf(request) + 1, sequence: request.sequence, goal: request.goal, turn: request.turn, role: request.role, status: request.status, failures: request.failures, estimate: request.estimate, messageCount: messages.length, options: body.options, prompt: terminal.prompt_eval_count, completion: terminal.eval_count, reason: terminal.done_reason, done: terminal.done, error: terminal.error, call: calls.find((call) => call.sequence === request.sequence) });
  }
}
const selectedRows = readRows('rows.jsonl').filter((row) => row.goal === 'g05-luis-approval-note').map((row) => Object.fromEntries(Object.entries(row).filter(([key]) => ['resource', 'goal', 'usage', 'partial', 'faults', 'wall', 'error', 'stopped', 'first', 'last', 'overflow'].includes(key))));
const selectedTurns = readRows('turns.jsonl').filter((row) => row.goal === 'g05-luis-approval-note');
const failed = requests.find((request) => request.sequence === 20);
if (failed === undefined) throw new Error('Missing request');
const requestText = JSON.stringify(failed.request);
const responseText = typeof failed.response === 'string' ? failed.response : '';
const result = { totals: { requests: requests.length, calls: calls.length, rows: readRows('rows.jsonl').length, turns: readRows('turns.jsonl').length, prompt, completion, maximum, categories: Object.fromEntries(categories) }, adjacent, selectedRows, selectedTurns, identities: { requestBodySerializedSha256: createHash('sha256').update(requestText).digest('hex'), requestBodySerializedBytes: Buffer.byteLength(requestText), rawResponseSha256: createHash('sha256').update(responseText).digest('hex'), rawResponseBytes: Buffer.byteLength(responseText) } };
writeFileSync('tmp/units/aggregate-q2-full-failure/summary.json', JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(result, null, 2));
