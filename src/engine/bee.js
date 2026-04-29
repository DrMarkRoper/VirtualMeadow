import * as THREE from 'three';
import { inputState } from './inputState.js';

// ─── Constants ───────────────────────────────────────────────────────────────
const BODY_COLOR   = 0xf5a623;
const STRIPE_COLOR = 0x1a1a00;
const HEAD_COLOR   = 0x2a2000;
const WING_COLOR   = 0xaee8ff;
const EYE_COLOR    = 0x330000;

export const FLIGHT = { FREE: 'free', HOVER: 'hover' };

const PARAMS = {
  // Free flight
  maxSpeed:          8.0,
  accel:             4.0,
  braking:           20.0,
  headYawRate:       2.0,   // rad/s continuous yaw
  bodyYawFollow:     6.0,   // rad/s — body snaps ~100 ms after head (bee saccade zig-zag)
  minHoverSpeed:     0.6,
  climbRate:         3.0,   // AGL target change rate in free flight (m/s)
  // Hover
  hoverMoveSpeed:    0.6,
  hoverYawRate:      0.8,
  hoverClimbRate:    1.0,   // AGL target change rate in hover (m/s)
  // Terrain following
  minHeight:         0.5,   // minimum AGL (metres above ground)
  maxAGL:           60.0,
  terrainFollowRate: 6.0,
  // Animation
  wingFlapRate:     12.0,
  wingFlapAmp:       0.45,
};

