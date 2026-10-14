// Drives the remaining c1 q2-continue label batches through the Codex bench on GPT-6.1 Sol, three execs at a
// time, each journaled under tmp/codex/c1-q2c-<batch>.jsonl with its brief and last-message file beside it.
// Log: the launcher's journal; cap: the launcher's; supersedes the Claude Workflow c1-label-q2c.workflow.js
// whose batches 013 to 045 failed at the Claude session limit on 2026-10-13. Supersedes c1-label-q2c-driver.ts,
// which spawned codex through a shell and lost its prompt argument to Windows word splitting.
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const SCAFFOLD = 'C:/Users/mikes/WebstormProjects/agent'
const RESULTS = `${SCAFFOLD}/.orkestrel/agent/instruments/results/c1/q2-continue/audit`
const BRIEF = `${SCAFFOLD}/tmp/units/c1-label-brief.md`
const PACKET = `${RESULTS}/packet.json`
const PACKET_HASH = '212abdc2bd5ee66f02854c423ba91a585e348b3adb3e7a04fb0c3bdf2836f211'
const KEYS_HASH = 'e3bea115a48aa57cc2a3f38966acf0869141450e0f0cddacad27116b46195325'
const CONCURRENCY = 3
const FROM = 13

const ids = [
	'00d972caf64a177564f0cb7c2c97807d70c2828264970b61b2ece4942e04bf2d', '014fc992772a76f297f8c00e2933401ccf83c7fec4ab6f51c8ebcb6cee9c5de7', '0398cb501ef5347e6091714852d8df149b146ffe11edc00967c20f8a2d04ddaa', '073f6ed6e957fc75c24aab5a511107f2dde9725ed44a2c96ccc7608c73b9bce4', '0776dd1c6e0cecdf9855e655673c03f645ebc6925835484d2390a2d4503925d9', '0876247e3798c83fdb2dc349a2b132f6c8f4ea95ee8d0e686414d25a65bcc1a8', '0d8120eaefc3cdc83ed8cb97d39a57ec419065267d0cbc9031c97b8319a34d65', '126a6d5b98e2448b78e0c4ba9ad2af4db62fab5c93fa7b8ff1bcda8b2e73f780', '140ed84da0816016f79fd2e4e0da770fdf28d1b9d01e676e080aeae9018899c6', '15433c77b07ec9ed4cb8215d61d5ab683cddb8a20eaa6b06565e963a87d4f756', '1832d3b265016e411a0f2dcf20d2c430d3ad136792e95e7c5beb678c9d917d44', '186a8ba4c5e16544aa3116e740b5d8e21aa657970a6504bdc4f2f6ce5b044c2b', '19453f4a220e9da04c855c11b1e38482963b8730b25fd122259655d573e81b59', '1ab68d31be45006b205ed0354d1007c7e76a2e8f2166b6ee9161d89858d2ac00', '1ae135ccb5f9f3bed8dac937bf78c39e5fee5037bf2e174c4da90130addae712', '1aee687bbc2a7f8131fde7487c5c8a8422ffdb8cdb1718f6bed536ad17363d93', '216f005b7c3fa46702d4c71626e1926fe80fff6130679b3502038f65a29b2790', '2220961b758f2bb7750d1a5f80b4d0c689903d5919d418c9cfa20ef371e471b6', '23f25dc7f1075cf6e01a17d9d1a970f56790ffbad5dc06dd073d635b486dcb24', '267001d13b74525596b16c74f3b420d24b61fd1f747bb28cd598464e7ce84bde', '2ab5d58a45242904fd48d615fdb9a0b0ad5c8729b9fe3010ac0a20ee705ed699', '2cdd36ddbbad665484ef8ba8d20c4d21b7a1592ce9aa797d9c42aa07c8455ea0', '3101889559f35ae61e8866e87b2cf27e9cb46a8437cb34d3c3f9683344f35a46', '337aeee402a2735ceb83ece5e88ca05c548d6b39516e0e606acb537ec9a22e7f', '343c20afbaa618e193fd677ca86cae981f32d6f5b00af5928fff15580c1d82fc', '35f3d4af36bc7125d2934d2160082c91336c9f122719a3a6ae0057fe6298c3cd', '3678f481f4f1676641c8a84d4d63d94712ae2cfcb146fb60cb71e93b20f50aa3', '391ac7b148979febbff1d7034a8fd6e5beeb4c4801d70ba02e966b06aa180551', '3a4282c2c03897c5f4d0dd10240ed884daa3ce6a8154a2988761917211cd5bcd', '3b8ed757d3850e85ba784b066bc46ad602f0e70f27799967611df4c5e1fedd5c', '4028e1feefb159d330eed264b228809c7a81b7db8e92faafcf80ff2e3fd24ab5', '40e7c632eee64e657c6792884090b7cf5289b59cf02fc1e6c4c5ef7d223a7401', '4603bd6d505507de2707b4155672f873765bbb8c4159317349f23e6e5b927f97', '4a45bc2cf7d46c82848e8559ed43fdb899930d469627d3e70225b57a4192c233', '4cd1464a9f49f1ffe6a3b69e41b5718c2cce98d223e3ba65796ec1bd69e11601', '4f2644e78e95bba1c28e067731bdbdc49d7f6eee64f43150bbeac858b8ff298e', '4f5df94f4968248f091fddeabc782a0c1275cc6646eb935150e3a0f0d8a9beed', '57724fa4cf7199b014b62312d930bd447b65343236b8c5b48b376692805ad939', '5985cfbbe8b439e15e065389e75b7cebd94af50be5d2fdc86c86134fd3824d63', '5cb069bef8d96b1bcb4af7cfc5e462e2b424fb62d7b6a8747a39921a493ad8de', '61ebbb84ccff2d3cb03f112d29b450b3fbe858659d22cb4c83e7721dc57d7b29', '648b15d1f85f2ff8c8f867779da18545d45ca09a48c02b6a62a197b49e95b574', '6932aaab6faf82837a2af6791c65619817de9fff7f72b595e09079dc9a41a9ae', '6ee7c67118d1e7c8f73cdf40174f158f7873610e2029aca0503e78de7fbce2dd', '6fc60baeda212dfd96a3320d981214c822473d5b72ab6d4692e51c3a260578e0', '6fddbfd4e0958d258e05f43cb1e3ffd4384d67a023fc0431d5984e54768724f8', '72669ae1bfa5b8b8d829f0c721fa86e2318f765af45427885bf232f82c8e1b9b', '76eb8159b7fcd1a515473a6d59fcf195455ebe031877dd90756c26edcde45c74', '780108e215afca26c6b8b3c8de83d74b60f2f37beb617d02c823f490d82becc4', '79261b1926a7dfb6983e1d67be70b57d4449228d446d137b9feb9834037210b4', '7d908388fa3b667d6556bffb07832c3fbbed43d736aa69b7fe917dc0d81ca7ef', '869e9192369a71ef2fe5eefbd71cac9aa588626d143223efa2d7ef70657c4132', '86d37c8346574af88746fb68bc599fbf14db84a4c3c63d4b43025357f1fbb570', '894913935a0c7b582f66866a30b71afb550199addb671dbec445543799c49fdd', '89e289b1fd397ce516f0a56ad9cd0230c148ffb21aa6e7541fb9a76d2adcee50', '8a9c953f7feca1322a86aa413a66daf7ce145c9aefe3456457ec117fe0dfe427', '8b79b27375f8d38e38a47924bb73a988714fbd29510bb045c72b9ad6885b1adb', '92b8f8a42793ac9d875fcb78b8352e677972cedd57c4ae652c2f519ddfe612b8', '932565126367e4637ad9b477f0402abdd60bb09fc4e0ea9b4827a5eb05fa7d68', '988deeffdb2a9357df1df919db2b22c149d31134d0bd005f163148b8a292fe78', '9a5b3fc6dedd69518decbfc66821e7c8a02b721bf44a83be26d2faace0268d0b', '9c3cf5992149faffa04fab6a907052cd7c4065019c087fe1f9f2aca4706e1e91', 'a4b730d496f4bf6e2d0917921024c1750b44be0304f3cc58f4c52edd927ceaa8', 'ac45aeb8f2ebc42c5b21c0fc9415f3d3d1d3e98cba09a62044a59a904eec9ae4', 'b17bba6259060a1141cdeed00526c4bd44d63a5f7731573bf323c3808243b12e', 'b49db9631eb522c24b440bd1dd9bd7da28aa7b4a5e599af21dcb1ef7385c52e6', 'b9eac03babc801d2483b33043f1d15ad6183f72008d571b1b3f5c2c73f6a8601', 'c010a4e1951a3f52567339a6abc96822954c76d42004effe1ce9706d3e9ac4d9', 'c064335030c1237472003493f7cc1bde8f55e4fc3f039ef65b3d7de0a298f254', 'c5634b961ce7777ac7778fc5c56a568f45625e0f64b28ddb5cfc9baa6e9b4681', 'c578e2bef9740b89903ec5d2ebbb463fa7999ab2b7c00b02490f20f181fb5312', 'c65bdce5a1d15a00f72ca68e8f8e43683a3df241d14e5922c9e78e47c8a062cc', 'c8b31016c4626da7e5ee04d37a2dda452da37a331f69e95e14d315eff0002435', 'd3c0957e2b36264b693c1bc1c44e9029cc06c293fdae04f2570561dbca29dee5', 'd4c54b55356d31f33fa81953cdec0a56ca9945311f5b5d2ed78e1b751f4d3cbf', 'd6c1ecf8d1981c486cb5da00d59e8c0751696d1c1ffdb0e55edee5d58a59edc4', 'd75b3c01a732b3012547093bbddd69106892fa7607d032b615614fdccfd5cbad', 'da69c40ab525a1704926f8c5bb4ccabb98f455d6ba98a10e60eb980ae2c8b190', 'da6a20417c7b87c8e62605010d742a77917328bf58f3c2b64a5e89fb51c65270', 'db85398131b561d131e9d52e3a868dbc511ec583b030386768564106f189ec19', 'de3872508fba7d89a533b2bfb21fceeb711397f3eacb718b723b38781a81856a', 'def876629728a662c6de16c43cc6ff6c84265edc62a0b1595503edbb129c75af', 'e0be2e1f60ee4885dd2a4bfdffcd209ad9497324a252bd8b6a3541fb060d14f2', 'e586a81488069aa1390ad376d23b1143de61aaacd02e9acf06fbcf172b86a74f', 'e61da94a86f6dbb5f1ab7883274b7a3fbfd9c2ddab30a8793676cf545a0af2b4', 'e9c0738404364d6acd64e86f654e41628482e3677457df348c26916b7305c70e', 'eb5865e1ccdcb39529cde69fad95e36599b74fe62eef86c9f8ab593c4b52a7e6', 'ebe4889fef2041f980c7c8e69ce23d126e0e6c5d237b29ac94e795f12b3de0f3', 'edfe8dd8de8d249e5e3b9701393a0f7e1d9cbbaeb67e114a3b8ecbf367a58484', 'ef3567c8cab511450f421a54039755f08a4c30cc5db39970b2d33ec0ebe83d3e', 'f0e66fce0825e1efddf4ce20f7be4c85294d2a353da577e20114b3d4845f020a', 'f8408e3a2c64cacbee05f54382f4f4fcf548a9824cd18a5886c1254fc9d2aac3',
]

