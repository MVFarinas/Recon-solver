// recon-viewer: deliberately ugly debug tool (README §4E, D-003).
// Phase 0 skeleton: empty scene + grid + orbit controls.
// Phase 1 adds: load ascent.collision.bin as wireframe, click-to-query.
// Phase 2 adds: trajectory polylines.
//
// Coordinate note (math.md M-01): the project is UE cm/Z-up/left-handed;
// three.js is Y-up/right-handed. This viewer displays UE coordinates by
// mapping at load time only; it must never write coordinates back.

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  1,
  200_000, // map extents are tens of thousands of cm
);
camera.position.set(2_000, 2_000, 1_500);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);

// 100m x 100m reference grid, 1m cells (displayed in UE cm).
scene.add(new THREE.GridHelper(10_000, 100, 0x335533, 0x223322));
scene.add(new THREE.AxesHelper(500));

const hud = document.getElementById("hud")!;
hud.textContent =
  "recon-viewer (Phase 0 skeleton)\n" +
  "grid: 1m cells | axes: 5m\n" +
  "mesh loading arrives in Phase 1";

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
});
