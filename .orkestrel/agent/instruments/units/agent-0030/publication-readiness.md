# Agent 0.0.30 publication-readiness correction

This successor corrects the evidence roots and readiness interpretation in `agent-0030-publication-readiness-report.md`; that report remains unchanged. The release source and full package archive are byte-bound to the retained release evidence. Registry absence of 0.0.30 is the expected pre-publication state recorded by the release checkpoint, not a blocker. The remaining operator requirement is npm authentication and authorization to upload.

## Correct evidence roots and historical release record

The historical records belong to the scaffold checkout, not the agent checkout. I read:

- `C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/instruments/units/aggregates/reports/resumption-vendor-acceptance.md` directly. It binds the verified agent commit `ee734c30151c7d431e480aff7a0d54306d387f13`, source entry SHA-256 `8f040acf72b6426246b79e5c2f31d3644291e4c08f49434ad1224e16f176311d`, declarations SHA-256 `f6f28cab8a2d417510e68f308563f1f53eb86b600e0a57208799adc8d783d171`, and an independent offline harness run. Its gate limits and counts remain historical; no gate was rerun here.
- `.orkestrel/agent/instruments/units/agent-0030/release-checkpoint.md` from scaffold commit `68060778df1e737e51ab083e90af81683c49671c`, read with `git show`. The checkpoint says main is at the same release SHA, the registry did not yet serve 0.0.30 on 2026-10-10, and operator upload and registry confirmation remained pending. It records `prepublishOnly` exit 0 with 1,857 passed and 2 applicability skips, replay 108/108, and 618 raw requests per build with no differences or incomplete copies. These are standing release readings, not commands run in this unit.
- `.orkestrel/agent/instruments/units/agent-0030/consumers/packed-hashes.json` from the same commit. `git ls-tree -r --name-only 68060778df1e737e51ab083e90af81683c49671c -- .orkestrel/agent` located the named manifest; `git show` records the original agent archive path, the ESM member size/hash, and the packed `package.json` size/hash.

The first report's claim that the cited scaffold release records were absent from both checkouts was incorrect: it had checked the agent checkouts for scaffold-owned history. The original paths above are now read from the proper scaffold checkout. The machine manifest binds ESM and packed `package.json`; the actual retained tarball below also permits a complete archive-byte comparison.

## Complete archive comparison

The historical archive named by the machine manifest still exists at `C:/Users/mikes/WebstormProjects/agent/tmp/packs/8f040acf72b64262/orkestrel-agent-0.0.30.tgz`. It was compared directly with the fresh ignore-scripts pack created in the predecessor unit at `C:/Users/mikes/WebstormProjects/agent/tmp/units/agent-0030-publication-readiness-pack/orkestrel-agent-0.0.30.tgz`.

| Measurement | Historical archive | Fresh archive | Match |
| --- | --- | --- | --- |
| Bytes | 633,936 | 633,936 | Yes |
| SHA-1 | `1bb0bb123e4a2414a9a99b5dc73ad41e5566b2ca` | `1bb0bb123e4a2414a9a99b5dc73ad41e5566b2ca` | Yes |
| SHA-256 | `22fa21dc1cb66a9fd8400814b90ab99a8066114127ec567c87cc54ae126b51a3` | `22fa21dc1cb66a9fd8400814b90ab99a8066114127ec567c87cc54ae126b51a3` | Yes |

The equality was computed from both archive files, not inferred from the compressed container size or npm's SHA-1 alone. The fresh archive's SHA-1 and 633,936-byte size also match the retained release handoff measurements. The extracted fresh ESM member is 310,864 bytes with SHA-256 `8f040acf72b6426246b79e5c2f31d3644291e4c08f49434ad1224e16f176311d`; the packed `package.json` is 4,077 bytes with SHA-256 `d4be8839966d2d478e4c808d04688bcb1ae4297b982038a8fc3a22becd91dd1e`. Both match the historical machine manifest. The declaration hash also matches the checkpoint and vendor-acceptance readings.

The machine comparison is retained as `tmp/units/agent-0030-publication-readiness-2-pack-comparison.json`. It records the two archive paths, byte counts, both digests, equality booleans, and both member checks. This proves the complete fresh archive is byte-identical to the retained release archive.

## Readiness and operator boundary

The primary checkout remains clean at `e549b4dfa08074a881ddd41b2994a01ca71938f4` and differs from the release main tree only by added `RESULTS.md`. The release worktree and `origin/main` remain clean at `ee734c30151c7d431e480aff7a0d54306d387f13`. Existing primary ESM and declaration files match the historical hashes; no build, install, source edit, or dependency change occurred.

The current registry read still lists `@orkestrel/agent` through `0.0.29` and returns E404 for `@orkestrel/agent@0.0.30`. This is expected: the historical release checkpoint explicitly says 0.0.30 was unpublished and awaiting the operator upload. The package and packed release artifact are ready for publication; registry absence is not a reason to block that planned first publication.

The built `window.js --whoami` result remains `{"mode":"whoami","live":false}` with exit 3. Authentication is therefore the outstanding operator requirement. On Windows the publish skill requires the operator to run browser-authorized npm work in a real terminal because Git Bash does not provide `script`. When the user authorizes publication and the account is ready, the command is `npm publish --ignore-scripts --browser=false` from `C:/Users/mikes/WebstormProjects/agent`; confirm the session with `npm whoami`. No login, approval, or upload was performed here.

The command logs and matching `.err` files remain under primary `agent/tmp/units/` with the `agent-0030-publication-readiness-` prefix; registry query logs use `-2`, while session, pack, archive-list, and extraction logs use their named suffixes. The first wrong-CLI attempts are preserved without `-2` and did not reach npm. This successor performed only the named historical-record reads and archive/hash comparison; it ran no build, package gate, install, model/service call, login, or publication.
