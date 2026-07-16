//! Inverse solver (Phase 5): sweep pitch×yaw per (stance, charge, bounces)
//! config, flood-fill cluster on the regular grid, refine per cluster,
//! score (inscribed-radius aim tolerance, anchor, positional tolerance).
//!
//! Phase 0 scaffold: no solver code yet. See plan.md Phase 5 and
//! math.md M-06, M-07.

#[cfg(test)]
mod tests {
    #[test]
    fn scaffold_smoke() {
        assert_eq!(recon_sim::COORDINATE_SYSTEM, "UE: cm, Z-up, left-handed");
    }
}
