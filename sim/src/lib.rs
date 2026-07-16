//! Forward simulator (Phase 2): continuous-time swept-sphere trajectory
//! simulation against a BVH-indexed triangle soup. Pure, deterministic,
//! allocation-free in the hot loop. Physics constants come exclusively
//! from `physics/params.json`, never hardcoded here.
//!
//! Phase 0 scaffold: no simulation code yet. See plan.md Phase 2 and
//! math.md M-02..M-05, M-09 for the math this crate will implement.

/// Coordinate convention marker: Unreal (centimeters, Z-up, left-handed)
/// (math.md M-01). Every `glam::Vec3` in this workspace is in this frame.
pub const COORDINATE_SYSTEM: &str = "UE: cm, Z-up, left-handed";

#[cfg(test)]
mod tests {
    #[test]
    fn scaffold_smoke() {
        assert_eq!(super::COORDINATE_SYSTEM, "UE: cm, Z-up, left-handed");
    }
}
