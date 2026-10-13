# Scoring fields changed from tmp/bench/scenario.json.pre-negation to tmp/bench/scenario.json

## g01-luis-refund-amount forbiddenPatterns

Before:

```json
[
 "(?<!\\b(?:not|no|no longer|instead of|rather than|corrected from|replaced|replacing|was|formerly|old|superseded|withdrawn|dead|retired)\\s+(?:(?:a|an|the)\\s+)?[(\"'“]?\\$?)(?<![\\w.])\\$?245\\.65(?!\\d)(?![)\"'”]?,?\\s+(?:was replaced|is dead|is retired|expired|withdrawn|scrapped|no longer applies|is not kept|does not count)\\b)",
 "(?<!\\b(?:not|no|no longer|instead of|rather than|corrected from|replaced|replacing|was|formerly|old|superseded|withdrawn|dead|retired)\\s+(?:(?:a|an|the)\\s+)?[(\"'“]?\\$?)(?<![\\w.])\\$?43\\.35(?!\\d)(?![)\"'”]?,?\\s+(?:was replaced|is dead|is retired|expired|withdrawn|scrapped|no longer applies|is not kept|does not count)\\b)"
]
```

After:

```json
[
 "(?<!\\b(?:not|no|no longer|instead of|rather than|corrected from|replaced|replaces|replacing|was|formerly|outdated|incorrect|wrong|mistaken|transposed|superseded|withdrawn|dead|retired)\\s+(?:(?:a|an|the)\\s+)?(?:(?:earlier|previous|prior|old)\\s+)?(?:(?:manager\\s+)?approval\\s+)?(?:(?:code|ticket|number|refund|credit|amount|figure|total)\\s+){0,2}(?:of\\s+)?[(\"'“]?\\$?)(?<!\\bold\\s+(?:(?:a|an|the)\\s+)?[(\"'“]?\\$?)(?<![\\w.])\\$?245\\.65(?!\\d)(?![)\"'”]?,?\\s+(?:was replaced|is dead|is retired|expired|withdrawn|scrapped|no longer applies|is not kept|does not count)\\b)",
 "(?<!\\b(?:not|no|no longer|instead of|rather than|corrected from|replaced|replaces|replacing|was|formerly|outdated|incorrect|wrong|mistaken|transposed|superseded|withdrawn|dead|retired)\\s+(?:(?:a|an|the)\\s+)?(?:(?:earlier|previous|prior|old)\\s+)?(?:(?:manager\\s+)?approval\\s+)?(?:(?:code|ticket|number|refund|credit|amount|figure|total)\\s+){0,2}(?:of\\s+)?[(\"'“]?\\$?)(?<!\\bold\\s+(?:(?:a|an|the)\\s+)?[(\"'“]?\\$?)(?<![\\w.])\\$?43\\.35(?!\\d)(?![)\"'”]?,?\\s+(?:was replaced|is dead|is retired|expired|withdrawn|scrapped|no longer applies|is not kept|does not count)\\b)"
]
```

## g02-luis-card forbiddenPatterns

Before:

```json
null
```

After:

```json
[]
```

## g03-grace-escalation forbiddenPatterns

Before:

```json
[
 "(?<!\\b(?:withdrawn|withdrew|withdraw|scrapped|scrap|removed|waived|dropped|eliminated|cancell?ed|rescinded|retired|lifted|no longer|not|no|without)\\b[^.\\n]*)\\b\\d+(?:\\.\\d+)?\\s*(?:%|percent|per cent)\\s+restocking(?![^.\\n]*\\b(?:withdrawn|withdrew|withdraw|scrapped|scrap|removed|waived|dropped|eliminated|cancell?ed|rescinded|retired|lifted|no longer|not|no|without)\\b)",
 "restocking fees?\\s*\\(if applicable\\)",
 "(?<!\\b(?:withdrawn|withdrew|withdraw|scrapped|scrap|removed|waived|dropped|eliminated|cancell?ed|rescinded|retired|lifted|no longer|not|no|without)\\b[^.\\n]*)\\bsubject to\\b[^.\\n]{0,40}?\\brestocking(?![^.\\n]*\\b(?:withdrawn|withdrew|withdraw|scrapped|scrap|removed|waived|dropped|eliminated|cancell?ed|rescinded|retired|lifted|no longer|not|no|without)\\b)",
 "(?<!\\b(?:withdrawn|withdrew|withdraw|scrapped|scrap|removed|waived|dropped|eliminated|cancell?ed|rescinded|retired|lifted|no longer|not|no|without)\\b[^.\\n]*)\\brestocking fees?\\s+(?:applies|apply|will apply|is applied|will be applied|is deducted|will be deducted)\\b(?![^.\\n]*\\b(?:withdrawn|withdrew|withdraw|scrapped|scrap|removed|waived|dropped|eliminated|cancell?ed|rescinded|retired|lifted|no longer|not|no|without)\\b)",
 "(?<!\\b(?:withdrawn|withdrew|withdraw|scrapped|scrap|removed|waived|dropped|eliminated|cancell?ed|rescinded|retired|lifted|no longer|not|no|without)\\b[^.\\n]*)\\brestocking fees? of\\b(?![^.\\n]*\\b(?:withdrawn|withdrew|withdraw|scrapped|scrap|removed|waived|dropped|eliminated|cancell?ed|rescinded|retired|lifted|no longer|not|no|without)\\b)",
 "^(?![\\s\\S]*(?:\\bmarcus\\b(?:\\s+oyelaran\\b)?(?:'s)?(?:\\s*\\([^()\\n]*\\))?(?:,\\s*[^,.;\\n]{1,40},)?(?:\\s*[-–—])?\\s+(?:(?:must|will|needs?\\s+to|has\\s+to|is\\s+to|to|shall|should)\\s+)?(?:sign|approv)|\\b(?:sign(?:s|ed|ing)?(?:[-\\s]?offs?)?|approv\\w*|signature)(?:\\s+(?:is\\s+)?required)?\\s*(?:[:¦]|\\bby\\b|\\bfrom\\b)\\s*(?:(?!(?:and|or)\\b)[\\w'-]+\\s+){0,2}marcus\\b))",
 "(?<!\\b(?:not|no|no longer|instead of|rather than|corrected from|replaced|replaces|replacing|was|formerly|old|previous|prior|superseded|withdrawn|dead|retired)\\s+(?:(?:a|an|the)\\s+)?(?:(?:manager\\s+)?approval\\s+)?(?:(?:code|ticket|number)\\s+)?[(\"'“]?\\$?)\\besc-2291\\b(?![)\"'”]?,?\\s+(?:(?:is|was|has been|had been|got)\\s+(?:replaced|superseded)|(?:replaced|superseded)\\s+by|(?:(?:is|was|has been|had been)\\s+)?(?:dead|retired|expired|withdrawn|scrapped|invalid|obsolete|no longer (?:valid|applies|in use|used|active|current))|is not kept|does not count)\\b)(?!\\s*\\(\\s*(?:now\\s+)?(?:(?:replaced|superseded)\\s+by\\b|(?:dead|retired|expired|withdrawn|scrapped|invalid|obsolete|old|previous|prior|no longer)\\b(?!\\s+(?:[\\w'-]+\\s+){0,2}[(\"'“]?[a-z]{2,4}-\\d)))",
 "(?<!\\b(?:not|no|no longer|instead of|rather than|corrected from|replaced|replaces|replacing|was|formerly|old|previous|prior|superseded|withdrawn|dead|retired)\\s+(?:(?:a|an|the)\\s+)?(?:(?:manager\\s+)?approval\\s+)?(?:(?:code|ticket|number)\\s+)?[(\"'“]?\\$?)\\bmx-4471\\b(?![)\"'”]?,?\\s+(?:(?:is|was|has been|had been|got)\\s+(?:replaced|superseded)|(?:replaced|superseded)\\s+by|(?:(?:is|was|has been|had been)\\s+)?(?:dead|retired|expired|withdrawn|scrapped|invalid|obsolete|no longer (?:valid|applies|in use|used|active|current))|is not kept|does not count)\\b)(?!\\s*\\(\\s*(?:now\\s+)?(?:(?:replaced|superseded)\\s+by\\b|(?:dead|retired|expired|withdrawn|scrapped|invalid|obsolete|old|previous|prior|no longer)\\b(?!\\s+(?:[\\w'-]+\\s+){0,2}[(\"'“]?[a-z]{2,4}-\\d)))"
]
```

