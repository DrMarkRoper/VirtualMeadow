/**
 * Viewport.jsx – A single 3D/2D view panel.
 * Exposes render() via forwardRef + useImperativeHandle.
 * Supports 4 view types: god_map | third_person | first_person | bee_eye
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

const Viewport = forwardRef(function Viewport(
  { viewType, onViewChange, simRef, label },
  ref
) {
  const glCanvasRef  = useRef(null);  // WebGL canvas (3d views)
  const eyeCanvasRef = useRef(null);  // 2D canvas (bee eye view)
  const rendererRef  = useRef(null);
  const camerasRef   = useRef({});    // one camera per view type
  const lastSizeRef  = useRef({w:0,h:0});
  const [ready, setReady] = useState(false);

  // ── Init renderer & cameras ───────────────────────────────────────
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
    renderer.shadowMap.enabled = false;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;

    // Perspective camera (shared for 3rd & 1st person)
    const perspCam = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    perspCam.name = 'perspCam';

    // Orthographic camera for god/map view.
    // Set rotation.x = -PI/2 directly so the camera looks straight down (-Y world)
    // without any lookAt() call.  lookAt() with a straight-down direction is
    // ambiguous (parallel to default up vector) and produces wrong orientations.
    const orthoSize = 80;
    const orthoCam = new THREE.OrthographicCamera(-orthoSize, orthoSize, orthoSize, -orthoSize, 1, 600);
    orthoCam.rotation.x = -Math.PI / 2;   // tilt: local -Z → world -Y (straight down)
    orthoCam.position.set(0, 300, 0);
    orthoCam.name = 'orthoCam';

    // Bee eye uses a perspective cam at bee head
    const eyeCam = new THREE.PerspectiveCamera(110, 1, 0.1, 800);
    eyeCam.name = 'eyeCam';

    camerasRef.current = { perspCam, orthoCam, eyeCam };
    setReady(true);

    return () => {
      renderer.dispose();
    };
  }, []);

  // ── Expose render() to parent (App) via ref ────────────────────────
  useImperativeHandle(ref, () => ({
    render() {
      const sim     = simRef?.current;
      const renderer = rendererRef.current;
      if (!sim?.scene || !renderer) return;

      const canvas = glCanvasRef.current;
      const { perspCam, orthoCam, eyeCam } = camerasRef.current;

      // Sync canvas size to DOM size
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w < 1 || h < 1) return;
      const ls = lastSizeRef.current;
      if (ls.w !== w || ls.h !== h) {
        ls.w = w; ls.h = h;
        renderer.setSize(w, h, false);
        if (perspCam) perspCam.aspect = w / h;
        if (perspCam) perspCam.updateProjectionMatrix();
        if (eyeCam)   { eyeCam.aspect = w / h; eyeCam.updateProjectionMatrix(); }
        const half = Math.max(w, h) * 0.4;
        if (orthoCam) {
          const ar = w / h;
          orthoCam.left   = -80 * ar;
          orthoCam.right  =  80 * ar;
          orthoCam.top    =  80;
          orthoCam.bottom = -80;
          orthoCam.updateProjectionMatrix();
        }
      }

      const bee = sim.bee;
      if (!bee) return;

      switch (viewType) {
        case 'third_person': {
          // Camera behind and above the bee
          const behind = bee.bodyForward.clone().negate().multiplyScalar(4.5);
          const camPos = bee.position.clone().add(behind).add(new THREE.Vector3(0, 2.0, 0));
          perspCam.position.copy(camPos);
          const target = bee.position.clone().add(new THREE.Vector3(0, 0.5, 0));
          perspCam.lookAt(target);
          renderer.render(sim.scene, perspCam);
          break;
        }
        case 'first_person': {
          // Camera at bee's head
          perspCam.position.copy(bee.headWorldPosition);
          const fwd = bee.headWorldDirection;
          perspCam.lookAt(perspCam.position.clone().add(fwd));
          renderer.render(sim.scene, perspCam);
          break;
        }
        case 'god_map': {
          // Top-down orthographic, centred on bee.
          // rotation.x = -PI/2 was set at init and never changes — just update XZ.
          orthoCam.position.set(bee.position.x, 300, bee.position.z);

          // Switch to flat ambient-only lighting so the top-down sun doesn't
          // wash the green terrain to near-white (upward normals get max sun).
          const L = sim.lights;
          if (L) {
            L.sun.intensity  = 0;
            L.hemi.intensity = 0;
            L.ambient.intensity = 1.8;
          }
          renderer.render(sim.scene, orthoCam);
          // Restore lighting for all other views.
          if (L) {
            L.sun.intensity  = 1.2;
            L.hemi.intensity = 0.4;
            L.ambient.intensity = 0.5;
          }
          break;
        }
        case 'bee_eye': {
          // Position eye camera at bee head, looking in head direction
          eyeCam.position.copy(bee.headWorldPosition);
          const efwd = bee.headWorldDirection;
          eyeCam.lookAt(eyeCam.position.clone().add(efwd));
          // Let beeEye handle rendering
          const beeEye = sim.beeEye;
          if (beeEye) {
            const eyeCanvas = eyeCanvasRef.current;
            if (eyeCanvas) {
              const ew = eyeCanvas.clientWidth;
              const eh = eyeCanvas.clientHeight;
              if (ew > 0 && eh > 0 && (eyeCanvas.width !== ew || eyeCanvas.height !== eh)) {
                eyeCanvas.width  = ew;
                eyeCanvas.height = eh;
              }
              beeEye.setCanvas(eyeCanvas);
              beeEye.render(renderer, eyeCam, sim.scene);
            }
          }
          break;
        }
      }
    },
    getRenderer() { return rendererRef.current; },
  }), [viewType, simRef]);

  const isBeeEye = viewType === 'bee_eye';

  return (
    <div className="viewport">
      <div className="viewport-label">{VIEW_LABELS[viewType] || viewType}</div>
      {label && <div style={{ position:'absolute', top:6, right:8, fontSize:10, color:'rgba(255,255,255,0.25)', zIndex:10, pointerEvents:'none' }}>{label}</div>}

      <div className="viewport-canvas-wrap">
        {/* WebGL canvas – shown for all views except bee eye */}
        <canvas
          ref={glCanvasRef}
          style={{ display: isBeeEye ? 'none' : 'block' }}
        />
        {/* 2D canvas – shown for bee eye */}
        <canvas
          ref={eyeCanvasRef}
          style={{ display: isBeeEye ? 'block' : 'none', background: '#0a1a04' }}
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