// ─── Bee Model Builder ───────────────────────────────────────────────────────
function buildBeeModel() {
  const group = new THREE.Group();
  group.name = 'beeRoot';

  const bodyGroup = new THREE.Group();
  bodyGroup.name = 'bodyGroup';
  group.add(bodyGroup);

  // ── Abdomen ──────────────────────────────────────────────────────────────
  const abdGeo = new THREE.SphereGeometry(0.28, 10, 8);
  abdGeo.scale(1, 0.85, 1.7);
  const abdomen = new THREE.Mesh(abdGeo, new THREE.MeshLambertMaterial({ color: BODY_COLOR }));
  abdomen.position.set(0, 0, 0.25);
  abdomen.name = 'abdomen';
  bodyGroup.add(abdomen);

  // ── Stripes ───────────────────────────────────────────────────────────────
  [0.0, 0.2, 0.42].forEach((z, i) => {
    const sg = new THREE.TorusGeometry(0.24, 0.07, 6, 16);
    const stripe = new THREE.Mesh(sg, new THREE.MeshLambertMaterial({
      color: i % 2 === 0 ? STRIPE_COLOR : BODY_COLOR,
    }));
    stripe.rotation.x = Math.PI / 2;
    stripe.position.set(0, 0, 0.08 + z);
    stripe.scale.set(1, 1, 0.4);
    bodyGroup.add(stripe);
  });

  // ── Thorax ────────────────────────────────────────────────────────────────
  const thrGeo = new THREE.SphereGeometry(0.2, 8, 6);
  thrGeo.scale(1, 0.9, 1.2);
  const thorax = new THREE.Mesh(thrGeo, new THREE.MeshLambertMaterial({ color: BODY_COLOR }));
  thorax.position.set(0, 0.02, 0);
  bodyGroup.add(thorax);

  // ── Wings ─────────────────────────────────────────────────────────────────
  const wingShape = new THREE.Shape();
  wingShape.ellipse(0, 0, 0.55, 0.22, 0, Math.PI * 2);
  const wingGeo = new THREE.ShapeGeometry(wingShape, 12);
  const wingMat = new THREE.MeshLambertMaterial({
    color: WING_COLOR, transparent: true, opacity: 0.45, side: THREE.DoubleSide,
  });
  [
    { x:  0.28, y: 0.15, z: -0.28, ry:  0.25 },
    { x: -0.28, y: 0.15, z: -0.28, ry: -0.25 },
    { x:  0.22, y: 0.12, z: -0.08, ry:  0.3  },
    { x: -0.22, y: 0.12, z: -0.08, ry: -0.3  },
  ].forEach((wp, idx) => {
    const wing = new THREE.Mesh(wingGeo, wingMat);
    wing.position.set(wp.x, wp.y, wp.z);
    wing.rotation.y = wp.ry;
    wing.rotation.x = -0.15;
    wing.name = `wing${idx}`;
    bodyGroup.add(wing);
  });

  // ── Legs ──────────────────────────────────────────────────────────────────
  const legMat = new THREE.LineBasicMaterial({ color: 0x1a1000 });
  [
    [-0.24, 0, -0.30], [-0.24, 0, -0.15], [-0.24, 0,  0.00],
    [ 0.24, 0, -0.30], [ 0.24, 0, -0.15], [ 0.24, 0,  0.00],
  ].forEach(([lx, ly, lz]) => {
    const pts = [
      new THREE.Vector3(lx, ly, lz),
      new THREE.Vector3(lx * 1.5, ly - 0.22, lz + 0.1),
    ];
    bodyGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), legMat));
  });

  // ── Head group ────────────────────────────────────────────────────────────
  const headGroup = new THREE.Group();
  headGroup.name = 'headGroup';
  headGroup.position.set(0, 0.05, -0.50);
  bodyGroup.add(headGroup);

  headGroup.add(new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 8, 6),
    new THREE.MeshLambertMaterial({ color: HEAD_COLOR }),
  ));

  const eyeMat = new THREE.MeshLambertMaterial({ color: EYE_COLOR });
  [-1, 1].forEach(side => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), eyeMat);
    eye.position.set(side * 0.14, 0.02, -0.05);
    eye.scale.z = 0.7;
    headGroup.add(eye);
  });

  const antMat = new THREE.LineBasicMaterial({ color: 0x111100 });
  [-1, 1].forEach(side => {
    const pts = [
      new THREE.Vector3(side * 0.07,  0.12, -0.08),
      new THREE.Vector3(side * 0.14,  0.35, -0.22),
      new THREE.Vector3(side * 0.17,  0.42, -0.26),
    ];
    headGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), antMat));
  });

  // ── Stinger ───────────────────────────────────────────────────────────────
  const stinger = new THREE.Mesh(
    new THREE.ConeGeometry(0.03, 0.12, 5),
    new THREE.MeshLambertMaterial({ color: 0x1a0000 }),
  );
  stinger.rotation.x = Math.PI / 2;
  stinger.position.set(0, 0, 0.62);
  bodyGroup.add(stinger);

  return { group, bodyGroup, headGroup };
}

// ─── Bee Controller ──────────────────────────────────────────────────────────
export class BeeController {
  constructor(getTerrainHeight) {
    this.getTerrainHeight = getTerrainHeight;
    const { group, bodyGroup, headGroup } = buildBeeModel();
    this.mesh      = group;
    this.bodyGroup = bodyGroup;
    this.headGroup = headGroup;

    this.position   = new THREE.Vector3(0, 4, 10);
    this.bodyYaw    = 0;
    this.headYaw    = 0;
    this.speed        = 0;
    this.flightMode   = FLIGHT.FREE;
    this._pendingHover = false;   // true while auto-braking to enter hover

    this.hoverVelX = 0;
    this.hoverVelZ = 0;
    this.wingPhase = 0;

    const startGround = getTerrainHeight(0, 10);
    this.targetAGL = Math.max(PARAMS.minHeight, 4 - startGround);
  }

  _tryToggleFlightMode() {
    if (this.flightMode === FLIGHT.FREE) {
      if (this._pendingHover) return;   // already braking, ignore repeat presses
      if (this.speed === 0) {
        // Already stopped — switch instantly
        this.flightMode    = FLIGHT.HOVER;
        this.hoverVelX     = 0;
        this.hoverVelZ     = 0;
      } else {
        // Moving — queue auto-brake; _updateFreeFlight will complete the switch
        this._pendingHover = true;
      }
    } else {
      this.flightMode    = FLIGHT.FREE;
      this._pendingHover = false;
      this.speed         = 0;
    }
  }