After:

```json
[
 "(?<!\\b(?:withdrawn|withdrew|withdraw|scrapped|scrap|removed|waived|dropped|eliminated|cancell?ed|rescinded|retired|lifted|no longer|not|no|without)\\b[^.\\n]*)\\b\\d+(?:\\.\\d+)?\\s*(?:%|percent|per cent)\\s+restocking(?![^.\\n]*\\b(?:withdrawn|withdrew|withdraw|scrapped|scrap|removed|waived|dropped|eliminated|cancell?ed|rescinded|retired|lifted|no longer|not|no|without)\\b)",
 "restocking fees?\\s*\\(if applicable\\)",
 "(?<!\\b(?:withdrawn|withdrew|withdraw|scrapped|scrap|removed|waived|dropped|eliminated|cancell?ed|rescinded|retired|lifted|no longer|not|no|without)\\b[^.\\n]*)\\bsubject to\\b[^.\\n]{0,40}?\\brestocking(?![^.\\n]*\\b(?:withdrawn|withdrew|withdraw|scrapped|scrap|removed|waived|dropped|eliminated|cancell?ed|rescinded|retired|lifted|no longer|not|no|without)\\b)",
 "(?<!\\b(?:withdrawn|withdrew|withdraw|scrapped|scrap|removed|waived|dropped|eliminated|cancell?ed|rescinded|retired|lifted|no longer|not|no|without)\\b[^.\\n]*)\\brestocking fees?\\s+(?:applies|apply|will apply|is applied|will be applied|is deducted|will be deducted)\\b(?![^.\\n]*\\b(?:withdrawn|withdrew|withdraw|scrapped|scrap|removed|waived|dropped|eliminated|cancell?ed|rescinded|retired|lifted|no longer|not|no|without)\\b)",
 "(?<!\\b(?:withdrawn|withdrew|withdraw|scrapped|scrap|removed|waived|dropped|eliminated|cancell?ed|rescinded|retired|lifted|no longer|not|no|without)\\b[^.\\n]*)\\brestocking fees? of\\b(?![^.\\n]*\\b(?:withdrawn|withdrew|withdraw|scrapped|scrap|removed|waived|dropped|eliminated|cancell?ed|rescinded|retired|lifted|no longer|not|no|without)\\b)",
 "^(?![\\s\\S]*(?:\\bmarcus\\b(?:\\s+oyelaran\\b)?(?:'s)?(?:\\s*\\([^()\\n]*\\))?(?:,\\s*[^,.;\\n]{1,40},)?(?:\\s*[-–—])?\\s+(?:(?:must|will|needs?\\s+to|has\\s+to|is\\s+to|to|shall|should)\\s+)?(?:sign|approv)|\\b(?:sign(?:s|ed|ing)?(?:[-\\s]?offs?)?|approv\\w*|signature)(?:\\s+(?:is\\s+)?required)?\\s*(?:[:¦]|\\bby\\b|\\bfrom\\b)\\s*(?:(?!(?:and|or)\\b)[\\w'-]+\\s+){0,2}marcus\\b))",
 "(?<!\\b(?:not|no|no longer|instead of|rather than|corrected from|replaced|replaces|replacing|was|formerly|outdated|incorrect|wrong|mistaken|transposed|superseded|withdrawn|dead|retired)\\s+(?:(?:a|an|the)\\s+)?(?:(?:earlier|previous|prior|old)\\s+)?(?:(?:manager\\s+)?approval\\s+)?(?:(?:code|ticket|number|refund|credit|amount|figure|total)\\s+){0,2}(?:of\\s+)?[(\"'“]?\\$?)(?<!\\b(?:old|previous|prior)\\s+(?:(?:a|an|the)\\s+)?(?:(?:manager\\s+)?approval\\s+)?(?:(?:code|ticket|number)\\s+)?[(\"'“]?\\$?)\\besc-2291\\b(?![)\"'”]?,?\\s+(?:(?:is|was|has been|had been|got)\\s+(?:replaced|superseded)|(?:replaced|superseded)\\s+by|(?:(?:is|was|has been|had been)\\s+)?(?:dead|retired|expired|withdrawn|scrapped|invalid|obsolete|no longer (?:valid|applies|in use|used|active|current))|is not kept|does not count)\\b)(?!\\s*\\(\\s*(?:now\\s+)?(?:(?:replaced|superseded)\\s+by\\b|(?:dead|retired|expired|withdrawn|scrapped|invalid|obsolete|old|previous|prior|no longer)\\b(?!\\s+(?:[\\w'-]+\\s+){0,2}[(\"'“]?[a-z]{2,4}-\\d)))",
 "(?<!\\b(?:not|no|no longer|instead of|rather than|corrected from|replaced|replaces|replacing|was|formerly|outdated|incorrect|wrong|mistaken|transposed|superseded|withdrawn|dead|retired)\\s+(?:(?:a|an|the)\\s+)?(?:(?:earlier|previous|prior|old)\\s+)?(?:(?:manager\\s+)?approval\\s+)?(?:(?:code|ticket|number|refund|credit|amount|figure|total)\\s+){0,2}(?:of\\s+)?[(\"'“]?\\$?)(?<!\\b(?:old|previous|prior)\\s+(?:(?:a|an|the)\\s+)?(?:(?:manager\\s+)?approval\\s+)?(?:(?:code|ticket|number)\\s+)?[(\"'“]?\\$?)\\bmx-4471\\b(?![)\"'”]?,?\\s+(?:(?:is|was|has been|had been|got)\\s+(?:replaced|superseded)|(?:replaced|superseded)\\s+by|(?:(?:is|was|has been|had been)\\s+)?(?:dead|retired|expired|withdrawn|scrapped|invalid|obsolete|no longer (?:valid|applies|in use|used|active|current))|is not kept|does not count)\\b)(?!\\s*\\(\\s*(?:now\\s+)?(?:(?:replaced|superseded)\\s+by\\b|(?:dead|retired|expired|withdrawn|scrapped|invalid|obsolete|old|previous|prior|no longer)\\b(?!\\s+(?:[\\w'-]+\\s+){0,2}[(\"'“]?[a-z]{2,4}-\\d)))"
]
```

