# Decisions

Any choice that alters the possible trajectory of the project gets an entry here, **at the moment it is made**, not retroactively. Small implementation choices stay in code review or journal.md; this file is for forks in the road.

Template:

```
## D-NNN: Title (YYYY-MM-DD)
- **Status:** accepted | superseded by D-XXX
- **Context:** what forced the choice
- **Options:** what was on the table
- **Decision:** what we picked
- **Consequences:** what this commits us to, and what would make us revisit
```

---

## D-001: Hybrid phase gates, measurable criteria plus explicit sign-off (2026-07-16)

- **Status:** accepted
- **Context:** The project is executed in phases (see plan.md). We needed a rule for when a phase is "done" so bad foundations don't leak into later phases; the README is explicit that a bad physics fit makes the solver worthless.
- **Options:** (a) automated criteria only, proceed when green; (b) manual review only; (c) hybrid: criteria defined up front, then explicit human sign-off on the evidence.
- **Decision:** Hybrid. Each phase defines measurable exit criteria before work starts. When they pass, the evidence is presented and Mark signs off before the next phase begins. Sign-offs are logged in journal.md.
- **Consequences:** Phases can't silently proceed on a technicality (green tests that miss the point), and there's a written record of what was accepted and why. Cost: sign-off latency between phases.

## D-002: Windows machine for extraction and in-game work; Mac for everything else (2026-07-16)

- **Status:** accepted
- **Context:** Development happens on macOS, but VALORANT and the Unreal + Uiana extraction path are Windows-only. Phase 1 (geometry), parts of Phase 3 (in-game ground-truth measurements), and Phase 6 (in-game verification) need the game.
- **Options:** (a) use Mark's Windows machine for game-side work; (b) community-extracted meshes and video-only ground truth (no Windows); (c) VM or cloud Windows.
- **Decision:** (a). The Windows machine handles PAK access, Unreal/Uiana extraction, and in-game measurement; exported artifacts (glTF, screenshots, recordings) move to the Mac, where all code, simulation, fitting, and solving live.
- **Consequences:** The extraction pipeline must be documented well enough to re-run on a machine where this repo's tooling isn't set up (notes in geometry/extract/, handoff.md for the Windows-side agent). Data transfer between the machines is a manual step. Revisit if Windows access goes away; the fallback is option (b).

## D-003: Build a minimal debug viewer early, not after the solver (2026-07-16)

- **Status:** accepted
- **Context:** README §8 schedules the viewer as Phase 4 (after the solver), but §4E calls it "how you will visually catch bad physics fits", which happens during calibration, much earlier.
- **Options:** (a) follow README order, viewer last, rely on numeric validation during calibration; (b) build a bare-bones mesh and polyline viewer immediately after the geometry pipeline.
- **Decision:** (b). A minimal three.js viewer (wireframe mesh, trajectory polylines, click-to-query) is a Phase 1 deliverable, extended incrementally in later phases.
- **Consequences:** Slightly more work before first physics results, but every calibration residual and every weird bounce is visually inspectable from day one. The viewer stays deliberately ugly; it is a debugging tool, not a product.

## D-004: Simulator is built before physics calibration (2026-07-16)

- **Status:** accepted
- **Context:** README §8 labels calibration "Phase 1" and the simulator "Phase 2", but fitting `params.json` requires running candidate trajectories. There is nothing to fit *with* until a simulator exists.
- **Options:** (a) write a throwaway Python simulator just for fitting, then the real Rust one; (b) build the real Rust simulator first (validated on synthetic geometry with placeholder params), expose it to Python via pyo3, and fit against it.
- **Decision:** (b). One simulator, built once, correctness-tested on synthetic geometry where answers are known in closed form, then used as the forward model inside the scipy fit.
- **Consequences:** The fit exercises the exact code that will serve the solver, so the fitted params cannot encode a throwaway sim's quirks. Requires pyo3 bindings earlier (Phase 2 instead of later). Phase ordering in plan.md deviates from README §8 numbering.

## D-005: Every phase ships automated tests for the code it generates (2026-07-16)

- **Status:** accepted
- **Context:** Mark asked whether the plan included test suites for generated code as a verification check. The plan had test-heavy gates for the simulator (Phase 2) and the ground-truth regression harness, but testing was implicit for the bake script, fit code, solver internals, and CLI.
- **Options:** (a) rely on the existing phase-gate criteria alone; (b) require an explicit automated test suite for every piece of generated code, runnable as one command per language, wired into every phase gate.
- **Decision:** (b). plan.md now carries a cross-phase testing rule and per-phase test-suite gate items, including a synthetic self-test for the Phase 4 fit (recover known params from simulator-generated fake ground truth).
- **Consequences:** No phase gate can pass with missing or failing tests. Slightly more work per phase; regression safety compounds across phases.
