# Execution Plan & Phase Tracker

The project runs in gated phases. Each phase defines **measurable exit criteria up front**; when they pass, evidence is presented and **Mark signs off** before the next phase begins (D-001). Sign-offs are logged in journal.md. Phase ordering deviates from README §8 where dependencies demand it (D-003, D-004).

| Phase | Name | Status | Sign-off |
|---|---|---|---|
| 0 | Scaffolding & documentation system | **awaiting sign-off** | pending |
| 1 | Geometry pipeline + minimal viewer | pending | pending |
| 2 | Forward simulator core (Rust) | pending | pending |
| 3 | Ground-truth dataset + validation harness | pending | pending |
| 4 | Physics calibration, the **go/no-go falsifier** | pending | pending |
| 5 | Inverse solver | pending | pending |
| 6 | CLI & viewer completion (MVP) | pending | pending |

Cross-phase rules:
- journal.md gets an entry every working day; decisions.md at the moment of any trajectory-altering choice; math.md before new physics/math merges.
- **Every phase that produces code also produces its automated test suite (D-005).** A gate cannot pass with missing or failing tests. Each language's suite runs as a single command: `cargo test` for Rust, `pytest` for Python, `npm run build` plus harness scripts for the viewer and data.
- Coordinate system is Unreal's everywhere (M-01). No extracted Riot assets are ever committed (README §9); pipeline only.
- From Phase 4 on, the ground-truth harness runs as a regression suite for every change.

---

## Phase 0: Scaffolding & documentation system

Repo layout per README §6; decisions.md / journal.md / math.md / plan.md created with real content; `physics/params.json` stubbed (all zeros, every value is a Phase 4 deliverable); toolchains set up.

**Gate criteria**
- [x] decisions.md, journal.md, math.md exist with real seed content
- [x] Repo layout matches README §6
- [x] `cargo build` + `cargo test` pass (workspace: sim, solver, cli)
- [x] Python venv with numpy/scipy/trimesh/maturin imports cleanly
- [x] Viewer `npm run build` passes (Vite + TS + three.js skeleton)

## Phase 1: Geometry pipeline + minimal viewer

Windows: PAK → Unreal 5 + Uiana → Blender → glTF, fully documented in `geometry/extract/`; investigate collision-proxy meshes in PAKs (decision entry: extract vs. approximate). Mac: `trimesh` bake → `ascent.collision.bin` (triangle soup + BVH + surface_id). Minimal viewer: wireframe mesh, orbit, click-to-query (D-003).

**Gate criteria**
- [ ] Viewer shows recognizable Ascent
- [ ] Ruler test: known landmark distances match in-game measurements
- [ ] Mesh stats sane: no degenerate triangles, plausible bounds and counts
- [ ] Downward raycast from walkable points hits floor at plausible heights
- [ ] Test suite: pytest over the bake script covering weld/dedup on toy meshes, degenerate-triangle filtering, and BVH queries matching brute-force ray checks on randomized inputs
- [ ] Extraction reproducible from notes alone; no Riot assets committed

## Phase 2: Forward simulator core (Rust)

`simulate(origin, dir, charge, maxBounces) -> Path`: chord-segmented swept-sphere vs. hand-rolled BVH (M-04, M-05), closed-form arcs (M-02), anisotropic reflection (M-03), stick at max bounces. Pure, deterministic, allocation-free hot loop; params only from params.json. pyo3 bindings (D-004). Viewer draws polylines. Validated on **synthetic geometry**, independent of the Phase 1 mesh and unfitted params.

**Gate criteria** (all of these live in `cargo test`)
- [ ] 0-bounce flight matches analytic parabola to float precision
- [ ] Reflections on angled planes match hand-derived answers (recorded in math.md)
- [ ] No tunneling through a 1 cm wall at max speed
- [ ] Bit-identical determinism across runs
- [ ] Contact points verifiably offset by collision radius r (M-09)
- [ ] Throughput ≥ ~1M simulate() calls/sec on the dev Mac
- [ ] pyo3 round-trip test passes from pytest

## Phase 3: Ground-truth dataset + validation harness

30-50 known Ascent lineups → `data/ground_truth/*.json` with source attribution; positions mapped onto the mesh via the viewer. **Must include flight-time measurements for several lineups per charge; landing points alone cannot separate v0 from g (M-08).** Validation harness built now, before the solver (README §7). Instrumentation approach documented in `physics/fit/` + decisions.md.

**Gate criteria**
- [ ] ≥ 30 lineups, schema-valid, source-attributed
- [ ] Coverage: all charges 0-3, bounces 0-2, ≥ 2 stances; close-range steep-pitch 0-bounce shots included (M-10 identifiability)
- [ ] Flight-time data present for ≥ 3 lineups per charge, with fps error bars
- [ ] Start/landing points verified against mesh in viewer (nothing floating or embedded)
- [ ] Test suite: schema validation is itself a pytest that runs over every ground-truth file
- [ ] Harness runs end-to-end (large errors expected; params unfitted)

## Phase 4: Physics calibration, the go/no-go falsifier

`physics/fit/`: staged robust least-squares (M-10) via pyo3; 0-bounce first, then multi-bounce; ~20% hold-out; every residual inspected in the viewer. Geometry-fit iteration loop with Phase 1 is expected; journal it.

**Gate criteria**
- [ ] Median landing error ≲ 30 cm on fit set **and** hold-out set
- [ ] No systematic residual pattern (by bounce count, charge, surface, range)
- [ ] Fitted params physically plausible; timebase real (timing residuals small)
- [ ] Test suite: synthetic self-test recovers known params. Generate fake ground truth from chosen params via the simulator, fit from a cold start, and the fit must recover those params
- [ ] Regression harness green via a single command

**Falsifier:** if honest effort cannot close this gate, the collision-geometry assumption is broken. That triggers a major decisions.md entry and a rethink *before* any solver work.

## Phase 5: Inverse solver

`solve(start, target, tol) -> Lineup[]`: 36-config enumeration, coarse pitch×yaw sweep (rayon), flood-fill clustering on the grid (exact, no ML), per-cluster refine, scoring per README §4D: inscribed-radius aim tolerance (M-07) → pixels (M-06; conversion-constant decision due here), anchor score, jittered `pos_tolerance_cm`, composite score. Tolerance, not filtering.

**Gate criteria**
- [ ] Every ground-truth lineup rediscovered from its (start, target) alone, matching charge/bounces, aim within tolerance
- [ ] Scores sane on inspection: corner > open floor; band assignments correct
- [ ] Full 36-config solve within acceptable wall time (minutes max)
- [ ] Test suite: `cargo test` covering flood fill on hand-built grids, inscribed radius on known shapes, scoring monotonicity (better anchor or larger tolerance never lowers score), plus flood fill verified against hand-checked sweep slices
- [ ] Regression harness green

## Phase 6: CLI & viewer completion (MVP)

CLI: coordinates + tolerance → ranked Lineup[] JSON (README §5 schema). Viewer: click start/end → solver → ranked arcs with bands. Final docs pass; retrospective journal entry.

**Gate criteria (MVP-complete)**
- [ ] Cold-start walkthrough: never-before-used start/target solved via CLI, top lineup verified **in-game** on Windows
- [ ] Test suite: CLI integration test runs a golden input and validates the output against the §5 schema
- [ ] Output validates against the §5 schema
- [ ] Regression suite green
- [ ] v2 items (aim-point rendering, reveal cone, Shock Bolt, other maps) explicitly deferred