## g04-halvorsen-ticket forbiddenPatterns

Before:

```json
[
 "(?<!\\b(?:not|no|no longer|instead of|rather than|corrected from|replaced|replacing|was|formerly|old|superseded|withdrawn|dead|retired)\\s+(?:(?:a|an|the)\\s+)?[(\"'“]?\\$?)\\besc-2291\\b(?![)\"'”]?,?\\s+(?:was replaced|is dead|is retired|expired|withdrawn|scrapped|no longer applies|is not kept|does not count)\\b)"
]
```

After:

```json
[
 "(?<!\\b(?:not|no|no longer|instead of|rather than|corrected from|replaced|replaces|replacing|was|formerly|outdated|incorrect|wrong|mistaken|transposed|superseded|withdrawn|dead|retired)\\s+(?:(?:a|an|the)\\s+)?(?:(?:earlier|previous|prior|old)\\s+)?(?:(?:manager\\s+)?approval\\s+)?(?:(?:code|ticket|number|refund|credit|amount|figure|total)\\s+){0,2}(?:of\\s+)?[(\"'“]?\\$?)(?<!\\bold\\s+(?:(?:a|an|the)\\s+)?[(\"'“]?\\$?)\\besc-2291\\b(?![)\"'”]?,?\\s+(?:was replaced|is dead|is retired|expired|withdrawn|scrapped|no longer applies|is not kept|does not count)\\b)"
]
```

