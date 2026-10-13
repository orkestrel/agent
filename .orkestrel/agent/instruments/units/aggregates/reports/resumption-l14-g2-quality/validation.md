# L14 alias a quality join validation

The l14-a checker accepted 72 unique judgments, packet IDs, and private join IDs. The duplicate/missing-ID control and the served-answer semantic-unattempted control were both rejected. Sealed judgment and packet hashes matched; per-goal verdicts and reasons were copied unchanged.

## Evidence hashes

- `tmp/units/aggregate-development-blind-packet-l14-a/packet.json`: c07aa6696eba4d7ff551c0c66f27057e8491704a85095e244ee7be9c0d7ba190
- `tmp/units/aggregate-final-blind-a-judgments.json`: df1a3315a1ff8bf5fae6a793b0ca63427cef494528fd1f2604297953ce5cdf32
- `tmp/units/aggregate-development-blind-packet-l14-a/private/joins.json`: 120b23ac54a8d690ca0138e7548929c5ebbb590815b33bf726fffe22bef3e06d
- `.orkestrel/agent/instruments/harness/bench/variants/long/v1.json`: 24efde87208498722a7b25a69cb98ff12552da6379af0c6972144dbd63bf170b
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\harness\bench\variants\long\v1.json`: 24efde87208498722a7b25a69cb98ff12552da6379af0c6972144dbd63bf170b
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\results\l14\g2-think0\resource\reserve-512\l6-g2-think0-records-v1\run.json`: 95a8827c03d20fe08427542a0d315630a73b9ace202ce2ed6a1fc15b305a23e9
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\results\l14\g2-think0\resource\reserve-512\l6-g2-think0-records-v1\rows.jsonl`: 898ea3238ed459412508f9e252f6539398776f2077ad8689c8e709f31af83607
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\results\l14\g2-think0\resource\reserve-512\l6-g2-think0-records-v1\messages.jsonl`: 2c890c8bc0b69812b3a4a3f2cec529ff4bac11ed206ffd2bd19dda743688ac4e
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\results\l14\g2-think0\pilot\development\l6-g2-think0-aggregate-v1\run.json`: 50b78ecf590d206d227d127b9c5a0ee61a9e179752dee14fe4f63d05c64166b8
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\results\l14\g2-think0\pilot\development\l6-g2-think0-aggregate-v1\rows.jsonl`: bda38223d84765e7bc60ba9fb70483d3bd4cf0d027c2f13db17ad4866996f0b2
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\results\l14\g2-think0\pilot\development\l6-g2-think0-aggregate-v1\messages.jsonl`: 2e346a05e9ff2e510651192407ac79e8cc29ad3772294b783f4790a9dd4b4cd5
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\results\l14\g2-think0\full\preflight\l6-g2-think0-full-v1\run.json`: 0da26e1eca34915879c4c771f351881c23a79179a4fcc345e129a46e083ee0a4
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\results\l14\g2-think0\full\preflight\l6-g2-think0-full-v1\rows.jsonl`: 01d4b55dda290911ee6eddc50353a56124feda36526b463918d15a7d4577caa9
- `C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent\instruments\results\l14\g2-think0\full\preflight\l6-g2-think0-full-v1\messages.jsonl`: 5128ff3b55487246e3c32ce761764256808a859e4f56f7a2fa56489d0f0c59f7

## Output hashes

- `tmp/units/aggregate-l14-a-quality-joined.json`: ccd26887ca3c8b4123b1346332e3a53c1bcb67823729a3d1f85e01821d83ad17
- `tmp/units/aggregate-l14-a-quality-report.md`: 9ce5c2acd8493e91b5b91cd39b9c73b11b4011742627d5e7353ab9dc6d73f503

## Totals

```json
{
  "armCounts": {
    "full": {
      "semantic": {
        "pass": 14,
        "fail": 8,
        "ambiguous": 2,
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
    },
    "records": {
      "semantic": {
        "pass": 15,
        "fail": 8,
        "ambiguous": 1,
        "unattempted": 0
      },
      "systemTool": {
        "pass": 6,
        "fail": 18,
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
        "fail": 10,
        "ambiguous": 1,
        "unattempted": 0
      },
      "systemTool": {
        "pass": 6,
        "fail": 18,
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
        "pass": 14,
        "fail": 7,
        "ambiguous": 2,
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
    },
    "records": {
      "semantic": {
        "pass": 15,
        "fail": 7,
        "ambiguous": 1,
        "unattempted": 0
      },
      "systemTool": {
        "pass": 5,
        "fail": 18,
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
        "fail": 9,
        "ambiguous": 1,
        "unattempted": 0
      },
      "systemTool": {
        "pass": 5,
        "fail": 18,
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
        "pass": 2,
        "fail": 21,
        "ambiguous": 0,
        "unattempted": 0
      }
    }
  }
}
```
