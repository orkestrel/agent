# Successor alias b quality join validation

The successor-b checker accepted 72 unique judgments, packet IDs, private join IDs, and all planned status rows. The missing-ID, served-answer, and wrong-file controls were rejected by their checking paths. Synthetic objects outside the measured population exercised absent-row status/reply/actions, completion, and served/failed action-axis rejection. The synthetic absent-row positive control retained all four verdicts. Relative and absolute references resolved to the same sealed files; per-goal verdicts and reasons were copied unchanged.

## Evidence hashes

- `tmp/units/aggregate-development-blind-packet-successor-b/packet.json`: a61415997d2810b90d07626d753eb48ec3ab12ea331bd19cc66b13ae1bdb6df4
- `tmp/units/aggregate-successor-quality-b-judgments.json`: 9405d9bd6ae081c59d69e8de8936456004e10372bf93d0563faf090723b15fcd
- `tmp/units/aggregate-development-blind-packet-successor-b/private/joins.json`: c23252eb5256708ee698fcb1c7915953f244c401009b6a0ac4aafbe1ab28c468
- `.orkestrel/agent/instruments/harness/bench/variants/long/v1.json`: 24efde87208498722a7b25a69cb98ff12552da6379af0c6972144dbd63bf170b
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\harness\bench\variants\long\v1.json`: 24efde87208498722a7b25a69cb98ff12552da6379af0c6972144dbd63bf170b
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\results\l15\q4-think1\resource\reserve-1024\l6-q4-think1-records-v1\run.json`: 992286fcf948ffbc3e73f0998a52e0423a67359630c4caae3e93bacf2898acff
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\results\l15\q4-think1\resource\reserve-1024\l6-q4-think1-records-v1\rows.jsonl`: 5416ebb5b5580d648e9828cfad0bb381f2e03e3d4c2f10a4aa23d617019ca2ca
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\results\l15\q4-think1\resource\reserve-1024\l6-q4-think1-records-v1\messages.jsonl`: 05d14e42141d6128c1bd07786cdda59f9e2ea92ba82f2b1cb38b39a76838a3d1
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\results\l15\q4-think1\pilot\development\l6-q4-think1-aggregate-v1\run.json`: fd05ff7397fbb483cf307eb6e9e7fe2b932f5db2dc19ca1f06db5f4c229cfdf6
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\results\l15\q4-think1\pilot\development\l6-q4-think1-aggregate-v1\rows.jsonl`: 9560f894ea98c842ec09060a90d6a892158cf4f97c8036f6d5b9b1a4c37d5cb7
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\results\l15\q4-think1\pilot\development\l6-q4-think1-aggregate-v1\messages.jsonl`: 7553a974e07480d10172d74247b1e6b427a999c810c01211be6fd4dd42198af3
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\results\l15\q4-think1\full\preflight\l6-q4-think1-full-v1\run.json`: 3ee23e486ea3b2a0a93b58bf74a1969a88a5c3b97c16e5c85c0fb876dfc42063
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\results\l15\q4-think1\full\preflight\l6-q4-think1-full-v1\rows.jsonl`: cadcd0939d821f84f7441cd1eade02e9e13b67fc7c9f7ca69d2082b31a4eefa0
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\results\l15\q4-think1\full\preflight\l6-q4-think1-full-v1\messages.jsonl`: 3f0a7f1e2bf24e4abc0f5b049c95ae16287c5e970d9d589c0d0c176b290bd71a

## Output hashes

- `tmp/units/aggregate-successor-quality-b-joined.json`: e975e2c539cc3d9379bd56c279d3cf42d07957afa63d2d57ac5a430d5f61062f
- `tmp/units/aggregate-successor-quality-b-joined.md`: ec7095873258912212f1c05575df4a9e48a8841386c121d0ff0abf5be33204f6

## Totals

```json
{
  "statusCounts": {
    "served": 72
  },
  "armCounts": {
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
  "adjustedArmCounts": {
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