## g05-luis-approval-note forbiddenPatterns

Before:

```json
[
 "(?<!\\b(?:not|no|no longer|instead of|rather than|corrected from|replaced|replaces|replacing|was|formerly|old|previous|prior|superseded|withdrawn|dead|retired)\\s+(?:(?:a|an|the)\\s+)?(?:(?:manager\\s+)?approval\\s+)?(?:(?:code|ticket|number)\\s+)?[(\"'“]?\\$?)\\bmx-4471\\b(?![)\"'”]?,?\\s+(?:(?:is|was|has been|had been|got)\\s+(?:replaced|superseded)|(?:replaced|superseded)\\s+by|(?:(?:is|was|has been|had been)\\s+)?(?:dead|retired|expired|withdrawn|scrapped|invalid|obsolete|no longer (?:valid|applies|in use|used|active|current))|is not kept|does not count)\\b)(?!\\s*\\(\\s*(?:now\\s+)?(?:(?:replaced|superseded)\\s+by\\b|(?:dead|retired|expired|withdrawn|scrapped|invalid|obsolete|old|previous|prior|no longer)\\b(?!\\s+(?:[\\w'-]+\\s+){0,2}[(\"'“]?[a-z]{2,4}-\\d)))",
 "(?<!\\b(?:not|no|no longer|instead of|rather than|corrected from|replaced|replacing|was|formerly|old|superseded|withdrawn|dead|retired)\\s+(?:(?:a|an|the)\\s+)?[(\"'“]?\\$?)(?<![\\w.])\\$?245\\.65(?!\\d)(?![)\"'”]?,?\\s+(?:was replaced|is dead|is retired|expired|withdrawn|scrapped|no longer applies|is not kept|does not count)\\b)",
 "(?<!\\b(?:withdrawn|withdrew|withdraw|scrapped|scrap|removed|waived|dropped|eliminated|cancell?ed|rescinded|retired|lifted|no longer|not|no|without)\\b[^.\\n]*)\\b\\d+(?:\\.\\d+)?\\s*(?:%|percent|per cent)\\s+restocking(?![^.\\n]*\\b(?:withdrawn|withdrew|withdraw|scrapped|scrap|removed|waived|dropped|eliminated|cancell?ed|rescinded|retired|lifted|no longer|not|no|without)\\b)",
 "restocking fees?\\s*\\(if applicable\\)",
 "(?<!\\b(?:withdrawn|withdrew|withdraw|scrapped|scrap|removed|waived|dropped|eliminated|cancell?ed|rescinded|retired|lifted|no longer|not|no|without)\\b[^.\\n]*)\\bsubject to\\b[^.\\n]{0,40}?\\brestocking(?![^.\\n]*\\b(?:withdrawn|withdrew|withdraw|scrapped|scrap|removed|waived|dropped|eliminated|cancell?ed|rescinded|retired|lifted|no longer|not|no|without)\\b)",
 "(?<!\\b(?:withdrawn|withdrew|withdraw|scrapped|scrap|removed|waived|dropped|eliminated|cancell?ed|rescinded|retired|lifted|no longer|not|no|without)\\b[^.\\n]*)\\brestocking fees?\\s+(?:applies|apply|will apply|is applied|will be applied|is deducted|will be deducted)\\b(?![^.\\n]*\\b(?:withdrawn|withdrew|withdraw|scrapped|scrap|removed|waived|dropped|eliminated|cancell?ed|rescinded|retired|lifted|no longer|not|no|without)\\b)",
 "(?<!\\b(?:withdrawn|withdrew|withdraw|scrapped|scrap|removed|waived|dropped|eliminated|cancell?ed|rescinded|retired|lifted|no longer|not|no|without)\\b[^.\\n]*)\\brestocking fees? of\\b(?![^.\\n]*\\b(?:withdrawn|withdrew|withdraw|scrapped|scrap|removed|waived|dropped|eliminated|cancell?ed|rescinded|retired|lifted|no longer|not|no|without)\\b)"
]
```

