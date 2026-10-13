// Scores the control texts proposed for --probe-score against the scorer and scenario in place.
import { readFileSync } from 'node:fs'
import { compileRules, scoreText } from '../../../rescore.mjs'

const scenario = JSON.parse(readFileSync(new URL('../../../scenario.json', import.meta.url), 'utf8'))
const goal = (prefix) => scenario.goals.find((one) => one.id.startsWith(prefix))
const outcome = (scored) => (scored.patterns.length > 0 ? 'pattern' : scored.missing.length > 0 || scored.violations.length > 0 ? 'missing' : 'pass')
const cases = [
	['g07', 'Ask Tomasz Brennan today; he is off tomorrow. Give Freightline pro number FL-660412.', 'pass'],
	['g07', 'Ask Tomasz Brennan today, not tomorrow; he is out tomorrow (Friday). Pro number FL-660412.', 'pass'],
	['g07', 'Tomasz Brennan must get the request by tomorrow; he is in today. Pro number FL-660412.', 'pattern'],
	['g07', '| Ask | Tomasz Brennan |\n| --- | --- |\n| Deadline | Tomorrow |\n| Pro number | FL-660412 |\n\nHe is in today.', 'pattern'],
	['g03', '| Sign-off | Marcus Oyelaran |\n| --- | --- |\n| Copy | Priya Raman |\n| Tracking | PW-5521-9930 |', 'pass'],
	['g03', 'Marcus Oyelaran, the escalations manager, must sign off; copy Priya Raman. Tracking PW-5521-9930.', 'pass'],
	['g03', 'Replacement needs sign-off from Marcus Oyelaran; Priya Raman is copied. Tracking PW-5521-9930.', 'pass'],
	['g03', 'Sign-off: Priya and Marcus Oyelaran are copied. Tracking PW-5521-9930.', 'pattern'],
	['g08', '| Check | Result |\n| --- | --- |\n| Fits within available credit? | No |\n| Account manager | Ines Albrecht |', 'pattern'],
	['g08', '| Check | Result |\n| --- | --- |\n| Fits within available credit? | Yes |\n| Account manager | Ines Albrecht |', 'pass'],
	['g04', '| Current ticket | Superseded |\n| --- | --- |\n| ESC-2219 | ESC-2291 |', 'pattern'],
	['g04', 'The ticket is ESC-2219 (superseded: ESC-2291).', 'pass'],
]
for (const [prefix, text, want] of cases) {
	const got = outcome(scoreText(compileRules(goal(prefix)), text))
	console.log(`${got === want ? 'ok ' : 'BAD'} ${prefix} ${got} want ${want}: ${JSON.stringify(text)}`)
}
