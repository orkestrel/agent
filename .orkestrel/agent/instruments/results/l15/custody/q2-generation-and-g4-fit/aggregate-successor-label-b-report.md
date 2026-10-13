# Independent support labeling: alias b

All 179 packet occurrences have proposition judgments. Root owns adjudication and acceptance. The judgments use only the released alias packet; no model identity, scores, earlier grades, private mappings, other packets, or campaign artifacts were read.

## Seals and census

Run: `node tmp/units/aggregate-successor-label-b-reader.ts write`, followed by `node tmp/units/aggregate-successor-label-b-check.ts` from `C:/Users/mikes/WebstormProjects/scaffold`.

- Input: `tmp/units/aggregate-successor-label-b-packet.jsonl`; SHA256 `64b0f89566458745c8099e9351db3b44686102145721ef9395bbd8e06e9d57f5`; 3263411 bytes; 179 records and unique occurrence IDs.
- Output: `tmp/units/aggregate-successor-label-b.json`; SHA256 `51e53477083dad07e229b951a796b857017f58627310a3e595d844dabfbb53cf`; 231369 bytes; 179 labels; 581 propositions; 779 checked literal source quotations.
- Exact semantic groups: 45. Every item digest is SHA256(JSON.stringify(originalParsedItem)) in the original parsed property order. This binds each occurrence to its unchanged revision and components as well as its semantic fields. No original item was modified.

Verdict census from the check run:

| Verdict | Occurrences | Exact groups |
| --- | ---: | ---: |
| supported | 136 | 36 |
| unsupported | 0 | 0 |
| contradicted | 15 | 5 |
| ambiguous | 28 | 4 |

## Method and checks

The reader checked the released byte count and SHA256 before parsing. It checked each record structure, then parsed state and required exact equality between state.candidate and candidate, and between state.evidence and the ordered source strings rendered with their day and role. The question in every displayed group was either fully displayed or compared exactly with the fully read question from group 0.

Grouping used exact string equality of JSON.stringify({candidate, question, state, sources}), with those original field values and source order retained. Hash equality, text similarity, shared names, and common candidate text alone were never used to group. Every complete distinct candidate and its complete evidence were read. Groups with the same candidate but different sources were reviewed separately. Judgments were authored manually in the owned judgments TypeScript file; source indexes only select exact quotations during serialization. No regex or program inferred semantic verdicts.

The checker independently re-read the packet and emitted labels. It checked every ID, the original item digest, exact schema, nonempty propositions, permitted verdicts, verdict consistency, and contiguous literal source quotations. The valid output passed. In-memory negative controls exercised the same checks without modifying either file:

- valid: accepted; ID/hash bijection, schema, verdict consistency, and literal quotations passed.
- missing occurrence: rejected; Coverage mismatch.
- foreign identity: rejected; Unknown occurrence.
- wrong item hash: rejected; Item digest mismatch.
- invented quotation: rejected; Quotation mismatch.

## Semantic decisions and ambiguities

