# Journal

Append-only, one entry per working day: what was built, hurdles hit, how they were overcome, open questions, answers found. Phase-gate sign-offs are recorded here (D-001).

---

## 2026-07-16: Kickoff & Phase 0

**What was built.** The project went from a lone README to a working skeleton:

- **Execution plan**: 7 gated phases (plan.md), each with measurable exit criteria plus sign-off. Ordering deviates from README §8 twice, deliberately: viewer early (D-003), simulator before calibration (D-004).
- **Documentation system**: decisions.md (ADR log, seeded with D-001 to D-005), math.md (knowledge base, seeded with M-01 to M-10), this journal, plan.md tracker.
- **Repo layout** per README §6; `physics/params.json` stubbed all-zeros (every value is a Phase 4 deliverable); `.gitignore` blocks extracted Riot assets categorically.
- **Toolchains**: Rust workspace (`recon-sim`, `recon-solver`, `recon-cli`; glam + rayon), Python venv (numpy 2.5.1, scipy 1.18.0, trimesh 4.12.2, maturin 1.14.1), viewer skeleton (Vite 6 + TS + three.js, grid/axes/orbit only).

**Hurdles & fixes.**
- No Rust toolchain on the Mac. Installed via rustup (rustc/cargo 1.97.1).
- VALORANT-side work can't happen on macOS at all. Resolved by D-002 (Mark's Windows machine for extraction and in-game measurement).

**Insights worth recording (see math.md).**
- **M-08 (identifiability):** landing points alone mathematically cannot separate muzzle speed from gravity; the fit has an exact flat direction (t → kt rescaling). Ground truth *must* include flight-time measurements. This reshapes Phase 3 data collection before it starts.
- **M-06:** the README's 0.054°/px conversion is a full-screen average; at the crosshair it's 0.075°/px, so naive banding overstates pixel forgiveness by about 40%. Decision deferred to Phase 5.

**Open questions.**
- Does the dart have aerodynamic drag, or is constant gravity exact? (Watch Phase 4 residuals; M-02.)
- Do the PAKs contain collision proxy meshes, or only visual geometry? (Phase 1's central question; README §2.2.)
- What axis/unit mangling does Uiana → Blender → glTF apply? (M-01.)

**Phase 0 gate evidence.**
- decisions.md, journal.md, math.md exist with real seed content ✅
- Repo layout matches README §6 ✅
- `cargo build` + `cargo test` pass (all suites ok) ✅
- Python venv imports numpy/scipy/trimesh cleanly; maturin 1.14.1 on PATH ✅
- Viewer `npm run build` passes (vite 6.4.3, tsc clean) ✅

**Update, later the same day.**
- Mark set two standing conventions: no em-dashes in any documentation (all docs and code comments were swept clean), and git commits list Mark as the solo author, no co-author trailers, grouped logical commits rather than one big one.
- Mark asked whether generated code gets test suites as a verification check. The plan was explicit only for the simulator and the regression harness, so plan.md now carries a cross-phase testing rule and per-phase test-suite gate items, logged as D-005. Highlight: Phase 4 gains a synthetic self-test (generate fake ground truth from known params via the simulator, then the fit must recover them from a cold start).
- handoff.md created for the Claude agent on the Windows PC so it can pick up Phase 1 context without reading the entire repo.
- Phase 0 work committed to main in grouped commits and pushed.

**Gate status:** evidence presented, awaiting Mark's sign-off to open Phase 1.
