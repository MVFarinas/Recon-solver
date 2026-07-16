# geometry/extract/: PAK → mesh extraction notes (Phase 1, Windows)

This directory documents the one-time, offline extraction pipeline (README §4A). It must be reproducible from these notes alone on the Windows machine (D-002).

Pipeline: `Riot Games/VALORANT/live/ShooterGame/Content/Paks/` → Unreal 5 + Uiana plugin → Blender → glTF → (Mac) `trimesh` bake → `ascent.collision.bin`.

Open Phase 1 questions to answer here:
- Do the PAKs contain **collision proxy** meshes, or only visual meshes? (README §2.2: the collision layer is ground truth; the finding becomes a decisions.md entry)
- What axis/unit conversion does the Uiana → Blender → glTF path apply? (M-01: the bake must restore UE cm / Z-up / left-handed exactly)

**Never commit extracted Riot assets** (README §9). Outputs land in `extract/output/`, which is gitignored. Ship the pipeline, not the output.