- Groups 6, 11, and 19 are ambiguous because candidate endings truncate material identifier or deadline values to `FL-66`, `202`, and `2`. The sources contain complete values, but the candidate cannot establish them. A reading that treats the identifier fragment as a complete, different identifier would instead be contradicted. These are not presumed harmless omissions.
- Group 14 is ambiguous because its undated paragraph anchors Tomasz tomorrow/today to October 9/October 8, then uses day-end language from the October 9 Grace message without preserving that source frame. The other substantive assertions are supported.
- Groups 7 and 20 retain Marcus as the required signer while later evidence delegates normally-Marcus approvals to Ruth through the summit period. The source-date prefix does not identify the old rule as inactive. Groups 22, 27, and 31 occur after the expressly bounded delegation has expired, so the standing Marcus rule is again supported.
- Groups 18, 33, and 40 retain an unresolved late-order status after supplied evidence reports delivery, without stating that the delay ended. Each receives contradicted with the supported identity, order, and condition propositions preserved.
- Groups 35 and 42 end with bare `Copperline` or `lookup_` fragments. Those fragments add no material predicate or value; the completed factual assertions are supported by those groups own sources, which contain no delivery completion. The bare `tool:` ending in group 33 likewise adds no assertion; that group is contradicted for its retained late status.
- Pronouns and source headings were resolved only from their supplied adjacent sources. In groups 8, 30, and 44, the rug-exchange pronoun refers to Beatriz; the candidate does not expressly give Luis that rug request. The Owen Pritchard heading in groups 5 and 31 is present in the source and does not assert that Owen remains buyer.
- Group 37 explicitly corrects house number 19 to 91, so it marks the old value inactive. Group 36 incorporates the October 10 wrong-parcel discovery: it restores the replacement need after the intervening collection and closure report. Requests, conditions, and ongoing dispatch wording were not promoted to completed actions.

## Occurrence coverage by exact group

Group numbers are zero-based reader indexes. Every listed ID has its own output row and original item digest.

