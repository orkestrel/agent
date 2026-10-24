# Scaffold 0.0.106 release review ruling

The medium release boundary review is accepted after reproducing and repairing its one finding. Final executable gates and package inspection remain required before release readiness.

Lane: independent GPT-6 Astra xhigh, clean T3 context, task release-20261024-scaffold-review-r1. The reviewed subject was canonical Scaffold main04d9ada84 plus its working diff against published b40ed8a. One lane was required by the medium size gate; no second lane ran. The original report remains unchanged in Scaffold's tmp/units/release-20261024-scaffold-review-report.md.

1. BROKEN, then repaired: the documented Vite example inherited8.3.5 from the shared manifest-derived registry while asserting the independent8.3.4 example. Root's exact named-case reproduction failed at that expectation in1.921seconds. Root adopted the review prescription verbatim: only this case adds an explicit /vite packument with8.3.4. The case passed in1.957seconds. Removing that response, with valid collection/imports, made the same named assertion fail in1.859seconds; the response is restored. The other30 cases were deselected by the test-name filter, not failures. Shared registry replies, assertion operators, worked-example prose, and arbitrary caller fixtures remain unchanged. This closes the repaired claim through the mutation rule; another review would add no distinct claim.
2. CONFIRMED: root sampled source/guide parity and catalog evidence. The authored changes affect comments/prose; the Agent mirror adds no runtime edge. The all-guide Supervisor failure remains reported separately from the successful declared-guide refresh.
3. CONFIRMED subject to the planned rebuild: root checked manifest/export/build declarations and the three generated self-pin fixtures. The106 bump and snapshot changes are committed at a3d4c33b6. The final build must regenerate the embedded pin, host, and inventory.
4. CONFIRMED as assertion adequacy: root sampled actual installed-manifest/embedded-pin and host membership assertions. These are static review findings, not a claim that final release gates have passed.

The report's35 Markdown link destinations all resolve through the citation checker. Running it on the original text reported8 unresolved shortened display labels; a separate extracted-destination record resolved35/35 without editing the report. No substantiated outside findings or advisories were returned.

Root separately diagnosed the pre-build touched CLI failure: the refreshed catalog and guide bytes differ from the committed host inventory. Preserve the digest guards and regenerate through the existing build before tests. The final prepublishOnly chain performs that ordering. Do not treat the earlier touched chain as green.

Gate task: release-20261024-scaffold-gates-r1, GPT-6 Luna medium. It owns heavy host execution and only generated dist/host.json writes. Delete this temporary verdict and the closed claims when the release seam is accepted; retain the measured ruling in the release acceptance record.
