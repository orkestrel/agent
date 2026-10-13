// Renders a request body as the embedded qwen3.5 chat template (qwen35-chat-template.jinja) would, for
// string content, tool calls, and tool results; the daemon uses its built-in qwen3.5 renderer instead.
import { readFileSync } from 'node:fs'
const body = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const tail = Number(process.argv[3] ?? 0)
const messages = body.messages
let out = ''
const system = messages[0].role === 'system' ? messages[0].content.trim() : ''
if (body.tools?.length > 0) {
	out += '<|im_start|>system\n# Tools\n\nYou have access to the following functions:\n\n<tools>'
	for (const tool of body.tools) out += `\n${JSON.stringify(tool)}`
	out += '\n</tools>\n\n[fixed tool-call format instructions and <IMPORTANT> reminder]'
	if (system) out += `\n\n${system}`
	out += '<|im_end|>\n'
} else if (system) out += `<|im_start|>system\n${system}<|im_end|>\n`
let last = messages.length - 1
for (let index = messages.length - 1; index >= 0; index -= 1) {
	const content = messages[index].content.trim()
	if (messages[index].role === 'user' && !(content.startsWith('<tool_response>') && content.endsWith('</tool_response>'))) {
		last = index
		break
	}
}
const head = out
let rendered = ''
messages.forEach((message, index) => {
	const content = message.content.trim()
	let piece = ''
	if (message.role === 'user') piece = `<|im_start|>user\n${content}<|im_end|>\n`
	else if (message.role === 'assistant') {
		piece = index > last ? `<|im_start|>assistant\n<think>\n\n</think>\n\n${content}` : `<|im_start|>assistant\n${content}`
		;(message.tool_calls ?? []).forEach((call, which) => {
			piece += which === 0 ? (content ? '\n\n<tool_call>\n' : '<tool_call>\n') : '\n<tool_call>\n'
			piece += `<function=${call.function.name}>\n`
			for (const [name, value] of Object.entries(call.function.arguments ?? {})) piece += `<parameter=${name}>\n${typeof value === 'string' ? value : JSON.stringify(value)}\n</parameter>\n`
			piece += '</function>\n</tool_call>'
		})
		piece += '<|im_end|>\n'
	} else if (message.role === 'tool') {
		if (messages[index - 1]?.role !== 'tool') piece += '<|im_start|>user'
		piece += `\n<tool_response>\n${content}\n</tool_response>`
		if (index === messages.length - 1 || messages[index + 1].role !== 'tool') piece += '<|im_end|>\n'
	}
	if (index >= messages.length - tail || tail === 0) rendered += piece
})
rendered += '<|im_start|>assistant\n<think>\n\n</think>\n\n'
process.stdout.write(tail === 0 ? head + rendered : `${head.slice(0, 400)}\n[...]\n${'... earlier messages ...\n'}${rendered}`)
