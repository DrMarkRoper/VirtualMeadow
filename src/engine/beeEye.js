/**
 * beeEye.js – JavaScript port of Andy Giger's B-EYE ommatidia algorithm.
 *
 * Original: Processing_OmmatidiaView_R001_10.pde (adapted from andygiger.com/science/beye)
 * Port by: VirtualMeadow project
 *
 * Adaptation for 3D engine:
 *  Since our scene is already rendered in 3D by Three.js (perspective projection),
 *  we skip ProjAng and directly map ommatidia angular positions to pixels
 *  in the perspective-rendered offscreen image, then apply the Gaussian acceptance
 *  function and display the hexagonal mosaic.
 */

import * as THREE from 'three';

// ── Parameters matching original ──────────────────────────────────────────────
const RT_W   = 200;                    // offscreen render target width
const RT_H   = 200;                    // offscreen render target height
const SIZEA  = 120;                    // angular grid (for ProjAng path if used)
const DR     = 2.6 / 180 * Math.PI;   // angular resolution per ommatidium
const BGR    = [0, 120, 40];           // background colour (dark green)
const EYE_FOV = 110 * Math.PI / 180;  // camera FOV for offscreen render (radians)

export class BeeEyeRenderer {
  constructor() {
    this.omm   = [];
    this.nromm = 0;
    this.gau   = [];
    this.gsp   = 0;

    this._buildOmmatidia();
    this._buildGauss();

    // Off-screen render target for the 3D first-person view
    this.renderTarget = new THREE.WebGLRenderTarget(RT_W, RT_H, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format:    THREE.RGBAFormat,
      type:      THREE.UnsignedByteType,
    });
    this.pixelBuffer = new Uint8Array(RT_W * RT_H * 4);

    this.canvas  = null;
    this.ctx     = null;
    this.distmm  = 30;

