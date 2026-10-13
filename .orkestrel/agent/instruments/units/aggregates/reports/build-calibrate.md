The `calibrate` unit is written and its test file passes. The `tsc` proof exits 2, because `bench5/types.ts` (which I don't own) lacks the 15 `Calibrate*` type names `calibrate.ts` imports. Applying the patch below to `types.ts` should clear those.

## Files written
- `/home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/calibrate.ts`: the CLI and a `Calibrator` class. It builds labelled CHANGE and AGREE items from seed truth, asks them through the `JudgeCache`, fits both cutoffs, and writes `items.jsonl` and `fit.json`.
- `/home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/tests/calibrate.test.ts`: 36 tests. They cover flags, scenario reading, source selection, value swaps, item building, `fitCutoff`, the tallies, and `Calibrator` end to end against `startFixture` with a preloaded judge cache. They also include a child-process exit 64 check, and `fetch` throws for any `:11434` URL.

## Proof commands
- `node --test bench5/tests/calibrate.test.ts` exits 0. Its last lines are `# tests 36`, `# pass 36`, `# fail 0`.
- `node /home/user/scaffold/node_modules/typescript/bin/tsc -p .../bench5/tsconfig.json` exits 2, with 70 diagnostic lines:
  - 35 of them are in my two files. 15 are `TS2305` for the missing `Calibrate*` names. The rest are `TS7006` cascades from those unresolved types.
  - The other 35 are in `bench5/shadow.ts` and `bench5/tests/shadow.test.ts`, which lack their own `Shadow*` types.
- To check the patch, I typechecked my two files in a scratch sandbox in the scratchpad directory, with the patch appended to a copy of `types.ts`. That run printed nothing and the `tsc` exit status was not captured. I did not re-run `tsc` against the real tree after the patch.

## Patch for `bench5/types.ts`
Append this text to the end of `types.ts`. A copy is at `/tmp/claude-0/-home-user/5e260bfe-213d-5ed6-a85a-c681e970c415/scratchpad/types/calibrate-types.txt`. It uses `MessageRole`, `JudgeQuestion`, `TopicSpec`, `ScenarioDay`, `AggregateSource`, and `Fit`, which `types.ts` already imports or declares.

```ts
export type CalibrateHead = 'change' | 'agree'

export type CalibrateVariant = 'next' | 'foreign' | 'repeat' | 'summary' | 'stale' | 'cross'

export type CalibrateOutcome = 'answered' | 'refused' | 'failed'

/** Holds the flags of one calibration invocation after validation, with every path resolved. */
export interface CalibrateConfig {
	readonly cache: string
	/** Holds the model tag, a `MODELS` value. */
	readonly model: string
	/** Holds the `MODELS` key of the tag, which names the model's entry in the settings file. */
	readonly key: string
	readonly out: string
	readonly live: boolean
	readonly url: string
	/** Holds the path of the scenario whose seed truth labels the items. */
	readonly scenario: string
	readonly settings: string
}

/** Holds the flags that parsed, or the reason that none did. */
export type CalibrateConfigOutcome =
	| { readonly success: true; readonly value: CalibrateConfig }
	| { readonly success: false; readonly error: string }

/** Holds one seed message with the truth that labels it. */
export interface CalibrateMessage {
	readonly index: number
	readonly role: MessageRole
	readonly content: string
	readonly category: string
	readonly topics: readonly string[]
	/** Lists the earlier seed indices that this message amends. */
	readonly amends: readonly number[]
	/** Lists the earlier seed indices that this message supersedes. */
	readonly supersedes: readonly number[]
}

/** Holds the parts of the long scenario that the calibration reads. */
export interface CalibrateScenario {
	readonly topics: readonly TopicSpec[]
	readonly days: readonly ScenarioDay[]
	readonly messages: readonly CalibrateMessage[]
	/** Lists the distinct read points in ascending order. */
	readonly points: readonly number[]
}

/** Holds the carriers of a topic at a read point, split by whether truth has replaced them. */
export interface CalibrateSelection {
	readonly live: readonly CalibrateMessage[]
	readonly stale: readonly CalibrateMessage[]
}

/** Holds a summary that passes the code check, with the sources it was built from. */
export interface CalibrateSummary {
	readonly topic: string
	readonly after: number
	readonly asOf: string
	readonly prose: string
	readonly sources: readonly AggregateSource[]
	/** Lists the seed indices of the live carriers. */
	readonly live: readonly number[]
	/** Lists the seed indices of the stale carriers. */
	readonly stale: readonly number[]
}

/** Holds a summary with one value replaced by code. */
export interface CalibrateSwap {
	readonly variant: 'stale' | 'cross'
	readonly from: string
	readonly to: string
	readonly prose: string
}

/** Holds one labelled judge item. */
export interface CalibrateItem {
	readonly id: string
	readonly head: CalibrateHead
	readonly variant: CalibrateVariant
	/** Holds `true` for an item the judge must answer yes. */
	readonly label: boolean
	readonly topic: string
	readonly after: number
	/** Lists the seed indices of the event messages that a CHANGE item drew. */
	readonly events: readonly number[]
	/** Holds `FROM -> TO` for an AGREE item whose summary had a value replaced. */
	readonly swap: string | undefined
	readonly state: string
	readonly question: JudgeQuestion
}

/** Holds an item with the judge's answer. */
export interface CalibrateAsked {
	readonly item: CalibrateItem
	readonly noul: number | undefined
	readonly outcome: CalibrateOutcome
	readonly cached: boolean
	readonly wall: number
}

/** Holds a fitted cutoff and whether it gives no yes on the negatives. */
export interface CalibrateCutoff {
	readonly cutoff: number
	readonly separated: boolean
}

/** Counts one head's items at its fitted cutoff. */
export interface CalibrateTally {
	readonly positives: number
	readonly negatives: number
	readonly refused: number
	readonly failed: number
	readonly cached: number
	/** Counts the positives at or above the cutoff. */
	readonly recalled: number
	/** Counts the negatives at or above the cutoff. */
	readonly leaked: number
	readonly separated: boolean
}

/** Counts the summaries and the items of a calibration. */
export interface CalibrateCounts {
	readonly summaries: { readonly asked: number; readonly passed: number; readonly failed: number }
	readonly change: CalibrateTally
	readonly agree: CalibrateTally
}

/** Holds the content of `fit.json`: the two cutoffs, whether both separated, and the counts. */
export interface CalibrateFit extends Fit {
	readonly counts: CalibrateCounts
}
```

## Choices where the brief left room
- **Cutoff grid:** the fit searches 0.51 to 1.00 in steps of 0.01, so "the lowest value above 0.5" has a minimum. A yes is `noul >= cutoff`, which is how `Aggregator` reads it.
- **`separated` flag:** it is true only when the cutoff gives no yes on the negatives and both the positive and negative lists are non-empty.
- **Fallback fit:** when `separated` is false, the fit takes the best balanced accuracy, and the lowest cutoff on a tie. `fit.json` carries the combined flag and per-head `separated` flags under `counts`.
- **Matched negatives:** each summary that has a next carrier gets at most one "foreign" negative and one "repeat" negative per CHANGE head. A later decisive message without the topic is the foreign one. A message among the summary's live sources is the repeat. They are drawn from a seeded stream, seed 7, in the order points, then topics, and each item logs its event indices in `items.jsonl`.
- **AGREE negatives:** the "stale" swap puts in a same-shape value from a stale message of the topic that no live source carries. The "cross" swap does the same from a decisive message of another topic. All occurrences of the replaced value change.
- **Stale sources:** the removed earlier sides come from truth `amends` and `supersedes` pairs of any message up to the read point, whatever its category. Sources are split into sentences with `splitSentences`.
- **Summary retries:** summaries retry on a failed code check up to `settings.retry` times, as the aggregator does. A summary that never passes is counted under `counts.summaries.failed` and produces no items.
- **Failure exits:** the script exits 1 on an offline cache miss, a missing input, or a judge fault. A deterministic judge error on one item counts as `failed` and is skipped.
- **Extra config fields:** `CalibrateConfig` carries `scenario` and `settings` paths. The CLI sets them to `SCENARIO_LONG` and `bench5/settings.json`, and the tests set them to temporary files. These are not CLI flags, so the usage line matches the brief.
- **Coupling to `Driver.ts`:** `calibrate.ts` imports `readSettings` from `./Driver.ts`, so a break in `Driver.ts` stops this unit's tests. The test also imports `readFit` from the same file, to show the Driver accepts the `fit.json` this script writes.

## Deviations
- **Expected:** `tsc` exits 0 for my files once the type-consolidation unit lands.
- **Found:** `tsc` exits 2 with 35 diagnostics in my files, all from the missing `Calibrate*` types, as shown earlier.
- **Evidence:** `/tmp/claude-0/-home-user/5e260bfe-213d-5ed6-a85a-c681e970c415/scratchpad/tsc.txt`.

No ruling is needed.
