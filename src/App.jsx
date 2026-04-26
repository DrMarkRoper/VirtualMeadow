/**
 * App.jsx – VirtualMeadow v.0.1
 * Top-level component: initialises simulation, drives animation loop,
 * manages vertical split between viewports and tab panel.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import Toolbar from './components/Toolbar.jsx';
import ViewportContainer from './components/ViewportContainer.jsx';
import TabPanel from './components/TabPanel.jsx';
import { buildScene } from './engine/scene.js';
import { BeeController } from './engine/bee.js';
import { BeeEyeRenderer } from './engine/beeEye.js';
import './App.css';

export default function App() {
  // ── Layout state ──────────────────────────────────────────────────
  const [viewportFlex, setViewportFlex] = useState(65);
  const [isDraggingV, setIsDraggingV]  = useState(false);
  const [vpCollapsed,  setVpCollapsed]  = useState(false); // viewports collapsed (tabs full)
  const [tabCollapsed, setTabCollapsed] = useState(false); // tab panel collapsed (viewports full)
  const workspaceRef = useRef(null);
  const prevFlexRef  = useRef(65); // remember flex before collapsing

  // ── View type state for each viewport ────────────────────────────
  const [view1Type, setView1Type] = useState('third_person');
  const [view2Type, setView2Type] = useState('bee_eye');

  // ── Simulation refs (not React state – mutable) ───────────────────
  // simRef.current = { scene, bee, beeEye, getTerrainHeight, serialise, dispose }
  const simRef = useRef(null);

  // ── Viewport render refs (exposed via useImperativeHandle) ────────
  const viewport1Ref = useRef(null);
  const viewport2Ref = useRef(null);

  // ── Status display ────────────────────────────────────────────────
  const [flightMode, setFlightMode] = useState('Free Flight');
  const [speed,      setSpeed]      = useState(0);

  // ── Initialise simulation ─────────────────────────────────────────
  useEffect(() => {
    const seed = 12345;
    const { scene, getTerrainHeight, serialise, deserialise, dispose, flowerData } = buildScene(seed);

    const bee = new BeeController(getTerrainHeight);
    bee.position.set(0, 4, 10);
    scene.add(bee.mesh);

    const beeEye = new BeeEyeRenderer();

    simRef.current = { scene, bee, beeEye, getTerrainHeight, serialise, deserialise, dispose, seed, flowerData };

    return () => {
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

      // Update bee physics
      sim.bee.update(dt);

      // Throttled status update (every ~10 frames)
      statusThrottle++;
      if (statusThrottle >= 10) {
        statusThrottle = 0;
        setFlightMode(sim.bee.flightModeLabel);
        setSpeed(sim.bee.speed);
      }

      // Render each viewport
      viewport1Ref.current?.render();
      viewport2Ref.current?.render();
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // ── Collapse helpers ──────────────────────────────────────────────
  const collapseViewports = useCallback(() => {
    prevFlexRef.current = viewportFlex;
    setViewportFlex(0);
    setVpCollapsed(true);
    setTabCollapsed(false);
  }, [viewportFlex]);

  const collapseTabPanel = useCallback(() => {
    prevFlexRef.current = viewportFlex;
    setViewportFlex(100);
    setTabCollapsed(true);
    setVpCollapsed(false);
  }, [viewportFlex]);

  const restoreVertical = useCallback(() => {
    const prev = prevFlexRef.current || 65;
    setViewportFlex(Math.max(20, Math.min(85, prev)));
    setVpCollapsed(false);
    setTabCollapsed(false);
  }, []);

  // ── Vertical drag (viewport ↕ tab panel) ─────────────────────────
  const onVDragStart = useCallback((e) => {
    e.preventDefault();
    setIsDraggingV(true);
    const startY = e.clientY;
    const startFlex = viewportFlex;

    const onMove = (me) => {
      const ws = workspaceRef.current;
      if (!ws) return;
      const h = ws.getBoundingClientRect().height;
      const dy = me.clientY - startY;
      const raw = startFlex + (dy / h) * 100;

      // Snap to collapse if dragged to extremes
      if (raw < 8) {
        setViewportFlex(0);
        setVpCollapsed(true);
        setTabCollapsed(false);
      } else if (raw > 92) {
        setViewportFlex(100);
        setTabCollapsed(true);
        setVpCollapsed(false);
      } else {
        setViewportFlex(Math.max(20, Math.min(85, raw)));
        setVpCollapsed(false);
        setTabCollapsed(false);
      }
    };
    const onUp = () => {
      setIsDraggingV(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [viewportFlex]);

  // ── Save ──────────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    const sim = simRef.current;
    if (!sim) return;
    const data = sim.serialise(sim.bee.serialise());
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
      href: url,
      download: `virtualmeadow_${Date.now()}.json`,
    });
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // ── Load ──────────────────────────────────────────────────────────
  const handleLoad = useCallback((data) => {
    const sim = simRef.current;
    if (!sim) return;
    // Restore bee state; future: also rebuild scene with new seed
    sim.bee.deserialise(data?.bee);
  }, []);

  // ── Drag-and-drop load anywhere on the app ────────────────────────
  const onAppDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file?.name.endsWith('.json')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try { handleLoad(JSON.parse(ev.target.result)); } catch { /* ignore */ }
    };
    reader.readAsText(file);
  }, [handleLoad]);

  return (
    <div className="app" onDrop={onAppDrop} onDragOver={e => e.preventDefault()}>
      {/* Title bar */}
      <div className="titlebar">
        VirtualMeadow <span>v.0.1</span>
      </div>

      {/* Toolbar */}
      <Toolbar
        onSave={handleSave}
        onLoad={handleLoad}
        flightMode={flightMode}
        speed={speed}
      />

      {/* Main workspace */}
      <div className="workspace" ref={workspaceRef}>

        {/* ── Viewport area ─────────────────────────────────────────── */}
        {vpCollapsed ? (
          /* Restore strip shown when viewports are collapsed */
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
            />
          </div>
        )}

        {/* ── Vertical drag handle (hidden when either panel collapsed) ── */}
        {!vpCollapsed && !tabCollapsed && (
          <div
            className={`vdrag-handle${isDraggingV ? ' dragging' : ''}`}
            onMouseDown={onVDragStart}
          >
            {/* Collapse arrows */}
            <span className="vdrag-arrow vdrag-arrow-up"   onClick={collapseViewports} title="Collapse viewports">▲</span>
            <span className="vdrag-arrow vdrag-arrow-down" onClick={collapseTabPanel}  title="Collapse tab panel">▼</span>
          </div>
        )}

        {/* ── Tab panel ─────────────────────────────────────────────── */}
        {tabCollapsed ? (
          /* Restore strip shown when tab panel is collapsed */
          <div className="vcol-strip vcol-strip-bottom" onClick={restoreVertical} title="Restore tab panel">
            <span>▲ Tabs</span>
          </div>
        ) : (
          <div className="tab-area" style={{ flex: vpCollapsed ? '1 1 0' : `${100 - viewportFlex} 1 0` }}>
            <TabPanel flightMode={flightMode} speed={speed} />
          </div>
        )}

      </div>
    </div>
  );
}
