// Writes variants/v1.json to v8.json from the main harness's scenario.json and variants/ledger/v1.json to v8.json
// from the briefing harness's scenario.json: each with only goals[].request replaced, by the same table, and
// serialized the way its source is, so every other byte matches and request k of variant N is one string in both.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const BENCH = '/home/user/agent/tmp/bench'
const SOURCES = [
	[`${BENCH}/scenario.json`, `${BENCH}/variants`],
	['/home/user/agent/tmp/bench3/scenario.json', `${BENCH}/variants/ledger`],
]

const REWORDED = {
	'g01-luis-refund-amount': [
		'How much does Luis Ferreira get back on the opened stand mixer? Figure out his refund and tell me the amount.',
		"Luis Ferreira wants to know what he'll get refunded for the stand mixer he opened. Calculate it and send me the figure.",
		"Can you work out Luis Ferreira's refund for the opened stand mixer? He's asking how much is coming back to him, so send me the amount.",
		'Luis Ferreira asked what he gets back for his opened stand mixer. Run the refund numbers and send me the amount.',
		"Need the refund amount for Luis Ferreira's opened stand mixer; he's asking how much he'll get back. Work it out and send it to me.",
		"Luis Ferreira is chasing how much he'll be refunded for the stand mixer he opened. Work out the amount and pass it to me.",
		"What's Luis Ferreira getting back for the opened stand mixer? He's asking. Work out the refund and give me the amount.",
		"For Luis Ferreira's opened stand mixer, how much will he get back? Calculate the refund and send me the number.",
	],
	'g02-luis-card': [
		'Luis wants the refund put back on the card he paid with. Pull up his account and tell me which card is on file.',
		'Which card do we have on file for Luis? He wants his refund to go back to the card he used to pay, so check his account.',
		"Luis is asking for his refund to land on the card he paid with. Check his account and let me know which card we've got on file.",
		"Can you look up Luis's account and tell me what card we have on file? He wants the refund back on the card he paid with.",
		'Luis would like his refund to go to the card he paid with. Look at his account and tell me which card is on file for him.',
		'Luis wants his refund sent back to whatever card he paid with. Look up his account and tell me which card we hold on file.',
		'The refund for Luis should go back to the card he paid with, he says. Look up his account and tell me the card we have on file.',
		'Luis asked for the refund to go back on the card he paid with. Check his account: which card do we have on file?',
	],
	'g03-grace-escalation': [
		"Grace Okafor is still pushing for a replacement for her missing duvet. Write up the internal escalation note with who signs off, who's copied, and the carrier tracking number for the trace.",
		"Draft the internal escalation note for Grace Okafor's missing duvet; she still wants a replacement. I need who has to sign off, who gets copied, and the carrier tracking number to trace it.",
		"Grace Okafor's duvet is still missing and she wants a replacement. Put together the internal escalation note: sign-off, who's on copy, and the carrier tracking number for the trace.",
		"Need an internal escalation note for Grace Okafor, who still wants a replacement for her missing duvet. List who signs off, who we copy, and the carrier's tracking number for the trace.",
		'Grace Okafor still wants a replacement sent for her missing duvet. Draft the internal escalation note and include who has to sign off, who gets copied, and the carrier tracking number for the trace.',
		"Write the internal escalation note for Grace Okafor's missing duvet; she's still asking for a replacement. Who signs off, who gets copied, and what carrier tracking number do we trace?",
		"Grace Okafor still hasn't got her duvet and wants a replacement for it. Draft the internal escalation note: who has to sign off, who's copied on it, and the carrier tracking number for the trace.",
		'Grace Okafor still wants a replacement for the missing duvet, so draft the internal escalation note. It needs who has to sign off, who gets copied, and the carrier tracking number for the trace.',
	],
	'g04-halvorsen-ticket': [
		'Send Priya the escalation ticket number for the late Halvorsen Interiors delivery; finance needs it to match things up.',
		'Finance wants to match the Halvorsen Interiors late delivery, so Priya needs its escalation ticket number. Send it to her.',
		'Priya is asking for the escalation ticket number on the Halvorsen Interiors late delivery so finance can match it up. Can you send it to her?',
		"What's the escalation ticket number for the Halvorsen Interiors late delivery? Priya needs it for finance to match, so send it her way.",
		'Priya needs to give finance the escalation ticket number for the late Halvorsen Interiors delivery so they can match it. Send her the number.',
		'Get Priya the escalation ticket number for the Halvorsen Interiors late delivery. Finance needs it to match the records.',
		"For finance's matching, Priya wants the escalation ticket number on the Halvorsen Interiors late delivery. Send her that number.",
		'Could you send Priya the ticket number for the Halvorsen Interiors late delivery escalation? Finance has to match it.',
	],
	'g05-luis-approval-note': [
		"Draft the internal note authorizing Luis's mixer refund, and include everything our refund rules require for an amount that size.",
		'I need the internal note that authorizes the mixer refund for Luis, with whatever our refund rules require at that amount.',
		"Put together the internal note authorizing Luis's mixer refund. Make sure it has everything the refund rules require for a refund of that size.",
		"Write up the internal authorization note for Luis's mixer refund, covering everything our refund rules require for an amount that size.",
		"Luis's mixer refund needs an internal note that authorizes it. Include everything our refund rules require for an amount of that size.",
		"Can you write the internal note to authorize Luis's mixer refund? Put in everything our refund rules require for that size of amount.",
		"Write the internal note authorizing the refund on Luis's mixer, with all the items our refund rules require for an amount like that.",
		"Draft the internal note that authorizes Luis's refund for the mixer, including everything required by our refund rules for an amount that big.",
	],
	'g06-kenji-shipping': [
		"Has Kenji Nakamura's replacement kettle shipped yet? He's asking. Check the order and write me a reply I can send him.",
		'Kenji Nakamura wants to know if his replacement kettle has gone out yet. Look at the order and draft the reply I can send him.',
		'Kenji Nakamura is checking whether the replacement kettle has shipped. Pull up the order and write a reply I can pass on to him.',
		"Check the order for Kenji Nakamura's replacement kettle and write the reply I can send him; he's asking whether it has shipped yet.",
		'Kenji Nakamura asked if his replacement kettle has shipped. Check the order and write up a reply for me to send him.',
		'Has the replacement kettle for Kenji Nakamura shipped yet? Check the order and give me a reply I can send to him.',
		"Kenji Nakamura is chasing his replacement kettle and wants to know if it has shipped. Look up the order and write the reply I'll send him.",
		"Write me a reply for Kenji Nakamura, who's asking whether his replacement kettle has shipped yet. Check the order first.",
	],
	'g07-depot-release': [
		'The Halvorsen pendant lights are stuck at the Freightline depot until someone here releases them. Who do I ask, by when, and which pro number does Freightline need?',
		"Freightline won't let the Halvorsen pendant lights leave their depot until our side releases them. Who should I ask, by when, and what pro number goes to Freightline?",
		'Freightline is holding the Halvorsen pendant lights at their depot until we release them. Who do I go to, by when do I need it, and what pro number do I give Freightline?',
		'Who on our side releases the Halvorsen pendant lights from the Freightline depot, by when, and what pro number do I give Freightline? They say the lights can\'t leave until someone does.',
		"Freightline needs someone on our side to release the Halvorsen pendant lights before they can leave the depot. Who do I ask, by when, and what's the pro number for Freightline?",
		'According to Freightline, the Halvorsen pendant lights stay at their depot until we release them. Who do I ask, by when, and what pro number do I quote to Freightline?',
		'Freightline says the Halvorsen pendant lights are held at their depot until someone here releases them. Tell me who to ask, by when, and the pro number to give Freightline.',
		"The Halvorsen pendant lights can't leave the Freightline depot until our side releases them, Freightline says. Who's the person to ask, by when, and what pro number do they want?",
	],
	'g08-halvorsen-credit': [
		'Halvorsen Interiors wants a $3,000 reorder on credit. Check their account: does it fit their available credit, and who is their account manager?',
		'Can Halvorsen Interiors put a $3,000 reorder on credit? Look at their account, tell me if it fits their available credit, and who their account manager is.',
		'Halvorsen Interiors would like to put a $3,000 reorder on credit. Check the account and let me know whether it fits their available credit and who manages the account.',
		"Does a $3,000 reorder on credit fit Halvorsen Interiors' available credit? Check their account and tell me who their account manager is too.",
		'Halvorsen Interiors is asking to put a $3,000 reorder on credit. Look up their account, tell me if it fits their available credit, and give me their account manager.',
		"Check the Halvorsen Interiors account: they want a $3,000 reorder on credit. Will it fit their available credit, and who's their account manager?",
		'Halvorsen Interiors wants to charge a $3,000 reorder to their credit. Check their account and tell me whether that fits the available credit and who the account manager is.',
		'Halvorsen Interiors has a $3,000 reorder they want on credit. Check their account, tell me whether it fits their available credit, and name their account manager.',
	],
	'g09-kenji-gift-note': [
		'Packing needs the exact wording Kenji Nakamura asked for on the gift card for his replacement kettle. What was it?',
		'What exact wording did Kenji Nakamura ask for on the gift card? The packing team is printing it for his replacement kettle.',
		"The packing team is printing Kenji Nakamura's gift card for the replacement kettle and needs the exact wording he asked for. What is it?",
		"For the gift card going out with Kenji Nakamura's replacement kettle, what exact wording did he request? Packing is printing it.",
		"Packing team's printing the gift card for Kenji Nakamura's replacement kettle. What's the exact wording he wanted?",
		"Kenji Nakamura's replacement kettle gets a gift card, and the packing team is printing it. What exact wording did he ask us for?",
		"The packing team needs the exact gift card wording Kenji Nakamura asked for on his replacement kettle; they're printing it. What did he ask for?",
		'What did Kenji Nakamura ask for, word for word, on the gift card for his replacement kettle? The packing team is printing it.',
	],
	'g10-sigrid-callback': [
		'Sigrid at Halvorsen Interiors wants a callback about the stuck shipment; she left a voicemail. What number do I dial, and when will she pick up?',
		"There's a voicemail from Sigrid at Halvorsen Interiors asking us to call back about the stuck shipment. What number do I call, and when will she answer?",
		'Sigrid from Halvorsen Interiors left a voicemail wanting a callback on the stuck shipment. Which number do I dial, and when will she pick up?',
		'What number do I dial to reach Sigrid at Halvorsen Interiors, and when will she pick up? She left a voicemail asking for a callback about the stuck shipment.',
		"Sigrid at Halvorsen Interiors asked in a voicemail for a callback about the stuck shipment. Tell me the number to dial and when she'll pick up.",
		'Got a voicemail from Sigrid at Halvorsen Interiors about the stuck shipment; she wants a callback. What do I dial, and when will she pick up?',
		'Calling Sigrid at Halvorsen Interiors back about the stuck shipment, as her voicemail asked. What number do I dial and when does she pick up?',
		'Sigrid at Halvorsen Interiors wants someone to call her back about the stuck shipment, per her voicemail. What number should I dial, and when will she pick up the phone?',
	],
}

for (const [source, folder] of SOURCES) {
	const text = readFileSync(source, 'utf8')
	if (`${JSON.stringify(JSON.parse(text))}\n` !== text) throw new Error(`${source} does not round-trip through JSON.stringify`)
	mkdirSync(folder, { recursive: true })
	for (let variant = 1; variant <= 8; variant += 1) {
		const scenario = JSON.parse(text)
		for (const goal of scenario.goals) {
			const reworded = REWORDED[goal.id]?.[variant - 1]
			if (reworded === undefined) throw new Error(`no rewording ${variant} for ${goal.id}`)
			goal.request = reworded
		}
		writeFileSync(`${folder}/v${variant}.json`, `${JSON.stringify(scenario)}\n`)
	}
	process.stdout.write(`wrote ${folder}/v1.json to v8.json from ${source}\n`)
}
