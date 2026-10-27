# U45: strip every boost experiment that is not a fix before 0.0.32

On 2026-10-27 the user set the release order:
1. Agent 0.0.32, with the experiments stripped.
2. Study 0.0.5, after Study takes Agent 0.0.32.
3. Agent's devDependency on Study moves to ^0.0.5, with no further Agent release.
4. Keep the bench code and clear the scratch.

On the strip scope the user ruled: "Strip everything not meant to be part of our implementation for 0.0.32, if it's only claim to remain is that it is part of R2 and any unimplemented or necessary thing, then it has no place, we need to get rid of bloat … anything that was part of the boost experiment that is not a fix needs to be removed."

**Product target.** `src/` equals published 0.0.31 (`df795dc7`) plus only two fixes:
- D2, equal-member owner records collapse (`bf854029`);
- D1, the stale-marking preservation with deterministic, repeatable amendment references (`6702f633`, `dd300e48`), ported onto the 0.0.31 code.

Removed: the selection receipt (`45489cea`), lexical BM25 selection and ranked recall with D3, recent history with pins, earlier work with names, the owner-link option (already removed), and every constant, helper, type and guide passage they added.

**Bench target.** Remove everything that exists only for the experiments:
- the R2 screen (archived in `44cea048`);
- the D1 sentence-calibration study `studies/sentences`, whose approach was rejected;
- the treatment groups and prototype wiring;
- the receipt and differential readers;
- the U21 recording studies.

Keep only what the remaining studies need to run on published Study ^0.0.4 (and ^0.0.5 later). Never read or change `studies/endurance/sources/private/`. Git history is the archive. Supersedes U43 (R2 is closed with the strip) and the bench half of U44's "keep the code".