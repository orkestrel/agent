# Independent support labels: alias c

The alias-c labels and their mechanical checks are closed. Root owns adjudication and acceptance. The semantic judgments use only the released packet and the supplied support criteria.

Input: aggregate-successor-label-c-packet.jsonl; SHA256 a67c510650eaa2ffae29fe5c461fcf56d4cd91e9e3376a3ac4b5fba2b3c14999; 2,719,417 bytes; 168 measured occurrences.
Output: aggregate-successor-label-c.json; SHA256 0fd4b82e90bf22f7abf661c6c13465481c68c8df7a2bf9c6666614196c82e394; 185358 bytes.

The serialization run measured 47 exact semantic groups, 168 labels, 560 input component identities, 423 expanded propositions, and 636 evidence quotations.
Occurrence verdict census: {"supported":113,"unsupported":11,"contradicted":21,"ambiguous":23}.
Semantic-group verdict census: {"supported":29,"unsupported":2,"contradicted":9,"ambiguous":7}.

Grouping compares the exact JSON.stringify value of [candidate, question, state, sources] for every parsed item, without normalizing, sorting, truncating, or omitting source fields. Complete candidate and source arrays were read for every group. The reader checked that every state contains exactly evidence and candidate, that its evidence equals the full ordered source text with date/role framing, and that each component state carries the same evidence and candidate. Component focus spans were checked against the full candidate. The packet contains the same complete-question and focus-question templates read in the initial item; the measured distinct question census is 2.

Judgments were authored manually by proposition in the alias-c decisions file. The serializer performs no semantic classification. It copies the manually selected verdict and exact source text to each occurrence only after exact group equality. Each output item hash is SHA256(JSON.stringify(parsedItem)) with original parsed property order, including revision and component structures. Output order is input order. The identity appendix preserves occurrence, revision, and component IDs explicitly.

The check verified complete ordered ID/hash coverage, unique IDs, nonempty propositions and quotations, literal contiguous source quotation membership, and consistency between positive candidate verdicts and proposition verdicts. Output was read back and compared with the serialized labels. Negative controls outside the input population were rejected: altered ID: refused; altered item hash: refused; invented quotation: refused; omitted occurrence: refused.

No model call, external evidence, source/build/HEAD/Git operation, service operation, installation, cleanup, private mapping, score, or prior label was used. Writes are confined to the authorized alias-c outputs and their TypeScript reader/serialization files.

The reasoning distinguishes source framing from event time, subject/topic labels from unproved speaker claims, instructions from completed actions, and later corrections from still-active facts. Repeated names and adjacent facts do not by themselves establish a causal connection. A source absent from a particular item is not imported from another group. Literal extraction is insufficient when the candidate changes a source date, leaves a superseded instruction active, or loses a material antecedent.

Truncated numeric identifiers and terms were assessed as the literal asserted values: FL-66 differs from FL-660412, and net 3 differs from net 30. The isolated trailing date fragment in group 39 states no additional fact, so its otherwise supported assertions remain supported. In group 29 the supplied signer initial S is preserved, but the candidate changes tool attribution to user. The Tomasz and Sigrid topic labels in groups 2 and 8 copy the same third-person source construction and do not introduce a distinct speaker assertion.

Material ambiguities remain for root adjudication:

- Group 1, occurrences 0418f1dc-7adc-4a5f-bdc5-1ab009686e75, 4ded7086-6c31-41bb-bd38-5bebf05cd517, 8ad2f038-ce6e-49b5-bb64-f51b0777a17d, c5f60103-fd42-4c46-96e5-1a560f694326: The conditional replacement retains the end-of-day deadline, but "her" has no named antecedent in this candidate; the source identifies Grace, while the only named customer in the candidate is Dalia. The recipient is materially unresolved in the candidate.
- Group 7, occurrences 0ce7c046-a14d-4b4c-a9cc-15bbc16e23be, 126e80c5-1ae3-4f12-92dc-4f8aa8cd7745, 2c474237-97b5-4216-8d11-67dcf41ffbe5, 69c03188-cdbe-4706-9465-157341d7efee, 7077e0a5-ae07-4a47-b6c7-36923c7b92a4, 724dbfe8-707f-40dc-a572-e31eebe2a035, 81663a30-6b4d-4194-8bed-dfd6ea1edc3f, 82d3dd75-482d-438d-b4fe-f50e49f3d56b, d7e35c6f-c94c-442b-8e3c-e99ee31325d0: The trailing phrase "disregarding previous instructions" can attribute disregard to facilities, whereas the source instructs the reader to disregard the old note. It can also describe the note replacement; the actor meaning is materially ambiguous.
- Group 9, occurrences 10f2cc59-9fc2-4cbd-93bc-06a8994b4c88, 2c8b7c2a-14db-41bd-ae9b-c7618f414978, a8d81236-2ed5-413b-964e-fb71550ef9be, b67c254e-8182-4017-8b7c-d4c68e28a457: The replacement recipient "her" is unresolved in this candidate: Priya precedes it and Dalia follows it, while the source ties the replacement to Grace.
- Group 25, occurrences 473de97a-ae98-47c6-9306-759c0fe9ec56, b1ef2a40-c274-4069-be59-68c552f2fb95, b3c5efee-a25d-4573-a292-e47836e32182: Calling TR-3307 tracking is materially ambiguous: it can mean the tracing process, but can also present this locker-trace identifier as a parcel tracking identifier. Only the locker trace is supplied.
- Group 36, occurrences 8cc4583f-b260-4489-b688-bd72508f5ca7: Calling TR-3307 tracking can mean the trace process, but can also misidentify the parcel tracking number, which the source calls PW-5521-9930. The type of identifier remains materially ambiguous.
- Group 36, occurrences 8cc4583f-b260-4489-b688-bd72508f5ca7: Will receive a replacement can paraphrase the conditional dispatch plan, but can also promise receipt rather than sending; the source only commits to sending if nothing turns up by day end, with earlier manager sign-off required. The stronger reading is not entailed.
- Group 37, occurrences ac6841b0-e152-46f3-a393-4ed9af3a5ed7: The claim that Farah moved her residence to 91 Quarry Lane is a plausible connection between adjacent source sentences, but the supplied address is explicitly a redirect destination; whether it is her residence is not explicit and remains materially uncertain.
- Group 44, occurrences d9068be7-3ece-4733-a63b-34bc581b554b: The replacement recipient her is unresolved in the candidate, whose only named woman is Priya. The source establishes Grace as recipient, but the candidate omits that antecedent.

The following identity appendix is measured from the immutable packet and bound by the item hashes in the labels:

