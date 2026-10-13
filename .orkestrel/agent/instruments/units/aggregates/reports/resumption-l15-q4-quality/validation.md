# Successor alias a quality join validation

The successor-a checker accepted 72 unique judgments, packet IDs, private join IDs, and all planned status rows. The missing-ID, served-answer, and wrong-file controls were rejected by their checking paths. Synthetic objects outside the measured population exercised absent-row status/reply/actions, completion, and served/failed action-axis rejection. The synthetic absent-row positive control retained all four verdicts. Relative and absolute references resolved to the same sealed files; per-goal verdicts and reasons were copied unchanged.

## Evidence hashes

- `tmp/units/aggregate-development-blind-packet-successor-a/packet.json`: 6d10d40bc303dc09c4db2d643fbc913cafe647899e070703a7856db9a7641745
- `tmp/units/aggregate-successor-quality-a-judgments.json`: 83c4dea97eaffd9a9dac1a5b9377f516f543f03f7b1abef54453270ddc79eeb2
- `tmp/units/aggregate-development-blind-packet-successor-a/private/joins.json`: 9254b82a2417bd56b46bac38851d3c9af36dd5a69a0d27b638f81f369fcd4be3
- `.orkestrel/agent/instruments/harness/bench/variants/long/v1.json`: 24efde87208498722a7b25a69cb98ff12552da6379af0c6972144dbd63bf170b
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\harness\bench\variants\long\v1.json`: 24efde87208498722a7b25a69cb98ff12552da6379af0c6972144dbd63bf170b
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\results\l15\q4-think0\resource\reserve-512\l6-q4-think0-records-v1\run.json`: 34cbe22cb30edaead07a102001fef0aee3d49b8d103249d9b1c5cebd04126ae5
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\results\l15\q4-think0\resource\reserve-512\l6-q4-think0-records-v1\rows.jsonl`: 5b0cc7de6ee1b5c56d8e04259222f5d7af4db13957f7a0aaab600cadeb9baf9e
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\results\l15\q4-think0\resource\reserve-512\l6-q4-think0-records-v1\messages.jsonl`: e501f044ad13598e160e7d2e86fbccfcd70f74db613a26a0ba6273ad7f03e4a1
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\results\l15\q4-think0\pilot\development\l6-q4-think0-aggregate-v1\run.json`: cf1471a9447fc3ae5370c4ed56662df2a167c215c9db1190e485ce610402eba7
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\results\l15\q4-think0\pilot\development\l6-q4-think0-aggregate-v1\rows.jsonl`: f86f968fb03491214096869ea1c509dac6c422b3dfb988b1be458bb30af50ac5
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\results\l15\q4-think0\pilot\development\l6-q4-think0-aggregate-v1\messages.jsonl`: 537c8878fd1047cf0ada345136da99002941aa663ea6802845534f51bd8ad8d6
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\results\l15\q4-think0\full\preflight\l6-q4-think0-full-v1\run.json`: 1b1544de7b516a1ea055620f07a9e62392316ae5516eac302685cc9dfec5f8a6
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\results\l15\q4-think0\full\preflight\l6-q4-think0-full-v1\rows.jsonl`: 676b24d436363cf831a32ba404d872a63adccf1393cb474c82d42b7494c0539f
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\results\l15\q4-think0\full\preflight\l6-q4-think0-full-v1\messages.jsonl`: b54ba732a26bcc63e9818a8e7a0d17d9cbb9e3849e214089273d2001b568cae2

## Output hashes

- `tmp/units/aggregate-successor-quality-a-joined.json`: 91105db2eb3278df282f103350d0f4c27d23eaf4d2d05aa18c8dabd3bf337f1b
- `tmp/units/aggregate-successor-quality-a-joined.md`: c998e9e38dc4f3619f91d8f105e25c4168ef44e9ea59a18352217939a460891d

## Totals

```json
{
  "statusCounts": {
    "served": 72
  },
  "armCounts": {
    "records": {
      "semantic": {
        "pass": 18,
        "fail": 5,
        "ambiguous": 1,
        "unattempted": 0
      },
      "systemTool": {
        "pass": 4,
        "fail": 20,
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
        "pass": 3,
        "fail": 21,
        "ambiguous": 0,
        "unattempted": 0
      }
    },
    "aggregate": {
      "semantic": {
        "pass": 17,
        "fail": 6,
        "ambiguous": 1,
        "unattempted": 0
      },
      "systemTool": {
        "pass": 4,
        "fail": 20,
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
        "pass": 3,
        "fail": 21,
        "ambiguous": 0,
        "unattempted": 0
      }
    },
    "full": {
      "semantic": {
        "pass": 16,
        "fail": 7,
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
        "fail": 21,
        "ambiguous": 1,
        "unattempted": 0
      }
    }
  },
  "adjustedArmCounts": {
    "records": {
      "semantic": {
        "pass": 18,
        "fail": 4,
        "ambiguous": 1,
        "unattempted": 0
      },
      "systemTool": {
        "pass": 3,
        "fail": 20,
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
        "pass": 3,
        "fail": 20,
        "ambiguous": 0,
        "unattempted": 0
      }
    },
    "aggregate": {
      "semantic": {
        "pass": 17,
        "fail": 5,
        "ambiguous": 1,
        "unattempted": 0
      },
      "systemTool": {
        "pass": 3,
        "fail": 20,
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
        "pass": 3,
        "fail": 20,
        "ambiguous": 0,
        "unattempted": 0
      }
    },
    "full": {
      "semantic": {
        "pass": 16,
        "fail": 6,
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
        "fail": 20,
        "ambiguous": 1,
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
