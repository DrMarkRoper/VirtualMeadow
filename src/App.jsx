/**
 * App.jsx – VirtualMeadow v.0.2
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import Toolbar from './components/Toolbar.jsx';
import ViewportContainer from './components/ViewportContainer.jsx';
import TabPanel from './components/TabPanel.jsx';
import TouchControls from './components/TouchControls.jsx';
import { buildScene } from './engine/scene.js';
import { BeeController, FLIGHT } from './engine/bee.js';
import { BeeEyeRenderer } from './engine/beeEye.js';
import { KeyboardController } from './engine/keyboardController.js';
import { TouchController } from './engine/touchController.js';
import { inputState, clearInputState } from './engine/inputState.js';
import './App.css';

const IS_MOBILE = typeof navigator !== 'undefined' &&
  (navigator.maxTouchPoints > 0 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent));

function checkGyroAvailable(cb) {
  if (typeof DeviceOrientationEvent === 'undefined') { cb(false); return; }
  const hasPermission = typeof DeviceOrientationEvent.requestPermission === 'function';
  if (!hasPermission) {
    const handler = (e) => {
      window.removeEventListener('deviceorientation', handler);
      cb(e.gamma != null);
    };
    window.addEventListener('deviceorientation', handler, { once: true });
    setTimeout(() => { window.removeEventListener('deviceorientation', handler); cb(false); }, 500);
  } else {
    cb(true); // iOS — assume available; permission requested on button press
  }
}

export default function App() {
  // ── Layout ────────────────────────────────────────────────────────
  const [viewportFlex, setViewportFlex] = useState(65);
  const [isDraggingV,  setIsDraggingV]  = useState(false);
  const [vpCollapsed,  setVpCollapsed]  = useState(false);
  const [tabCollapsed, setTabCollapsed] = useState(false);
  const workspaceRef = useRef(null);
  const prevFlexRef  = useRef(65);

  // ── Mobile tab ────────────────────────────────────────────────────
  const [mobileTab, setMobileTab] = useState('view');

  // ── View types ────────────────────────────────────────────────────
  const [view1Type, setView1Type] = useState('third_person');
  const [view2Type, setView2Type] = useState('bee_eye');

  // ── Simulation refs ───────────────────────────────────────────────
  const simRef   = useRef(null);
  const kbRef    = useRef(null);
  const touchRef = useRef(null);

  // ── Viewport refs ─────────────────────────────────────────────────
  const viewport1Ref = useRef(null);
  const viewport2Ref = useRef(null);

  // ── Status state ──────────────────────────────────────────────────
  const [flightMode,      setFlightMode]      = useState('Fast');
  const [speed,           setSpeed]           = useState(0);
  const [beePos,          setBeePos]          = useState({ x: 100, y: 100 });
  const [beeOrientation,  setBeeOrientation]  = useState(0);
  const [beeAltitude,     setBeeAltitude]     = useState(0);
  const [terrainAltitude, setTerrainAltitude] = useState(0);

  // ── Gyro state ────────────────────────────────────────────────────
  const [gyroAvailable, setGyroAvailable] = useState(false);
  const [gyroEnabled,   setGyroEnabled]   = useState(false);

  // (OSC toggle is now per-viewport — no global state needed here)

  // ── Init ──────────────────────────────────────────────────────────
  useEffect(() => {
    const seed = 12345;
    const { scene, getTerrainHeight, serialise, deserialise, dispose, flowerData } = buildScene(seed);

    const bee    = new BeeController(getTerrainHeight);
    const beeEye = new BeeEyeRenderer();
    bee.position.set(0, 4, 10);
    scene.add(bee.mesh);

    simRef.current = { scene, bee, beeEye, getTerrainHeight, serialise, deserialise, dispose, seed, flowerData };

    kbRef.current    = new KeyboardController(() => bee.flightMode);
    touchRef.current = new TouchController();

    if (IS_MOBILE) checkGyroAvailable((a) => setGyroAvailable(a));

    return () => {
      kbRef.current?.dispose();
      touchRef.current?.dispose();
      bee.dispose();
      beeEye.dispose();
      dispose();
      simRef.current = null;
    };
  }, []);

  // ── Animation loop ────────────────────────────────────────────────
  const rafRef   = useRef(null);
  const lastTime = useRef(null);

  useEffect(() => {
    let statusThrottle = 0;

    const animate = (time) => {
      rafRef.current = requestAnimationFrame(animate);
      const sim = simRef.current;
      if (!sim) return;

      const dt = lastTime.current != null
        ? Math.min((time - lastTime.current) / 1000, 0.05)
        : 0.016;
      lastTime.current = time;

      clearInputState();
      kbRef.current?.flush();
      // Pass whether we're in hover mode so touchController maps axes correctly
      touchRef.current?.flush(sim.bee.flightMode === FLIGHT.HOVER);
      sim.bee.update(dt);

      statusThrottle++;
      if (statusThrottle >= 10) {
        statusThrottle = 0;
        const b = sim.bee;
        setFlightMode(b.flightModeLabel);
        setSpeed(b.speed);
        setBeePos({ x: b.position.x + 100, y: -b.position.z + 100 });
        const bearing = (((-b.bodyYaw * 180) / Math.PI) % 360 + 360) % 360;
        setBeeOrientation(bearing);
        const absAlt     = b.position.y;
        const groundElev = sim.getTerrainHeight(b.position.x, b.position.z);
        setBeeAltitude(absAlt);
        setTerrainAltitude(absAlt - groundElev);
      }

      viewport1Ref.current?.render();
      if (!IS_MOBILE) viewport2Ref.current?.render();
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // ── Gyro toggle ───────────────────────────────────────────────────
  const handleToggleGyro = useCallback(async () => {
    const tc = touchRef.current;
    if (!tc) return;
    if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
      try {
        const perm = await DeviceOrientationEvent.requestPermission();
        if (perm !== 'granted') return;
      } catch { return; }
    }
    if (gyroEnabled) { tc.disableGyro(); setGyroEnabled(false); }
    else             { tc.enableGyro();  setGyroEnabled(true);  }
  }, [gyroEnabled]);

  // ── Collapse helpers ──────────────────────────────────────────────
  const collapseViewports = useCallback(() => {
    prevFlexRef.current = viewportFlex;
    setViewportFlex(0); setVpCollapsed(true); setTabCollapsed(false);
  }, [viewportFlex]);

  const collapseTabPanel = useCallback(() => {
    prevFlexRef.current = viewportFlex;
    setViewportFlex(100); setTabCollapsed(true); setVpCollapsed(false);
  }, [viewportFlex]);

  const restoreVertical = useCallback(() => {
    const prev = prevFlexRef.current || 65;
    setViewportFlex(Math.max(20, Math.min(85, prev)));
    setVpCollapsed(false); setTabCollapsed(false);
  }, []);

  // ── Vertical drag ─────────────────────────────────────────────────
  const onVDragStart = useCallback((e) => {
    e.preventDefault();
    setIsDraggingV(true);
    const startY    = e.clientY;
    const startFlex = viewportFlex;
    const onMove = (me) => {
      const ws = workspaceRef.current;
      if (!ws) return;
      const raw = startFlex + ((me.clientY - startY) / ws.getBoundingClientRect().height) * 100;
      if (raw < 8)       { setViewportFlex(0);   setVpCollapsed(true);  setTabCollapsed(false); }
      else if (raw > 92) { setViewportFlex(100);  setTabCollapsed(true); setVpCollapsed(false);  }
      else               { setViewportFlex(Math.max(20, Math.min(85, raw))); setVpCollapsed(false); setTabCollapsed(false); }
    };
    const onUp = () => {
      setIsDraggingV(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
  }, [viewportFlex]);

  // ── Save / Load ───────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    const sim = simRef.current;
    if (!sim) return;
    const data = sim.serialise(sim.bee.serialise());
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), { href: url, download: `virtualmeadow_${Date.now()}.json` }).click();
    URL.revokeObjectURL(url);
  }, []);

  const handleLoad = useCallback((data) => {
    simRef.current?.bee?.deserialise(data?.bee);
  }, []);

  const onAppDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file?.name.endsWith('.json')) return;
    const reader = new FileReader();
    reader.onload = (ev) => { try { handleLoad(JSON.parse(ev.target.result)); } catch { /* ignore */ } };
    reader.readAsText(file);
  }, [handleLoad]);

  // ── Shared TouchControls props (passed to each Viewport via ViewportContainer) ──
  const touchControlsProps = {
    touchControllerRef: touchRef,
    isHover:      flightMode === 'Hover',
    speed,
    gyroAvailable,
    gyroEnabled,
    onToggleGyro: handleToggleGyro,
  };

  // ── Mobile layout ─────────────────────────────────────────────────
  if (IS_MOBILE) {
    return (
      <div className="app app-mobile" onDrop={onAppDrop} onDragOver={e => e.preventDefault()}>

        <div className="mobile-nav">
          <span className="mobile-title">VirtualMeadow <span>v.0.2</span></span>
          <div className="mobile-tabs">
            <button className={`mobile-tab-btn${mobileTab === 'view' ? ' active' : ''}`} onClick={() => setMobileTab('view')}>View</button>
            <button className={`mobile-tab-btn${mobileTab === 'info' ? ' active' : ''}`} onClick={() => setMobileTab('info')}>Info</button>
          </div>
        </div>

        {mobileTab === 'view' && (
          <div className="mobile-viewport-wrap">
            <ViewportContainer
              simRef={simRef}
              viewport1Ref={viewport1Ref}
              viewport2Ref={viewport2Ref}
              view1Type={view1Type}
              view2Type={view2Type}
              onView1Change={setView1Type}
              onView2Change={setView2Type}
              mobileOnly
              touchControlsProps={touchControlsProps}
            />
          </div>
        )}

        {mobileTab === 'info' && (
          <div className="mobile-info-wrap">
            <TabPanel
              flightMode={flightMode}
              speed={speed}
              beePos={beePos}
              beeOrientation={beeOrientation}
              beeAltitude={beeAltitude}
              terrainAltitude={terrainAltitude}
            />
          </div>
        )}

      </div>
    );
  }

  // ── Desktop layout ────────────────────────────────────────────────
  return (
    <div className="app" onDrop={onAppDrop} onDragOver={e => e.preventDefault()}>
      <div className="titlebar">
        VirtualMeadow <span>v.0.2</span>
      </div>

      <Toolbar
        onSave={handleSave}
        onLoad={handleLoad}
        flightMode={flightMode}
        speed={speed}
      />

      <div className="workspace" ref={workspaceRef}>

        {vpCollapsed ? (
          <div className="vcol-strip vcol-strip-top" onClick={restoreVertical} title="Restore viewports">
            <span>▼ Viewports</span>
          </div>
        ) : (
          <div className="viewport-area" style={{ flex: tabCollapsed ? '1 1 0' : `${viewportFlex} 1 0` }}>
            <ViewportContainer
              simRef={simRef}
              viewport1Ref={viewport1Ref}
              viewport2Ref={viewport2Ref}
              view1Type={view1Type}
              view2Type={view2Type}
              onView1Change={setView1Type}
              onView2Change={setView2Type}
              touchControlsProps={touchControlsProps}
            />
          </div>
        )}

        {!vpCollapsed && !tabCollapsed && (
          <div className={`vdrag-handle${isDraggingV ? ' dragging' : ''}`} onMouseDown={onVDragStart}>
            <span className="vdrag-arrow vdrag-arrow-up"   onClick={collapseViewports} title="Collapse viewports">▲</span>
            <span className="vdrag-arrow vdrag-arrow-down" onClick={collapseTabPanel}  title="Collapse tab panel">▼</span>
          </div>
        )}

        {tabCollapsed ? (
          <div className="vcol-strip vcol-strip-bottom" onClick={restoreVertical} title="Restore tab panel">
            <span>▲ Tabs</span>
          </div>
        ) : (
          <div className="tab-area" style={{ flex: vpCollapsed ? '1 1 0' : `${100 - viewportFlex} 1 0` }}>
            <TabPanel
              flightMode={flightMode}
              speed={speed}
              beePos={beePos}
              beeOrientation={beeOrientation}
              beeAltitude={beeAltitude}
              terrainAltitude={terrainAltitude}
            />
          </div>
        )}

      </div>
    </div>
  );
}
