# Handoff: Recon-Solver state as of 2026-07-16

Audience: the Claude agent working on Mark's Windows PC. Read this file instead of crawling the repo; it tells you what exists, what the conventions are, and what your job is.

## What this project is

An inverse trajectory solver for VALORANT's Sova Recon Bolt: given where Sova stands and where the bolt should land, enumerate every viable shot (aim direction, charge, bounce count). Full brief in README.md; you only need its §4A (geometry pipeline) and §9 (legal) for your part.

## Where the project stands

- **Phase 0 (scaffolding + documentation system): complete.** Rust workspace, Python venv, and viewer skeleton all build on the Mac. Nothing game-specific exists yet.
- **Phase 1 (geometry pipeline) is next**, and its first half happens on this Windows machine. See plan.md for the phase tracker and gate criteria; do not proceed past a gate without Mark's sign-off (D-001).

## Repo layout (one line each)

| Path | What it is |
|---|---|
| `README.md` | The full project brief (Mark's, do not edit uninvited) |
| `plan.md` | Phase tracker: 7 gated phases, criteria checklists, status |
| `decisions.md` | ADR log, D-001 to D-005; add an entry for any trajectory-altering choice |
| `journal.md` | Daily append-only log; add an entry every working day |
| `math.md` | Physics/math knowledge base, M-01 to M-10; new math lands here before code merges |
| `handoff.md` | This file |
| `geometry/extract/` | Extraction pipeline notes (your workspace); outputs go to `extract/output/`, gitignored |
| `geometry/` | Mac-side bake script lands here in Phase 1 (glTF → collision .bin) |
| `physics/params.json` | Fitted physics constants, currently all zeros; treated as data, never hardcoded |
| `physics/fit/` | Phase 4 calibration harness (empty for now) |
| `sim/`, `solver/`, `cli/` | Rust workspace crates (scaffolds only) |
| `viewer/` | three.js debug viewer skeleton (Vite + TS) |
| `data/ground_truth/` | Phase 3: 30-50 known lineups as JSON (empty for now) |
| `tests/` | Cross-cutting test assets; per-phase test suites are mandatory (D-005) |

## Conventions (do not violate)

- **No em-dashes in any documentation**, code comments included. Use commas, colons, parentheses, or plain hyphens.
- **Git: Mark is the solo author.** No Co-Authored-By trailers ever. Group related files into logical commits; no giant catch-all commits.
- **Coordinates: Unreal convention everywhere** (cm, Z-up, left-handed), never converted (math.md M-01).
- **Never commit extracted Riot assets** (README §9). The .gitignore blocks *.pak, *.gltf, *.glb, *.fbx, and geometry/extract/output/. Ship the pipeline, not the output.
- Every phase ships automated tests for the code it generates (D-005).
- Log the day's work in journal.md; log trajectory-altering choices in decisions.md at the moment they're made.

## Your Phase 1 job on this machine

1. Locate the game PAKs: `Riot Games/VALORANT/live/ShooterGame/Content/Paks/`.
2. Install Unreal Engine 5 and the Uiana map-importer plugin (Riot fan-content policy); import Ascent. FModel/umodel are the fallback for raw asset inspection.
3. **Central question: do the PAKs contain collision proxy meshes, or only visual meshes?** Collision geometry is the ground truth (README §2.2). Whatever you find becomes a decisions.md entry (extract collision vs. approximate-and-validate).
4. Export the map via Blender to glTF. Record the exact axis/unit conversion the Uiana → Blender → glTF path applies; the Mac-side bake must restore UE coordinates exactly (M-01).
5. Document every step in `geometry/extract/README.md` as you go, precisely enough that a stranger could reproduce it.
6. Hand the exported files to Mark for transfer to the Mac. Do not commit them.

Useful context from the math knowledge base: M-01 (coordinates) is the only entry you need for extraction. M-08 matters later for Phase 3 ground-truth collection on this machine: flight-time measurements from recordings are mandatory, so keep any capture tooling (120 fps recording) in mind.