After:

```json
[
 "(?<!\\b(?:not|no|no longer|instead of|rather than|corrected from|replaced|replaces|replacing|was|formerly|outdated|incorrect|wrong|mistaken|transposed|superseded|withdrawn|dead|retired)\\s+(?:(?:a|an|the)\\s+)?(?:(?:earlier|previous|prior|old)\\s+)?(?:(?:manager\\s+)?approval\\s+)?(?:(?:code|ticket|number|refund|credit|amount|figure|total)\\s+){0,2}(?:of\\s+)?[(\"'“]?\\$?)(?<!\\b(?:old|previous|prior)\\s+(?:(?:a|an|the)\\s+)?(?:(?:manager\\s+)?approval\\s+)?(?:(?:code|ticket|number)\\s+)?[(\"'“]?\\$?)\\bmx-4471\\b(?![)\"'”]?,?\\s+(?:(?:is|was|has been|had been|got)\\s+(?:replaced|superseded)|(?:replaced|superseded)\\s+by|(?:(?:is|was|has been|had been)\\s+)?(?:dead|retired|expired|withdrawn|scrapped|invalid|obsolete|no longer (?:valid|applies|in use|used|active|current))|is not kept|does not count)\\b)(?!\\s*\\(\\s*(?:now\\s+)?(?:(?:replaced|superseded)\\s+by\\b|(?:dead|retired|expired|withdrawn|scrapped|invalid|obsolete|old|previous|prior|no longer)\\b(?!\\s+(?:[\\w'-]+\\s+){0,2}[(\"'“]?[a-z]{2,4}-\\d)))",
 "(?<!\\b(?:not|no|no longer|instead of|rather than|corrected from|replaced|replaces|replacing|was|formerly|outdated|incorrect|wrong|mistaken|transposed|superseded|withdrawn|dead|retired)\\s+(?:(?:a|an|the)\\s+)?(?:(?:earlier|previous|prior|old)\\s+)?(?:(?:manager\\s+)?approval\\s+)?(?:(?:code|ticket|number|refund|credit|amount|figure|total)\\s+){0,2}(?:of\\s+)?[(\"'“]?\\$?)(?<!\\bold\\s+(?:(?:a|an|the)\\s+)?[(\"'“]?\\$?)(?<![\\w.])\\$?245\\.65(?!\\d)(?![)\"'”]?,?\\s+(?:was replaced|is dead|is retired|expired|withdrawn|scrapped|no longer applies|is not kept|does not count)\\b)",
 "(?<!\\b(?:withdrawn|withdrew|withdraw|scrapped|scrap|removed|waived|dropped|eliminated|cancell?ed|rescinded|retired|lifted|no longer|not|no|without)\\b[^.\\n]*)\\b\\d+(?:\\.\\d+)?\\s*(?:%|percent|per cent)\\s+restocking(?![^.\\n]*\\b(?:withdrawn|withdrew|withdraw|scrapped|scrap|removed|waived|dropped|eliminated|cancell?ed|rescinded|retired|lifted|no longer|not|no|without)\\b)",
 "restocking fees?\\s*\\(if applicable\\)",
 "(?<!\\b(?:withdrawn|withdrew|withdraw|scrapped|scrap|removed|waived|dropped|eliminated|cancell?ed|rescinded|retired|lifted|no longer|not|no|without)\\b[^.\\n]*)\\bsubject to\\b[^.\\n]{0,40}?\\brestocking(?![^.\\n]*\\b(?:withdrawn|withdrew|withdraw|scrapped|scrap|removed|waived|dropped|eliminated|cancell?ed|rescinded|retired|lifted|no longer|not|no|without)\\b)",
 "(?<!\\b(?:withdrawn|withdrew|withdraw|scrapped|scrap|removed|waived|dropped|eliminated|cancell?ed|rescinded|retired|lifted|no longer|not|no|without)\\b[^.\\n]*)\\brestocking fees?\\s+(?:applies|apply|will apply|is applied|will be applied|is deducted|will be deducted)\\b(?![^.\\n]*\\b(?:withdrawn|withdrew|withdraw|scrapped|scrap|removed|waived|dropped|eliminated|cancell?ed|rescinded|retired|lifted|no longer|not|no|without)\\b)",
 "(?<!\\b(?:withdrawn|withdrew|withdraw|scrapped|scrap|removed|waived|dropped|eliminated|cancell?ed|rescinded|retired|lifted|no longer|not|no|without)\\b[^.\\n]*)\\brestocking fees? of\\b(?![^.\\n]*\\b(?:withdrawn|withdrew|withdraw|scrapped|scrap|removed|waived|dropped|eliminated|cancell?ed|rescinded|retired|lifted|no longer|not|no|without)\\b)"
]
```

