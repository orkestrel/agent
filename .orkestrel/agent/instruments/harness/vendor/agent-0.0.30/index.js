import { arrayOf, arrayShape, attempt, booleanShape, boundsOf, canonicalStringify, cloneJSONValue, createContract, isArray, isBoolean, isError, isFiniteNumber, isInstance, isJSONValue, isNumber, isObject, isRecord, isString, jsonShape, literalOf, literalShape, nullableOf, numberShape, objectOf, objectShape, optionalOf, optionalShape, parseJSON, parseJSONAs, parseJSONValue, rawShape, recordShape, stringShape, tupleOf, unionShape } from "@orkestrel/contract";
import { ToolManager, createTool, createToolManager, isToolCall } from "@orkestrel/tool";
import { createTokenBudget, isTokenUsage } from "@orkestrel/budget";
import { Timeout, createTimeout } from "@orkestrel/timeout";
import { createDatabase, createMemoryDriver } from "@orkestrel/database";
import { Emitter } from "@orkestrel/emitter";
import { WorkspaceManager, isBinary, isText } from "@orkestrel/workspace";
import { createQueue } from "@orkestrel/queue";
import { createRunner, errorToMessage } from "@orkestrel/workflow";
import { createAbort } from "@orkestrel/abort";
//#region src/core/constants.ts
/**
* Lists the roles a conversation message can play, in the order the wire contract names them —
* the one list the {@link import('./types.js').MessageRole} union derives from, the message
* guard tests membership against, and the message shape passes to its literal contract.
*/
var MESSAGE_ROLES = Object.freeze([
	"system",
	"user",
	"assistant",
	"tool"
]);
//#endregion
//#region src/core/errors.ts
/**
* Reports a judge call cancelled by the caller's signal or its deadline, carrying the
* {@link JudgeResult} merged from the calls that completed before the cancel and the
* machine-readable `code` `'ABORT'`.
*
* @remarks
* `partial` keeps the answers and the usage of every completed call, so usage reported by
* completed calls is retained; a cancel before the first call carries an empty partial. `cause` holds the failure the
* cancel superseded when a throw raced the abort, and is undefined when the cancel was the only
* failure.
*/
var JudgeAbortError = class extends Error {
	/** Names the machine-readable condition — `'ABORT'`: a judge call cancelled mid-flight. */
	code = "ABORT";
	partial;
	constructor(partial, options) {
		super("judge call aborted", options);
		this.name = "JudgeAbortError";
		this.partial = partial;
	}
};
/**
* Narrows a caught value to a {@link JudgeAbortError} through `instanceof`, so a `catch` can
* recover its `partial` result.
*
* @param value - The caught value
* @returns True if the value is a {@link JudgeAbortError}; false otherwise
* @example
* ```ts
* isJudgeAbortError(new JudgeAbortError({ model: 'tev1:0.8b', answers: {} })) // true
* ```
*/
function isJudgeAbortError(value) {
	return isInstance(value, JudgeAbortError);
}
//#endregion
//#region src/core/shapers.ts
/**
* Describes a tool call's JSON wire projection.
*
* @remarks
* The wire is strictly narrower than the domain: non-JSON arguments are refused.
* Calls carry only id, name, and arguments; execution context stays local.
* The guard refuses every extra member; the contract parser drops extra members.
*/
var toolCallShape = objectShape({
	id: stringShape(),
	name: stringShape(),
	arguments: recordShape(jsonShape())
});
/**
* Describes a conversation message's JSON wire projection.
*
* @remarks
* The wire is strictly narrower than Message: non-JSON call arguments are refused,
* and execution context stays local. The guard refuses extra members; the parser drops them.
*/
var messageShape = objectShape({
	id: stringShape(),
	role: literalShape(MESSAGE_ROLES),
	content: stringShape(),
	calls: optionalShape(arrayShape(toolCallShape)),
	call: optionalShape(stringShape()),
	images: optionalShape(arrayShape(stringShape())),
	thinking: optionalShape(stringShape())
});
//#endregion
//#region src/core/contracts.ts
/** Validates and projects conversation messages at a JSON wire boundary. */
var messageContract = createContract(messageShape);
//#endregion
//#region src/core/helpers.ts
/**
* Filters a list of items by a {@link import('./contexts/index.js').ScopeInterface} allow-list of keys —
* `undefined` passes everything, `[]` passes nothing, and a non-empty list passes the listed keys
* alone, order preserved. The pure, total set-membership primitive the context's build step and
* the agent loop's tool-advertise step apply a scope through.
*
* @remarks
* Three-way by the allow-list's shape, so a `Scope` category cleanly expresses "all /
* none / only these":
* - `undefined` ⇒ no constraint — every item passes (returned unchanged).
* - `[]` (empty) ⇒ none pass (no key is in an empty set).
* - a non-empty list ⇒ only items whose `key(item)` is in the list pass.
*
* Order-preserving (it filters `items` in place order, never reorders) and total — never
* throws. Keys are matched by a `Set` for O(1) membership, so a large list is cheap.
*
* @typeParam T - The item type being filtered
* @param allow - The allow-list of keys (`undefined` ⇒ all, `[]` ⇒ none, else only-listed)
* @param items - The items to filter (returned unchanged when `allow` is `undefined`)
* @param key - Extracts the key an item is matched on (for example an instruction's `name`)
* @returns The items that pass the allow-list, in their original order
*
* @example
* ```ts
* const items = [{ name: 'a' }, { name: 'b' }]
* filterAllowList(undefined, items, (i) => i.name) // [{ name: 'a' }, { name: 'b' }] (all)
* filterAllowList([], items, (i) => i.name) // [] (none)
* filterAllowList(['b'], items, (i) => i.name) // [{ name: 'b' }] (only listed)
* ```
*/
function filterAllowList(allow, items, key) {
	if (allow === void 0) return items;
	if (allow.length === 0) return [];
	const set = new Set(allow);
	return items.filter((item) => set.has(key(item)));
}
/**
* Joins the reasoning a run's provider calls separated from the answer — the first call
* seeds the accumulation, a later call appends blank-line separated so each turn's reasoning
* stays readable.
*
* @remarks
* Pure and total. `running` is `undefined` until a call surfaces reasoning, so the first join
* returns `next` verbatim. Each call's non-empty thinking is recorded on the assistant message
* that call appends. The joined result also includes thinking from calls that appended no
* message, such as an aborted call. Only recorded thinking can return to a provider,
* as its `replay` policy allows. Thinking stays out of `content`.
*
* @param running - The reasoning accumulated so far (`undefined` before the first)
* @param next - This call's separated reasoning
* @returns The joined reasoning
*
* @example
* ```ts
* joinThinking(undefined, 'first') // 'first'
* joinThinking('', 'x') // 'x'
* joinThinking('first', 'second') // 'first\n\nsecond'
* ```
*/
function joinThinking(running, next) {
	if (running === void 0 || running.length === 0) return next;
	return next.length === 0 ? running : `${running}\n\n${next}`;
}
/**
* Applies a {@link ThinkingReplay} policy to a conversation, returning the messages a provider
* sends with only the assistant thinking the policy allows.
*
* @remarks
* Pure and total. `'all'` returns the input array itself. `'none'` drops `thinking` from every
* message that carries it. `'turn'` drops it from every message at or before the last `user`
* message and keeps it after, the turn in progress; with no `user` message every message counts
* as inside the turn. A message without `thinking`, or one that keeps it, is the same object;
* a message that loses it is a copy without that member, so no `undefined` member is written.
*
* @param messages - The conversation to project (left unchanged)
* @param replay - The policy naming which thinking stays
* @returns The messages with the policy applied
*
* @example
* ```ts
* const messages = [
* 	{ id: '1', role: 'user', content: 'Plan the trip' },
* 	{ id: '2', role: 'assistant', content: 'Booked', thinking: 'Compare fares first' },
* ]
* stripThinking(messages, 'none') // [{ id: '1', ... }, { id: '2', role: 'assistant', content: 'Booked' }]
* stripThinking(messages, 'turn') // the thinking on '2' stays: it follows the last user message
* ```
*/
function stripThinking(messages, replay) {
	if (replay === "all") return messages;
	const last = replay === "none" ? messages.length - 1 : messages.findLastIndex((one) => one.role === "user");
	return messages.map((message, index) => {
		if (message.thinking === void 0 || index > last) return message;
		const { thinking: _thinking, ...rest } = message;
		return rest;
	});
}
/**
* Sanitizes one reported token count into a safe non-negative integer — a non-finite or
* non-positive value becomes `0`, and a positive fractional value floors down.
*
* @param value - The token count to sanitize
* @returns The floored count, or `0` when the value is non-finite or non-positive
*/
function sanitizeToken(value) {
	return isFiniteNumber(value) && value > 0 ? Math.floor(value) : 0;
}
/**
* Sanitizes a {@link TokenUsage} into safe, non-negative integers — the guard an agent's
* abort-usage path applies to a provider's partial usage before it is charged against a
* budget or folded into the run total.
*
* @remarks
* Per field (`prompt` / `completion` / `total`): a non-finite value (`NaN`, `+Infinity`,
* `-Infinity`) or a negative value floors to `0`; a fractional value floors to its
* non-negative integer part. No upper cap is applied. Total — never throws.
*
* @param usage - The token usage to sanitize (for example a provider's abort-partial usage)
* @returns A new {@link TokenUsage} with every field a safe non-negative integer
*
* @example
* ```ts
* sanitizeUsage({ prompt: -5, completion: NaN, total: 12.7 }) // { prompt: 0, completion: 0, total: 12 }
* ```
*/
function sanitizeUsage(usage) {
	return {
		prompt: sanitizeToken(usage.prompt),
		completion: sanitizeToken(usage.completion),
		total: sanitizeToken(usage.total)
	};
}
/**
* Adds two {@link TokenUsage} values field by field — the running total an agent run keeps
* across its provider calls.
*
* @remarks
* Pure and total: the first call seeds the total (`running` `undefined` returns `next`
* unchanged), later calls accumulate. No sanitization happens here — charge a provider's
* reported usage through {@link sanitizeUsage} first.
*
* @param running - The total so far (`undefined` before the first usage-bearing call)
* @param next - This call's reported usage
* @returns The summed usage
*
* @example
* ```ts
* sumUsage(undefined, { prompt: 2, completion: 1, total: 3 }) // { prompt: 2, completion: 1, total: 3 }
* sumUsage({ prompt: 2, completion: 1, total: 3 }, { prompt: 1, completion: 1, total: 2 })
* // { prompt: 3, completion: 2, total: 5 }
* ```
*/
function sumUsage(running, next) {
	if (running === void 0) return next;
	return {
		prompt: running.prompt + next.prompt,
		completion: running.completion + next.completion,
		total: running.total + next.total
	};
}
/**
* Removes each key through a single-key remover and folds the outcomes, so a batch `remove`
* reports whether the whole batch applied.
*
* @remarks
* Every key is passed to `remove` even after one is missing, so a present key still takes
* effect (and emits) when an earlier key was absent.
*
* @typeParam K - The key type the remover accepts
* @param keys - The keys to remove, in order
* @param remove - Removes one key and returns whether it was present
* @returns True if every key was present and removed; false otherwise (an empty list returns true)
*
* @example
* ```ts
* const stored = new Set(['a', 'b'])
* removeEntries(['a', 'b'], (key) => stored.delete(key)) // true
* removeEntries(['a', 'c'], (key) => stored.delete(key)) // false
* ```
*/
function removeEntries(keys, remove) {
	let removed = true;
	for (const key of keys) if (!remove(key)) removed = false;
	return removed;
}
/**
* Owns a value by serializing it to JSON and parsing the text, so the copy shares nothing with its source.
*
* @remarks
* A value that JSON cannot carry, such as a cycle or a bigint, and a value that serializes to
* nothing, such as a function, both return undefined, so a guard over the result refuses them.
* A proxied value serializes through its traps, where a structured clone refuses it.
*
* @param value - The value to own
* @returns The owned JSON copy, or undefined when the value is not JSON
* @example
* ```ts
* copyJSON({ state: 'A ticket.' }) // { state: 'A ticket.' }
* copyJSON(() => 1) // undefined
* ```
*/
function copyJSON(value) {
	const text = attempt(() => JSON.stringify(value));
	if (!text.success || typeof text.value !== "string") return void 0;
	return parseJSON(text.value);
}
//#endregion
//#region src/core/validators.ts
/**
* Checks whether a value satisfies the domain conversation-message contract.
*
* @remarks
* Roles belong to MessageRole, image elements are strings, `thinking` is a string, and `call` is a string on any
* role, as the flat Message type admits. Tool arguments may carry non-JSON values, as the
* domain type permits; the message wire contract is narrower. Unreadable fields and hostile
* inputs return false.
*
* @param value - The unknown message candidate
* @returns True if the domain message fields are valid; false otherwise
* @example
* ```ts
* isMessage({ id: '1', role: 'user', content: 'hi' }) // true
* isMessage({ id: '1', role: 'other', content: '' }) // false
* isMessage({ id: '1', role: 'user', content: '', images: [1] }) // false
* isMessage({ id: '1', role: 'assistant', content: '', thinking: 1 }) // false
* ```
*/
function isMessage(value) {
	const checked = attempt(() => {
		if (!isRecord(value)) return false;
		const { id, role, content, calls, call, images, thinking } = value;
		if (!isString(id) || !isString(content)) return false;
		if (!MESSAGE_ROLES.some((one) => one === role)) return false;
		if (calls !== void 0 && !arrayOf(isToolCall)(calls)) return false;
		if (call !== void 0 && !isString(call)) return false;
		if (images !== void 0 && !arrayOf(isString)(images)) return false;
		return thinking === void 0 || isString(thinking);
	});
	return checked.success && checked.value;
}
/**
* Checks whether a value is a judge entry: a string, a JSON record, or a JSON array.
*
* @remarks
* Total: a cycle, a non-JSON member, a class instance, and a hostile input return false. `null`
* is not an entry; a criteria guard admits it where the protocol keeps it.
*
* @param value - The unknown entry candidate
* @returns True if the value is a string or JSON structure the model can read; false otherwise
* @example
* ```ts
* isJudgeEntry('Customer asks for a refund') // true
* isJudgeEntry({ ticket: 4182, tags: ['billing'] }) // true
* isJudgeEntry(null) // false
* isJudgeEntry({ opened: new Date() }) // false
* ```
*/
function isJudgeEntry(value) {
	if (isString(value)) return true;
	return (isRecord(value) || isArray(value)) && isJSONValue(value);
}
/**
* Checks whether a value is a well-formed judge question of the choice, score, or noul form.
*
* @remarks
* Total: a hostile input returns false. A choice needs at least 2 options and a score at least 2
* levels, because the confidence formula divides by the candidate count; a description or a level
* can be `null`. `instructions` and noul `criteria` are omitted when absent and never `null`.
* Server limits on option, level, and question counts are left to the server.
*
* @param value - The unknown question candidate
* @returns True if the value is a question the judge engine can send; false otherwise
* @example
* ```ts
* isJudgeQuestion({ form: 'choice', criteria: { billing: null, bug: 'Software defect' } }) // true
* isJudgeQuestion({ form: 'score', criteria: ['Cosmetic', null, 'Blocking'] }) // true
* isJudgeQuestion({ form: 'noul', instructions: 'Is a refund owed?' }) // true
* isJudgeQuestion({ form: 'choice', criteria: { billing: null } }) // false
* ```
*/
function isJudgeQuestion(value) {
	const checked = attempt(() => {
		if (!isRecord(value)) return false;
		const { form, instructions, criteria } = value;
		if (instructions !== void 0 && !isJudgeEntry(instructions)) return false;
		if (form === "choice") return isRecord(criteria) && Object.keys(criteria).length >= 2 && Object.values(criteria).every(nullableOf(isJudgeEntry));
		if (form === "score") return arrayOf(nullableOf(isJudgeEntry))(criteria) && criteria.length >= 2;
		if (form !== "noul") return false;
		if (criteria === void 0) return true;
		if (!isRecord(criteria)) return false;
		return optionalOf(isJudgeEntry)(criteria.true) && optionalOf(isJudgeEntry)(criteria.false);
	});
	return checked.success && checked.value;
}
//#endregion
//#region src/core/providers/constants.ts
/**
* Names the opening tag a {@link import('./ThinkSplitter.js').ThinkSplitter} recognizes as the start of
* an in-content reasoning span — `'<think>'`, the de-facto wire convention thinking models
* (qwen3, DeepSeek-R1 family) emit their chain-of-thought under when a daemon renders it inline
* instead of on a separate wire field. Paired with {@link THINK_CLOSE}.
*/
var THINK_OPEN = "<think>";
/**
* Names the closing tag that ends a {@link THINK_OPEN} reasoning span — `'</think>'`. A span the
* stream never closes (the model was cut off mid-reasoning) is treated as thinking to its end,
* and {@link import('./types.js').ThinkSplitterInterface.flush} settles it.
*/
var THINK_CLOSE = "</think>";
/**
* Holds the default provider deadline in milliseconds — `120_000`, the wall-clock bound a call
* runs under when `AgentProviderInput.timeout` is omitted, folded with the caller's signal so
* whichever trips first cancels the call.
*/
var DEFAULT_PROVIDER_TIMEOUT = 12e4;
/**
* Bounds the decoded error excerpt's input in bytes — `2048`, the leading bytes of a non-OK
* response body handed to the decoder before the read cancels the remainder, so a `ProviderError`
* message never carries a longer excerpt.
*/
var MAX_ERROR_BODY_LENGTH = 2048;
/**
* Holds the default relay request limit in bytes — `1_048_576`, the byte budget a relay applies
* to an inbound body when `RelayOptions.limit` is omitted, refusing a body that reaches it.
*/
var DEFAULT_RELAY_LIMIT = 1048576;
/**
* Names the relay's newline-delimited JSON content type — `'application/x-ndjson; charset=utf-8'`,
* the header a relay response carries beside `cache-control: no-store`.
*/
var RELAY_CONTENT_TYPE = "application/x-ndjson; charset=utf-8";
/**
* Names the public message for an unexpected upstream relay failure — `'relay provider failed'`,
* the fixed text every `error` frame carries, so an upstream failure's own message never reaches
* the browser.
*/
var RELAY_PROVIDER_MESSAGE = "relay provider failed";
/**
* Names the status a relay answers when the `authorize` callback returns anything but `true` or throws —
* `401`, carried with no body and reaching the browser as a `ProviderError` with the `HTTP` code.
*/
var UNAUTHORIZED_RELAY_STATUS = 401;
/**
* Names the status a relay answers when the upstream provider call cannot be constructed — `502`,
* carried with no body after `provider.stream` was entered and threw before returning its
* iterator.
*/
var UPSTREAM_RELAY_STATUS = 502;
/**
* Names the status a relay answers for a body that is missing, unreadable, or rejected by
* `providerRequestContract` — `400`, carried with no body and reaching the browser as a
* `ProviderError` with the `HTTP` code.
*/
var INVALID_RELAY_STATUS = 400;
/**
* Names the status a relay answers for a request body at or above its byte budget — `413`,
* carried with no body and answered for an aborted inbound read as well.
*/
var OVERSIZED_RELAY_STATUS = 413;
/** Names the System One decision endpoint shared by compatible servers. */
var SYSTEM_ONE_PATH = "/v1/systemone";
//#endregion
//#region src/core/providers/errors.ts
/**
* Reports a provider stream cancelled mid-flight by its bound signal — thrown by a
* {@link ProviderInterface}'s `stream`, carrying the {@link ProviderResult} assembled from
* whatever streamed before the cancel and the machine-readable `code` `'ABORT'`.
*
* @remarks
* Lets a caller recover the partial content (and any tool calls / usage seen so far)
* on cancellation: `catch` the throw, narrow with {@link isProviderAbortError}, and
* read `partial`. `code` is the machine-readable condition (`'ABORT'` — the only one this
* error reports), so a `catch` branches on it rather than on the message string. `cause`
* holds the failure the cancel superseded when a throw raced the abort — the wire decoder's
* {@link ProviderError}, say — and is undefined when the cancel was the only failure.
*/
var ProviderAbortError = class extends Error {
	/** Names the machine-readable condition — `'ABORT'`: a stream cancelled mid-flight. */
	code = "ABORT";
	partial;
	constructor(partial, options) {
		super("provider stream aborted", options);
		this.name = "ProviderAbortError";
		this.partial = partial;
	}
};
/**
* Narrows an unknown caught value to a {@link ProviderAbortError} through `instanceof`, so a
* `catch` can recover its `partial` result.
*
* @param value - The value to test (typically a `catch` binding)
* @returns True if `value` is a {@link ProviderAbortError}; false otherwise
*
* @example
* ```ts
* try {
* 	for await (const delta of provider.stream(messages, signal)) render(delta)
* } catch (error) {
* 	if (isProviderAbortError(error)) keep(error.partial.content) // recover partial
* }
* ```
*/
function isProviderAbortError(value) {
	return isInstance(value, ProviderAbortError);
}
/**
* Reports a coded provider failure with its HTTP status and underlying cause when available.
*
* @remarks
* The provider base throws this error for a non-OK HTTP response, a missing response
* body, or a missing settled result when strict assembly is enabled. Concrete wire
* decoders also use it for malformed records and relayed provider failures.
* `status` is present only for an `HTTP` failure; other codes leave it undefined.
*/
var ProviderError = class extends Error {
	/** Names the machine-readable condition — `'HTTP'`: a non-OK response, including a relay refusing an oversized request with 413; `'PROTOCOL'`: a missing response body, a malformed wire record, or a strict stream with no settled result; `'PROVIDER'`: an upstream failure carried by a relay error record. */
	code;
	/** Holds the response status for an HTTP failure, or undefined for other codes. */
	status;
	constructor(code, message, options) {
		super(message, options);
		this.name = "ProviderError";
		this.code = code;
		this.status = options?.status;
	}
};
/**
* Narrows a caught value to the provider failure class through instanceof.
*
* @param value - The caught value
* @returns True if the value is a provider failure; false otherwise
* @example
* ```ts
* isProviderError(new ProviderError('HTTP', 'unavailable', { status: 503 })) // true
* ```
*/
function isProviderError(value) {
	return isInstance(value, ProviderError);
}
/**
* Reports a coded judge failure with its HTTP status and underlying cause when available.
*
* @remarks
* The judge engine throws this error for a non-OK HTTP response, a missing or unparsable
* response body, and a request refused before inference. Concrete wire decoders also use it for
* a response they cannot read and for a wire limit. `status` is present only for an `HTTP`
* failure; other codes leave it undefined.
*/
var JudgeError = class extends Error {
	/** Names the machine-readable condition — `'HTTP'`: a non-OK response; `'PROTOCOL'`: a missing, unparsable, or unreadable response body; `'QUESTION'`: a request refused before inference. */
	code;
	/** Holds the response status for an HTTP failure, or undefined for other codes. */
	status;
	constructor(code, message, options) {
		super(message, options);
		this.name = "JudgeError";
		this.code = code;
		this.status = options?.status;
	}
};
/**
* Narrows a caught value to the judge failure class through `instanceof`.
*
* @param value - The caught value
* @returns True if the value is a {@link JudgeError}; false otherwise
* @example
* ```ts
* isJudgeError(new JudgeError('HTTP', 'judge error: 429', { status: 429 })) // true
* ```
*/
function isJudgeError(value) {
	return isInstance(value, JudgeError);
}
//#endregion
//#region src/core/providers/shapers.ts
/**
* Describes a provider request's JSON wire projection.
*
* @remarks
* The wire is strictly narrower than ProviderRequest: non-JSON arguments, parameters,
* or schema members are refused. Execution context stays local; the guard refuses
* extra members, and the parser drops them.
*/
var providerRequestShape = objectShape({
	messages: arrayShape(messageShape),
	tools: optionalShape(arrayShape(objectShape({
		name: stringShape(),
		description: optionalShape(stringShape()),
		parameters: optionalShape(recordShape(jsonShape()))
	}))),
	options: optionalShape(objectShape({
		think: optionalShape(booleanShape()),
		schema: optionalShape(recordShape(jsonShape()))
	}))
});
/**
* Describes a provider result's JSON wire projection.
*
* @remarks
* The wire is strictly narrower than ProviderResult: non-JSON call arguments are
* refused. Execution context stays local; the guard refuses extra members, and the parser drops them.
*/
var providerResultShape = objectShape({
	content: stringShape(),
	thinking: optionalShape(stringShape()),
	tools: optionalShape(arrayShape(toolCallShape)),
	usage: optionalShape(objectShape({
		prompt: numberShape(),
		completion: numberShape(),
		total: numberShape()
	}))
});
/**
* Describes the channel-discriminated JSON relay wire projection.
*
* @remarks
* The wire is strictly narrower than RelayFrame through its result and partial
* fields: non-JSON arguments are refused. Execution context stays local; the guard
* refuses extra members, and the parser drops them.
*/
var relayFrameShape = unionShape(objectShape({
	channel: literalShape(["content", "thinking"]),
	text: stringShape()
}), objectShape({
	channel: literalShape(["result"]),
	result: providerResultShape
}), objectShape({
	channel: literalShape(["abort"]),
	partial: providerResultShape
}), objectShape({
	channel: literalShape(["error"]),
	message: stringShape()
}));
//#endregion
//#region src/core/providers/contracts.ts
/** Validates and projects provider requests at a JSON wire boundary. */
var providerRequestContract = createContract(providerRequestShape);
/** Validates and projects provider results at a JSON wire boundary. */
var providerResultContract = createContract(providerResultShape);
/** Validates and projects channel-discriminated relay frames at a JSON wire boundary. */
var relayFrameContract = createContract(relayFrameShape);
//#endregion
//#region src/core/providers/helpers.ts
/**
* Assembles a provider result with only populated optional fields.
*
* @param content - The authoritative answer
* @param thinking - The joined reasoning
* @param tools - The accumulated calls
* @param usage - The reported token usage
* @returns The assembled result
* @example
* ```ts
* buildProviderResult('ok', '', [], undefined) // { content: 'ok' }
* ```
*/
function buildProviderResult(content, thinking, tools, usage) {
	return {
		content,
		...thinking.length === 0 ? {} : { thinking },
		...tools.length === 0 ? {} : { tools },
		...usage === void 0 ? {} : { usage }
	};
}
/**
* Cancels a stream reader and releases its lock, swallowing a cancellation failure so the
* caller's own outcome stands.
*
* @param reader - The reader to cancel and release
* @returns A promise that settles after the lock is released
*
* @example
* ```ts
* const body = new Response('answer').body
* if (body !== null) await releaseReader(body.getReader())
* ```
*/
async function releaseReader(reader) {
	try {
		await reader.cancel();
	} catch {} finally {
		reader.releaseLock();
	}
}
/**
* Reads a UTF-8 prefix of a byte stream and cancels its remainder.
*
* @remarks
* The `limit` parameter bounds bytes passed to the decoder, including a partial final
* character. An omitted limit reads to completion. A source may deliver a chunk larger
* than the remaining limit; its unused bytes are discarded without decoding.
* The read can overshoot by one source chunk. An abort leaves completion false.
*
* @param body - The readable byte stream
* @param limit - The maximum byte prefix, or undefined for the complete stream
* @param signal - The optional cancellation bound; abort returns the decoded prefix
* @returns The decoded prefix and whether EOF occurred within the byte budget
* @example
* ```ts
* import { readText } from '@orkestrel/agent'
*
* const body = new Response('answer').body
* if (body !== null) await readText(body, 3) // { text: 'ans', complete: false }
* ```
*/
async function readText(body, limit, signal) {
	const reader = body.getReader();
	const decoder = new TextDecoder();
	const cleanup = new AbortController();
	let remaining = limit ?? Infinity;
	let text = "";
	let complete = false;
	try {
		signal?.addEventListener("abort", () => {
			reader.cancel(signal.reason).catch(() => {});
		}, {
			once: true,
			signal: cleanup.signal
		});
		if (signal?.aborted) await reader.cancel(signal.reason).catch(() => {});
		while (remaining > 0) {
			if (signal?.aborted) break;
			const step = await reader.read();
			if (signal?.aborted) break;
			if (step.done) {
				complete = true;
				break;
			}
			const bytes = step.value.subarray(0, remaining);
			text += decoder.decode(bytes, { stream: true });
			remaining -= bytes.byteLength;
		}
		return {
			text: text + decoder.decode(),
			complete
		};
	} finally {
		cleanup.abort();
		await releaseReader(reader);
	}
}
/**
* Decodes UTF-8 chunks with a final flush and releases the stream on every exit.
*
* @param body - The readable byte stream
* @param signal - The optional cancellation bound; abort ends iteration without further chunks
* @returns Decoded text chunks, including a held decoder tail
* @example
* ```ts
* const body = new Response('answer').body
* if (body !== null) for await (const chunk of readChunks(body)) render(chunk)
* ```
*/
async function* readChunks(body, signal) {
	const reader = body.getReader();
	const decoder = new TextDecoder();
	const cleanup = new AbortController();
	try {
		signal?.addEventListener("abort", () => {
			reader.cancel(signal.reason).catch(() => {});
		}, {
			once: true,
			signal: cleanup.signal
		});
		if (signal?.aborted) {
			await reader.cancel(signal.reason).catch(() => {});
			return;
		}
		for (;;) {
			const step = await reader.read();
			if (signal?.aborted) return;
			if (step.done) break;
			const chunk = decoder.decode(step.value, { stream: true });
			if (chunk.length > 0) yield chunk;
		}
		const tail = decoder.decode();
		if (tail.length > 0) yield tail;
	} finally {
		cleanup.abort();
		await releaseReader(reader);
	}
}
/**
* Derives the winner, its probability, the published confidence, and a score answer's expected
* level from a judge answer's distribution.
*
* @remarks
* The winner is the first strictly greatest candidate in enumeration order: an option name in
* criteria order, a level index, or `'false'` then `'true'` for a noul, so a noul of exactly 0.5
* names `'false'`. Confidence follows the TypeSafe formulas, whatever confidence a server sent: a
* choice reads `(max(p) - 1/n) / (1 - 1/n)`, a noul reads `|2p - 1|` (the choice formula at
* n = 2), and a score reads `max(0, 1 - spread / even_spread)`, where `spread` sums each level's
* probability times its distance from the winning level and `even_spread` is the mean distance
* from the middle level. `score` is the expected level `sum(i * p_i)` and is set only for a score
* answer.
*
* @param answer - The answer whose distribution is read
* @returns The derived measures
* @throws JudgeError Thrown with code `PROTOCOL` when a choice or score answer has fewer than 2
* candidates, because the confidence formulas divide by the candidate count
* @example
* ```ts
* computeReading({ form: 'choice', probabilities: { billing: 0.88, technical: 0.12, sales: 0 } })
* // { winner: 'billing', probability: 0.88, confidence: 0.82 } to two decimals
* computeReading({ form: 'score', probabilities: [0, 0.57, 0.43] })
* // { winner: '1', probability: 0.57, confidence: 0.355, score: 1.43 } to three decimals
* computeReading({ form: 'noul', noul: 0.5 }) // { winner: 'false', probability: 0.5, confidence: 0 }
* ```
*/
function computeReading(answer) {
	if (answer.form === "noul") {
		const yes = answer.noul > .5;
		return {
			winner: yes ? "true" : "false",
			probability: yes ? answer.noul : 1 - answer.noul,
			confidence: Math.abs(2 * answer.noul - 1)
		};
	}
	const candidates = answer.form === "choice" ? Object.entries(answer.probabilities) : answer.probabilities.map((probability, level) => [String(level), probability]);
	const count = candidates.length;
	if (count < 2) throw new JudgeError("PROTOCOL", "judge error: an answer needs at least 2 candidates");
	let winner = "";
	let index = 0;
	let probability = -Infinity;
	for (const [position, [name, candidate]] of candidates.entries()) if (candidate > probability) {
		winner = name;
		index = position;
		probability = candidate;
	}
	if (answer.form === "choice") return {
		winner,
		probability,
		confidence: (probability - 1 / count) / (1 - 1 / count)
	};
	let spread = 0;
	let even = 0;
	let score = 0;
	for (const [level, candidate] of answer.probabilities.entries()) {
		spread += candidate * Math.abs(level - index);
		even += Math.abs(level - (count - 1) / 2);
		score += level * candidate;
	}
	return {
		winner,
		probability,
		confidence: Math.max(0, 1 - spread / (even / count)),
		score
	};
}
/**
* Merges the results of a judge request's calls into one result.
*
* @remarks
* Pure and total. Answers and refusals are joined by question id; `refusals` is omitted when no
* call refused a question. Each call's usage passes through {@link sanitizeUsage} and the totals
* add through {@link sumUsage}; `usage` is omitted when no call reported one. The model is the
* first call's, or the given model when the list is empty, as the empty partial of a cancel
* before the first call requires.
*
* @param model - The judge's configured model, reported when no call completed
* @param results - The completed calls' results in call order
* @returns The merged result
* @example
* ```ts
* buildJudgeResult('tev1:0.8b', []) // { model: 'tev1:0.8b', answers: {} }
* buildJudgeResult('jev-latest', [
* 	{ model: 'jev-1.13.0', answers: { urgent: { form: 'noul', noul: 0.95 } } },
* 	{ model: 'jev-1.13.0', answers: {}, refusals: { team: { missing: ['sales'] } } },
* ])
* // { model: 'jev-1.13.0', answers: { urgent: ... }, refusals: { team: { missing: ['sales'] } } }
* ```
*/
function buildJudgeResult(model, results) {
	let answers = {};
	let refusals = {};
	let usage;
	for (const result of results) {
		answers = {
			...answers,
			...result.answers
		};
		refusals = {
			...refusals,
			...result.refusals
		};
		if (result.usage !== void 0) usage = sumUsage(usage, sanitizeUsage(result.usage));
	}
	return {
		model: results[0]?.model ?? model,
		answers,
		...Object.keys(refusals).length === 0 ? {} : { refusals },
		...usage === void 0 ? {} : { usage }
	};
}
/**
* Builds a request's JSON headers, awaiting the caller's header hook inside the call's
* cancellation bound.
*
* @remarks
* The headers start with `Content-Type: application/json`; each entry the hook returns is set
* over them, so the hook overrides the content type only when it returns that header. The hook
* receives `signal` and races its abort, and the abort listener is removed on every exit. Both
* HTTP engines, the provider and the judge, read their headers here.
*
* @param hook - The caller's header hook, or undefined for the JSON content type alone
* @param signal - The call's combined caller and deadline signal
* @returns The request headers
* @throws Thrown when the signal aborts before the hook settles, with the signal's reason, and
* when the hook throws or rejects, with the hook's own failure
* @example
* ```ts
* const signal = new AbortController().signal
* const headers = await readHeaders(() => ({ authorization: 'Bearer KEY' }), signal)
* headers.get('authorization') // 'Bearer KEY'
* headers.get('content-type') // 'application/json'
* ```
*/
async function readHeaders(hook, signal) {
	const headers = new Headers({ "Content-Type": "application/json" });
	if (hook === void 0) return headers;
	const cleanup = new AbortController();
	const aborted = Promise.withResolvers();
	signal.addEventListener("abort", () => aborted.reject(signal.reason), {
		once: true,
		signal: cleanup.signal
	});
	try {
		signal.throwIfAborted();
		const entries = await Promise.race([Promise.resolve().then(() => hook(signal)), aborted.promise]);
		for (const [key, value] of Object.entries(entries)) headers.set(key, value);
		return headers;
	} finally {
		cleanup.abort();
	}
}
/**
* Projects a judge question onto the System One wire while preserving omitted members.
*
* @param question - The domain question to send
* @returns The wire question with `type` replacing `form`
* @example
* ```ts
* questionToSystemOne({ form: 'noul' }) // { type: 'noul' }
* ```
*/
function questionToSystemOne(question) {
	return {
		type: question.form,
		...question.instructions === void 0 ? {} : { instructions: question.instructions },
		...question.criteria === void 0 ? {} : { criteria: question.criteria }
	};
}
/**
* Extracts a System One distribution in question criteria order and drops server measures.
*
* @remarks
* Every requested candidate must have a finite probability in [0, 1]; the helper checks each
* requested candidate itself and reads no other member. Score maps and arrays project onto the
* requested levels. Additional candidates are ignored, sums are unconstrained, and probabilities
* are preserved without normalization.
*
* @param answer - The wire answer to decode
* @param question - The question defining the form and candidate order
* @returns The domain answer, or undefined for a mismatched form or a requested candidate whose
* probability is missing, not finite, or outside [0, 1]
* @example
* ```ts
* extractSystemOneAnswer({ type: 'noul', noul: 0.9 }, { form: 'noul' })
* // { form: 'noul', noul: 0.9 }
* ```
*/
function extractSystemOneAnswer(answer, question) {
	const bounded = boundsOf(0, 1);
	if (answer.type === "noul" && question.form === "noul") return bounded(answer.noul) ? {
		form: "noul",
		noul: answer.noul
	} : void 0;
	if (answer.type === "choice" && question.form === "choice") {
		const entries = [];
		for (const label of Object.keys(question.criteria)) {
			if (!Object.hasOwn(answer.probabilities, label)) return void 0;
			const probability = answer.probabilities[label];
			if (!bounded(probability)) return void 0;
			entries.push([label, probability]);
		}
		return {
			form: "choice",
			probabilities: Object.fromEntries(entries)
		};
	}
	if (answer.type !== "score" || question.form !== "score") return void 0;
	const probabilities = [];
	for (let level = 0; level < question.criteria.length; level++) {
		if (!Object.hasOwn(answer.probabilities, level)) return void 0;
		const probability = isArray(answer.probabilities) ? answer.probabilities[level] : answer.probabilities[String(level)];
		if (!bounded(probability)) return void 0;
		probabilities.push(probability);
	}
	return {
		form: "score",
		probabilities
	};
}
/**
* Maps complete System One token counts onto validated token usage.
*
* @param usage - The optional wire token counts
* @returns Token usage, or undefined for missing, null, negative, or non-finite counts
* @example
* ```ts
* extractSystemOneUsage({ input_tokens: 975, output_tokens: 4 })
* // { prompt: 975, completion: 4, total: 979 }
* ```
*/
function extractSystemOneUsage(usage) {
	const extracted = attempt(() => {
		if (usage === void 0) return void 0;
		const { input_tokens: prompt, output_tokens: completion } = usage;
		if (!isNumber(prompt) || !isNumber(completion)) return void 0;
		const result = {
			prompt,
			completion,
			total: prompt + completion
		};
		return isTokenUsage(result) ? result : void 0;
	});
	return extracted.success ? extracted.value : void 0;
}
//#endregion
//#region src/core/providers/RelayStream.ts
/**
* Streams a provider call as validated NDJSON frames under response backpressure.
*
* @remarks
* Cancellation aborts upstream before returning its iterator. Request listeners are
* released on settlement. Unexpected provider failures carry a fixed public message.
* An inbound abort leaves the response body neither closed nor errored — a server runtime
* cancels that body when the client disconnects — so a consumer that aborts the inbound
* signal itself must cancel the body rather than keep reading it.
*
* @example
* ```ts
* import type { ProviderInterface } from '@orkestrel/agent'
* import { RelayStream } from '@orkestrel/agent'
*
* export function respond(provider: ProviderInterface, signal: AbortSignal): Response {
* 	return new RelayStream({ provider, request: { messages: [] }, signal }).response
* }
* ```
*/
var RelayStream = class {
	#replay;
	#upstream = new AbortController();
	#encoder = new TextEncoder();
	#iterator;
	#signal;
	#listener;
	#response;
	#settled = false;
	constructor(options) {
		this.#replay = options.provider.replay ?? "none";
		this.#signal = options.signal;
		this.#listener = this.#cancel.bind(this);
		if (this.#signal.aborted) this.#abortProvider();
		this.#iterator = options.provider.stream(stripThinking(options.request.messages, this.#replay), this.#upstream.signal, options.request.tools, options.request.options);
		this.#signal.addEventListener("abort", this.#listener, { once: true });
		this.#response = new Response(new ReadableStream({
			pull: this.#pull.bind(this),
			cancel: this.#cancel.bind(this)
		}), { headers: {
			"content-type": RELAY_CONTENT_TYPE,
			"cache-control": "no-store"
		} });
	}
	/** Exposes the pull-driven response for the provider call. */
	get response() {
		return this.#response;
	}
	async #pull(controller) {
		if (this.#settled) return;
		try {
			const step = await this.#iterator.next();
			if (this.#settled) return;
			this.#write(controller, step.done ? {
				channel: "result",
				result: step.value
			} : step.value);
			if (step.done) this.#finish(controller);
		} catch (error) {
			if (this.#settled) return;
			const frame = isProviderAbortError(error) ? {
				channel: "abort",
				partial: error.partial
			} : {
				channel: "error",
				message: RELAY_PROVIDER_MESSAGE
			};
			this.#write(controller, relayFrameContract.is(frame) ? frame : {
				channel: "error",
				message: RELAY_PROVIDER_MESSAGE
			});
			this.#finish(controller);
			this.#abortProvider();
			await this.#return();
		}
	}
	async #cancel() {
		if (this.#settled) return;
		this.#settled = true;
		this.#abortProvider();
		try {
			await this.#return();
		} finally {
			this.#release();
		}
	}
	async #return() {
		try {
			await this.#iterator.return({ content: "" });
		} catch {}
	}
	#write(controller, frame) {
		if (!relayFrameContract.is(frame)) throw new ProviderError("PROTOCOL", "invalid relay frame");
		controller.enqueue(this.#encoder.encode(`${JSON.stringify(frame)}\n`));
	}
	#finish(controller) {
		this.#settled = true;
		this.#release();
		controller.close();
	}
	#abortProvider() {
		this.#upstream.abort(this.#signal.reason);
	}
	#release() {
		this.#signal.removeEventListener("abort", this.#listener);
	}
};
//#endregion
//#region src/core/providers/AgentProvider.ts
/**
* Implements bounded HTTP streaming and result assembly behind concrete wire seams.
*
* @remarks
* Every call owns its parser, splitter, deadline, and accumulation. Success bodies
* have no size limit. A qwen3 implicit-open reclassification corrects the final
* content while content deltas already yielded cannot be recalled. A subclass fills
* `name`, `frame`, `body`, `read`, and `finish`; the constructor takes the `split`
* and `strict` switches to control reasoning separation and settled-result requirements.
* The `replay` input names which stored thinking the agent and relay send back. Default: `'none'`.
*
* @example Writing a provider for a new wire
* ```ts
* import type {
* 	ProviderIncrement,
* 	ProviderOptions,
* 	ProviderParserInterface,
* 	ProviderRequest,
* } from '@orkestrel/agent'
* import { AgentProvider } from '@orkestrel/agent'
*
* class TextFrame implements ProviderParserInterface<string> {
* 	parse(chunk: string): readonly string[] {
* 		return [chunk]
* 	}
* 	clear(): void {} // Raw text retains no framing state.
* }
*
* interface TextOptions extends ProviderOptions {
* 	readonly url: string
* }
*
* class TextProvider extends AgentProvider<string> {
* 	readonly name = 'text'
* 	constructor(options: TextOptions) {
* 		super({ ...options, path: '/generate' })
* 	}
* 	frame(): ProviderParserInterface<string> {
* 		return new TextFrame()
* 	}
* 	body(request: ProviderRequest): object {
* 		return { messages: request.messages }
* 	}
* 	read(record: string): ProviderIncrement {
* 		return { content: record, thinking: '', tools: [] }
* 	}
* 	finish(_parser: ProviderParserInterface<string>): readonly string[] {
* 		return [] // Raw text retains no records at end of input.
* 	}
* }
* ```
*/
var AgentProvider = class {
	#id;
	#replay;
	#url;
	#path;
	#timeout;
	#transport;
	#headers;
	#split;
	#strict;
	constructor(input) {
		this.#id = crypto.randomUUID();
		this.#replay = input.replay ?? "none";
		this.#url = input.url;
		this.#path = input.path ?? "";
		this.#timeout = input.timeout ?? 12e4;
		this.#transport = input.fetch ?? globalThis.fetch.bind(globalThis);
		this.#headers = input.headers;
		this.#split = input.split ?? true;
		this.#strict = input.strict ?? false;
	}
	/** Exposes the instance's minted UUID. */
	get id() {
		return this.#id;
	}
	/** Names which stored assistant thinking the agent and relay send back. */
	get replay() {
		return this.#replay;
	}
	/**
	* Generates a complete turn by draining the shared stream engine.
	*
	* @param messages - The conversation turns
	* @param signal - The caller's cancellation bound
	* @param tools - The advertised tool definitions
	* @param options - The per-call generation configuration
	* @returns The terminal stream result
	*/
	async generate(messages, signal, tools, options) {
		const stream = this.stream(messages, signal, tools, options);
		let step = await stream.next();
		while (!step.done) step = await stream.next();
		return step.value;
	}
	/**
	* Streams decoded deltas and returns the authoritative or assembled turn result.
	*
	* @param messages - The conversation turns
	* @param signal - The caller's cancellation bound
	* @param tools - The advertised tool definitions
	* @param options - The per-call generation configuration
	* @returns Content and native thinking deltas followed by the settled result
	* @throws ProviderAbortError Thrown when the combined cancellation bound fires
	* @throws ProviderError Thrown for an HTTP or protocol failure
	*/
	async *stream(messages, signal, tools, options) {
		if (signal.aborted) throw new ProviderAbortError({ content: "" });
		const timeout = new Timeout({ ms: this.#timeout });
		timeout.start();
		const combined = AbortSignal.any([timeout.signal, signal]);
		let parser;
		let splitter;
		let state = {
			content: "",
			thinking: "",
			tools: []
		};
		try {
			parser = this.frame();
			splitter = this.#split ? createThinkSplitter() : void 0;
			const response = await this.#request({
				messages,
				...tools === void 0 ? {} : { tools },
				...options === void 0 ? {} : { options }
			}, combined);
			if (response.body === null) throw new ProviderError("PROTOCOL", "provider error: no response body");
			for await (const chunk of readChunks(response.body, combined)) {
				combined.throwIfAborted();
				for (const record of parser.parse(chunk)) {
					yield* this.#fold(record, state, splitter, combined, (increment) => {
						state = increment;
					});
					combined.throwIfAborted();
					if (state.result !== void 0) return state.result;
				}
			}
			combined.throwIfAborted();
			for (const record of this.finish(parser)) {
				yield* this.#fold(record, state, splitter, combined, (increment) => {
					state = increment;
				});
				combined.throwIfAborted();
				if (state.result !== void 0) return state.result;
			}
			const tail = splitter?.flush() ?? "";
			if (tail.length > 0) yield {
				channel: "content",
				text: tail
			};
			combined.throwIfAborted();
			if (this.#strict) throw new ProviderError("PROTOCOL", "provider error: missing settled result");
			return this.#assemble(splitter, state);
		} catch (error) {
			if (combined.aborted) {
				splitter?.flush();
				throw new ProviderAbortError(this.#assemble(splitter, state), error === combined.reason ? void 0 : { cause: error });
			}
			throw error;
		} finally {
			try {
				parser?.clear();
			} finally {
				timeout.clear();
			}
		}
	}
	#assemble(splitter, state) {
		return buildProviderResult(splitter?.content ?? state.content, joinThinking(splitter?.thinking, state.thinking), state.tools, state.usage);
	}
	*#fold(record, previous, splitter, signal, commit) {
		const increment = this.read(record);
		if (increment.result !== void 0) {
			commit(increment);
			return;
		}
		const content = splitter?.split(increment.content) ?? increment.content;
		const usage = increment.usage ?? previous.usage;
		commit({
			content: previous.content + increment.content,
			thinking: previous.thinking + increment.thinking,
			tools: [...previous.tools, ...increment.tools],
			...usage === void 0 ? {} : { usage }
		});
		if (content.length > 0) yield {
			channel: "content",
			text: content
		};
		signal.throwIfAborted();
		if (increment.thinking.length > 0) yield {
			channel: "thinking",
			text: increment.thinking
		};
	}
	async #request(request, signal) {
		const headers = await readHeaders(this.#headers, signal);
		signal.throwIfAborted();
		const response = await this.#transport(this.#url + this.#path, {
			method: "POST",
			headers,
			body: JSON.stringify(this.body(request)),
			signal
		});
		if (!response.ok) {
			let detail;
			try {
				detail = response.body === null ? "" : (await readText(response.body, MAX_ERROR_BODY_LENGTH, signal)).text;
			} catch (cause) {
				throw new ProviderError("HTTP", `provider error: ${response.status} - (error body unavailable)`, {
					status: response.status,
					cause
				});
			}
			signal.throwIfAborted();
			throw new ProviderError("HTTP", `provider error: ${response.status}${detail === "" ? "" : ` - ${detail}`}`, { status: response.status });
		}
		return response;
	}
};
//#endregion
//#region src/core/providers/RelayProvider.ts
/**
* Carries provider calls over an authenticated NDJSON relay endpoint.
*
* @remarks
* Tool execution context stays local; calls carry only `id`, `name`, and `arguments`.
* The wire body is an owned snapshot of
* the projection read through property descriptors, so a serializer reachable only through a
* `get` trap or a prototype is never consulted; an own function-valued property such as a
* `toJSON` method is a value outside JSON and is refused before fetching, with the clone's
* failure as the refusal's `cause`. A remote abort reconstructs a `ProviderAbortError` instance
* without aborting the
* local signal; the `Agent` runtime treats that instance as an error unless its own bound
* signal is aborted.
* Content is preserved verbatim, including literal thinking tags.
* A refusal reaches the browser as a `ProviderError` instance with the `HTTP` code and status.
* This is the browser end alone; {@link createRelay} mounts the server end, and
* {@link createRelayProvider}'s example is the browser half of that pair.
*
* @example
* ```ts
* import type { ProviderResult } from '@orkestrel/agent'
* import { RelayProvider } from '@orkestrel/agent'
* // The browser application supplies this parser dependency.
* import { createNDJSONParser } from '@orkestrel/ndjson'
*
* export function ask(bearer: string, signal: AbortSignal): Promise<ProviderResult> {
* 	const browser = new RelayProvider({
* 		url: 'https://relay.example/relay',
* 		parser: createNDJSONParser,
* 		headers: () => ({ authorization: `Bearer ${bearer}` }),
* 	})
* 	return browser.generate([{ id: 'ask', role: 'user', content: 'ping' }], signal)
* }
* ```
*/
var RelayProvider = class extends AgentProvider {
	#parser;
	constructor(options) {
		const { url, timeout, fetch, headers, replay } = options;
		super({
			url,
			split: false,
			strict: true,
			...timeout === void 0 ? {} : { timeout },
			...fetch === void 0 ? {} : { fetch },
			...headers === void 0 ? {} : { headers },
			...replay === void 0 ? {} : { replay }
		});
		this.#parser = options.parser;
	}
	/** Identifies the relay backend. */
	name = "relay";
	/** Creates fresh framing state for each response. */
	frame() {
		return this.#parser();
	}
	/**
	* Projects declared request fields and refuses values the JSON wire cannot carry.
	*
	* @remarks
	* The snapshot is taken from property descriptors, so a custom serializer a projected
	* value carries is ignored rather than consulted and cannot reach the wire.
	*
	* @param request - The domain conversation and call configuration
	* @returns The validated wire request
	* @throws {ProviderError} Thrown when the snapshot cannot be taken — a hostile read or a
	* value outside JSON — carrying that failure as its `cause`, and when the snapshot the
	* projection produced is not a valid wire request
	*/
	body(request) {
		let snapshot;
		try {
			const projected = {
				messages: request.messages.map((message) => ({
					id: message.id,
					role: message.role,
					content: message.content,
					...message.calls === void 0 ? {} : { calls: message.calls.map((call) => ({
						id: call.id,
						name: call.name,
						arguments: call.arguments
					})) },
					...message.call === void 0 ? {} : { call: message.call },
					...message.images === void 0 ? {} : { images: message.images },
					...message.thinking === void 0 ? {} : { thinking: message.thinking }
				})),
				...request.tools === void 0 ? {} : { tools: request.tools.map((tool) => ({
					name: tool.name,
					...tool.description === void 0 ? {} : { description: tool.description },
					...tool.parameters === void 0 ? {} : { parameters: tool.parameters }
				})) },
				...request.options === void 0 ? {} : { options: {
					...request.options.think === void 0 ? {} : { think: request.options.think },
					...request.options.schema === void 0 ? {} : { schema: request.options.schema }
				} }
			};
			snapshot = cloneJSONValue(projected);
		} catch (cause) {
			throw new ProviderError("PROTOCOL", "relay request is not JSON", { cause });
		}
		if (!providerRequestContract.is(snapshot)) throw new ProviderError("PROTOCOL", "relay request is not JSON");
		return snapshot;
	}
	/**
	* Validates a relay frame and translates its channel into the shared stream engine.
	*
	* @param record - The framed wire record
	* @returns A delta contribution or authoritative result
	* @throws {ProviderAbortError} Thrown for a remote abort carrying its partial
	* @throws {ProviderError} Thrown for a malformed frame or remote provider failure
	*/
	read(record) {
		if (!relayFrameContract.is(record)) throw new ProviderError("PROTOCOL", "invalid relay frame");
		switch (record.channel) {
			case "content": return {
				content: record.text,
				thinking: "",
				tools: []
			};
			case "thinking": return {
				content: "",
				thinking: record.text,
				tools: []
			};
			case "result": return {
				content: "",
				thinking: "",
				tools: [],
				result: record.result
			};
			case "abort": throw new ProviderAbortError(record.partial);
			case "error": throw new ProviderError("PROVIDER", record.message);
		}
	}
	/**
	* Recovers an unterminated final frame by completing its NDJSON line.
	*
	* @param parser - The call's retained framing state
	* @returns Records completed by the final newline
	*/
	finish(parser) {
		return parser.parse("\n");
	}
};
//#endregion
//#region src/core/providers/ThinkSplitter.ts
/**
* Feeds raw content deltas through a tiny stream-stateful state machine that routes everything
* inside a `<think>…</think>` span to `thinking` and returns everything outside it as clean
* content, so a provider yields the answer alone and surfaces the reasoning as
* {@link import('./types.js').ProviderResult.thinking}. A tag split across deltas is held until
* disambiguated, `flush()` settles the stream end, and one splitter serves one stream.
*
* @remarks
* - **Cross-chunk tags.** A tag may arrive split across wire deltas (`'<thi'` then
*   `'nk>'`): any suffix of the pending text that is a strict prefix of a tag being
*   scanned for is held back (neither surfaced nor routed) until the next delta — or
*   `flush()` — disambiguates it. A held tag prefix that never completes is real
*   content; a held close-tag prefix inside a span is thinking.
* - **The implicit leading open (the qwen3-template shape).** Some chat templates
*   pre-seed `<think>` into the prompt scaffold, so the wire stream begins
*   mid-reasoning and only a bare `</think>` appears. Before any tag event, a bare
*   close therefore reclassifies everything surfaced so far (plus the pre-close
*   pending) as thinking — `content` is corrected retroactively (the already-returned
*   prefix cannot be recalled, so `content` is the authoritative accumulation). The
*   rule is one-shot: after any tag event a bare `</think>` is plain text.
* - **Multiple spans** accumulate onto `thinking` in stream order. A nested-looking
*   `<think>` inside an open span is thinking text (no nesting is tracked — the
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
var ThinkSplitter = class {
	#pending = "";
	#inside = false;
	#opened = false;
	#content = "";
	#thinking = "";
	get content() {
		return this.#content;
	}
	get thinking() {
		return this.#thinking;
	}
	split(delta) {
		const out = this.#scan(delta);
		this.#content += out;
		return out;
	}
	flush() {
		const pending = this.#pending;
		this.#pending = "";
		if (this.#inside) {
			this.#thinking += pending;
			this.#inside = false;
			return "";
		}
		this.#content += pending;
		return pending;
	}
	#scan(delta) {
		this.#pending += delta;
		let content = "";
		for (;;) {
			if (this.#inside) {
				const close = this.#pending.indexOf(THINK_CLOSE);
				if (close === -1) {
					this.#thinking += this.#hold([THINK_CLOSE]);
					return content;
				}
				this.#thinking += this.#pending.slice(0, close);
				this.#pending = this.#pending.slice(close + THINK_CLOSE.length);
				this.#inside = false;
				continue;
			}
			const open = this.#pending.indexOf(THINK_OPEN);
			if (!this.#opened) {
				const close = this.#pending.indexOf(THINK_CLOSE);
				if (close !== -1 && (open === -1 || close < open)) {
					this.#thinking += this.#content + content + this.#pending.slice(0, close);
					this.#content = "";
					content = "";
					this.#pending = this.#pending.slice(close + THINK_CLOSE.length);
					this.#opened = true;
					continue;
				}
			}
			if (open === -1) {
				const tags = this.#opened ? [THINK_OPEN] : [THINK_OPEN, THINK_CLOSE];
				content += this.#hold(tags);
				return content;
			}
			this.#opened = true;
			content += this.#pending.slice(0, open);
			this.#pending = this.#pending.slice(open + THINK_OPEN.length);
			this.#inside = true;
		}
	}
	#hold(tags) {
		const keep = Math.max(...tags.map((tag) => this.#overlap(tag)));
		const cut = this.#pending.length - keep;
		const settled = this.#pending.slice(0, cut);
		this.#pending = this.#pending.slice(cut);
		return settled;
	}
	#overlap(tag) {
		const max = Math.min(this.#pending.length, tag.length - 1);
		for (let length = max; length > 0; length -= 1) if (this.#pending.endsWith(tag.slice(0, length))) return length;
		return 0;
	}
};
//#endregion
//#region src/core/providers/AgentJudge.ts
/**
* Implements the bounded HTTP calls, validation, and result merging of a judge behind concrete
* wire seams.
*
* @remarks
* A subclass fills `name`, `body`, and `read`; the constructor takes the `batch` switch that
* decides whether one call carries every question or each question gets its own call in key
* order. `ask` validates the request before any call, builds every body before the first call so
* a wire limit refuses the request before inference, and runs the calls one after another, each
* under its own deadline folded with the caller's signal. A cancel throws a `JudgeAbortError`
* whose `partial` merges the calls that completed. A transport error reaches the caller unchanged.
*
* @example Writing a judge wire
* ```ts
* import type { JudgeRequest, JudgeResult } from '@orkestrel/agent'
* import { AgentJudge, JudgeError } from '@orkestrel/agent'
* import { isFiniteNumber, isRecord } from '@orkestrel/contract'
*
* // A wire whose server answers one yes/no question per call as { "yes": 0.93 }.
* class YesJudge extends AgentJudge {
* 	readonly name = 'yes'
* 	body(request: JudgeRequest): object {
* 		return { model: this.model, state: request.state, questions: request.questions }
* 	}
* 	read(value: unknown, request: JudgeRequest): JudgeResult {
* 		const [id] = Object.keys(request.questions)
* 		if (id === undefined || !isRecord(value) || !isFiniteNumber(value.yes)) {
* 			throw new JudgeError('PROTOCOL', 'judge error: unreadable answer')
* 		}
* 		return { model: this.model, answers: { [id]: { form: 'noul', noul: value.yes } } }
* 	}
* }
*
* const judge = new YesJudge({
* 	url: 'http://localhost:8010',
* 	path: '/v1/yes',
* 	model: 'yes-1',
* 	batch: false,
* })
* ```
*/
var AgentJudge = class {
	#id;
	#url;
	#path;
	#model;
	#timeout;
	#transport;
	#headers;
	#batch;
	constructor(input) {
		this.#id = crypto.randomUUID();
		this.#url = input.url;
		this.#path = input.path ?? "";
		this.#model = input.model;
		this.#timeout = input.timeout ?? 12e4;
		this.#transport = input.fetch ?? globalThis.fetch.bind(globalThis);
		this.#headers = input.headers;
		this.#batch = input.batch ?? true;
	}
	/** Exposes the instance's minted UUID. */
	get id() {
		return this.#id;
	}
	/** Exposes the configured model identity. */
	get model() {
		return this.#model;
	}
	/**
	* Asks every question of the request about its state and merges the answers of every call.
	*
	* @param request - The state and the questions keyed by caller id
	* @param signal - The caller's cancellation bound
	* @returns The merged answers, refusals, and usage of every call
	* @throws JudgeAbortError Thrown when the caller's signal or a call's deadline fires, carrying
	* the merged result of the completed calls
	* @throws JudgeError Thrown with code `QUESTION` for an empty question map, a malformed question
	* or state, or a wire refusal before any call; with code `HTTP` for a non-OK response; and with
	* code `PROTOCOL` for a missing or unparsable response body
	*/
	async ask(request, signal) {
		if (signal.aborted) throw new JudgeAbortError(buildJudgeResult(this.#model, []));
		const state = copyJSON(request.state);
		if (!isJudgeEntry(state)) throw new JudgeError("QUESTION", "judge error: state is not a judge entry");
		const questions = isRecord(request.questions) ? Object.entries(request.questions) : [];
		if (questions.length === 0) throw new JudgeError("QUESTION", "judge error: no questions");
		const entries = [];
		for (const [id, question] of questions) {
			const copy = copyJSON(question);
			if (!isJudgeQuestion(copy)) throw new JudgeError("QUESTION", `judge error: question ${id} is malformed`);
			entries.push([id, copy]);
		}
		const owned = {
			state,
			questions: Object.fromEntries(entries)
		};
		const calls = (this.#batch ? [owned] : entries.map(([id, question]) => ({
			state,
			questions: { [id]: question }
		}))).map((part) => ({
			request: part,
			body: JSON.stringify(this.body(part))
		}));
		const results = [];
		for (const call of calls) results.push(await this.#call(call.request, call.body, signal, results));
		return buildJudgeResult(this.#model, results);
	}
	async #call(request, body, signal, completed) {
		const timeout = new Timeout({ ms: this.#timeout });
		timeout.start();
		const combined = AbortSignal.any([timeout.signal, signal]);
		try {
			const headers = await readHeaders(this.#headers, combined);
			combined.throwIfAborted();
			const response = await this.#transport(this.#url + this.#path, {
				method: "POST",
				headers,
				body,
				signal: combined
			});
			if (!response.ok) {
				let detail;
				try {
					detail = response.body === null ? "" : (await readText(response.body, MAX_ERROR_BODY_LENGTH, combined)).text;
				} catch (cause) {
					throw new JudgeError("HTTP", `judge error: ${response.status} - (error body unavailable)`, {
						status: response.status,
						cause
					});
				}
				combined.throwIfAborted();
				throw new JudgeError("HTTP", `judge error: ${response.status}${detail === "" ? "" : ` - ${detail}`}`, { status: response.status });
			}
			if (response.body === null) throw new JudgeError("PROTOCOL", "judge error: no response body");
			const text = await readText(response.body, void 0, combined);
			combined.throwIfAborted();
			const value = parseJSON(text.text);
			if (value === void 0) throw new JudgeError("PROTOCOL", "judge error: invalid JSON body");
			const result = this.read(value, request);
			combined.throwIfAborted();
			return result;
		} catch (error) {
			if (combined.aborted) throw new JudgeAbortError(buildJudgeResult(this.#model, completed), error === combined.reason ? void 0 : { cause: error });
			throw error;
		} finally {
			timeout.clear();
		}
	}
};
//#endregion
//#region src/core/providers/validators.ts
/**
* Checks whether a value is a System One response envelope with optional model and usage.
*
* @remarks
* Answers remain unknown until checked against their questions. Missing and null usage counts
* are accepted. Extra members are ignored, and unreadable fields return false.
*
* @param value - The unknown response candidate
* @returns True if the envelope fields have their wire types; false otherwise
* @example
* ```ts
* isSystemOneResponse({ answers: {}, usage: { input_tokens: null } }) // true
* ```
*/
function isSystemOneResponse(value) {
	const checked = attempt(() => {
		if (!isRecord(value)) return false;
		const { model, answers, usage } = value;
		if (!optionalOf(isString)(model) || !isRecord(answers)) return false;
		if (usage === void 0) return true;
		if (!isRecord(usage)) return false;
		return optionalOf(nullableOf(isNumber))(usage.input_tokens) && optionalOf(nullableOf(isNumber))(usage.output_tokens);
	});
	return checked.success && checked.value;
}
/**
* Checks whether a value is a System One answer whose type and distribution the wire can read.
*
* @remarks
* The guard checks `type` and the distribution the wire dereferences: the `noul` number for a
* noul, the `probabilities` map for a choice, and the `probabilities` map or dense array for a
* score, each probability a finite number in [0, 1]. The `choice`, `score`, `confidence`, and
* `legend` members are carried unchecked, because the wire never reads them, so a value this
* guard accepts can hold any value in those members. Distribution sums are not constrained;
* values are never normalized. Hostile reads return false.
*
* @param value - The unknown answer candidate
* @returns True if the type and the distribution satisfy the wire contract; false otherwise
* @example
* ```ts
* isSystemOneAnswer({ type: 'noul', noul: 0.9 }) // true
* isSystemOneAnswer({ type: 'score', probabilities: [0.2, 0.8] }) // true
* isSystemOneAnswer({ type: 'noul', noul: 1.1 }) // false
* ```
*/
function isSystemOneAnswer(value) {
	const checked = attempt(() => {
		if (!isRecord(value)) return false;
		const { type } = value;
		if (type === "noul") return boundsOf(0, 1)(value.noul);
		if (type !== "choice" && type !== "score") return false;
		const { probabilities } = value;
		if (type === "score" && isArray(probabilities)) return arrayOf(boundsOf(0, 1))(probabilities);
		return isRecord(probabilities) && Object.values(probabilities).every(boundsOf(0, 1));
	});
	return checked.success && checked.value;
}
//#endregion
//#region src/core/providers/SystemOneJudge.ts
/**
* Carries judge questions over the System One protocol and derives answers from server distributions.
*
* @remarks
* The caller supplies the server origin and model. Every question travels in one request.
* Server measures are ignored; the response model is preserved.
* `headers` supplies authentication through the shared judge engine.
*
* @example Asking a System One server a choice, a noul, and a score
* ```ts
* import { computeReading, createSystemOneJudge } from '@orkestrel/agent'
*
* const judge = createSystemOneJudge({ url: 'http://localhost:11434', model: 'tev1:0.8b' })
* const result = await judge.ask(
* 	{
* 		state: 'Our checkout has returned 500 errors since 9am. I want a refund for today.',
* 		questions: {
* 			label: {
* 				form: 'choice',
* 				instructions: 'Which label fits this ticket?',
* 				criteria: { billing: 'Payments and refunds', bug: 'Software errors', account: null },
* 			},
* 			refund: {
* 				form: 'noul',
* 				instructions: 'Does the customer ask for money back?',
* 				criteria: {
* 					true: 'The customer asks for a refund or for money back.',
* 					false: 'The customer does not ask for money back.',
* 				},
* 			},
* 			severity: {
* 				form: 'score',
* 				instructions: 'How severe is the reported issue?',
* 				criteria: ['Cosmetic; no impact', 'Degraded, workaround exists', 'Blocking; no workaround'],
* 			},
* 		},
* 	},
* 	AbortSignal.timeout(30_000),
* )
* const readings = Object.fromEntries(
* 	Object.entries(result.answers).map(([id, answer]) => [id, computeReading(answer)]),
* )
* result.model // 'tev1:0.8b' — the model the server named
* result.usage // { prompt: 975, completion: 4, total: 979 }
* readings.label // { winner: 'bug', probability: 0.9691, confidence: 0.9536 } to four decimals
* readings.refund // { winner: 'true', probability: 0.9979, confidence: 0.9958 } to four decimals
* readings.severity // { winner: '1', probability: 0.9494, confidence: 0.9241, score: 0.9919 } to four decimals
* ```
*/
var SystemOneJudge = class extends AgentJudge {
	constructor(options) {
		super({
			...options,
			path: SYSTEM_ONE_PATH,
			batch: true
		});
	}
	/** Identifies the System One protocol. */
	name = "systemone";
	/**
	* Projects the state and questions onto the System One request with the configured model.
	*
	* @param request - The state and questions keyed by caller id
	* @returns The System One request body
	*/
	body(request) {
		return {
			state: request.state,
			model: this.model,
			questions: Object.fromEntries(Object.entries(request.questions).map(([id, question]) => [id, questionToSystemOne(question)]))
		};
	}
	/**
	* Decodes requested System One answers and reports the server model and available usage.
	*
	* @param value - The parsed response body
	* @param request - The questions defining the expected answers
	* @returns The decoded distributions, model, and available usage
	* @throws JudgeError Thrown with code `PROTOCOL` for a malformed envelope or an invalid answer naming its question id
	*/
	read(value, request) {
		if (!isSystemOneResponse(value)) throw new JudgeError("PROTOCOL", "judge error: invalid System One response envelope");
		const entries = [];
		for (const [id, question] of Object.entries(request.questions)) {
			if (!Object.hasOwn(value.answers, id)) throw new JudgeError("PROTOCOL", `judge error: question ${id} has no System One answer`);
			const wire = value.answers[id];
			if (!isSystemOneAnswer(wire)) throw new JudgeError("PROTOCOL", `judge error: question ${id} has an invalid System One answer`);
			const answer = extractSystemOneAnswer(wire, question);
			if (answer === void 0) throw new JudgeError("PROTOCOL", `judge error: question ${id} has a mismatched or incomplete System One answer`);
			entries.push([id, answer]);
		}
		const usage = extractSystemOneUsage(value.usage);
		return {
			model: value.model ?? this.model,
			answers: Object.fromEntries(entries),
			...usage === void 0 ? {} : { usage }
		};
	}
};
//#endregion
//#region src/core/providers/factories.ts
/**
* Creates an authorized relay handler that validates a bounded JSON request before streaming.
*
* @remarks
* Answers with the `401` status when authorization refuses or throws, the `400`
* status when the body is missing, unreadable, or invalid, the `413` status when
* the body fills its byte budget or the inbound read is aborted, and the `502`
* status when the upstream provider call cannot be constructed. Refusals carry no body.
*
* @param options - The upstream provider, authorization decision, and optional byte budget
* @returns A fetch-standard handler suitable for a router
* @example Mounting the relay on your server
* ```ts
* import type { ProviderInterface } from '@orkestrel/agent'
* import { createRelay } from '@orkestrel/agent'
* import { createDispatcher } from '@orkestrel/router'
* import { createServer } from '@orkestrel/server'
*
* declare const upstream: ProviderInterface // the server-side provider holding the credential
* declare const bearer: string
*
* const handler = createRelay({
* 	provider: upstream,
* 	authorize: (request) => request.headers.get('authorization') === `Bearer ${bearer}`,
* })
* const dispatcher = createDispatcher({
* 	routes: [{ method: 'POST', path: '/relay', handler }],
* })
*
* export function serve(request: Request): Promise<Response> {
* 	return dispatcher.handle(request, undefined)
* }
*
* const server = createServer({ dispatcher, state: () => undefined })
* await server.start()
* process.on('SIGTERM', () => server.stop()) // signal cancellation, drain, then close the listener
* ```
*/
function createRelay(options) {
	const { provider, authorize, limit } = options;
	return async (request) => {
		try {
			if (await authorize(request) !== true) return new Response(void 0, { status: 401 });
		} catch {
			return new Response(void 0, { status: 401 });
		}
		if (request.body === null) return new Response(void 0, { status: 400 });
		let read;
		try {
			read = await readText(request.body, limit ?? 1048576, request.signal);
		} catch {
			return new Response(void 0, { status: request.signal.aborted ? 413 : 400 });
		}
		if (!read.complete) return new Response(void 0, { status: 413 });
		const parsed = parseJSONAs(read.text, providerRequestContract.is);
		if (parsed === void 0) return new Response(void 0, { status: 400 });
		try {
			return new RelayStream({
				provider,
				request: parsed,
				signal: request.signal
			}).response;
		} catch {
			return new Response(void 0, { status: 502 });
		}
	};
}
/**
* Creates a provider that carries calls through a relay endpoint.
*
* @remarks
* This is the browser end alone. {@link createRelay} mounts the server end, and its example
* is the server half this one pairs with.
*
* @param options - The endpoint, parser factory, and HTTP call configuration
* @returns The concrete relay provider
* @example Reaching the relay from the browser
* ```ts
* import type { ProviderInterface } from '@orkestrel/agent'
* import { createRelayProvider } from '@orkestrel/agent'
* import { createAbort } from '@orkestrel/abort'
* // The browser application supplies this parser dependency.
* import { createNDJSONParser } from '@orkestrel/ndjson'
*
* declare const bearer: string
* const abort = createAbort()
* const messages = [{ id: '1', role: 'user', content: 'Say hello.' }] as const
*
* const browser: ProviderInterface = createRelayProvider({
* 	url: 'https://app.example/relay',
* 	parser: createNDJSONParser,
* 	headers: () => ({ authorization: `Bearer ${bearer}` }),
* })
* const result = await browser.generate(messages, abort.signal) // a ProviderResult like a local provider's
* ```
*/
function createRelayProvider(options) {
	return new RelayProvider(options);
}
/**
* Creates a fresh stream-stateful `<think>` separator — a {@link ThinkSplitterInterface} that
* splits a thinking model's in-content `<think>…</think>` reasoning spans away from the answer,
* delta by delta, so a provider yields clean content alone and surfaces the accumulated
* reasoning as {@link import('./types.js').ProviderResult.thinking}. One splitter serves one
* stream.
*
* @remarks
* Feed each raw wire delta through `split(delta)` (it returns the clean content to
* surface — possibly `''` mid-think) and settle the stream end with `flush()` (a held
* partial open tag that never completed returns as final content; an unclosed think
* span lands on `thinking`). Tags split across deltas are held back until
* disambiguated, multiple spans accumulate in order, and a nested-looking `<think>`
* inside an open span is thinking text. One splitter serves one stream — create
* a fresh one per provider call.
*
* @returns A fresh {@link ThinkSplitterInterface} (state empty, outside any span)
*
* @example
* ```ts
* import { createThinkSplitter } from '@orkestrel/agent'
*
* const splitter = createThinkSplitter()
* const clean = splitter.split('<think>plan the answer</think>Here it is.')
* clean // 'Here it is.'
* splitter.thinking // 'plan the answer'
* ```
*/
function createThinkSplitter() {
	return new ThinkSplitter();
}
/**
* Creates a judge that sends every question through the configured System One server.
*
* @param options - The server origin, model, and optional transport, headers, and timeout
* @returns The configured judge behind its shared interface
* @example
* ```ts
* const judge = createSystemOneJudge({ url: 'http://localhost:11434', model: 'tev1:0.8b' })
* ```
*/
function createSystemOneJudge(options) {
	return new SystemOneJudge(options);
}
//#endregion
//#region src/core/conversations/constants.ts
/**
* Sets the default number of recent live messages a {@link ConversationInterface}'s `compact()`
* retains verbatim — `0`, so a manual `compact()` keeps no recent tail and folds every
* exchange before the newest user message into one summarized section. A caller retains a recent
* tail by passing `keep` (on
* {@link ConversationOptions}, {@link ConversationManagerOptions}, or per-fold through
* {@link CompactOptions}), folding at most the older `count - keep` messages, cut back to whole
* exchanges, and leaving at least the most recent `keep` live for the next turn. Overridable everywhere `keep` is accepted.
*/
var DEFAULT_CONVERSATION_KEEP = 0;
/**
* Names the framing label a {@link ConversationInterface}'s `view()` prefixes onto each compacted
* section's summary so a small model reads it as a condensed recap of earlier turns — the lean
* `'[Summary of earlier messages] '` marker, never a literal assistant turn to echo or treat as
* the live answer.
*
* @remarks
* Deliberately a fixed, lean handful of tokens (a short bracketed marker) so the framing adds a
* bounded `prefix × sections` overhead and never an open-ended blow-up — the
* {@link ConversationInterface} no-bloat test guard pins exactly that. Kept here (beside
* {@link DEFAULT_CONVERSATION_KEEP}) as the conversation layer's one tunable framing constant, so
* the wording has a single source of truth as it is optimized against real small-model behavior
* (the `view()` recap framing is distinct from `reference()`'s cross-conversation provenance
* marker, which is rendered inline since it interpolates the per-call provenance `label`).
*/
var CONVERSATION_RECAP_PREFIX = "[Summary of earlier messages] ";
//#endregion
//#region src/core/conversations/errors.ts
/**
* Reports a conversation with no {@link ConversationSummaryHandler} to fold its messages with, a
* `sections` cap below `1`, or a judgment or judge request that JSON cannot carry — thrown by a
* {@link ConversationInterface}'s `compact()`, its construction, or its judgment store, carrying
* the machine-readable `code` `'SUMMARIZER' | 'SECTIONS' | 'JUDGMENT'`.
*
* @remarks
* Compaction requires a summarizer (it digests the folded slice into a section summary and,
* with the `rollup` option, regenerates the rollup); a conversation created without one can still store + `view()` its
* live tail, but a `compact()` is a programmer error and throws this with `'SUMMARIZER'`.
* A `sections` cap (on {@link import('./types.js').ConversationOptions} /
* {@link import('./types.js').ConversationManagerOptions} /
* {@link import('./types.js').CompactOptions}) must be `>= 1` — a sub-1 cap is a programmer
* error and throws this with `'SECTIONS'`. A judgment record or a judge request that JSON cannot
* carry, or whose copy fails its guard, is a programmer error and throws this with `'JUDGMENT'`.
* Narrow a caught value with
* {@link isConversationError} and branch on `error.code`.
*/
var ConversationError = class extends Error {
	/** Names the machine-readable condition — `'SUMMARIZER'`: a `compact()` with no summarizer; `'SECTIONS'`: a sub-1 `sections` cap; `'JUDGMENT'`: a judgment or judge request that is not JSON. */
	code;
	constructor(code, message) {
		super(message);
		this.name = "ConversationError";
		this.code = code;
	}
};
/**
* Narrows an unknown caught value to a {@link ConversationError} through `instanceof`, so a
* `catch` can branch on its `code`.
*
* @param value - The value to test (typically a `catch` binding)
* @returns True if `value` is a {@link ConversationError}; false otherwise
*
* @example
* ```ts
* try {
* 	await conversation.compact()
* } catch (error) {
* 	if (isConversationError(error) && error.code === 'SUMMARIZER') addSummarizer()
* }
* ```
*/
function isConversationError(value) {
	return isInstance(value, ConversationError);
}
//#endregion
//#region src/core/conversations/helpers.ts
/**
* Collects whole exchanges, joining every exchange spanned by a tool group.
*
* @remarks
* A user message opens an exchange that ends before the next user message. Leading messages
* form their own exchange. A tool group joins every exchange between its first and last member.
*
* @param messages - The messages in prompt order
* @returns The exchanges in prompt order, with each message retained unchanged
* @example
* ```ts
* collectExchanges([
* 	{ id: 'greeting', role: 'assistant', content: 'Welcome.' },
* 	{ id: 'request', role: 'user', content: 'Read the order.' },
* ]) // a leading exchange and a request exchange
* ```
*/
function collectExchanges(messages) {
	const boundaries = /* @__PURE__ */ new Set([0]);
	const positions = new Map(messages.map((message, index) => [message, index]));
	for (const [index, message] of messages.entries()) if (message.role === "user") boundaries.add(index);
	for (const group of collectToolGroups(messages)) {
		let start = messages.length;
		let end = 0;
		for (const message of group) {
			const position = positions.get(message);
			if (position === void 0) continue;
			start = Math.min(start, position);
			end = Math.max(end, position);
		}
		for (const boundary of boundaries) if (start < boundary && boundary <= end) boundaries.delete(boundary);
	}
	const exchanges = [];
	for (const [index, message] of messages.entries()) {
		if (boundaries.has(index)) exchanges.push([]);
		exchanges.at(-1)?.push(message);
	}
	return exchanges;
}
/**
* Builds records for answered or refused request keys, attaching usage only for a single question.
*
* @param request - The request whose question keys define record order
* @param result - The reported answers, refusals, model, and usage
* @param sources - The ordered source message ids
* @param state - The rendered state read by the judge
* @param model - The configured judge identity the records carry
* @returns Inputs for completed question keys in request order
* @example
* ```ts
* buildJudgments(request, result, ['message-a'], 'Charged twice', judge.model)
* ```
*/
function buildJudgments(request, result, sources, state, model) {
	const judgments = [];
	const single = Object.keys(request.questions).length === 1;
	for (const [id, question] of Object.entries(request.questions)) {
		const answer = Object.hasOwn(result.answers, id) ? result.answers[id] : void 0;
		const refusal = result.refusals !== void 0 && Object.hasOwn(result.refusals, id) ? result.refusals[id] : void 0;
		if (answer === void 0 && refusal === void 0) continue;
		judgments.push({
			id,
			question,
			model,
			sources,
			state,
			...answer !== void 0 ? { answer } : refusal !== void 0 ? { refusal } : {},
			...single && result.usage !== void 0 ? { usage: result.usage } : {}
		});
	}
	return judgments;
}
/**
* Matches a recorded question, ordered sources, rendered state, and judge identity by JSON text, so key order counts.
*
* @param judgment - The recorded judgment to compare
* @param question - The question to ask
* @param sources - The ordered source message ids
* @param state - The rendered state to compare
* @param model - The configured judge identity
* @returns True if every identity component matches; false otherwise
* @example
* ```ts
* matchesJudgment(judgment, question, ['message-a'], 'Charged twice', judge.model)
* ```
*/
function matchesJudgment(judgment, question, sources, state, model) {
	return judgment.model === model && judgment.state === state && judgment.sources.length === sources.length && judgment.sources.every((id, index) => id === sources[index]) && JSON.stringify(judgment.question) === JSON.stringify(question);
}
/**
* Builds the raw synthetic summary message for one compacted section — role `'assistant'`, the
* section's stable `id`, and its `summary` verbatim as content.
*
* @remarks
* Pure and total. This is the unframed form an opted-in rollup regeneration digests (a
* summary-of-summaries over the section summaries); the recap label is a `view()`
* presentation concern kept out of what the summarizer re-reads — see
* {@link buildRecapMessage}.
*
* @param section - The compacted section to render
* @returns The synthetic summary message
*
* @example
* ```ts
* buildSummaryMessage({ id: 's1', summary: 'recap', messages: [] })
* // { id: 's1', role: 'assistant', content: 'recap' }
* ```
*/
function buildSummaryMessage(section) {
	return {
		id: section.id,
		role: "assistant",
		content: section.summary
	};
}
/**
* Builds the framed recap message for one compacted section — the same role and stable `id` as
* {@link buildSummaryMessage}, with the content prefixed by {@link
* import('./constants.js').CONVERSATION_RECAP_PREFIX}.
*
* @remarks
* Pure and total. The prefix is what makes a small model read the message as a condensed
* recap of earlier turns rather than a literal assistant turn to echo or answer from. It is a
* fixed handful of tokens, so a conversation's `view()` stays lean however many sections it
* carries.
*
* @param section - The compacted section to render
* @returns The framed recap message
*
* @example
* ```ts
* buildRecapMessage({ id: 's1', summary: 'recap', messages: [] })
* // { id: 's1', role: 'assistant', content: `${CONVERSATION_RECAP_PREFIX}recap` }
* ```
*/
function buildRecapMessage(section) {
	return {
		id: section.id,
		role: "assistant",
		content: `${CONVERSATION_RECAP_PREFIX}${section.summary}`
	};
}
/**
* Collects each assistant message that carries calls together with the tool messages that answer
* it, then each run of tool messages that no assistant message owns.
*
* @remarks
* A tool message belongs to the one assistant message whose calls hold its `call` id. Without that
* unique owner, it belongs to the assistant message that leads its run of tool messages when that
* leader holds the id, repeats a call id, or the tool message has no `call`. Any other tool message
* joins the orphan run it sits in. Compaction and the stock selection each keep a group on one side
* of their cut.
*
* @param messages - The messages in prompt order
* @returns The owned groups in owner order, then the orphan runs, each in prompt order
* @example
* ```ts
* collectToolGroups([
* 	{ id: 'lookup', role: 'assistant', content: '', calls: [{ id: 'order', name: 'lookup', arguments: {} }] },
* 	{ id: 'result', role: 'tool', content: 'LH-81660 is late', call: 'order' },
* ]) // one group holding the lookup call and its result
* ```
*/
function collectToolGroups(messages) {
	const groups = /* @__PURE__ */ new Map();
	const calls = /* @__PURE__ */ new Map();
	for (const message of messages) {
		if (message.role !== "assistant" || !message.calls?.length) continue;
		groups.set(message, [message]);
		for (const call of message.calls) {
			const owners = calls.get(call.id) ?? [];
			owners.push(message);
			calls.set(call.id, owners);
		}
	}
	let leader;
	let orphan = [];
	const orphans = [];
	for (const message of messages) {
		if (message.role !== "tool") {
			leader = groups.has(message) ? message : void 0;
			orphan = [];
			continue;
		}
		const local = leader?.calls ?? [];
		const duplicate = new Set(local.map((call) => call.id)).size !== local.length;
		const paired = leader !== void 0 && (duplicate || message.call === void 0 || local.some((call) => call.id === message.call));
		const owners = message.call === void 0 ? void 0 : calls.get(message.call);
		const owner = owners?.length === 1 ? owners[0] : paired ? leader : void 0;
		const group = owner === void 0 ? void 0 : groups.get(owner);
		if (group !== void 0) group.push(message);
		else {
			if (orphan.length === 0) orphans.push(orphan);
			orphan.push(message);
		}
	}
	return [...groups.values(), ...orphans];
}
//#endregion
//#region src/core/conversations/validators.ts
/**
* Checks whether a stored judgment carries a valid question and exactly one answer or refusal.
*
* @remarks
* Malformed members and unreadable inputs return false. Answer fields follow the root judge
* value types; this storage guard does not impose a wire's probability or candidate limits.
*
* @param value - The unknown stored record
* @returns True if the record satisfies the judgment contract; false otherwise
* @example
* ```ts
* isJudgment({ id: 'q', question: { form: 'noul' }, answer: { form: 'noul', noul: 0.9 }, model: 'judge', sources: [], state: 'text', time: 0 }) // true
* isJudgment({ id: 'q' }) // false
* ```
*/
function isJudgment(value) {
	const checked = attempt(() => {
		if (!isRecord(value)) return false;
		const { answer, refusal } = value;
		if (!objectOf({
			id: isString,
			question: isJudgeQuestion,
			model: isString,
			sources: arrayOf(isString),
			state: isString,
			time: isNumber,
			usage: optionalOf(isTokenUsage)
		}, ["usage"])(value)) return false;
		if (answer === void 0) return objectOf({ missing: arrayOf(isString) })(refusal);
		if (refusal !== void 0 || !isRecord(answer)) return false;
		if (answer.form === "noul") return isNumber(answer.noul);
		if (answer.form === "score") return arrayOf(isNumber)(answer.probabilities);
		return answer.form === "choice" && isRecord(answer.probabilities) && Object.values(answer.probabilities).every(isNumber);
	});
	return checked.success && checked.value;
}
/**
* Checks whether an `unknown` is structurally a {@link Section} record — a `string` `id` and
* `summary` beside a `messages` array of valid {@link Message}s, the per-section step of the
* {@link isConversationSnapshot} read-boundary narrow. Total, never throwing, and never an
* assertion.
*
* @remarks
* A total guard (it never throws — adversarial input returns `false`). It checks the section's
* shape: a record with a `string` `id`, a `string` `summary`, and a `messages` array every element
* of which is a valid {@link Message} record ({@link isMessage}). Enough to safely impose
* the {@link Section} type at a storage boundary without a cast.
*
* @param value - The value to test (one element of a snapshot's `sections` array)
* @returns True if `value` has the structural shape of a {@link Section}; false otherwise
*
* @example
* ```ts
* isSection({ id: 's', summary: 'recap', messages: [{ id: '1', role: 'user', content: 'hi' }] }) // true
* isSection({ id: 's', summary: 'recap', messages: 'nope' }) // false
* isSection({ id: 's', messages: [] }) // false (missing summary)
* ```
*/
function isSection(value) {
	if (!isRecord(value)) return false;
	if (!isString(value.id) || !isString(value.summary)) return false;
	return isArray(value.messages) && value.messages.every(isMessage);
}
/**
* Narrows an `unknown` to a {@link ConversationSnapshot} — a `string` `id`, an optional `string`
* `summary`, and valid `sections` and `messages` arrays; the total boundary guard for an
* untrusted snapshot read (a storage row a
* {@link import('./stores/DatabaseConversationStore.js').DatabaseConversationStore}
* reads back from its opaque JSON column, a snapshot loaded from disk), never throwing. The exact
* analogue of {@link import('@orkestrel/workspace').isWorkspaceSnapshot}.
*
* @remarks
* A total guard (it never throws — adversarial input returns `false`). It checks the snapshot's
* shape: a `string` `id`, an optional `string` `summary` (present-or-absent — the rollup is
* `undefined` until the first compaction), a `sections` array every element of which is a valid
* {@link Section} ({@link isSection}), and a `messages` array every element of which is a
* valid {@link Message} ({@link isMessage}) — enough to safely impose the
* {@link ConversationSnapshot} type at a storage boundary without a cast. The structural twin of
* {@link import('@orkestrel/workspace').isWorkspaceSnapshot}. A malformed blob (a non-record, a missing / non-string `id`, a
* non-string `summary` when present, a non-array `sections` / `messages`, or any malformed
* element) resolves `false`, so a
* {@link import('./stores/DatabaseConversationStore.js').DatabaseConversationStore}
* read yields `undefined` rather than a broken conversation.
*
* @param value - The value to test (an opaque storage read)
* @returns True if `value` has the structural shape of a {@link ConversationSnapshot}; false otherwise
*
* @example
* ```ts
* isConversationSnapshot({ id: 'c1', sections: [], messages: [] }) // true
* isConversationSnapshot({ id: 'c1', summary: 'recap', sections: [], messages: [] }) // true
* isConversationSnapshot({ id: 'c1', sections: 'nope', messages: [] }) // false
* isConversationSnapshot({ sections: [], messages: [] }) // false (missing id)
* ```
*/
function isConversationSnapshot(value) {
	return isRecord(value) && objectOf({
		id: isString,
		summary: optionalOf(isString),
		sections: arrayOf(isSection),
		messages: arrayOf(isMessage),
		judgments: optionalOf(arrayOf(isJudgment))
	}, ["summary", "judgments"])(value);
}
//#endregion
//#region src/core/conversations/JudgmentManager.ts
/**
* Stores judgments in insertion order and asks a judge only for unmatched question identities.
*
* @remarks
* Adding an existing key replaces it without changing its insertion position. Construction
* restores recorded times; adding stamps the current epoch milliseconds. Caller input is owned
* through JSON on arrival, so a proxied record or request is accepted where a structured clone
* refuses it, and records are copied on reads, so callers cannot change the stored identity
* through nested values.
*
* @example
* ```ts
* const judgments = new JudgmentManager()
* const records = await judgments.resolve(judge, request, ['message-a'], signal)
* ```
*/
var JudgmentManager = class {
	#judgments = /* @__PURE__ */ new Map();
	/**
	* Restores records without replacing their storage times.
	* @param judgments - The previously stored judgments to restore. Default: an empty list
	*/
	constructor(judgments = []) {
		for (const judgment of judgments) {
			const owned = this.#own(copyJSON(judgment));
			this.#judgments.set(owned.id, owned);
		}
	}
	get count() {
		return this.#judgments.size;
	}
	add(input) {
		if (isArray(input)) return input.map((one) => this.#store(one));
		return this.#store(input);
	}
	judgment(id) {
		const judgment = this.#judgments.get(id);
		return judgment === void 0 ? void 0 : structuredClone(judgment);
	}
	judgments() {
		return structuredClone([...this.#judgments.values()]);
	}
	remove(ids) {
		if (isArray(ids)) return removeEntries(ids, (id) => this.#judgments.delete(id));
		return this.#judgments.delete(ids);
	}
	clear() {
		this.#judgments.clear();
	}
	async resolve(judge, request, sources, signal) {
		const state = copyJSON(request.state);
		if (!isJudgeEntry(state)) throw new ConversationError("JUDGMENT", "conversation error: the judge state is not a judge entry");
		const rendered = typeof state === "string" ? state : JSON.stringify(state);
		const origins = [...sources];
		const entries = isRecord(request.questions) ? Object.entries(request.questions) : [];
		const resolved = /* @__PURE__ */ new Map();
		const pending = [];
		for (const [id, raw] of entries) {
			const question = copyJSON(raw);
			if (!isJudgeQuestion(question)) throw new ConversationError("JUDGMENT", `conversation error: question ${id} is malformed`);
			const judgment = this.#judgments.get(id);
			if (judgment !== void 0 && matchesJudgment(judgment, question, origins, rendered, judge.model)) resolved.set(id, judgment);
			else pending.push([id, question]);
		}
		if (pending.length > 0) {
			if (signal.aborted) throw new JudgeAbortError({
				model: judge.model,
				answers: {}
			});
			const sub = {
				state,
				questions: Object.fromEntries(pending)
			};
			try {
				const result = await judge.ask(sub, signal);
				for (const judgment of this.add(buildJudgments(sub, result, origins, rendered, judge.model))) resolved.set(judgment.id, judgment);
			} catch (error) {
				if (isJudgeAbortError(error)) this.add(buildJudgments(sub, error.partial, origins, rendered, judge.model));
				throw error;
			}
		}
		return entries.flatMap(([id]) => {
			const judgment = resolved.get(id);
			return judgment === void 0 ? [] : [structuredClone(judgment)];
		});
	}
	#store(input) {
		const copy = copyJSON(input);
		const judgment = this.#own(isRecord(copy) ? {
			...copy,
			time: Date.now()
		} : copy);
		this.#judgments.set(judgment.id, judgment);
		return structuredClone(judgment);
	}
	#own(copy) {
		if (!isJudgment(copy)) throw new ConversationError("JUDGMENT", "conversation error: a judgment must be a JSON record");
		return copy;
	}
};
//#endregion
//#region src/core/conversations/Conversation.ts
/**
* Represents a conversation — a live uncompacted tail of messages it owns directly above a flat
* message store, plus compacted, summarized {@link Section}s, an opt-in rollup `summary`, and
* a `summarizable` flag, with on-demand `rehydrate` and substring `search`, driven by a
* provider-agnostic {@link ConversationSummaryHandler} seam so `core` never imports a provider.
* Observable through its own `emitter`.
*
* @remarks
* - **Live tail + sections.** The conversation owns its live tail directly — `#messages` is an
*   insertion-ordered `Map` of immutable {@link Message}s keyed by their minted id
*   (the same store mechanics a flat manager had, folded in: `add` / `message` / `messages` /
*   `remove` / `clear` / `count`), exactly as a `Workspace` owns its files (no separate
*   per-value manager). `#sections` are the compacted history (oldest → newest), each a
*   summarized slice that retains its originals. `#summary` is the rollup (a
*   summary-of-summaries over all sections), regenerated on each compaction when the `rollup`
*   option is `true`; otherwise it keeps its value, `undefined` or the restored snapshot's.
* - **`view()`.** Each section folds to one synthetic summary message (role `'assistant'` — a
*   prior-context recap — keyed by the section's stable `id`), then the live messages
*   verbatim. The rollup `summary` is not injected (it is separately pull-able); `view()`
*   carries the per-section summaries, which are the compaction benefit.
* - **`compact()`.** Folds the oldest `count - keep` live messages into a new section
*   (its `summary` from `#summarize`), removes them from the live tail by id, regenerates the
*   rollup (a second `#summarize` over all section summaries) when the `rollup` option is
*   `true`, and emits `summary` (only for a regenerated rollup) then `compact`. The fold stops
*   before the newest user message, so the request a run serves and its turns stay live. An
*   exchange is a user message and every message after it up to the next user message. Leading
*   messages form a separate exchange, retained until the first user exchange can also fold.
*   A cut inside an exchange moves back to its start, so a fold removes whole exchanges.
*   A cut inside an assistant call group, which only a group spanning two exchanges allows,
*   moves before the group, so a tool result never stays live without its call. Returns the
*   section, or `undefined` when nothing folds. Throws a {@link ConversationError} when no
*   `#summarize` was supplied. A compaction calls the summarizer for the section digest, and
*   again for the rollup only when `rollup` is `true`.
* - **`rehydrate(id)` / `search(query)`.** `rehydrate` returns a section's full original
*   messages (`[]` for an unknown id) and emits `rehydrate` — a pure read (the caller decides
*   whether to re-add them; `rehydrate` never reinserts). `search` is a case-insensitive
*   substring scan of `content` across all messages (every section's originals + the live tail).
* - **Observable.** The owned {@link emitter} ({@link ConversationEventMap}) carries
*   `compact` / `summary` / `rehydrate`, emitted directly, strictly after the state change;
*   the emitter isolates a listener throw and routes it to its `error` handler (the `error`
*   option), so a buggy observer can never corrupt a compaction.
*
* @example
* ```ts
* const conversation = new Conversation({
* 	summarize: async (m) => `recap of ${m.length}`,
* 	rollup: true,
* })
* conversation.add([
* 	{ role: 'user', content: 'Hello' },
* 	{ role: 'assistant', content: 'Hi there' },
* 	{ role: 'user', content: 'What did I say?' },
* ])
* const section = await conversation.compact() // folds the first two into one summarized section
* conversation.view() // [<recap of 2>, { role: 'user', content: 'What did I say?' }]
* conversation.summary // 'recap of 1' — the rollup over the one section
* ```
*/
var Conversation = class {
	#id;
	#emitter;
	#summarize;
	#keep;
	#cap;
	#rollup;
	#sections = [];
	#summary;
	#messages = /* @__PURE__ */ new Map();
	#judgments;
	constructor(options) {
		const snapshot = options?.snapshot;
		this.#judgments = new JudgmentManager(snapshot?.judgments);
		this.#id = snapshot?.id ?? options?.id ?? crypto.randomUUID();
		this.#emitter = new Emitter({
			...options?.on === void 0 ? {} : { on: options.on },
			...options?.error === void 0 ? {} : { error: options.error }
		});
		this.#summarize = options?.summarize;
		this.#keep = options?.keep ?? 0;
		if (options?.sections !== void 0 && options.sections < 1) throw new ConversationError("SECTIONS", "a sections cap must be >= 1");
		this.#cap = options?.sections;
		this.#rollup = options?.rollup ?? false;
		if (snapshot !== void 0) {
			this.#summary = snapshot.summary;
			for (const section of snapshot.sections) this.#sections.push(section);
			for (const message of snapshot.messages) this.#messages.set(message.id, message);
		}
	}
	get id() {
		return this.#id;
	}
	get judgments() {
		return this.#judgments;
	}
	get emitter() {
		return this.#emitter;
	}
	get summary() {
		return this.#summary;
	}
	get sections() {
		return [...this.#sections];
	}
	get summarizable() {
		return this.#summarize !== void 0;
	}
	get count() {
		return this.#messages.size;
	}
	add(input) {
		if (isArray(input)) return input.map((one) => this.#create(one));
		return this.#create(input);
	}
	message(id) {
		return this.#messages.get(id);
	}
	messages() {
		return [...this.#messages.values()];
	}
	remove(ids) {
		if (isArray(ids)) return removeEntries(ids, (id) => this.#messages.delete(id));
		return this.#messages.delete(ids);
	}
	clear() {
		this.#messages.clear();
	}
	view() {
		return [...this.#sections.map((section) => buildRecapMessage(section)), ...this.#messages.values()];
	}
	async compact(options) {
		const summarize = this.#summarize;
		if (summarize === void 0) throw new ConversationError("SUMMARIZER", "cannot compact a conversation without a summarizer");
		const cap = options?.sections ?? this.#cap;
		if (cap !== void 0 && cap < 1) throw new ConversationError("SECTIONS", "a sections cap must be >= 1");
		const keep = options?.keep ?? this.#keep;
		const live = [...this.#messages.values()];
		const newest = live.findLastIndex((message) => message.role === "user");
		const first = live.findIndex((message) => message.role === "user");
		let fold = Math.min(keep <= 0 ? live.length : live.length - keep, newest === -1 ? live.length : newest);
		let start = 0;
		for (const exchange of collectExchanges(live)) {
			const end = start + exchange.length;
			if (start < fold && fold < end) fold = start;
			start = end;
		}
		if (first >= 0 && fold <= first) fold = 0;
		if (fold <= 0) return void 0;
		const slice = live.slice(0, fold);
		const summary = await summarize(stripThinking(slice, "none"));
		const section = {
			id: crypto.randomUUID(),
			summary,
			messages: slice
		};
		for (const message of slice) this.#messages.delete(message.id);
		this.#sections.push(section);
		if (cap !== void 0 && this.#sections.length > cap) {
			const overflow = this.#sections.length - cap + 1;
			const folded = this.#sections.slice(0, overflow);
			try {
				const merged = {
					id: crypto.randomUUID(),
					summary: await summarize(folded.map((one) => buildSummaryMessage(one))),
					messages: folded.flatMap((one) => one.messages)
				};
				this.#sections.splice(0, overflow, merged);
				this.#emitter.emit("collapse", merged);
			} catch (error) {
				await this.#regenerate(summarize);
				throw error;
			}
		}
		await this.#regenerate(summarize);
		this.#emitter.emit("compact", section);
		return section;
	}
	rehydrate(id) {
		const section = this.#sections.find((one) => one.id === id);
		this.#emitter.emit("rehydrate", id);
		return section === void 0 ? [] : section.messages;
	}
	search(query) {
		const needle = query.toLowerCase();
		return [...this.#sections.flatMap((section) => section.messages), ...this.#messages.values()].filter((message) => message.content.toLowerCase().includes(needle));
	}
	reference(options) {
		const lines = [`[Reference — conversation "${options?.label ?? this.#id}" — NOT part of this conversation]`];
		if (options?.summary !== false && this.#summary !== void 0) lines.push(`Summary: ${this.#summary}`);
		const messages = options?.messages ?? [];
		if (messages.length > 0) {
			lines.push("Relevant messages:");
			for (const message of messages) lines.push(`- ${message.role}: ${message.content}`);
		}
		return lines.join("\n");
	}
	snapshot() {
		return {
			id: this.#id,
			...this.#summary === void 0 ? {} : { summary: this.#summary },
			sections: this.sections,
			messages: this.messages(),
			...this.#judgments.count === 0 ? {} : { judgments: this.#judgments.judgments() }
		};
	}
	async #regenerate(summarize) {
		if (!this.#rollup) return;
		this.#summary = await summarize(this.#sections.map((one) => buildSummaryMessage(one)));
		this.#emitter.emit("summary", this.#summary);
	}
	#create(input) {
		const message = {
			id: crypto.randomUUID(),
			role: input.role,
			content: input.content,
			...input.calls === void 0 ? {} : { calls: input.calls },
			...input.call === void 0 ? {} : { call: input.call },
			...input.images === void 0 ? {} : { images: input.images },
			...input.thinking === void 0 ? {} : { thinking: input.thinking }
		};
		this.#messages.set(message.id, message);
		return message;
	}
};
//#endregion
//#region src/core/conversations/ConversationManager.ts
/**
* Registers {@link Conversation}s keyed by `id`, in insertion order, with an active pointer —
* the id-keyed store over the conversation layer, the `active` / `switch` seam the
* {@link import('../contexts/index.js').AgentContext} renders, and the durable `open` / `save`
* store seam. Event-free (a registry, like
* {@link import('@orkestrel/workspace').WorkspaceManager}); the observability lives on each
* {@link Conversation}.
*
* @remarks
* - **Registry.** Conversations live in an insertion-ordered `Map` keyed by `id`. `add(input?)`
*   mints a {@link Conversation} (its `id` from `input` or `crypto.randomUUID()`), flowing the
*   manager's default `#summarize` / `#keep` / `#rollup` in unless the `input` overrides them, and stores
*   it (an already-present `id` overwrites — last write wins). `count` is the map size,
*   `conversation(id)` looks one up, `conversations()` lists them in insertion order.
* - **Active pointer.** `active` is the active conversation (the agent's message source the
*   context renders), `undefined` until the first `add` (which auto-activates it — a registry
*   with conversations always has one active). A subsequent `add` leaves `active` unchanged.
*   `switch(id)` re-points `active` to the conversation with `id` and returns it; an unknown `id`
*   returns `undefined` and leaves `active` unchanged (the lenient lookup style — never throws,
*   no new error code).
* - **Removal.** `remove` drops one by id, or a batch — `true` only when every supplied id was
*   removed; removing the active conversation sets `active` to `undefined`. `clear` empties the registry
*   and sets `active` to `undefined`.
* - **Event-free.** A purely registry store — no Emitter, no events (each conversation owns
*   its own observable `emitter`).
*
* @example
* ```ts
* const manager = new ConversationManager({ summarize: async (m) => `recap of ${m.length}` })
* const conversation = manager.add() // auto-activates — active === conversation
* manager.add({ id: 'scratch' }) // leaves active unchanged
* manager.switch('scratch') // re-points active to the 'scratch' conversation
* manager.count // 2
* ```
*/
var ConversationManager = class {
	#conversations = /* @__PURE__ */ new Map();
	#active;
	#summarize;
	#keep;
	#sections;
	#rollup;
	#store;
	constructor(options) {
		this.#summarize = options?.summarize;
		this.#keep = options?.keep ?? 0;
		this.#sections = options?.sections;
		this.#rollup = options?.rollup ?? false;
		this.#store = options?.store;
	}
	get count() {
		return this.#conversations.size;
	}
	get active() {
		return this.#active === void 0 ? void 0 : this.#conversations.get(this.#active);
	}
	conversation(id) {
		return this.#conversations.get(id);
	}
	conversations() {
		return [...this.#conversations.values()];
	}
	add(input) {
		const sections = input?.sections ?? this.#sections;
		const summarize = input?.summarize ?? this.#summarize;
		const conversation = new Conversation({
			...input?.id === void 0 ? {} : { id: input.id },
			...input?.on === void 0 ? {} : { on: input.on },
			...summarize === void 0 ? {} : { summarize },
			keep: input?.keep ?? this.#keep,
			...sections === void 0 ? {} : { sections },
			rollup: input?.rollup ?? this.#rollup,
			...input?.snapshot === void 0 ? {} : { snapshot: input.snapshot }
		});
		this.#conversations.set(conversation.id, conversation);
		if (this.#active === void 0) this.#active = conversation.id;
		return conversation;
	}
	switch(id) {
		const conversation = this.#conversations.get(id);
		if (conversation === void 0) return void 0;
		this.#active = id;
		return conversation;
	}
	async open(id) {
		const existing = this.#conversations.get(id);
		if (existing !== void 0) {
			this.#active = id;
			return existing;
		}
		if (this.#store === void 0) return void 0;
		const snapshot = await this.#store.get(id);
		if (snapshot === void 0) return void 0;
		const conversation = this.add({ snapshot });
		this.#active = conversation.id;
		return conversation;
	}
	async save(id) {
		const conversation = this.#conversations.get(id);
		if (this.#store === void 0 || conversation === void 0) return false;
		await this.#store.set(conversation.snapshot());
		return true;
	}
	remove(ids) {
		if (isArray(ids)) return removeEntries(ids, (id) => this.#drop(id));
		return this.#drop(ids);
	}
	clear() {
		this.#conversations.clear();
		this.#active = void 0;
	}
	#drop(id) {
		const removed = this.#conversations.delete(id);
		if (removed && this.#active === id) this.#active = void 0;
		return removed;
	}
};
//#endregion
//#region src/core/conversations/stores/MemoryConversationStore.ts
/**
* Implements the {@link ConversationStoreInterface} in memory — a process-lifetime `Map` of
* {@link ConversationSnapshot}s keyed by conversation id, the default store
* {@link import('../factories.js').createMemoryConversationStore} builds and the default
* backing for `open` / `save`. The exact twin of
* {@link import('@orkestrel/workspace').MemoryWorkspaceStore}.
*
* @remarks
* A plain `Map<string, ConversationSnapshot>` — the snapshot is already pure,
* self-contained JSON, so no encoding is needed for the memory tier. Like the
* {@link import('@orkestrel/workspace').MemoryWorkspaceStore} it twins,
* there is no idle-TTL and no eviction: a persisted conversation lives until an explicit `delete`. A
* durable backend (JSON / SQLite / IndexedDB) swaps in through the same interface without touching
* the {@link import('../ConversationManager.js').ConversationManager} or the
* {@link import('../Conversation.js').Conversation} — its driver-pluggable twin is
* {@link import('./DatabaseConversationStore.js').DatabaseConversationStore} (the snapshot as one
* opaque JSON column).
*
* - **`get` resolves the persisted snapshot for an id**, or `undefined` if none is stored.
* - **`set` inserts / replaces under the snapshot's own `id`** (no separate id param).
* - **`delete` drops a snapshot by id**; an absent id is a no-op (no throw).
*
* The public surface is exactly `get` / `set` / `delete` — no extra members (the method
* bijection with {@link ConversationStoreInterface}). Hydration is a caller concern: a
* {@link import('../ConversationManager.js').ConversationManager} reads a snapshot back and rebuilds
* the live conversation through the `snapshot` option (its `open` / `save`).
*
* @example
* ```ts
* import { createConversation, createMemoryConversationStore } from '@orkestrel/agent'
*
* const store = createMemoryConversationStore()
* const conversation = createConversation()
* conversation.add({ role: 'user', content: 'hello' })
* await store.set(conversation.snapshot())   // persist the conversation
* const snapshot = await store.get(conversation.id)
* await store.delete(conversation.id)        // drop it
* ```
*/
var MemoryConversationStore = class {
	#snapshots = /* @__PURE__ */ new Map();
	/**
	* Resolves the persisted snapshot for `id`, or `undefined` if none is stored.
	*
	* @param id - The conversation id to resolve (a {@link ConversationSnapshot.id})
	* @returns The persisted snapshot, or `undefined` if absent
	*/
	get(id) {
		return Promise.resolve(this.#snapshots.get(id));
	}
	/**
	* Inserts or replaces a snapshot under its own `snapshot.id` (no separate id param —
	* mirroring {@link import('@orkestrel/workspace').WorkspaceStoreInterface}'s `set`).
	*
	* @param snapshot - The snapshot to store (keyed by its `id`)
	* @returns A promise that resolves after the snapshot is stored
	*/
	set(snapshot) {
		this.#snapshots.set(snapshot.id, snapshot);
		return Promise.resolve();
	}
	/**
	* Drops a snapshot by id; an absent id is a no-op (no throw).
	*
	* @param id - The conversation id to drop
	* @returns A promise that resolves after the snapshot is dropped
	*/
	delete(id) {
		this.#snapshots.delete(id);
		return Promise.resolve();
	}
};
//#endregion
//#region src/core/conversations/stores/DatabaseConversationStore.ts
/**
* Backs a {@link ConversationStoreInterface} with one table of the `databases` layer — a
* conversation's durable state is a row holding the snapshot as one opaque JSON column, narrowed
* back on `get` by {@link import('../validators.js').isConversationSnapshot}, so persistence
* reduces to keyed point-access (`get` / `set` / `delete`) over a {@link TableInterface}. The
* driver-pluggable twin of the plain-`Map`
* {@link import('./MemoryConversationStore.js').MemoryConversationStore}, and the exact twin of
* {@link import('@orkestrel/workspace').DatabaseWorkspaceStore}.
*
* @remarks
* The store is driver-agnostic: it holds a single {@link TableInterface} whose backend (memory,
* JSON, SQLite, IndexedDB) is chosen by whoever builds it (the factories), so a JSON / SQLite /
* IndexedDB backend swaps in without touching the
* {@link import('../ConversationManager.js').ConversationManager} or the
* {@link import('../Conversation.js').Conversation} — the same seam as
* {@link import('@orkestrel/workspace').DatabaseWorkspaceStore}. The
* driver defaults to memory ({@link import('../factories.js').createDatabaseConversationStore}
* passes `createMemoryDriver()`), so it also works in memory out of the box; you opt into the
* durable plumbing by passing a JSON / SQLite / IndexedDB driver.
*
* The {@link ConversationSnapshot} is stored as one opaque JSON column — the table is a row of
* `{ id; snapshot }` ({@link ConversationSnapshotRow}), the snapshot the whole JSON blob (a
* `rawShape` column the factory builds) — exactly as `DatabaseWorkspaceStore` stores its snapshot.
* The snapshot is already a complete, self-contained, pure-JSON payload, so storing it whole is
* lossless and keeps the row type flat (`snapshot` reads back as `unknown`).
*
* - **`set(snapshot)` upserts under the snapshot's own `id`** (no separate id param) — it writes
*   the row `{ id: snapshot.id, snapshot }`.
* - **`get(id)` resolves the stored snapshot for an id**, narrowing the opaque JSON column back to
*   a {@link ConversationSnapshot} ({@link import('../validators.js').isConversationSnapshot} — the
*   total guard for an untrusted storage read), or `undefined` if none is stored.
* - **`delete(id)` drops a snapshot by id**; an absent id is a no-op (no throw).
*
* Unlike a session store there is no idle-TTL / eviction — a persisted conversation lives until an
* explicit `delete`. The public surface is exactly `get` / `set` / `delete` — no extra members (the
* method bijection with {@link ConversationStoreInterface}). Hydration stays a caller concern: a
* {@link import('../ConversationManager.js').ConversationManager} reads a snapshot back and rebuilds
* the live conversation through the `snapshot` option (its `open` / `save`).
*
* @example
* ```ts
* import { createConversation, createDatabaseConversationStore } from '@orkestrel/agent'
* import { createMemoryDriver } from '@orkestrel/database'
*
* const store = createDatabaseConversationStore(createMemoryDriver()) // a durable driver swaps in here
* const conversation = createConversation()
* conversation.add({ role: 'user', content: 'hello' })
* await store.set(conversation.snapshot())        // persist the conversation (one JSON column)
* const snapshot = await store.get(conversation.id)
* await store.delete(conversation.id)             // drop it
* ```
*/
var DatabaseConversationStore = class {
	#table;
	/**
	* Wraps a table as a conversation store.
	*
	* @param table - The {@link TableInterface} holding the snapshots — its row is the
	*   {@link ConversationSnapshotRow} `{ id; snapshot }` shape (the snapshot one opaque JSON column)
	*/
	constructor(table) {
		this.#table = table;
	}
	/** Resolves the persisted snapshot for `id`, narrowing the opaque JSON column back to a `ConversationSnapshot`. */
	async get(id) {
		const row = await this.#table.get(id);
		if (row === void 0) return void 0;
		return isConversationSnapshot(row.snapshot) ? row.snapshot : void 0;
	}
	/** Inserts or replaces under the snapshot's own `id` (no separate id param) — the row is `{ id, snapshot }`. */
	async set(snapshot) {
		await this.#table.set({
			id: snapshot.id,
			snapshot
		});
	}
	/** Drops a snapshot by id; an absent id is a no-op (no throw). */
	async delete(id) {
		await this.#table.remove(id);
	}
};
//#endregion
//#region src/core/conversations/factories.ts
/**
* Creates a conversation — a {@link ConversationInterface} grouping messages above a flat
* message store it owns directly, with compaction into summarized sections, an opt-in
* rollup `summary`, on-demand `rehydrate`, and substring `search`, driven by a
* provider-agnostic {@link ConversationSummaryHandler} seam.
*
* @remarks
* Append turns through the conversation's own `add` (the live tail it owns); `view()` is the model input
* (each section as a summary message, then the live tail). `compact()` folds the older live
* messages into a summarized {@link Section}, whole exchanges at a time, and regenerates the
* rollup when `rollup` is `true` — it requires a `summarize` (omitted ⇒ `compact()` throws a
* `ConversationError`); `keep` retains a recent tail (default `DEFAULT_CONVERSATION_KEEP` —
* fold up to the newest user message). `rehydrate(id)` / `search(query)` read the retained
* originals. Observable (`emitter` — `compact` / `summary` / `rehydrate`), wired
* through the reserved `on` option; the emitter isolates a listener throw and routes it to
* its `error` handler (the `error` option), so it can never corrupt a compaction.
*
* @param options - Optional `id` / `on` hooks + the `summarize` seam + `keep` + `rollup` (see {@link ConversationOptions})
* @returns A working {@link ConversationInterface}
*
* @example Conversations & compaction
* ```ts
* import type { ProviderInterface } from '@orkestrel/agent'
* import { createConversation } from '@orkestrel/agent'
*
* declare const provider: ProviderInterface // any concrete implementation supplied by the host app
* // The summarizer seam — built from the provider by the runtime; core stays provider-agnostic.
* // Append the instruction as the FINAL user turn: a chat model emits nothing when the prompt
* // ends on an assistant turn, so a leading-system instruction is unreliable.
* const conversation = createConversation({
* 	summarize: async (messages) =>
* 		(
* 			await provider.generate(
* 				[
* 					...messages,
* 					{ id: 's', role: 'user', content: 'Summarize the conversation so far concisely.' },
* 				],
* 				AbortSignal.timeout(30_000),
* 			)
* 		).content,
* 	keep: 2, // retain at least the two most recent messages verbatim on each compaction
* 	rollup: true, // also regenerate the rollup summary on each compaction
* })
* conversation.add([
* 	{ role: 'user', content: 'My name is Ada.' },
* 	{ role: 'assistant', content: 'Nice to meet you, Ada.' },
* 	{ role: 'user', content: 'Book a table for two at 19:00.' },
* 	{ role: 'assistant', content: 'Booked for two at 19:00.' },
* 	{ role: 'user', content: 'What did I say my name was?' },
* ])
*
* const section = await conversation.compact() // folds the first exchange → a summarized section
* conversation.view() // [<section summary message>, ...the retained recent exchanges] — the model input
* conversation.summary // the regenerated rollup (a summary-of-summaries over all sections)
* conversation.search('ada') // case-insensitive across sections' originals + the live tail
* section && conversation.rehydrate(section.id) // the section's full original messages (a pure read)
* ```
*/
function createConversation(options) {
	return new Conversation(options);
}
/**
* Creates a conversation registry — a {@link ConversationManagerInterface} holding
* {@link ConversationInterface}s keyed by their `id`, in insertion order, with an active pointer:
* the id-keyed store over the conversation layer plus the `active` / `switch` seam the context
* renders. `add` auto-activates the first conversation and flows the registry's default
* `summarize` / `keep` into every conversation it creates.
*
* @remarks
* Starts empty; `add(input?)` mints a {@link ConversationInterface} (its `id` from the input
* or a random UUID), flowing the manager's default `summarize` / `keep` in unless the input
* overrides them, and stores it (an already-present `id` overwrites — last write wins) — and
* auto-activates the first one (a registry with conversations always has one `active`); a later
* `add` leaves `active` unchanged. `switch(id)` re-points `active` (an unknown `id` returns
* `undefined`, leaving `active` unchanged — lenient, never throws); `conversation(id)` /
* `conversations()` look up; `remove` (one or a batch) reports `true` only when every supplied id
* was removed and clears `active` if it was a removed one; `clear` empties it and clears `active`.
* Event-free
* (each conversation owns its own observable `emitter`). A conversation created with neither a
* manager default nor a per-`add` `summarize` cannot `compact` (it throws a `ConversationError`).
*
* @param options - Optional default `summarize` / `keep` (see {@link ConversationManagerOptions})
* @returns An empty {@link ConversationManagerInterface}
*
* @example
* ```ts
* import { createConversationManager } from '@orkestrel/agent'
*
* const conversations = createConversationManager({ summarize: async (m) => `recap of ${m.length}` })
* const chat = conversations.add() // auto-activates — conversations.active === chat
* chat.add({ role: 'user', content: 'Hello' })
* ```
*/
function createConversationManager(options) {
	return new ConversationManager(options);
}
/**
* Creates the in-memory conversation store — a {@link ConversationStoreInterface} backed by a
* process-lifetime `Map` of {@link import('./types.js').ConversationSnapshot}s keyed by conversation
* id, the default backing for the durable {@link ConversationManagerInterface.open} /
* {@link ConversationManagerInterface.save} seam. The exact twin of
* {@link import('@orkestrel/workspace').createMemoryWorkspaceStore}.
*
* @remarks
* A plain `Map` (the snapshot is already pure JSON, so no encoding is needed for the memory tier),
* the structural twin of {@link import('@orkestrel/workspace').createMemoryWorkspaceStore}.
* `get` / `set` / `delete` are async (the
* same shape a durable backend fits); unlike a session store there is no idle-TTL / eviction — a
* persisted conversation lives until an explicit `delete`. Its driver-pluggable twin is
* {@link createDatabaseConversationStore} (the snapshot as one opaque JSON column over a `databases`
* table) — for a durable store pass it a JSON / SQLite / IndexedDB driver, and it swaps in without
* touching the manager or the conversation. Hydration stays a manager concern: read a snapshot back
* and rebuild the live conversation through the `snapshot` option (re-supplying the live
* `summarize` / `keep`).
*
* @returns A memory-backed {@link ConversationStoreInterface}
*
* @example
* ```ts
* import { createConversationManager, createMemoryConversationStore } from '@orkestrel/agent'
*
* const store = createMemoryConversationStore()
* const manager = createConversationManager({ store })
* const conversation = manager.add()
* conversation.add({ role: 'user', content: 'hello' })
* await manager.save(conversation.id)            // persist the conversation
* ```
*/
function createMemoryConversationStore() {
	return new MemoryConversationStore();
}
/**
* Creates a {@link DatabaseConversationStore} over any {@link DriverInterface}, defaulting to
* `createMemoryDriver()` — the durable, driver-pluggable backing for the conversation persistence
* seam, holding each snapshot as one opaque JSON column and standing as the opt-in twin of
* {@link createMemoryConversationStore}. The exact twin of
* {@link import('@orkestrel/workspace').createDatabaseWorkspaceStore}.
*
* @remarks
* Builds a one-table database (`conversations`, keyed by `id`) over the supplied driver, the snapshot
* held as one opaque JSON column — the column map is `{ id; snapshot }` where `snapshot` is a
* `rawShape` (a JSON blob), exactly as
* {@link import('@orkestrel/workspace').createDatabaseWorkspaceStore} stores its snapshot. The
* snapshot is already a complete, self-contained, pure-JSON payload, so storing it whole is lossless
* and keeps the row type flat (the column reads back as `unknown`, narrowed on `get` by
* {@link import('./validators.js').isConversationSnapshot}). The `driver` defaults to
* {@link createMemoryDriver}, so the store also works in memory out of the box; pass a server
* `createJSONDriver` / `createSQLiteDriver` (or a browser IndexedDB driver) for a persistent one —
* the durability is the driver's job, the store engine is shared. It swaps in behind
* {@link ConversationStoreInterface} without touching the manager or the conversation.
*
* @param driver - The storage backend the snapshots persist to (defaults to {@link createMemoryDriver})
* @returns A {@link ConversationStoreInterface} over the driver
*
* @example
* ```ts
* import { createConversationManager, createDatabaseConversationStore } from '@orkestrel/agent'
* import { createMemoryDriver } from '@orkestrel/database'
*
* const store = createDatabaseConversationStore(createMemoryDriver()) // a durable driver swaps in here
* const manager = createConversationManager({ store })
* const conversation = manager.add()
* conversation.add({ role: 'user', content: 'hello' })
* await manager.save(conversation.id)            // persist the conversation (one JSON column)
* ```
*/
function createDatabaseConversationStore(driver = createMemoryDriver()) {
	const columns = {
		id: stringShape(),
		snapshot: rawShape({})
	};
	return new DatabaseConversationStore(createDatabase({
		driver,
		tables: { conversations: columns }
	}).table("conversations"));
}
//#endregion
//#region src/core/contexts/constants.ts
/** Supplies measured needed criteria without choosing the application's threshold. */
var NEEDED_CRITERION = Object.freeze({
	yes: "A states something the work in B must respect",
	no: "A can be left out and the request in B is still done correctly"
});
/**
* Names the section header {@link import('./AgentContext.js').AgentContext}'s `build()` renders the
* active workspace's text files under — `'## Workspace'`, the leading line of the dedicated
* workspace block in the system message and the carrier-split counterpart to the documents and
* images section headers.
*
* @remarks
* `build()` owns the workspace render (a `Workspace` / `WorkspaceManager` stays file-focused — no
* `open` / `format` getters), so this header lives here as the contexts module's one
* workspace-section framing constant rather than on a manager. Each workspace text file renders
* beneath it as a fenced `` File: <path>\n```<language>\n<text>\n``` `` block — the same framing
* the documents section uses — placed immediately after the documents section in the system block.
*/
var WORKSPACE_SECTION_HEADER = "## Workspace";
//#endregion
//#region src/core/contexts/templates.ts
/** Asks whether the marked subject is needed to carry out the marked request correctly. */
var NEEDED_QUESTION = "Is message [A] needed to carry out the request in message [B] correctly?";
//#endregion
//#region src/core/contexts/errors.ts
/**
* Reports a selection configuration that `createSelection` refuses, carrying the
* machine-readable `code` `'THRESHOLD' | 'LIMIT'`.
*
* @remarks
* A `needed` threshold outside the interval above 0.5 up to and including 1, a non-finite one
* included, is a programmer error and throws this with `'THRESHOLD'`. A `limit` that is not a
* nonnegative safe integer is a programmer error and throws this with `'LIMIT'`. Narrow a caught
* value with {@link isSelectionError} and branch on `error.code`.
*/
var SelectionError = class extends Error {
	/** Names the machine-readable condition — `'THRESHOLD'`: a cutoff outside the accepted interval; `'LIMIT'`: a limit that is not a nonnegative safe integer. */
	code;
	constructor(code, message) {
		super(message);
		this.name = "SelectionError";
		this.code = code;
	}
};
/**
* Narrows an unknown caught value to a {@link SelectionError} through `instanceof`, so a
* `catch` can branch on its `code`.
*
* @param value - The value to test (typically a `catch` binding)
* @returns True if `value` is a {@link SelectionError}; false otherwise
*
* @example
* ```ts
* try {
* 	createSelection({ judge, screen, needed: { ...NEEDED_CRITERION, threshold: 0.5 }, limit: 12 })
* } catch (error) {
* 	if (isSelectionError(error) && error.code === 'THRESHOLD') reportCutoff()
* }
* ```
*/
function isSelectionError(value) {
	return isInstance(value, SelectionError);
}
//#endregion
//#region src/core/contexts/helpers.ts
/**
* Encodes a condition and its ordered message ids without separator ambiguity.
* @param condition - The needed condition
* @param subject - The screened message id
* @param object - The request message id
* @returns The JSON tuple used as the judgment key
* @example
* ```ts
* buildConditionKey('needed', 'a', 'b') // '["needed","a","b"]'
* ```
*/
function buildConditionKey(condition, subject, object) {
	return JSON.stringify([
		condition,
		subject,
		object
	]);
}
/**
* Builds the fixed needed question with the application's true and false criteria.
* @param needed - The true and false criteria, such as `NEEDED_CRITERION`
* @returns The binary question whose instructions remain stable across compaction
* @example
* ```ts
* buildNeededQuestion(NEEDED_CRITERION)
* ```
*/
function buildNeededQuestion(needed) {
	return {
		form: "noul",
		instructions: NEEDED_QUESTION,
		criteria: {
			true: needed.yes,
			false: needed.no
		}
	};
}
/**
* Renders the view with subject and request markers, appending a folded request as evidence.
*
* @remarks
* A message's `images` and `thinking` members are left out, so neither a base64 payload nor
* reasoning enters the state or the bytes a judgment reuse compares.
* @param messages - The conversation view in prompt order
* @param subject - The screened message id marked [A]
* @param request - The user message marked [B], even when absent from the view
* @returns The complete state whose bytes determine judgment reuse
* @example
* ```ts
* renderSelectionState([], 'earlier', { id: 'request', role: 'user', content: 'Continue.' })
* ```
*/
function renderSelectionState(messages, subject, request) {
	return (messages.some((message) => message.id === request.id) ? messages : [...messages, request]).map((message) => {
		const markers = `${message.id === subject ? "[A]" : ""}${message.id === request.id ? "[B]" : ""}`;
		const text = Object.fromEntries(Object.entries(message).filter(([key]) => key !== "images" && key !== "thinking"));
		return `${markers} ${JSON.stringify(text)}`;
	}).join("\n");
}
/**
* Derives needed conditions from matching recorded judgments without asking a judge.
*
* @remarks
* The threshold must lie in the interval above 0.5 up to and including 1, and `createSelection`
* refuses any other value. The helper reads the true side first.
*
* @param conversation - The conversation supplying the view and recorded judgments
* @param request - The user message the selection serves
* @param options - The judge identity, screen, and application criterion
* @returns One applicability per distinct screened id present in the view, in screen order
* @example
* ```ts
* inferApplicability(conversation, request, { judge, screen, needed })
* ```
*/
function inferApplicability(conversation, request, options) {
	const view = conversation.view();
	const present = new Set(view.map((message) => message.id));
	const question = buildNeededQuestion(options.needed);
	return [...new Set(options.screen(conversation, request))].filter((id) => present.has(id)).map((id) => {
		const judgment = conversation.judgments.judgment(buildConditionKey("needed", id, request.id));
		if (judgment === void 0 || !matchesJudgment(judgment, question, [id, request.id], renderSelectionState(view, id, request), options.judge.model) || judgment.answer?.form !== "noul") return { id };
		const probability = judgment.answer.noul;
		if (probability >= options.needed.threshold) return {
			id,
			needed: true
		};
		if (probability <= 1 - options.needed.threshold) return {
			id,
			needed: false
		};
		return { id };
	});
}
/**
* Filters decisively unneeded subjects while preserving requests, whole exchanges, and complete
* tool groups.
*
* @remarks
* An exchange is a user message and every message after it up to the next user message. Leading
* messages form their own exchange. An exchange and a tool group from
* {@link import('../conversations/helpers.js').collectToolGroups}
* are each kept whole when any member is kept and dropped whole only when every member is
* dropped. A tool group that spans two exchanges joins them, so keeping one keeps both.
*
* @param messages - The conversation view in prompt order
* @param applicability - The screened subjects and their recorded conditions
* @param request - The request whose id must be retained when present
* @returns A subset of the original messages in their original order
* @example
* ```ts
* filterSelectionMessages(conversation.view(), applicability, request)
* ```
*/
function filterSelectionMessages(messages, applicability, request) {
	const dropped = new Set(applicability.filter((entry) => entry.needed === false).map((entry) => entry.id));
	dropped.delete(request.id);
	return collectExchanges(messages).flatMap((exchange) => exchange.some((message) => !dropped.has(message.id)) ? exchange : []);
}
/**
* Renders a path-addressed text body as a fenced reference block — a `File: <path>` label line
* over a language-tagged fence, the framing an
* {@link import('./AgentContext.js').AgentContext}'s active-workspace text-file render emits.
*
* @remarks
* Produces `` File: <path>\n```<language>\n<content>\n``` `` — the `File:` label line, then a
* fenced code block tagged with `language`, the `content` verbatim inside. Pure string assembly,
* total — never throws. The one fenced-file format string for the whole module — `AgentContext.build()`
* frames an active workspace's text files with it (each carries its own `language` on its
* {@link import('@orkestrel/workspace').FileContent} text arm).
*
* @param path - The file path shown on the `File:` label line
* @param language - The fenced-code language tag (for example `'typescript'`)
* @param content - The file body rendered verbatim inside the fence
* @returns The fenced reference block
*
* @example
* ```ts
* import { renderFencedFile } from '@orkestrel/agent'
*
* renderFencedFile('src/main.ts', 'typescript', 'const x = 1')
* // 'File: src/main.ts\n```typescript\nconst x = 1\n```'
* ```
*/
function renderFencedFile(path, language, content) {
	return `File: ${path}\n\`\`\`${language}\n${content}\n\`\`\``;
}
/**
* Renders one context section — the resolved `open`, each item's rendering, and the resolved
* `close` when one exists, blank-line joined; `undefined` when the section has no items.
*
* @remarks
* Pure and total. A section with no items renders nothing (`undefined`), so an empty or fully
* scoped-out manager stays silent — its `open` / `close` never appear without items. `close`
* is the only optional slot: an unset one (there is no built-in close) drops the
* trailing line.
*
* @typeParam T - The section item being rendered
* @param open - The section's resolved leading text
* @param items - The already scope-filtered items
* @param render - Renders one item to its prompt text
* @param close - The section's resolved trailing text, or `undefined` for none
* @returns The rendered section, or `undefined` when there are no items
*
* @example
* ```ts
* renderSection('## Instructions', [{ content: 'Be terse.' }], (one) => one.content, undefined)
* // '## Instructions\n\nBe terse.'
* renderSection('<rules>', [], (one) => one.content, '</rules>') // undefined (no items)
* ```
*/
function renderSection(open, items, render, close) {
	if (items.length === 0) return void 0;
	const lines = [open, ...items.map(render)];
	if (close !== void 0) lines.push(close);
	return lines.join("\n\n");
}
/**
* Copies a message with image data merged onto its `images` — the message's own images first,
* then the attached data, carrying `calls` only when present and never mutating the original.
*
* @remarks
* Pure and total: the original message is never mutated. `calls` is carried only when the
* source message has one (kept omitted otherwise, mirroring the store's present-when-given
* convention).
*
* @param message - The message to copy (left unchanged)
* @param data - The base64 image data to attach
* @returns A new message carrying the merged `images`
*
* @example
* ```ts
* attachImages({ id: '1', role: 'user', content: 'Describe' }, ['<payload>'])
* // { id: '1', role: 'user', content: 'Describe', images: ['<payload>'] }
* ```
*/
function attachImages(message, data) {
	const images = [...message.images ?? [], ...data];
	return message.calls === void 0 ? {
		id: message.id,
		role: message.role,
		content: message.content,
		images
	} : {
		id: message.id,
		role: message.role,
		content: message.content,
		calls: message.calls,
		images
	};
}
/**
* Attaches image data to a conversation's last user message — the turn a vision provider reads
* images off — as a new array with that one message replaced by its carrying copy, and unchanged
* when there is no data or no user turn.
*
* @remarks
* Pure and total: the conversation and its messages are never mutated, and the returned array
* replaces exactly the one target message with the copy {@link attachImages} builds. Empty
* data returns the conversation unchanged; a conversation with no user message returns it
* unchanged too (there is nowhere to attach, and the images already rode the system block).
*
* @param conversation - The messages to attach into (left unchanged)
* @param data - The base64 image data to attach
* @returns The conversation with its last user message replaced by the carrying copy
*
* @example
* ```ts
* attachUserImages([{ id: '1', role: 'user', content: 'Describe' }], ['<payload>'])
* // [{ id: '1', role: 'user', content: 'Describe', images: ['<payload>'] }]
* ```
*/
function attachUserImages(conversation, data) {
	if (data.length === 0) return conversation;
	let target = -1;
	for (let index = conversation.length - 1; index >= 0; index -= 1) if (conversation[index]?.role === "user") {
		target = index;
		break;
	}
	if (target === -1) return conversation;
	return conversation.map((message, index) => index === target ? attachImages(message, data) : message);
}
/**
* Collects the `base64` payload of the image files in a workspace file list — the data an agent
* context attaches to the last user message.
*
* @remarks
* Pure and total. `isBinary` narrows the tagless content to its binary arm (a total guard,
* never an assertion), then the MIME prefix gates it to an image, so a text file and a non-image
* binary (a PDF) are both skipped. Order follows the file list.
*
* @param files - The (already scope-filtered) workspace files
* @returns The `base64` payload of each image file, in file order
*
* @example
* ```ts
* collectImageData([createFile({ path: 'a.png', content: { base64: '<payload>', mime: 'image/png' } })])
* // ['<payload>']
* ```
*/
function collectImageData(files) {
	const data = [];
	for (const file of files) if (isBinary(file.content) && file.content.mime.startsWith("image/")) data.push(file.content.base64);
	return data;
}
/**
* Intersects two scope category lists under the "`undefined` is the universal set" rule — a
* fresh copy that can only tighten, and the primitive a scope narrows through.
*
* @remarks
* Pure and total, and it can only tighten: `undefined` ∩ `undefined` is `undefined` (still no
* constraint); `undefined` ∩ a list is a copy of that list (the `undefined` side imposes
* nothing); a list ∩ a list keeps the child keys the parent also allows, so a parent-excluded
* key can never be re-admitted. Every returned list is a fresh copy, so a later mutation of
* either input cannot leak into the result.
*
* @param parent - The parent's allow-list (`undefined` ⇒ no constraint)
* @param child - The narrowing allow-list (`undefined` ⇒ no constraint)
* @returns The intersected allow-list, or `undefined` when neither side constrains
*
* @example
* ```ts
* intersectKeys(['read', 'write'], ['write', 'admin']) // ['write']
* intersectKeys(undefined, ['read']) // ['read']
* intersectKeys(undefined, undefined) // undefined
* ```
*/
function intersectKeys(parent, child) {
	if (parent === void 0) return child === void 0 ? void 0 : [...child];
	if (child === void 0) return [...parent];
	const allowed = new Set(parent);
	return child.filter((key) => allowed.has(key));
}
//#endregion
//#region src/core/contexts/parsers.ts
/**
* Parses a judgment id as a needed condition key, the inverse of `buildConditionKey`.
* @param key - The judgment id to read
* @returns The condition, subject id, and request id, or `undefined` when the id is not a needed key
* @example
* ```ts
* parseConditionKey('["needed","a","b"]') // ['needed', 'a', 'b']
* parseConditionKey('other-condition') // undefined
* ```
*/
function parseConditionKey(key) {
	return parseJSONAs(key, tupleOf(literalOf("needed"), isString, isString));
}
//#endregion
//#region src/core/contexts/instructions/Instruction.ts
/**
* Represents an immutable named directive — an {@link InstructionInterface} assembled once from
* its input (`name` / `content`, an optional `priority` defaulting to `0`), the `id` minted at
* construction.
*
* @remarks
* A thin immutable value object (mirroring {@link import('@orkestrel/tool').Tool}): the
* constructor mints a fresh `id` (`crypto.randomUUID()`), copies the input's `name` /
* `content`, resolves `priority` to the input's value or `0`, and carries the input's
* per-item `override` only when supplied (assigned when present, mirroring a
* message's `images` / `calls` present-when-given convention — kept absent otherwise).
* Never mutated after construction. An
* {@link import('./InstructionManager.js').InstructionManager} keys it by `name` and
* renders it (highest `priority` first) under its section header.
*
* @example
* ```ts
* const instruction = new Instruction({ name: 'tone', content: 'Be concise.', priority: 5 })
* instruction.priority // 5
* ```
*/
var Instruction = class {
	id;
	name;
	content;
	priority;
	override;
	constructor(input) {
		this.id = crypto.randomUUID();
		this.name = input.name;
		this.content = input.content;
		this.priority = input.priority ?? 0;
		if (input.override !== void 0) this.override = input.override;
	}
};
//#endregion
//#region src/core/contexts/instructions/InstructionManager.ts
/**
* Registers the immutable {@link Instruction}s a richer context assembles a directives block
* from — keyed by `name` so a re-`add` overwrites, last write wins, and listed by descending
* `priority`, carrying the `open` / `render` / `close` build contract and an observable `emitter`.
*
* @remarks
* - **Registry.** Instructions live in an insertion-ordered `Map` keyed by `name`;
*   `add` takes one {@link InstructionInput} or a batch, mints each instruction's
*   `id`, and a re-`add` of the same name overwrites it (last write wins). `count` is the
*   map size, `instruction(name)` looks one up, and `instructions()` lists them sorted by
*   descending `priority` (a stable sort, so equal priorities keep insertion order).
* - **Build contract (the whole format cascade).** `open` is the section header a context
*   renders the instructions under, `render(instruction)` renders one instruction, and
*   `close` is the line after them. Each resolves the cascade most-specific-first: `render`
*   returns the instruction's {@link InstructionInput.override}, else the
*   `InstructionManagerOptions.format` `render`, else its `content`; `open` returns the
*   options `open`, else the built-in header; `close` returns the options `close`, else
*   `undefined`. A context reads the three and frames the section from them (see
*   {@link import('../AgentContext.js').AgentContext}).
* - **Removal.** `remove` drops one by name, or a batch — `true` only when every supplied
*   name was removed; `clear` empties the registry.
* - **Observable.** The owned {@link emitter} ({@link InstructionManagerEventMap})
*   carries `add` (the created instruction) / `remove` (the name) / `clear` for
*   fire-and-forget observers. Every event is emitted directly, strictly after the map
*   mutation completes; the emitter isolates a listener throw and routes it to its `error`
*   handler (the `error` option), so a buggy observer can never corrupt a mutation.
*
* @example
* ```ts
* const manager = new InstructionManager()
* manager.add([
* 	{ name: 'tone', content: 'Be concise.', priority: 1 },
* 	{ name: 'safety', content: 'Refuse unsafe requests.', priority: 10 },
* ])
* manager.instructions().map((one) => one.name) // ['safety', 'tone'] — highest priority first
* ```
*/
var InstructionManager = class {
	#instructions = /* @__PURE__ */ new Map();
	#emitter;
	#format;
	constructor(options) {
		this.#emitter = new Emitter({
			...options?.on === void 0 ? {} : { on: options.on },
			...options?.error === void 0 ? {} : { error: options.error }
		});
		this.#format = options?.format;
	}
	get emitter() {
		return this.#emitter;
	}
	get count() {
		return this.#instructions.size;
	}
	get open() {
		return this.#format?.open ?? "## Instructions";
	}
	get close() {
		return this.#format?.close;
	}
	add(input) {
		if (isArray(input)) return input.map((one) => this.#create(one));
		return this.#create(input);
	}
	instruction(name) {
		return this.#instructions.get(name);
	}
	instructions() {
		return [...this.#instructions.values()].sort((a, b) => b.priority - a.priority);
	}
	render(instruction) {
		return instruction.override ?? this.#format?.render?.(instruction) ?? instruction.content;
	}
	remove(names) {
		if (isArray(names)) return removeEntries(names, (name) => this.#delete(name));
		return this.#delete(names);
	}
	clear() {
		this.#instructions.clear();
		this.#emitter.emit("clear");
	}
	#create(input) {
		const instruction = new Instruction(input);
		this.#instructions.set(instruction.name, instruction);
		this.#emitter.emit("add", instruction);
		return instruction;
	}
	#delete(name) {
		const removed = this.#instructions.delete(name);
		if (removed) this.#emitter.emit("remove", name);
		return removed;
	}
};
//#endregion
//#region src/core/contexts/scopes/Scope.ts
/**
* Represents a named, immutable filter over a richer context's items — an optional allow-list per
* category (`instructions` / `tools` / `files`), each keyed by that category's identity (an
* instruction's `name`, a tool's `name`, a workspace file's `path`) and read as an allow-list:
* `undefined` lets everything pass, `[]` lets nothing pass, and a non-empty list passes the listed
* keys alone. `narrow` composes a tighter child by set intersection.
*
* @remarks
* - **A category list is three-way.** `undefined` ⇒ no constraint on that category (all
*   pass); `[]` ⇒ none pass; a non-empty list ⇒ only the listed keys pass. The build
*   step / loop apply this through `filterAllowList`.
* - **Immutable.** The `id` is minted at construction; every supplied list is copied in
*   (so a later mutation of the caller's array can't leak in), and the lists are
*   `readonly`. A `Scope` is never mutated after construction — `narrow` returns a new
*   one rather than altering this one.
* - **`narrow` is set-intersection (immutable composition).** A child scope's visible set
*   per category is the intersection of this scope's list and the config's list — but
*   `undefined` means "no constraint", so it acts as the universal set: intersecting
*   `undefined` with a list yields the list, and `undefined` with `undefined` stays
*   `undefined`. Narrowing can only tighten, never widen — a key excluded by a parent
*   can never be re-admitted by a child. The child keeps this scope's `name`, `description`,
*   and `select` handler.
*
* @example
* ```ts
* const scope = new Scope({ name: 'reader', tools: ['search', 'read'] })
* // narrow intersects: tools ∩ ['read', 'write'] = ['read'] (write was never in the parent).
* const tighter = scope.narrow({ tools: ['read', 'write'] })
* tighter.tools // ['read']
* // instructions had no parent constraint (undefined) → the child's list passes through.
* tighter.narrow({ instructions: ['safety'] }).instructions // ['safety']
* ```
*/
var Scope = class Scope {
	id = crypto.randomUUID();
	name;
	instructions;
	tools;
	files;
	select;
	description;
	constructor(input) {
		this.name = input.name;
		if (input.select !== void 0) this.select = input.select;
		if (input.description !== void 0) this.description = input.description;
		if (input.instructions !== void 0) this.instructions = [...input.instructions];
		if (input.tools !== void 0) this.tools = [...input.tools];
		if (input.files !== void 0) this.files = [...input.files];
	}
	narrow(config) {
		const instructions = intersectKeys(this.instructions, config.instructions);
		const tools = intersectKeys(this.tools, config.tools);
		const files = intersectKeys(this.files, config.files);
		return new Scope({
			name: this.name,
			...this.description === void 0 ? {} : { description: this.description },
			...this.select === void 0 ? {} : { select: this.select },
			...instructions === void 0 ? {} : { instructions },
			...tools === void 0 ? {} : { tools },
			...files === void 0 ? {} : { files }
		});
	}
};
//#endregion
//#region src/core/contexts/scopes/ScopeManager.ts
/**
* Registers the named filters a richer context reuses — immutable {@link Scope}s keyed by their
* minted `id`, in insertion order, where `create` always mints and stores rather than overwriting,
* and an observable `emitter` reports each change.
*
* @remarks
* - **Registry.** Scopes live in an insertion-ordered `Map` keyed by their minted `id`;
*   `create` mints a {@link Scope} from a {@link ScopeInput} (an `id` plus the three
*   allow-lists), stores it, and returns it. `count` is the map size, `scope(id)` looks
*   one up, and `scopes()` lists them in insertion order. (Unlike the name-keyed
*   instruction registry, a scope's key is its minted `id`, so two scopes may share a
*   `name`; `create` therefore always adds — it never overwrites.)
* - **Removal.** `remove` drops one by id, or a batch — `true` only when every supplied id
*   was removed; `clear` empties the registry.
* - **Observable.** The owned {@link emitter} ({@link ScopeManagerEventMap}) carries
*   `create` (the created scope) / `remove` (the id) / `clear`. Every event is emitted
*   directly, strictly after the map mutation completes; the emitter isolates a listener
*   throw and routes it to its `error` handler (the `error` option), so a buggy observer can
*   never corrupt a mutation.
*
* @example
* ```ts
* const manager = new ScopeManager()
* const reader = manager.create({ name: 'reader', tools: ['search', 'read'] })
* manager.scope(reader.id) // the same scope
* manager.count // 1
* ```
*/
var ScopeManager = class {
	#scopes = /* @__PURE__ */ new Map();
	#emitter;
	constructor(options) {
		this.#emitter = new Emitter({
			...options?.on === void 0 ? {} : { on: options.on },
			...options?.error === void 0 ? {} : { error: options.error }
		});
	}
	get emitter() {
		return this.#emitter;
	}
	get count() {
		return this.#scopes.size;
	}
	create(input) {
		const scope = new Scope(input);
		this.#scopes.set(scope.id, scope);
		this.#emitter.emit("create", scope);
		return scope;
	}
	scope(id) {
		return this.#scopes.get(id);
	}
	scopes() {
		return [...this.#scopes.values()];
	}
	remove(ids) {
		if (isArray(ids)) return removeEntries(ids, (id) => this.#delete(id));
		return this.#delete(ids);
	}
	clear() {
		this.#scopes.clear();
		this.#emitter.emit("clear");
	}
	#delete(id) {
		const removed = this.#scopes.delete(id);
		if (removed) this.#emitter.emit("remove", id);
		return removed;
	}
};
//#endregion
//#region src/core/contexts/AgentContext.ts
/**
* Assembles a provider request from the richer turn context — the optional system prompt, the
* observable context managers (instructions / workspaces), the
* {@link ConversationManagerInterface} message source whose active conversation is `messages`, the
* {@link ToolManagerInterface} registry, and an active {@link ScopeInterface} changed through
* {@link AgentContextInterface.apply}. `build()` folds the scoped managers and the active
* workspace into one system block, then the conversation, and never reads `tools`.
*
* @remarks
* - **Composition.** `system` is the optional system prompt; `instructions` / `tools` /
*   `workspaces` / `conversations` are the registries passed in `options` (bring your own), or
*   fresh empty ones when omitted (so `workspaces` is always present); `messages` is the active
*   conversation's live tail (always defined — see the following item). `scope` is the active filter —
*   `undefined` (the default) ⇒ no filtering; change it through `apply(scope)`. The structural
*   `workspaces` / `conversations` registries are fixed at construction; switch their active
*   members through their own `switch(id)` methods.
* - **The message source — the conversation registry's active conversation.** `conversations` is a
*   {@link ConversationManagerInterface}. The constructor adds a default conversation when the
*   manager has no active one, so the dynamic `messages` getter — `this.#conversations.active` — is
*   always defined. `messages` returns the active conversation itself (it owns the live tail + the
*   message verbs directly, satisfying {@link MessageManagerInterface} structurally — the same
*   reference, no duplication), and `build()` folds that conversation's `view()` (its per-section
*   summaries + live tail) as the authoritative message inclusion — the scope does not filter the
*   conversation (it owns inclusion through compaction; scope filters only instructions / tools /
*   workspace files). Because `messages` is read dynamically, an agent switches the active
*   conversation between runs (`conversations.switch(id)`) to serve many threads (the real
*   multi-conversation pattern); switch between runs, not during a run, and use separate agents for
*   concurrent threads.
* - **`build()` — the scoped assembly + the format cascade.** It folds, in order,
*   the system prompt then the scope-filtered instructions → the active workspace's text files
*   (each as a block: the section's `open` text, each item's rendering, then any `close` text)
*   into one leading `system` message (prepended only when at least one part exists), then
*   appends the active conversation's `view()` (the conversation owns message inclusion through
*   compaction — the scope does not filter the conversation). The instruction manager resolves
*   each `open` / item / `close` most-specific-first: `open` = manager-options-override >
*   built-in; per item = item-override > manager-options-override > built-in; `close` =
*   manager-options-override (no built-in ⇒ no closing line when unset) (see
*   {@link AgentContextInterface.build}). With no override set, each section is its built-in
*   header + items, no closing line. The active workspace's scoped-in image files' `base64` payload is attached to
*   the last user message (a vision provider reads images off a user turn); when no user message
*   exists the attachment is skipped. Built fresh each call (recomputed, never cached), so it
*   always reflects the current managers / messages / scope / active workspace; it never mutates a
*   manager or the stored messages.
* - **The active workspace, rendered by carrier — the sole document/image context.**
*   `workspaces.active` (when set) has its {@link import('@orkestrel/workspace').FileInterface}s scope-filtered by `scope.files`,
*   then split: text files fold into a dedicated `## Workspace` system section (fenced reference
*   blocks — placed right after the instructions section), and image files' `base64` payload attaches
*   to the last user message. Active-only — never the other registered workspaces; with no active
*   workspace nothing renders for workspaces. `build()` owns this render (a `Workspace` /
*   `WorkspaceManager` stays file-focused).
* - **Tools are structural, not in the prompt.** The registry is advertised to the provider
*   through `tools.definitions()` (scope-filtered by the loop), never serialized into the
*   message array — so `build()`'s output carries no tool content, scoped or not.
* - **Event-free context; observable managers.** The context itself owns no Emitter; the
*   context managers each carry their own (the push observation surface).
*
* @example
* ```ts
* const context = new AgentContext({ system: 'You are concise.' })
* context.instructions.add({ name: 'tone', content: 'Be terse.' })
* context.messages.add({ role: 'user', content: 'Hi' })
* context.build() // [{ role: 'system', content: 'You are concise.\n\n## Instructions\n\nBe terse.' }, { role: 'user', content: 'Hi' }]
* ```
*/
var AgentContext = class {
	#system;
	#instructions;
	#workspaces;
	#conversations;
	#tools;
	#select;
	#scope;
	constructor(options) {
		this.#system = options?.system;
		this.#instructions = options?.instructions ?? new InstructionManager();
		this.#workspaces = options?.workspaces ?? new WorkspaceManager();
		this.#conversations = options?.conversations ?? new ConversationManager();
		if (this.#conversations.active === void 0) this.#conversations.add();
		this.#tools = options?.tools ?? new ToolManager();
		this.#select = options?.select;
		this.#scope = options?.scope;
	}
	get system() {
		return this.#system;
	}
	get instructions() {
		return this.#instructions;
	}
	get workspaces() {
		return this.#workspaces;
	}
	get messages() {
		return this.#conversations.active ?? this.#ensure();
	}
	get conversations() {
		return this.#conversations;
	}
	get tools() {
		return this.#tools;
	}
	get scope() {
		return this.#scope;
	}
	apply(scope) {
		this.#scope = scope;
	}
	select(request, signal) {
		const handler = this.#scope?.select ?? this.#select;
		if (handler === void 0) return void 0;
		return this.#check(handler, this.#conversations.active ?? this.#ensure(), request, signal);
	}
	build(selection) {
		const scope = this.#scope;
		const parts = [];
		if (this.#system !== void 0) parts.push(this.#system);
		const instructions = filterAllowList(scope?.instructions, this.#instructions.instructions(), (one) => one.name);
		const instructed = renderSection(this.#instructions.open, instructions, (one) => this.#instructions.render(one), this.#instructions.close);
		if (instructed !== void 0) parts.push(instructed);
		const files = filterAllowList(scope?.files, this.#workspaces.active?.files() ?? [], (one) => one.path);
		const documented = renderSection(WORKSPACE_SECTION_HEADER, files.filter((file) => isText(file.content)), (file) => isText(file.content) ? renderFencedFile(file.path, file.content.language, file.content.text) : renderFencedFile(file.path, "text", ""), void 0);
		if (documented !== void 0) parts.push(documented);
		const tail = attachUserImages(selection?.messages ?? (this.#conversations.active ?? this.#ensure()).view(), collectImageData(files));
		if (selection !== void 0 && selection.fault === void 0 && selection.briefing !== void 0 && selection.briefing !== "") parts.push(selection.briefing);
		if (parts.length === 0) return tail;
		return [{
			id: crypto.randomUUID(),
			role: "system",
			content: parts.join("\n\n")
		}, ...tail];
	}
	async #check(handler, conversation, request, signal) {
		const before = conversation.view().map((message) => message.id);
		const selection = await handler(conversation, request, signal);
		const after = conversation.view();
		if (after.length === before.length && after.every((message, index) => message.id === before[index])) return selection;
		const text = `conversation ${conversation.id} changed during selection: ${before.length} messages before, ${after.length} after`;
		return {
			messages: after,
			judgments: selection.judgments,
			...selection.usage === void 0 ? {} : { usage: selection.usage },
			fault: selection.fault === void 0 ? new Error(text) : new Error(text, { cause: selection.fault })
		};
	}
	#ensure() {
		const conversation = this.#conversations.add();
		return this.#conversations.active ?? conversation;
	}
};
//#endregion
//#region src/core/contexts/factories.ts
/**
* Creates a selection handler that judges screened messages and retains uncertain subjects.
*
* @remarks
* Reuses matching judgments without spending usage or the fresh question limit.
* A judge error for one subject leaves that subject undecided, so it is kept, and the handler
* asks about the next subject. When the judge failed for every subject asked and no recorded
* judgment was reused, the handler returns the full view with `fault` set, its cause the first
* judge error. A cancel returns the full view, the recorded keys, spent usage, and the cancel
* cause as `fault`. The handler sends nothing until an application invokes or installs it.
*
* @param options - The judge, screen, needed criterion, and fresh question limit
* @returns The application-installed selection handler
* @throws SelectionError Thrown when the threshold is outside the interval above 0.5 up to and including 1 (code `'THRESHOLD'`) or the limit is not a nonnegative safe integer (code `'LIMIT'`)
* @example
* ```ts
* const select = createSelection({ judge, screen, needed, limit: 12 })
* ```
*/
function createSelection(options) {
	const { judge, screen, limit } = options;
	const needed = { ...options.needed };
	if (!isFiniteNumber(needed.threshold) || needed.threshold <= .5 || needed.threshold > 1) throw new SelectionError("THRESHOLD", "selection threshold must be greater than 0.5 and at most 1");
	if (!Number.isSafeInteger(limit) || limit < 0) throw new SelectionError("LIMIT", "selection limit must be a nonnegative safe integer");
	return async (conversation, request, signal) => {
		const judgments = [];
		const errors = [];
		let usage;
		let pending;
		try {
			for (const judgment of conversation.judgments.judgments()) {
				const key = parseConditionKey(judgment.id);
				if (key !== void 0 && key[2] !== request.id) conversation.judgments.remove(judgment.id);
			}
			const view = conversation.view();
			const present = new Set(view.map((message) => message.id));
			const subjects = [...new Set(screen(conversation, request))].filter((id) => id !== request.id && present.has(id));
			const question = buildNeededQuestion(needed);
			let fresh = 0;
			for (const id of subjects) {
				const key = buildConditionKey("needed", id, request.id);
				const sources = [id, request.id];
				const state = renderSelectionState(view, id, request);
				const recorded = conversation.judgments.judgment(key);
				if (recorded !== void 0 && matchesJudgment(recorded, question, sources, state, judge.model)) {
					judgments.push(key);
					continue;
				}
				if (fresh >= limit) continue;
				signal.throwIfAborted();
				pending = key;
				fresh += 1;
				let resolved;
				try {
					resolved = await conversation.judgments.resolve(judge, {
						state,
						questions: { [key]: question }
					}, sources, signal);
				} catch (cause) {
					if (signal.aborted || isJudgeAbortError(cause)) throw cause;
					errors.push(cause);
					pending = void 0;
					continue;
				}
				for (const judgment of resolved) {
					judgments.push(judgment.id);
					if (judgment.usage !== void 0) usage = sumUsage(usage, judgment.usage);
				}
				pending = void 0;
			}
			signal.throwIfAborted();
			if (errors.length > 0 && judgments.length === 0) return {
				messages: view,
				judgments,
				...usage === void 0 ? {} : { usage },
				fault: new Error("selection failed", { cause: errors[0] })
			};
			return {
				messages: filterSelectionMessages(view, inferApplicability(conversation, request, {
					judge,
					needed,
					screen: () => subjects
				}), request),
				judgments,
				...usage === void 0 ? {} : { usage }
			};
		} catch (cause) {
			if (isJudgeAbortError(cause) && cause.partial.usage !== void 0) usage = sumUsage(usage, cause.partial.usage);
			if (pending !== void 0 && isJudgeAbortError(cause) && (Object.hasOwn(cause.partial.answers, pending) || cause.partial.refusals !== void 0 && Object.hasOwn(cause.partial.refusals, pending))) judgments.push(pending);
			return {
				messages: conversation.view(),
				judgments,
				...usage === void 0 ? {} : { usage },
				fault: new Error("selection failed", { cause })
			};
		}
	};
}
/**
* Creates an instruction — an immutable {@link InstructionInterface} (a named directive)
* from its `name` / `content` and optional `priority`, the `id` minted at construction.
*
* @remarks
* Only `name` / `content` are required; `priority` orders the instruction in an
* {@link InstructionManagerInterface}'s rendered list (higher first) and defaults to `0`.
* Stored immutable — never mutated after creation.
*
* @param input - `name` / `content` (required) and an optional `priority` (see
*   {@link InstructionInput})
* @returns A working {@link InstructionInterface}
*
* @example
* ```ts
* import { createInstruction } from '@orkestrel/agent'
*
* const instruction = createInstruction({ name: 'tone', content: 'Be concise.', priority: 5 })
* ```
*/
function createInstruction(input) {
	return new Instruction(input);
}
/**
* Creates an instruction registry — an {@link InstructionManagerInterface} holding
* immutable instructions keyed by `name`, listed by descending `priority`.
*
* @remarks
* Starts empty; `add` (one or a batch) mints each `id` and overwrites a same-name
* instruction (last write wins); `instructions()` lists them sorted by descending
* `priority` (stable for ties); `open` / `render` / `close` are the build contract a richer
* context renders an instructions block with; `remove` (one or a batch) reports `true` only
* when every supplied name was removed; `clear` empties it. Carries an observable `emitter`
* ({@link import('./types.js').InstructionManagerEventMap}) wired through the reserved `on`
* option; the emitter isolates a listener throw and routes it to its `error` handler
* (the `error` option), so it can never corrupt a mutation. An optional `format`
* override is the manager-options level of the `AgentContext` build cascade (consulted by
* `open` / `render` / `close`, beating the built-in; a per-item
* `InstructionInput.override` still beats it).
*
* @param options - Optional `on` hooks + a `format` override (see {@link InstructionManagerOptions})
* @returns An empty {@link InstructionManagerInterface}
*
* @example
* ```ts
* import { createInstructionManager } from '@orkestrel/agent'
*
* const instructions = createInstructionManager()
* instructions.add({ name: 'tone', content: 'Be concise.', priority: 5 })
* ```
*/
function createInstructionManager(options) {
	return new InstructionManager(options);
}
/**
* Creates a named scope — an immutable {@link ScopeInterface} from its `name` and its
* per-category allow-lists, the `id` minted at construction.
*
* @remarks
* Each list is three-way: `undefined` ⇒ no constraint on that category (all pass), `[]` ⇒
* none pass, a non-empty list ⇒ only the listed keys pass. `narrow(config)` composes a
* tighter child by set-intersection (an `undefined` side imposing no constraint). Stored
* immutable — never mutated after creation (`narrow` returns a new scope).
*
* @param input - `name` (required) and the optional `instructions` / `tools` / `files`
*   allow-lists (see {@link ScopeInput})
* @returns A working {@link ScopeInterface}
*
* @example
* ```ts
* import { createScope } from '@orkestrel/agent'
*
* const reader = createScope({ name: 'reader', tools: ['search', 'read'] })
* reader.narrow({ tools: ['read', 'write'] }).tools // ['read'] — intersection tightens
* ```
*/
function createScope(input) {
	return new Scope(input);
}
/**
* Creates a scope registry — a {@link ScopeManagerInterface} holding immutable scopes keyed
* by their minted `id`, in insertion order.
*
* @remarks
* Starts empty; `create` mints each scope's `id` and stores it (keyed by `id`, so it
* always adds — two scopes may share a `name`); `scopes()` lists them in insertion order;
* `remove` (one or a batch) reports `true` only when every supplied id was removed; `clear`
* empties it. Carries an observable `emitter`
* ({@link import('./types.js').ScopeManagerEventMap}) wired through the reserved `on`
* option; the emitter isolates a listener throw and routes it to its `error` handler
* (the `error` option), so it can never corrupt a mutation.
*
* @param options - Optional `on` hooks (see {@link ScopeManagerOptions})
* @returns An empty {@link ScopeManagerInterface}
*
* @example
* ```ts
* import { createScopeManager } from '@orkestrel/agent'
*
* const scopes = createScopeManager()
* const reader = scopes.create({ name: 'reader', tools: ['search'] })
* ```
*/
function createScopeManager(options) {
	return new ScopeManager(options);
}
/**
* Creates a richer turn context — an {@link AgentContextInterface} assembling a provider request
* from the optional system prompt, the instruction registry, the workspace registry (the only
* document channel), the conversation registry that is its `messages` source, the tool registry,
* and the active scope, which `build()` folds into the next turn's input.
*
* @remarks
* `system` is the optional system prompt; `tools` / `instructions` / `workspaces` are pre-built
* managers to reuse (empty ones are created when omitted, so `context.workspaces` is always
* present); `scope` is the initial active filter (`undefined` ⇒ no filtering, changeable afterwards
* through `context.apply(...)`). The `messages` store is always fresh. `build()` folds the scoped
* instructions — plus the active workspace's scope-filtered text files (fenced) — into one leading
* `system` message and appends the scoped conversation (attaching the active workspace's
* scope-filtered image files' `base64` payload to the last user message), built fresh each call; the active
* workspace is the sole document/image context. Tools are advertised structurally (through
* `tools.definitions()`, scope-filtered by the loop), never serialized into the prompt.
*
* @param options - Optional `system` / `tools` / `instructions` / `workspaces` / `scope`
*   (see {@link AgentContextOptions})
* @returns A working {@link AgentContextInterface}
*
* @example
* ```ts
* import { createAgentContext } from '@orkestrel/agent'
*
* const context = createAgentContext({ system: 'You are concise.' })
* context.instructions.add({ name: 'tone', content: 'Be terse.' })
* context.messages.add({ role: 'user', content: 'Hi' })
* context.build() // [{ role: 'system', content: 'You are concise.\n\n## Instructions\n\nBe terse.' }, { role: 'user', content: 'Hi' }]
* ```
*/
function createAgentContext(options) {
	return new AgentContext(options);
}
//#endregion
//#region src/core/agents/constants.ts
/**
* Caps an {@link AgentInterface} turn's tool iterations by default — `10` context → provider →
* tools cycles before the loop stops, so a model that keeps requesting tools can never loop
* forever. Overridable per agent through `AgentOptions.limit`.
*/
var DEFAULT_AGENT_LIMIT = 10;
/**
* Names the zone an {@link AuthorityInterface}'s default fallback {@link AuthorityDecision}
* carries — `'default'`, the classification for a tool call that matched no rule. Paired with
* the default `allowed: true` fallback, an unmatched call is allowed under this zone, so a
* rules list of denials acts as a denylist; a caller wanting deny-by-default supplies an
* `allowed: false` `fallback` of their own (see `AuthorityOptions`).
*/
var DEFAULT_AUTHORITY_ZONE = "default";
/**
* Estimates the per-message role and framing overhead {@link import('./helpers.js').estimateMessages}
* adds on top of a message's content estimate — `4` tokens for the fixed wire framing every
* conversation turn carries (its role tag, its delimiters) that
* {@link import('./helpers.js').estimateTokens}'s content-only heuristic does not otherwise
* capture.
*/
var MESSAGE_TOKEN_OVERHEAD = 4;
/**
* Names the coarse, deliberately approximate per-image token cost
* {@link import('./helpers.js').estimateMessages} charges for each attached image — `512`, because
* a base64 payload's length is no reliable token proxy.
*
* @remarks
* A base64 image payload's length is not a reliable token proxy (a vision model's actual image
* token cost depends on resolution / tiling, not byte size), so this is a fixed, coarse
* per-image estimate rather than a derivation from `image.length` — a planning heuristic, not an
* exact count.
*/
var IMAGE_TOKEN_ESTIMATE = 512;
//#endregion
//#region src/core/agents/errors.ts
/**
* Reports an {@link AgentInterface} run that ended {@link AgentResult.partial} under a
* `partial` policy of `false` (the default) — thrown by an agent-job handler (a
* `createAgentQueue` / `createAgentRunner` job), carrying the partial {@link AgentResult} so
* the failure stays inspectable, and the machine-readable `code` `'PARTIAL'`.
*
* @remarks
* A partial result means the agent was cancelled (an external `signal` abort, a queue /
* runner abort threaded in, a `timeout` deadline, or an exhausted token `budget`) rather
* than finishing naturally. For a durable job that is a failure by default: throwing this
* lets the Queue's retries re-run the job and a Runner's fail-fast abort its siblings.
* Set `partial: true` (see `AgentQueueOptions` / `AgentRunnerOptions`) to treat a
* partial as success instead, in which case this is never thrown. Narrow a caught value
* with {@link isAgentJobError} to read `partial`. `code` is the machine-readable condition
* (`'PARTIAL'` — the only one this error reports), so a `catch` branches on it rather than on
* the message string.
*/
var AgentJobError = class extends Error {
	/** Names the machine-readable condition — `'PARTIAL'`: a job that ended partial under a disallowing policy. */
	code = "PARTIAL";
	/** Holds the partial {@link AgentResult} the cancelled job produced. */
	partial;
	constructor(message, partial) {
		super(message);
		this.name = "AgentJobError";
		this.partial = partial;
	}
};
/**
* Narrows an unknown caught value to an {@link AgentJobError} through `instanceof`, so a
* `catch` can recover its `partial` result.
*
* @param value - The value to test (typically a `catch` binding or a rejected enqueue)
* @returns True if `value` is an {@link AgentJobError}; false otherwise
*
* @example
* ```ts
* try {
* 	await queue.enqueue(job) // retries: 0 → a partial rejects with the error
* } catch (error) {
* 	if (isAgentJobError(error)) keep(error.partial.content) // recover the partial content
* }
* ```
*/
function isAgentJobError(value) {
	return isInstance(value, AgentJobError);
}
/**
* Reports a concurrent run that would corrupt shared per-agent accounting, or a rehydration
* name absent from its registry pool — thrown synchronously by an {@link AgentInterface}'s
* `stream()` (and so by `generate()`, which calls it) and by an
* {@link AgentRegistryInterface}'s accessors, carrying the machine-readable `code`
* `'CONCURRENCY' | 'REGISTRY'`. Synchronous means a fire-and-forget
* `agent.generate().catch(…)` never catches it: `await` the call inside `try`/`catch`, or wrap
* the call expression itself.
*
* @remarks
* `'CONCURRENCY'` reports a run already in flight on the same agent, plus a construction-level
* `window` (a shared context budget) or a construction-level `budget` with no per-run override
* (a shared cost budget) — a second concurrent `stream()` would race its charges against the
* same shared instance, corrupting the accounting. Use separate agents, or per-run `budget`
* overrides with no `window`, for genuinely concurrent runs. `'REGISTRY'` reports a rehydration
* name absent from its registry pool, on `provider` / `tool` / `authority` / `scheduler` /
* `build`. Narrow a caught value with {@link isAgentError} and branch on `error.code`.
*/
var AgentError = class extends Error {
	/** Names the machine-readable condition — `'CONCURRENCY'`: a concurrent run on a shared accounting agent; `'REGISTRY'`: a rehydration name absent from its registry pool. */
	code;
	constructor(code, message) {
		super(message);
		this.name = "AgentError";
		this.code = code;
	}
};
/**
* Narrows an unknown caught value to an {@link AgentError} through `instanceof`, so a `catch`
* can branch on its `code`.
*
* @param value - The value to test (typically a `catch` binding)
* @returns True if `value` is an {@link AgentError}; false otherwise
*
* @example
* ```ts
* try {
* 	agent.stream()
* } catch (error) {
* 	if (isAgentError(error) && error.code === 'CONCURRENCY') useSeparateAgents()
* }
* ```
*/
function isAgentError(value) {
	return isInstance(value, AgentError);
}
//#endregion
//#region src/core/agents/Channel.ts
/**
* Buffers chunks in a minimal unbounded async channel — the eager pump writes them in (`push`)
* and ends it (`close` / `fail`) regardless of consumption, while a consumer reads them back live
* through the `drain` async-iterator. Decoupling write from read is what lets a producer make
* progress without a consumer pulling, and it is why an agent's `result` settles whether or not
* its `events` are drained.
*
* @remarks
* The standard resolver-swap: a waiting `drain` parks on `#wake` (a void resolver);
* `push` / `close` / `fail` enqueue/flag, then fire `#wake` so the parked reader wakes,
* re-reads the buffer, and either yields the next chunk, returns (on `close`), or throws
* (on `fail`). Event-free, no `!` / `as` / `any`.
*
* @example
* ```ts
* import { Channel } from '@orkestrel/agent'
*
* const channel = new Channel<number>()
* channel.push(1)
* channel.close()
* for await (const value of channel.drain()) {
* 	value // 1
* }
* ```
*/
var Channel = class {
	#buffer = [];
	#wake;
	#closed = false;
	#failure;
	push(value) {
		this.#buffer.push({ value });
		this.#signal();
	}
	close() {
		this.#closed = true;
		this.#signal();
	}
	fail(error) {
		if (this.#failure === void 0) this.#failure = { error };
		this.#closed = true;
		this.#signal();
	}
	async *drain() {
		for (;;) {
			for (let cell = this.#buffer.shift(); cell !== void 0; cell = this.#buffer.shift()) yield cell.value;
			if (this.#failure !== void 0) throw this.#failure.error;
			if (this.#closed) return;
			await this.#parked();
		}
	}
	#signal() {
		const wake = this.#wake;
		this.#wake = void 0;
		wake?.();
	}
	#parked() {
		return new Promise((resolve) => {
			this.#wake = resolve;
		});
	}
};
//#endregion
//#region src/core/agents/helpers.ts
/**
* Projects an unknown value onto a fresh, exact `JSONValue` representation of an
* {@link AgentResult} — capturing each structural field once through a total boundary,
* accepting conforming accessors and inherited properties, preserving finite negative and
* fractional usage counts, dropping extras, and resolving `undefined` for a malformed field, a
* non-finite usage number, a throwing getter, or a hostile or revoked proxy.
*
* @remarks
* This is a total hostile-boundary projection. Each structural field is captured once
* through Contract's sanctioned exception boundary, so conforming accessors and inherited
* properties are supported while a throwing getter or revoked proxy returns `undefined`.
* Present usage counts must be finite numbers; negative and fractional values are preserved,
* not normalized. Extra input properties are dropped while a fresh exact plain object is rebuilt
* and deep-gated through
* {@link import('@orkestrel/contract').parseJSONValue}.
*
* @param value - The unknown value to project
* @returns A fresh JSON value containing only AgentResult fields, or `undefined` when invalid
*
* @example
* ```ts
* import { agentResultToJSON } from '@orkestrel/agent'
*
* agentResultToJSON({ content: 'done', usage: { prompt: 2, completion: 1, total: 3 }, partial: false })
* // { content: 'done', usage: { prompt: 2, completion: 1, total: 3 }, partial: false }
* ```
*/
function agentResultToJSON(value) {
	const captured = attempt(() => {
		if (!isObject(value)) return void 0;
		const content = Reflect.get(value, "content");
		const thinking = Reflect.get(value, "thinking");
		const usage = Reflect.get(value, "usage");
		const partial = Reflect.get(value, "partial");
		if (!isString(content) || !isBoolean(partial)) return void 0;
		if (thinking !== void 0 && !isString(thinking)) return void 0;
		let projectedUsage;
		if (usage !== void 0) {
			if (!isObject(usage)) return void 0;
			const prompt = Reflect.get(usage, "prompt");
			const completion = Reflect.get(usage, "completion");
			const total = Reflect.get(usage, "total");
			if (!isFiniteNumber(prompt) || !isFiniteNumber(completion) || !isFiniteNumber(total)) return;
			projectedUsage = {
				prompt,
				completion,
				total
			};
		}
		return {
			content,
			...thinking === void 0 ? {} : { thinking },
			...projectedUsage === void 0 ? {} : { usage: projectedUsage },
			partial
		};
	});
	return captured.success ? parseJSONValue(captured.value) : void 0;
}
/**
* Estimates the context-token footprint of a string — the deterministic `ceil(length / 4)`
* character heuristic {@link estimateMessages} sums over a conversation's messages (the default
* context-budget estimator).
*
* @remarks
* Approximates `ceil(length / 4)` (≈ four characters per token — the rough average for
* English text), so the same input always yields the same estimate (no model round-trip).
* Empty text is `0`. This is a planning heuristic for reasoning about how much a turn's
* messages cost the next request, not an exact tokenizer count — it never calls a provider,
* so the agent layer stays provider-agnostic and synchronous where it can be.
*
* @param text - The text to estimate (a section summary, a message's content)
* @returns The estimated token count (`ceil(text.length / 4)`; `0` for empty text)
*
* @example
* ```ts
* estimateTokens('') // 0
* estimateTokens('hello') // 2  (ceil(5 / 4))
* estimateTokens('a'.repeat(40)) // 10
* ```
*/
function estimateTokens(text) {
	return Math.ceil(text.length / 4);
}
/**
* Estimates the context-token footprint of a batch of messages — each message's content plus
* {@link import('./constants.js').MESSAGE_TOKEN_OVERHEAD}, a tool-call JSON estimate, a thinking estimate, and
* {@link import('./constants.js').IMAGE_TOKEN_ESTIMATE} for each attached image. The default
* `consumer` estimator for an agent's context budget (the
* {@link import('./types.js').AgentOptions} `window`), total and never throwing, and a
* deliberate provider-agnostic approximation rather than an exact tokenizer count.
*
* @remarks
* Sums, per message, {@link estimateTokens} over its `content` (the `ceil(length / 4)` char
* heuristic) plus {@link import('./constants.js').MESSAGE_TOKEN_OVERHEAD} (a fixed per-message
* role/framing overhead) plus, when present, {@link estimateTokens} over its JSON-stringified
* `calls` plus, when present, {@link estimateTokens} over its `thinking` plus `images.length * `{@link import('./constants.js').IMAGE_TOKEN_ESTIMATE} (a coarse,
* deliberately-approximate per-image cost — a base64 length is not a token proxy). Deterministic
* and provider-free — the same messages always yield the same estimate, with an empty batch `0`.
* It is the fully-swappable default an agent's auto-compaction context budget charges each
* turn's new messages through; a caller wanting a sharper count supplies its own `consumer` to
* `createBudget` instead. Total — never throws: a `calls` `JSON.stringify` that throws (a
* circular `ToolCall.arguments`) is caught and replaced with a conservative fixed contribution of
* {@link import('./constants.js').MESSAGE_TOKEN_OVERHEAD} (the same per-message overhead scale)
* instead of estimating the (unreachable) serialized length.
*
* @param messages - The messages to estimate (a turn's appended assistant + tool messages)
* @returns The summed estimated token count (`0` when empty)
*
* @example
* ```ts
* estimateMessages([]) // 0
* estimateMessages([{ id: '1', role: 'user', content: 'hello' }]) // 6  (2 content + 4 overhead)
* ```
*/
function estimateMessages(messages) {
	return messages.reduce((sum, message) => {
		const content = estimateTokens(message.content) + 4;
		let calls = 0;
		if (message.calls?.length) try {
			calls = estimateTokens(JSON.stringify(message.calls));
		} catch {
			calls = 4;
		}
		const images = (message.images?.length ?? 0) * 512;
		const thinking = message.thinking === void 0 ? 0 : estimateTokens(message.thinking);
		return sum + content + calls + images + thinking;
	}, 0);
}
/**
* Runs one rehydrated agent and applies the partial-as-configurable-failure policy — a partial
* run throws an {@link import('./errors.js').AgentJobError} unless the `partial` policy allows
* it, and a natural finish resolves. The shared job-handler step `createAgentQueue` and
* `createAgentRunner` both settle each job through, so the policy can never diverge between
* them.
*
* @remarks
* A turn that committed partial (a cancel — abort / budget / timeout) is by default a
* failure, so it throws an {@link import('./errors.js').AgentJobError} carrying the partial
* (the Queue's retries + a Runner's fail-fast then engage); the `partial` policy resolves
* it as success instead. A natural finish always resolves with its result.
*
* @param agent - The rehydrated {@link AgentInterface} to run to its {@link AgentResult}
* @param partial - The partial policy. If `true`, a partial result resolves as success; if
*   `false` (the default policy), a partial result throws an {@link AgentJobError}
* @returns The agent's {@link AgentResult} (a natural finish, or a partial one under the
*   `partial` policy)
* @throws {AgentJobError} Thrown when the run ended partial and the `partial` policy is `false`
*
* @example
* ```ts
* const result = await settleAgentJob(registry.build(input, signal), false)
* ```
*/
async function settleAgentJob(agent, partial) {
	const result = await agent.generate();
	if (result.partial && !partial) throw new AgentJobError("agent job ended partial", result);
	return result;
}
/**
* Handles one queued agent job by rehydrating it through a registry with the queue
* attempt's signal, then applying the shared partial-result policy.
*
* @param registry - The registry that rehydrates the serializable job
* @param partial - The partial policy. If `true`, a partial result resolves; if `false`, it throws
* @param input - The serializable agent job
* @param context - The queue attempt whose signal bounds the agent
* @returns The settled agent result
*/
function handleAgentQueueJob(registry, partial, input, context) {
	return settleAgentJob(registry.build(input, context.signal), partial);
}
/**
* Handles one runner agent job by fanning out its declared children, rehydrating the
* parent through a registry with the controller signal, and applying the shared
* partial-result policy.
*
* @remarks
* Children are fired and tracked through the runner controller without awaiting them
* inline, preserving bounded-runner progress.
*
* @param registry - The registry that rehydrates serializable jobs
* @param partial - The partial policy. If `true`, a partial result resolves; if `false`, it throws
* @param controller - The runner controller for this parent job
* @returns The settled parent agent result
*/
function handleAgentRunnerJob(registry, partial, controller) {
	const children = controller.input.children;
	if (children !== void 0) for (const child of children) controller.spawn(child);
	return settleAgentJob(registry.build(controller.input, controller.signal), partial);
}
/**
* Assembles the settled {@link AgentResult} from a run's {@link RunOutcome} — `thinking` and
* `usage` are carried only when the run surfaced them, and the loop-internal `exhausted` flag is
* left out.
*
* @remarks
* Pure and total. An absent optional is omitted rather than stored as `undefined` (the
* present-when-given convention the message store follows), so a settled result JSON
* round-trips without an explicit `undefined` field. `exhausted` is loop bookkeeping and does
* not reach the public result — the `exhaust` event carries it instead.
*
* @param outcome - The run's settled outcome
* @returns The public {@link AgentResult}
*
* @example
* ```ts
* assembleResult({ content: 'hi', thinking: undefined, usage: undefined, partial: false, exhausted: false })
* // { content: 'hi', partial: false }
* ```
*/
function assembleResult(outcome) {
	const result = {
		content: outcome.content,
		partial: outcome.partial
	};
	if (outcome.thinking !== void 0) result.thinking = outcome.thinking;
	if (outcome.usage !== void 0) result.usage = outcome.usage;
	return result;
}
/**
* Synthesizes the denial {@link ToolResult} an authority-blocked call is fed back with — the
* call's `id` / `name` keyed back, carrying a denial `error` instead of a value.
*
* @remarks
* Pure and total. The rule's `reason` is rendered as `denied: <reason>` when one was given,
* else the generic `denied by authority`. There is no `value`, so the agent loop feeds it back
* exactly like a tool error and the model can react to it.
*
* @param call - The denied {@link ToolCall}
* @param reason - The rule's explanation, or `undefined` for the generic denial
* @returns The failure-arm {@link ToolResult}
*
* @example
* ```ts
* denyCall({ id: '1', name: 'drop', arguments: {} }, 'read-only mode')
* // { success: false, id: '1', name: 'drop', error: 'denied: read-only mode' }
* ```
*/
function denyCall(call, reason) {
	return {
		success: false,
		id: call.id,
		name: call.name,
		error: reason !== void 0 ? `denied: ${reason}` : "denied by authority"
	};
}
/**
* Consumes a reported usage against a budget over what was already charged, so a turn's total
* draw matches the report and nothing is charged twice.
*
* @remarks
* The full `prompt` count is consumed because no earlier charge covers it. Each of `completion`
* and `total` is consumed less `charged`, floored at 0. The usage must already be sanitized: a
* non-finite field yields a non-finite charge, which the installed `Budget` refuses by throwing
* a `range` `ContractError`. Without a budget the call consumes nothing.
*
* @param budget - The budget to consume against, or `undefined` for an unmetered run
* @param usage - The sanitized usage the provider reported
* @param charged - The completion tokens already consumed this turn
*
* @example
* ```ts
* const budget = createBudget<TokenUsage>({ max: 1000, consumer: (usage) => usage.total })
* chargeUsage(budget, { prompt: 20, completion: 30, total: 50 }, 10)
* budget.consumed // 40
* ```
*/
function chargeUsage(budget, usage, charged) {
	budget?.consume({
		prompt: usage.prompt,
		completion: Math.max(0, usage.completion - charged),
		total: Math.max(0, usage.total - charged)
	});
}
//#endregion
//#region src/core/agents/Agent.ts
/**
* Composes a {@link ProviderInterface}, an {@link AgentContext}, and a
* {@link ToolManagerInterface} into a bounded context → provider → tools → repeat turn, exposed
* as both a one-shot `generate` and a live `stream` that share one private run — bounded by the
* run `signal`, the `timeout`, and the `budget` folded through `AbortSignal.any`, paced by
* `scheduler`, with tool iteration capped at `limit`.
*
* @remarks
* - **One loop, two faces.** A single private async generator (`#run`) drives the
*   whole turn. `stream` kicks off an eager pump that iterates `#run` into a private
*   {@link Channel}, settling `result` from the run's outcome — so `result` settles
*   whether or not the live `events` are drained; `generate` awaits that same
*   settled `result` — so the two can never diverge.
* - **The turn.** `#run` builds the provider input once (`context.build()` into a
*   working array) then loops up to `limit`: drive `provider.stream(...)` accumulating
*   + yielding each content delta as a `token` chunk; fold the turn's usage into the
*   running total + the `budget` and yield a `usage` chunk; if the model requested
*   tools, append the assistant turn, `execute` them, yield a `tool` chunk per call,
*   append each tool result message, and continue; otherwise append the final
*   assistant message and stop. Each assistant message stores its call's non-empty thinking.
*   Provider calls and prompt estimates apply the provider's `replay` policy to the working
*   array; an absent policy means `'none'`.
* - **Bounded.** Each run arms one cancel through `createAbort({ signal: AbortSignal.any([
*   …]) })` folding the external `signal`, the `timeout` deadline, and the `budget`
*   signal; `abort()` fires it. Any trip stops the loop and commits a partial result
*   (the `result` promise resolves, never rejects, on a cancel) — only a genuine
*   provider / tool error rejects.
* - **Paced + capped.** The `scheduler` (when given) `yield`s between turns; tool
*   iteration is capped at `limit`.
* - **Two observation surfaces.** The pull {@link AgentChunk} stream carries per-token
*   deltas (+ usage/tool chunks); the push {@link emitter} ({@link AgentEventMap}) carries
*   lifecycle + usage/tool/deny moments for fire-and-forget observers. Every event is
*   emitted directly, after the relevant state transition / settle; the emitter isolates a
*   listener throw and routes it to its `error` handler (the `error` option), so a buggy
*   observer can never escape into / reorder / corrupt the settle-once loop — observation is
*   purely a side-channel.
*
* @example
* ```ts
* const agent = new Agent(provider, { system: 'You are concise.' })
* agent.context.messages.add({ role: 'user', content: 'Say hi.' })
* const result = await agent.generate()
* ```
*/
var Agent = class {
	#id;
	#provider;
	#replay;
	#context;
	#limit;
	#timeoutMs;
	#budget;
	#scheduler;
	#signal;
	#authority;
	#window;
	#strict;
	#emitter;
	#settled = "idle";
	#runs = /* @__PURE__ */ new Set();
	constructor(provider, options) {
		this.#id = crypto.randomUUID();
		this.#provider = provider;
		this.#replay = provider.replay ?? "none";
		this.#context = new AgentContext({
			...options?.system === void 0 ? {} : { system: options.system },
			...options?.tools === void 0 ? {} : { tools: options.tools },
			...options?.instructions === void 0 ? {} : { instructions: options.instructions },
			...options?.workspaces === void 0 ? {} : { workspaces: options.workspaces },
			...options?.scope === void 0 ? {} : { scope: options.scope },
			...options?.conversations === void 0 ? {} : { conversations: options.conversations },
			...options?.select === void 0 ? {} : { select: options.select }
		});
		this.#limit = options?.limit ?? 10;
		this.#timeoutMs = options?.timeout;
		this.#budget = options?.budget;
		this.#scheduler = options?.scheduler;
		this.#signal = options?.signal;
		this.#authority = options?.authority;
		this.#window = options?.window;
		this.#strict = options?.strict ?? false;
		this.#emitter = new Emitter({
			...options?.on === void 0 ? {} : { on: options.on },
			...options?.error === void 0 ? {} : { error: options.error }
		});
	}
	get id() {
		return this.#id;
	}
	get emitter() {
		return this.#emitter;
	}
	get status() {
		return this.#runs.size > 0 ? "running" : this.#settled;
	}
	get context() {
		return this.#context;
	}
	generate(options) {
		return this.stream(options).result;
	}
	stream(options) {
		if (this.#runs.size > 0 && (this.#window !== void 0 || this.#budget !== void 0 && options?.budget === void 0)) throw new AgentError("CONCURRENCY", "concurrent runs on one agent with a shared construction window/budget corrupt accounting; use separate agents or per-run budgets");
		const timeoutMs = options?.timeout ?? this.#timeoutMs;
		const timeout = timeoutMs === void 0 ? void 0 : createTimeout({ ms: timeoutMs });
		timeout?.start();
		const budget = options?.budget ?? this.#budget;
		budget?.start();
		const limit = options?.limit ?? this.#limit;
		const signal = this.#parents(timeout, budget, options?.signal);
		const abort = createAbort(signal === void 0 ? {} : { signal });
		this.#runs.add(abort);
		this.#emitter.emit("start", this.id);
		const channel = new Channel();
		const settled = Promise.withResolvers();
		this.#pump(abort, timeout, channel, settled, options?.think, options?.schema, limit, budget);
		settled.promise.catch(() => {});
		return {
			events: this.#events(channel, abort),
			result: settled.promise,
			abort: abort.abort.bind(abort)
		};
	}
	abort(reason) {
		for (const abort of [...this.#runs]) abort.abort(reason);
	}
	async #pump(abort, timeout, channel, settled, think, schema, limit, budget) {
		let failure;
		let outcome = {
			content: "",
			thinking: void 0,
			usage: void 0,
			partial: false,
			exhausted: false
		};
		try {
			const run = this.#run(abort, think, schema, limit, budget);
			let next = await run.next();
			while (next.done !== true) {
				channel.push(next.value);
				next = await run.next();
			}
			outcome = next.value;
		} catch (error) {
			failure = { error };
		} finally {
			timeout?.clear();
			this.#runs.delete(abort);
			if (failure === void 0) {
				this.#settled = "done";
				channel.close();
				const result = assembleResult(outcome);
				settled.resolve(result);
				if (outcome.exhausted) this.#emitter.emit("exhaust", limit);
				else if (outcome.partial) this.#emitter.emit("abort", abort.signal.reason);
				this.#emitter.emit("finish", result);
			} else {
				this.#settled = "error";
				channel.fail(failure.error);
				settled.reject(failure.error);
				this.#emitter.emit("error", failure.error);
			}
		}
	}
	async *#events(channel, abort) {
		try {
			yield* channel.drain();
		} finally {
			abort.abort();
		}
	}
	async *#run(abort, think, schema, limit, budget) {
		const last = this.#context.conversations.active?.view().at(-1);
		const request = last?.role === "user" ? last : void 0;
		const spent = [];
		const messages = [];
		const selecting = this.#select(request, messages, abort, budget, spent);
		if (selecting !== void 0) await selecting;
		const tools = this.#context.tools;
		let content = "";
		let thinking;
		let usage;
		let pending = false;
		let broke = false;
		let partial = false;
		let exhausted = false;
		let futile = false;
		const compacting = this.#window !== void 0 && this.#context.conversations.active?.summarizable === true;
		if (compacting) {
			this.#window?.clear();
			if (!abort.signal.aborted) futile = await this.#trim(messages, false, request, abort, budget, spent);
		}
		if (abort.signal.aborted) partial = true;
		for (let turn = 0; turn < limit; turn += 1) {
			this.#emitter.emit("turn", turn);
			if (turn > 0) try {
				await this.#scheduler?.yield({ signal: abort.signal });
			} catch (error) {
				if (abort.signal.aborted) {
					partial = true;
					broke = true;
					break;
				}
				throw error;
			}
			if (abort.signal.aborted) {
				partial = true;
				broke = true;
				break;
			}
			const names = this.#context.scope?.tools?.slice();
			const advertised = filterAllowList(names, tools.definitions(), (definition) => definition.name);
			const definitions = advertised.length > 0 ? advertised : void 0;
			let charged = 0;
			let turnContent = "";
			let result;
			try {
				result = yield* this.#provide(messages, abort.signal, definitions, think, schema, (delta) => {
					content += delta;
					turnContent += delta;
					const est = estimateTokens(turnContent);
					if (est > charged) {
						budget?.consume({
							prompt: 0,
							completion: est - charged,
							total: est - charged
						});
						charged = est;
					}
				});
			} catch (error) {
				if (abort.signal.aborted) {
					if (isProviderAbortError(error)) {
						if (error.partial.thinking !== void 0 && error.partial.thinking.length > 0) thinking = joinThinking(thinking, error.partial.thinking);
						if (error.partial.usage !== void 0) {
							const abortUsage = sanitizeUsage(error.partial.usage);
							chargeUsage(budget, abortUsage, charged);
							usage = sumUsage(usage, abortUsage);
						}
					}
					partial = true;
					broke = true;
					break;
				}
				throw error;
			}
			const recorded = result.thinking === void 0 || result.thinking.length === 0 ? {} : { thinking: result.thinking };
			if (result.thinking !== void 0 && result.thinking.length > 0) thinking = joinThinking(thinking, result.thinking);
			if (result.usage !== void 0) {
				const resultUsage = sanitizeUsage(result.usage);
				chargeUsage(budget, resultUsage, charged);
				usage = sumUsage(usage, resultUsage);
				this.#emitter.emit("usage", resultUsage);
				yield {
					category: "usage",
					usage: resultUsage
				};
			}
			if (definitions === void 0) for (const call of result.tools ?? []) this.#emitter.emit("deny", call, "no tool is advertised in the active scope");
			else if (result.tools !== void 0 && result.tools.length > 0) {
				const admitted = filterAllowList(names, result.tools, (call) => call.name);
				const authorization = this.#authorize(result.tools, admitted);
				if (abort.signal.aborted) {
					partial = true;
					broke = true;
					break;
				}
				const assistant = this.#context.messages.add({
					role: "assistant",
					content: result.content,
					calls: result.tools,
					...recorded
				});
				messages.push(assistant);
				const results = await this.#dispatch(tools, result.tools, abort.signal, authorization);
				for (let index = 0; index < result.tools.length; index += 1) {
					const call = result.tools[index];
					const outcomeResult = results[index];
					if (call === void 0 || outcomeResult === void 0) continue;
					this.#emitter.emit("tool", call, outcomeResult);
					yield {
						category: "tool",
						call,
						result: outcomeResult
					};
					const toolMessage = this.#context.messages.add({
						role: "tool",
						content: outcomeResult.success ? typeof outcomeResult.value === "string" ? outcomeResult.value : JSON.stringify(outcomeResult.value) : outcomeResult.error,
						call: call.id
					});
					messages.push(toolMessage);
				}
				if (compacting && !futile) futile = await this.#trim(messages, true, request, abort, budget, spent);
				pending = true;
				continue;
			}
			messages.push(this.#context.messages.add({
				role: "assistant",
				content: result.content,
				...recorded
			}));
			content = result.content;
			partial = abort.signal.aborted;
			pending = false;
			broke = true;
			break;
		}
		if (!broke && pending) {
			partial = true;
			exhausted = !abort.signal.aborted;
		}
		for (const one of spent) usage = sumUsage(usage, one);
		return {
			content,
			thinking,
			usage,
			partial,
			exhausted
		};
	}
	async #trim(messages, latch, request, abort, budget, spent) {
		const conversation = this.#context.conversations.active;
		if (this.#window === void 0 || conversation?.summarizable !== true || abort.signal.aborted) return false;
		this.#window.clear();
		this.#window.consume(stripThinking(messages, this.#replay));
		if (!this.#window.exhausted) return false;
		let section;
		try {
			section = await conversation.compact();
		} catch (error) {
			this.#emitter.emit("fault", error);
			if (this.#strict) throw error;
			return false;
		}
		if (section === void 0) return latch;
		const selecting = this.#select(request, messages, abort, budget, spent);
		if (selecting !== void 0) await selecting;
		return false;
	}
	#select(request, messages, abort, budget, spent) {
		const pending = request === void 0 ? void 0 : this.#context.select(request, abort.signal);
		if (pending === void 0) {
			messages.splice(0, messages.length, ...this.#context.build());
			return;
		}
		return this.#fold(pending, messages, abort, budget, spent);
	}
	async #fold(pending, messages, abort, budget, spent) {
		let selection;
		try {
			selection = await pending;
		} catch (error) {
			if (!abort.signal.aborted) {
				this.#emitter.emit("fault", error);
				if (this.#strict && !abort.signal.aborted) throw error;
			}
			messages.splice(0, messages.length, ...this.#context.build());
			return;
		}
		if (selection.usage !== void 0) {
			const usage = sanitizeUsage(selection.usage);
			chargeUsage(budget, usage, 0);
			spent.push(usage);
		}
		if (abort.signal.aborted) {
			messages.splice(0, messages.length, ...this.#context.build());
			return;
		}
		if (selection.fault !== void 0) {
			this.#emitter.emit("fault", selection.fault);
			if (abort.signal.aborted) {
				messages.splice(0, messages.length, ...this.#context.build());
				return;
			}
			if (this.#strict) throw selection.fault;
		}
		messages.splice(0, messages.length, ...this.#context.build(selection));
		this.#emitter.emit("select", selection);
	}
	#authorize(calls, admitted) {
		const authority = this.#authority;
		const allowed = /* @__PURE__ */ new Map();
		const denials = /* @__PURE__ */ new Map();
		for (const [index, call] of calls.entries()) {
			if (!admitted.includes(call)) {
				const reason = `${call.name} is not in the active scope`;
				denials.set(index, denyCall(call, reason));
				this.#emitter.emit("deny", call, reason);
				continue;
			}
			if (authority === void 0) {
				allowed.set(index, call);
				continue;
			}
			let decision;
			try {
				decision = authority.evaluate({ call });
			} catch (error) {
				const reason = errorToMessage(error);
				denials.set(index, denyCall(call, reason));
				this.#emitter.emit("deny", call, reason);
				continue;
			}
			if (decision.allowed) allowed.set(index, call);
			else {
				denials.set(index, denyCall(call, decision.reason));
				this.#emitter.emit("deny", call, decision.reason);
			}
		}
		return {
			allowed,
			denials
		};
	}
	async #dispatch(tools, calls, signal, authorization) {
		const { allowed, denials } = authorization;
		const executed = allowed.size > 0 ? await tools.execute([...allowed.values()], { signal }) : [];
		const results = new Map(denials);
		let offset = 0;
		for (const index of allowed.keys()) {
			const result = executed[offset];
			if (result !== void 0) results.set(index, result);
			offset += 1;
		}
		return calls.map((call, index) => results.get(index) ?? denyCall(call, void 0));
	}
	async *#provide(messages, signal, definitions, think, schema, onDelta) {
		const options = {};
		if (think !== void 0) options.think = think;
		if (schema !== void 0) options.schema = schema;
		const generator = this.#provider.stream(stripThinking(messages, this.#replay), signal, definitions, Object.keys(options).length > 0 ? options : void 0);
		let next = await generator.next();
		while (!next.done) {
			const delta = next.value;
			if (delta.channel === "content") {
				onDelta(delta.text);
				yield {
					category: "token",
					content: delta.text
				};
			} else yield {
				category: "think",
				content: delta.text
			};
			next = await generator.next();
		}
		return next.value;
	}
	#parents(timeout, budget, signal) {
		const signals = [];
		if (this.#signal !== void 0) signals.push(this.#signal);
		if (signal !== void 0) signals.push(signal);
		if (timeout !== void 0) signals.push(timeout.signal);
		if (budget !== void 0) signals.push(budget.signal);
		if (signals.length === 0) return void 0;
		if (signals.length === 1) return signals[0];
		return AbortSignal.any(signals);
	}
};
//#endregion
//#region src/core/agents/Authority.ts
/**
* Gates the agent loop's tool calls — the synchronous policy consulted before each call runs,
* turning one {@link AuthorityContext} into an {@link AuthorityDecision} by walking the ordered
* rules first-match-wins and falling back to a configurable default, which allows an unmatched
* call unless its `fallback` denies.
*
* @remarks
* - **Ordered, first-match-wins.** `evaluate` walks the configured rules in order and
*   returns the first whose `match(context)` is true as
*   `{ zone, allowed: rule.allowed ?? true, reason }` — a matched rule allows by
*   default and denies only when its `allowed` is explicitly `false`.
* - **Fallback.** When no rule matches, `evaluate` returns the configured `fallback`.
*   It defaults to `{ zone: DEFAULT_AUTHORITY_ZONE, allowed: true }` (allow-unmatched),
*   so a rules list of denials behaves as a denylist. To make the gate deny-by-default
*   (an allowlist — only matched rules that allow get through), pass an `allowed: false`
*   `fallback`.
* - **Consulted before each tool call.** The agent loop calls `evaluate({ call })` for
*   every {@link import('@orkestrel/tool').ToolCall} the model emits; a denied call is fed
*   back to the model as a denial {@link import('@orkestrel/tool').ToolResult} (a `tool`
*   chunk + a tool message) instead of being executed — no tool run, no budget cost —
*   so the model sees the denial and can react.
* - **Synchronous.** `evaluate` returns the verdict directly.
* - **Event-free.** A purely functional gate — no Emitter, no events.
*
* @example
* ```ts
* // A denylist: deny the `delete` tool, allow everything else (default fallback).
* const authority = new Authority({
* 	rules: [{ match: (c) => c.call.name === 'delete', zone: 'restricted', allowed: false }],
* })
* authority.evaluate({ call: { id: '1', name: 'delete', arguments: {} } }) // { zone: 'restricted', allowed: false }
* authority.evaluate({ call: { id: '2', name: 'add', arguments: {} } }) // { zone: 'default', allowed: true }
* ```
*/
var Authority = class {
	#rules;
	#fallback;
	constructor(options) {
		this.#rules = options?.rules ?? [];
		this.#fallback = options?.fallback ?? {
			zone: "default",
			allowed: true
		};
	}
	evaluate(context) {
		for (const rule of this.#rules) if (rule.match(context)) return {
			zone: rule.zone,
			allowed: rule.allowed ?? true,
			...rule.reason === void 0 ? {} : { reason: rule.reason }
		};
		return this.#fallback;
	}
};
//#endregion
//#region src/core/agents/AgentRegistry.ts
/**
* Makes a durable, JSON-serializable {@link AgentJobInput} runnable — holds the named pools of
* live, non-serializable pieces (providers, tools, authorities, schedulers), throws on a name
* absent from its pool, and `build`s a seeded, signal-wired {@link Agent} from a job's names and
* data.
*
* @remarks
* - **Why it exists.** An `AgentJobInput` is serializable so it can survive a crash in a
*   Queue's store; the live objects it needs (a provider with sockets, tools / rules /
*   schedulers carrying functions) cannot serialize. The registry closes that gap:
*   construct it once with the live pools, then a queue / runner handler calls `build`
*   on each (possibly restored) job to get a ready agent.
* - **Accessors throw on a miss.** `provider` / `tool` / `authority` / `scheduler` resolve a
*   name against their pool and throw an {@link AgentError} carrying `code: 'REGISTRY'` and
*   the message `unknown <category>: <name>` when it is absent — an unknown name in a
*   rehydrated job is a programmer / config error that must fail loudly at build time, never
*   silently resolve to `undefined` and run an agent missing a dependency.
* - **`build` rehydrates.** Resolve the job's `provider`; assemble a fresh
*   {@link ToolManager} from the `tools` names; rebuild the token `budget` from its
*   ceiling (`createTokenBudget({ max })`); resolve the optional `authority` /
*   `scheduler` names; construct the {@link Agent} with `system` / `limit` / `timeout` /
*   the threaded `signal`; seed its context with the job's `messages`; return it. The
*   `signal` is the queue attempt's / runner unit's cancel, so a bounded abort propagates
*   into the agent (which commits a partial — the job's `partial` policy then
*   decides success vs. retry).
* - **Event-free.** A pure resolver — no Emitter, no events.
*
* @example
* ```ts
* declare const provider: ProviderInterface // any concrete implementation supplied by the host app
* const registry = new AgentRegistry({ providers: { main: provider } })
* const agent = registry.build({ provider: 'main', messages: [{ role: 'user', content: 'Say ok.' }] })
* const result = await agent.generate()
* ```
*/
var AgentRegistry = class {
	#providers;
	#tools;
	#authorities;
	#schedulers;
	#store;
	constructor(options) {
		this.#providers = new Map(Object.entries(options.providers));
		this.#tools = new Map(Object.entries(options.tools ?? {}));
		this.#authorities = new Map(Object.entries(options.authorities ?? {}));
		this.#schedulers = new Map(Object.entries(options.schedulers ?? {}));
		this.#store = options.store;
	}
	provider(name) {
		return this.#resolve(this.#providers, "provider", name);
	}
	tool(name) {
		return this.#resolve(this.#tools, "tool", name);
	}
	authority(name) {
		return this.#resolve(this.#authorities, "authority", name);
	}
	scheduler(name) {
		return this.#resolve(this.#schedulers, "scheduler", name);
	}
	build(input, signal) {
		const agent = new Agent(this.provider(input.provider), this.#options(input, signal));
		for (const message of input.messages) agent.context.messages.add(message);
		return agent;
	}
	#options(input, signal) {
		const budget = this.#budget(input.budget);
		return {
			tools: this.#manager(input.tools),
			...input.system === void 0 ? {} : { system: input.system },
			...input.limit === void 0 ? {} : { limit: input.limit },
			...input.timeout === void 0 ? {} : { timeout: input.timeout },
			...budget === void 0 ? {} : { budget },
			...input.authority === void 0 ? {} : { authority: this.authority(input.authority) },
			...input.scheduler === void 0 ? {} : { scheduler: this.scheduler(input.scheduler) },
			...this.#store === void 0 ? {} : { conversations: new ConversationManager({ store: this.#store }) },
			...signal === void 0 ? {} : { signal }
		};
	}
	#manager(names) {
		const manager = new ToolManager();
		if (names !== void 0) for (const name of names) manager.add(this.tool(name));
		return manager;
	}
	#budget(max) {
		return max === void 0 ? void 0 : createTokenBudget({ max });
	}
	#resolve(pool, category, name) {
		const value = pool.get(name);
		if (value === void 0) throw new AgentError("REGISTRY", `unknown ${category}: ${name}`);
		return value;
	}
};
//#endregion
//#region src/core/agents/factories.ts
/**
* Creates an agent loop — an {@link AgentInterface} composing a
* {@link ProviderInterface}, its {@link AgentContextInterface}, and a tool registry
* into a bounded context → provider → tools → repeat turn, exposed as a one-shot
* `generate` and a live `stream`.
*
* @remarks
* One private loop drives the turn; `generate` drains the same stream `stream`
* exposes, so they can never diverge. Each turn is bounded by one cancel folded from
* `signal` + `timeout` + `budget` (through `AbortSignal.any`) — any trip (or `abort()`)
* commits a partial result (the stream's `result` resolves on a cancel, rejects only
* on a genuine provider / tool error). The `scheduler` paces between turns; tool
* iteration is capped at `limit` (default `DEFAULT_AGENT_LIMIT`). Tools are advertised
* structurally through `context.tools.definitions()`. Two observation surfaces: the
* {@link AgentChunk} stream (pull — per-token content) and a typed `emitter` (push —
* lifecycle + `usage` / `tool` / `deny` for fire-and-forget observers).
*
* @param provider - The {@link ProviderInterface} the loop drives each turn
* @param options - Optional `system` / `tools` / `limit` / `timeout` / `budget` /
*   `scheduler` / `signal` (see {@link AgentOptions})
* @returns A working {@link AgentInterface}
*
* @example
* ```ts
* import type { ProviderInterface } from '@orkestrel/agent'
* import { createAgent } from '@orkestrel/agent'
* import { createTokenBudget } from '@orkestrel/budget'
*
* declare const provider: ProviderInterface // any concrete implementation supplied by the host app
* const agent = createAgent(provider, {
* 	system: 'You are concise.',
* 	budget: createTokenBudget({ max: 50_000, scope: 'total' }),
* })
* agent.context.messages.add({ role: 'user', content: 'Say hi.' })
*
* const stream = agent.stream()
* for await (const chunk of stream.events) {
* 	if (chunk.category === 'token') process.stdout.write(chunk.content)
* }
* const result = await stream.result // { content, usage?, partial }
* ```
*/
function createAgent(provider, options) {
	return new Agent(provider, options);
}
/**
* Creates an empty unbounded async channel — a {@link ChannelInterface} a producer writes
* values into (`push`) and ends (`close` / `fail`) regardless of consumption, while a
* consumer reads them back live through `drain`.
*
* @remarks
* Write and read are decoupled, so the producer never waits for a consumer: an agent's eager
* pump writes each chunk into one, which is why a run's `result` settles whether or not the
* live events are drained. A value pushed at an already-parked consumer is delivered, buffered
* values are yielded before the end is reported, and the first failure wins.
*
* @typeParam T - The value type the channel carries
* @returns A fresh, empty {@link ChannelInterface}
*
* @example
* ```ts
* import { createChannel } from '@orkestrel/agent'
*
* const channel = createChannel<number>()
* channel.push(1)
* channel.close()
* for await (const value of channel.drain()) {
* 	value // 1
* }
* ```
*/
function createChannel() {
	return new Channel();
}
/**
* Creates a policy gate — an {@link AuthorityInterface} the agent loop consults before
* each tool call runs, evaluating the ordered rules first-match-wins and falling back
* to the configured default when none match.
*
* @remarks
* `rules` are evaluated in order — the first whose `match` is true decides (a matched
* rule allows unless its `allowed` is explicitly `false`). When no rule matches, the
* `fallback` decides; it defaults to `{ zone: DEFAULT_AUTHORITY_ZONE, allowed: true }`
* (allow-unmatched — a rules list of denials acts as a denylist). Pass an
* `allowed: false` `fallback` to flip the gate to deny-by-default (an allowlist). Wire
* the result into `createAgent` through `AgentOptions.authority`: a denied call is fed back
* to the model as a denial `ToolResult` (not executed, no budget cost), so the model
* can react. Synchronous — `evaluate` returns the verdict directly.
*
* @param options - Optional `rules` (ordered) and `fallback` (see {@link AuthorityOptions})
* @returns A working {@link AuthorityInterface}
*
* @example
* ```ts
* import { createAgent, createAuthority } from '@orkestrel/agent'
*
* // Deny the `delete` tool, allow everything else.
* const authority = createAuthority({
* 	rules: [{ match: (c) => c.call.name === 'delete', zone: 'restricted', allowed: false }],
* })
* const agent = createAgent(provider, { tools, authority })
* ```
*/
function createAuthority(options) {
	return new Authority(options);
}
/**
* Creates an agent registry — an {@link AgentRegistryInterface} holding the named pools of
* live, non-serializable pieces (providers, tools, authorities, schedulers) that a
* serializable {@link AgentJobInput}'s names resolve against, and `build`ing a seeded,
* signal-wired {@link AgentInterface} from a job.
*
* @remarks
* `providers` is required; `tools` / `authorities` / `schedulers` are optional pools.
* The accessors (`provider` / `tool` / `authority` / `scheduler`) throw an
* {@link import('./errors.js').AgentError} carrying `code: 'REGISTRY'` and the message
* `unknown <category>: <name>` on an unregistered name — a misconfigured or crash-restored
* job fails loudly rather than running with a missing dependency. `build(input, signal)`
* resolves the names, rebuilds the token budget from its ceiling, seeds the agent's
* context with the job's messages, and threads `signal` so a queue / runner abort
* propagates. This is the bridge that makes durable, serializable agent jobs runnable.
*
* @param options - The named pools (see {@link AgentRegistryOptions})
* @returns A working {@link AgentRegistryInterface}
*
* @example
* ```ts
* import { createAgentRegistry } from '@orkestrel/agent'
* import type { ProviderInterface } from '@orkestrel/agent'
* import { createTool } from '@orkestrel/tool'
*
* declare const provider: ProviderInterface // any concrete implementation supplied by the host app
* const registry = createAgentRegistry({
* 	providers: { main: provider },
* 	tools: { add: createTool({ name: 'add', execute: (a) => Number(a.x) + Number(a.y) }) },
* })
* const agent = registry.build({ provider: 'main', messages: [{ role: 'user', content: 'Hi.' }] })
* ```
*/
function createAgentRegistry(options) {
	return new AgentRegistry(options);
}
/**
* Creates a durable, bounded-concurrency agent-job queue — a {@link QueueInterface} over
* serializable {@link AgentJobInput}s that composes `createQueue`: each job is rehydrated
* through the `registry` into a live {@link AgentInterface}, run to its {@link AgentResult},
* and subjected to the partial-as-configurable-failure policy.
*
* @remarks
* - **Composes the substrate (no new engine).** The handler is the only new logic;
*   bounded `concurrency`, `retries`, the per-attempt `timeout`, and durable persistence
*   through `store` (+ `restore()` after a crash) are all the backing Queue's. `enqueue`
*   returns a per-job promise.
* - **Durable + serializable.** Because `AgentJobInput` is JSON-serializable, a `store`
*   (for example `createMemoryQueueStore` / `createDatabaseQueueStore`) persists outstanding
*   jobs; `restore()` re-enqueues them after a restart and the `registry` rehydrates the
*   live pieces from the names — so a job survives a crash.
* - **Partial policy.** A partial result throws an
*   {@link import('./errors.js').AgentJobError} by default, so a job cancelled by its
*   attempt deadline / a queue abort retries while attempts remain; `partial: true`
*   resolves the partial as success instead.
* - **Cancellation threads through.** The handler passes `context.signal` into
*   `registry.build`, so a queue `abort()` or a per-attempt timeout cancels the in-flight
*   agent (which commits a partial → throws → retries / fails per policy).
*
* @param options - The `registry`, the `partial` policy, and the substrate knobs
*   (`concurrency` / `retries` / `timeout` / `store`) (see {@link AgentQueueOptions})
* @returns A {@link QueueInterface} of {@link AgentJobInput} → {@link AgentResult}
*
* @example
* ```ts
* import { createAgentQueue, createAgentRegistry } from '@orkestrel/agent'
* import { createMemoryQueueStore } from '@orkestrel/queue'
*
* const registry = createAgentRegistry({ providers: { main: provider } })
* const store = createMemoryQueueStore(agentJobShape) // survives a restart through restore()
* const queue = createAgentQueue({ registry, concurrency: 2, retries: 1, store })
* const result = await queue.enqueue({ provider: 'main', messages: [{ role: 'user', content: 'ok?' }] })
* ```
*/
function createAgentQueue(options) {
	const { registry, partial = false, concurrency, retries, timeout, store } = options;
	return createQueue({
		...concurrency === void 0 ? {} : { concurrency },
		...retries === void 0 ? {} : { retries },
		...timeout === void 0 ? {} : { timeout },
		...store === void 0 ? {} : { store },
		handler: handleAgentQueueJob.bind(void 0, registry, partial)
	});
}
/**
* Creates an agent-job runner — a {@link RunnerInterface} over serializable
* {@link AgentJobInput}s that composes `createRunner` (one-shot, ordered, fail-fast), each unit
* rehydrated through the `registry` and subjected to the partial policy. The runner also carries
* sub-agent fan-out: a parent job's handler can `controller.spawn(childJob)`.
*
* @remarks
* - **Composes the substrate (no new engine).** Bounded `concurrency`, `retries`, the
*   per-attempt `timeout`, ordered results, and fail-fast are all the backing Runner's;
*   the handler adds only rehydration + the partial policy.
* - **Sub-agent fan-out.** Each unit's handler receives a `ControllerInterface` whose
*   `spawn(childJob)` launches a child agent job through the same bounded queue (the
*   child's result joins the run after the declared units, in spawn order). On a bounded
*   runner, fan out and return — do not inline-`await` a spawn from within the handler (a
*   slot-holding handler awaiting its own spawn can deadlock; see `ControllerInterface`).
* - **Partial policy + cancellation.** Same as `createAgentQueue`: a partial result
*   throws by default (the run's fail-fast engages), `partial: true` resolves it; the
*   handler threads `controller.signal` into `registry.build`, so a runner abort / a
*   per-attempt timeout cancels the agent.
*
* @param options - The `registry`, the `partial` policy, and the substrate knobs
*   (`concurrency` / `retries` / `timeout`) (see {@link AgentRunnerOptions})
* @returns A {@link RunnerInterface} of {@link AgentJobInput} → {@link AgentResult}
*
* @example
* ```ts
* import { createAgentRunner, createAgentRegistry } from '@orkestrel/agent'
*
* const registry = createAgentRegistry({ providers: { main: provider } })
* const runner = createAgentRunner({ registry, concurrency: 2 })
* // Run two jobs; the first fans out a child sub-agent then returns.
* const child = { provider: 'main', messages: [{ role: 'user', content: 'child' }] }
* const parent = { provider: 'main', messages: [{ role: 'user', content: 'parent' }] }
* const results = await runner.execute([parent, child]) // declared first, then any spawns
* ```
*/
function createAgentRunner(options) {
	const { registry, partial = false, concurrency, retries, timeout } = options;
	return createRunner({
		...concurrency === void 0 ? {} : { concurrency },
		...retries === void 0 ? {} : { retries },
		...timeout === void 0 ? {} : { timeout },
		handler: handleAgentRunnerJob.bind(void 0, registry, partial)
	});
}
//#endregion
//#region src/core/ledgers/constants.ts
/**
* Lists the categories the ledger files a message under, in the order the category question
* names them — the one list the {@link LedgerCategory} union derives from.
*/
var LEDGER_CATEGORIES = Object.freeze([
	"fact",
	"rule",
	"correction",
	"request",
	"opinion",
	"chatter",
	"distractor"
]);
/** Lists the categories whose messages the projection leaves out as quiet. */
var QUIET_CATEGORIES = Object.freeze(["chatter", "distractor"]);
/** Lists the categories whose messages state what the desk acts on, which the briefing renders. */
var DECISIVE_CATEGORIES = Object.freeze([
	"fact",
	"rule",
	"correction"
]);
/** Lists the categories that place a message no owner claims on the rules record. */
var PLACED_CATEGORIES = Object.freeze(["rule", "correction"]);
/** Names the key of the record that holds the rules no owner claims. */
var LEDGER_RULES_KEY = "rules";
/** Prefixes the key of an owner's record, which the owner's id follows. */
var LEDGER_OWNER_PREFIX = "owner:";
/**
* Supplies the wording of every question the ledger asks its judge.
*
* @remarks
* The wording names a support desk. Fit the cutoffs for the wording and judge you use.
*/
var LEDGER_QUESTIONS = Object.freeze({
	category: Object.freeze({
		form: "choice",
		instructions: "Which category best describes what this support-desk message states?",
		criteria: Object.freeze({
			fact: "States a fact about a customer, an order, an account, the desk, or the day",
			rule: "States a standing rule, policy, or instruction the desk must follow",
			correction: "Corrects, replaces, or withdraws a value or rule stated earlier",
			request: "Asks the assistant to do a task or to answer a question",
			opinion: "States a personal view or judgment rather than a fact",
			chatter: "Talk with the agent that states nothing the desk acts on",
			distractor: "A statement about something outside the desk's work"
		})
	}),
	topic: "Does this support-desk message concern the named desk topic?",
	amends: Object.freeze({
		form: "noul",
		instructions: "Does the later message replace or withdraw any value or rule the earlier message states?",
		criteria: Object.freeze({
			true: "The later message replaces or withdraws at least one value or rule the earlier message states",
			false: "Every value and rule the earlier message states stays in force after the later message"
		})
	}),
	supersedes: Object.freeze({
		form: "noul",
		instructions: "Does the later message replace or withdraw everything the earlier message states?",
		criteria: Object.freeze({
			true: "The later message replaces or withdraws everything the earlier message states",
			false: "Some value or rule the earlier message states stays in force after the later message"
		})
	})
});
/**
* Supplies the text of each ledger note, worded for a model that answers in its final
* message.
*/
var LEDGER_NOTES = Object.freeze({
	cue: "[Desk] Give your complete answer now as your final message, from what you already have.",
	results: "[Desk] What your lookups and recalls returned in this request:",
	repeat: "You already have this result earlier in this request; give your complete answer now as your final message.",
	closed: "recall is closed for the rest of this request; give your final answer from what you have"
});
/**
* Supplies the default prompt and tail shares.
*/
var DEFAULT_LEDGER_SHARE = Object.freeze({
	prompt: .7,
	tail: .35
});
/**
* Caps the tool-iteration turns of a ledger's agent at 8 turns.
*/
var DEFAULT_LEDGER_LIMIT = 8;
/**
* Caps the `recall` calls of one request at 2 calls.
*/
var DEFAULT_RECALL_LIMIT = 2;
/**
* Holds back the share of the prompt budget the scale can rise by between calibration and a
* request's first call.
*
* @remarks
* Across the `ledger-deny` and `ledger-admit` series of 2026-10-08, a
* request's first-call tokens per estimate unit rose at most from 1.150 at the seed to 1.212, 5.4
* percent; the ledger divides its prompt budget by 1.06.
*/
var LEDGER_SCALE_DRIFT = .06;
/** Matches the logprob decoding failure `invalid or duplicate top logprob token`, which the ledger holds for the ledger's life. */
var DETERMINISTIC_JUDGE_ERROR = /invalid or duplicate top logprob token/;
//#endregion
//#region src/core/ledgers/errors.ts
/**
* Reports an invalid ledger configuration, failed calibration, or unowned request selection,
* carrying the machine-readable `code`.
*
* @remarks
* A threshold, share, capacity, limit, topic, lookup, or gauge outside its bounds is a programmer
* error and throws this with the matching {@link LedgerErrorCode}. A calibration call that reports
* no prompt usage throws this with `'GAUGE'`. Narrow a caught value with {@link isLedgerError} and
* branch on `error.code`. A selection without an active `respond` call, or for a request other than
* that call's request or a ledger note, reports `'REQUEST'` through the selection's fault.
*/
var LedgerError = class extends Error {
	/** Names the machine-readable condition; the {@link LedgerErrorCode} union describes each code. */
	code;
	constructor(code, message) {
		super(message);
		this.name = "LedgerError";
		this.code = code;
	}
};
/**
* Narrows an unknown caught value to a {@link LedgerError} through `instanceof`, so a `catch` can
* branch on its `code`.
*
* @param value - The value to test (typically a `catch` binding)
* @returns True if `value` is a {@link LedgerError}; false otherwise
*
* @example
* ```ts
* isLedgerError(new LedgerError('GAUGE', 'calibration reported no prompt usage')) // true
* ```
*/
function isLedgerError(value) {
	return isInstance(value, LedgerError);
}
//#endregion
//#region src/core/ledgers/helpers.ts
/**
* Resolves the call that owns a tool message within a collected tool group.
* @param group - The assistant leader followed by its tool results
* @param message - The tool result to pair; distinct leader ids pair by result id when any result has one
* @returns The call matching the result's call id, or its position when the leader repeats an id or every result lacks an id; undefined when unpaired
* @example
* ```ts
* resolveLedgerCall(group, result)?.arguments
* ```
*/
function resolveLedgerCall(group, message) {
	const [leader, ...results] = group;
	const at = results.findIndex((result) => result.id === message.id);
	if (message.role !== "tool" || at < 0) return void 0;
	const calls = leader?.calls ?? [];
	return !(new Set(calls.map((call) => call.id)).size !== calls.length) && results.some((result) => result.call !== void 0) ? calls.find((call) => call.id === message.call) : calls[at];
}
/**
* Ranks a briefing source for removal before the next prompt.
*
* @param group - The planning group: 1 for a topic match, 2 for an off-topic rule or correction, or 3 for a name match
* @param loose - If `true`, the source is a user message without a decisive category; if `false`, it is another source
* @param category - The source's recorded category, or undefined when undecided
* @returns The ascending removal rank: name matches, loose sources, off-topic corrections, off-topic rules, then topic matches
* @remarks
* The planner removes lower ranks first. Equal ranks 0, 1, and 4 remove lower scores first;
* every equal rank then removes later conversation positions first.
* @example
* ```ts
* rankLedgerCut(2, false, 'rule') // 3
* ```
*/
function rankLedgerCut(group, loose, category) {
	return group === 3 ? 0 : loose ? 1 : group === 2 ? category === "rule" ? 3 : 2 : 4;
}
/**
* Resolves the generation cap and checks it against the context capacity.
*
* @param predict - The optional generation cap in tokens; see {@link LedgerOptions}
* @param capacity - The context capacity in tokens
* @returns The validated cap
* @throws {LedgerError} Thrown when the cap is not a nonnegative safe integer less than capacity (code `'CAPACITY'`)
* @example
* ```ts
* resolvePredict(1024, 4096) // 1024
* ```
*/
function resolvePredict(predict, capacity) {
	const resolved = predict ?? 0;
	if (!Number.isSafeInteger(resolved) || resolved < 0 || resolved >= capacity) throw new LedgerError("CAPACITY", "predict must be a nonnegative safe integer less than capacity");
	return resolved;
}
/**
* Computes the completion tokens attributable to a message's thinking.
*
* @remarks
* Weights the completion by thinking characters divided by the combined characters of thinking,
* content, and JSON-serialized calls. Rounds to the nearest integer and caps at the completion.
* An empty generation yields 0. The completion must be a finite nonnegative integer token count.
* Calls that cannot be JSON-serialized contribute 0 characters.
*
* @param message - The generated thinking, content, and optional calls
* @param completion - The tokens reported for the completion
* @returns The thinking share in tokens, or 0 when no thinking characters exist
*
* @example
* ```ts
* computeThinking({ thinking: 'plan', content: 'ok' }, 10) // 7
* ```
*/
function computeThinking(message, completion) {
	const thinking = message.thinking?.length ?? 0;
	if (thinking === 0) return 0;
	let calls = 0;
	try {
		calls = message.calls === void 0 ? 0 : JSON.stringify(message.calls).length;
	} catch {}
	const generated = thinking + message.content.length + calls;
	return Math.min(completion, Math.round(completion * (thinking / generated)));
}
/**
* Splits a message into its sentences.
*
* @remarks
* A sentence ends at a period, question mark, or exclamation mark followed by a space and a capital
* letter, a digit, or a quote, so a decimal point, an id, or an amount never splits one.
*
* @param text - The message text
* @returns The trimmed, non-empty sentences in order
*
* @example
* ```ts
* splitSentences('Refunds over $200 need a manager. Ask Odile.')
* // ['Refunds over $200 need a manager.', 'Ask Odile.']
* ```
*/
function splitSentences(text) {
	return text.split(/(?<=[.!?])\s+(?=[\p{Lu}\d"'“])/u).map((sentence) => sentence.trim()).filter((sentence) => sentence !== "");
}
/**
* Reads the id-shaped tokens and the numbers of a text.
*
* @param text - The text to read
* @returns The uppercased hyphenated ids that hold a digit, and the numbers outside those ids with grouping commas removed
*
* @example
* ```ts
* const tokens = extractTokens('Order bw-5512 totals 1,200.50')
* // tokens.ids is Set { 'BW-5512' }, tokens.numbers is Set { 1200.5 }
* ```
*/
function extractTokens(text) {
	const idShape = /\b[A-Za-z0-9]+(?:-[A-Za-z0-9]+)+\b/g;
	const ids = /* @__PURE__ */ new Set();
	for (const [token] of text.matchAll(idShape)) if (/\d/.test(token)) ids.add(token.toUpperCase());
	const rest = text.replace(idShape, (token) => /\d/.test(token) ? " " : token);
	const numbers = /* @__PURE__ */ new Set();
	for (const [token] of rest.matchAll(/(?<![\w.])\d[\d,]*(?:\.\d+)?/g)) {
		const value = Number(token.replace(/,/g, ""));
		if (Number.isFinite(value)) numbers.add(value);
	}
	return {
		ids,
		numbers
	};
}
/**
* Collects the capitalized name runs of a text, leaving out the run that opens each sentence.
*
* @remarks
* A sentence opens with a capital whatever its first word is, so its opening run proves nothing.
* This is the reading the person prefix of {@link buildRecords} rests on.
*
* @param text - The text to read
* @returns The capitalized runs in order, repeats included
*
* @example
* ```ts
* collectNames('Odile phoned. We asked about Odile Marlow.') // ['Odile Marlow']
* ```
*/
function collectNames(text) {
	return splitSentences(text).flatMap((sentence) => [...sentence.matchAll(/(?<![\p{L}\p{N}'-])\p{Lu}\p{Ll}+(?: \p{Lu}\p{Ll}+)*(?![\p{L}\p{N}-])/gu)].filter((match) => (match.index ?? 0) > 0).map((match) => match[0]));
}
/**
* Identifies a lookup reading for projection by its tool name and normalized arguments.
*
* @remarks
* Two calls share an identity whatever the key order of their arguments at any depth. A top-level
* string argument is trimmed and uppercased first, so `"lh-1 "` and `"LH-1"` name one call.
* The ledger's repeat stop instead compares the tool name and canonical arguments without this
* string normalization, so those argument spellings remain distinct within a request.
*
* @param name - The tool name
* @param args - The arguments the call carried
* @returns The identity: the name, a space, and the canonical arguments
*
* @example
* ```ts
* identifyLookup('lookup_order', { id: 'bw-5512', opts: { b: 1, a: 2 } }) ===
* 	identifyLookup('lookup_order', { opts: { a: 2, b: 1 }, id: ' BW-5512' }) // true
* ```
*/
function identifyLookup(name, args) {
	const normalized = Object.fromEntries(Object.entries(args).map(([key, value]) => [key, isString(value) ? value.trim().toUpperCase() : value]));
	return `${name} ${canonicalStringify(normalized) ?? ""}`;
}
/**
* Links each id-shaped lookup argument to its owner.
*
* @remarks
* An owner argument links to itself. Any other id-shaped argument links to the single owner id its
* reading's text names. An empty reading links nothing, and a later reading overwrites an earlier
* link of the same argument.
*
* @param readings - The lookup readings in conversation order
* @param owners - The owners keyed by id
* @returns The owner id of each linked argument id; an argument whose text names no owner or several is absent
*
* @example
* ```ts
* linkOwners(
* 	[{ id: 'tool-1', name: 'lookup_order', arguments: { id: 'BW-5512' }, text: 'Order BW-5512 for account BW-20931.', result: { ids: [], owners: [] } }],
* 	new Map([['BW-20931', ['Brightwater Studio']]]),
* ) // Map { 'BW-5512' => 'BW-20931' }
* ```
*/
function linkOwners(readings, owners) {
	const links = /* @__PURE__ */ new Map();
	for (const reading of readings) {
		if (reading.result === void 0) continue;
		const named = [...extractTokens(reading.text).ids].filter((id) => owners.has(id));
		const [only] = named;
		const subjects = Object.values(reading.arguments).filter(isString).map((value) => value.trim().toUpperCase()).filter((subject) => extractTokens(subject).ids.has(subject));
		for (const subject of subjects) if (owners.has(subject)) links.set(subject, subject);
		else if (named.length === 1 && only !== void 0) links.set(subject, only);
	}
	return links;
}
/**
* Collects the ids and the owner names the lookup readings named.
*
* @remarks
* Every reading counts, a replaced one included, because an id a lookup named stays registered.
* An empty reading names nothing. An owner name is trimmed, and a name without a letter is dropped.
*
* @param readings - The lookup readings in conversation order
* @returns The registry: every id named, and each owner's names in the order read
*
* @example
* ```ts
* const registry = collectRegistry([
* 	{ id: 'tool-1', name: 'lookup_customer', arguments: { account: 'BW-20931' }, text: 'Account BW-20931: Brightwater Studio', result: { ids: ['BW-20931'], owners: [{ id: 'BW-20931', names: ['Brightwater Studio'] }] } },
* ])
* // registry.owners is Map { 'BW-20931' => ['Brightwater Studio'] }
* ```
*/
function collectRegistry(readings) {
	const ids = /* @__PURE__ */ new Set();
	const owners = /* @__PURE__ */ new Map();
	for (const reading of readings) {
		if (reading.result === void 0) continue;
		for (const id of reading.result.ids) ids.add(id);
		for (const owner of reading.result.owners) {
			ids.add(owner.id);
			const names = owners.get(owner.id) ?? [];
			const added = owner.names.map((name) => name.trim()).filter((name) => /\p{L}/u.test(name) && !names.includes(name));
			owners.set(owner.id, [...names, ...new Set(added)]);
		}
	}
	return {
		ids,
		owners
	};
}
/**
* Matches the registry ids and owners a text names.
*
* @remarks
* An id counts when the text holds it as an id token. An owner counts when the text holds one of
* its names whole. With `partial`, a capitalized name word that only one name carries also names
* that name's owners, matched case-sensitively so a common word that spells a first name does not.
*
* @param registry - The registry to match against
* @param text - The text to read
* @param partial - If `true`, a name word only one name carries also names its owners; if `false`, only a whole name does
* @returns The registry ids and owner ids the text names
*
* @example
* ```ts
* const registry = { ids: new Set(['BW-20931']), owners: new Map([['BW-20931', ['Brightwater Studio']]]) }
* matchEntities(registry, 'Ask Brightwater about it', true) // Set { 'BW-20931' }
* matchEntities(registry, 'Ask Brightwater about it', false) // Set {}
* ```
*/
function matchEntities(registry, text, partial) {
	const found = /* @__PURE__ */ new Set();
	const tokens = extractTokens(text).ids;
	for (const id of registry.ids) if (tokens.has(id)) found.add(id);
	const aliases = /* @__PURE__ */ new Map();
	for (const [id, names] of registry.owners) for (const name of names) aliases.set(name, [...aliases.get(name) ?? [], id]);
	const carriers = /* @__PURE__ */ new Map();
	for (const name of aliases.keys()) for (const word of new Set(name.split(/\s+/))) carriers.set(word, (carriers.get(word) ?? 0) + 1);
	for (const [name, ids] of aliases) {
		const words = partial ? name.split(/\s+/).filter((word) => /^\p{Lu}\p{L}+$/u.test(word) && carriers.get(word) === 1) : [];
		if ([{
			needle: name,
			flags: "iu"
		}, ...words.map((word) => ({
			needle: word,
			flags: "u"
		}))].some(({ needle, flags }) => {
			const escaped = needle.replace(/[.*+?^$()|{}[\]\\]/g, "\\$&");
			return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, flags).test(text);
		})) for (const id of ids) found.add(id);
	}
	return found;
}
/**
* Projects the owner records and the rules record from a conversation's messages.
*
* @remarks
* Each line is a sentence of a live message, verbatim except that a sentence that opens with a pronoun opens with its party and a colon. A message is live when it is a user message,
* or a tool message whose reading is the last reading of its call, and the input neither excludes it nor
* files it quiet or superseded. A reading with an undefined `result` still replaces the earlier
* reading of the same call, so the earlier result leaves every record.
*
* A live message joins the owner records its entities name, directly or through a linked lookup
* argument. A message that names no owner joins where its earlier side of an amended pair joins,
* or on the rules record when it is filed as a rule or a correction, and is loose otherwise.
*
* A sentence an amending message made stale is left out and listed in `stale`. An amending message
* that is itself superseded keeps that effect, so the old value never revives.
*
* A sentence that opens with a pronoun takes the party named in the sentence before it. The reading
* trusts capitals, so a capitalized word that is no person, such as a carrier named mid-sentence,
* is read as the party. This is a documented limit that the measured series kept: the prefix carries
* the follow-up facts the records exist for.
*
* @param input - The messages, readings, entities, and classification to project
* @returns The records with owner records ordered by their first member and the rules record last, the stale sentences, and the live message ids no record placed
*
* @example
* ```ts
* const projection = buildRecords({
* 	system: 'You staff the desk.',
* 	exclude: [],
* 	owners: new Map([['BW-20931', ['Brightwater Studio']]]),
* 	messages: [{ id: 'user-1', role: 'user', content: 'Brightwater Studio asked for a refund.' }],
* 	readings: [],
* 	entities: new Map([['user-1', ['BW-20931']]]),
* 	classification: { quiet: new Set(), categories: new Map(), topics: new Map(), amended: new Map(), superseded: new Map() },
* })
* // projection.records[0].title === 'Brightwater Studio (account BW-20931)'
* ```
*/
function buildRecords(input) {
	const position = /* @__PURE__ */ new Map();
	const byId = /* @__PURE__ */ new Map();
	for (const [at, message] of input.messages.entries()) {
		position.set(message.id, at);
		byId.set(message.id, message);
	}
	const live = collectLive(input);
	const links = linkOwners(input.readings, input.owners);
	const amending = /* @__PURE__ */ new Map();
	for (const [earlier, laters] of input.classification.amended) for (const later of laters) amending.set(later, [...amending.get(later) ?? [], earlier]);
	const stale = collectStale(input, byId, live);
	const dead = new Set(stale.map((entry) => `${entry.source} ${entry.sentence}`));
	const holders = [...input.owners.values()].flat();
	const system = collectNames(input.system);
	const members = /* @__PURE__ */ new Map();
	const loose = [];
	for (const id of live) {
		const keys = placeMember(input, links, amending, id, /* @__PURE__ */ new Set());
		if (keys.size === 0) loose.push(id);
		for (const key of keys) members.set(key, [...members.get(key) ?? [], id]);
	}
	return {
		records: [...members].map(([key, ids]) => {
			const lines = ids.flatMap((id) => buildLines(input, byId, id, dead, holders, system));
			const owner = key.slice(LEDGER_OWNER_PREFIX.length);
			const holder = input.owners.get(owner)?.[0];
			const title = key === "rules" ? "Rules" : holder === void 0 ? `account ${owner}` : `${holder} (account ${owner})`;
			return {
				first: position.get(ids[0] ?? "") ?? 0,
				record: {
					key,
					title,
					members: ids,
					lines
				}
			};
		}).sort((left, right) => Number(left.record.key === "rules") - Number(right.record.key === "rules") || left.first - right.first || (left.record.key < right.record.key ? -1 : left.record.key > right.record.key ? 1 : 0)).map(({ record }) => record),
		stale,
		loose
	};
}
/**
* Selects a request's view of the projected records.
*
* @remarks
* The view holds the owner records the request names in the order it names them, then the rules
* record with the lines whose topics meet the request's first, each group in position order. The
* returned records and lines are copies.
*
* @param projection - The output of {@link buildRecords}
* @param request - The owners and the desk topics the request names
* @returns The selected records; an owner with no record yields none
*
* @example
* ```ts
* selectRecords(projection, { owners: ['BW-20931'], topics: ['refunds'] }).map((record) => record.key)
* // ['owner:BW-20931', 'rules']
* ```
*/
function selectRecords(projection, request) {
	const topics = new Set(request.topics);
	const views = [];
	for (const owner of new Set(request.owners)) {
		const record = projection.records.find((one) => one.key === `${LEDGER_OWNER_PREFIX}${owner}`);
		if (record !== void 0) views.push(structuredClone(record));
	}
	const rules = projection.records.find((one) => one.key === LEDGER_RULES_KEY);
	if (rules !== void 0) {
		const met = rules.lines.filter((line) => line.topics.some((topic) => topics.has(topic)));
		const rest = rules.lines.filter((line) => !line.topics.some((topic) => topics.has(topic)));
		views.push(structuredClone({
			...rules,
			lines: [...met, ...rest]
		}));
	}
	return views;
}
/**
* Renders one record as a heading and one list item per line.
*
* @remarks
* The briefing joins rendered records with one blank line.
*
* @param record - A record or view with a `title` and `lines`
* @returns `## TITLE` followed by `- LINE` for each line
*
* @example
* ```ts
* renderLedgerRecord({ title: 'Rules', lines: [{ text: 'Refunds need a manager.', source: 'user-1', sentence: 0, topics: [], role: 'user' }] })
* // '## Rules\n- Refunds need a manager.'
* ```
*/
function renderLedgerRecord(record) {
	return [`## ${record.title}`, ...record.lines.map((line) => `- ${line.text}`)].join("\n");
}
/**
* Renders one owner record under a `###` heading, which the briefing nests under its one `## Pinned` heading.
*
* @param record - An owner record or view with a `title` and `lines`
* @returns `### TITLE` followed by `- LINE` for each line
*
* @example
* ```ts
* renderLedgerPinned({ title: 'Odile Marlow (account OM-30418)', lines: [] }) // '### Odile Marlow (account OM-30418)'
* ```
*/
function renderLedgerPinned(record) {
	return [`### ${record.title}`, ...record.lines.map((line) => `- ${line.text}`)].join("\n");
}
/**
* Splits a recall topic at its joints.
*
* @remarks
* The joints are a comma, a semicolon, a slash, and the word `and`. A topic with no joint is
* returned whole, so a model that joins a name and an id recalls each part alone.
*
* @param topic - The topic the model asked for
* @returns The trimmed, non-empty parts when there are at least two; otherwise the topic itself
*
* @example
* ```ts
* splitTopic('BW-5512, Odile Marlow and refunds') // ['BW-5512', 'Odile Marlow', 'refunds']
* ```
*/
function splitTopic(topic) {
	const parts = topic.split(/\s*[,;/]\s*|\s+and\s+/i).map((part) => part.trim()).filter((part) => part !== "");
	return parts.length > 1 ? parts : [topic];
}
/**
* Cuts entries to a room and names how many it left out.
*
* @remarks
* The cut keeps at least one entry. When it leaves entries out, its last line reads
* `N older items not shown; name a narrower topic to narrow the recall`, which
* {@link matchesCutLine} recognizes.
*
* @param entries - The entries in the order they are kept
* @param room - The estimate units the joined entries can take
* @returns The kept entries followed by the cut line when any were left out, joined by newlines
*
* @example
* ```ts
* cutListing(['first entry', 'second entry'], 1) // 'first entry\n1 older item not shown; name a narrower topic to narrow the recall'
* ```
*/
function cutListing(entries, room) {
	const kept = [];
	for (const entry of entries) {
		if (kept.length > 0 && estimateMessages([{
			id: "recall",
			role: "tool",
			content: [...kept, entry].join("\n")
		}]) > room) break;
		kept.push(entry);
	}
	const left = entries.length - kept.length;
	if (left > 0) kept.push(`${left} older item${left === 1 ? "" : "s"} not shown; name a narrower topic to narrow the recall`);
	return kept.join("\n");
}
/**
* Checks whether a line is the cut line {@link cutListing} writes.
*
* @param line - The line to check
* @returns True if the line is a cut line; false otherwise
*
* @example
* ```ts
* matchesCutLine('2 older items not shown; name a narrower topic to narrow the recall') // true
* ```
*/
function matchesCutLine(line) {
	return /^\d+ older items? not shown; /.test(line);
}
/**
* Renders the tail stub of a lookup result from an earlier request.
*
* @param name - The lookup tool name
* @param args - The arguments the call carried
* @param state - What became of the result: `failed`, `empty`, `shown` in the briefing, or `hidden` from it
* @returns The stub text, which carries the call and its state
*
* @example
* ```ts
* renderStub('lookup_order', { id: 'BW-5512' }, 'hidden')
* // 'lookup_order {"id":"BW-5512"}: result not shown; call recall with BW-5512'
* ```
*/
function renderStub(name, args, state) {
	const head = `${name} ${JSON.stringify(args)}`;
	if (state === "failed") return `${head}: failed`;
	if (state === "empty") return `${head}: no record`;
	if (state === "shown") return `${head}: result shown under Pinned in the system message`;
	return `${head}: result not shown; call recall with ${(Object.values(args).find(isString) ?? "").trim() || "its id"}`;
}
/**
* Fits the marginal tokens one estimate unit adds within a request.
*
* @remarks
* The fit is the least-squares slope of prompt tokens over estimate, taken within each set of calls
* that advertised the same number of tools and pooled over every group. The estimate counts no tool
* schema, so a pooled fit across tool counts would read the dropped schemas as a falling rate.
*
* @param groups - The calls of each request
* @returns The slope, or undefined when no set holds two calls with a prompt count and an estimate that differ
*
* @example
* ```ts
* fitSlope([[{ estimate: 100, prompt: 130, tools: 2 }, { estimate: 200, prompt: 260, tools: 2 }]]) // 1.3
* ```
*/
function fitSlope(groups) {
	let spread = 0;
	let product = 0;
	for (const group of groups) for (const set of Map.groupBy(group, (call) => call.tools).values()) {
		const points = set.flatMap((call) => isFiniteNumber(call.prompt) && call.estimate > 0 ? [{
			estimate: call.estimate,
			prompt: call.prompt
		}] : []);
		if (points.length < 2) continue;
		const meanX = points.reduce((sum, point) => sum + point.estimate, 0) / points.length;
		const meanY = points.reduce((sum, point) => sum + point.prompt, 0) / points.length;
		for (const point of points) {
			spread += (point.estimate - meanX) ** 2;
			product += (point.estimate - meanX) * (point.prompt - meanY);
		}
	}
	return spread > 0 ? product / spread : void 0;
}
/**
* Collects the ids of the live messages in conversation order.
*
* @remarks
* A message is live when it is a user message, or a tool message whose reading is the last reading of its
* call, and the input neither excludes it nor files it quiet or superseded. A reading replaces any
* earlier reading of the same call, an empty one included, so an empty lookup leaves the earlier
* result out of every record.
*
* @param input - The messages, readings, and classification to read
* @returns The live message ids
*
* @example
* ```ts
* collectLive(input) // ['user-1', 'tool-2']
* ```
*/
function collectLive(input) {
	const { classification } = input;
	const excluded = new Set(input.exclude);
	const position = new Map(input.messages.map((message, at) => [message.id, at]));
	const readings = input.readings.filter((reading) => position.has(reading.id));
	const identities = new Map(readings.map((reading) => [reading.id, identifyLookup(reading.name, reading.arguments)]));
	const current = new Set(readings.filter((reading) => reading.result !== void 0 && !readings.some((later) => (position.get(later.id) ?? -1) > (position.get(reading.id) ?? -1) && identities.get(later.id) === identities.get(reading.id))).map((reading) => reading.id));
	return [...new Map(input.messages.map((message) => [message.id, message])).values()].filter((message) => message.role === "user" || message.role === "tool" && current.has(message.id)).map((message) => message.id).filter((id) => !excluded.has(id) && !classification.quiet.has(id) && (classification.superseded.get(id) ?? []).length === 0);
}
/**
* Places a message on the record keys it joins.
*
* @remarks
* A message joins the owner records its entities name, directly or through a linked lookup argument.
* A message that names no owner joins where the earlier side of its amended pair joins, and a
* message with no earlier side joins the rules record when it is filed as a rule or a correction.
* A message that is not live still places, because a correction joins where its earlier side would
* join.
*
* @param input - The owners, entities, and classification to read
* @param links - The owner of each linked lookup argument, from {@link linkOwners}
* @param amending - The earlier sides of each message's amended pairs
* @param id - The message id
* @param seen - The ids already visited, which stops a cycle of amended pairs
* @returns The record keys, empty when the message is loose
*
* @example
* ```ts
* placeMember(input, new Map(), new Map(), 'user-1', new Set()) // Set { 'owner:BW-20931' }
* ```
*/
function placeMember(input, links, amending, id, seen) {
	const keys = /* @__PURE__ */ new Set();
	for (const entity of input.entities.get(id) ?? []) {
		const owner = input.owners.has(entity) ? entity : links.get(entity);
		if (owner !== void 0) keys.add(`${LEDGER_OWNER_PREFIX}${owner}`);
	}
	if (keys.size > 0) return keys;
	const earlier = (amending.get(id) ?? []).filter((side) => side !== id && !seen.has(side));
	if (earlier.length > 0) {
		for (const side of earlier) for (const key of placeMember(input, links, amending, side, /* @__PURE__ */ new Set([...seen, id]))) keys.add(key);
		return keys;
	}
	const category = input.classification.categories.get(id);
	if (category !== void 0 && PLACED_CATEGORIES.includes(category)) keys.add(LEDGER_RULES_KEY);
	return keys;
}
/**
* Collects the sentences that live messages made stale.
*
* @remarks
* A sentence of a live message is stale when it shares an id or a number with a message that
* amends it. An amending message takes effect while it is live, and keeps its effect after another
* message supersedes it, so the value it replaced never revives. A user or tool message that the
* input excludes or files quiet never takes effect.
*
* @param input - The exclusions and classification to read
* @param byId - The messages by id
* @param live - The live message ids from {@link collectLive}
* @returns The stale sentences in conversation order, each with the tokens it shares
*
* @example
* ```ts
* collectStale(input, byId, ['user-1', 'user-3']) // [{ source: 'user-1', sentence: 1, tokens: ['ESC-2291'] }]
* ```
*/
function collectStale(input, byId, live) {
	const { classification } = input;
	const excluded = new Set(input.exclude);
	const effective = /* @__PURE__ */ new Set([...live, ...[...byId.values()].filter((message) => message.role !== "assistant" && !excluded.has(message.id) && !classification.quiet.has(message.id) && (classification.superseded.get(message.id) ?? []).length > 0).map((message) => message.id)]);
	const stale = [];
	for (const id of live) {
		const laters = (classification.amended.get(id) ?? []).filter((later) => effective.has(later)).flatMap((later) => {
			const message = byId.get(later);
			return message === void 0 ? [] : [extractTokens(message.content)];
		});
		if (laters.length === 0) continue;
		for (const [sentence, text] of splitSentences(byId.get(id)?.content ?? "").entries()) {
			const own = extractTokens(text);
			const tokens = /* @__PURE__ */ new Set();
			for (const other of laters) {
				for (const token of own.ids) if (other.ids.has(token)) tokens.add(token);
				for (const token of own.numbers) if (other.numbers.has(token)) tokens.add(String(token));
			}
			if (tokens.size > 0) stale.push({
				source: id,
				sentence,
				tokens: [...tokens]
			});
		}
	}
	return stale;
}
/**
* Builds the record lines of one message.
*
* @remarks
* Each sentence that is not stale becomes a line. A sentence that opens with a pronoun and follows
* another sentence takes the last name of the sentence before it that is neither an owner name nor
* a system name, and its line text opens with that party and a colon.
*
* @param input - The classification whose topics the lines carry
* @param byId - The messages by id
* @param id - The message id
* @param dead - The stale sentences as `SOURCE SENTENCE` keys
* @param holders - The owner names, which never serve as a party
* @param system - The system text's names, which never serve as a party
* @returns The lines in sentence order; empty when the message is absent
*
* @example
* ```ts
* buildLines(input, byId, 'user-1', new Set(), [], []).map((line) => line.text)
* // ['Odile Marlow phoned about BW-5512.', 'Odile Marlow: She wants a refund.']
* ```
*/
function buildLines(input, byId, id, dead, holders, system) {
	const message = byId.get(id);
	if (message === void 0) return [];
	const sentences = splitSentences(message.content);
	const topics = input.classification.topics.get(id) ?? [];
	return sentences.flatMap((sentence, at) => {
		if (dead.has(`${id} ${at}`)) return [];
		const party = /^(?:He|She|They|His|Her|Their)(?![\p{L}\p{N}])/u.test(sentence) && at > 0 ? collectNames(sentences[at - 1] ?? "").filter((name) => !holders.includes(name) && !system.includes(name)).at(-1) : void 0;
		const line = {
			text: party === void 0 ? sentence : `${party}: ${sentence}`,
			source: id,
			sentence: at,
			topics: [...topics],
			role: message.role
		};
		return [party === void 0 ? line : {
			...line,
			party
		}];
	});
}
//#endregion
//#region src/core/ledgers/Classifier.ts
/**
* Files messages through the conversation's judgment manager and reads their categories and corrections.
*
* @example
* ```ts
* const classifier = new Classifier(options)
* await classifier.classify(new Set(), signal)
* const filing = classifier.classification()
* ```
*/
var Classifier = class {
	#options;
	#failed = /* @__PURE__ */ new Set();
	/**
	* Creates the filing engine with the ledger's handlers and calibrated questions.
	* @param options - The conversation, judge, questions, cutoffs, and handlers
	*/
	constructor(options) {
		this.#options = options;
	}
	/**
	* Asks the judge every question the filing still lacks, in the measured order.
	* @param requests - The ids of the messages that belong to the current request
	* @param signal - The caller's signal; an abort returns a fault with completed judgments and usage
	* @returns The judgment keys and summed usage; a throw from the assign or entities handler, or a caller abort, returns the partial result with `fault`; a judge rejection under a live signal leaves that question undecided and sets no `fault`
	*/
	async classify(requests, signal) {
		const results = [];
		let fault;
		try {
			const messages = this.#options.conversation.messages();
			const asked = messages.filter((message) => this.#options.assign(message) === void 0);
			for (const message of asked) if (!requests.has(message.id)) results.push(await this.#ask(this.#buildCategory(message.id), signal, results));
			for (const message of asked) {
				if (!requests.has(message.id) && this.quiet(message.id)) continue;
				for (const topic of this.#options.topics) {
					if (requests.has(message.id) && topic.requested === false) continue;
					results.push(await this.#ask(this.#buildTopic(message.id, topic), signal, results));
				}
			}
			for (const later of asked) {
				if (later.role !== "user" || (this.#readCategories(later.id)?.probabilities.correction ?? 0) < this.#options.thresholds.correction) continue;
				const near = this.#collectNear(later);
				if (near.size === 0) continue;
				for (const earlier of messages) {
					if (earlier.id === later.id) break;
					if (this.quiet(earlier.id) || ![...this.#collectNear(earlier)].some((topic) => near.has(topic))) continue;
					const spec = this.#buildPair("amends", earlier.id, later.id);
					results.push(await this.#ask(spec, signal, results));
					if ((this.#readNoul(spec) ?? 0) >= this.#options.thresholds.amends) results.push(await this.#ask(this.#buildPair("supersedes", earlier.id, later.id), signal, results));
				}
			}
		} catch (error) {
			fault = isError(error) ? error : new Error(String(error));
		}
		let usage;
		for (const result of results) if (result.usage !== void 0) usage = sumUsage(usage, result.usage);
		return {
			judgments: results.flatMap((result) => result.judgments),
			...fault === void 0 ? {} : { fault },
			...usage === void 0 ? {} : { usage }
		};
	}
	/**
	* Reads the category a message is filed under.
	* @param id - The message id
	* @returns The assigned category, the recorded category at the cutoff, or `undefined`
	*/
	category(id) {
		const message = this.#options.conversation.message(id);
		if (message === void 0) return void 0;
		const assigned = this.#options.assign(message);
		if (assigned !== void 0) return assigned;
		const answer = this.#readCategories(id);
		let best;
		let highest = this.#options.thresholds.category;
		for (const [option, probability] of Object.entries(answer?.probabilities ?? {})) {
			const category = LEDGER_CATEGORIES.find((candidate) => candidate === option);
			if (category !== void 0 && probability >= highest && (best === void 0 || probability > highest)) {
				best = category;
				highest = probability;
			}
		}
		return best;
	}
	/**
	* Reports whether a message files under a quiet category.
	* @param id - The message id
	* @returns True if the assigned or recorded category is quiet; false otherwise.
	*/
	quiet(id) {
		const message = this.#options.conversation.message(id);
		if (message === void 0) return false;
		const assigned = this.#options.assign(message);
		if (assigned !== void 0) return QUIET_CATEGORIES.includes(assigned);
		return this.#weigh(id, QUIET_CATEGORIES) >= this.#options.thresholds.category;
	}
	/**
	* Reports whether a message files under a decisive category.
	* @param id - The message id
	* @returns True if the recorded decisive weight reaches the category cutoff; false otherwise.
	*/
	decisive(id) {
		return this.#weigh(id, DECISIVE_CATEGORIES) >= this.#options.thresholds.category;
	}
	/**
	* Reads the topics a message concerns.
	* @param id - The message id
	* @returns The names of the topics whose recorded weight reaches the topic cutoff
	*/
	topics(id) {
		const message = this.#options.conversation.message(id);
		const found = /* @__PURE__ */ new Set();
		if (message === void 0) return found;
		for (const topic of this.#options.topics) if ((this.#readNoul(this.#buildTopic(id, topic)) ?? 0) >= this.#options.thresholds.topic) found.add(topic.name);
		return found;
	}
	/**
	* Reads the whole filing from the recorded judgments.
	* @returns The quiet ids, categories, topics, and the amended and superseded marks
	*/
	classification() {
		const messages = this.#options.conversation.messages();
		const positions = new Map(messages.map((message, at) => [message.id, at]));
		const quiet = /* @__PURE__ */ new Set();
		const categories = /* @__PURE__ */ new Map();
		const topics = /* @__PURE__ */ new Map();
		const amended = /* @__PURE__ */ new Map();
		const superseded = /* @__PURE__ */ new Map();
		for (const message of messages) {
			if (this.quiet(message.id)) quiet.add(message.id);
			const category = this.category(message.id);
			if (category !== void 0) categories.set(message.id, category);
			topics.set(message.id, [...this.topics(message.id)]);
		}
		for (const judgment of this.#options.conversation.judgments.judgments()) {
			const key = parseJSONAs(judgment.id, isArray);
			if (key === void 0) continue;
			const [head, earlier, later] = key;
			if (head !== "amends" && head !== "supersedes" || !isString(earlier) || !isString(later)) continue;
			const before = this.#options.conversation.message(earlier);
			const after = this.#options.conversation.message(later);
			if (before === void 0 || after === void 0 || (this.#readNoul(this.#buildPair(head, earlier, later)) ?? 0) < this.#options.thresholds[head]) continue;
			if (head === "amends") {
				const own = extractTokens(before.content);
				const other = extractTokens(after.content);
				if (![...own.ids].some((id) => other.ids.has(id)) && ![...own.numbers].some((number) => other.numbers.has(number))) continue;
			}
			for (const map of head === "supersedes" ? [superseded, amended] : [amended]) {
				const ids = map.get(earlier) ?? [];
				if (!ids.includes(later)) map.set(earlier, [...ids, later]);
			}
		}
		for (const map of [amended, superseded]) for (const [id, ids] of map) map.set(id, [...ids].sort((left, right) => (positions.get(left) ?? 0) - (positions.get(right) ?? 0)));
		return {
			quiet,
			categories,
			topics,
			amended,
			superseded
		};
	}
	#renderState(id) {
		const message = this.#options.conversation.message(id);
		return `${message?.role ?? "unknown"}: ${message?.content ?? ""}`;
	}
	#buildCategory(id) {
		return {
			id: JSON.stringify(["category", id]),
			question: {
				form: "choice",
				...this.#options.questions.category.instructions === void 0 ? {} : { instructions: this.#options.questions.category.instructions },
				criteria: Object.fromEntries(LEDGER_CATEGORIES.map((category) => [category, this.#options.questions.category.criteria[category]]))
			},
			sources: [id],
			state: this.#renderState(id),
			model: this.#options.judge.model
		};
	}
	#buildTopic(id, topic) {
		return {
			id: JSON.stringify([
				"topic",
				id,
				topic.name
			]),
			question: {
				form: "noul",
				instructions: this.#options.questions.topic,
				criteria: {
					true: `The message concerns ${topic.name}: ${topic.criterion}`,
					false: `The message does not concern ${topic.name}`
				}
			},
			sources: [id],
			state: this.#renderState(id),
			model: this.#options.judge.model
		};
	}
	#buildPair(head, earlier, later) {
		return {
			id: JSON.stringify([
				head,
				earlier,
				later
			]),
			question: this.#options.questions[head],
			sources: [earlier, later],
			state: `Earlier message: ${this.#renderState(earlier)}\nLater message: ${this.#renderState(later)}`,
			model: this.#options.judge.model
		};
	}
	#read(spec) {
		const recorded = this.#options.conversation.judgments.judgment(spec.id);
		return recorded !== void 0 && matchesJudgment(recorded, spec.question, spec.sources, spec.state, this.#options.judge.model) ? recorded : void 0;
	}
	#readNoul(spec) {
		const answer = this.#read(spec)?.answer;
		return answer?.form === "noul" ? answer.noul : void 0;
	}
	#readCategories(id) {
		const answer = this.#read(this.#buildCategory(id))?.answer;
		return answer?.form === "choice" ? answer : void 0;
	}
	#weigh(id, categories) {
		const answer = this.#readCategories(id);
		return categories.reduce((sum, category) => sum + (answer?.probabilities[category] ?? 0), 0);
	}
	#collectNear(message) {
		const text = message.calls === void 0 ? message.content : `${message.content} ${JSON.stringify(message.calls.map((call) => call.arguments))}`;
		return /* @__PURE__ */ new Set([...this.#options.entities(text, false), ...this.#options.assign(message) === void 0 ? this.topics(message.id) : []]);
	}
	#describeError(error) {
		const parts = [];
		let current = error;
		for (let depth = 0; current !== void 0 && depth < 4; depth += 1) {
			parts.push(isError(current) ? `${current.name}: ${current.message}` : String(current));
			current = isError(current) ? current.cause : void 0;
		}
		return parts.join(" <- ");
	}
	async #ask(spec, signal, results) {
		if (this.#read(spec) !== void 0) return { judgments: [spec.id] };
		const fingerprint = JSON.stringify(spec);
		if (this.#failed.has(fingerprint)) return { judgments: [] };
		signal.throwIfAborted();
		try {
			const [judgment] = await this.#options.conversation.judgments.resolve(this.#options.judge, {
				state: spec.state,
				questions: { [spec.id]: spec.question }
			}, spec.sources, signal);
			return judgment === void 0 ? { judgments: [] } : {
				judgments: [spec.id],
				...judgment.usage === void 0 ? {} : { usage: judgment.usage }
			};
		} catch (error) {
			if (isJudgeAbortError(error)) results.push({
				judgments: Object.hasOwn(error.partial.answers, spec.id) || error.partial.refusals !== void 0 && Object.hasOwn(error.partial.refusals, spec.id) ? [spec.id] : [],
				...error.partial.usage === void 0 ? {} : { usage: error.partial.usage }
			});
			if (isJudgeError(error) && error.code === "QUESTION" || DETERMINISTIC_JUDGE_ERROR.test(this.#describeError(error))) this.#failed.add(fingerprint);
			if (signal.aborted) throw error;
			return { judgments: [] };
		}
	}
};
//#endregion
//#region src/core/ledgers/Gauge.ts
/**
* Prices prompts in tokens from a measured scale and fixed cost, and measures the room a request
* has left.
*
* @remarks
* `observe` rescales from the first call of each finished request with the fixed cost taken out,
* and keeps that request's calls for the marginal rate and the longest final completion for the reply
* reserve after subtracting its thinking. `fixed` never changes after construction.
* {@link GaugeOptions} defines the measured use, reply reserve, and recall-room formulas.
* {@link LedgerOptions} defines the ledger's plan budget and recall close rule.
*
* @example
* ```ts
* const gauge = new Gauge({ scale: 1.16, fixed: 498, capacity: 32768 })
* gauge.room([{ estimate: 1719, prompt: 2498, tools: 3 }], '') // estimate units a recall result can take
* ```
*/
var Gauge = class {
	#capacity;
	#predict;
	#replay;
	#history = [];
	#scale;
	#fixed;
	#reply = 0;
	/**
	* Holds the starting price and the capacity.
	*
	* @param options - The starting `scale` and `fixed` price and the context `capacity`
	* @throws {LedgerError} Thrown when `scale` is not finite and above 0, or `fixed` is not finite and at least 0 (code `'GAUGE'`)
	* @throws {LedgerError} Thrown when `capacity` is not a positive safe integer (code `'CAPACITY'`)
	* @throws {LedgerError} Thrown when `predict` is not a nonnegative safe integer less than `capacity` (code `'CAPACITY'`)
	*/
	constructor(options) {
		if (!isFiniteNumber(options.scale) || options.scale <= 0) throw new LedgerError("GAUGE", "gauge scale must be finite and greater than 0");
		if (!isFiniteNumber(options.fixed) || options.fixed < 0) throw new LedgerError("GAUGE", "gauge fixed must be finite and at least 0");
		if (!Number.isSafeInteger(options.capacity) || options.capacity <= 0) throw new LedgerError("CAPACITY", "gauge capacity must be a positive safe integer");
		this.#scale = options.scale;
		this.#fixed = options.fixed;
		this.#capacity = options.capacity;
		this.#predict = resolvePredict(options.predict, options.capacity);
		this.#replay = options.replay ?? "none";
	}
	get scale() {
		return this.#scale;
	}
	get fixed() {
		return this.#fixed;
	}
	measure(messages) {
		return this.#fixed + this.#scale * estimateMessages(messages);
	}
	/**
	* Reads the marginal rate of prompt tokens per estimate unit.
	*
	* @remarks
	* Returns the scale when the fit is undefined, nonfinite, or not above 0, a guard the measured
	* harness lacked, so a degenerate fit never prices recall room.
	*
	* @param calls - The calls of the request in progress
	* @returns The fitted slope, or the scale when the slope is unusable
	*/
	rate(calls) {
		const slope = fitSlope([...this.#history, calls]);
		return slope !== void 0 && isFiniteNumber(slope) && slope > 0 ? slope : this.#scale;
	}
	left(calls) {
		const call = calls.at(-1);
		const used = isFiniteNumber(call?.prompt) ? call.prompt + (call.completion ?? 0) - (this.#replay === "none" ? call.thinking ?? 0 : 0) : this.#fixed + this.#scale * (call?.estimate ?? 0);
		return Math.max(0, this.#capacity - used);
	}
	reserve(calls, longest) {
		const rate = this.rate(calls);
		return (this.#reply > 0 ? this.#reply : rate * estimateMessages([{
			id: "reply",
			role: "assistant",
			content: longest
		}])) + rate * estimateMessages([{
			id: "call",
			role: "assistant",
			content: "",
			calls: [{
				id: "call_00000000",
				name: "recall",
				arguments: { topic: "" }
			}]
		}, {
			id: "result",
			role: "tool",
			content: ""
		}]);
	}
	room(calls, longest) {
		return Math.max(0, (this.left(calls) - this.#predict - this.reserve(calls, longest)) / 2 / this.rate(calls));
	}
	observe(calls, reply) {
		const first = calls[0];
		if (first !== void 0 && isFiniteNumber(first.prompt) && first.estimate > 0) {
			const priced = first.prompt - this.#fixed;
			if (priced > 0) this.#scale = priced / first.estimate;
		}
		this.#history.push([...calls]);
		if (isFiniteNumber(reply?.completion)) this.#reply = Math.max(this.#reply, reply.completion - (reply.thinking ?? 0));
	}
};
//#endregion
//#region src/core/ledgers/Ledger.ts
/**
* Serves one conversation through classified records, a bounded briefing, and a final answer pass.
* @example
* ```ts
* const ledger = new Ledger(provider, options)
* ledger.conversation.add({ role: 'user', content: 'The refund needs approval.' })
* const reply = await ledger.respond('What approval is needed?')
* ```
*/
var Ledger = class {
	#provider;
	#options;
	#replay;
	#predict;
	#notes;
	#share;
	#conversation;
	#agent;
	#classifier;
	#requests = /* @__PURE__ */ new Set();
	#annotations = /* @__PURE__ */ new Set();
	#results = /* @__PURE__ */ new Map();
	#pending = /* @__PURE__ */ new Map();
	#answered = /* @__PURE__ */ new Set();
	#recalled = /* @__PURE__ */ new Map();
	#request;
	#entered;
	#selected;
	#boundary = 0;
	#gauge;
	#calls = [];
	#position;
	#active = false;
	#recalls = 0;
	#closed = false;
	#usage;
	/**
	* Composes the conversation, classifier, tools, and agent.
	* @param provider - The provider that serves the conversation
	* @param options - The filing policy, capacity, and request bounds
	* @throws {LedgerError} Thrown when a threshold, share, capacity, limit, topic, lookup, or gauge is invalid
	* @throws {LedgerError} Thrown when `predict` is not a nonnegative safe integer less than `capacity` (code `'CAPACITY'`)
	*/
	constructor(provider, options) {
		for (const key of [
			"category",
			"topic",
			"correction",
			"amends",
			"supersedes"
		]) {
			const value = options.thresholds[key];
			if (!isFiniteNumber(value) || value <= 0 || value > 1) throw new LedgerError("THRESHOLD", "thresholds must be finite and in (0, 1]");
		}
		for (const value of Object.values(options.share ?? {})) if (!isFiniteNumber(value) || value <= 0 || value > 1) throw new LedgerError("SHARE", "shares must be finite and in (0, 1]");
		if (!Number.isSafeInteger(options.capacity) || options.capacity <= 0) throw new LedgerError("CAPACITY", "capacity must be a positive safe integer");
		this.#predict = resolvePredict(options.predict, options.capacity);
		for (const value of [options.recall?.limit, options.agent?.limit]) if (value !== void 0 && (!Number.isSafeInteger(value) || value < 0)) throw new LedgerError("LIMIT", "limits must be nonnegative safe integers");
		const topics = /* @__PURE__ */ new Set();
		for (const topic of options.topics) {
			if (topic.name.trim() === "" || topics.has(topic.name)) throw new LedgerError("TOPIC", "topic names must be nonempty and unique");
			topics.add(topic.name);
		}
		const lookups = /* @__PURE__ */ new Set(["recall"]);
		for (const lookup of options.lookups ?? []) {
			if (lookups.has(lookup.tool.name)) throw new LedgerError("LOOKUP", "lookup names must be unique and cannot be recall");
			lookups.add(lookup.tool.name);
		}
		this.#provider = provider;
		this.#replay = provider.replay ?? "none";
		this.#options = options;
		this.#notes = {
			...LEDGER_NOTES,
			...options.notes
		};
		this.#share = {
			...DEFAULT_LEDGER_SHARE,
			...options.share
		};
		if (options.gauge !== void 0) this.#gauge = new Gauge({
			...options.gauge,
			capacity: options.capacity,
			predict: this.#predict,
			replay: this.#replay
		});
		const conversations = createConversationManager();
		this.#conversation = conversations.add();
		conversations.switch(this.#conversation.id);
		this.#classifier = new Classifier({
			conversation: this.#conversation,
			judge: options.judge,
			questions: options.questions,
			thresholds: options.thresholds,
			topics: options.topics,
			assign: this.#assign.bind(this),
			entities: (text, partial) => matchEntities(collectRegistry(this.#readLookups()), text, partial)
		});
		const tools = createToolManager();
		for (const lookup of options.lookups ?? []) tools.add(createTool({
			name: lookup.tool.name,
			...lookup.tool.parameters === void 0 ? {} : { parameters: lookup.tool.parameters },
			...lookup.tool.description === void 0 ? {} : { description: lookup.tool.description },
			...lookup.tool.summary === void 0 ? {} : { summary: lookup.tool.summary },
			...lookup.tool.title === void 0 ? {} : { title: lookup.tool.title },
			...lookup.tool.annotations === void 0 ? {} : { annotations: lookup.tool.annotations },
			execute: (args, context) => this.#lookup(lookup.tool.name, args, context)
		}));
		tools.add(createTool({
			name: "recall",
			description: options.recall?.description ?? `Recall what the full conversation record holds on a topic: an owner name, an id, or one of the desk topics ${options.topics.map((topic) => topic.name).join(", ")}. Returns source lines, newest first.`,
			parameters: {
				type: "object",
				properties: { topic: {
					type: "string",
					description: "An owner name, an id, or a desk topic"
				} },
				required: ["topic"]
			},
			execute: (args) => this.#recall(args)
		}));
		this.#agent = createAgent(provider, {
			...options.agent,
			conversations,
			system: options.system,
			tools,
			limit: options.agent?.limit ?? 8,
			strict: false,
			select: (_conversation, request, signal) => this.#select(request, signal)
		});
		this.#agent.emitter.on("tool", (_call, result) => {
			this.#flush();
			this.#pending.set(this.#conversation.messages().length, result);
			if (!result.success && result.error === this.#notes.repeat) {
				this.#closed = true;
				this.#agent.abort("repeat");
			}
		});
		this.#agent.emitter.on("select", (selection) => {
			if (isLedgerError(selection.fault) && selection.fault.code === "REQUEST") return;
			this.#selected = selection;
			this.#boundary = this.#conversation.messages().length;
			if (selection.usage !== void 0) this.#usage = sumUsage(this.#usage, selection.usage);
		});
		this.#agent.emitter.on("turn", () => this.#observeTurn());
		this.#agent.emitter.on("usage", (usage) => {
			this.#usage = sumUsage(this.#usage, usage);
			const last = this.#calls.at(-1);
			if (last !== void 0) this.#calls[this.#calls.length - 1] = {
				...last,
				prompt: usage.prompt,
				completion: usage.completion
			};
		});
	}
	/**
	* Returns the owned request engine.
	* @returns The engine serving this conversation
	*/
	get agent() {
		return this.#agent;
	}
	/**
	* Returns the owned message history.
	* @returns The history filed and served by this ledger
	*/
	get conversation() {
		return this.#conversation;
	}
	/**
	* Returns the stored prompt price.
	* @returns The scale and fixed cost, or undefined before calibration
	*/
	get gauge() {
		return this.#gauge === void 0 ? void 0 : {
			scale: this.#gauge.scale,
			fixed: this.#gauge.fixed
		};
	}
	/**
	* Measures message scale and tool overhead from provider prompt usage.
	* @param signal - The signal bounding both calibration calls; an abort rejects with its reason
	* @returns The stored scale and fixed cost
	* @throws {LedgerError} Thrown when either call reports no prompt usage, or a prompt usage of 0 or less (code `'GAUGE'`)
	* @throws {AgentError} Thrown when a request or calibration is active (code `'CONCURRENCY'`)
	*/
	async calibrate(signal) {
		if (this.#active) throw new AgentError("CONCURRENCY", "a ledger request is already active");
		this.#active = true;
		try {
			return await this.#measureGauge(signal);
		} finally {
			this.#active = false;
		}
	}
	async #measureGauge(signal) {
		try {
			const messages = stripThinking([
				{
					id: "system",
					role: "system",
					content: this.#options.system
				},
				...this.#conversation.view(),
				{
					id: "calibration",
					role: "user",
					content: ""
				}
			], this.#replay).slice(0, -1);
			const priced = await this.#provider.generate(messages, signal, this.#agent.context.tools.definitions(), { think: false });
			const bare = await this.#provider.generate(messages, signal, void 0, { think: false });
			if (!isFiniteNumber(priced.usage?.prompt) || priced.usage.prompt <= 0 || !isFiniteNumber(bare.usage?.prompt) || bare.usage.prompt <= 0) throw new LedgerError("GAUGE", "calibration requires prompt usage from both calls");
			this.#gauge = new Gauge({
				capacity: this.#options.capacity,
				predict: this.#predict,
				replay: this.#replay,
				scale: bare.usage.prompt / estimateMessages(messages),
				fixed: Math.max(0, priced.usage.prompt - bare.usage.prompt)
			});
			return {
				scale: this.#gauge.scale,
				fixed: this.#gauge.fixed
			};
		} catch (error) {
			signal.throwIfAborted();
			throw error;
		}
	}
	/**
	* Appends a request and serves it, recovering an unfinished first pass with one answer pass.
	* A failed calibration rejects with `LedgerError` code `'GAUGE'`.
	* @param content - The request text
	* @param signal - The caller's cancellation signal; an abort during calibration rejects with its reason
	* @returns The final pass and the usage of every pass
	* @throws {AgentError} Thrown when a request or calibration is active (code `'CONCURRENCY'`)
	* @throws {LedgerError} Thrown when calibration fails (code `'GAUGE'`)
	*/
	async respond(content, signal) {
		if (this.#active) throw new AgentError("CONCURRENCY", "a ledger request is already active");
		this.#active = true;
		const abort = createAbort({ ...signal === void 0 ? {} : { signal } });
		const caller = this.#options.agent?.signal === void 0 ? abort.signal : AbortSignal.any([abort.signal, this.#options.agent.signal]);
		try {
			if (this.#gauge === void 0) await this.#measureGauge(caller);
			this.#request = this.#conversation.add({
				role: "user",
				content
			});
			this.#requests.add(this.#request.id);
			this.#entered = void 0;
			this.#selected = void 0;
			this.#calls = [];
			this.#position = void 0;
			this.#recalls = 0;
			this.#closed = false;
			this.#answered.clear();
			this.#recalled.clear();
			const first = await this.#runPass(caller, this.#options.think);
			const passes = [first];
			if (!caller.aborted && (first.partial || first.content.trim() === "")) {
				const digest = this.#buildDigest();
				if (digest !== void 0) this.#annotations.add(this.#conversation.add({
					role: "user",
					content: digest
				}).id);
				this.#annotations.add(this.#conversation.add({
					role: "user",
					content: this.#notes.cue
				}).id);
				const previous = this.#agent.context.scope;
				this.#agent.context.apply(createScope({
					name: "answer",
					tools: [],
					select: async (_conversation, request, selecting) => {
						const selection = await this.#select(request, selecting);
						if (selection.fault !== void 0) return selection;
						return {
							...selection,
							messages: selection.messages.filter((message) => message.role !== "tool" && (message.calls?.length ?? 0) === 0)
						};
					}
				}));
				try {
					passes.push(await this.#runPass(caller, false));
				} finally {
					this.#agent.context.apply(previous);
				}
			}
			const last = passes.at(-1) ?? first;
			this.#recordThinking();
			this.#gauge?.observe(this.#calls, !last.partial && last.content.trim() !== "" ? this.#calls.at(-1) : void 0);
			let usage;
			let thinking;
			for (const pass of passes) {
				if (pass.usage !== void 0) usage = sumUsage(usage, pass.usage);
				if (pass.thinking !== void 0) thinking = joinThinking(thinking, pass.thinking);
			}
			return {
				content: last.content,
				partial: last.partial,
				passes,
				...usage === void 0 ? {} : { usage },
				...thinking === void 0 ? {} : { thinking }
			};
		} finally {
			this.#flush();
			this.#request = void 0;
			this.#active = false;
		}
	}
	async #runPass(signal, think) {
		this.#selected = void 0;
		this.#boundary = this.#conversation.messages().length;
		this.#usage = void 0;
		try {
			return await this.#agent.generate({
				signal,
				...think === void 0 ? {} : { think }
			});
		} catch {
			return {
				content: "",
				partial: true,
				...this.#usage === void 0 ? {} : { usage: this.#usage }
			};
		}
	}
	#flush() {
		const messages = this.#conversation.messages();
		for (const [at, result] of this.#pending) {
			const message = messages[at];
			if (message?.role === "tool") {
				this.#results.set(message.id, result);
				this.#pending.delete(at);
			}
		}
	}
	#assign(message) {
		this.#flush();
		if (this.#annotations.has(message.id)) return "chatter";
		if (message.role === "tool") {
			this.#readLookups();
			return this.#results.get(message.id)?.success === false ? "chatter" : "fact";
		}
		if (message.role !== "assistant") return void 0;
		if ((message.calls?.length ?? 0) > 0) return "chatter";
		const messages = this.#conversation.messages();
		const first = messages.findIndex((one) => this.#requests.has(one.id));
		return first >= 0 && messages.findIndex((one) => one.id === message.id) > first ? "chatter" : void 0;
	}
	#readLookups() {
		this.#flush();
		const readings = [];
		for (const group of collectToolGroups(this.#conversation.messages())) for (const message of group.slice(1)) {
			const call = resolveLedgerCall(group, message);
			const lookup = this.#options.lookups?.find((one) => one.tool.name === call?.name);
			if (call === void 0 || lookup === void 0 || this.#results.get(message.id)?.success === false) continue;
			const reading = attempt(() => lookup.read(call.arguments, message.content));
			if (!reading.success) {
				this.#results.set(message.id, {
					success: false,
					id: call.id,
					name: call.name,
					error: isError(reading.error) ? reading.error.message : String(reading.error)
				});
				continue;
			}
			const result = reading.value;
			readings.push({
				id: message.id,
				name: call.name,
				arguments: call.arguments,
				text: message.content,
				result: result === void 0 ? void 0 : {
					...result,
					ids: [.../* @__PURE__ */ new Set([...result.ids, ...Object.values(call.arguments).filter(isString).flatMap((value) => [...extractTokens(value).ids])])]
				}
			});
		}
		return readings;
	}
	#project() {
		const readings = this.#readLookups();
		const registry = collectRegistry(readings);
		const messages = this.#conversation.messages();
		const input = {
			system: this.#options.system,
			exclude: [...this.#requests, ...this.#annotations],
			owners: registry.owners,
			messages,
			readings,
			entities: new Map(messages.map((message) => [message.id, [...matchEntities(registry, message.content, true)]])),
			classification: this.#classifier.classification()
		};
		return {
			input,
			projection: buildRecords(input)
		};
	}
	#projectLines(input, projection, id) {
		return buildLines(input, new Map(input.messages.map((message) => [message.id, message])), id, new Set(projection.stale.map((line) => `${line.source} ${line.sentence}`)), [...input.owners.values()].flat(), collectNames(this.#options.system));
	}
	#renderSource(id, lines) {
		const message = this.#conversation.message(id);
		if (message === void 0) return "";
		const sentences = splitSentences(message.content);
		const text = sentences.length === lines.length ? message.content : lines.map((line) => sentences[line.sentence] ?? "").join(" ");
		if (text === "" || message.role !== "tool") return text;
		const reading = this.#readLookups().find((one) => one.id === id);
		return reading === void 0 ? text : `${reading.name} ${JSON.stringify(reading.arguments)}: ${text}`;
	}
	#collectAfter() {
		const messages = this.#conversation.messages();
		const start = messages.findIndex((message) => message.id === this.#request?.id);
		return messages.slice(start + 1).filter((message) => message.role !== "assistant" || (message.calls?.length ?? 0) > 0 || message.content.trim() !== "");
	}
	async #select(request, signal) {
		let filing = { judgments: [] };
		try {
			if (!this.#active || this.#request === void 0 || request.id !== this.#request.id && !this.#annotations.has(request.id)) throw new LedgerError("REQUEST", "ledger selection requires a request owned by an active respond call");
			if (this.#annotations.has(request.id) && this.#entered !== void 0) return {
				messages: [...this.#entered.messages, ...this.#collectAfter()],
				judgments: [],
				...this.#entered.briefing === void 0 ? {} : { briefing: this.#entered.briefing }
			};
			const selected = this.#request;
			filing = await this.#classifier.classify(this.#requests, signal);
			if (filing.fault !== void 0) throw filing.fault;
			const plan = this.#plan(selected);
			this.#entered = {
				...plan,
				...filing
			};
			return this.#annotations.has(request.id) ? {
				...this.#entered,
				messages: [...this.#entered.messages, ...this.#collectAfter()]
			} : this.#entered;
		} catch (error) {
			return {
				...filing,
				messages: this.#conversation.view(),
				fault: isError(error) ? error : new Error(String(error))
			};
		}
	}
	#plan(request) {
		const { input, projection } = this.#project();
		const registry = collectRegistry(input.readings);
		const links = linkOwners(input.readings, registry.owners);
		const near = /* @__PURE__ */ new Set([...matchEntities(registry, request.content, true), ...this.#classifier.topics(request.id)]);
		const records = selectRecords(projection, {
			owners: [...near].flatMap((id) => {
				const owner = registry.owners.has(id) ? id : links.get(id);
				return owner === void 0 ? [] : [owner];
			}),
			topics: [...near]
		});
		const total = Math.max(0, (this.#options.capacity - this.#predict) * this.#share.prompt - (this.#gauge?.fixed ?? 0)) / (1 + LEDGER_SCALE_DRIFT);
		const tail = this.#selectTail(request, total * this.#share.tail, input);
		const cap = total - (this.#gauge?.scale ?? 1) * estimateMessages(stripThinking(tail, this.#replay));
		const tailIds = new Set(tail.map((message) => message.id));
		const scoped = records.some((record) => record.key !== LEDGER_RULES_KEY);
		const held = new Set(projection.records.filter((record) => scoped || record.key === "rules").flatMap((record) => record.members));
		if (records.length > 0) {
			for (const record of projection.records) for (const id of record.members) if (this.#conversation.message(id)?.role === "user" && this.#classifier.category(id) === "rule" && this.#classifier.decisive(id)) held.add(id);
		}
		const texts = input.messages.filter((message) => (message.calls?.length ?? 0) === 0).map((message) => ({
			message,
			words: new Set(message.content.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []),
			names: new Set([...message.content.matchAll(/(?<![\p{L}\p{N}'-])\p{Lu}\p{Ll}+(?![\p{L}\p{N}-])/gu)].filter((match) => {
				const before = message.content.slice(0, match.index).trimEnd();
				return before !== "" && !/[.!?:;]$/.test(before);
			}).map((match) => match[0].toLowerCase()))
		}));
		const asked = texts.find(({ message }) => message.id === request.id);
		const counts = /* @__PURE__ */ new Map();
		for (const text of texts) for (const word of text.words) counts.set(word, (counts.get(word) ?? 0) + 1);
		const live = /* @__PURE__ */ new Set([...projection.loose, ...projection.records.flatMap((record) => record.members)]);
		const ordered = [...texts.flatMap(({ message, words, names }, position) => {
			if (!live.has(message.id) || held.has(message.id) || message.role !== "tool" && tailIds.has(message.id)) return [];
			const tokens = extractTokens(message.content);
			if (message.role === "user" && tokens.ids.size + tokens.numbers.size + names.size === 0) return [];
			const category = this.#classifier.category(message.id);
			const loose = message.role === "user" && !this.#classifier.decisive(message.id);
			const topics = /* @__PURE__ */ new Set([...input.entities.get(message.id) ?? [], ...this.#classifier.topics(message.id)]);
			const ruled = !loose && (category === "rule" || category === "correction");
			const group = [...topics].some((topic) => near.has(topic)) ? 1 : ruled ? 2 : [...names].some((name) => asked?.names.has(name)) ? 3 : 4;
			if (group === 4) return [];
			const score = [...words].filter((word) => asked?.words.has(word)).reduce((sum, word) => sum + Math.log(texts.length / (counts.get(word) ?? 1)), 0);
			return [{
				source: message.id,
				lines: this.#projectLines(input, projection, message.id),
				position,
				group,
				ruled,
				loose,
				score,
				category,
				cut: rankLedgerCut(group, loose, category)
			}];
		})].sort((left, right) => left.group - right.group || (left.group === 1 ? Number(left.loose) - Number(right.loose) : 0) || (left.group === 1 && left.loose || left.group === 3 ? right.score - left.score : 0) || left.position - right.position);
		const cuts = [...ordered].sort((left, right) => left.cut - right.cut || (left.cut === 0 || left.cut === 1 || left.cut === 4 ? left.score - right.score : 0) || right.position - left.position);
		const kept = records.map((record) => ({
			...record,
			lines: [...record.lines]
		}));
		const rules = kept.find((record) => record.key === LEDGER_RULES_KEY);
		const steps = [
			...rules?.lines.filter((line) => !line.topics.some((topic) => near.has(topic))).map(() => ({
				record: rules,
				source: void 0
			})) ?? [],
			...cuts.map((unit) => ({
				record: void 0,
				source: unit.source
			})),
			...rules?.lines.filter((line) => line.topics.some((topic) => near.has(topic))).map(() => ({
				record: rules,
				source: void 0
			})) ?? [],
			...kept.filter((record) => record.key !== LEDGER_RULES_KEY).flatMap((record) => record.lines.map(() => ({
				record,
				source: void 0
			}))).reverse()
		];
		const included = new Set(ordered.map((unit) => unit.source));
		const mapped = ordered.map((unit) => ({
			source: unit.source,
			record: this.#buildUnitRecord(unit.source, unit.category, input, projection, held)
		}));
		let briefing = this.#render(kept, mapped.filter((unit) => included.has(unit.source)).map((unit) => unit.record));
		for (const step of steps) {
			const content = [this.#options.system, briefing].filter((part) => part !== "").join("\n\n");
			if ((this.#gauge?.scale ?? 1) * estimateMessages([{
				id: "system",
				role: "system",
				content
			}]) <= cap) break;
			if (step.record !== void 0) step.record.lines.pop();
			if (step.source !== void 0) included.delete(step.source);
			briefing = this.#render(kept, mapped.filter((unit) => included.has(unit.source)).map((unit) => unit.record));
		}
		const shown = new Set(included);
		for (const record of records) for (const source of record.members) {
			const full = record.lines.filter((line) => line.source === source);
			const visible = kept.find((one) => one.key === record.key)?.lines.filter((line) => line.source === source) ?? [];
			if (full.length > 0 && full.length === visible.length) shown.add(source);
		}
		return {
			messages: tail.map((message) => message.role === "tool" ? this.#renderTailStub(message, shown) : message),
			...briefing === "" ? {} : { briefing }
		};
	}
	#buildUnitRecord(source, category, input, projection, held) {
		return {
			key: category === "rule" ? LEDGER_RULES_KEY : source,
			title: "",
			members: [source],
			lines: this.#collectAmended(input, projection, source, category === "rule" ? new Set(projection.records.flatMap((record) => record.members)) : held)
		};
	}
	#collectAmended(input, projection, source, held) {
		const live = /* @__PURE__ */ new Set([...projection.loose, ...projection.records.flatMap((record) => record.members)]);
		const queue = [source];
		const done = /* @__PURE__ */ new Set();
		const lines = [];
		for (const id of queue) {
			if (done.has(id)) continue;
			done.add(id);
			if (id !== source && (held.has(id) || !live.has(id))) continue;
			lines.push(...this.#projectLines(input, projection, id));
			queue.push(...input.classification.amended.get(id) ?? []);
		}
		return lines;
	}
	#render(records, units) {
		const owners = records.filter((record) => record.key !== "rules" && record.lines.length > 0).map(renderLedgerPinned).join("\n\n");
		const pinned = [];
		const loose = [];
		const done = /* @__PURE__ */ new Set();
		for (const unit of units) {
			const block = unit.key === "rules" ? loose : pinned;
			for (const [source, lines] of Map.groupBy(unit.lines, (line) => line.source)) {
				if (done.has(source)) continue;
				done.add(source);
				if (unit.key === "rules" && source === unit.members[0]) block.push(...lines.map((line) => this.#renderSource(source, [line])));
				else block.push(this.#renderSource(source, lines));
			}
		}
		const body = [owners, pinned.join("\n")].filter((text) => text !== "").join("\n\n");
		const rules = records.find((record) => record.key === "rules" && record.lines.length > 0);
		return [body === "" ? "" : `## Pinned\n${body}`, rules === void 0 ? loose.length === 0 ? "" : ["## Rules", ...loose].join("\n") : [renderLedgerRecord(rules), ...loose].join("\n")].filter((text) => text !== "").join("\n\n");
	}
	#selectTail(request, cap, input) {
		const first = input.messages.findIndex((message) => this.#requests.has(message.id));
		const seed = input.messages.slice(0, first < 0 ? input.messages.findIndex((message) => message.id === request.id) : first);
		const calls = /* @__PURE__ */ new Map();
		const results = /* @__PURE__ */ new Set();
		for (const group of collectToolGroups(seed)) {
			const leader = group[0];
			if (leader === void 0) continue;
			const kept = (leader.calls ?? []).filter((call) => {
				const message = group.slice(1).find((result) => resolveLedgerCall(group, result) === call);
				const result = message === void 0 ? void 0 : this.#results.get(message.id);
				if (message === void 0 || !this.#options.lookups?.some((lookup) => lookup.tool.name === call.name) || result?.success === false && result.error === this.#notes.repeat) return false;
				results.add(message.id);
				return true;
			});
			calls.set(leader.id, kept);
		}
		const history = seed.filter((message) => !this.#annotations.has(message.id) && (message.role !== "tool" || results.has(message.id)) && !(message.role === "assistant" && (message.calls?.length ?? 0) > 0 && (calls.get(message.id)?.length ?? 0) === 0 && message.content === "")).map((message) => message.role === "tool" ? this.#renderTailStub(message) : calls.has(message.id) ? (calls.get(message.id)?.length ?? 0) > 0 ? {
			...message,
			calls: calls.get(message.id) ?? []
		} : {
			id: message.id,
			role: message.role,
			content: message.content
		} : message);
		let tail = [request];
		for (const exchange of collectExchanges(history).toReversed()) {
			const next = [...exchange, ...tail];
			if ((this.#gauge?.scale ?? 1) * estimateMessages(stripThinking(next, this.#replay)) > cap) break;
			tail = next;
		}
		return tail;
	}
	#renderTailStub(message, shown) {
		const group = collectToolGroups(this.#conversation.messages()).find((entries) => entries.some((one) => one.id === message.id));
		const call = group === void 0 ? void 0 : resolveLedgerCall(group, message);
		const reading = this.#readLookups().find((one) => one.id === message.id);
		const hidden = renderStub(call?.name ?? "tool", call?.arguments ?? {}, "hidden");
		const visible = renderStub(call?.name ?? "tool", call?.arguments ?? {}, "shown");
		return {
			...message,
			content: renderStub(call?.name ?? "tool", call?.arguments ?? {}, this.#results.get(message.id)?.success === false ? "failed" : reading?.result === void 0 ? "empty" : shown === void 0 ? hidden.length > visible.length ? "hidden" : "shown" : shown.has(message.id) ? "shown" : "hidden")
		};
	}
	#observeTurn() {
		this.#flush();
		const selection = this.#selected;
		const additions = this.#conversation.messages().slice(this.#boundary);
		const messages = this.#agent.context.build(selection);
		const names = this.#agent.context.scope?.tools;
		this.#calls.push({
			estimate: estimateMessages(stripThinking([...messages, ...additions], this.#replay)),
			tools: this.#agent.context.tools.definitions().filter((tool) => names === void 0 || names.includes(tool.name)).length
		});
		this.#position = this.#conversation.messages().length;
	}
	#recordThinking() {
		const call = this.#calls.at(-1);
		if (this.#position === void 0 || call?.completion === void 0) return;
		const message = this.#conversation.messages().slice(this.#position).find((entry) => entry.role === "assistant");
		if (message?.thinking === void 0) return;
		this.#calls[this.#calls.length - 1] = {
			...call,
			thinking: computeThinking(message, call.completion)
		};
	}
	#findLongest() {
		return this.#conversation.messages().filter((message) => message.role === "assistant").reduce((longest, message) => message.content.length > longest.length ? message.content : longest, "");
	}
	#repeat(name, args) {
		const key = canonicalStringify([name, args]);
		if (key === void 0) throw new Error("tool arguments have no canonical identity");
		if (this.#answered.has(key)) throw new Error(this.#notes.repeat);
		this.#answered.add(key);
	}
	#lookup(name, args, context) {
		this.#repeat(name, args);
		const lookup = this.#options.lookups?.find((one) => one.tool.name === name);
		if (lookup === void 0) throw new Error(`unknown lookup ${name}`);
		return lookup.tool.execute(args, context);
	}
	#recall(args) {
		this.#recordThinking();
		const topic = isString(args.topic) ? args.topic.trim() : "";
		this.#repeat("recall", { topic });
		const gauge = this.#gauge;
		if (this.#recalls >= (this.#options.recall?.limit ?? 2) || gauge !== void 0 && this.#calls.length > 0 && gauge.left(this.#calls) - this.#predict < 2 * gauge.reserve(this.#calls, this.#findLongest())) this.#closed = true;
		if (this.#closed) throw new Error(this.#notes.closed);
		this.#recalls += 1;
		const guidance = `an owner name, an id, or one of ${this.#options.topics.map((one) => one.name).join(", ")}`;
		if (topic === "") throw new Error(`recall needs a topic: ${guidance}`);
		const room = (gauge?.room(this.#calls, this.#findLongest()) ?? 0) - estimateMessages([{
			id: "call",
			role: "assistant",
			content: "",
			calls: [{
				id: "call_00000000",
				name: "recall",
				arguments: { topic }
			}]
		}]);
		const { input, projection } = this.#project();
		const registry = collectRegistry(input.readings);
		const searches = splitTopic(topic).map((part) => {
			const words = part.split(/\s+/).map((word) => word.replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, "").toLowerCase()).filter((word) => word !== "");
			return {
				words,
				matched: /* @__PURE__ */ new Set([...[...registry.ids].filter((id) => extractTokens(part).ids.has(id) || words.every((word) => `${id} ${(registry.owners.get(id) ?? []).join(" ")}`.toLowerCase().includes(word))), ...this.#options.topics.filter((one) => words.every((word) => one.name.toLowerCase().includes(word))).map((one) => one.name)])
			};
		});
		const start = input.messages.findIndex((message) => message.id === this.#request?.id);
		const listable = new Map(input.messages.filter((message, at) => !this.#requests.has(message.id) && (at < start || message.role === "tool")).map((message) => [message.id, message]));
		const readings = new Map(input.readings.map((reading) => [reading.id, reading]));
		const matched = new Set(searches.flatMap((search) => [...search.matched]));
		const wordings = searches.filter((search) => search.matched.size === 0 && search.words.length > 0);
		const listed = [];
		const done = /* @__PURE__ */ new Set();
		const recalled = /* @__PURE__ */ new Map();
		for (const message of [...listable.values()].reverse()) {
			const reading = readings.get(message.id);
			const topics = /* @__PURE__ */ new Set([
				...input.entities.get(message.id) ?? [],
				...this.#classifier.topics(message.id),
				...projection.records.filter((record) => record.key.startsWith("owner:") && record.members.includes(message.id)).map((record) => record.key.slice(LEDGER_OWNER_PREFIX.length))
			]);
			const onTopic = (message.role === "tool" ? reading?.result !== void 0 : (message.calls?.length ?? 0) === 0 && !this.#classifier.quiet(message.id)) && [...matched].some((match) => topics.has(match));
			const worded = (message.role === "tool" ? reading !== void 0 : message.role === "user") && wordings.some((search) => search.words.every((word) => message.content.toLowerCase().includes(word)));
			if (!onTopic && !worded) continue;
			const queue = [message.id];
			const texts = [];
			while (queue.length > 0) {
				const id = queue.shift();
				if (id === void 0 || done.has(id)) continue;
				const source = listable.get(id);
				if (source === void 0) continue;
				done.add(id);
				const lookup = readings.get(id);
				const text = lookup === void 0 ? source.content : `${lookup.name} ${JSON.stringify(lookup.arguments)}: ${source.content}`;
				texts.push(text);
				if (lookup !== void 0) recalled.set(text.split("\n")[0] ?? "", source.content.split("\n")[0] ?? "");
				queue.push(...input.classification.amended.get(id) ?? []);
			}
			if (texts.length > 0) listed.push(texts.join("\n"));
		}
		const result = listed.length === 0 ? `nothing on "${topic}"; recall ${guidance}` : cutListing(listed, room);
		this.#recalled.set(result, recalled);
		return result;
	}
	#buildDigest() {
		this.#flush();
		const lines = [];
		for (const message of this.#collectAfter()) {
			const result = this.#results.get(message.id);
			if (message.role !== "tool" || result?.success !== true) continue;
			const listing = result.name === "recall";
			if (listing && /^nothing on /.test(message.content)) continue;
			const recalled = listing ? this.#recalled.get(message.content) : void 0;
			for (const line of message.content.split("\n")) {
				if (listing && matchesCutLine(line)) continue;
				const text = recalled?.get(line) ?? line;
				if (!lines.includes(text)) lines.push(text);
			}
		}
		return lines.length === 0 ? void 0 : `${this.#notes.results}\n${lines.join("\n")}`;
	}
};
//#endregion
//#region src/core/ledgers/factories.ts
/**
* Creates a conversation ledger after checking its thresholds, allocation, and tool names.
* @param provider - The provider that answers requests
* @param options - The judge, projection policy, capacity, and agent bounds
* @returns The ledger and its owned conversation and agent
* @throws {LedgerError} Thrown when an option lies outside its documented bounds
* @example
* ```ts
* const ledger = createLedger(provider, options)
* const reply = await ledger.respond('Check the order.')
* ```
*/
function createLedger(provider, options) {
	return new Ledger(provider, options);
}
//#endregion
export { Agent, AgentContext, AgentError, AgentJobError, AgentJudge, AgentProvider, AgentRegistry, Authority, CONVERSATION_RECAP_PREFIX, Channel, Classifier, Conversation, ConversationError, ConversationManager, DECISIVE_CATEGORIES, DEFAULT_AGENT_LIMIT, DEFAULT_AUTHORITY_ZONE, DEFAULT_CONVERSATION_KEEP, DEFAULT_LEDGER_LIMIT, DEFAULT_LEDGER_SHARE, DEFAULT_PROVIDER_TIMEOUT, DEFAULT_RECALL_LIMIT, DEFAULT_RELAY_LIMIT, DETERMINISTIC_JUDGE_ERROR, DatabaseConversationStore, Gauge, IMAGE_TOKEN_ESTIMATE, INVALID_RELAY_STATUS, Instruction, InstructionManager, JudgeAbortError, JudgeError, JudgmentManager, LEDGER_CATEGORIES, LEDGER_NOTES, LEDGER_OWNER_PREFIX, LEDGER_QUESTIONS, LEDGER_RULES_KEY, LEDGER_SCALE_DRIFT, Ledger, LedgerError, MAX_ERROR_BODY_LENGTH, MESSAGE_ROLES, MESSAGE_TOKEN_OVERHEAD, MemoryConversationStore, NEEDED_CRITERION, NEEDED_QUESTION, OVERSIZED_RELAY_STATUS, PLACED_CATEGORIES, ProviderAbortError, ProviderError, QUIET_CATEGORIES, RELAY_CONTENT_TYPE, RELAY_PROVIDER_MESSAGE, RelayProvider, RelayStream, SYSTEM_ONE_PATH, Scope, ScopeManager, SelectionError, SystemOneJudge, THINK_CLOSE, THINK_OPEN, ThinkSplitter, UNAUTHORIZED_RELAY_STATUS, UPSTREAM_RELAY_STATUS, WORKSPACE_SECTION_HEADER, agentResultToJSON, assembleResult, attachImages, attachUserImages, buildConditionKey, buildJudgeResult, buildJudgments, buildLines, buildNeededQuestion, buildProviderResult, buildRecapMessage, buildRecords, buildSummaryMessage, chargeUsage, collectExchanges, collectImageData, collectLive, collectNames, collectRegistry, collectStale, collectToolGroups, computeReading, computeThinking, copyJSON, createAgent, createAgentContext, createAgentQueue, createAgentRegistry, createAgentRunner, createAuthority, createChannel, createConversation, createConversationManager, createDatabaseConversationStore, createInstruction, createInstructionManager, createLedger, createMemoryConversationStore, createRelay, createRelayProvider, createScope, createScopeManager, createSelection, createSystemOneJudge, createThinkSplitter, cutListing, denyCall, estimateMessages, estimateTokens, extractSystemOneAnswer, extractSystemOneUsage, extractTokens, filterAllowList, filterSelectionMessages, fitSlope, handleAgentQueueJob, handleAgentRunnerJob, identifyLookup, inferApplicability, intersectKeys, isAgentError, isAgentJobError, isConversationError, isConversationSnapshot, isJudgeAbortError, isJudgeEntry, isJudgeError, isJudgeQuestion, isJudgment, isLedgerError, isMessage, isProviderAbortError, isProviderError, isSection, isSelectionError, isSystemOneAnswer, isSystemOneResponse, joinThinking, linkOwners, matchEntities, matchesCutLine, matchesJudgment, messageContract, messageShape, parseConditionKey, placeMember, providerRequestContract, providerRequestShape, providerResultContract, providerResultShape, questionToSystemOne, rankLedgerCut, readChunks, readHeaders, readText, relayFrameContract, relayFrameShape, releaseReader, removeEntries, renderFencedFile, renderLedgerPinned, renderLedgerRecord, renderSection, renderSelectionState, renderStub, resolveLedgerCall, resolvePredict, sanitizeToken, sanitizeUsage, selectRecords, settleAgentJob, splitSentences, splitTopic, stripThinking, sumUsage, toolCallShape };

//# sourceMappingURL=index.js.map