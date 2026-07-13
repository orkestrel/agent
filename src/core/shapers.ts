import {
	booleanShape,
	integerShape,
	literalShape,
	objectShape,
	optionalShape,
	stringShape,
	unionShape,
} from '@orkestrel/contract'

// Workspace-tool contract shape — the shape VALUE `createWorkspaceTool` (factories.ts) compiles
// into the four lockstep outputs (JSON Schema + guard + parser + first-match parser). It MUST
// agree with the hand-written `WorkspaceOperation` discriminated union (types.ts), which is the
// source of truth (AGENTS §14): a valid `WorkspaceOperation` is accepted by the compiled `is` /
// `parse`. The union compiles to an `anyOf` schema + `unionOf` guard + first-match parser
// automatically — one `objectShape` per operation arm, each leading with the `operation`
// discriminant.
//
// Every field carries a `description` so the advertised JSON Schema spells out what each op does
// and what each field means (compilers.ts `compileSchema` emits a shape's `description` verbatim)
// — the FLAT-steps ergonomic lever a 2B model authors a complete operation from. The range edit is
// the FLAT `'splice'` op (four positive-integer caret components), never a nested range — the four
// ints are reassembled into a `Range` by `rangeOf` in the handler. The description-carrying
// `operation` discriminant rides on the shared `literalShape` (@orkestrel/contract) — the same
// helper the workflow tool's `via` discriminant uses (consolidated there per AGENTS §5).

/**
 * The shape of a {@link import('./types.js').WorkspaceOperation} — a descriptive tagged union over
 * the 13 workspace edit / read / navigation operations, discriminated by the `operation` literal
 * (never a bare `kind`; AGENTS §4.8). Each variant leads with its `operation` discriminant then its
 * FLAT fields, every field via `stringShape` / `optionalShape` / `integerShape({ min: 1 })` /
 * `booleanShape`, each carrying a strong field-level `description`.
 *
 * @remarks
 * The union compiles to an `anyOf` JSON Schema + a `unionOf` guard + a first-match parser
 * automatically ({@link import('./factories.js').createWorkspaceTool} types the result to the
 * hand-written `WorkspaceOperation`). `limit` and the four `'splice'` caret components are POSITIVE
 * integers (`integerShape({ min: 1 })`); `regex` / `exact` are `optionalShape(booleanShape(...))`.
 * The two REGISTRY arms — `workspaces` (list the workspaces the model can move between) and `switch`
 * (re-point the active one by `id`) — let a model DISCOVER then CHOOSE which workspace the edit /
 * read arms target. The descriptions are the small-model ergonomic lever — they ride into the
 * advertised schema so a model authoring an operation gets per-field guidance.
 */
export const workspaceToolShape = unionShape(
	objectShape({
		operation: literalShape(['read'], { description: "Read a whole text file's text by path." }),
		path: stringShape({ description: 'The path of the file to read.' }),
	}),
	objectShape({
		operation: literalShape(['list'], { description: 'List every file in the workspace.' }),
	}),
	objectShape({
		operation: literalShape(['has'], { description: 'Check whether a file exists at the path.' }),
		path: stringShape({ description: 'The path to check for.' }),
	}),
	objectShape({
		operation: literalShape(['search'], {
			description: 'Search every text file for a query, returning each hit.',
		}),
		query: stringShape({ description: 'The text (or regular-expression source) to search for.' }),
		regex: optionalShape(
			booleanShape({
				description:
					'Treat the query as a regular expression. Defaults to false (a literal substring).',
			}),
		),
		exact: optionalShape(
			booleanShape({
				description: 'Match case-sensitively. Defaults to true (set false for case-insensitive).',
			}),
		),
		limit: optionalShape(
			integerShape({
				min: 1,
				description: 'Stop after this many matches across all files. Omitted means unlimited.',
			}),
		),
	}),
	objectShape({
		operation: literalShape(['replace'], {
			description: 'Replace a query with a replacement across every text file.',
		}),
		query: stringShape({ description: 'The text (or regular-expression source) to replace.' }),
		replacement: stringShape({ description: 'The text to substitute for each match.' }),
		regex: optionalShape(
			booleanShape({
				description:
					'Treat the query as a regular expression. Defaults to false (a literal substring).',
			}),
		),
		exact: optionalShape(
			booleanShape({
				description: 'Match case-sensitively. Defaults to true (set false for case-insensitive).',
			}),
		),
		limit: optionalShape(
			integerShape({
				min: 1,
				description: 'Stop after this many replacements across all files. Omitted means unlimited.',
			}),
		),
	}),
	objectShape({
		operation: literalShape(['write'], {
			description: 'Create or overwrite a whole file with content.',
		}),
		path: stringShape({ description: 'The path of the file to write.' }),
		content: stringShape({ description: 'The full new contents of the file.' }),
	}),
	objectShape({
		operation: literalShape(['splice'], {
			description:
				'Replace a 1-based range of an existing text file (from inclusive, to exclusive) with content.',
		}),
		path: stringShape({ description: 'The path of the text file to edit.' }),
		content: stringShape({ description: 'The text to splice in place of the range.' }),
		fromLine: integerShape({
			min: 1,
			description: 'The 1-based start line of the range (inclusive).',
		}),
		fromColumn: integerShape({
			min: 1,
			description:
				'The 1-based start column of the range (inclusive; column 1 is the first character).',
		}),
		toLine: integerShape({ min: 1, description: 'The 1-based end line of the range (exclusive).' }),
		toColumn: integerShape({
			min: 1,
			description: 'The 1-based end column of the range (exclusive).',
		}),
	}),
	objectShape({
		operation: literalShape(['prepend'], {
			description: 'Add content to the start of a file (creating it when absent).',
		}),
		path: stringShape({ description: 'The path of the file to prepend to.' }),
		content: stringShape({ description: 'The text to add at the start of the file.' }),
	}),
	objectShape({
		operation: literalShape(['append'], {
			description: 'Add content to the end of a file (creating it when absent).',
		}),
		path: stringShape({ description: 'The path of the file to append to.' }),
		content: stringShape({ description: 'The text to add at the end of the file.' }),
	}),
	objectShape({
		operation: literalShape(['move'], {
			description: 'Rename or move a file (overwriting an occupied target).',
		}),
		from: stringShape({ description: 'The current path of the file.' }),
		to: stringShape({ description: 'The new path for the file.' }),
	}),
	objectShape({
		operation: literalShape(['remove'], { description: 'Delete a file from the workspace.' }),
		path: stringShape({ description: 'The path of the file to remove.' }),
	}),
	objectShape({
		operation: literalShape(['workspaces'], {
			description:
				'List the workspaces you can move between (each id, file count, and whether it is active), so you can pick an id to switch to.',
		}),
	}),
	objectShape({
		operation: literalShape(['switch'], {
			description:
				'Switch the active workspace to the one with this id (get ids from the "workspaces" operation). Edit and read operations then target it.',
		}),
		id: stringShape({
			description: 'The id of the workspace to make active (from the "workspaces" listing).',
		}),
	}),
)
