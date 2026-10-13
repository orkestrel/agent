# Competing Ollama service owner lookup

Ownership of service PID `32104` and recorded parent PID `76456` remains unproved. The live process metadata identifies an Ollama process chain at 2026-10-12T07:49:18.589Z, but the bounded artifact lookup found no launch record tying either PID to this campaign.

The exact metadata query was `Get-CimInstance Win32_Process -Filter 'ProcessId=32104 OR ProcessId=76456 OR ProcessId=47864' | Select-Object ProcessId,ParentProcessId,Name,CreationDate,ExecutablePath`. At the observation time it returned:

| PID | Parent PID | Name | Creation time (UTC) | Executable |
| --- | ---: | --- | --- | --- |
| 32104 | 76456 | `ollama.exe` | 2026-10-12T04:24:42.944Z | `C:\Users\mikes\scoop\apps\ollama-full\current\ollama.exe` |
| 76456 | 47864 | `ollama.exe` | 2026-10-12T04:24:42.909Z | `C:\Users\mikes\scoop\shims\ollama.exe` |
| 47864 | 25596 | `ollama app.exe` | 2026-10-12T04:24:41.856Z | `C:\Users\mikes\scoop\apps\ollama-full\current\ollama app.exe` |

The two target PIDs and one live parent generation were queried by process ID only. The recorded creation times distinguish these live process instances from a PID number alone, but process metadata does not establish campaign ownership.

The exact-string lookup covered root-level files in `tmp/units` whose names identify Ollama, service, daemon, deployment, or ownership records and whose types are journal, PID, status, metadata, report, or deployment; matching successor and service custody metadata under `.orkestrel/agent/instruments/results/l15/custody`; and `.orkestrel/agent/progress.md` plus `.orkestrel/agent/ledger.md`. The query returned four `32104` hits, all in the two progress records, and no `76456` hits. The progress entries describe a separate service and say its ownership remains unanswered ([progress.md](C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/progress.md:5), [progress.md](C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/progress.md:15), [ledger.md](C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/ledger.md:7), [ledger.md](C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/ledger.md:21)). No direct launch record for either target PID was found in those bounds.

The recorded deployment artifact points to the dedicated service's start receipt and describes its executable; it has no PID or parent PID fields ([aggregate-successor-daemon-deployment.json](C:/Users/mikes/WebstormProjects/scaffold/tmp/units/aggregate-successor-daemon-deployment.json:2)). That is evidence for the dedicated service record, not for ownership of PIDs `32104` or `76456`.

No service, process, model, source, or Git state was changed.

