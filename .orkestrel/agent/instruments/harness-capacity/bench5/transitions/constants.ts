import type { TransitionAnnotation } from '../types.js'

/** Records semantic opportunities omitted from the scenario's category and pair fields. */
export const TRANSITION_ANNOTATIONS: readonly TransitionAnnotation[] = Object.freeze([
	{
		transition: 'repetition',
		index: 3,
		prior: [2],
		text: 'Understood: refunds above $200 carry approval code MX-4471 from Marcus Oyelaran.',
	},
	{
		transition: 'repetition',
		index: 5,
		prior: [4],
		text: 'Noted, a 15 percent restocking fee comes off refunds for opened items.',
	},
	{
		transition: 'repetition',
		index: 49,
		prior: [48],
		text: "Noted: LATE10 takes 10 percent off a delayed customer's next order through 2026-10-09.",
	},
	{
		transition: 'repetition',
		index: 89,
		prior: [88],
		text: "Understood: Grace's replacement goes out at the end of the day unless TR-3307 turns something up first.",
	},
	{
		transition: 'repetition',
		index: 113,
		prior: [112],
		text: 'Noted: Saturday walk-in returns run 9 am to 1 pm.',
	},
	{
		transition: 'withdrawal',
		index: 44,
		prior: [4, 5],
		text: 'Before you work on Luis: the director scrapped the 15 percent restocking fee this morning. Opened-item returns get a full refund again.',
	},
	{
		transition: 'withdrawal',
		index: 90,
		prior: [56, 88, 89],
		text: "Parcelway came back on TR-3307: Grace's duvet was in locker 14 at Elm Street under the wrong door code, and she collected it at 3 pm. Trace TR-3307 is resolved, close it, and drop the replacement.",
	},
	{
		transition: 'withdrawal',
		index: 122,
		prior: [112, 113],
		text: "Disregard yesterday's note about the Saturday walk-in returns counter: facilities closed it all day for floor work, so walk-in returns wait until Monday.",
	},
	{
		transition: 'withdrawal',
		index: 138,
		prior: [68, 92, 93],
		text: "Forget everything I told you about reaching Copperline's buyer: Owen Pritchard left the company yesterday. Their new buyer is Hana Ikeda, email only, at hana.ikeda@copperline.example.",
	},
])
