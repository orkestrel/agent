# Successor alias b sealed quality validation

Both sealed readers exited 0 on Windows PowerShell from `C:/Users/mikes/WebstormProjects/scaffold`. The join took 184 ms and the boundary check took 165 ms. Each ran once. The join accepted the sealed judgments and all controls; the boundary reader accepted every eligible reference and rejected its negative controls. This report preserves the full stdout captures at the end; both stderr captures are empty.

## Commands and copy verification

| Command | Exit | Duration | Captures and metadata |
| --- | ---: | ---: | --- |
| `node tmp/units/aggregate-successor-quality-b-join-sealed.ts` | 0 | 184 ms | `aggregate-successor-quality-b-join.stdout.txt`, `aggregate-successor-quality-b-join.stderr.txt`, `aggregate-successor-quality-b-join-execution.json` |
| `node tmp/units/aggregate-successor-quality-b-boundary-sealed.ts` | 0 | 165 ms | `aggregate-successor-quality-b-boundary.stdout.txt`, `aggregate-successor-quality-b-boundary.stderr.txt`, `aggregate-successor-quality-b-boundary-execution.json` |

The copy comparisons ran as `git --no-pager diff --no-index -- tmp/units/aggregate-successor-quality-b-join.ts tmp/units/aggregate-successor-quality-b-join-sealed.ts` and `git --no-pager diff --no-index -- tmp/units/aggregate-successor-quality-b-boundary.ts tmp/units/aggregate-successor-quality-b-boundary-sealed.ts`; each exited 1 because the files differ. The join diff changes only the expected packet and judgment hash literals at line 8; the boundary diff changes only those two literals at lines 8–9. Both prepared files retain the unreleased placeholders. The sealed file hashes match the dispatch seals. See the [prepared join](tmp/units/aggregate-successor-quality-b-join.ts:8), [sealed join](tmp/units/aggregate-successor-quality-b-join-sealed.ts:8), [prepared boundary reader](tmp/units/aggregate-successor-quality-b-boundary.ts:8), and [sealed boundary reader](tmp/units/aggregate-successor-quality-b-boundary-sealed.ts:8).

All create-only destinations were absent before execution: joined JSON, joined Markdown, join validation Markdown, and boundary addendum. Both readers created these outputs. The join reports 72 unique packet IDs, 72 unique judgment IDs, and 72 unique private join IDs; all 72 rows are served. See the [joined measurements](tmp/units/aggregate-successor-quality-b-joined.json:2), [join controls and totals](tmp/units/aggregate-successor-quality-b-join-validation.md:27), and [boundary result](tmp/units/aggregate-successor-quality-b-boundary-addendum.md:11).

## Coverage, planned statuses, and controls

| Check | Coverage and result |
| --- | --- |
| Join population | 72 judgments, 72 packet IDs, 72 private join IDs; 72 served, 0 failed, 0 unattempted |
| Boundary population | 72 packet goals and judgments; 332 packet references, 490 scenario references, 253 seed references, all 253 nested seed-content references |
| Join controls | Duplicate/missing IDs rejected; served-answer semantic `unattempted` rejected; wrong-file reference rejected; relative/absolute reference forms agree; absent-row served status, reply, and actions rejected; synthetic absent-row positive control passed; failed/unattempted completion `pass` and `ambiguous` rejected; served/failed `unattempted` action-axis controls rejected |
| Boundary controls | Nested seed reference past inclusive boundary rejected; served-answer semantic `unattempted` rejected; wrong-file reference rejected; relative/absolute reference forms agree |

Synthetic controls are outside the measured population. The readers copied judgments and reasons without edits. The result reports measurements only; it does not interpret reasons or compare quality.

## Exact verdict counts

Raw denominators are 24 rows per arm. Adjusted denominators are 23 rows per arm after excluding `g06-kenji-shipping` from each arm. Counts preserve `ambiguous` and `unattempted` separately. The JSON output records the same raw and adjusted counts at [raw counts](tmp/units/aggregate-successor-quality-b-joined.json:51) and [adjusted counts](tmp/units/aggregate-successor-quality-b-joined.json:131).

