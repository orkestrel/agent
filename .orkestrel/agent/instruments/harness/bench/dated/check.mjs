import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, relative } from 'node:path';
import { test } from 'node:test';

const ROOT = join(import.meta.dirname, '..', '..');
const BENCH = join(ROOT, 'bench');
const RULES = join(BENCH, 'u2', 'rules.json');
const RENDER = join(BENCH, 'dated', 'render.mjs');
export const SOURCES = [join(BENCH, 'scenario.json'), ...['variants', 'variants/ledger'].flatMap(folder => Array.from({ length: 8 }, (_, index) => join(BENCH, folder, `v${index + 1}.json`))), RULES];
export const FIXTURES = [
  { run: '2027-01-04', ship: '2027-01-01', off: '2027-01-05', estimate: '2027-01-06', forms: ['2027-01-06', 'January 6', 'Jan 6', 'Jan. 6', '6 Jan', '6th of January', '01/06', '1/6/27', '06/01/2027', 'January sixth', 'sixth of January', 'January six'] },
  { run: '2027-01-05', ship: '2027-01-04', off: '2027-01-06', estimate: '2027-01-07', forms: ['2027-01-07', 'January 7', 'Jan 7', 'Jan. 7', '7 Jan', '7th of January', '01/07', '1/7/27', '07/01/2027', 'January seventh', 'seventh of January', 'January seven'] },
  { run: '2027-01-06', ship: '2027-01-05', off: '2027-01-07', estimate: '2027-01-08', forms: ['2027-01-08', 'January 8', 'Jan 8', 'Jan. 8', '8 Jan', '8th of January', '01/08', '1/8/27', '08/01/2027', 'January eighth', 'eighth of January', 'January eight'] },
  { run: '2027-01-07', ship: '2027-01-06', off: '2027-01-08', estimate: '2027-01-11', forms: ['2027-01-11', 'January 11', 'Jan 11', 'Jan. 11', '11 Jan', '11th of January', '01/11', '1/11/27', '11/01/2027', 'January eleventh', 'eleventh of January', 'January eleven'] },
  { run: '2027-01-08', ship: '2027-01-07', off: '2027-01-11', estimate: '2027-01-12', forms: ['2027-01-12', 'January 12', 'Jan 12', 'Jan. 12', '12 Jan', '12th of January', '01/12', '1/12/27', '12/01/2027', 'January twelfth', 'twelfth of January', 'January twelve'] },
  { run: '2027-01-09', ship: '2027-01-08', off: '2027-01-11', estimate: '2027-01-12', forms: ['2027-01-12', 'January 12', 'Jan 12', 'Jan. 12', '12 Jan', '12th of January', '01/12', '1/12/27', '12/01/2027', 'January twelfth', 'twelfth of January', 'January twelve'] },
  { run: '2027-01-10', ship: '2027-01-08', off: '2027-01-11', estimate: '2027-01-12', forms: ['2027-01-12', 'January 12', 'Jan 12', 'Jan. 12', '12 Jan', '12th of January', '01/12', '1/12/27', '12/01/2027', 'January twelfth', 'twelfth of January', 'January twelve'] },
  { run: '2027-01-31', ship: '2027-01-29', off: '2027-02-01', estimate: '2027-02-02', forms: ['2027-02-02', 'February 2', 'Feb 2', 'Feb. 2', '2 Feb', '2nd of February', '02/02', '2/2/27', '02/02/2027', 'February second', 'second of February', 'February two'] },
  { run: '2027-12-31', ship: '2027-12-30', off: '2028-01-03', estimate: '2028-01-04', forms: ['2028-01-04', 'January 4', 'Jan 4', 'Jan. 4', '4 Jan', '4th of January', '01/04', '1/4/28', '04/01/2028', 'January fourth', 'fourth of January', 'January four'] },
  { run: '2028-02-29', ship: '2028-02-28', off: '2028-03-01', estimate: '2028-03-02', forms: ['2028-03-02', 'March 2', 'Mar 2', 'Mar. 2', '2 Mar', '2nd of March', '03/02', '3/2/28', '02/03/2028', 'March second', 'second of March', 'March two'] },
  { run: '2026-10-09', ship: '2026-10-08', off: '2026-10-12', estimate: '2026-10-13', forms: ['2026-10-13', 'October 13', 'Oct 13', 'Oct. 13', '13 Oct', '13th of October', '10/13', '10/13/26', '13/10/2026', 'October thirteenth', 'thirteenth of October', 'October thirteen'] },
];
export function readJSON(file) { return JSON.parse(readFileSync(file, 'utf8')); }
export function collectStrings(value, path = '') {
  if (typeof value === 'string') return [[path, value]];
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, child]) => collectStrings(child, `${path}/${key}`));
}
export function compareStructure(source, rendered, path = '') {
  assert.equal(typeof rendered, typeof source, path);
  if (typeof source === 'string') {
    if (source !== rendered) assert.match(source, /\d{4}[-[/]|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|today|tomorrow|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\w*|\d{1,2}\/\d{1,2}/i, path);
  } else if (source && typeof source === 'object') {
    assert.deepEqual(Object.keys(rendered), Object.keys(source), path);
    for (const key of Object.keys(source)) compareStructure(source[key], rendered[key], `${path}/${key}`);
  } else assert.equal(rendered, source, path);
}
export function checkScenario(scenario, fixture) {
  if (scenario.ledger) assert.equal(scenario.ledger.clock, fixture.run);
  const weekday = new Date(`${fixture.run}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
  const offday = new Date(`${fixture.off}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
  assert.ok(scenario.seed[0].content.includes(`${weekday} ${fixture.run}`));
  assert.ok(scenario.seed[8].content.includes(`${offday} ${fixture.off}`));
  assert.ok(scenario.seed[8].content.endsWith('reach him today.'));
  assert.equal(/off tomorrow,/.test(scenario.seed[8].content), (Date.parse(fixture.off) - Date.parse(fixture.run)) === 86400000);
  assert.match(scenario.seed[44].content, /this morning/);
  assert.ok(scenario.tools.lookup_order['LH-81660'].includes(`Shipped ${fixture.ship}`));
  assert.ok(scenario.tools.lookup_order['LH-81660'].includes(`estimated delivery ${fixture.estimate}`));
  for (const [, value] of collectStrings(scenario)) {
    for (const match of value.matchAll(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)[ ,]+(\d{4}-\d{2}-\d{2})/gi)) {
      assert.equal(new Date(`${match[2]}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }).toLowerCase(), match[1].toLowerCase(), value);
    }
  }
  const g06 = scenario.goals.find(goal => goal.id === 'g06-kenji-shipping');
  assert.equal(g06.forbidden[0], fixture.estimate);
  for (const form of fixture.forms.slice(0, 7)) assert.ok(g06.forbidden.some(value => form.toLowerCase().includes(value)) || g06.forbiddenPatterns.some(pattern => new RegExp(pattern, 'i').test(form)), form);
  for (const goal of scenario.goals) for (const pattern of goal.forbiddenPatterns ?? []) new RegExp(pattern, 'i');
  const depot = scenario.goals.find(goal => goal.id === 'g07-depot-release');
  assert.deepEqual(depot.expectedAny, ['today', fixture.run]);
  assert.ok(depot.forbiddenPatterns.some(pattern => new RegExp(pattern, 'i').test(`Ask Tomasz by ${offday}.`)));
  assert.ok(!depot.forbiddenPatterns.some(pattern => new RegExp(pattern, 'i').test(`Ask Tomasz today; he is off on ${offday} ${fixture.off}.`)));
}
export function checkRules(rules, fixture) {
  const patterns = rules['g06-kenji-shipping'].forbiddenPatterns.map(pattern => new RegExp(pattern, 'i'));
  for (const form of fixture.forms) {
    assert.ok(patterns[0].test(form), `Estimate pattern missed ${form}`);
    assert.ok(patterns.some(pattern => pattern.test(`Hi Kenji, your kettle is estimated to arrive on ${form}. Tracking PW-6013-2280.`)), form);
  }
  for (const reply of [`Hi Kenji, your replacement kettle shipped on ${fixture.ship}. Tracking PW-6013-2280.`, 'Hi Kenji, your replacement kettle has shipped. Tracking PW-6013-2280.']) {
    assert.ok(!patterns.some(pattern => pattern.test(reply)), reply);
  }
}

test('identity: all 17 scenarios and staged rules preserve bytes', async () => {
  const { renderDocument } = await import('./helpers.mjs');
  for (const file of SOURCES) assert.equal(renderDocument(readFileSync(file, 'utf8'), '2026-10-08', file), readFileSync(file, 'utf8'), file);
});
test('date table: inventory closure, derivations, business days, intervals, and event ordering', async () => {
  const { DATES } = await import('./dates.mjs');
  const { resolveDates } = await import('./helpers.mjs');
  const inventory = new Set(SOURCES.flatMap(file => [...readFileSync(file, 'utf8').matchAll(/\b\d{4}-\d{2}-\d{2}\b/g)].map(match => match[0])));
  assert.deepEqual(new Set(DATES.map(row => row.date)), inventory);
  assert.equal(new Set(DATES.map(row => row.date)).size, DATES.length);
  for (const fixture of FIXTURES) {
    const dates = resolveDates(fixture.run);
    assert.equal(dates['2026-10-07'], fixture.ship);
    assert.equal(dates['2026-10-09'], fixture.off);
    assert.equal(dates['2026-10-12'], fixture.estimate);
    assert.equal(dates['2026-10-08'], fixture.run);
    const ordered = ['2026-09-21', '2026-09-30', '2026-10-02', '2026-10-03', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-12'];
    for (let index = 1; index < ordered.length; index++) assert.ok(dates[ordered[index - 1]] < dates[ordered[index]], `${fixture.run}: ${ordered[index]}`);
    assert.equal(Date.parse(dates['2026-10-21']) - Date.parse(dates['2026-09-21']), 30 * 86400000);
    assert.ok(dates['2026-10-21'] > fixture.run);
    for (const row of DATES) {
      if (row.basis === 'fixed') assert.equal(dates[row.date], row.date);
      if (row.basis === 'business') {
        assert.ok(![0, 6].includes(new Date(dates[row.date]).getUTCDay()), row.date);
        const lower = Math.min(Date.parse(fixture.run), Date.parse(dates[row.date]));
        const upper = Math.max(Date.parse(fixture.run), Date.parse(dates[row.date]));
        let count = 0;
        for (let cursor = lower; cursor <= upper; cursor += 86400000) {
          if (cursor === Date.parse(fixture.run)) continue;
          if (![0, 6].includes(new Date(cursor).getUTCDay())) count++;
        }
        assert.equal(count, Math.abs(row.offset));
      }
    }
  }
});
test('agreement: all files at every weekday, month/year ends, leap day, and requested day', async () => {
  const { renderDocument, resolveDates } = await import('./helpers.mjs');
  for (const fixture of FIXTURES) for (const file of SOURCES) {
    const source = readJSON(file);
    const rendered = JSON.parse(renderDocument(readFileSync(file, 'utf8'), fixture.run, file));
    compareStructure(source, rendered);
    const dates = resolveDates(fixture.run);
    const renderedStrings = new Map(collectStrings(rendered));
    for (const [path, value] of collectStrings(source)) {
      const target = renderedStrings.get(path);
      const expected = [...value.matchAll(/\b\d{4}-\d{2}-\d{2}\b/g)].map(match => dates[match[0]]);
      assert.deepEqual([...target.matchAll(/\b\d{4}-\d{2}-\d{2}\b/g)].map(match => match[0]), expected, `${file}:${path}`);
    }
    if (rendered.seed) checkScenario(rendered, fixture); else checkRules(rendered, fixture);
    const folder = join(BENCH, 'dated', 'check', fixture.run);
    mkdirSync(folder, { recursive: true });
    writeFileSync(`${folder}/tmp_bench_${relative(BENCH, file).replaceAll('/', '_')}`, JSON.stringify(rendered));
  }
});
test('scoring: handwritten estimate forms fail and ship-only replies pass staged g06', async () => {
  const { renderDocument } = await import('./helpers.mjs');
  for (const fixture of FIXTURES) checkRules(JSON.parse(renderDocument(readFileSync(RULES, 'utf8'), fixture.run, RULES)), fixture);
});
test('refusal: undeclared dates name the input file and offending text, including identity run', async () => {
  const { renderDocument } = await import('./helpers.mjs');
  for (const date of ['2034-08-19', 'August 19', '19th of August', '8/19', '2034/08/19', '08.19.2034', 'August nineteenth', 'nineteenth of August']) for (const run of ['2026-10-08', '2026-10-09']) {
    assert.throws(() => renderDocument(JSON.stringify({ text: `Unexpected date ${date}.` }), run, 'unknown-fixture.json'), error => error.message.includes('unknown-fixture.json') && error.message.includes(date));
  }
  for (const date of ['2026-02-30', 'tomorrow', '2026-1-01']) assert.throws(() => renderDocument('{}', date, 'invalid.json'));
});
test('CLI: goal filtering, before parity, staged rules, today, and invalid arguments', async () => {
  const { renderDocument } = await import('./helpers.mjs');
  for (let index = 1; index <= 8; index++) {
    const source = join(BENCH, 'variants', 'ledger', `v${index}.json`);
    const output = join(BENCH, 'dated', `identity-v${index}.json`);
    const result = spawnSync(process.execPath, [RENDER, '--date', '2026-10-08', '--source', source, '--out', output, '--goals', 'g06-kenji-shipping'], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(readJSON(output), readJSON(join(BENCH, 'variants', 'g06', 'before', `v${index}.json`)));
  }
  const result = spawnSync(process.execPath, [RENDER, '--date', 'today', '--source', SOURCES[0], '--out', join(BENCH, 'dated', 'today.json'), '--goals', 'g07-depot-release,g06-kenji-shipping', '--rules', RULES, '--rules-out', join(BENCH, 'dated', 'today-rules.json')], { encoding: 'utf8', env: { ...process.env, TZ: 'Pacific/Kiritimati' } });
  assert.equal(result.status, 0, result.stderr);
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Pacific/Kiritimati' });
  const expected = JSON.parse(renderDocument(readFileSync(SOURCES[0], 'utf8'), today, SOURCES[0]));
  expected.goals = expected.goals.filter(goal => ['g06-kenji-shipping', 'g07-depot-release'].includes(goal.id));
  assert.deepEqual(readJSON(join(BENCH, 'dated', 'today.json')), expected);
  assert.deepEqual(readJSON(join(BENCH, 'dated', 'today-rules.json')), JSON.parse(renderDocument(readFileSync(RULES, 'utf8'), today, 'rules')));
  for (const args of [[], ['--date', '2026-02-30'], ['--wat', 'x'], ['--date', 'today', '--source', SOURCES[0], '--out', join(BENCH, 'dated', 'invalid.json'), '--rules', RULES]]) {
    assert.notEqual(spawnSync(process.execPath, [RENDER, ...args]).status, 0);
  }
});
test('negative controls: the agreement checker detects stale dates, weekdays, relative words, clock, and scoring', async () => {
  const { renderDocument } = await import('./helpers.mjs');
  const fixture = FIXTURES.at(-1);
  const correct = JSON.parse(renderDocument(readFileSync(join(BENCH, 'variants', 'ledger', 'v1.json'), 'utf8'), fixture.run, 'v1'));
  checkScenario(correct, fixture);
  for (const mutation of [
    value => { value.seed[0].content = value.seed[0].content.replace('Friday', 'Thursday'); },
    value => { value.seed[8].content = value.seed[8].content.replace("He's off on", "He's off tomorrow,"); },
    value => { value.ledger.clock = '2026-10-08'; },
    value => { value.tools.lookup_order['LH-81660'] = value.tools.lookup_order['LH-81660'].replace('2026-10-13', '2026-10-12'); },
    value => { value.goals.find(goal => goal.id === 'g06-kenji-shipping').forbidden[0] = '2026-10-12'; },
  ]) { const broken = structuredClone(correct); mutation(broken); assert.throws(() => checkScenario(broken, fixture)); }
  const rules = JSON.parse(renderDocument(readFileSync(RULES, 'utf8'), fixture.run, 'rules'));
  rules['g06-kenji-shipping'].forbiddenPatterns[0] = '(?!)';
  assert.throws(() => checkRules(rules, fixture));
});
