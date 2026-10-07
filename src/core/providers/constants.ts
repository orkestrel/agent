/**
 * Names the opening tag a {@link import('./ThinkSplitter.js').ThinkSplitter} recognizes as the start of
 * an in-content reasoning span — `'<think>'`, the de-facto wire convention thinking models
 * (qwen3, DeepSeek-R1 family) emit their chain-of-thought under when a daemon renders it inline
 * instead of on a separate wire field. Paired with {@link THINK_CLOSE}.
 */
export const THINK_OPEN = '<think>'

/**
 * Names the closing tag that ends a {@link THINK_OPEN} reasoning span — `'</think>'`. A span the
 * stream never closes (the model was cut off mid-reasoning) is treated as thinking to its end,
 * and {@link import('./types.js').ThinkSplitterInterface.flush} settles it.
 */
export const THINK_CLOSE = '</think>'

/**
 * Holds the default provider deadline in milliseconds — `120_000`, the wall-clock bound a call
 * runs under when `AgentProviderInput.timeout` is omitted, folded with the caller's signal so
 * whichever trips first cancels the call.
 */
export const DEFAULT_PROVIDER_TIMEOUT = 120_000

/**
 * Bounds the decoded error excerpt's input in bytes — `2048`, the leading bytes of a non-OK
 * response body handed to the decoder before the read cancels the remainder, so a `ProviderError`
 * message never carries a longer excerpt.
 */
export const MAX_ERROR_BODY_LENGTH = 2048

/**
 * Holds the default relay request limit in bytes — `1_048_576`, the byte budget a relay applies
 * to an inbound body when `RelayOptions.limit` is omitted, refusing a body that reaches it.
 */
export const DEFAULT_RELAY_LIMIT = 1_048_576

/**
 * Names the relay's newline-delimited JSON content type — `'application/x-ndjson; charset=utf-8'`,
 * the header a relay response carries beside `cache-control: no-store`.
 */
export const RELAY_CONTENT_TYPE = 'application/x-ndjson; charset=utf-8'

/**
 * Names the public message for an unexpected upstream relay failure — `'relay provider failed'`,
 * the fixed text every `error` frame carries, so an upstream failure's own message never reaches
 * the browser.
 */
export const RELAY_PROVIDER_MESSAGE = 'relay provider failed'

/**
 * Names the status a relay answers when the `authorize` callback returns anything but `true` or throws —
 * `401`, carried with no body and reaching the browser as a `ProviderError` with the `HTTP` code.
 */
export const UNAUTHORIZED_RELAY_STATUS = 401

/**
 * Names the status a relay answers when the upstream provider call cannot be constructed — `502`,
 * carried with no body after `provider.stream` was entered and threw before returning its
 * iterator.
 */
export const UPSTREAM_RELAY_STATUS = 502

/**
 * Names the status a relay answers for a body that is missing, unreadable, or rejected by
 * `providerRequestContract` — `400`, carried with no body and reaching the browser as a
 * `ProviderError` with the `HTTP` code.
 */
export const INVALID_RELAY_STATUS = 400

/**
 * Names the status a relay answers for a request body at or above its byte budget — `413`,
 * carried with no body and answered for an aborted inbound read as well.
 */
export const OVERSIZED_RELAY_STATUS = 413

/** Names the System One decision endpoint shared by compatible servers. */
export const SYSTEM_ONE_PATH = '/v1/systemone'