  get pendingHover() { return this._pendingHover; }

  get flightModeLabel() { return this.flightMode === FLIGHT.FREE ? 'Fast' : 'Hover'; }

  get bodyForward() {
    return new THREE.Vector3(-Math.sin(this.bodyYaw), 0, -Math.cos(this.bodyYaw));
  }
  get bodyRight() {
    return new THREE.Vector3(Math.cos(this.bodyYaw), 0, -Math.sin(this.bodyYaw));
  }

  /**
   * update(dt) — reads from the shared inputState (written by
   * KeyboardController + TouchController each frame before this call).
   */
  update(dt) {
    const inp = inputState;
    const p   = PARAMS;

    // ── Consume one-shot events ───────────────────────────────────────
    if (inp.modeToggle) {
      inp.modeToggle = false;
      this._tryToggleFlightMode();
    }

    if (this.flightMode === FLIGHT.FREE) {
      this._updateFreeFlight(dt, inp, p);
    } else {
      this._updateHover(dt, inp, p);
    }

    // ── Terrain-following AGL control ─────────────────────────────────
    const climbR = this.flightMode === FLIGHT.FREE ? p.climbRate : p.hoverClimbRate;
    if (inp.climb > 0)
      this.targetAGL = Math.min(this.targetAGL + climbR * inp.climb * dt, p.maxAGL);
    if (inp.climb < 0)
      this.targetAGL = Math.max(this.targetAGL + climbR * inp.climb * dt, p.minHeight);

    const ty      = this.getTerrainHeight(this.position.x, this.position.z);
    const targetY = ty + this.targetAGL;
    const alpha   = Math.min(1, p.terrainFollowRate * dt);
    this.position.y += (targetY - this.position.y) * alpha;
    if (this.position.y < ty + p.minHeight) this.position.y = ty + p.minHeight;

    // ── World boundary — hard stop at ±100 m ─────────────────────────
    // Clamp position and zero all movement so the user must yaw to re-enter.
    const WORLD = 100;
    if (Math.abs(this.position.x) > WORLD || Math.abs(this.position.z) > WORLD) {
      this.position.x = Math.max(-WORLD, Math.min(WORLD, this.position.x));
      this.position.z = Math.max(-WORLD, Math.min(WORLD, this.position.z));
      this.speed      = 0;
      this.hoverVelX  = 0;
      this.hoverVelZ  = 0;
    }

    // ── Wing animation ────────────────────────────────────────────────
    this.wingPhase += p.wingFlapRate * dt * Math.PI * 2;
    const wa = Math.sin(this.wingPhase) * p.wingFlapAmp;
    [0, 1, 2, 3].forEach(i => {
      const wing = this.bodyGroup.getObjectByName(`wing${i}`);
      if (wing) wing.rotation.z = (i % 2 === 0 ? 1 : -1) * wa;
    });

    // ── Sync Three.js transforms ──────────────────────────────────────
    this.mesh.position.copy(this.position);
    this.bodyGroup.rotation.y = this.bodyYaw;
    this.headGroup.rotation.y = this.headYaw;
  }

