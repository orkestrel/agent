# Token admission findings

The latest Compaction stop is a failed prediction qualification. Ollama reported 10738 prompt
tokens against a 10703-token projection, with 11776 tokens available after the declared output
and safety reserves. The forecast missed by 35; the reserved prompt budget had 1038 tokens left.
The original rejected verdict stays intact. See [the qualification outcome](qualification.md).

## Separate the measurements

Agent estimates text as `ceil(text.length / 4)`, adds message framing, and estimates rendered
tool and schema JSON. This is a UTF-16 character heuristic. It does not tokenize the model's
rendered prompt or account exactly for template, tool encoding, and thinking controls. The
Compaction consumer applies a frozen affine correction and cushion to that estimate. Fitting
those coefficients does not establish an upper bound on every later request.

Agent already exposes the custom calculator: `AgentOptions.window` accepts a
`BudgetInterface<ProviderRequest>` whose synchronous consumer receives the complete outgoing
request. The separate cost budget consumes returned `TokenUsage`. Changing the cost calculation
does not change pre-dispatch admission. Relevant contracts are in `src/core/agents/types.ts`,
with the estimator in `src/core/agents/helpers.ts`.

The Ollama provider already reads actual prompt and completion counts from completed responses.
Its timing helper preserves optional cached counts and nanosecond durations. Native cached
tokens are a subset of prompt tokens, not an additional context charge. A missing terminal
count remains unknown. The [usage documentation](https://docs.ollama.com/api/usage) places
streaming metrics in the final completed chunk; the [error documentation](https://docs.ollama.com/api/errors)
permits an error chunk after HTTP 200 without those metrics.

## Bound the upstream capability

Research on 2026-10-15 covered the API index's 22 pages. Copy, pull, push, delete, and version
returned page shells; their endpoint contracts were read from the
[official OpenAPI source](https://raw.githubusercontent.com/ollama/ollama/main/docs/openapi.yaml).
The inspected documentation and specification expose no native exact preflight count endpoint.
The [Anthropic compatibility page](https://docs.ollama.com/api/anthropic-compatibility) explicitly
lists its count endpoint as unsupported. [PR 17478](https://github.com/ollama/ollama/pull/17478)
proposes counting the fully rendered prompt through the runner, but remains a draft.

The pinned daemon is 0.40.3. Its [request and debug contracts](https://github.com/ollama/ollama/blob/v0.40.3/api/types.go)
carry top-level `truncate` and `shift` switches. Its debug response exposes a rendered template
and image count, without a token count. The [chat implementation](https://github.com/ollama/ollama/blob/v0.40.3/server/routes.go)
defaults those switches on. These source observations require a bounded live proof before
claiming that an opt-in strict wire prevents silent context loss for the selected model.
An undocumented zero-output request, an internal runner port, or an embedding request is not
an accepted substitute for a native chat count.

The [context guide](https://docs.ollama.com/context-length) and
[Modelfile reference](https://docs.ollama.com/modelfile) describe different defaults. Freeze
explicit context and output values, and verify the loaded model's context with runtime metadata.
Model maximum context, allocated context, prompt room after reserves, and generated tokens are
different measurements. Larger allocated context also consumes memory.

## Implementation decision

Separate prediction diagnostics from capacity enforcement before changing the estimator.
Keep the published Agent calculator contract. Implement the following as a separately declared
consumer treatment, with no change to old seals, readers, or outcomes:

| Layer | Change | Required proof |
| --- | --- | --- |
| Agent memory study | Record actual-minus-projected error separately from actual prompt room; keep the historical projection qualification explicit. | A prediction miss within room remains observable; an actual room breach refuses the next turn; missing usage remains a fault. Pin the equality boundary. |
| Ollama provider | Add opt-in top-level truncation and shift controls, preserving the omitted/default wire. | Public contracts and encoded fields agree; the pinned daemon refuses excess context without silent truncation or shifting; terminal failures survive HTTP 200. |
| Study reporting | Report projection misses, reserved-room breaches, provider refusals, output exhaustion, and the first failure separately. | Preserve attempt counts and unexecuted cascades; do not count one failure as many independent events. |
| Estimator candidate | Evaluate a prior-actual-count anchor through the existing custom consumer after the preceding repairs. | Match rendered input, model, options, tools, schema, and replay policy; invalidate on rewrites; compare on declared held-out requests. No measured gain or bound is established yet. |

Anchor identity must use provider-relevant content, not generated message IDs: the wire does
not send those IDs. Replacing a summary, changing tools, or changing templates can invalidate
an anchor. An actual count from an earlier request is not an exact count of the next request.
Keep all measurements outside the model prompt unless a separate treatment explicitly adds them.
No hidden retry, automatic margin increase, or Records rerun follows this decision. The failed
qualification's fixed deadline has elapsed; another Compaction execution requires a separate
freeze and its finite acceptance criteria.

Opus supplied a bounded opinion in session `f78db5f6-b6cd-43fd-a377-93f358483aba`
(129260 ms, exit 0, uncapped). Root accepts classification and strict-wire work first, but rejects
the report's premise that request 33 was the first request after compaction. Retained evidence
shows summary 28 followed by agent requests 29, 30, 31, 32, and 33; the failed request shares those summary IDs.
Consequently the claim that anchoring could not have affected that request is unproved.
No adaptive-estimator performance claim is accepted.

## API coverage

The reviewed pages are linked by responsibility; management and cloud accounting do not supply
a preflight count for the local chat request.

| Responsibility | Official pages |
| --- | --- |
| Protocol | [Introduction](https://docs.ollama.com/api/introduction), [authentication](https://docs.ollama.com/api/authentication), [streaming](https://docs.ollama.com/api/streaming), [usage](https://docs.ollama.com/api/usage), [errors](https://docs.ollama.com/api/errors) |
| Compatibility | [OpenAI](https://docs.ollama.com/api/openai-compatibility), [Anthropic](https://docs.ollama.com/api/anthropic-compatibility) |
| Inference | [Generate](https://docs.ollama.com/api/generate), [chat](https://docs.ollama.com/api/chat), [embed](https://docs.ollama.com/api/embed), [System One](https://docs.ollama.com/api/systemone) |
| Metadata | [Tags](https://docs.ollama.com/api/tags), [running models](https://docs.ollama.com/api/ps), [show](https://docs.ollama.com/api-reference/show-model-details), [version](https://docs.ollama.com/api-reference/get-version) |
| Management | [Create](https://docs.ollama.com/api/create), [copy](https://docs.ollama.com/api/copy), [pull](https://docs.ollama.com/api/pull), [push](https://docs.ollama.com/api/push), [delete](https://docs.ollama.com/api/delete) |
| Cloud accounting | [Usage](https://docs.ollama.com/api/cloud-usage), [balance](https://docs.ollama.com/api/balance) |

Cursor Grok's research transport could not fetch the sources. Luna max completed the official
page inventory through the native web tools; root read the decision-bearing documentation and
tagged source directly. These are documentation/source findings, not a live endpoint test.
