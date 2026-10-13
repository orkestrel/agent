# L14 alias b quality join validation

The l14-b checker accepted 72 unique judgments, packet IDs, private join IDs, and all planned status rows. The missing-ID, served-answer, wrong-file, absent-row status/reply/actions, completion, and served/failed action-axis controls were rejected by their checking paths. The sealed absent-row positive control retained all four verdicts. Relative and absolute references resolved to the same sealed files; per-goal verdicts and reasons were copied unchanged.

## Evidence hashes

- `tmp/units/aggregate-development-blind-packet-l14-b/packet.json`: 14b3d53e58eeb7dac1f975c6160974df0a133b6ae8a0cb76a0558c6e73ebfef7
- `tmp/units/aggregate-final-blind-b-judgments.json`: 237856cc30584657963c71c5fb3ec89636a6b7e05ce1bdb632e39d38b783f1a7
- `tmp/units/aggregate-development-blind-packet-l14-b/private/joins.json`: cc1ef80f9f5bed19ae84956195e0accae726a5ad05a645ae4e5a1f278900b69d
- `.orkestrel/agent/instruments/harness/bench/variants/long/v1.json`: 24efde87208498722a7b25a69cb98ff12552da6379af0c6972144dbd63bf170b
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\harness\bench\variants\long\v1.json`: 24efde87208498722a7b25a69cb98ff12552da6379af0c6972144dbd63bf170b
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\results\l14\q4-think0\resource\reserve-512\l6-q4-think0-records-v1\run.json`: c8bde801e9c1b955e0b4e57fabe23e0b61bcaad799a94240dfbc3d4c15fd43b2
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\results\l14\q4-think0\resource\reserve-512\l6-q4-think0-records-v1\rows.jsonl`: 1ff7bf22a33f95cf97b3b3c2661759a68bf2ba49260e3a48543ecd3ff1b6215e
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\results\l14\q4-think0\resource\reserve-512\l6-q4-think0-records-v1\messages.jsonl`: 22bcda062b3b4743a455aefdbda902151d54b9ab10e65f1725178c5ccbbb53e6
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\results\l14\q4-think0\pilot\development\l6-q4-think0-aggregate-v1\run.json`: da17e7de346ffd7fe0a021e89e1a0c4fa477d46cd66926f030d9ba99358c25d9
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\results\l14\q4-think0\pilot\development\l6-q4-think0-aggregate-v1\rows.jsonl`: 0eb9f3709243a321dd45f4e8a71aef041c284158e32a9c85b89306f37ad15bb4
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\results\l14\q4-think0\pilot\development\l6-q4-think0-aggregate-v1\messages.jsonl`: 7c29261778c173c783f1505a26f1d35cc41cee5fd96137b809a59d3cc1cf0d84
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\results\l14\q4-think0\full\preflight\l6-q4-think0-full-v1\run.json`: 8e20d6b79e023badb91eecca08f3cee7d3c7e2ca160b0ada84bc08590ca2b0e0
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\results\l14\q4-think0\full\preflight\l6-q4-think0-full-v1\rows.jsonl`: 16896fd53beafd0ed835ffb19c108782c86aad695ca88d743b2bc010a6a377c7
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\results\l14\q4-think0\full\preflight\l6-q4-think0-full-v1\messages.jsonl`: 04cd5b3fdf6e8b4fe70ea3095e8739a7a2deddd35b2440ccf4ed6074e551bfa6

## Output hashes

- `tmp/units/aggregate-l14-b-quality-joined-3.json`: b2ac484bd438daf884eb37f8de6a9b164cf6c096e1fccb0ee3f15f45d6fecd29
- `tmp/units/aggregate-l14-b-quality-report-3.md`: c259d7b1b9f8441ee57fa515512cd9367206280a5c9dbb702ab3237ebd0df8b8

## Totals

```json
{
  "statusCounts": {
    "served": 70,
    "failed": 1,
    "unattempted": 1
  },
  "armCounts": {
    "records": {
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
    "aggregate": {
      "semantic": {
        "pass": 13,
        "fail": 9,
        "ambiguous": 2,
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
        "fail": 5,
        "ambiguous": 1,
        "unattempted": 2
      },
      "systemTool": {
        "pass": 5,
        "fail": 18,
        "ambiguous": 0,
        "unattempted": 1
      },
      "listedTool": {
        "pass": 15,
        "fail": 8,
        "ambiguous": 0,
        "unattempted": 1
      },
      "completeWork": {
        "pass": 3,
        "fail": 21,
        "ambiguous": 0,
        "unattempted": 0
      }
    }
  },
  "adjustedArmCounts": {
    "records": {
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
    "aggregate": {
      "semantic": {
        "pass": 13,
        "fail": 8,
        "ambiguous": 2,
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
        "fail": 4,
        "ambiguous": 1,
        "unattempted": 2
      },
      "systemTool": {
        "pass": 4,
        "fail": 18,
        "ambiguous": 0,
        "unattempted": 1
      },
      "listedTool": {
        "pass": 14,
        "fail": 8,
        "ambiguous": 0,
        "unattempted": 1
      },
      "completeWork": {
        "pass": 3,
        "fail": 20,
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
    "sealedAbsentPositiveControl": true,
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
