import { DATES } from './dates.mjs';
import { MONTHS, WEEKDAYS, CARDINALS, ORDINALS, DATE_PATTERN, MONTH_PATTERN } from './constants.mjs';

export function resolveRun(value) {
  if (value === 'today') {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(`${value}T00:00:00Z`)) || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) throw new Error(`Invalid run date: ${value}`);
  return value;
}
export function resolveDates(value) {
  const run = resolveRun(value);
  const dates = {};
  for (const row of DATES) {
    if (row.basis === 'fixed') dates[row.date] = row.date;
    else if (row.basis === 'run') dates[row.date] = run;
    else {
      const date = new Date(`${row.anchor ? dates[row.anchor] : run}T00:00:00Z`);
      let remaining = Math.abs(row.offset);
      while (remaining > 0) {
        date.setUTCDate(date.getUTCDate() + Math.sign(row.offset));
        if (row.basis === 'calendar' || ![0, 6].includes(date.getUTCDay())) remaining--;
      }
      dates[row.date] = date.toISOString().slice(0, 10);
    }
  }
  return dates;
}
export function readParts(date) {
  const [year, month, day] = date.split('-').map(Number);
  return { year, month, day, weekday: WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()] };
}
export function renderSuffix(day) {
  if (day % 100 >= 11 && day % 100 <= 13) return 'th';
  return ({ 1: 'st', 2: 'nd', 3: 'rd' })[day % 10] ?? 'th';
}
export function matchCase(source, target) {
  if (source === source.toUpperCase()) return target.toUpperCase();
  if (source === source.toLowerCase()) return target.toLowerCase();
  return target;
}
export function parseMention(text, file) {
  const named = text.match(new RegExp(MONTH_PATTERN, 'i'));
  let month, day, year;
  if (named) {
    month = MONTHS.findIndex(value => value.slice(0, 3).toLowerCase() === named[0].slice(0, 3).toLowerCase()) + 1;
    const rest = text.replace(new RegExp(`${MONTH_PATTERN}\\.?`, 'i'), '').replace(/\b(?:the|of)\b/gi, '').trim();
    const numeric = rest.match(/^(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?$/i);
    if (numeric) { day = Number(numeric[1]); year = numeric[2] ? Number(numeric[2]) : undefined; }
    else {
      const word = rest.replace(/,?\s+\d{4}$/, '').trim().toLowerCase();
      day = Math.max(CARDINALS.indexOf(word), ORDINALS.indexOf(word));
      const suffix = rest.match(/\b\d{4}$/);
      year = suffix ? Number(suffix[0]) : undefined;
    }
  } else {
    const parts = text.split(/[-/.]/).map(Number);
    if (/^\d{4}/.test(text)) [year, month, day] = parts;
    else { [month, day, year] = parts; if (month > 12) [month, day] = [day, month]; if (year !== undefined && year < 100) year += 2000; }
  }
  const candidates = DATES.filter(row => {
    const parts = readParts(row.date);
    return parts.month === month && parts.day === day && (year === undefined || year === parts.year);
  });
  if (candidates.length !== 1) throw new Error(`${file}: undeclared or ambiguous date ${JSON.stringify(text)}`);
  return candidates[0].date;
}
export function renderMention(text, target) {
  const parts = readParts(target);
  const named = text.match(new RegExp(MONTH_PATTERN, 'i'));
  if (!named) {
    const separator = text.match(/[-/.]/)[0];
    const numbers = text.split(/[-/.]/);
    const firstYear = numbers[0].length === 4;
    const firstDay = !firstYear && Number(numbers[0]) > 12;
    const values = firstYear ? [parts.year, parts.month, parts.day] : firstDay ? [parts.day, parts.month, parts.year] : [parts.month, parts.day, parts.year];
    return numbers.map((number, index) => String((firstYear ? index === 0 : index === 2) && number.length === 2 ? values[index] % 100 : values[index]).padStart(number.length, '0')).join(separator);
  }
  let month = MONTHS[parts.month - 1];
  if (named[0].length <= 4 && named[0].toLowerCase() !== MONTHS[readParts(parseMention(text, 'mention')).month - 1].toLowerCase()) month = month.slice(0, named[0].length === 4 && parts.month === 9 ? 4 : 3);
  const replacement = matchCase(named[0], month);
  const tokens = new RegExp(`(${MONTH_PATTERN})|\\b\\d{4}\\b|\\b\\d{1,2}(?:st|nd|rd|th)?\\b|\\b(?:${[...ORDINALS.slice(1), ...CARDINALS.slice(1)].sort((a, b) => b.length - a.length).join('|')})\\b`, 'gi');
  return text.replace(tokens, token => {
    if (token.toLowerCase() === named[0].toLowerCase()) return replacement;
    if (/^\d{4}$/.test(token)) return String(parts.year);
    if (/^\d/.test(token)) return `${parts.day}${/[a-z]$/i.test(token) ? renderSuffix(parts.day) : ''}`;
    return matchCase(token, ORDINALS.includes(token.toLowerCase()) ? ORDINALS[parts.day] : CARDINALS[parts.day]);
  });
}
export function renderMonthPattern(month) {
  const name = MONTHS[month - 1].toLowerCase();
  return name.length === 3 ? name : `${name.slice(0, 3)}(?:${name.slice(3)})?`;
}
export function renderEstimatePattern(date) {
  const { year, month, day } = readParts(date);
  const number = `${day}(?:${renderSuffix(day)})?`;
  const words = `(?:${number}|${ORDINALS[day]}|${CARDINALS[day]})`;
  const name = renderMonthPattern(month);
  return `\\b(?:${year}[-/.]0?${month}[-/.]0?${day}|0?${month}[-/.]0?${day}(?:[-/.](?:${year}|${String(year).slice(-2)}))?|0?${day}[-/.]0?${month}[-/.](?:${year}|${String(year).slice(-2)})|${name}\\.?[ \\t-]*(?:the\\s+)?${words}|${words}[ \\t-]+(?:of\\s+)?${name}\\.?)\\b`;
}
export function renderText(text, dates, file) {
  const original = resolveDates(DATES.find(row => row.basis === 'run').date);
  const estimate = DATES.find(row => row.name === 'Kenji carrier estimate').date;
  const off = DATES.find(row => row.name === 'Tomasz day off').date;
  const run = DATES.find(row => row.basis === 'run').date;
  const example = DATES.find(row => row.name === 'Unselected Frankfurt example').date;
  if (text === renderEstimatePattern(original[estimate])) return renderEstimatePattern(dates[estimate]);
  const mentions = [];
  let output = text.replace(DATE_PATTERN, match => {
    const source = parseMention(match, file);
    const index = mentions.push(renderMention(match, dates[source])) - 1;
    return `\u0001${index}\u0002`;
  });
  const offParts = readParts(dates[off]);
  const oldOff = readParts(off);
  const pattern = `${renderMonthPattern(oldOff.month).replace(')?', '|\\.)?')}\\s+${oldOff.day}(?:${renderSuffix(oldOff.day)})?`;
  const revised = `${renderMonthPattern(offParts.month).replace(')?', '|\\.)?')}\\s+${offParts.day}(?:${renderSuffix(offParts.day)})?`;
  output = output.replaceAll(pattern, revised);
  const weekdays = new Map([run, off, example].map(date => [readParts(date).weekday.toLowerCase(), readParts(dates[date]).weekday]));
  output = output.replace(/thursday|friday|saturday/gi, match => matchCase(match, weekdays.get(match.toLowerCase())));
  if (Date.parse(dates[off]) - Date.parse(dates[run]) !== 86400000) {
    output = output.replace(/off tomorrow, /g, 'off on ');
    // Regexes still forbid tomorrow as a late request, and also recognize the day off in exceptions.
    output = output.replaceAll('tomorrow,?', `(?:tomorrow|on ${offParts.weekday.toLowerCase()}),?`);
  }
  return output.replace(/\u0001(\d+)\u0002/g, (_, index) => mentions[Number(index)]);
}
export function renderDocument(raw, value, file) {
  JSON.parse(raw);
  const dates = resolveDates(value);
  return raw.replace(/"(?:\\.|[^"\\])*"/g, token => {
    const source = JSON.parse(token);
    const target = renderText(source, dates, file);
    return source === target ? token : JSON.stringify(target);
  });
}
