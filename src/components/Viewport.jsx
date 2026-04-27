/**
 * Viewport.jsx – A single 3D/2D view panel.
 * Exposes render() via forwardRef + useImperativeHandle.
 * Supports 4 view types: god_map | third_person | first_person | bee_eye
 *
 * god_map uses a pure 2-D canvas (no WebGL):
 *   • terrain elevation + flowers drawn once into an offscreen canvas on first use
 *     (or whenever the panel is resized)
 *   • only the bee position / heading is redrawn each frame
 */
import { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react';
import * as THREE from 'three';

const VIEW_TYPES = [
  { id: 'third_person', icon: '🎥', label: '3rd' },
  { id: 'first_person', icon: '👁',  label: '1st' },
  { id: 'god_map',      icon: '🗺',  label: 'Map' },
  { id: 'bee_eye',      icon: '🐝',  label: 'Eye' },
];

const VIEW_LABELS = {
  third_person: '3rd Person',
  first_person: '1st Person',
  god_map:      'God / Map View',
  bee_eye:      'Bee Eye (Ommatidia)',
};

// ─── 2-D map helpers (module-level, no React deps) ───────────────────────────

const WORLD_M = 200;  // metres across the world square

/** Convert a three.js world (X, Z) position to 2-D canvas pixel coords. */
function w2c(wx, wz, cw, ch) {
  return {
    cx: (wx / WORLD_M + 0.5) * cw,
    cy: (wz / WORLD_M + 0.5) * ch,
  };
}

/** Convert a 24-bit integer colour (e.g. 0xff4488) to a CSS hex string. */
function toCSSColour(hex) {
  return '#' + hex.toString(16).padStart(6, '0');
}

/**
 * Build the static background canvas (terrain + flowers + compass).
 * Called once per viewport-size change; result cached in mapBgRef.
 *
 * Terrain is sampled at a fixed 200×200 grid and then scaled up with the
 * browser's built-in bilinear interpolation — fast enough to run on first
 * frame without causing a visible stutter.
 */
function buildMapBackground(cw, ch, sim) {
  const SAMPLE = 200;   // terrain sampling resolution (pixels)

  // ── Terrain elevation → colour ─────────────────────────────────────
  const terrainCanvas = document.createElement('canvas');
  terrainCanvas.width  = SAMPLE;
  terrainCanvas.height = SAMPLE;
  const tCtx = terrainCanvas.getContext('2d');
  const imgData = tCtx.createImageData(SAMPLE, SAMPLE);
  const d = imgData.data;

  for (let py = 0; py < SAMPLE; py++) {
    for (let px = 0; px < SAMPLE; px++) {
      const wx = (px / SAMPLE - 0.5) * WORLD_M;
      const wz = (py / SAMPLE - 0.5) * WORLD_M;
      const elev = sim.getTerrainHeight(wx, wz);
      // 0 m → dark green, 10 m → yellow-green
      const t = Math.max(0, Math.min(1, elev / 10));
      const i = (py * SAMPLE + px) * 4;
      d[i    ] = Math.round(50  + t * 90);   // R
      d[i + 1] = Math.round(115 + t * 75);   // G
      d[i + 2] = Math.round(45  - t * 15);   // B (slight yellow shift on hills)
      d[i + 3] = 255;
    }
  }
  tCtx.putImageData(imgData, 0, 0);

  // ── Composite onto the full-size canvas ───────────────────────────
  const bg = document.createElement('canvas');
  bg.width  = cw;
  bg.height = ch;
  const ctx = bg.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(terrainCanvas, 0, 0, cw, ch);  // bilinear scale-up

  // ── Flowers ───────────────────────────────────────────────────────
  const pxPerM = cw / WORLD_M;
  if (sim.flowerData) {
    for (const f of sim.flowerData) {
      const { cx, cy } = w2c(f.x, f.z, cw, ch);
      const r = Math.max(2, f.scale * pxPerM * 0.55);
      // Petal disc
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = toCSSColour(f.petalColor);
      ctx.fill();
      // Centre dot
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(1, r * 0.38), 0, Math.PI * 2);
      ctx.fillStyle = toCSSColour(f.centreColor);
      ctx.fill();
    }
  }

  // ── Compass ───────────────────────────────────────────────────────
  const fontSize = Math.max(10, Math.round(cw / 38));
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText('N', cw / 2, 4);

  // ── World boundary ────────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth   = 1;
  ctx.strokeRect(0.5, 0.5, cw - 1, ch - 1);

  return bg;
}

