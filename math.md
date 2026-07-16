# Math & Physics Knowledge Base

Everything the code assumes about physics and math lives here, with a derivation or source. Rule: **when new math enters the code, its entry lands here before the code merges.** Each entry: statement → derivation/source → where it's used → open questions.

Notation: positions in **cm**, time in **s**, angles in **degrees** at API boundaries and radians internally. Bold = vector.

---

## M-01: Coordinate system is Unreal's, everywhere, forever

**Statement.** All coordinates are Unreal Engine convention: centimeters, Z-up, **left-handed** (X forward, Y right, Z up). No layer of this project ever converts.

**Why.** The map comes out of UE PAKs in this system; README §4A predicts every avoidable bug will be a units or handedness bug. Left-handedness matters for cross products: in UE, X × Y = Z holds with the *left*-hand rule; any borrowed right-handed formula involving cross products or winding order must be checked.

**Used by.** Every component. three.js is right-handed Y-up; the viewer alone may *display* transformed coordinates but must never write them back.

**Open questions.** Confirm the exported glTF axis convention from Uiana/Blender (glTF is right-handed Y-up; the bake script must undo any conversion Blender applies).

## M-02: Ballistic flight is closed form, no integration

**Statement.** Between contacts the dart follows
**p**(t) = **p**0 + **v**0 t + ½ **g** t²,  **v**(t) = **v**0 + **g** t,
with **g** = (0, 0, gravity_z · gravity_scale(charge)). No numerical integrator anywhere in the simulator.

**Derivation.** Constant acceleration; exact. Assumes **no aerodynamic drag**; see open question.

**Used by.** `sim` (arc segments between contacts), Phase 4 fit (forward model).

**Open questions.** Does the dart actually have zero drag and constant gravity? Unreal projectiles typically use a constant `gravity_scale`, so this is the right prior, but Phase 4 must check residuals for a drag-like signature (systematic undershoot growing with flight time). If present, add a drag term then, not before.

## M-03: Bounce reflection with anisotropic restitution

**Statement.** At a contact with unit surface normal **n**, decompose incoming velocity **v** into normal and tangential parts:
**v**n = (**v**·**n**)**n**,  **v**t = **v** − **v**n.
The outgoing velocity is
**v**' = −e_n **v**n + e_t **v**t,
with independent restitution coefficients e_n (perpendicular energy retained) and e_t (tangential, effectively friction). e_n = e_t = 1 is a mirror reflection; they are likely unequal for the dart (README §4B).

**Derivation.** Standard rigid-body impulse model with no spin. A spinning-projectile model would couple **v**t and angular velocity; out of scope unless Phase 4 residuals on multi-bounce shots demand it.

**Used by.** `sim` bounce handling; e_n and e_t are Phase 4 fit parameters.

**Open questions.** Are e_n and e_t constant across surface types? `surface_id` tags exist in the geometry precisely so per-surface coefficients can be added if one material (metal roofs, for example) misbehaves in the fit.

## M-04: Swept sphere vs. triangle = point vs. inflated triangle

**Statement.** A sphere of radius r moving along a path hits a triangle exactly when the sphere's *center* hits the triangle's **Minkowski expansion** by r: the face offset ±r along its normal, plus cylinders of radius r around each edge, plus spheres of radius r at each vertex. The earliest-time hit among face, edge, and vertex features is the contact; the reported contact point sits on the original triangle, and the center is offset from it by r along the contact normal.

**Derivation.** Minkowski sum definition; standard in continuous collision detection (Ericson, *Real-Time Collision Detection*, ch. 5.5).

**Used by.** `sim` sphere-cast (Phase 2). The BVH must be queried with node AABBs inflated by r.

**Open questions.** None yet, but note M-09: r itself is a fitted parameter, so the sim takes r as input rather than baking it into the geometry.

## M-05: Sphere-casting a parabola, chord segmentation with a sagitta bound

**Statement.** The cast is done along straight chords approximating the parabola. Over a time step Δt from t1 to t2, the maximum deviation between the true arc and the straight chord is
max ‖**p**(t) − lerp(t)‖ = |**g**| Δt² / 8,
attained at the midpoint.

**Derivation.** **p**(t) − lerp(**p**(t1), **p**(t2); t) = ½ **g** (t − t1)(t − t2), a pure vertical term; |(t − t1)(t − t2)| is maximized at the midpoint with value (Δt/2)². Exact, not an estimate.

**Consequence.** To keep geometric error below ε, choose Δt ≤ √(8ε/|g|), and *inflate the cast radius by ε* (or clip the chord) so the swept volume still covers the true arc; otherwise thin-edge contacts can slip between chords. With ε = 0.1 cm and |g| ≈ 1000 cm/s², Δt ≈ 28 ms per chord: a 1 s flight is about 35 sphere-casts. This is the entire cost model of the simulator.