  _updateFreeFlight(dt, inp, p) {
    // Consume saccade (free flight: instant head snap, body follows)
    if (inp.saccade !== 0) {
      this.headYaw = Math.max(-Math.PI, Math.min(Math.PI, this.headYaw + inp.saccade));
      inp.saccade = 0;
    }

    // Continuous head yaw from axis input
    if (inp.yaw !== 0)
      this.headYaw = Math.max(-Math.PI, Math.min(Math.PI,
        this.headYaw + p.headYawRate * inp.yaw * dt));

    // Body follows head
    const dYaw   = this.headYaw;
    const follow = Math.sign(dYaw) * Math.min(Math.abs(dYaw), p.bodyYawFollow * dt);
    this.bodyYaw += follow;
    this.headYaw -= follow;

    if (this._pendingHover) {
      // Auto-brake to hover — ignore player throttle, apply full braking
      this.speed = Math.max(0, this.speed - p.braking * dt);
      if (this.speed === 0) {
        this._pendingHover = false;
        this.flightMode    = FLIGHT.HOVER;
        this.hoverVelX     = 0;
        this.hoverVelZ     = 0;
      }
    } else {
      // Normal speed control — accelerate, brake, or hold
      if (inp.move.fwd > 0)
        this.speed = Math.min(this.speed + p.accel * inp.move.fwd * dt, p.maxSpeed);
      else if (inp.move.fwd < 0)
        this.speed = Math.max(this.speed + p.braking * inp.move.fwd * dt, 0);
    }

    const fwd = this.bodyForward;
    this.position.x += fwd.x * this.speed * dt;
    this.position.z += fwd.z * this.speed * dt;
  }

  _updateHover(dt, inp, p) {
    // Consume saccade (hover: direct body yaw)
    if (inp.saccade !== 0) {
      this.bodyYaw += inp.saccade;
      inp.saccade = 0;
    }

    // Continuous yaw
    if (inp.yaw !== 0)
      this.bodyYaw += p.hoverYawRate * inp.yaw * dt;

    // Re-centre head
    this.headYaw *= Math.max(0, 1 - dt * 4);

    // Translation
    const fwd   = this.bodyForward;
    const right = this.bodyRight;
    let vx = 0, vz = 0;
    if (inp.move.fwd   >  0) { vx += fwd.x   * inp.move.fwd;   vz += fwd.z   * inp.move.fwd;   }
    if (inp.move.fwd   <  0) { vx += fwd.x   * inp.move.fwd;   vz += fwd.z   * inp.move.fwd;   }
    if (inp.move.strafe !== 0) { vx += right.x * inp.move.strafe; vz += right.z * inp.move.strafe; }

    const smooth = Math.min(1, dt * 6);
    this.hoverVelX += (vx * p.hoverMoveSpeed - this.hoverVelX) * smooth;
    this.hoverVelZ += (vz * p.hoverMoveSpeed - this.hoverVelZ) * smooth;
    this.position.x += this.hoverVelX * dt;
    this.position.z += this.hoverVelZ * dt;
  }

  get headWorldPosition() {
    const headLocal = new THREE.Vector3(0, 0.05, -0.50);
    headLocal.applyEuler(new THREE.Euler(0, this.bodyYaw, 0));
    return this.position.clone().add(headLocal).add(new THREE.Vector3(0, 0.05, 0));
  }

  get headWorldDirection() {
    const hy = this.bodyYaw + this.headYaw;
    return new THREE.Vector3(-Math.sin(hy), 0, -Math.cos(hy));
  }

  serialise() {
    return {
      position:   this.position.toArray(),
      bodyYaw:    this.bodyYaw,
      headYaw:    this.headYaw,
      speed:      this.speed,
      flightMode: this.flightMode,
      targetAGL:  this.targetAGL,
    };
  }

  deserialise(data) {
    if (!data) return;
    this.position.fromArray(data.position || [0, 4, 10]);
    this.bodyYaw    = data.bodyYaw    ?? 0;
    this.headYaw    = data.headYaw    ?? 0;
    this.speed      = data.speed      ?? 0;
    this.flightMode = data.flightMode ?? FLIGHT.FREE;
    this.targetAGL  = data.targetAGL  ?? PARAMS.minHeight + 3;
  }

  // dispose is now a no-op for the bee itself — keyboard listeners live in
  // KeyboardController.  Kept for API compatibility.
  dispose() {}
}
