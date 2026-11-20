/** Pins the original pre-formatting seal bytes.
 * @example STUDY_CHAT_DIGEST.length // 64
 */
export const STUDY_CHAT_DIGEST = '3635e05278e78347f1d51208ff2d77ff170f26e5e68c6f16ae270dfeba85bba4'
/** Pins the repository-formatted seal bytes.
 * @example STUDY_CHAT_FORMATTED.length // 64
 */
export const STUDY_CHAT_FORMATTED =
	'6c50bc254a746c9fef0a6371067ad9463ced107b8c63f4dad60aecd24bb2b791'
/** Names the parity groups whose rows are dialogue turns, the 58 rows right-and-not-denying reads.
 * @example STUDY_CHAT_DIALOGUE.includes('near') // true
 */
export const STUDY_CHAT_DIALOGUE = Object.freeze(['last', 'near', 'far'] as const)
/** Names the eight primary parity groups in report order.
 * @example STUDY_CHAT_GROUPS.length // 8
 */
export const STUDY_CHAT_GROUPS = Object.freeze([
	'last',
	'near',
	'far',
	'changed dialogue',
	'lookup',
	'shorter',
	'any',
	'changed script',
] as const)
/** Preserves the battery's five ledger filing cutoffs.
 * @example STUDY_CHAT_THRESHOLDS.correction // 0.5
 */
export const STUDY_CHAT_THRESHOLDS = Object.freeze({
	category: 0.7,
	topic: 0.7,
	correction: 0.5,
	amends: 0.7,
	supersedes: 0.7,
})
/** Preserves the two conversation classes' topic criteria.
 * @example STUDY_CHAT_TOPICS.orders.includes('refunds') // true
 */
export const STUDY_CHAT_TOPICS = Object.freeze({
	bookings: 'Travel, hotel, restaurant, and taxi requirements a person stated',
	orders: 'Orders, delivery, refunds, ownership and follow-up obligations',
})
/** Holds each conversation class's system text, the seal's `system` and `desk` fields byte for byte, so a scenario names its topic and never repeats the text.
 * @example STUDY_CHAT_SYSTEM.orders.startsWith('You operate a support desk.') // true
 */
export const STUDY_CHAT_SYSTEM = Object.freeze({
	bookings:
		"You help people with travel, hotel, and restaurant bookings in Cambridge. You have no booking system here, so you can't search or book. Reply in one or two short sentences, keep track of what the person asked for, and answer their questions from the conversation.",
	orders:
		'You operate a support desk. Answer the current request from the available conversation and references. Be brief.',
})
/** Detects a memory denial in a reply, apart from primary matching: a claim that the person never said what the reply needs, or that nothing on record holds it.
 * @remarks A floor of five claim shapes, each about what the person said or what the record holds:
 * "you didn't" or "haven't" mention, specify, say, or tell; something "not specified", "mentioned",
 * or "provided"; "no record" or "no information"; "I don't have that detail, information, or
 * record"; and "I don't know which, what, or where". A capability statement, such as "Since I cannot
 * book tickets" or "unable to make bookings", says what the assistant can do, not what the person
 * said, so it matches none of them, and a denial worded any other way reads as no denial. A curly
 * apostrophe reads as a straight one.
 * @example STUDY_CHAT_DENIAL.test("You didn't specify a price range.") // true
 */
export const STUDY_CHAT_DENIAL =
	/\byou\s+(?:didn[’']t|did\s+not|haven[’']t|have\s+not)\s+(?:mention(?:ed)?|specif(?:y|ied)|sa(?:y|id)|t(?:ell|old))\b|(?:\bnot|n[’']t)\s+(?:been\s+)?(?:specified|mentioned|provided)\b|\bno\s+(?:record|information)\b|\bi\s+(?:don[’']t|do\s+not)\s+have\s+(?:(?:that|the|any|this)\s+)?(?:details?|information|record)\b|\bi\s+(?:don[’']t|do\s+not)\s+know\s+(?:which|what|where)\b/iu
/** Pins each treatment name to its ledger capacity.
 * @example STUDY_CHAT_CAPACITIES.tight // 1600
 */
export const STUDY_CHAT_CAPACITIES = Object.freeze({ full: 19968, compact: 2400, tight: 1600 })