**Used by.** `sim` hot loop (Phase 2); throughput budget in plan.md.

## M-06: Degrees to pixels; the README's constant is an average, center screen is what matters

**Statement.** For horizontal FOV F across screen width W px, perspective projection maps view angle θ to pixel x = (W/2) · tan θ / tan(F/2). The angular size of one pixel is therefore **not constant across the screen**:
dθ/dx at screen center = 2 · tan(F/2) / W  (radians per px).
For F = 103°, W = 1920: center = **0.0750°/px**, while the README's flat average 103/1920 = **0.0536°/px**.

**Consequence.** Aim tolerance is exercised at the crosshair (screen center), so the center value is the honest conversion; the naive average makes lineups look about 40% more forgiving in pixels than they are. Example: a 0.2° tolerance is 2.7 px at center, not 3.7 px.

**Used by.** Phase 5 scoring bands. Deviating from the README's constant is a trajectory-altering choice, so it gets a decisions.md entry when Phase 5 starts.

**Open questions.** Confirm VALORANT's 103° is horizontal at 16:9 and how it letterboxes at other aspect ratios before supporting other resolutions.

## M-07: Aim tolerance = inscribed radius, computed as a distance transform

**Statement.** A lineup family is a connected set of cells in the regular (pitch, yaw) sweep grid. Its aim tolerance is the radius of the largest disc centered at the refined optimum that stays inside the cluster; equivalently, the Euclidean distance from the optimum to the nearest non-cluster cell (minus half a cell width for conservatism).

**Why not a bounding box.** Clusters hugging surface edges are long thin slivers; a box reports the sliver's length as if it were forgiveness in every direction (README §4D).

**Used by.** Phase 5 scoring. O(cluster size) with a brute scan against boundary cells, or grid-wide via a standard two-pass Euclidean distance transform (Felzenszwalb-Huttenlocher) if it ever shows up in profiles.

## M-08: Identifiability; landing points alone cannot separate v0 from g, timing data is required

**Statement.** Rescale time t → kt in M-02: the *same geometric path* is traversed with v0 → v0/k and g → g/k². Landing positions, bounce points, and the entire path shape are invariant; restitution coefficients (M-03) are ratios and also invariant. Therefore a ground-truth set consisting only of (start, aim, landing) observations fits v0²/|g| per charge, **not** v0 and g individually. The fit would have an exact flat direction.

**Consequence for Phase 3 instrumentation.** The ground-truth set must include **flight-time measurements** (frame counts from 60/120 fps recordings between release and stick) for at least a few lineups per charge level, or an independently trusted |g|. This single fact shapes the whole data-collection design.

**Also note.** TTL (time-to-land) is a first-class output of the solver anyway (README §5), so the fitted timebase must be real, not just path-consistent.

**Used by.** Phase 3 dataset schema (a `flight_time_s` field with fps-quantization error bars), Phase 4 fit.

## M-09: Collision radius shifts every contact by r

**Statement.** With dart radius r, the sphere *center* at contact sits at (surface point) + r·**n**. Ignoring r puts every bounce origin on the surface instead of r above it: an error injected at each contact that then propagates through the remaining flight, compounding over two bounces (README §2.3).

**Used by.** `sim` contact resolution (via M-04); r is a Phase 4 fit parameter.

**Open questions.** Is the collision shape actually a sphere? If residuals show orientation-dependent bounce error, a capsule along the velocity vector is the next candidate. Do not model that until the data demands it.

## M-10: Least-squares fitting of params.json

**Statement.** Phase 4 solves
min over Θ of Σ ρ( ‖sim(start_i, aim_i; Θ) − observed_i‖² )
where Θ = {v0[4], gravity_z, e_n, e_t, r, eye heights, muzzle offset} (roughly 10 to 14 params), residuals are per-lineup landing errors in cm (plus timing residuals per M-08, weighted by measurement uncertainty), and ρ is a robust loss (`soft_l1`) so a single mis-transcribed community lineup cannot drag the fit.

**Method.** `scipy.optimize.least_squares` over the pyo3-bound Rust simulator. The forward model is discontinuous where a perturbed parameter changes *which surface* a bounce hits, so expect a noisy Jacobian; use `diff_step` well above float noise, multi-start from several initial guesses, and hold out about 20% of lineups to detect overfitting. Fit 0-bounce lineups first (fixes v0, g, heights, muzzle offset with no restitution involved), then multi-bounce for e_n, e_t, r. Staged fitting keeps each stage close to well-posed.

**Used by.** `physics/fit/` (Phase 4).

**Open questions.** Muzzle offset may be nearly degenerate with eye height for far targets; 0-bounce close-range shots at steep pitch angles separate them best, so bias the ground-truth set accordingly.
