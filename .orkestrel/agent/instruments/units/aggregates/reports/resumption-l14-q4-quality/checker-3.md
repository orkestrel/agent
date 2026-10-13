# Blind B sealed-grade join

The B join completed mechanically for all 72 planned packet/judgment/private-join entries. It preserved the 70 served, 1 failed, and 1 unattempted statuses and copied each sealed verdict and reason into the joined outputs without semantic regrading.

## Sealed inputs and retained evidence

| Input | SHA-256 |
| --- | --- |
| `tmp/units/aggregate-development-blind-packet-l14-b/packet.json` | `14b3d53e58eeb7dac1f975c6160974df0a133b6ae8a0cb76a0558c6e73ebfef7` |
| `tmp/units/aggregate-final-blind-b-judgments.json` | `237856cc30584657963c71c5fb3ec89636a6b7e05ce1bdb632e39d38b783f1a7` |
| `tmp/units/aggregate-development-blind-packet-l14-b/private/joins.json` | `cc1ef80f9f5bed19ae84956195e0accae726a5ad05a645ae4e5a1f278900b69d` |
| `.orkestrel/agent/instruments/harness/bench/variants/long/v1.json` | `24efde87208498722a7b25a69cb98ff12552da6379af0c6972144dbd63bf170b` |

The join also revalidated the retained run hashes named in the private joins. Their complete path/hash census is in the bare stage output `tmp/units/aggregate-final-blind-b-check-3-join.stdout.log` (SHA-256 `effc6d70f3225116a8ba29abc6959885fc89ddb62e2f9ce61ff5527edbd12ed9`).

## Execution and validation

