import type { ThinkSplitterInterface } from '@src/core'
import { describe, expect, it } from 'vitest'
import { createThinkSplitter, ThinkSplitter } from '@src/core'

// The stream-stateful `<think>` separator (H4 — the provider-level think-tag guarantee): raw
// wire deltas in, CLEAN content out, the reasoning accumulated on `thinking`. The hard part is
// statefulness — a tag may arrive split ACROSS deltas, so an ambiguous tail is held back until
// the next delta (or flush) disambiguates it: never leaked as content, never mis-eaten as
// thinking. Exercised delta-by-delta exactly as OllamaProvider drives it.

// Drive a splitter over a delta sequence, returning the joined clean content — the exact
// accumulation a provider's stream loop performs (split per delta, flush at stream end).
const drive = (splitter: ThinkSplitterInterface, deltas: readonly string[]): string => {
	let content = ''
	for (const delta of deltas) content += splitter.split(delta)
	return content + splitter.flush()
}

describe('ThinkSplitter', () => {
	it('passes tag-free text through verbatim (the no-thinking fast path)', () => {
		const splitter = new ThinkSplitter()
		expect(drive(splitter, ['Hello ', 'world', '!'])).toBe('Hello world!')
		expect(splitter.thinking).toBe('')
		expect(splitter.content).toBe('Hello world!')
	})

	it('splits a whole <think>…</think> span arriving in ONE delta', () => {
		const splitter = new ThinkSplitter()
		expect(drive(splitter, ['<think>plan the answer</think>Here it is.'])).toBe('Here it is.')
		expect(splitter.thinking).toBe('plan the answer')
		expect(splitter.content).toBe('Here it is.')
	})

	it('handles the IMPLICIT leading open (the qwen3-template shape) — a bare </think> reclassifies the prefix', () => {
		const splitter = new ThinkSplitter()
		// The chat template pre-seeded `<think>` into the prompt scaffold, so the stream BEGINS
		// mid-reasoning — indistinguishable from content, surfaced live…
		expect(splitter.split('weigh the options, ')).toBe('weigh the options, ')
		// …until the bare close reveals it: the surfaced prefix RECLASSIFIES into thinking.
		expect(splitter.split('answer NO.</think>The answer is NO.')).toBe('The answer is NO.')
		expect(splitter.thinking).toBe('weigh the options, answer NO.')
		// `content` is the AUTHORITATIVE clean accumulation — corrected retroactively (the
		// per-delta returns over-reported; the assembled result reads from here).
		expect(splitter.content).toBe('The answer is NO.')
		expect(splitter.flush()).toBe('')
	})

	it('holds a SPLIT leading close across deltas (a bare "</thi" boundary never leaks)', () => {
		const splitter = new ThinkSplitter()
		expect(splitter.split('reasoning</thi')).toBe('reasoning')
		expect(splitter.split('nk>clean')).toBe('clean')
		expect(splitter.thinking).toBe('reasoning')
		expect(splitter.content).toBe('clean')
	})

	it('the implicit-open rule is ONE-SHOT — a bare </think> after a tag event is plain text', () => {
		const splitter = new ThinkSplitter()
		expect(splitter.split('<think>plan</think>ok ')).toBe('ok ')
		// Prose QUOTING the close tag stays text once a real tag event has occurred — the
		// reclassification can never eat a legitimate later answer.
		expect(splitter.split('quote: </think> done')).toBe('quote: </think> done')
		expect(splitter.thinking).toBe('plan')
		expect(splitter.content).toBe('ok quote: </think> done')
	})

	it('keeps text BEFORE the span as content (narration, then thinking, then the answer)', () => {
		const splitter = new ThinkSplitter()
		expect(drive(splitter, ['Sure. <think>weigh options</think> Done.'])).toBe('Sure.  Done.')
		expect(splitter.thinking).toBe('weigh options')
	})

	it('handles an OPEN tag split across deltas — a partial "<thi" is held, never leaked', () => {
		const splitter = new ThinkSplitter()
		// The held '<thi' must surface as NEITHER content NOR thinking until disambiguated.
		expect(splitter.split('<thi')).toBe('')
		expect(splitter.thinking).toBe('')
		expect(splitter.split('nk>reason')).toBe('')
		expect(splitter.split('ing</think>answer')).toBe('answer')
		expect(splitter.flush()).toBe('')
		expect(splitter.thinking).toBe('reasoning')
	})

	it('handles a CLOSE tag split across deltas (the symmetric boundary)', () => {
		const splitter = new ThinkSplitter()
		expect(splitter.split('<think>deep')).toBe('')
		expect(splitter.split(' thought</thi')).toBe('')
		expect(splitter.split('nk>clean tail')).toBe('clean tail')
		expect(splitter.thinking).toBe('deep thought')
	})

	it('splits one character at a time (the worst-case delta granularity)', () => {
		const splitter = new ThinkSplitter()
		const wire = '<think>a b</think>Answer: 42'
		expect(drive(splitter, [...wire])).toBe('Answer: 42')
		expect(splitter.thinking).toBe('a b')
	})

	it('accumulates MULTIPLE spans in order (a tool-round model thinks between answers)', () => {
		const splitter = new ThinkSplitter()
		const out = drive(splitter, ['<think>first</think>one ', '<think>second</think>two'])
		expect(out).toBe('one two')
		expect(splitter.thinking).toBe('firstsecond')
	})

	it('treats a nested-looking <think> inside an open span as thinking text (no nesting)', () => {
		const splitter = new ThinkSplitter()
		expect(drive(splitter, ['<think>outer <think> inner</think>after'])).toBe('after')
		expect(splitter.thinking).toBe('outer <think> inner')
	})

	it('routes an UNCLOSED span at stream end to thinking (the cut-off model)', () => {
		const splitter = new ThinkSplitter()
		expect(splitter.split('<think>still reaso')).toBe('')
		// flush settles the tail as thinking — never as content.
		expect(splitter.flush()).toBe('')
		expect(splitter.thinking).toBe('still reaso')
	})

	it('routes a held partial CLOSE tag inside an unclosed span to thinking on flush', () => {
		const splitter = new ThinkSplitter()
		expect(splitter.split('<think>almost done</thi')).toBe('')
		expect(splitter.flush()).toBe('')
		expect(splitter.thinking).toBe('almost done</thi')
	})

	it('returns a held partial OPEN tag that never completed as CONTENT on flush (it was real text)', () => {
		const splitter = new ThinkSplitter()
		expect(splitter.split('the answer is <thi')).toBe('the answer is ')
		expect(splitter.flush()).toBe('<thi')
		expect(splitter.thinking).toBe('')
	})

	it('lets a lone "<" / a non-tag "<t…" settle as content once disambiguated', () => {
		const splitter = new ThinkSplitter()
		expect(splitter.split('a < b')).toBe('a < b') // a trailing space disambiguates immediately
		expect(splitter.split('and <t')).toBe('and ') // ambiguous — held
		expect(splitter.split('ag>')).toBe('<tag>') // not a think tag after all — surfaced
		expect(splitter.flush()).toBe('')
		expect(splitter.thinking).toBe('')
	})

	it('exposes the accumulated thinking MID-stream (the cancel-partial read)', () => {
		const splitter = new ThinkSplitter()
		splitter.split('<think>so far')
		expect(splitter.thinking).toBe('so far')
		splitter.split(' and more')
		expect(splitter.thinking).toBe('so far and more')
	})

	it('is empty-delta safe (a keep-alive blank line costs nothing)', () => {
		const splitter = new ThinkSplitter()
		expect(splitter.split('')).toBe('')
		expect(splitter.split('<think>x')).toBe('')
		expect(splitter.split('')).toBe('')
		expect(splitter.split('</think>y')).toBe('y')
		expect(splitter.thinking).toBe('x')
	})
})

describe('createThinkSplitter', () => {
	it('returns a fresh, independent splitter per call (one splitter, one stream)', () => {
		const first = createThinkSplitter()
		const second = createThinkSplitter()
		first.split('<think>private')
		expect(first.thinking).toBe('private')
		// The sibling shares no state — its scan starts outside any span.
		expect(second.split('clean')).toBe('clean')
		expect(second.thinking).toBe('')
	})
})
