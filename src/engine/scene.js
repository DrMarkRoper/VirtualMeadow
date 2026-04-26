/**
 * scene.js – Builds and owns the Three.js scene, terrain, flowers, lighting.
 * Returns a { scene, getTerrainHeight, serialise, deserialise, dispose } object.
 */
import * as THREE from 'three';
import { fractalNoise, seededRandom } from './noise.js';

// ─── World constants ─────────────────────────────────────────────────────────
export const WORLD_SIZE  = 200;   // metres
const TERRAIN_SEGS  = 120;
const TERRAIN_SCALE = 0.025;
const TERRAIN_AMP   = 10.0;
const NUM_FLOWERS   = 280;
const FLOWER_TYPES  = [
  { petalColor: 0xff4488, centreColor: 0xffee00, scale: 1.0 },
  { petalColor: 0xffffff, centreColor: 0xffcc00, scale: 0.85 },
  { petalColor: 0xaa44ff, centreColor: 0xffaa00, scale: 0.9  },
  { petalColor: 0xff8800, centreColor: 0xffee22, scale: 0.75 },
  { petalColor: 0xffee44, centreColor: 0xcc8800, scale: 1.1  },
  { petalColor: 0xff2222, centreColor: 0xffff00, scale: 0.95 },
];

// ─── Terrain height function ─────────────────────────────────────────────────
function makeTerrainHeight(seed) {
  return (wx, wz) => {
    // Normalise to noise space
    const nx = (wx / WORLD_SIZE + 0.5) * TERRAIN_SCALE * WORLD_SIZE + seed * 0.01;
    const nz = (wz / WORLD_SIZE + 0.5) * TERRAIN_SCALE * WORLD_SIZE + seed * 0.013;
    const h = fractalNoise(nx, nz, 5, 2.0, 0.5);
    // Bias so edges are flat (border fade)
    const ex = Math.abs(wx) / (WORLD_SIZE * 0.5);
    const ez = Math.abs(wz) / (WORLD_SIZE * 0.5);
    const edge = Math.max(0, 1 - Math.pow(Math.max(ex, ez), 3));
    return (h - 0.3) * TERRAIN_AMP * edge;
  };
}

// ─── Terrain mesh ────────────────────────────────────────────────────────────
function buildTerrain(getTerrainHeight) {
  const geo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, TERRAIN_SEGS, TERRAIN_SEGS);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, getTerrainHeight(x, z));
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();

  const mat = new THREE.MeshLambertMaterial({
    color: 0x4caf50,
    vertexColors: false,
  });
  return new THREE.Mesh(geo, mat);
}

// ─── Flower builder ──────────────────────────────────────────────────────────
function buildFlowers(getTerrainHeight, seed) {
  const group = new THREE.Group();
  group.name = 'flowers';

  // Shared geometries
  const stemGeo    = new THREE.CylinderGeometry(0.02, 0.025, 0.5, 5);
  const centreGeo  = new THREE.SphereGeometry(0.07, 6, 5);

  // Build one flower mesh per type as instanced group
  FLOWER_TYPES.forEach((ft, typeIdx) => {
    const flowerGroup = new THREE.Group();
    const countForType = Math.floor(NUM_FLOWERS / FLOWER_TYPES.length);

    // Stem mat
    const stemMat   = new THREE.MeshLambertMaterial({ color: 0x2e7d32 });
    const petalMat  = new THREE.MeshLambertMaterial({ color: ft.petalColor, side: THREE.DoubleSide });
    const centreMat = new THREE.MeshLambertMaterial({ color: ft.centreColor });

    // Petal shape (simple ellipse)
    const petalShape = new THREE.Shape();
    petalShape.ellipse(0, 0.12, 0.07, 0.12, 0, Math.PI * 2);
    const petalGeo = new THREE.ShapeGeometry(petalShape, 8);

    for (let i = 0; i < countForType; i++) {
      const globalIdx = typeIdx * countForType + i;
      const r1 = seededRandom(seed, globalIdx * 3);
      const r2 = seededRandom(seed, globalIdx * 3 + 1);
      const r3 = seededRandom(seed, globalIdx * 3 + 2);

      // Position in world (avoid centre spawn area 5m)
      let wx, wz;
      const hs = WORLD_SIZE * 0.5 - 4;
      wx = (r1 - 0.5) * hs * 2;
      wz = (r2 - 0.5) * hs * 2;
      const wy = getTerrainHeight(wx, wz);

      const s = ft.scale * (0.8 + r3 * 0.5);
      const flower = new THREE.Group();
      flower.position.set(wx, wy, wz);
      flower.rotation.y = r3 * Math.PI * 2;
      flower.scale.setScalar(s);

      // Stem
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.y = 0.25;
      flower.add(stem);

      // Petals (6 petals around centre)
      const numPetals = 6;
      for (let p = 0; p < numPetals; p++) {
        const petal = new THREE.Mesh(petalGeo, petalMat);
        const angle = (p / numPetals) * Math.PI * 2;
        petal.position.set(Math.sin(angle) * 0.12, 0.5, Math.cos(angle) * 0.12);
        petal.rotation.y = -angle;
        petal.rotation.x = -Math.PI * 0.15;
        flower.add(petal);
      }

      // Centre
      const centre = new THREE.Mesh(centreGeo, centreMat);
      centre.position.y = 0.52;
      flower.add(centre);

      flowerGroup.add(flower);
    }
    group.add(flowerGroup);
  });

  return group;
}