/**
 * Draw the bee marker onto the map canvas for the current frame.
 * bodyYaw = 0 → facing world –Z = north = canvas up.
 * ctx.rotate(–bodyYaw) maps Three.js CCW yaw to canvas CW rotation correctly.
 */
function drawMapBee(ctx, bee, cw, ch) {
  const { cx, cy } = w2c(bee.position.x, bee.position.z, cw, ch);
  const pxPerM = cw / WORLD_M;
  const sz = Math.max(5, pxPerM * 3.5);   // half-body length in pixels

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-bee.bodyYaw);

  // Drop shadow
  ctx.beginPath();
  ctx.ellipse(sz * 0.15, sz * 0.15, sz * 0.55, sz, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fill();

  // Amber body ellipse (elongated along forward axis = canvas –Y)
  ctx.beginPath();
  ctx.ellipse(0, 0, sz * 0.55, sz, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#f5a623';
  ctx.fill();
  ctx.strokeStyle = '#1a0a00';
  ctx.lineWidth   = Math.max(0.5, pxPerM * 0.12);
  ctx.stroke();

  // Dark head circle at the front (–Y = north when yaw=0)
  ctx.beginPath();
  ctx.arc(0, -sz * 0.85, sz * 0.38, 0, Math.PI * 2);
  ctx.fillStyle = '#2a2000';
  ctx.fill();

  // Bright direction pointer (small triangle beyond the head)
  ctx.beginPath();
  ctx.moveTo(0,           -sz * 1.45);
  ctx.lineTo( sz * 0.35,  -sz * 0.95);
  ctx.lineTo(-sz * 0.35,  -sz * 0.95);
  ctx.closePath();
  ctx.fillStyle = '#ff4400';
  ctx.fill();

  ctx.restore();
}

// ─── Viewport component ──────────────────────────────────────────────────────

const Viewport = forwardRef(function Viewport(
  { viewType, onViewChange, simRef, label },
  ref
) {
  const glCanvasRef  = useRef(null);  // WebGL canvas (3rd person, 1st person, eye cam)
  const eyeCanvasRef = useRef(null);  // 2D canvas – bee eye ommatidia view
  const mapCanvasRef = useRef(null);  // 2D canvas – god/map view
  const rendererRef  = useRef(null);
  const camerasRef   = useRef({});
  const lastSizeRef  = useRef({ w: 0, h: 0 });
  const mapBgRef     = useRef(null);  // cached offscreen background for the map
  const mapSizeRef   = useRef({ w: 0, h: 0 });
  const [ready, setReady] = useState(false);

  // ── Init WebGL renderer & cameras (3-D views only) ────────────────
  useEffect(() => {
    const canvas = glCanvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled   = false;
    renderer.outputColorSpace     = THREE.SRGBColorSpace;
    rendererRef.current           = renderer;

    // Perspective camera shared by 3rd-person and 1st-person views.
    // (The bee-eye view manages its own 6 face cameras inside BeeEyeRenderer.)
    const perspCam = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    perspCam.name  = 'perspCam';

    camerasRef.current = { perspCam };
    setReady(true);

    return () => { renderer.dispose(); };
  }, []);

  // ── Expose render() to parent ─────────────────────────────────────
  useImperativeHandle(ref, () => ({
    render() {
      const sim = simRef?.current;
      if (!sim?.scene) return;

      const bee = sim.bee;
      if (!bee) return;

      // ── 2-D map view (pure canvas, no WebGL) ──────────────────────
      if (viewType === 'god_map') {
        const mapCanvas = mapCanvasRef.current;
        if (!mapCanvas) return;

        const mw = mapCanvas.clientWidth;
        const mh = mapCanvas.clientHeight;
        if (mw < 1 || mh < 1) return;

        // Resize pixel buffer and invalidate cache when DOM size changes
        const ms = mapSizeRef.current;
        if (ms.w !== mw || ms.h !== mh) {
          ms.w = mw; ms.h = mh;
          mapCanvas.width  = mw;
          mapCanvas.height = mh;
          mapBgRef.current = null;
        }

        // Build static background once (terrain elevation + flowers)
        if (!mapBgRef.current) {
          mapBgRef.current = buildMapBackground(mw, mh, sim);
        }

        const ctx = mapCanvas.getContext('2d');
        ctx.drawImage(mapBgRef.current, 0, 0);  // splat pre-rendered background
        drawMapBee(ctx, bee, mw, mh);           // draw bee on top
        return;
      }

      // ── WebGL views ───────────────────────────────────────────────
      const renderer = rendererRef.current;
      if (!renderer) return;

      const canvas = glCanvasRef.current;
      const { perspCam } = camerasRef.current;

      // ── bee_eye view ──────────────────────────────────────────────
      // Renders the scene into a cubemap centred on the bee head, then
      // samples each ommatidium by 3-D direction.  No on-screen WebGL
      // camera is needed here, so skip the GL-canvas size guard (which
      // would otherwise early-return because that canvas is display:none).
      if (viewType === 'bee_eye') {
        const beeEye   = sim.beeEye;
        const eyeCanvas = eyeCanvasRef.current;
        if (beeEye && eyeCanvas) {
          const ew = eyeCanvas.clientWidth;
          const eh = eyeCanvas.clientHeight;
          if (ew > 0 && eh > 0 && (eyeCanvas.width !== ew || eyeCanvas.height !== eh)) {
            eyeCanvas.width  = ew;
            eyeCanvas.height = eh;
          }
          beeEye.setCanvas(eyeCanvas);
          beeEye.render(
            renderer,
            sim.scene,
            bee.headWorldPosition,
            bee.bodyYaw + bee.headYaw,
            bee.mesh,
          );
        }
        return;
      }

      // ── On-screen WebGL views (third_person, first_person) ────────
      // Sync canvas pixel buffer to DOM size
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w < 1 || h < 1) return;
      const ls = lastSizeRef.current;
      if (ls.w !== w || ls.h !== h) {
        ls.w = w; ls.h = h;
        renderer.setSize(w, h, false);
        if (perspCam) { perspCam.aspect = w / h; perspCam.updateProjectionMatrix(); }
      }

      switch (viewType) {
        case 'third_person': {
          const behind = bee.bodyForward.clone().negate().multiplyScalar(4.5);
          const camPos = bee.position.clone().add(behind).add(new THREE.Vector3(0, 2.0, 0));
          perspCam.position.copy(camPos);
          perspCam.lookAt(bee.position.clone().add(new THREE.Vector3(0, 0.5, 0)));
          renderer.render(sim.scene, perspCam);
          break;
        }
        case 'first_person': {
          perspCam.position.copy(bee.headWorldPosition);
          perspCam.lookAt(perspCam.position.clone().add(bee.headWorldDirection));
          renderer.render(sim.scene, perspCam);
          break;
        }
      }
    },
    getRenderer() { return rendererRef.current; },
  }), [viewType, simRef]);

  const isBeeEye = viewType === 'bee_eye';
  const isMap    = viewType === 'god_map';

  return (
    <div className="viewport">
      <div className="viewport-label">{VIEW_LABELS[viewType] || viewType}</div>
      {label && (
        <div style={{
          position: 'absolute', top: 6, right: 8, fontSize: 10,
          color: 'rgba(255,255,255,0.25)', zIndex: 10, pointerEvents: 'none',
        }}>
          {label}
        </div>
      )}

      <div className="viewport-canvas-wrap">
        {/* WebGL canvas – 3rd person, 1st person, eye cam pre-render */}
        <canvas
          ref={glCanvasRef}
          style={{ display: (isBeeEye || isMap) ? 'none' : 'block' }}
        />
        {/* 2D canvas – bee eye ommatidia */}
        <canvas
          ref={eyeCanvasRef}
          style={{ display: isBeeEye ? 'block' : 'none', background: '#0a1a04' }}
        />
        {/* 2D canvas – god / map view */}
        <canvas
          ref={mapCanvasRef}
          style={{ display: isMap ? 'block' : 'none' }}
        />
      </div>

      {/* View selector thumbnails */}
      <div className="view-selector">
        {VIEW_TYPES.map(vt => (
          <div
            key={vt.id}
            className={`view-thumb${viewType === vt.id ? ' active' : ''}`}
            onClick={() => onViewChange(vt.id)}
            title={VIEW_LABELS[vt.id]}
          >
            <span className="vt-icon">{vt.icon}</span>
            <span className="vt-label">{vt.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

export default Viewport;
