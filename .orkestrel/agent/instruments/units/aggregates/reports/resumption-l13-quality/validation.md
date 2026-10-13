# L13 quality join validation

The l13 checker accepted 72 unique judgments, packet IDs, and private join IDs. The duplicate/missing-ID control and the served-answer semantic-unattempted control were both rejected. Sealed judgment and packet hashes matched; per-goal verdicts and reasons were copied unchanged.

## Evidence hashes

- `tmp/units/aggregate-development-blind-packet-l13-combined/packet.json`: 01f28cdafe52cb531a7fa9aa063e7dded9f2155c8756bfe40ef7de5384fb6b2e
- `tmp/units/aggregate-l13-blind-quality-judgments.json`: 92313a8faf324e4b263bce2fcef7d0bfedda00848e3628e4edc7242dfe570fef
- `tmp/units/aggregate-development-blind-packet-l13-combined/private/joins.json`: 38445c645dbb063d6eafd38b281179b3642369a55a9f1efdc0702139315ab38f
- `.orkestrel/agent/instruments/harness/bench/variants/long/v1.json`: 24efde87208498722a7b25a69cb98ff12552da6379af0c6972144dbd63bf170b
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\harness\bench\variants\long\v1.json`: 24efde87208498722a7b25a69cb98ff12552da6379af0c6972144dbd63bf170b
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\results\l13\q2-think0\records\run\run.json`: 08a049d681f74b5c3b440872fffc3eb9199c8cb65330f2c3d1b76a25e27bd2c0
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\results\l13\q2-think0\records\run\rows.jsonl`: cdb5dcf7fd5473600905f9583806f0f7cf573b7819c7c1c332c951ecd13c237f
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\results\l13\q2-think0\records\run\messages.jsonl`: 86d375ec38d5785922393217be386f4b2125cc0bb6ba60e40aaa8b61bb1c345c
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\results\l13\q2-think0\aggregate\run\run.json`: 3a46074194d216636f1442978946e5015cc01a2b35f86abecc38264559614aac
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\results\l13\q2-think0\aggregate\run\rows.jsonl`: f42e3de0f6704a1e085a51a53e8984d8ae4e59558c2415ae9d1bcaf0af9430c6
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\results\l13\q2-think0\aggregate\run\messages.jsonl`: 5fc66f5a84006dec38c9b4708ea6f823864289fda74fa391e9adce46de45c4d1
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\results\l13\q2-think0\full\run\run.json`: 6fa3b055125446363c2c94b71110ef20461b1c18d8de3be7f92ce9ca9838421a
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\results\l13\q2-think0\full\run\rows.jsonl`: 9b4191a7369adadcbeb83181231d89c72e6d4a7b069a9dba8346fe2103d1fce8
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\results\l13\q2-think0\full\run\messages.jsonl`: 23a4f244587cb13aca2576e13cff263ed817baca35921e6c2d77e47ec0af9c68

## Output hashes

- `tmp/units/aggregate-l13-quality-joined.json`: c51ebcf820e3d6386599ef278e6820ea00b0712e73f6d68654b04ed8b48b9abd
- `tmp/units/aggregate-l13-quality-report.md`: f79512baa68400535902b3cf45ab1a463bd895e4131aae3aca567adbfc9cb789

## Totals

```json
{
  "armCounts": {
    "aggregate": {
      "semantic": {
        "pass": 10,
        "fail": 13,
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
        "pass": 19,
        "fail": 5,
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
    "full": {
      "semantic": {
        "pass": 7,
        "fail": 16,
        "ambiguous": 0,
        "unattempted": 1
      },
      "systemTool": {
        "pass": 7,
        "fail": 17,
        "ambiguous": 0,
        "unattempted": 0
      },
      "listedTool": {
        "pass": 20,
        "fail": 4,
        "ambiguous": 0,
        "unattempted": 0
      },
      "completeWork": {
        "pass": 4,
        "fail": 20,
        "ambiguous": 0,
        "unattempted": 0
      }
    },
    "records": {
      "semantic": {
        "pass": 12,
        "fail": 11,
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
        "fail": 20,
        "ambiguous": 1,
        "unattempted": 0
      }
    }
  },
  "adjustedArmCounts": {
    "aggregate": {
      "semantic": {
        "pass": 10,
        "fail": 13,
        "ambiguous": 0,
        "unattempted": 0
      },
      "systemTool": {
        "pass": 4,
        "fail": 19,
        "ambiguous": 0,
        "unattempted": 0
      },
      "listedTool": {
        "pass": 18,
        "fail": 5,
        "ambiguous": 0,
        "unattempted": 0
      },
      "completeWork": {
        "pass": 4,
        "fail": 19,
        "ambiguous": 0,
        "unattempted": 0
      }
    },
    "full": {
      "semantic": {
        "pass": 7,
        "fail": 15,
        "ambiguous": 0,
        "unattempted": 1
      },
      "systemTool": {
        "pass": 6,
        "fail": 17,
        "ambiguous": 0,
        "unattempted": 0
      },
      "listedTool": {
        "pass": 19,
        "fail": 4,
        "ambiguous": 0,
        "unattempted": 0
      },
      "completeWork": {
        "pass": 4,
        "fail": 19,
        "ambiguous": 0,
        "unattempted": 0
      }
    },
    "records": {
      "semantic": {
        "pass": 12,
        "fail": 11,
        "ambiguous": 0,
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
    }
  }
}
```