// ─── Sky dome ────────────────────────────────────────────────────────────────
function buildSky() {
  const skyGeo = new THREE.SphereGeometry(400, 16, 8);
  skyGeo.scale(-1, 1, 1); // inside
  const skyMat = new THREE.MeshBasicMaterial({
    color: 0x87ceeb,
    side: THREE.BackSide,
  });
  // Add a gradient-ish look with slight colour shift at horizon
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.name = 'sky';
  return sky;
}

// ─── Clouds (simple billboard quads) ─────────────────────────────────────────
function buildClouds(seed) {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.8,
    side: THREE.DoubleSide,
  });
  for (let i = 0; i < 18; i++) {
    const r1 = seededRandom(seed + 1000, i * 3);
    const r2 = seededRandom(seed + 1000, i * 3 + 1);
    const r3 = seededRandom(seed + 1000, i * 3 + 2);
    const cloudGroup = new THREE.Group();
    const numPuffs = 3 + Math.floor(r3 * 4);
    for (let j = 0; j < numPuffs; j++) {
      const pr = seededRandom(seed + 2000, i * 20 + j);
      const geo = new THREE.SphereGeometry(3 + pr * 4, 6, 4);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set((pr - 0.5) * 14, (pr - 0.5) * 3, 0);
      cloudGroup.add(mesh);
    }
    const cx = (r1 - 0.5) * 350;
    const cz = (r2 - 0.5) * 350;
    cloudGroup.position.set(cx, 40 + r3 * 30, cz);
    cloudGroup.rotation.y = r3 * Math.PI * 2;
    group.add(cloudGroup);
  }
  return group;
}

// ─── Scene builder ───────────────────────────────────────────────────────────
export function buildScene(seed = 12345) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xb2d8e8, 0.008);
  scene.background = new THREE.Color(0x87ceeb);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xfff8e7, 1.2);
  sunLight.position.set(80, 120, 60);
  sunLight.castShadow = false;
  scene.add(sunLight);

  const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x4caf50, 0.4);
  scene.add(hemiLight);

  // Terrain
  const getTerrainHeight = makeTerrainHeight(seed);
  const terrain = buildTerrain(getTerrainHeight);
  terrain.name = 'terrain';
  terrain.receiveShadow = false;
  scene.add(terrain);

  // Flowers
  const flowers = buildFlowers(getTerrainHeight, seed);
  scene.add(flowers);

  // Sky + clouds
  scene.add(buildSky());
  scene.add(buildClouds(seed));

  // ── Serialise / Deserialise ──
  function serialise(beeState) {
    return { seed, bee: beeState };
  }

  function deserialise(data) {
    // Returns new seed so caller can rebuild scene
    return data?.seed ?? seed;
  }

  function dispose() {
    scene.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    });
  }

  return { scene, getTerrainHeight, serialise, deserialise, dispose };
}