    // Pre-compute focal length for pixel↔angle mapping
    this._focal  = (RT_W / 2) / Math.tan(EYE_FOV / 2);
  }

  // ── CreateOmm: direct port from Processing ────────────────────────────────
  _buildOmmatidia() {
    const dphmin = 0.0489, dphmax = 0.0646;
    const dpvmin = 0.0262, dpvmax = 0.0611;
    let x = 0, y = 0;
    let oddy = false;
    let i = 0;
    while (y < 1.57) {
      while (x < 1.57) {
        this.omm[i]   = { x:  x,  y:  y, r: BGR[0], g: BGR[1], b: BGR[2] };
        this.omm[i+1] = { x: -x,  y:  y, r: BGR[0], g: BGR[1], b: BGR[2] };
        this.omm[i+2] = { x:  x,  y: -y, r: BGR[0], g: BGR[1], b: BGR[2] };
        this.omm[i+3] = { x: -x,  y: -y, r: BGR[0], g: BGR[1], b: BGR[2] };
        i += 4;
        const wg = dphmin + Math.abs((x - 0.7854) * ((dphmax - dphmin) / 0.7854));
        const x2 = Math.sin(wg / 2) / Math.cos(y);
        x = x2 <= 1 ? x + Math.asin(x2) * 2 : 1.57;
      }
      y += (dpvmin + y * ((dpvmax - dpvmin) / 1.5708)) / 2;
      if (!oddy && y < 1.57) {
        const x2 = Math.sin(dphmax / 2) / Math.cos(y);
        x = x2 <= 1 ? Math.asin(x2) : 1.57;
        oddy = true;
      } else {
        x = 0; oddy = false;
      }
    }
    this.nromm = Math.max(0, i - 4);
  }

  // ── CreateGaussLow: direct port ───────────────────────────────────────────
  _buildGauss() {
    this.gau[0] = { x: 0, y: 0, g: 0.10225 };
    this.gsp = 1;
    for (let i = 1; i <= 2; i++) {
      const k = i * 8;
      const g = 0.10225 * Math.exp(-0.6932 * Math.pow(i * 3 / 4.0, 2));
      for (let j = 0; j < k; j++) {
        this.gau[this.gsp++] = {
          x: (i * 3 / 4.0) * Math.sin(6.2832 / k * j),
          y: (i * 3 / 4.0) * Math.cos(6.2832 / k * j),
          g,
        };
      }
    }
  }

  // ── Attach output 2D canvas ────────────────────────────────────────────────
  setCanvas(canvas) {
    if (this.canvas === canvas) return;
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
  }

  // ── Read pixels from WebGL render target (flip Y) ─────────────────────────
  _readPixels(renderer) {
    renderer.readRenderTargetPixels(
      this.renderTarget, 0, 0, RT_W, RT_H, this.pixelBuffer
    );
  }

  // ── Sample pixel from offscreen buffer (bilinear, Y-flipped) ─────────────
  _samplePixel(px, py) {
    // WebGL textures are bottom-up, so flip Y
    const fpx = Math.round(px);
    const fpy = RT_H - 1 - Math.round(py);
    if (fpx < 0 || fpx >= RT_W || fpy < 0 || fpy >= RT_H) return BGR;
    const idx = (fpy * RT_W + fpx) * 4;
    return [this.pixelBuffer[idx], this.pixelBuffer[idx+1], this.pixelBuffer[idx+2]];
  }

  // ── ProcPat adapted for perspective projection ────────────────────────────
  // Each ommatidium (ax, ay) maps to pixel in perspective-rendered image:
  //   px = W/2 + focal * tan(ax),  py = H/2 + focal * tan(ay)
  // Gaussian offsets are in ommatidium-width units, scaled to pixel offsets.
  _procPat() {
    const focal = this._focal;
    const halfW = RT_W / 2;
    const halfH = RT_H / 2;

    for (let i = 0; i < this.nromm; i++) {
      const ax = this.omm[i].x;  // horizontal angle (radians)
      const ay = this.omm[i].y;  // vertical angle (radians)

      // Skip ommatidia beyond the camera's FOV
      if (Math.abs(ax) > EYE_FOV / 2 * 0.95 || Math.abs(ay) > EYE_FOV / 2 * 0.95) {
        this.omm[i].r = BGR[0];
        this.omm[i].g = BGR[1];
        this.omm[i].b = BGR[2];
        continue;
      }

      // Centre pixel of this ommatidium
      const cx = halfW + focal * Math.tan(ax);
      const cy = halfH + focal * Math.tan(ay);

      // Angular width of this ommatidium in pixels (from DR and focal)
      const hx = Math.sin(DR / 4) / Math.cos(ay);
      const fxPx = hx <= 1 ? Math.asin(hx) * 2 * focal : Math.PI * focal;
      const fyPx = DR / (2 * Math.PI) * focal * 2;

      // Gaussian accumulation
      let cr = 0, cg = 0, cb = 0;
      for (let j = 0; j < this.gsp; j++) {
        const spx = cx + this.gau[j].x * fxPx;
        const spy = cy + this.gau[j].y * fyPx;
        const c   = this._samplePixel(spx, spy);
        cr += c[0] * this.gau[j].g;
        cg += c[1] * this.gau[j].g;
        cb += c[2] * this.gau[j].g;
      }
      this.omm[i].r = cr;
      this.omm[i].g = cg;
      this.omm[i].b = cb;
    }
  }

  // ── DispHex: draw hexagonal mosaic on the output 2D canvas ───────────────
  _dispHex() {
    if (!this.ctx || !this.canvas) return;
    const W   = this.canvas.width;
    const H   = this.canvas.height;
    const ctx = this.ctx;

    ctx.fillStyle = `rgb(${BGR[0]},${BGR[1]},${BGR[2]})`;
    ctx.fillRect(0, 0, W, H);

    // Build wabe grid – port of Processing DispHex
    const WABE_W = 60, WABE_H = 160;
    const wabe = new Array(WABE_W).fill(null).map(() =>
      new Array(WABE_H).fill(null).map(() => BGR.slice())
    );

    let wx = 0, wy = 0, odd = 0;
    for (let i = 0; i < this.nromm - 4; i += 4) {
      const row  = Math.min(WABE_H - 1, 80 + wy);
      const rowN = Math.max(0,           80 - wy);
      const colR = Math.min(WABE_W - 1, 30 + wx);
      const colL = Math.max(0,          30 - wx - odd);

      if (colR >= 0 && colR < WABE_W && row >= 0 && row < WABE_H)
        wabe[colR][row]  = [this.omm[i].r,   this.omm[i].g,   this.omm[i].b];
      if (colL >= 0 && colL < WABE_W && row >= 0 && row < WABE_H)
        wabe[colL][row]  = [this.omm[i+1].r, this.omm[i+1].g, this.omm[i+1].b];
      if (colR >= 0 && colR < WABE_W && rowN >= 0 && rowN < WABE_H)
        wabe[colR][rowN] = [this.omm[i+2].r, this.omm[i+2].g, this.omm[i+2].b];
      if (colL >= 0 && colL < WABE_W && rowN >= 0 && rowN < WABE_H)
        wabe[colL][rowN] = [this.omm[i+3].r, this.omm[i+3].g, this.omm[i+3].b];

      if (i + 4 < this.nromm && this.omm[i + 4].x < this.omm[i].x) {
        wx = 0; wy++;
        odd = odd === 1 ? 0 : 1;
      } else {
        wx++;
      }
    }

    // Render wabe grid as hexagonal circles
    const cellW = W / WABE_W;
    const cellH = H / WABE_H;
    const r     = Math.min(cellW, cellH) * 0.58;

    for (let j = 0; j < WABE_H; j++) {
      const offX = (j % 2 === 1) ? cellW * 0.5 : 0;
      for (let i = 0; i < WABE_W; i++) {
        const c  = wabe[i][j];
        ctx.fillStyle = `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
        ctx.beginPath();
        ctx.arc(i * cellW + offX + cellW * 0.5, j * cellH + cellH * 0.5, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // ── Main render call (called from Viewport each frame) ────────────────────
  render(renderer, camera, scene) {
    if (!scene || !camera || !renderer) return;

    // 1. Render 3D scene to offscreen target
    const prevTarget = renderer.getRenderTarget();
    renderer.setRenderTarget(this.renderTarget);
    renderer.render(scene, camera);
    renderer.setRenderTarget(prevTarget);

    // 2. Read pixel data
    this._readPixels(renderer);

    // 3. Sample through ommatidia
    this._procPat();

    // 4. Draw hexagonal mosaic
    this._dispHex();
  }

  dispose() {
    this.renderTarget.dispose();
  }
}
