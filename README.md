# Recon-Solver

A trajectory solver for VALORANT's Sova Recon Bolt.

Given a **start point** (where Sova stands) and an **end point** (where the bolt should land), enumerate every viable shot — aim direction, bounce count, and charge level — that gets the dart there.

This is the inverse of what every existing tool does. Strats.gg, Mobalytics, valoplant, and the community lineup PDFs are all _databases of lineups humans already found_. Nothing public **generates** them. That's the gap.

---

## 1. Scope (MVP)

**In scope**

| Dimension | MVP value                                                                                                     |
| --------- | ------------------------------------------------------------------------------------------------------------- |
| Agent     | Sova only                                                                                                     |
| Ability   | Recon Bolt only (Shock Bolt is a later, easy extension — same firing physics)                                 |
| Map       | One map (recommend **Ascent** — boxy, mostly axis-aligned geometry, well-documented lineups for ground truth) |
| Stance    | Standing, crouching, jumping (three fixed eye heights; Sova has no verticality abilities)                     |
| Bounces   | 0, 1, 2                                                                                                       |
| Charge    | 0, 1, 2, 3 (full) — four discrete projectile classes, **not** a continuous scale                              |
| Motion    | None. Shooter is stationary.                                                                                  |

**Explicitly out of scope for MVP**

- Lineups fired while moving (pros do these; they add velocity inheritance and a whole extra dimension)
- Owl Drone pathing, Hunter's Fury
- Rendering a pretty 3D map
- Predicting the _reveal cone_ of the landed bolt (v2 — see §8)
- Telling you what to aim at on-screen (v2 — see §8)

The MVP answers exactly one question: **"From here, hitting there — what are all my options?"**

---

## 2. Why this is hard (read this before writing code)

Three things will bite:

1. **The bolt's physics constants are not published.** Gravity, muzzle speed per charge bar, bounce restitution, and collision radius all have to be reverse-engineered empirically. This is Phase 1 and it is the whole project. Everything downstream is straightforward.
2. **Collision geometry ≠ visual geometry.** VALORANT's bounce surfaces are simplified collision hulls, not the rendered meshes. Extracted art assets will produce _plausible-looking_ bounces that are subtly wrong — which is almost certainly why hand-derived reverse-engineering doesn't close. The collision layer is the ground truth and we need to either extract it or approximate it and validate hard.
3. **The dart is probably a sphere, not a point.** A collision radius shifts every bounce contact point off the surface by `r`. Ignoring this produces error that compounds across two bounces.

If the physics fit is good, the solver is trivial. If the fit is bad, the solver is a very expensive random number generator.

---

## 3. Architecture

```
                    OFFLINE / ONE-TIME
  ┌──────────────────────────────────────────────────────┐
  │  A. Geometry Pipeline                                 │
  │  PAK files ──Uiana/FModel──> meshes ──> collision     │
  │  proxy mesh ──> BVH-indexed triangle soup (.bin)      │
  └──────────────────────────────────────────────────────┘
                    │
                    │  static asset: ascent.collision.bin
                    ▼
  ┌──────────────────────────────────────────────────────┐
  │  B. Physics Model  (params fitted in Phase 1)         │
  │  params.json: {v0[4], g, e_n, e_t, radius, ...}       │
  └──────────────────────────────────────────────────────┘
                    │
  ══════════════════╪══════════════════════════════════════
                    │        RUNTIME
                    ▼
  ┌──────────────────────────────────────────────────────┐
  │  C. Forward Simulator                                 │
  │  simulate(origin, dir, charge, maxBounces) -> Path    │
  │  Continuous-time swept-sphere raycast vs BVH.         │
  │  Deterministic. No engine. ~µs per shot.              │
  └──────────────────────────────────────────────────────┘
                    │
                    ▼
  ┌──────────────────────────────────────────────────────┐
  │  D. Solver                                            │
  │  solve(start, target, tol) -> Lineup[]                │
  │  Coarse angular sweep -> cluster hits -> local refine │
  │  over (pitch, yaw) for each (stance, charge, bounces) │
  └──────────────────────────────────────────────────────┘
                    │
                    ▼
  ┌──────────────────────────────────────────────────────┐
  │  E. Output                                            │
  │  Ranked Lineup[] + trajectory polylines               │
  │  CLI (JSON) + minimal three.js viewer                 │
  └──────────────────────────────────────────────────────┘
```

**Key architectural decision: no game engine at runtime.**