interface Batch {
	readonly index: number
	readonly name: string
	readonly items: readonly string[]
}

const batches: Batch[] = []
for (let at = 0; at < ids.length; at += 2) {
	const index = at / 2
	batches.push({ index, name: `batch-${String(index).padStart(3, '0')}`, items: ids.slice(at, at + 2) })
}
const pending = batches.filter(
	(batch) => batch.index >= FROM && !existsSync(join(RESULTS, 'labels', `${batch.name}.json`)),
)
console.log(`${pending.length} batches pending from ${FROM}`)
mkdirSync(join(SCAFFOLD, 'tmp', 'codex'), { recursive: true })

function renderBrief(batch: Batch): string {
	return [
		`# Unit c1-q2c-${batch.name} â€” adjudicate two blind c1 items`,
		'',
		'## Role and engine',
		'',
		'Independent adjudicator on GPT-6.1 Sol, reached as `codex exec`. Executor: BENCH_ENGINE.',
		'',
		'## Objective',
		'',
		`Read the brief at ${BRIEF} first and follow it exactly; it is the only law for this task. Label the two items it names here, write one labels file, and run the checker until it prints refused 0.`,
		'',
		'## Context',
		'',
		`- **Evidence.** Your items, each one file under ${RESULTS}/items/: ${batch.items.map((id) => `${id}.json`).join(' and ')}. Read only those files. Never open the packet, the items index, another item, any keys.json, any private directory, any run directory, or the oracle.`,
		`- **Envelope.** Wrap your labels as the brief shows with packet hash ${PACKET_HASH} and keys hash ${KEYS_HASH}.`,
		`- **Checker.** From ${SCAFFOLD}: node .orkestrel/agent/instruments/harness/.build/bench5/continuous.js labels --packet ${PACKET} --labels ${RESULTS}/labels/${batch.name}.json`,
		'- **Host.** Windows, PowerShell; the sandbox is `danger-full-access`, and this brief states the route write-only to the owned file. No network. The unlabeled count the checker prints covers every item you were not given and is expected.',
		'',
		'## Scope',
		'',
		`- **Owned.** ${RESULTS}/labels/${batch.name}.json (create the labels directory if it is missing).`,
		'- **Off-limits.** every other file.',
		'',
		'## Execution',
		'',
		'Perform the assignment yourself and spawn nothing. Repair every REFUSED line at its cause and rerun the checker until it prints refused 0. Never change a verdict to satisfy the checker; fix the citation or the quote. Run no git command.',
		'',
		'## Output',
		'',
		'Your final message is the return shape the brief names: one line per labeled item, then `CHECKED refused 0` or `DEVIATION: <one sentence>`.',
		'',
	].join('\n')
}