| Arm | Axis | Raw n | Raw pass | Raw fail | Raw ambiguous | Raw unattempted | Adjusted n | Adjusted pass | Adjusted fail | Adjusted ambiguous | Adjusted unattempted |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| full | semantic | 24 | 16 | 6 | 2 | 0 | 23 | 16 | 5 | 2 | 0 |
| full | systemTool | 24 | 7 | 17 | 0 | 0 | 23 | 6 | 17 | 0 | 0 |
| full | listedTool | 24 | 18 | 6 | 0 | 0 | 23 | 17 | 6 | 0 | 0 |
| full | completeWork | 24 | 4 | 19 | 1 | 0 | 23 | 4 | 18 | 1 | 0 |
| aggregate | semantic | 24 | 14 | 9 | 1 | 0 | 23 | 14 | 8 | 1 | 0 |
| aggregate | systemTool | 24 | 5 | 19 | 0 | 0 | 23 | 4 | 19 | 0 | 0 |
| aggregate | listedTool | 24 | 17 | 7 | 0 | 0 | 23 | 16 | 7 | 0 | 0 |
| aggregate | completeWork | 24 | 2 | 22 | 0 | 0 | 23 | 2 | 21 | 0 | 0 |
| records | semantic | 24 | 14 | 9 | 1 | 0 | 23 | 14 | 8 | 1 | 0 |
| records | systemTool | 24 | 5 | 19 | 0 | 0 | 23 | 4 | 19 | 0 | 0 |
| records | listedTool | 24 | 17 | 7 | 0 | 0 | 23 | 16 | 7 | 0 | 0 |
| records | completeWork | 24 | 2 | 22 | 0 | 0 | 23 | 2 | 21 | 0 | 0 |

## Input hashes

| Input | SHA-256 |
| --- | --- |
| `tmp/units/aggregate-development-blind-packet-successor-b/packet.json` | `a61415997d2810b90d07626d753eb48ec3ab12ea331bd19cc66b13ae1bdb6df4` |
| `tmp/units/aggregate-successor-quality-b-judgments.json` | `9405d9bd6ae081c59d69e8de8936456004e10372bf93d0563faf090723b15fcd` |
| `tmp/units/aggregate-development-blind-packet-successor-b/private/joins.json` | `c23252eb5256708ee698fcb1c7915953f244c401009b6a0ac4aafbe1ab28c468` |
| `.orkestrel/agent/instruments/harness/bench/variants/long/v1.json` | `24efde87208498722a7b25a69cb98ff12552da6379af0c6972144dbd63bf170b` |
| `.orkestrel/agent/instruments/results/l15/q4-think1/resource/reserve-1024/l6-q4-think1-records-v1/run.json` | `992286fcf948ffbc3e73f0998a52e0423a67359630c4caae3e93bacf2898acff` |
| `.orkestrel/agent/instruments/results/l15/q4-think1/resource/reserve-1024/l6-q4-think1-records-v1/rows.jsonl` | `5416ebb5b5580d648e9828cfad0bb381f2e03e3d4c2f10a4aa23d617019ca2ca` |
| `.orkestrel/agent/instruments/results/l15/q4-think1/resource/reserve-1024/l6-q4-think1-records-v1/messages.jsonl` | `05d14e42141d6128c1bd07786cdda59f9e2ea92ba82f2b1cb38b39a76838a3d1` |
| `.orkestrel/agent/instruments/results/l15/q4-think1/pilot/development/l6-q4-think1-aggregate-v1/run.json` | `fd05ff7397fbb483cf307eb6e9e7fe2b932f5db2dc19ca1f06db5f4c229cfdf6` |
| `.orkestrel/agent/instruments/results/l15/q4-think1/pilot/development/l6-q4-think1-aggregate-v1/rows.jsonl` | `9560f894ea98c842ec09060a90d6a892158cf4f97c8036f6d5b9b1a4c37d5cb7` |
| `.orkestrel/agent/instruments/results/l15/q4-think1/pilot/development/l6-q4-think1-aggregate-v1/messages.jsonl` | `7553a974e07480d10172d74247b1e6b427a999c810c01211be6fd4dd42198af3` |
| `.orkestrel/agent/instruments/results/l15/q4-think1/full/preflight/l6-q4-think1-full-v1/run.json` | `3ee23e486ea3b2a0a93b58bf74a1969a88a5c3b97c16e5c85c0fb876dfc42063` |
| `.orkestrel/agent/instruments/results/l15/q4-think1/full/preflight/l6-q4-think1-full-v1/rows.jsonl` | `cadcd0939d821f84f7441cd1eade02e9e13b67fc7c9f7ca69d2082b31a4eefa0` |
| `.orkestrel/agent/instruments/results/l15/q4-think1/full/preflight/l6-q4-think1-full-v1/messages.jsonl` | `3f0a7f1e2bf24e4abc0f5b049c95ae16287c5e970d9d589c0d0c176b290bd71a` |