The join command was `node tmp/units/aggregate-l14-b-quality-join-3.ts`, launched from `C:/Users/mikes/WebstormProjects/scaffold` by `node tmp/units/aggregate-final-blind-b-check-run-3.ts`. It exited `0` in `123.0824 ms`, with no signal. Complete stdout and stderr are retained at `tmp/units/aggregate-final-blind-b-check-3-join.stdout.log` and `tmp/units/aggregate-final-blind-b-check-3-join.stderr.log`; stderr is empty with SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`. Exact argv, duration, byte counts and log hashes are in `tmp/units/aggregate-final-blind-b-check-3-join.meta.json`.

The unchanged boundary result from report-2 was reused without rerunning it. It resolved 291 packet references, 465 scenario references, and 231 nested seed references, and rejected a wrong-file reference. Relative and absolute names of the same sealed file resolved identically. The join-3 resolver also passed those controls and resolved each eligible-goal pointer before comparing it with its authored goal.

Each private run join covered every authored goal exactly once. Raw rows had unique known goal IDs; only the planned unattempted suffix was absent. The join derived absent rows as `unattempted`, rows with `partial === true` or an `error` property as `failed`, and other present rows as `served`. It matched those derived statuses against both packet and judgment status. Every present row retained boolean success and an exact packet reply. The absent `full` row for `g24-halvorsen-claim` had no packet reply and empty actions; its automatic result remained `undefined` in JSON and displayed as `unattempted` in Markdown. The failed row remained failed. All 72 planned rows remain in the three-arm denominator.

The checker exercised these negative controls through the same validation functions as the sealed data: duplicate/missing ID, served-answer semantic-unattempted, wrong-file reference, falsely served absent row, reply/action attachment to an absent row, pass or ambiguous `completeWork` on failed or unattempted work, and `unattempted` system/listed-tool grades on served or failed work. Every control was rejected. The sealed absent row was the positive control: its absent raw row and empty packet actions were proven before verdict validation; its three unattempted action/semantic grades were retained while `completeWork` remained fail.

## Population and arm counts

The joined population contains 72 rows: 24 authored goals in each of three arms. Statuses are records 24 served; aggregate 24 served; full 22 served, 1 failed, and 1 unattempted. Across arms, status counts are 70 served, 1 failed, and 1 unattempted. The values below are copied from the sealed judgments; `adjustedArmCounts` excludes `g06-kenji-shipping` as in the existing helper.

```json
{
  "armCounts": {
    "records": {
      "semantic": { "pass": 17, "fail": 6, "ambiguous": 1, "unattempted": 0 },
      "systemTool": { "pass": 4, "fail": 20, "ambiguous": 0, "unattempted": 0 },
      "listedTool": { "pass": 18, "fail": 6, "ambiguous": 0, "unattempted": 0 },
      "completeWork": { "pass": 3, "fail": 21, "ambiguous": 0, "unattempted": 0 }
    },
    "aggregate": {
      "semantic": { "pass": 13, "fail": 9, "ambiguous": 2, "unattempted": 0 },
      "systemTool": { "pass": 4, "fail": 20, "ambiguous": 0, "unattempted": 0 },
      "listedTool": { "pass": 18, "fail": 6, "ambiguous": 0, "unattempted": 0 },
      "completeWork": { "pass": 3, "fail": 21, "ambiguous": 0, "unattempted": 0 }
    },
    "full": {
      "semantic": { "pass": 16, "fail": 5, "ambiguous": 1, "unattempted": 2 },
      "systemTool": { "pass": 5, "fail": 18, "ambiguous": 0, "unattempted": 1 },
      "listedTool": { "pass": 15, "fail": 8, "ambiguous": 0, "unattempted": 1 },
      "completeWork": { "pass": 3, "fail": 21, "ambiguous": 0, "unattempted": 0 }
    }
  },
  "adjustedArmCounts": {
    "records": {
      "semantic": { "pass": 17, "fail": 5, "ambiguous": 1, "unattempted": 0 },
      "systemTool": { "pass": 3, "fail": 20, "ambiguous": 0, "unattempted": 0 },
      "listedTool": { "pass": 17, "fail": 6, "ambiguous": 0, "unattempted": 0 },
      "completeWork": { "pass": 3, "fail": 20, "ambiguous": 0, "unattempted": 0 }
    },
    "aggregate": {
      "semantic": { "pass": 13, "fail": 8, "ambiguous": 2, "unattempted": 0 },
      "systemTool": { "pass": 3, "fail": 20, "ambiguous": 0, "unattempted": 0 },
      "listedTool": { "pass": 17, "fail": 6, "ambiguous": 0, "unattempted": 0 },
      "completeWork": { "pass": 3, "fail": 20, "ambiguous": 0, "unattempted": 0 }
    },
    "full": {
      "semantic": { "pass": 16, "fail": 4, "ambiguous": 1, "unattempted": 2 },
      "systemTool": { "pass": 4, "fail": 18, "ambiguous": 0, "unattempted": 1 },
      "listedTool": { "pass": 14, "fail": 8, "ambiguous": 0, "unattempted": 1 },
      "completeWork": { "pass": 3, "fail": 20, "ambiguous": 0, "unattempted": 0 }
    }
  }
}
```

## Outputs and helper deltas

| Output | SHA-256 |
| --- | --- |
| `tmp/units/aggregate-l14-b-quality-joined-3.json` | `b2ac484bd438daf884eb37f8de6a9b164cf6c096e1fccb0ee3f15f45d6fecd29` |
| `tmp/units/aggregate-l14-b-quality-report-3.md` | `c259d7b1b9f8441ee57fa515512cd9367206280a5c9dbb702ab3237ebd0df8b8` |
| `tmp/units/aggregate-l14-b-quality-join-validation-3.md` | `868e8aaf01591cffabca2760e98e3b8f87a9f1f786a238593f7227d7ac5e6c5e` |

The full A-to-3 helper diff is retained at `tmp/units/aggregate-final-blind-b-check-full-diff-3.patch` (SHA-256 `3543c4516fbc99e8cc8166a629870c3d04d3ec3ccde7a8e2217898c2ed404713`); the incremental 2-to-3 join diff is retained at `tmp/units/aggregate-final-blind-b-check-incremental-diff-2-to-3.patch` (SHA-256 `82b463bd94b57a611ccaeaa5ef6bf4b26f6d08c75596f5c98d1863744ea46d5b`). Their bytes were compared with fresh no-index diffs against the named helpers. This checker did not alter sealed bytes or run inference, source/build gates, or service actions. The dispatch citation checker reported 0 citations and 0 unresolved references for the report.