function runBatch(batch: Batch): Promise<number> {
	const briefPath = join(SCAFFOLD, 'tmp', 'codex', `c1-q2c-${batch.name}-brief.md`)
	const journal = join(SCAFFOLD, 'tmp', 'codex', `c1-q2c-${batch.name}.jsonl`)
	const last = join(SCAFFOLD, 'tmp', 'codex', `c1-q2c-${batch.name}-last.md`)
	writeFileSync(briefPath, renderBrief(batch))
	return new Promise((resolve) => {
		const child = spawn(
			'codex',
			[
				'exec',
				'--json',
				'-C',
				SCAFFOLD,
				'--sandbox',
				'danger-full-access',
				'--model',
				'gpt-6.1-sol',
				'-c',
				'model_reasoning_effort="high"',
				'--output-last-message',
				last,
				`Read tmp/codex/c1-q2c-${batch.name}-brief.md from disk and execute it exactly. Your final message is the report it specifies.`,
			],
			{ cwd: SCAFFOLD, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] },
		)
		const chunks: string[] = []
		child.stdout.on('data', (chunk: Buffer) => chunks.push(chunk.toString('utf8')))
		child.stderr.on('data', (chunk: Buffer) => process.stderr.write(`[${batch.name}] ${chunk.toString('utf8')}`))
		child.on('close', (code) => {
			writeFileSync(journal, chunks.join(''))
			const labeled = existsSync(join(RESULTS, 'labels', `${batch.name}.json`))
			console.log(`${batch.name}: exit=${code ?? 'null'} labels=${labeled ? 'written' : 'missing'}`)
			resolve(code ?? 1)
		})
	})
}

let next = 0
let failures = 0
async function worker(): Promise<void> {
	while (next < pending.length) {
		const batch = pending[next]
		next += 1
		if (batch === undefined) break
		const code = await runBatch(batch)
		if (code !== 0) failures += 1
	}
}
await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))
console.log(`done: ${pending.length - failures} of ${pending.length} exited 0`)
process.exitCode = failures === 0 ? 0 : 3