Unity/Unreal/Godot are the wrong tool for the solver. They're heavyweight, their physics is not VALORANT's physics, and you don't need rendering. Use Unreal **once**, offline, via the Uiana plugin to get the map out — then throw it away. The runtime is a headless numeric simulator over a triangle mesh. This is what makes brute-force search viable: a hand-rolled swept-sphere sim can run millions of shots in seconds; a game engine cannot.

---

## 4. Components

### A. Geometry Pipeline (`/geometry`)

- **Input:** `Riot Games/VALORANT/live/ShooterGame/Content/Paks/`
- **Tool:** [Uiana / Piana](https://github.com/) map importer (Unreal plugin, built under Riot's "Legal Jibber Jabber" fan-content policy) → export map as FBX/glTF. FModel/umodel as fallback for raw asset inspection.
- **Problem:** this gives _visual_ meshes. Need to either (a) find collision proxies in the PAKs, or (b) build a simplified collision approximation and validate it against known lineups.
- **Output:** `ascent.collision.bin` — flat triangle array + BVH, plus a `surface_id` per triangle so we can tag surfaces later (some may behave differently).
- **Coordinate system:** adopt Unreal's (cm, Z-up, left-handed) and never convert. Every bug in this project will otherwise be a units or handedness bug.

### B. Physics Model (`/physics/params.json`)

The fitted parameter set. Treated as data, not code, so Phase 1 can iterate without touching the simulator.

```jsonc
{
  "gravity_z": -800.0, // cm/s^2, UE default is a guess; fit it
  "charges": [
    // four discrete projectile classes
    { "speed": 0, "gravity_scale": 1.0 }, // 0 bars
    { "speed": 0, "gravity_scale": 1.0 }, // 1 bar
    { "speed": 0, "gravity_scale": 1.0 }, // 2 bars
    { "speed": 0, "gravity_scale": 1.0 }, // 3 bars / full
  ],
  "restitution_normal": 0.0, // bounce energy retained perpendicular to surface
  "restitution_tangent": 0.0, // ... and parallel (friction). Likely != normal.
  "collision_radius": 0.0, // cm
  "eye_height": { "stand": 0, "crouch": 0, "jump_apex": 0 },
  "muzzle_offset": [0, 0, 0], // bolt does NOT spawn at the eye
}
```

Every zero above is a Phase 1 deliverable. **Do not hardcode guesses into the simulator.**

### C. Forward Simulator (`/sim`)

```
simulate(origin: Vec3, dir: Vec3, charge: 0..3, maxBounces: 0..2) -> Path
```

- Continuous-time swept-sphere vs. BVH. **Do not use fixed-timestep discrete stepping** — at bolt speeds it will tunnel through thin geometry and every bounce contact point will be off by up to one step.
- Ballistic arc between contacts (closed-form, no integration needed): solve the sphere-cast against the BVH along the parabola in segments.
- On contact: if `bouncesUsed == maxBounces`, the bolt **sticks** — record landing point, normal, and time-to-land (TTL). Otherwise reflect with `(e_n, e_t)` and continue.
- Returns: `{ landed: Vec3, normal: Vec3, ttl: float, bounces: Contact[], polyline: Vec3[] }`
- Pure function. Deterministic. No allocations in the hot loop.

### D. Solver (`/solver`)

```
solve(start: Vec3, target: Vec3, tol_cm: float) -> Lineup[]
```

Brute-force-then-refine. There is no closed form here — bounces make the map from (pitch, yaw) to landing point discontinuous, so gradient methods die at surface edges. Embrace the sweep:

1. **Enumerate** the discrete config space: `3 stances × 4 charges × 3 bounce settings = 36 configurations`.
2. **Coarse sweep.** For each config, sweep pitch × yaw on a grid (e.g. 0.25° over the reachable hemisphere ≈ 1M sims per config; still cheap). Record every shot landing within a generous radius of the target.
3. **Cluster.** Group surviving shots by contiguity in (pitch, yaw). Because the sweep is a regular 2D grid, this is **connected-components / flood fill** — exact, O(n), ~40 lines. Do _not_ reach for k-means/DBSCAN; there is already an exact answer. Each cluster is a distinct _lineup family_: a continuous region of aim angles that all work.
4. **Refine.** Golden-section / Nelder-Mead within each cluster to find the aim direction minimizing distance to target.
5. **Score & rank** each surviving lineup (see below).

---

### Scoring: tolerance, not filtering

**Do not discard tight lineups.** Many of the most-used lineups in the game are pixel-perfect — they're executable because they align against a fixed visual landmark (an antenna, a mural, the edge of the Owl Drone UI icon), not because they're forgiving. The job is to _express_ difficulty in units the player can act on, and let them choose.

There are two independent tolerances and they fail in completely different ways.

#### Aim tolerance → report in **pixels**, not degrees

Degrees are meaningless to a player. Convert using the game's actual FOV:

> VALORANT default horizontal FOV = **103°** across the screen width.
> At 1920px wide: **103 / 1920 ≈ 0.054° per pixel.**
> `aim_tolerance_px = aim_tolerance_deg / 0.054`

Rough bands (at 1920px — scale for other resolutions):

| Aim tolerance | ≈ pixels | Read as                                                    |
| ------------- | -------- | ---------------------------------------------------------- |
| ≥ 0.5°        | ≥ 9px    | Forgiving. Eyeball it.                                     |
| 0.2–0.5°      | 4–9px    | Standard. Needs a reference point.                         |
| 0.05–0.2°     | 1–4px    | Pixel-perfect. **Still valid** — requires a hard landmark. |
| < 0.05°       | < 1px    | Unexecutable. Sub-pixel; discard.                          |

Derive `aim_tolerance_deg` from the cluster's inscribed radius (largest circle fitting inside the cluster around the refined optimum), **not** its bounding box — clusters near surface edges are long, thin slivers, and a bounding box will wildly overstate how forgiving they are.

#### Positional tolerance → this is what actually kills lineups

A 2px-aim lineup you can re-find _exactly_ every round beats a 10px-aim lineup you can only stand near. This is why every guide in existence says **"hug this corner."** A start point flush against a wall, corner, or box edge is exactly repeatable — the geometry anchors you. A start point in open floor is not, at any aim tolerance.

So the solver must compute an **anchor score** for the start point — a cheap BVH query you already have the geometry for:

```
anchor(start):
  cast short rays (~40cm) around the player capsule at floor+torso height
  count independent contact normals (dedup by angle)
    3+ non-coplanar normals -> hard corner        -> anchor = 1.0   (exactly repeatable)
    2 normals               -> wall + floor/edge  -> anchor = 0.7
    1 normal (flat wall)    -> 1-DOF slide        -> anchor = 0.4
    0 normals               -> open floor         -> anchor = 0.1   (not repeatable)
```

Then re-run the cluster from jittered start positions (±5cm, ±10cm) and record `pos_tolerance_cm` — how far you can drift before the lineup dies. An unanchored start with low positional tolerance is the only genuinely useless combination.

#### Composite score

```
score = anchor
      × clamp(aim_tolerance_px / 8, 0, 1)      # saturates — 20px isn't better than 8px
      × simplicity                              # 0B > 1B > 2B; stand > crouch > jump
      × ttl_bonus                               # shorter time-to-land preferred
```

Rank by `score`, but **always return everything above the sub-pixel floor**, tagged with its band. The player decides whether they want to grind a 2px lineup. The tool's job is to tell them exactly what they're signing up for — not to make that call for them.

### E. Output (`/cli`, `/viewer`)

- **CLI:** takes two coordinates + tolerance, emits ranked JSON.
- **Viewer:** minimal three.js page — load the collision mesh as wireframe, draw the trajectory polylines, click to set start/end. Deliberately ugly. This is a debugging tool for _you_, and it is how you will visually catch bad physics fits.
- **Not in MVP:** a screenshot of what to aim at in-game. That's the actual product (see §8) but it's not the hard part and it's not the proof.

---

## 5. Data model

```ts
type Stance = "stand" | "crouch" | "jump";
type Charge = 0 | 1 | 2 | 3;
type Bounces = 0 | 1 | 2;

interface Contact {
  point: Vec3;
  normal: Vec3;
  surfaceId: number;
  t: number;
}

interface Lineup {
  start: Vec3; // world-space feet position
  stance: Stance;
  aim: { pitch: number; yaw: number }; // degrees
  charge: Charge;
  bounces: Bounces;
  landed: Vec3;
  error_cm: number; // distance from requested target
  ttl_s: number; // time from release to stick
  contacts: Contact[];
  polyline: Vec3[]; // for rendering

  // ranking
  aim_tolerance_deg: number; // inscribed radius of the cluster, NOT bounding box
  aim_tolerance_px: number; // = deg / 0.054 @ 1920px. The number the player cares about.
  band: "forgiving" | "standard" | "pixel-perfect";
  anchor: number; // 0..1 — how exactly repeatable the start position is
  anchor_kind: "corner" | "edge" | "wall" | "open";
  pos_tolerance_cm: number; // how much standing-position drift this survives
  score: number;
}
```

---

## 6. Repo layout

```
reconsolver/
├── geometry/          # offline: PAK -> mesh -> collision BVH
│   ├── extract/       # Uiana/FModel notes + scripts
│   └── build_bvh.*
├── physics/
│   ├── params.json    # THE fitted constants (Phase 1 output)
│   └── fit/           # Phase 1: calibration harness (stub for now)
├── sim/               # forward simulator (pure, deterministic)
├── solver/            # inverse solver + clustering + scoring
├── cli/
├── viewer/            # three.js debug view
├── data/
│   └── ground_truth/  # known-good lineups scraped from community sources
└── tests/
```

### Tech stack

| Layer                       | Choice                                                               | Why                                                                                                                                         |
| --------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Map extraction (offline)    | Unreal 5 + **Uiana** plugin → Blender → glTF                         | Only working path out of the PAKs. Used once, then discarded.                                                                               |
| Collision bake (offline)    | Python — `trimesh`, `numpy`                                          | Decimate, weld, emit flat triangle array + BVH as `.bin`.                                                                                   |
| `sim` + `solver` (hot loop) | **Rust** — `glam`, `rayon`                                           | Millions of trajectories per solve. Hand-rolled BVH: off-the-shelf ones are tuned for rendering rays, not swept spheres on parabolic paths. |
| Bindings                    | `pyo3` / `maturin`                                                   | Drive the Rust core from Python for calibration and experiments.                                                                            |
| Physics fitting (Phase 1)   | Python — `scipy.optimize`                                            | ~10-parameter least-squares against the ground-truth set. Not exotic.                                                                       |
| Viewer                      | TypeScript + three.js + Vite                                         | Debug tool. Deliberately ugly.                                                                                                              |
| Data                        | JSON (`params.json`, ground truth); Parquet if sweep dumps get large | —                                                                                                                                           |

**On ML:** clustering is flood fill on a regular grid — exact and O(n). Learned clustering would be strictly worse. The one place ML plausibly earns its keep is **CV on YouTube lineup videos** to auto-extract start positions and aim points for the ground-truth set (§7), which is a real bottleneck and a real vision problem. A neural surrogate to prune the sweep is possible but premature: the bottleneck in this project is **physics fidelity, not compute**, and a surrogate only adds a second source of error.

---

## 7. Validation strategy — the most important section

The project has exactly one hard success criterion, and you should build the harness for it _before_ the solver:

> **Scrape 30–50 known Sova lineups on the MVP map from community sources (Strats.gg, the community PDFs, YouTube). For each, we know the approximate start position, charge, bounce count, and landing area. The simulator must reproduce them.**

That gives you:

- A **loss function for Phase 1**. Fitting physics params = minimizing simulated-vs-actual landing error across the ground-truth set.
- A **regression suite**. Any change to geometry or physics that breaks known lineups is wrong.
- A **falsifier**. If you cannot reproduce known lineups after honest effort, the collision-geometry assumption is broken and the whole approach needs rethinking. **Find this out in week 2, not month 4.**

Store as `data/ground_truth/*.json` with source attribution.

---

## 8. Roadmap

**Phase 0 — this document.** ✅

**Phase 1 — Physics calibration.** The crux. Extract map, build ground-truth set, fit `params.json`. Success = reproduce known lineups within ~30cm. _(Instrumentation approach TBD — separate design doc.)_

**Phase 2 — Forward simulator.** Fast, correct, swept-sphere, validated against Phase 1.

**Phase 3 — Inverse solver.** Sweep, cluster, refine, score. First real output.

**Phase 4 — Debug viewer.** Click two points, see the arcs.

**v2 and beyond**

- **Aim-point rendering:** given a solved lineup, render what the player actually sees — the crosshair placement against the in-game skybox/geometry. This is what turns a research tool into a product people use.
- Reveal-cone modeling (does the bolt actually _see_ what you wanted it to see?)
- Shock Bolt (same firing physics, different payload — nearly free)
- Remaining maps
- Other agents' projectiles (KAY/O knife, Fade seize, Gekko, Brimstone molly...)
- Lineups in motion
- "Find me lineups that reveal X from anywhere safe" — invert on the _start_ point instead

---

## 9. Legal

Uiana/Piana operate under Riot's "Legal Jibber Jabber" fan-content policy. This project reads game files **offline**; it does not read game memory, does not run alongside the game, and does not interact with Vanguard. Keep it that way — the moment this becomes a runtime overlay reading process memory, it's a different (and much worse) legal and anti-cheat conversation.

Do not redistribute extracted Riot assets in this repo. Ship the extraction _pipeline_, not the _output_.