## Script and output hashes

| Artifact | SHA-256 |
| --- | --- |
| Prepared join | `bd5b8103c7af57475e4dfbe8531bc99e9edfbb3edfa3fbb9a89e0c8faebca19f` |
| Sealed join | `b61ec050fff029262f4ed3d611626d5768ab50782056576d242aa9c292739152` |
| Prepared boundary reader | `98ef967bada3beab4c2376cd32fb2ef31818750df4317160cc140cea613b4c54` |
| Sealed boundary reader | `3aa7639d537650f98a0f59b6d589497d105aca42a3e074b481bf8db0ea58f8f6` |
| Joined JSON | `e975e2c539cc3d9379bd56c279d3cf42d07957afa63d2d57ac5a430d5f61062f` |
| Joined Markdown | `ec7095873258912212f1c05575df4a9e48a8841386c121d0ff0abf5be33204f6` |
| Join validation Markdown | `b6457560c904fa3cbb3634d30ca3167012787d7f3d29836390a6089d700c162c` |
| Boundary addendum Markdown | `7142a2886f464fd45a3a25f65e524327af4998d08d94023760564ff076c9a176` |

## Captures

The stdout captures are included verbatim. The empty stderr captures have SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` and length 0 bytes each. Capture file hashes: join stdout `620d25965f3677596141fb43f81cfb4b530b439f60e6f0ad0b069279007c15e2`; boundary stdout `894dec072b0ac401f8f4add0283b351c40e25a7712a115e43009f03af406d33d`. Execution metadata: join `2669c95ff0645dbfdd4d120e025e96dd5cad73ec6bb1e9d003594901d2dce245`; boundary `0d90f93e46b1fb88bea985e24cddb8e29af612d582918fc78338ce26aeb7ca4a`.

### Join stdout

```json
{
  "output": "tmp/units/aggregate-successor-quality-b-joined.json",
  "joinedMarkdown": "tmp/units/aggregate-successor-quality-b-joined.md",
  "validation": "tmp/units/aggregate-successor-quality-b-join-validation.md",
  "hashes": {
    "tmp/units/aggregate-development-blind-packet-successor-b/packet.json": "a61415997d2810b90d07626d753eb48ec3ab12ea331bd19cc66b13ae1bdb6df4",
    "tmp/units/aggregate-successor-quality-b-judgments.json": "9405d9bd6ae081c59d69e8de8936456004e10372bf93d0563faf090723b15fcd",
    "tmp/units/aggregate-development-blind-packet-successor-b/private/joins.json": "c23252eb5256708ee698fcb1c7915953f244c401009b6a0ac4aafbe1ab28c468",
    ".orkestrel/agent/instruments/harness/bench/variants/long/v1.json": "24efde87208498722a7b25a69cb98ff12552da6379af0c6972144dbd63bf170b",
    "C:\\Users\\mikes\\WebstormProjects\\scaffold\\.orkestrel\\agent\\instruments\\harness\\bench\\variants\\long\\v1.json": "24efde87208498722a7b25a69cb98ff12552da6379af0c6972144dbd63bf170b",
    "C:\\Users\\mikes\\WebstormProjects\\scaffold\\.orkestrel\\agent\\instruments\\results\\l15\\q4-think1\\resource\\reserve-1024\\l6-q4-think1-records-v1\\run.json": "992286fcf948ffbc3e73f0998a52e0423a67359630c4caae3e93bacf2898acff",
    "C:\\Users\\mikes\\WebstormProjects\\scaffold\\.orkestrel\\agent\\instruments\\results\\l15\\q4-think1\\resource\\reserve-1024\\l6-q4-think1-records-v1\\rows.jsonl": "5416ebb5b5580d648e9828cfad0bb381f2e03e3d4c2f10a4aa23d617019ca2ca",
    "C:\\Users\\mikes\\WebstormProjects\\scaffold\\.orkestrel\\agent\\instruments\\results\\l15\\q4-think1\\resource\\reserve-1024\\l6-q4-think1-records-v1\\messages.jsonl": "05d14e42141d6128c1bd07786cdda59f9e2ea92ba82f2b1cb38b39a76838a3d1",
    "C:\\Users\\mikes\\WebstormProjects\\scaffold\\.orkestrel\\agent\\instruments\\results\\l15\\q4-think1\\pilot\\development\\l6-q4-think1-aggregate-v1\\run.json": "fd05ff7397fbb483cf307eb6e9e7fe2b932f5db2dc19ca1f06db5f4c229cfdf6",
    "C:\\Users\\mikes\\WebstormProjects\\scaffold\\.orkestrel\\agent\\instruments\\results\\l15\\q4-think1\\pilot\\development\\l6-q4-think1-aggregate-v1\\rows.jsonl": "9560f894ea98c842ec09060a90d6a892158cf4f97c8036f6d5b9b1a4c37d5cb7",
    "C:\\Users\\mikes\\WebstormProjects\\scaffold\\.orkestrel\\agent\\instruments\\results\\l15\\q4-think1\\pilot\\development\\l6-q4-think1-aggregate-v1\\messages.jsonl": "7553a974e07480d10172d74247b1e6b427a999c810c01211be6fd4dd42198af3",
    "C:\\Users\\mikes\\WebstormProjects\\scaffold\\.orkestrel\\agent\\instruments\\results\\l15\\q4-think1\\full\\preflight\\l6-q4-think1-full-v1\\run.json": "3ee23e486ea3b2a0a93b58bf74a1969a88a5c3b97c16e5c85c0fb876dfc42063",
    "C:\\Users\\mikes\\WebstormProjects\\scaffold\\.orkestrel\\agent\\instruments\\results\\l15\\q4-think1\\full\\preflight\\l6-q4-think1-full-v1\\rows.jsonl": "cadcd0939d821f84f7441cd1eade02e9e13b67fc7c9f7ca69d2082b31a4eefa0",
    "C:\\Users\\mikes\\WebstormProjects\\scaffold\\.orkestrel\\agent\\instruments\\results\\l15\\q4-think1\\full\\preflight\\l6-q4-think1-full-v1\\messages.jsonl": "3f0a7f1e2bf24e4abc0f5b049c95ae16287c5e970d9d589c0d0c176b290bd71a"
  },
  "outputHashes": {
    "tmp/units/aggregate-successor-quality-b-joined.json": "e975e2c539cc3d9379bd56c279d3cf42d07957afa63d2d57ac5a430d5f61062f",
    "tmp/units/aggregate-successor-quality-b-joined.md": "ec7095873258912212f1c05575df4a9e48a8841386c121d0ff0abf5be33204f6",
    "tmp/units/aggregate-successor-quality-b-join-validation.md": "b6457560c904fa3cbb3634d30ca3167012787d7f3d29836390a6089d700c162c"
  },
  "counts": {
    "full": {
      "semantic": {
        "pass": 16,
        "fail": 6,
        "ambiguous": 2,
        "unattempted": 0
      },
      "systemTool": {
        "pass": 7,
        "fail": 17,
        "ambiguous": 0,
        "unattempted": 0
      },
      "listedTool": {
        "pass": 18,
        "fail": 6,
        "ambiguous": 0,
        "unattempted": 0
      },
      "completeWork": {
        "pass": 4,
        "fail": 19,
        "ambiguous": 1,
        "unattempted": 0
      }
    },
    "aggregate": {
      "semantic": {
        "pass": 14,
        "fail": 9,
        "ambiguous": 1,
        "unattempted": 0
      },
      "systemTool": {
        "pass": 5,
        "fail": 19,
        "ambiguous": 0,
        "unattempted": 0
      },
      "listedTool": {
        "pass": 17,
        "fail": 7,
        "ambiguous": 0,
        "unattempted": 0
      },
      "completeWork": {
        "pass": 2,
        "fail": 22,
        "ambiguous": 0,
        "unattempted": 0
      }
    },
    "records": {
      "semantic": {
        "pass": 14,
        "fail": 9,
        "ambiguous": 1,
        "unattempted": 0
      },
      "systemTool": {
        "pass": 5,
        "fail": 19,
        "ambiguous": 0,
        "unattempted": 0
      },
      "listedTool": {
        "pass": 17,
        "fail": 7,
        "ambiguous": 0,
        "unattempted": 0
      },
      "completeWork": {
        "pass": 2,
        "fail": 22,
        "ambiguous": 0,
        "unattempted": 0
      }
    }
  },
  "adjusted": {
    "full": {
      "semantic": {
        "pass": 16,
        "fail": 5,
        "ambiguous": 2,
        "unattempted": 0
      },
      "systemTool": {
        "pass": 6,
        "fail": 17,
        "ambiguous": 0,
        "unattempted": 0
      },
      "listedTool": {
        "pass": 17,
        "fail": 6,
        "ambiguous": 0,
        "unattempted": 0
      },
      "completeWork": {
        "pass": 4,
        "fail": 18,
        "ambiguous": 1,
        "unattempted": 0
      }
    },
    "aggregate": {
      "semantic": {
        "pass": 14,
        "fail": 8,
        "ambiguous": 1,
        "unattempted": 0
      },
      "systemTool": {
        "pass": 4,
        "fail": 19,
        "ambiguous": 0,
        "unattempted": 0
      },
      "listedTool": {
        "pass": 16,
        "fail": 7,
        "ambiguous": 0,
        "unattempted": 0
      },
      "completeWork": {
        "pass": 2,
        "fail": 21,
        "ambiguous": 0,
        "unattempted": 0
      }
    },
    "records": {
      "semantic": {
        "pass": 14,
        "fail": 8,
        "ambiguous": 1,
        "unattempted": 0
      },
      "systemTool": {
        "pass": 4,
        "fail": 19,
        "ambiguous": 0,
        "unattempted": 0
      },
      "listedTool": {
        "pass": 16,
        "fail": 7,
        "ambiguous": 0,
        "unattempted": 0
      },
      "completeWork": {
        "pass": 2,
        "fail": 21,
        "ambiguous": 0,
        "unattempted": 0
      }
    }
  },
  "population": {
    "entries": 72,
    "uniquePacketIds": 72,
    "uniqueJudgmentIds": 72,
    "uniqueJoinIds": 72,
    "statusCounts": {
      "served": 72
    }
  },
  "controls": {
    "duplicateMissingIdRejected": true,
    "servedAnswerUnattemptedRejected": true,
    "wrongFileReferenceRejected": true,
    "relativeAbsoluteReferenceAgreement": true,
    "absentRowMarkedServedRejected": true,
    "absentRowReplyRejected": true,
    "absentRowActionsRejected": true,
    "statusControlSource": "synthetic objects outside the measured population",
    "syntheticAbsentPositiveControl": true,
    "completionControls": [
      "failed:pass",
      "failed:ambiguous",
      "unattempted:pass",
      "unattempted:ambiguous"
    ],
    "actionControls": [
      "served:systemTool",
      "failed:systemTool",
      "served:listedTool",
      "failed:listedTool"
    ]
  }
}
```

### Boundary stdout

```json
{
  "validated": true,
  "population": {
    "packet": 72,
    "judgments": 72
  },
  "scenarioReferences": 490,
  "packetReferences": 332,
  "seedReferences": 253,
  "nestedSeedReferences": 253,
  "controls": {
    "nestedBoundaryControlRejected": true,
    "servedAnswerControlRejected": true,
    "wrongFileControlRejected": true,
    "referenceFormsAgree": true
  },
  "hashes": {
    "tmp/units/aggregate-development-blind-packet-successor-b/packet.json": "a61415997d2810b90d07626d753eb48ec3ab12ea331bd19cc66b13ae1bdb6df4",
    "tmp/units/aggregate-successor-quality-b-judgments.json": "9405d9bd6ae081c59d69e8de8936456004e10372bf93d0563faf090723b15fcd",
    ".orkestrel/agent/instruments/harness/bench/variants/long/v1.json": "24efde87208498722a7b25a69cb98ff12552da6379af0c6972144dbd63bf170b"
  },
  "addendum": "tmp/units/aggregate-successor-quality-b-boundary-addendum.md"
}
```

The standalone [join stdout capture](tmp/units/aggregate-successor-quality-b-join.stdout.txt:1) and [boundary stdout capture](tmp/units/aggregate-successor-quality-b-boundary.stdout.txt:1) contain the complete terminal outputs. The [join result files](tmp/units/aggregate-successor-quality-b-joined.md:1), [join validation](tmp/units/aggregate-successor-quality-b-join-validation.md:27), and [boundary addendum](tmp/units/aggregate-successor-quality-b-boundary-addendum.md:11) preserve the validated measurements and controls.
