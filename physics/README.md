# physics/

`params.json` is **the** fitted parameter set: data, not code (README §4B). Every zero in it is a Phase 4 deliverable; nothing in `sim/` may hardcode a physics constant. Units: cm, s, degrees (M-01 in math.md).

| Field | Meaning | Notes |
|---|---|---|
| `gravity_z` | cm/s², negative | UE engine default is -980; treat as a fit *initial guess*, never a value to trust (M-08: needs timing data to be identifiable) |
| `charges[i].speed` | muzzle speed at charge bar i, cm/s | four discrete projectile classes, not a continuum |
| `charges[i].gravity_scale` | per-charge gravity multiplier | UE projectiles commonly scale gravity per class |
| `restitution_normal` / `restitution_tangent` | bounce energy retained perpendicular / parallel to surface | anisotropic reflection, M-03 |
| `collision_radius` | dart sphere radius, cm | shifts every contact by r, M-09 |
| `eye_height.*` | camera height per stance, cm | |
| `muzzle_offset` | bolt spawn offset from the eye, cm | near-degenerate with eye height at range; see M-10 |

`fit/` holds the Phase 4 calibration harness (scipy over the pyo3-bound simulator) and the Phase 3 instrumentation design notes.
