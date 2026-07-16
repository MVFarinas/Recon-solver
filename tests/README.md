# tests/

Cross-cutting test assets live here; unit tests live inside each crate/module. Every phase ships automated tests for the code it generates (D-005); no phase gate passes with missing or failing tests.

- Phase 2: synthetic-geometry fixtures (unit boxes, inclined planes) for simulator correctness tests.
- Phase 3+: the ground-truth validation harness. It runs every `data/ground_truth/*.json` lineup through the simulator and reports landing/timing error. From Phase 4 on this is the regression gate for every change.