## g08-halvorsen-credit expectedAny

Before:

```json
[
 "fits",
 "within",
 "enough",
 "covers",
 "approve",
 "does fit",
 "yes",
 "can afford",
 "can proceed",
 "can go",
 "can put",
 "can be put",
 "can place",
 "can be placed",
 "can take",
 "can cover",
 "can accommodate",
 "can approve",
 "can be approved",
 "sufficient",
 "would be approved"
]
```

After:

```json
[
 "fits",
 "within",
 "enough",
 "covers",
 "approve",
 "does fit",
 "yes",
 "can afford",
 "can proceed",
 "can go",
 "can put",
 "can be put",
 "can place",
 "can be placed",
 "can take",
 "can cover",
 "can accommodate",
 "can approve",
 "can be approved",
 "sufficient",
 "would be approved",
 "plenty of room",
 "enough room",
 "can easily",
 "can comfortably",
 "can still"
]
```

## g08-halvorsen-credit forbiddenPatterns

Before:

```json
[
 "\\bexceeds\\b",
 "(?<!\\b(?:not|never|no)\\s+(?:\\w+\\s+)?)\\bover the limit\\b",
 "\\bnot enough\\b",
 "\\b(?:does|do|will|would)\\s*(?:not|n't)\\s+fit\\b",
 "\\b(?:cannot|can't|can not)\\s+(?:be\\s+)?(?:approved?|afford|fit|cover|accommodate|proceed|go|put|place|take)\\b",
 "(?:^|[\\n:?¦])\\s*no\\b(?=\\s*(?:[,.;:!—–¦-]|$))",
 "\\b(?:not|never|no longer|hardly|no|nor|without|lacks?|lacking|lack of|short of|falls? short(?: of)?|\\w+n't(?:\\s+be)?)\\s+(?:\\w+\\s+)?sufficient\\b|\\binsufficient\\b",
 "\\b(?:(?:would|will|could|should)\\s*(?:not|n't)|won't|never)\\s+be\\s+approved\\b"
]
```

After:

```json
[
 "\\bexceeds\\b",
 "(?<!\\b(?:not|never|no)\\s+(?:\\w+\\s+)?)\\bover the limit\\b",
 "\\bnot enough\\b",
 "\\b(?:does|do|will|would)\\s*(?:not|n't)\\s+fit\\b",
 "\\b(?:cannot|can't|can not)\\s+(?:be\\s+)?(?:approved?|afford|fit|cover|accommodate|proceed|go|put|place|take)\\b",
 "(?:^|[\\n:?¦])\\s*no\\b(?=\\s*(?:[,.;:!—–¦-]|$))",
 "\\b(?:not|never|no longer|hardly|no|nor|without|lacks?|lacking|lack of|short of|falls? short(?: of)?|\\w+n't(?:\\s+be)?)\\s+(?:\\w+\\s+)?sufficient\\b|\\binsufficient\\b",
 "\\b(?:(?:would|will|could|should)\\s*(?:not|n't)|won't|never)\\s+be\\s+approved\\b",
 "\\bno\\s+(?:(?:more|credit|extra|spare|real)\\s+){0,2}room\\b"
]
```