| Group | Verdict | Occurrences | IDs |
| ---: | --- | ---: | --- |
| 0 | supported | 8 | 00fe2c73-321c-4e8f-ae7c-f15b465727de, 0111027c-8c1a-4a1c-8af8-30c2c438c565, 31c4c0c2-34a3-4223-b220-b89020a20609, 71ee1a7c-53de-4f0c-aa10-25e26e3ab6c3, 7fbf98d4-9d28-4aff-a85f-487bb57148df, 8ccfac9c-f264-41bb-99b9-44a0c0a50863, aaf5b004-c33a-447a-942e-32834564a010, c6998577-c0f9-41f1-9347-8b949e1e8665 |
| 1 | supported | 14 | 08ba19dd-d0b1-4a5d-9951-796c6da7147c, 16fab154-b237-4a00-afec-5a1d5948a1f3, 2864d6f9-03cb-41d5-8aa0-bb118eec7959, 45bb2106-f0de-4c4e-9a5f-33d97d6a0893, 491ac9f5-d196-4652-8e8c-629c5bd46afe, 5eb616e5-1a59-4bbc-b3e7-1c021e1a5516, 805e435a-225f-49e6-ae7c-49d649ab78a5, a6fcdb48-4f68-4223-9f6f-bf5060413b48, a7db053b-b7ac-4a06-b38d-1c47a8362090, bbfb2ad4-9179-42e1-90a2-cf6ac4974892, bedce066-c655-4759-be3b-b19cc6cb93cf, ca003bdf-8ff1-41cd-a919-ddd06239dfb0, d63cadaf-2fe8-491e-8447-63da0d60fb63, fb53fca3-5dbe-410b-9c48-ced7ef907c20 |
| 2 | supported | 13 | 0c59df62-b8f4-4aea-85ff-cb6459e711e4, 1c72c858-f1de-4a48-886b-05c51261cb5b, 1f4f02ef-6e34-4c03-b99d-f391b4ca5bc5, 24bfb723-392d-45b4-8ba3-e9f9b333d2b5, 34c82f90-e186-49ba-afa7-d7b3fea7c73c, 3d6704fa-8943-4c23-9b3c-34f3f853876a, 505daabb-5e02-42e0-b977-a721e4ea1465, 751a381b-4297-4f5b-a5c9-489df05a084b, 84cd94ab-ca3f-47bc-adf5-58e64af166ed, aee07fea-7046-4f33-aa9f-f933c73af6a2, b829c5a9-7969-4491-83c4-6ef33c9fef50, e808c1ea-6193-4b6f-a2fc-408b5d6d5820, ed161bd3-bf05-44e2-8878-aa10e0beb8ab |
| 3 | supported | 10 | 0e14ac6e-36d2-40d2-97b9-25ba49e188bf, 260b75f0-42f4-42b1-a7ee-c128c31dfeae, 296f1503-67ab-45aa-b152-dae9167b0966, 34d1185d-4e6b-4198-be92-3b6116c4b26d, 37a380b7-37b2-4c3a-a0ed-ed7369d70b74, 64ebed55-7352-42d2-91ba-17ef14264b65, 686fa808-e6f0-408f-baed-938aeef34183, 87ff0116-335c-4acb-aeca-6286e9fe7e3b, 88121604-25a9-4da8-b168-c0f933b9358c, b8d097b3-ff89-436f-bf2b-ecfc84fdaf14 |
| 4 | supported | 10 | 0e223ed6-464b-44b4-a0dc-4deeeb67680c, 1ceb67f1-b02b-4d2d-914e-6d2b791d91ed, 4b5fff43-98e9-490f-b8fe-79115939957b, 76c55384-9535-40d2-8ab1-36bee38c3057, 9d921358-7536-450c-9e89-8259eace36af, 9ee0f7ba-5bcd-4071-ae8a-ccd9e2c26589, ac616249-5616-4134-875b-ebfcdfa90b3c, b39a4d47-f4f6-41b8-9b20-80e230ed131a, c0bab232-b2c8-4cce-8017-a73f9c582c49, e9520ddb-b86a-42de-8ecc-75f5201c0675 |
| 5 | supported | 4 | 119e5ea4-fc4a-4fab-8f7b-69e1610f5695, 58e1d6bb-a134-4da8-a0ed-575c8ae60138, ee056b71-4a31-4e45-8ed4-9998558dd852, fddecb62-89b7-4536-a450-73499a37c1f3 |
| 6 | ambiguous | 12 | 12977f6a-8b5f-4cd8-a254-2e592535b80f, 27b5acaa-833f-456c-acaa-691901a66098, 2eccbad7-3ed0-4c2e-b0d7-bf8bf34cb468, 45f530f1-f3af-417a-a2d8-c5f9e32d81b6, 4abba0c0-c6be-4579-8b57-e3493e1cc08f, 58fd0d3a-48f4-4bf0-9dac-4e1ecb71dd1c, 7001a68f-74f7-4a42-ab23-d3d0132fff2e, 742fd936-5d9b-414c-a347-942e6124ba9c, 7c2a8feb-866e-45ec-bd08-64759a631107, 99485e40-ec30-456c-87be-26e7c49008ad, c45c4421-462e-46fe-9973-a7401e456f30, dcbd8fc6-64e1-4bda-b684-939e57a56e74 |
| 7 | contradicted | 5 | 14869884-c866-473b-9f26-9c23895bbff7, 1abba0fe-127f-47b4-8e07-3879bf65cfb8, 4fc03933-93ae-4494-b967-b761974151ac, 5230af53-4fe2-4b11-b963-99ee2c2487f5, e6455516-564d-4c71-a7b9-f1bab0c12096 |
| 8 | supported | 9 | 1712eefc-72d6-4098-8ceb-9035a7027893, 18809293-926c-4e39-975c-23aa19b4004b, 1a17b115-082d-48ee-a0e6-f30492689183, 4a16c514-f95d-429a-b76e-262ec1a6a491, 5f2358c5-301c-4792-a256-75553f639593, b7bd16a8-a945-4276-8e90-bfceaaed7c81, c4b218e3-850f-4415-976f-5e520ea95c62, cc92ae0d-c8e5-41c2-9839-73491da505d0, e5dd4c61-4148-4bba-a8ae-b1f20273a2de |
| 9 | supported | 1 | 179f50ca-9c4b-49bf-9afa-a29c9d0f7148 |
| 10 | supported | 4 | 1a1a0879-1854-41e2-af12-3b22cc615809, 36cc560d-cfb5-4a0a-9ab8-fc91234bca5e, 59eed2b3-7252-462a-850f-c4ebd074a0c1, 5ceb765f-062a-4e3f-930f-33d5782f49e3 |
| 11 | ambiguous | 12 | 1b9f2d8a-c94e-48f5-bfd1-8a0842d90465, 2820e3cd-a69d-413d-8098-0f5fa56aca6b, 2a949426-996b-424d-bbc8-7c1aa4f9a679, 39f910e8-bd58-4cdd-9dd4-e91130475cd0, 48909a17-cfab-4b87-bc40-1fe6eb2d0668, 973f5b45-2f78-4789-93d9-2a8ca8c8a38f, bc91bb36-5330-4fd6-86f6-219e0782378e, d7fbf3da-437d-4fda-8cdf-5d0fa395f5ac, efac6c23-ce80-49ff-b6cf-95478b1c8936, efe9886e-2890-45d6-aabc-e0635ba46938, f25842eb-6d8f-4587-b9db-0b5dd786d8a2, fffe9b5f-f1db-469c-86c5-d6c5f1c39c38 |
| 12 | supported | 1 | 1ceb8da1-b10f-433c-93e2-79b26e5fa30d |
| 13 | supported | 10 | 1dab7133-48e0-4d02-bbd5-95999cb022ac, 2a009975-7996-4e22-b9a0-d15f2f66d99e, 45dff547-3d78-4ca3-89ee-d8235f9f1061, 69aec6df-3b06-4071-80dc-15e98f8f3ff2, 8f6c1096-b55e-4a07-baac-71f4d2ae806b, be4852bf-e3fe-4ac9-988d-52fceee9cb2a, c15876b3-bfc3-4957-89f9-7542e822c382, c94d7ad5-cf35-4f96-a256-ab722eb32601, cb0b4729-ddf9-45db-82b4-35b9e5d2451a, d66bea62-9c91-4178-be5a-50ffbc510c47 |
| 14 | ambiguous | 3 | 27e49448-11fb-457d-b4bc-167c52fd1c60, b16a8d0c-9aeb-444b-adb2-44dc06f1bf82, b77bc6c4-7309-4182-beea-df2e870a3244 |
| 15 | supported | 1 | 33e90685-9c0c-44c5-b82b-00c5a654d292 |
| 16 | supported | 1 | 3664f7dc-42f3-418a-8bb3-03e790e3da14 |
| 17 | supported | 3 | 3771e284-8546-47dd-a422-e5acc747a2ad, 7f3e6ee4-379b-400e-899d-02aed3c9dced, c8533db3-ef10-4221-b88e-22de14eb66d5 |
| 18 | contradicted | 3 | 3931b274-a0f0-4616-a0f1-0800fe150d21, ba4febf4-8617-45c8-af87-08506bdb237f, ff08990e-c634-4196-a1bb-b72962026ffa |
| 19 | ambiguous | 1 | 3b51acfc-5a88-47a5-a479-cfb8cb4f7853 |
| 20 | contradicted | 5 | 3b8e1c7c-bf5d-4ccf-a7fc-2f582202b70b, 7423db7e-866e-46ef-aaf4-e25dd9b0bb45, 9cfcf51a-63af-4bb5-82d9-020811384fee, cdcf9d80-9ac6-4434-96ff-9a901e2e2b74, ecb84474-5d86-49cc-a378-5c91a0038052 |
| 21 | supported | 10 | 4006cbcf-0d69-4a7a-a61a-4c11fc92ed0f, 4150c9be-be45-42fb-89be-63f96b9d8554, 4e8643d7-83d0-4bd0-a4ee-9ed01c5d04dd, 569a3aaa-8a20-4d17-88ae-95a0ff1a71f0, 6076e28b-ea51-43d2-b835-58ce043ea755, 7fbebcd9-f0bb-41a3-a41e-803e85c34993, 8241963e-1196-41db-a635-3d23eecf59b5, a0104567-4d11-4380-8e0f-9daa045b9cf7, aa5ee442-88e8-4247-af22-07432434038c, d95e616b-7123-40e6-80ca-7d1897ffc93c |
| 22 | supported | 1 | 4a4df4e7-9754-4914-a887-7164fe39819b |
| 23 | supported | 3 | 4a70ee32-f92e-456d-9814-372a6ee07769, 8c18fd81-657e-4bc8-8e07-9572950748d4, cffd8d1a-5d6a-4d62-af3f-c1c8a13551bb |
| 24 | supported | 1 | 53b940a9-1a2c-4716-9186-918f4db3ee8d |
| 25 | supported | 10 | 59685b1b-6e3a-4e8d-97eb-5fdec803da0b, 938fd7e2-96bc-4919-9f5d-d511a6c875bb, ae807d7b-64ee-4897-aac3-20a79cb04bf3, b68d8d07-9fff-469f-a6ef-b3c043cffbff, cb22337c-1cfc-4374-8f60-7836b7f4d601, d24ebfd8-2c03-4dee-97bf-b9a2ddb652f4, d56f6837-c7f0-4a92-ba52-52d918c1f7ad, ebab3abc-fc19-4d6a-b655-784cc600eece, ec4bf04e-774f-4d26-88ad-1c936d59c226, f87f49c4-9787-4061-bbc2-d3d993b41dd7 |
| 26 | supported | 1 | 5c9c17d4-bd52-41a7-b30c-442c68587661 |
| 27 | supported | 1 | 5dd5997e-b7fc-41c2-9ae7-8f249c0eb21c |
| 28 | supported | 1 | 61e48f9c-4465-48b5-b8e2-0b600529ede9 |
| 29 | supported | 3 | 64ad3e3b-8af9-4082-9e21-78a54ee71f31, 8870dc85-ba8b-44a5-af35-db65037f08b4, a615153a-ff66-4541-a1f1-33737d934d45 |
| 30 | supported | 1 | 65fe4e83-a4a8-4899-b904-304efc04a7ee |
| 31 | supported | 2 | 7e6e420e-7b58-4ab4-9fb6-47f2b0dd8f46, bc3d3a40-747f-446f-8469-48d7700c008c |
| 32 | supported | 3 | 8a90c6fd-54a9-4d66-aac0-ffddd905ac6f, d5324bfb-d076-4604-a3eb-9e2a345c31e8, df630c67-0d77-4eda-afc0-7f00b43a775b |
| 33 | contradicted | 1 | 8ff0a9b6-3273-4358-ab67-12de80a645b5 |
| 34 | supported | 1 | 95d2aca4-8e99-4189-be4b-4e511179ea17 |
| 35 | supported | 1 | 97271d31-5c72-4730-b6e0-49689c47c8e7 |
| 36 | supported | 1 | a34206b1-0388-46e9-90ad-f8a361978c69 |
| 37 | supported | 1 | a8a8d7b5-3137-48c1-8b0b-0b9d7ac9be2d |
| 38 | supported | 1 | ae5f3c67-a0af-480b-adb1-418f1979e52f |
| 39 | supported | 1 | b10fcdb9-ff55-4964-822f-fe75ae1d62b3 |
| 40 | contradicted | 1 | b52e1d95-7f70-41a6-82ce-ff6e05155827 |
| 41 | supported | 1 | c4755ee2-243c-4045-842e-dc1f0125aba3 |
| 42 | supported | 1 | e9ac6039-eb01-4ec2-8732-822d261b05ed |
| 43 | supported | 1 | f269dd9c-4e61-472b-9ab3-1a04a2ceef83 |
| 44 | supported | 1 | fe00b893-4d89-4935-b1cd-2356f536bbd1 |

No source, build, service, Git, installation, cleanup, or model operations ran. Optional files are confined to the assigned alias-b reader, judgment serialization, and checker paths. No implementation gates were requested or run.
