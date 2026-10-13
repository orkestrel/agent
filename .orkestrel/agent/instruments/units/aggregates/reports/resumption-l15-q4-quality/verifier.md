# Sealed successor quality validation

The sealed join and boundary readers completed successfully against packet `6d10d40bc303dc09c4db2d643fbc913cafe647899e070703a7856db9a7641745` and judgments `83c4dea97eaffd9a9dac1a5b9377f516f543f03f7b1abef54453270ddc79eeb2`. Both sealed reader copies match their prepared originals after replacing only the two pending hash literals. Join exited 0 in 182 ms; boundary exited 0 in 156 ms. Evidence: `tmp/units/aggregate-successor-quality-a-join-sealed.ts:9`, `tmp/units/aggregate-successor-quality-a-boundary-sealed.ts:8`, `tmp/units/aggregate-successor-quality-a-validation-join.meta.json:1`, `tmp/units/aggregate-successor-quality-a-validation-boundary.meta.json:1`.

The join retained 72 served rows, with 72 unique packet IDs, judgment IDs, and private join IDs. Raw and adjusted verdict counts below use pass/fail/ambiguous/unattempted order; the adjusted values preserve the disclosed `g06` denominator adjustment. These are copied measurements only, with no comparative interpretation.

| Arm | Axis | Raw counts | Adjusted counts |
| --- | --- | --- | --- |
| records | semantic | 18/5/1/0 | 18/4/1/0 |
| records | systemTool | 4/20/0/0 | 3/20/0/0 |
| records | listedTool | 18/6/0/0 | 17/6/0/0 |
| records | completeWork | 3/21/0/0 | 3/20/0/0 |
| aggregate | semantic | 17/6/1/0 | 17/5/1/0 |
| aggregate | systemTool | 4/20/0/0 | 3/20/0/0 |
| aggregate | listedTool | 18/6/0/0 | 17/6/0/0 |
| aggregate | completeWork | 3/21/0/0 | 3/20/0/0 |
| full | semantic | 16/7/1/0 | 16/6/1/0 |
| full | systemTool | 5/19/0/0 | 4/19/0/0 |
| full | listedTool | 17/7/0/0 | 16/7/0/0 |
| full | completeWork | 2/21/0/0 | 2/20/1/0 |

The join controls reported duplicate/missing-ID rejection, served-answer rejection, wrong-file-reference rejection, relative/absolute reference agreement, absent-row served/reply/actions rejection, and the synthetic absent-row positive control as true. Completion controls exercised `failed:pass`, `failed:ambiguous`, `unattempted:pass`, and `unattempted:ambiguous`. Action controls exercised served and failed statuses for both systemTool and listedTool. Synthetic control objects stayed outside the measured population. Evidence: `tmp/units/aggregate-successor-quality-a-validation-join.stdout.txt:26`, `tmp/units/aggregate-successor-quality-a-validation-join.stdout.txt:186`, `tmp/units/aggregate-successor-quality-a-validation-join.stdout.txt:195`, `tmp/units/aggregate-successor-quality-a-join-sealed.ts:229`.

The boundary checker validated 72 packet and judgment entries, 573 scenario references, 329 packet references, 327 seed references, and 0 nested seed references. Nested-boundary, served-answer, and wrong-file controls were rejected, and reference forms agreed. Evidence: `tmp/units/aggregate-successor-quality-a-validation-boundary.stdout.txt:2`, `tmp/units/aggregate-successor-quality-a-validation-boundary.stdout.txt:3`, `tmp/units/aggregate-successor-quality-a-validation-boundary.stdout.txt:7`, `tmp/units/aggregate-successor-quality-a-validation-boundary.stdout.txt:11`.

The join command was `node tmp/units/aggregate-successor-quality-a-join-sealed.ts`; its complete stdout and stderr are retained at `tmp/units/aggregate-successor-quality-a-validation-join.stdout.txt:1` and `tmp/units/aggregate-successor-quality-a-validation-join.stderr.txt` (zero bytes; see `tmp/units/aggregate-successor-quality-a-validation-join.meta.json:1`). Stdout SHA256 is `65013e307541274136eb9584c1c5818c9262bda0a0241cdbba9e4b8339682c27b`; stderr is empty with SHA256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`. The boundary command was `node tmp/units/aggregate-successor-quality-a-boundary-sealed.ts`; its complete stdout and stderr are retained at `tmp/units/aggregate-successor-quality-a-validation-boundary.stdout.txt:1` and `tmp/units/aggregate-successor-quality-a-validation-boundary.stderr.txt` (zero bytes; see `tmp/units/aggregate-successor-quality-a-validation-boundary.meta.json:1`). Stdout SHA256 is `a2803dde8ab7ce4f7517dabf622f152e2dc260098e8a4ed163b16a9c742f3ff0`; stderr is empty with SHA256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`. Metadata files contain exact argv, exits, and durations.

The sealed join reader SHA256 is `b09855374f107f1daf45c0b1a2cb61e151bb0a0c2063d5fba64ebd73a7b86d8b`; the sealed boundary reader SHA256 is `fc8f1fd957360026a709ca6ff6d40049e09f2c4253a64c8a4b967fc0b30cf55e`. Outputs are `tmp/units/aggregate-successor-quality-a-joined.json` SHA256 `91105db2eb3278df282f103350d0f4c27d23eaf4d2d05aa18c8dabd3bf337f1b`, `tmp/units/aggregate-successor-quality-a-joined.md` SHA256 `c998e9e38dc4f3619f91d8f105e25c4168ef44e9ea59a18352217939a460891d`, `tmp/units/aggregate-successor-quality-a-join-validation.md` SHA256 `39c3b1a0c64b1ca89f91486d7ea8a72bfecf7d35198540ab247bbe64b55c435b`, and `tmp/units/aggregate-successor-quality-a-boundary-addendum.md` SHA256 `409273c727c2756037e1eba3937f2036e5660fb7ec40cca243f6f2a227217380`.

The combined offline validation duration was 338 ms. No judgment or source/build/HEAD artifact was changed, and no GPU, service, or model call occurred.

