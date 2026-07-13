import type { ThinkSplitterInterface } from './types.js'
import { THINK_CLOSE, THINK_OPEN } from './constants.js'

/**
 * The stream-stateful `<think>` separator — feeds raw content deltas through a tiny
 * state machine that routes everything inside a `<think>…</think>` span to `thinking`
 * and returns everything outside it as clean content, so a provider yields ONLY the
 * answer and surfaces the reasoning as {@link import('./types.js').ProviderResult.thinking}.
 *
 * @remarks
 * - **Cross-chunk tags.** A tag may arrive split across wire deltas (`'<thi'` then
 *   `'nk>'`): any suffix of the pending text that is a strict PREFIX of a tag being
 *   scanned for is HELD BACK (neither surfaced nor routed) until the next delta — or
 *   `flush()` — disambiguates it. A held tag prefix that never completes is real
 *   content; a held close-tag prefix inside a span is thinking.
 * - **The IMPLICIT leading open (the qwen3-template shape).** Some chat templates
 *   PRE-SEED `<think>` into the prompt scaffold, so the wire stream begins
 *   MID-REASONING and only a bare `</think>` appears. Before any tag event, a bare
 *   close therefore RECLASSIFIES everything surfaced so far (plus the pre-close
 *   pending) as thinking — `content` is corrected retroactively (the already-returned
 *   prefix cannot be recalled, so `content` is the authoritative accumulation). The
 *   rule is ONE-SHOT: after any tag event a bare `</think>` is plain text.
 * - **Multiple spans** accumulate onto `thinking` in stream order. A nested-looking
 *   `<think>` inside an open span is just thinking text (no nesting is tracked — the
 *   first `</think>` closes the span), matching how the models emit it.
 * - **Unclosed span at stream end.** `flush()` routes the open span's tail (including
 *   any held partial close tag) to `thinking` — a cut-off model was still reasoning.
 * - **One splitter, one stream.** State is per-stream; create a fresh instance per
 *   provider call ({@link import('./factories.js').createThinkSplitter}).
 *
 * @example
 * ```ts
 * const splitter = new ThinkSplitter()
 * splitter.split('<thi') // '' (held — ambiguous)
 * splitter.split('nk>plan</think>ok') // 'ok'
 * splitter.thinking // 'plan'
 * splitter.content // 'ok'
 * splitter.flush() // '' (nothing held)
 * ```
 */
export class ThinkSplitter implements ThinkSplitterInterface {
	// The undecided tail of the stream — text not yet routed to content or thinking
	// (at most one partial tag's worth between calls; transiently the whole delta).
	#pending = ''
	// Whether the scanner is inside an open `<think>` span.
	#inside = false
	// Whether a tag event has occurred (an explicit open, or the one-shot implicit-open
	// close) — BEFORE it, a bare `</think>` closes the implicit span a chat template
	// pre-seeded; AFTER it, a bare close is plain text.
	#opened = false
	#content = ''
	#thinking = ''

	get content(): string {
		return this.#content
	}

	get thinking(): string {
		return this.#thinking
	}

	split(delta: string): string {
		const out = this.#scan(delta)
		this.#content += out
		return out
	}

	flush(): string {
		const pending = this.#pending
		this.#pending = ''
		if (this.#inside) {
			// An unclosed span at stream end — the tail (held partial close tag included)
			// is thinking: the model was cut off mid-reasoning, never mid-answer.
			this.#thinking += pending
			this.#inside = false
			return ''
		}
		// A held partial tag that never completed was real content after all.
		this.#content += pending
		return pending
	}

	// Drive the state machine over one delta, returning the clean content it surfaces —
	// the wrapper folds the return into `#content`, which the implicit-open branch may
	// have just reset (the reclassification).
	#scan(delta: string): string {
		this.#pending += delta
		let content = ''
		for (;;) {
			if (this.#inside) {
				const close = this.#pending.indexOf(THINK_CLOSE)
				if (close === -1) {
					// No close yet — route all but a possible partial close-tag suffix to
					// thinking, holding that suffix for the next delta to disambiguate.
					this.#thinking += this.#hold([THINK_CLOSE])
					return content
				}
				this.#thinking += this.#pending.slice(0, close)
				this.#pending = this.#pending.slice(close + THINK_CLOSE.length)
				this.#inside = false
				continue
			}
			const open = this.#pending.indexOf(THINK_OPEN)
			if (!this.#opened) {
				// The IMPLICIT leading open: before any tag event, a bare close (arriving
				// ahead of any explicit open) means the stream BEGAN inside a pre-seeded
				// span — everything surfaced so far was reasoning. Reclassify it.
				const close = this.#pending.indexOf(THINK_CLOSE)
				if (close !== -1 && (open === -1 || close < open)) {
					this.#thinking += this.#content + content + this.#pending.slice(0, close)
					this.#content = ''
					content = ''
					this.#pending = this.#pending.slice(close + THINK_CLOSE.length)
					this.#opened = true
					continue
				}
			}
			if (open === -1) {
				// No open tag — surface all but a possible partial tag suffix as content
				// (before any tag event a split LEADING close must not leak either, so the
				// close tag's prefixes are held back too).
				const tags = this.#opened ? [THINK_OPEN] : [THINK_OPEN, THINK_CLOSE]
				content += this.#hold(tags)
				return content
			}
			this.#opened = true
			content += this.#pending.slice(0, open)
			this.#pending = this.#pending.slice(open + THINK_OPEN.length)
			this.#inside = true
		}
	}

	// Settle the pending text against the given tags' possible partial suffixes: the
	// LONGEST ambiguous suffix stays pending for the next delta; everything before it
	// is returned for routing.
	#hold(tags: readonly string[]): string {
		const keep = Math.max(...tags.map((tag) => this.#overlap(tag)))
		const cut = this.#pending.length - keep
		const settled = this.#pending.slice(0, cut)
		this.#pending = this.#pending.slice(cut)
		return settled
	}

	// The length of the LONGEST strict prefix of `tag` that suffixes the pending text —
	// how many trailing characters are an ambiguous partial tag and must be held back.
	#overlap(tag: string): number {
		const max = Math.min(this.#pending.length, tag.length - 1)
		for (let length = max; length > 0; length -= 1) {
			if (this.#pending.endsWith(tag.slice(0, length))) return length
		}
		return 0
	}
}
