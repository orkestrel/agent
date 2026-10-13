# Prepared model-plan verification stopped

The first conformance comparison stopped at the `g4` root binding. The prepared JSON stores `C:/Users/mikes/WebstormProjects/scaffold`; the reader expected `C:\Users\mikes\WebstormProjects\scaffold`. The mismatch is in the reader's unnormalized path comparison, so this run establishes no plan-conformance result. Evidence: `tmp/units/aggregate-successor-model-g4-plan.json:1`, `tmp/units/aggregate-successor-model-verifier.stderr.txt:1`.

The reader was launched once from the scaffold root as `node tmp/units/aggregate-successor-model-verifier.ts`. It exited 1 after 255 ms. Stdout is empty. The complete stderr and capture metadata are retained in `tmp/units/aggregate-successor-model-verifier.stderr.txt:1` and `tmp/units/aggregate-successor-model-verifier.meta.json:1`; stdout is retained in `tmp/units/aggregate-successor-model-verifier.stdout.txt:1`. The reader source is `tmp/units/aggregate-successor-model-verifier.ts:1`.

The captured stdout SHA256 is `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`; the captured stderr SHA256 is `ef79c2660176b78ce577078b39c979e9ae245e98a54577f95187953bb4261eb2`. The capture metadata records exit code 1 and duration 255 ms. The prepared-plan and script seal comparisons were not reached, nor were operator comparisons, absence checks, or the changed-operator control. No generated command, runner, preparer, model, service, or network operation was executed, and no canonical artifact was changed.

One hypothesis is that the prepared plans intentionally serialize host paths with forward slashes while the reader compared them to Windows-normalized backslash paths. The run stopped at this first mismatch; it did not test that hypothesis by normalizing or rerunning.