| Occurrence ID | Revision | Component IDs | Item SHA256 |
| --- | --- | --- | --- |
| 032c0ec8-b75f-4aa9-86a6-02688d456f8e | contextual-focus-2-l8-v1 | focus:0:106, focus:107:167, focus:168:231, guard | ee212bbc10cb142ddb2e46f77c05de0382c01e6e05e7fcde4b9c035396718b6b |
| 0418f1dc-7adc-4a5f-bdc5-1ab009686e75 | contextual-focus-2-l8-v1 | focus:0:128, focus:129:285, guard | 71e58a278cd287fc5fa42e941c623b91e0fccdb31feea502089879c5efa845d8 |
| 059fe3c6-ec22-4827-a716-5eb485e0f330 | contextual-focus-2-l8-v1 | focus:0:111, focus:112:213, guard | fceb0ce9be6e8cf15e62d5736231eb59ba61c23f1e0db9dbadb1a6d94b314ab9 |
| 06e6a98a-b931-4267-800e-2f3e05b7c351 | contextual-focus-2-l8-v1 | focus:0:94, focus:95:210, focus:211:321, guard | 1c95fb46f06b8d33b730c3d42fc5133681130e88ebe3d0a6fc3bc592708c4a99 |
| 071e0d92-92e4-4c2b-a038-19200d9e48cb | contextual-focus-2-l8-v1 | focus:0:185, focus:186:315, focus:316:457, guard | 0e0b153a958f080e602edbbd947f8b258f7f17ba17738d6d2b36d84d44221af9 |
| 07bf9748-1511-4095-a514-ad5042cf82de | contextual-focus-2-l8-v1 | focus:0:90, focus:91:153, guard | 0ed67779957ffadaf944d20b5f56645e62fa1b548b0f369055427e11b052396f |
| 0c28c1bd-88b2-473f-a3cc-98f614417e29 | contextual-focus-2-l8-v1 | focus:0:149, focus:150:281, focus:282:410, guard | 6b112ab320fa5fdc455f858e306b4f40aefe7d1f7c1c0f20835142cc1c178130 |
| 0ce7c046-a14d-4b4c-a9cc-15bbc16e23be | contextual-focus-2-l8-v1 | focus:0:105, focus:106:216, focus:217:352, guard | 565fce181066a1a9e5a2b8cec6d10be3228e77a8a253da35844ff5be425a79aa |
| 0f4c08fa-66b2-441f-aec1-ca8660d9b2aa | contextual-focus-2-l8-v1 | focus:0:111, guard | 348dd78ee902cf7da6912e6b68d299f805e6aa2d92f37ab905d50d3cb60373a1 |
| 10f2cc59-9fc2-4cbd-93bc-06a8994b4c88 | contextual-focus-2-l8-v1 | focus:0:90, focus:91:219, focus:220:376, guard | c1d5be170ae11536dc3cfcab956b2fbf88e2a14bcbe7d225b25a26a521901ccd |
| 112b24f4-6dc9-4347-8ed2-ced3d6773d77 | contextual-focus-2-l8-v1 | focus:0:111, focus:112:213, guard | 6843db97fdd8fabcabade0cff419048b94037a5aa210cbc48b39c8342495e0c0 |
| 126e80c5-1ae3-4f12-92dc-4f8aa8cd7745 | contextual-focus-2-l8-v1 | focus:0:105, focus:106:216, focus:217:352, guard | e6a7e8ab8b756386829a9d4d139f4f75380b83376b051a773558354068e587ad |
| 131e9fe1-de45-4183-82c9-794b92e4e091 | contextual-focus-2-l8-v1 | focus:0:111, guard | 3e27a13c3cb7fe18d1950783210065f5951b46b970c2e13fdaf01886c49e14fc |
| 13cd5f78-3c6f-4028-bc26-d1d0c7279c89 | contextual-focus-2-l8-v1 | focus:0:111, focus:112:213, guard | 841b270a74f5ee4b8bdd7a138f473cd33c2df74df32645c3f1ae74460375633b |
| 16c1ffe6-10d1-4604-9314-1bb2cd9f525d | contextual-focus-2-l8-v1 | focus:0:103, focus:104:170, guard | 3fd305402d43d84896d090eeb6579288661a53463a7dd1875c981b9c824cffa9 |
| 1b21f748-a842-4179-aefd-67d053ecea19 | contextual-focus-2-l8-v1 | focus:0:111, focus:112:213, guard | 23d1ea5dfb479836524c8472b6c20da7ddd27f4a3fa8877e79cdf45b9c8c8088 |
| 1b843e3d-d5c8-4dde-a824-be97c13de328 | contextual-focus-2-l8-v1 | focus:0:126, focus:127:258, guard | 0339dbb346a01393d2d5dba4debf6781c050981d773a430762643c5e2d4431dd |
| 1dd55a38-b6ce-46de-ad0c-b2ee256de7a0 | contextual-focus-2-l8-v1 | focus:0:156, focus:157:313, focus:314:405, guard | e0b7d365456d512626af4ddf695fbce2015e187648ea0c18242ef4297f4a4b27 |
| 1f8f42f1-784d-48a5-b599-98bfb0b56f4e | contextual-focus-2-l8-v1 | focus:0:105, focus:106:215, guard | e7b5fad81b30a6b9a1b4e4763aae45bcdf2266f0d565870123f76a6a4802f5ba |
| 200fa51b-d34b-45c8-a13e-c1c67ad99843 | contextual-focus-2-l8-v1 | focus:0:94, focus:95:210, focus:211:321, guard | 1930877bbe5d6227ca81f6903691ecfcd8801df93e74b0e7715b1cb2664234e5 |
| 224ba43c-c106-40bc-bd30-0e5ef2c80df7 | contextual-focus-2-l8-v1 | focus:0:90, focus:91:218, guard | 6300cec124b778908aa70075d3749bd49d33c9f35cd35939ade8c7f64e3a5cd5 |
| 2252438c-7ad8-4400-96ec-d43d46eb9de2 | contextual-focus-2-l8-v1 | focus:0:115, focus:116:244, focus:245:342, guard | bcb409e09ad6a3f62d50844a0af50e43a2fdea0f34d829615e9885528f6738fe |
| 22b386c8-0dd5-4cbc-8ffd-f8daf5f62611 | contextual-focus-2-l8-v1 | focus:0:111, focus:112:239, guard | 479767e3d7b5e33acc473b082d3ac504e2addf4f6ab01fb4b7b945bc0bab1626 |
| 23307b3f-c05e-44f7-ab43-43f48c1ebc16 | contextual-focus-2-l8-v1 | focus:0:90, focus:91:153, focus:154:282, guard | c46cf1322a3d9b883d0e26984e33269c09688175ac9c46520a1d4f0b9bd2480b |
| 23c6fd6a-c74a-4f43-b591-12a8e8efab32 | contextual-focus-2-l8-v1 | focus:0:105, focus:106:215, guard | ea766506ad4eff69b2ca5de97c69ab065abb4342bd753b8bd2118e5a7353ca76 |
| 25427c67-1058-4de6-ad9e-74dd574a560e | contextual-focus-2-l8-v1 | focus:0:111, guard | de77f048f262c45195c13cec50de4af169811ae34565317b11b7bfe29f267ce3 |
| 25c297d8-2869-4f9d-a53c-a5a90e3c983d | contextual-focus-2-l8-v1 | focus:0:106, focus:107:167, guard | 2d431870011552fe2dc1a0a5cea794263346da91eaff2050c15b675be90e060f |
| 27651a5c-309e-4481-b3c7-ee6b7a9d2ece | contextual-focus-2-l8-v1 | focus:0:106, focus:107:167, focus:168:231, guard | cce506a6327d8261747e93372c1724963e81b18a2817d5269181971f6abf351f |
| 2be1e9c3-c93e-45c6-901a-ba8534a129a0 | contextual-focus-2-l8-v1 | focus:0:111, focus:112:252, focus:253:316, guard | 3f03ad392c1df6021a672ed9da5e89205fdb14f146726c54c23651d2b5dc8c2f |
| 2c474237-97b5-4216-8d11-67dcf41ffbe5 | contextual-focus-2-l8-v1 | focus:0:105, focus:106:216, focus:217:352, guard | 805b0768d07b0a8e8bcd928e0e4888c7e5d10f6c3545fb8a9a999e7f26e85f7d |
| 2c8b7c2a-14db-41bd-ae9b-c7618f414978 | contextual-focus-2-l8-v1 | focus:0:90, focus:91:219, focus:220:376, guard | f882ec958d9d2a7e203de6b07c26fee91011b886247d7d56eb2bc346bfbdf873 |
| 301d67a4-ef0f-4866-97df-25b89f893923 | contextual-focus-2-l8-v1 | focus:0:105, focus:106:215, guard | ecb9fd297aa2a55a16edbcf05adf2411236eadb839b5f8975b120fa22bbe2989 |
| 3029599c-5a2d-45b0-970c-a72635c302c0 | contextual-focus-2-l8-v1 | focus:0:111, focus:112:175, guard | b652c655e06ee2de9eff33f5ac6d0418c41ea2e338dfbed54c0313ad739dd876 |
| 33100d4f-14b2-45b2-b528-63f4e66a8184 | contextual-focus-2-l8-v1 | focus:0:146, focus:147:242, guard | 810122a7d42a2f5af976a2ea7df6854b0e8c15262278fb22a8d038b49525a53d |
| 347f435c-7f3c-4629-b34a-1d76537f9d69 | contextual-focus-2-l8-v1 | focus:0:148, focus:149:331, focus:332:545, guard | 192eb10d5ecf37b51eda67014b9c55a7da2aaf51a9c46865ebd270ea0c72460b |
| 375d0e19-e884-46ff-85ea-bb0b781b78f1 | contextual-focus-2-l8-v1 | focus:0:111, focus:112:252, focus:253:316, guard | 722055203192ed167d025ad71889e7c74e00a04438027b7bd3df87027512e79c |
| 38e1ec33-cd71-4c8a-ba48-a9f0b2a72262 | contextual-focus-2-l8-v1 | focus:0:111, guard | e4b0478eda307ab59d95d39ee11449067f377857d347a7f556ccfa7271bc4c95 |
| 39456bc9-cdb8-4346-b6bd-59a51e54023e | contextual-focus-2-l8-v1 | focus:0:97, focus:98:273, guard | 804e79bb472327d332a74ed245486931a717f14e08332b249a96554e9154d6ee |
| 3aad9b21-0f60-474e-aaad-0bba689aba4e | contextual-focus-2-l8-v1 | focus:0:111, focus:112:252, focus:253:316, guard | 1c0438da47e81b845f932b944a9f9f4b6735a1d241d94ff2eaf64457c5933ad9 |
| 3dbb5e08-d5ca-4d63-9571-5dc156a9cfd1 | contextual-focus-2-l8-v1 | focus:0:145, focus:146:225, focus:226:342, guard | 6fcab1a7756f98e1726c8eb8b91ad226ad5611b756cd84bd933cf8ec395e7ee5 |
| 3e6386bb-8098-4fc0-a093-2766bd013aa1 | contextual-focus-2-l8-v1 | focus:0:90, focus:91:218, guard | afda458c2bcf318c133485706c009bf4a1066c86be8f176057caeadac5331ecb |
| 43625f23-2fe5-42be-92b6-23b004d266bc | contextual-focus-2-l8-v1 | focus:0:106, focus:107:167, guard | f66d4df55d5e666a1193555ccd577f075dc6f984653b9c313803c7376a750064 |
| 449dbab2-82aa-48e9-9554-03d68aedaf67 | contextual-focus-2-l8-v1 | focus:0:111, guard | a4506e113cf8896f857b7d9693e4f7dc87e8ff53e2c2ed596794aa15ed83dcfa |
| 473de97a-ae98-47c6-9306-759c0fe9ec56 | contextual-focus-2-l8-v1 | focus:0:179, focus:180:330, focus:331:465, guard | 1d333b9f03ddcf20048b597edfc9623c13d79f797f5ee15561e2dd942d7beb5e |
| 4a02139f-9b08-45b8-a2a1-560e02f7cd53 | contextual-focus-2-l8-v1 | focus:0:90, focus:91:218, guard | 4318264ef8b7612043626381cc7ca0935e243e48723b602af996aa6690920dcc |
| 4ded7086-6c31-41bb-bd38-5bebf05cd517 | contextual-focus-2-l8-v1 | focus:0:128, focus:129:285, guard | 17e6e3f754c2f81c2fe06f70a4c40dc6d2634c56ce248a5883697cd4d6ac4111 |
| 4fc44910-b899-4d92-a4ab-795399dab8ef | contextual-focus-2-l8-v1 | focus:0:150, guard | e81cb6bb6b44bd64df470557907bbbdc244d58fa2dec0c1de70d287a68b1c000 |
| 5168e83f-f3e1-4366-8391-3f8cb622f6b7 | contextual-focus-2-l8-v1 | focus:0:106, focus:107:167, guard | 9e72d9d76d5f19d8e2359a6e2691104b8313e4c2158cbda08e61c37a5aa72b05 |
| 56417e6a-4869-40e6-b85d-2333098b5b4b | contextual-focus-2-l8-v1 | focus:0:115, focus:116:244, guard | 563236b98d3bf64467d24ad503c5d13391d93879a85b9889d8555d2c2ba63260 |
| 5a35f84c-34b1-4d3e-8c5b-2d4b22eb5ad3 | contextual-focus-2-l8-v1 | focus:0:111, focus:112:175, guard | 6c7f5c2d4497bb1ee445212f76dddbbdfd57a0c06a2eea255b242bef4774263e |
| 5a80926d-ef5a-4a04-848f-fc2b5e57a6d0 | contextual-focus-2-l8-v1 | focus:0:90, focus:91:153, guard | ea296c19a4a734f1c19bc1aa6bc7d93abbb4d60183ec7756b7a498ef841a2ce8 |
| 5bde3fdf-2c01-4994-9968-a5e81e2da518 | contextual-focus-2-l8-v1 | focus:0:90, focus:91:153, focus:154:282, guard | b75a025d58e1e71dd92288964da9d8d2a8f0e11bb2c048580981a8e906507126 |
| 5d071d85-5f99-42a3-b255-9cf864cfbc3c | contextual-focus-2-l8-v1 | focus:0:111, guard | 8b3b3f0dc8820e35ddc1cc7e317f91ff96ddd30b2a39d32364d132fa458a2219 |
| 5d2b4b18-96a1-42b6-9421-0d18f04c115b | contextual-focus-2-l8-v1 | focus:0:90, focus:91:153, guard | 1c21b8ee42fba67adee0827ea097bad5513fc2a3a97521dacf2b8148b48486d1 |
| 5ec45d3d-d34d-4b22-b2f6-36f7e6b47d61 | contextual-focus-2-l8-v1 | focus:0:145, focus:146:267, focus:268:347, guard | d3b0d996a04f714d82f880bec23da0b2d026fc3e5e66ab7f2c157bf6fbe68de5 |
| 5f2390e0-5cd6-4349-b878-8f1060ae4630 | contextual-focus-2-l8-v1 | focus:0:94, focus:95:210, focus:211:321, guard | c8569e4684773d6cd20772ad4f70c72dcd60e2f1ab1476ed5419474c30772726 |
| 627716d1-3bc9-4a81-9bc3-b647ce499033 | contextual-focus-2-l8-v1 | focus:0:111, focus:112:213, guard | ddb906f594d039d138f83028d8a17c8673c9bbb668c2c16ef474365e930006e3 |
| 63353011-53a5-4816-bdb8-b41c9a3b4f1f | contextual-focus-2-l8-v1 | focus:0:90, focus:91:218, guard | 5d929e7085820bb4fb5afe1e77dbdaf4d13ff6a75e32e8990488267c4a4c4715 |
| 6588744d-7113-4ddc-96d2-dccaf688abcf | contextual-focus-2-l8-v1 | focus:0:187, guard | 2b08e59c2031cd386b7c3b4fff26e70fef788b6eab39d3c2c58b3bfad27c1b83 |
| 67219d9a-04f4-4ef9-b672-d77041399595 | contextual-focus-2-l8-v1 | focus:0:111, focus:112:252, focus:253:316, guard | 8a4420dc34a2160cd852f26eb8ba3695ea7ca3f17b7262f5902fa48e53541a1e |
| 6728d002-7492-4342-8deb-0f533a455da0 | contextual-focus-2-l8-v1 | focus:0:90, focus:91:218, guard | f53aa594b9f5aa9dacb9bef9213698cbb85cf2b3e0aad6cea6703bbb3e44f78e |
| 677b807a-aa1b-4686-a0f6-011d1ee0ccbc | contextual-focus-2-l8-v1 | focus:0:121, focus:122:272, focus:273:352, guard | f8a750dc383d4fb607d7d853a795a3946cf60f6b3abbfe08f68f9050e0744318 |
| 67db2670-8918-4911-9d62-b28b2039c7c7 | contextual-focus-2-l8-v1 | focus:0:106, focus:107:167, focus:168:231, guard | 650fbd0e09f1affa6bae51591b8337a40e088cc1f6d1c1a217c11548effa7fb0 |
| 68092853-0249-4477-b6b0-8d1328a7a9d5 | contextual-focus-2-l8-v1 | focus:0:121, focus:122:272, focus:273:352, guard | c74fcf90939a8f1be6803aeee06b526ac59e518dd8c9e9f06e1c572f786a6c11 |
| 69c03188-cdbe-4706-9465-157341d7efee | contextual-focus-2-l8-v1 | focus:0:105, focus:106:216, focus:217:352, guard | 702f14c8bac61012607c14c02634d40bee3c1644382c4e5fe832f5f927bf8a4e |
| 6b19401a-ab41-4e8d-9546-be12f3f59ba0 | contextual-focus-2-l8-v1 | focus:0:111, focus:112:175, guard | 3c8ff3e3115d13b645bfc8e5dca5fd81ea7df703b5e446c5e9de8553cb3eece2 |
| 6c5a1df0-46e5-4f77-ac4c-077f5122ab9f | contextual-focus-2-l8-v1 | focus:0:149, focus:150:281, focus:282:410, guard | 0c4f2a39a38a87f6ee63fe0bf7d592f125496d3d7ac28674428609c060f78c1e |
| 6c80b84a-cd71-49f4-ad51-feac3326b3ac | contextual-focus-2-l8-v1 | focus:0:185, focus:186:362, focus:363:458, guard | bd6937a984730c6c64f0e5895c87ada32dc4cefdd3d9a60c035e3d7ae4f062fb |
| 6ccc0d5b-3859-4562-839d-b6ec8094be9e | contextual-focus-2-l8-v1 | focus:0:106, focus:107:167, guard | 804dc5b07f983a5890e0d029a467f2384bce309429ad9a991f261a6af8683b57 |
| 7077e0a5-ae07-4a47-b6c7-36923c7b92a4 | contextual-focus-2-l8-v1 | focus:0:105, focus:106:216, focus:217:352, guard | e6a8e420226783312d07b2443f2a02aebe3718f4a2e1dee96438ad4e22e21240 |
| 70d1c110-5a0f-40d7-8bb8-4b8db08ee825 | contextual-focus-2-l8-v1 | focus:0:149, focus:150:281, focus:282:410, guard | 8a082bd3501839df510fa8f037a2694a3d4bbd96e838e7ce7b5114ecd2b96fea |
| 724dbfe8-707f-40dc-a572-e31eebe2a035 | contextual-focus-2-l8-v1 | focus:0:105, focus:106:216, focus:217:352, guard | f602a04bd7b51efd575b6b946cdcaaedf60bdd232799c7d78a1e28b3d7fac86a |
| 75dad75d-62c0-4201-be77-d5350294b4a0 | contextual-focus-2-l8-v1 | focus:0:91, focus:92:242, guard | 7d0cad0d49f94f7e4b9f5e417486f76e0c52dd202a73ee399dc88933e4cb1ab1 |
| 7799115a-5191-4aef-b96e-c8f0ef3dffdd | contextual-focus-2-l8-v1 | focus:0:111, focus:112:175, guard | bd747a862c15377b5a2f6791ea0297153723ae04297ca2e7d5b4b28d75c7ce0e |
| 7806569e-bd56-4691-bac1-ee4ce8f6f900 | contextual-focus-2-l8-v1 | focus:0:111, guard | 5ac6715992cf8b39ecb3bfcbdfdede13aa7967e0cfd0679c46c422bd9bb6bc6e |
| 792af76c-46fd-4497-b0d1-594177244125 | contextual-focus-2-l8-v1 | focus:0:152, focus:153:342, guard | 25e76a171e0a24c2e375f0d06bbe3485bec2501ca42cc7a6ae048d3bdc99edf5 |
| 79d311be-6dab-4f13-8b3c-2417dd05066f | contextual-focus-2-l8-v1 | focus:0:103, focus:104:170, guard | 80039b82c95b656e74253603f68a88cd42770bd6e1dcb4982feb18ae734249cc |
| 7a7aa2e7-2d46-4301-ba0d-d1bacb907325 | contextual-focus-2-l8-v1 | focus:0:90, focus:91:218, guard | d904fce0e520416515a1162db8f8a79aa5634b309aaf6ae64282830d9b88c509 |
| 7b617ef2-4ddc-4813-a3c9-e74eae7c1080 | contextual-focus-2-l8-v1 | focus:0:90, focus:91:218, guard | 4056bbf646fed1ee4ec6c0d4de29f9151daeef6ea65c8611cea5973d766ec5f4 |
| 7c0b1a0b-c1ed-4f77-8360-b0350a645580 | contextual-focus-2-l8-v1 | focus:0:111, focus:112:175, guard | 02c6eae05d3f1b26ff392796c621d263dae3463cf26dda0b3d4f709e430cedf7 |
| 7ccc1ee3-3659-4e1d-be54-401fe915c5d9 | contextual-focus-2-l8-v1 | focus:0:106, focus:107:167, focus:168:231, guard | ebfacf5d338bf564dd7f1b20b0b85dde9db8406969e44a3d121ed0b800249065 |
| 7d6ee442-8d3c-41f2-ac72-123cd93335f5 | contextual-focus-2-l8-v1 | focus:0:115, focus:116:257, focus:258:369, guard | 943b4e5ec0a6b85b1c28d82a41b180af9f163e46d516c36d00ef24716410bff3 |
| 7f70d7a6-81f5-422c-87af-3f6140ba5447 | contextual-focus-2-l8-v1 | focus:0:105, focus:106:215, guard | 43d008c42ca5715cc7292c44e145219626733bb99b56d2fcbdc1b43ca21460a8 |
| 7fc8d18d-4da6-48e9-9c6f-d05e25561062 | contextual-focus-2-l8-v1 | focus:0:162, focus:163:321, focus:322:462, guard | 0233fd3ee1871d6be6f5ba273b6764d8eff5e2e596ecbc34d3fbf4a7eb1d998a |
| 80c4ba5f-ce76-45e8-9703-84af442939c8 | contextual-focus-2-l8-v1 | focus:0:106, focus:107:167, guard | eabfac8aa999373422793121fce73a28969a2deae21518c2058a2aa3cf9a690a |
| 81663a30-6b4d-4194-8bed-dfd6ea1edc3f | contextual-focus-2-l8-v1 | focus:0:105, focus:106:216, focus:217:352, guard | efc915e8f2fc023b06905f949e1a1126ab76787d6176783318d6bf4a52cc36a5 |
| 82cd2719-d634-4ebf-903b-15fd70f6bc1e | contextual-focus-2-l8-v1 | focus:0:156, focus:157:313, focus:314:405, guard | 54638296ed9af6bd9d30046babe83d343f9f3da794102230c63e2828010aade7 |
| 82d3dd75-482d-438d-b4fe-f50e49f3d56b | contextual-focus-2-l8-v1 | focus:0:105, focus:106:216, focus:217:352, guard | 4e046f47b2bab7285c1cdcaf898caa45ffcb3067d6c4e73e7e63fd7f93d99a07 |
| 8903e51c-8301-4541-b1e0-f81b00143cbc | contextual-focus-2-l8-v1 | focus:0:105, focus:106:215, guard | 6ea1381b5e4eb83e366417844bd032ab8f8c54f6e78193d9dcb37791da45bf35 |
| 8a2030e6-b0ee-44c8-93aa-6fd04f2c60e1 | contextual-focus-2-l8-v1 | focus:0:111, guard | b9f6be7b861f744d38d7f2e0d39d44265e772c7aa0bfe95f2fd371f619e2522f |
| 8a7a8969-0641-498d-b586-d18ab786f2dc | contextual-focus-2-l8-v1 | focus:0:111, guard | b15cd57742be3a8ca62fe082d077b0a1aff580faad43092c5765d35a2d4b9f4a |
| 8ad2f038-ce6e-49b5-bb64-f51b0777a17d | contextual-focus-2-l8-v1 | focus:0:128, focus:129:285, guard | 3c944d822c22b911e596fecebe992d3c86db5cb425180ede494350c1b14bde5f |
| 8b1b934c-b11b-452a-bc75-9a0347aa60c0 | contextual-focus-2-l8-v1 | focus:0:106, focus:107:167, focus:168:231, guard | 1a30e7ffce0fdd003c877007c97401ea2acd9657e14552cdbe935de10cb78aab |
| 8cc4583f-b260-4489-b688-bd72508f5ca7 | contextual-focus-2-l8-v1 | focus:0:174, focus:175:321, guard | 32ebf2fd247e07fbeea984f86c1d7c2c7cbd4c6bda424c7976ca73f015e71105 |
| 907e99e2-e705-4a83-87d0-48baf42b7a42 | contextual-focus-2-l8-v1 | focus:0:106, focus:107:167, focus:168:231, guard | 1c1e954b70043546f0fed08542d8ad5a679826d1234e014e54f7bb07d097a976 |
| 90ff3928-1049-42a4-aaaf-e11e30adaaae | contextual-focus-2-l8-v1 | focus:0:105, focus:106:215, guard | 29b6d1a5c29d5f1f3dfc850e69d3a9c560e4cb854070ec4a8274b132c66715d2 |
| 92427a9b-b110-454c-ba5d-a9842fbf87d3 | contextual-focus-2-l8-v1 | focus:0:106, focus:107:167, focus:168:231, guard | 998210a59c78f30e11a0f6e2c8ac8989ffda8b36947ccd1ed8fab2572e8b2418 |
| 943d6412-ebf6-47e3-8ca4-e952094e5623 | contextual-focus-2-l8-v1 | focus:0:106, focus:107:167, guard | 26b2ede8c79a52ba81562a16191b3b49170e13fb058575d3c7738f80f74e6cc2 |
| 94438aa0-7eda-4401-a6c9-ef7cc4607391 | contextual-focus-2-l8-v1 | focus:0:111, focus:112:213, guard | 35f8edf5b1cc84caefd355d7ea0b72d545798336b49574f31c778eff1f9fabdc |
| 95652533-7264-4cb2-b873-32fb5ff02b9e | contextual-focus-2-l8-v1 | focus:0:90, focus:91:218, guard | 4346ab3df0371e23418b4f0723db237d123b0c4c0a7299a73c12def05ad10095 |
| 95978e16-3ec1-42b2-aec8-94e850d0540c | contextual-focus-2-l8-v1 | focus:0:106, focus:107:167, focus:168:231, guard | 27c4c1bac8029b08699b40460919f395985284873a4f350fea9657d6cebbccbc |
| 95c9ebe8-f6db-42b0-85a1-6f4bde72324b | contextual-focus-2-l8-v1 | focus:0:94, focus:95:210, focus:211:321, guard | f9c39c448cb11a2c2ab062919d2e488aa04cdd891a23dff40edc49d0c70ddd3b |
| 98712014-b7ce-4650-801e-b6f0b0d2a5d7 | contextual-focus-2-l8-v1 | focus:0:90, focus:91:153, guard | 0667ccd345df5ad002d7501a4ecc6df49fd52c32c46ca908398bcc8e1df69c3e |
| 98c5663a-fb4f-4053-a74d-f6314c8a5373 | contextual-focus-2-l8-v1 | focus:0:111, focus:112:213, guard | 7f3e976397013950a7eae5d50eefbf32e94dd69b4fc5a303f5802f0df6b59805 |
| 99177135-756f-47c8-9f94-99cacf4626d4 | contextual-focus-2-l8-v1 | focus:0:106, focus:107:167, guard | c8afb7dfc2bb064080b9db9dbe2c2752ee9c81517b536780231bdbdef6597f1a |
| 9f95e982-b0e0-4060-811a-54ff9c2db4a9 | contextual-focus-2-l8-v1 | focus:0:105, focus:106:215, guard | 70d60c903ac0f24974964b32dcefc630aeede89882ac1849b51b5fb864d3c126 |
| a153f3e0-3376-48a0-82a0-23047e92f5d4 | contextual-focus-2-l8-v1 | focus:0:94, focus:95:210, focus:211:321, guard | 6c43a72c3929c39cdefb99e40185f701f3783133ea8e437964a7259a472cfc8c |
| a26c8f2a-b52c-47b9-9d6f-d2b6a835712a | contextual-focus-2-l8-v1 | focus:0:106, focus:107:167, guard | 3f65d0b4fd2f9c7d143e0a01028411e09bc9a38a76bfb75c1c02366314e9c24a |
| a36bafbf-70ca-4dd4-af0e-21b2ec860588 | contextual-focus-2-l8-v1 | focus:0:103, focus:104:170, guard | b3f69944ed17796762625acdfe0bb1c30e4bd5975c51252d5e9c18c15053685a |
| a5830d3b-0a91-4f01-8ac4-1e8811fad7d1 | contextual-focus-2-l8-v1 | focus:0:150, guard | 4040cc58e52063bfeccd1db9ee78f2a3da3d648d0fa1a7a998420d3aaa4e64b3 |
| a622d973-2b7b-4705-a2a8-6b419fdc2beb | contextual-focus-2-l8-v1 | focus:0:111, guard | e19c421186081e97e75f459f1dd3fd90493533f70d797d63d81b64d17a79e04e |
| a8d81236-2ed5-413b-964e-fb71550ef9be | contextual-focus-2-l8-v1 | focus:0:90, focus:91:219, focus:220:376, guard | 22943f24601e2300d92bcd16bd00dac9eab361f446aee41f351db86146b23910 |
| aa5044f8-024b-4ee1-a9ec-6c8b89a4dbfd | contextual-focus-2-l8-v1 | focus:0:106, focus:107:167, focus:168:231, guard | 24bf5a6cc47a8dddc81e320fe96777918cfc51c23d3695fe9463880db5d3fd22 |
| ab31123c-0c31-40c0-96f1-2f1d64eae519 | contextual-focus-2-l8-v1 | focus:0:94, focus:95:210, focus:211:321, guard | 48390c17045887e7f3e064b044ac869132b80c3c4fc478ee5c4d513c9bf60566 |
| ac6841b0-e152-46f3-a393-4ed9af3a5ed7 | contextual-focus-2-l8-v1 | focus:0:94, focus:95:241, focus:242:369, guard | 5a320033935d426920afeda948e0d93a207c8ce689d35615b6c619326d4bacd5 |
| acd3e2ce-5f15-4199-bb7b-147f218a21ca | contextual-focus-2-l8-v1 | focus:0:115, focus:116:268, focus:269:414, guard | 3ecf315f02b564a4e0dc9e1f941f25f486854f7a6ff9b71a1bd07a841ab01b82 |
| ae1d25ae-cf8f-42bc-b233-14752a4cb3ab | contextual-focus-2-l8-v1 | focus:0:90, focus:91:153, focus:154:282, guard | 6a3b6b4455f643fa19df4a77f02da3041586b7793bcfd1513b0e5b81a6683123 |
| afdcdd2c-3f3f-4e47-92f1-b1d588593bdd | contextual-focus-2-l8-v1 | focus:0:141, focus:142:318, focus:319:328, guard | a9349c15a589338eeed65e178bde83c7fb3d29ffaf895a23e018e085306fb6ec |
| b126fed1-d1b6-4f52-be1f-104fa1f9b818 | contextual-focus-2-l8-v1 | focus:0:150, guard | 8840105de47bd50cf4d16f53269b9b3223f86b9aa74cbf52e6bf9c30be92c1bf |
| b1ef2a40-c274-4069-be59-68c552f2fb95 | contextual-focus-2-l8-v1 | focus:0:179, focus:180:330, focus:331:465, guard | f08b5774f3cdeeb6c0988501800baeee52b726f7059badc4f8c9a6f48da48613 |
| b3c5efee-a25d-4573-a292-e47836e32182 | contextual-focus-2-l8-v1 | focus:0:179, focus:180:330, focus:331:465, guard | 04f88d745bbd5286fb97a68c469162840da51d6bbf2ad62adf6e6ee63f9610b3 |
| b4e3cc3f-124d-4b9a-af5e-54e4460fe36c | contextual-focus-2-l8-v1 | focus:0:111, guard | ed22a5437be35cc374bded023cd11aad5e123f620d6c08f238b362f08ef54364 |
| b591f965-15c7-4daa-989b-2c9329053488 | contextual-focus-2-l8-v1 | focus:0:94, focus:95:210, focus:211:321, guard | de511a6fcdd8e513b77eba8c98e05b6e7f593ce7d97d699267bd94acd43a05cd |
| b67c254e-8182-4017-8b7c-d4c68e28a457 | contextual-focus-2-l8-v1 | focus:0:90, focus:91:219, focus:220:376, guard | 9f7809776cab70b7ce31ff21ec26af2d7205c764ce90aed210d2235be2280889 |
| b6b5c4fc-ac15-4aa4-8e8c-98d2fe03408b | contextual-focus-2-l8-v1 | focus:0:111, focus:112:213, guard | a3d63c2115cf6a5d7fde94c8ec9c7311bcf9ed290b98ddd7979552e64f3ff2f3 |
| b87b4bb6-2901-499d-b41a-4c90e32de999 | contextual-focus-2-l8-v1 | focus:0:106, focus:107:167, guard | e982ad2f7d5eefc7222ae8c6fcb56e37e8b8decb111032170739fd6721dafaa9 |
| b9b4d57b-a03e-49b9-9c6a-0f1034151b6d | contextual-focus-2-l8-v1 | focus:0:185, focus:186:362, focus:363:458, guard | 99dff026f441c9a5bb7e3955e6c73cca096e027003bec98f4c7772e1a12ddd1d |
| bc8086e4-0fff-4058-a94a-9133820f5623 | contextual-focus-2-l8-v1 | focus:0:90, focus:91:153, focus:154:279, guard | af249a5672bd0c6cf2b8404b999cbd742d422c5b1795ca10098fbece54f5f09f |
| be441f0a-e19a-4de7-8da1-0d1b7b03199e | contextual-focus-2-l8-v1 | focus:0:105, focus:106:184, focus:185:290, guard | 01104cff811626bb2fc04ce9fb281a0469e7ce8633f91ac9ce606f2871f62405 |
| c06d71b7-f5ad-4deb-ab2e-08bca5a4a8d3 | contextual-focus-2-l8-v1 | focus:0:106, focus:107:167, guard | 2578faa55c9581b49dd0c6410669fab2a53d5ce2645a9518dcd4bbfc2e1ab328 |
| c4d7fb65-1d8c-49c6-8b3b-6a9e0cd9ee90 | contextual-focus-2-l8-v1 | focus:0:105, focus:106:215, guard | 119452cdc592a2467f3b1359099ce96873635ebc4fa28fe4dbd7181d0ec46cd2 |
| c5ec8d8b-2574-4f0e-947c-d73503e49f33 | contextual-focus-2-l8-v1 | focus:0:90, focus:91:153, focus:154:282, guard | a129512ef93af7eb45ec458bead465d16bf80418ef1db9bcd1dcef32b56386ee |
| c5f60103-fd42-4c46-96e5-1a560f694326 | contextual-focus-2-l8-v1 | focus:0:128, focus:129:285, guard | fd64aba442c09bcecfcc2907f2d95c111ceadd4db60d755c4b29aea772a147f2 |
| c6040c50-f9f2-4415-a6e6-077484bec73c | contextual-focus-2-l8-v1 | focus:0:90, focus:91:218, guard | 9318685384f5469669efbef5b395745aad7a965ab3b6fb218c5389820131332d |
| c61fd468-8e5f-4ba7-ae15-20fe80e0df79 | contextual-focus-2-l8-v1 | focus:0:100, guard | 9c1d2bb22bffdb044c628a594525f166095134daacd3a321c4ce6e39d72dfdd0 |
| c678d289-a67a-42a3-8033-7b3295531ec4 | contextual-focus-2-l8-v1 | focus:0:121, focus:122:272, focus:273:352, guard | 481ad8c0727723bdbf2fb1ebf91dd4e4acb36edf89dd7ba94f0984a128fe1e37 |
| c7f4c8c8-f157-4026-90da-e9656a93e686 | contextual-focus-2-l8-v1 | focus:0:90, focus:91:153, focus:154:279, guard | 93fd29a4d2e63dac59ffdab3e788b1ba0e9e723a3701f9a83b71217460b97358 |
| d05f9164-3adc-4316-83b6-1c3b6d3cfa21 | contextual-focus-2-l8-v1 | focus:0:106, focus:107:167, guard | 8c478c881e6aa067aaaec0bb09e8fe5e098ac3c7782eb0514ddcf40d834b848b |
| d0b02606-5260-4649-ae07-f2e92d1c9436 | contextual-focus-2-l8-v1 | focus:0:111, focus:112:213, guard | a6dd5a22ff536b02e292043465e6922b61f4cd133eab8aa83cda942cf14f62b7 |
| d2f44620-a523-4d08-821a-baaf05d0effe | contextual-focus-2-l8-v1 | focus:0:111, focus:112:239, guard | 4dc704b78959d9e966b903f9033a1b969a39cf278fb6a96a79c5d0c7c808091e |
| d32fe662-835b-402c-b28d-fc80bf90f31e | contextual-focus-2-l8-v1 | focus:0:111, guard | 1d4c2cd70b24336e35f1b973533b3bc078245bcc6612525000e94f25d38a9a30 |
| d4f3354d-a5c2-40bc-aac1-781accd6249c | contextual-focus-2-l8-v1 | focus:0:111, guard | 5167ea85ceb9d51c362a070dbaeb638d9c8ecda3925f21c730e8e3c7225f2d0f |
| d57fb7d3-8a13-45a0-bce0-ac3e9c4635b7 | contextual-focus-2-l8-v1 | focus:0:62, focus:63:191, focus:192:348, guard | 6872c91730bd5d40d976beec52c9dc1581081ba206a8e26fcaf11e5e8eac236b |
| d7e35c6f-c94c-442b-8e3c-e99ee31325d0 | contextual-focus-2-l8-v1 | focus:0:105, focus:106:216, focus:217:352, guard | d63996e9b69b490d6fef8154aea4716cdad9083ce328de37ab47692c4690f469 |
| d7f52376-6fad-4fe8-b039-810cc6b4d3ce | contextual-focus-2-l8-v1 | focus:0:150, guard | 02d3599e9e14819a0101be4b515352eaa6312b4b9aed3ad3e0401de7e6021bbc |
| d83d40fd-a4b8-48f4-bd35-7ea050edd20a | contextual-focus-2-l8-v1 | focus:0:185, focus:186:362, focus:363:458, guard | 436005501260621caedeb82cbb2b5271f8754276e09ab7a52635c345f7987b43 |
| d9068be7-3ece-4733-a63b-34bc581b554b | contextual-focus-2-l8-v1 | focus:0:90, focus:91:219, focus:220:392, guard | 6583d44f4974602c39e5655bcda2a2e90e46f2ca1eb099629d509f61933b7eeb |
| daa06baf-eeaf-48f6-ab13-696a3d50ae3a | contextual-focus-2-l8-v1 | focus:0:90, focus:91:153, guard | 2ef5a46ed2bcf13644c183a44bf804887b166ede1a53d01ae649d533c1360e52 |
| dab41a58-aa22-4b10-a46d-747ea9ed5d18 | contextual-focus-2-l8-v1 | focus:0:106, focus:107:167, guard | 189e9d7fdd5254feb02253c8694924aa86fd315f2c14010756c94995c03d05b4 |
| dd545f0e-a8f0-4ebb-9d75-299db3237b57 | contextual-focus-2-l8-v1 | focus:0:94, focus:95:210, focus:211:321, guard | 6c129681162d2849f323505ec8b958c8c5159d89e07c1088c08ec4493c61a2ea |
| de54b205-d80d-4f34-a49b-49c3a4c7bb16 | contextual-focus-2-l8-v1 | focus:0:94, focus:95:210, focus:211:321, guard | fd8e7f74cffce36e454503091af417941caff9383bb6a204eb9fb69fa901f8ec |
| e0607828-ae83-4c71-81c6-2f178bd3ba4a | contextual-focus-2-l8-v1 | focus:0:111, focus:112:175, guard | d222bb2205f10922dba5d0b7bcef78005876a4fad95690d367682fd0ff1a08e2 |
| e1b6fd82-ecc5-4995-95aa-67cdfad56613 | contextual-focus-2-l8-v1 | focus:0:111, focus:112:175, guard | 3cca41c949c778570f5ca49720fbfc40a98df9412a5c315481daa154fdf6c095 |
| e3595da8-061e-4e4b-a421-462481f1d314 | contextual-focus-2-l8-v1 | focus:0:111, focus:112:213, guard | 0d36b36ed88ece19e02072ef797db6cec3e68c2564a314981f7526019a1892e2 |
| e719573c-a9a0-40b3-b36e-7312041d74c5 | contextual-focus-2-l8-v1 | focus:0:108, focus:109:279, focus:280:430, guard | 969a317d4857f652ef2f38b6308b7fd9f1e6f0960fd7c570ad8ec65a89904715 |
| e78057f4-fa89-4c64-a912-9fbd203fe967 | contextual-focus-2-l8-v1 | focus:0:111, focus:112:175, guard | 323e1eea3cf999e0b95286ee5f4dcb78d0a89202fd588e84cf6e10ff66972794 |
| eb7cb962-29d5-4199-9701-e6221a365255 | contextual-focus-2-l8-v1 | focus:0:105, focus:106:216, focus:217:313, guard | f14c99a5bf804c46dbcf5e8db75dd2ca8e6efc61db2fd6828d96586422691650 |
| ebef723d-f061-428d-a2bf-57190cbf6c17 | contextual-focus-2-l8-v1 | focus:0:106, focus:107:167, guard | 3cdc94aa90ecfea6b315a6f938f3038259d770854c0fa2508b607b5a2f6360c7 |
| ec4b3e73-d26c-4648-a1bf-9a7382b046d3 | contextual-focus-2-l8-v1 | focus:0:111, focus:112:175, guard | e427c70ec9d1dca90664cc6fd7fcbd1909597de0f7879646a8ba7328d3e608a0 |
| ed142590-0316-4302-b07f-cfd2a70e076f | contextual-focus-2-l8-v1 | focus:0:106, focus:107:167, guard | 069ac56b0cd6222138b2c165c97229d8e4ae1eaa0dcd1e091a5171e47eef71da |
| f24faf6d-7cab-492c-8069-5356984adf1c | contextual-focus-2-l8-v1 | focus:0:156, focus:157:313, focus:314:405, guard | 8e19b3b64e5e6ecb0e6327d01791ee753b66ebcb71bb9117e5f29e24787a5706 |
| f49d75a8-aeba-4e79-936c-c7e44e107303 | contextual-focus-2-l8-v1 | focus:0:90, focus:91:218, guard | 38fa2da47ab23b72239570863a05011e4708e793ea50ce5d928f150c53d0abb9 |
| f7304d39-84d1-4f5c-8e26-6b836a8267d6 | contextual-focus-2-l8-v1 | focus:0:90, focus:91:153, focus:154:282, guard | 6d4c8fde7728e8e39c0c23e9afef54dfbc677ce1dcdff1f755bfffc72a758aa8 |
| f8a6b816-c5bd-4751-ad8b-90f936f4d397 | contextual-focus-2-l8-v1 | focus:0:121, focus:122:272, focus:273:352, guard | 8325603bf2d06ba301026d853296eb81b8d93b85ba7a60b7848ea453683c44d1 |
| f8f9692e-2294-4753-b3cf-1d64060684c8 | contextual-focus-2-l8-v1 | focus:0:106, focus:107:167, focus:168:231, guard | ddeda827ae1d1f1086aafc531f162960069e6c348455f272b5268aa5d2e6f209 |
| fa3c5ae8-f69c-45de-9954-300ce8eccc09 | contextual-focus-2-l8-v1 | focus:0:111, focus:112:239, guard | 949546bc51e1198a1af390ed8a97c232ab009f102e89374df071d6eaf2db016b |
| fad4989b-a475-48f3-a95a-4d1fb8f6ad9a | contextual-focus-2-l8-v1 | focus:0:111, focus:112:175, guard | ab68d5ded82d882876482c3edb98c7e8137866d5648e924baeead0ce17b60a6a |
| fc15cb24-f6f9-48cb-9bfc-74cb6025ce95 | contextual-focus-2-l8-v1 | focus:0:94, focus:95:210, focus:211:321, guard | d53123da6bb23897de77298cf19bc859a4aab8e39d466689a4f80d343cccf23b |
