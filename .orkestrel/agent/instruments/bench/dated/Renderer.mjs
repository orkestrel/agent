import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { parseArgs } from 'node:util';
import { renderDocument } from './helpers.mjs';

export class Renderer {
  run(args) {
    const { values } = parseArgs({ args, options: Object.fromEntries(['date', 'source', 'out', 'goals', 'rules', 'rules-out'].map(name => [name, { type: 'string' }])) });
    if (!values.date || !values.source || !values.out) throw new Error('Required: --date YYYY-MM-DD|today --source FILE --out FILE');
    if (Boolean(values.rules) !== Boolean(values['rules-out'])) throw new Error('--rules and --rules-out must be supplied together');
    let rendered = renderDocument(readFileSync(values.source, 'utf8'), values.date, values.source);
    if (values.goals !== undefined) {
      const scenario = JSON.parse(rendered);
      const ids = values.goals.split(',');
      if (!Array.isArray(scenario.goals) || ids.some(id => !scenario.goals.some(goal => goal.id === id))) throw new Error(`Unknown goal in ${values.goals}`);
      scenario.goals = scenario.goals.filter(goal => ids.includes(goal.id));
      rendered = `${JSON.stringify(scenario, null, 2)}\n`;
    }
    const rules = values.rules ? renderDocument(readFileSync(values.rules, 'utf8'), values.date, values.rules) : undefined;
    mkdirSync(dirname(values.out), { recursive: true });
    writeFileSync(values.out, rendered);
    if (rules !== undefined) {
      mkdirSync(dirname(values['rules-out']), { recursive: true });
      writeFileSync(values['rules-out'], rules);
    }
  }
}
