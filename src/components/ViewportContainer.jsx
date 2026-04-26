/**
 * ViewportContainer.jsx – Manages two side-by-side Viewport panels.
 * Supports horizontal drag-resize and collapse to a single panel.
 */
import { useRef, useState, useCallback, useEffect } from 'react';
import Viewport from './Viewport.jsx';

const COLLAPSE_THRESHOLD = 5; // % at which a side collapses

export default function ViewportContainer({
  simRef,
  viewport1Ref,
  viewport2Ref,
  view1Type, view2Type,
  onView1Change, onView2Change,
}) {
  const [splitPercent, setSplitPercent]   = useState(50);
  const [leftCollapsed, setLeftCollapsed]  = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const containerRef = useRef(null);
  const draggingRef  = useRef(false);
  const hdragRef     = useRef(null);

  // ── Drag logic ──────────────────────────────────────────────────
  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    draggingRef.current = true;
    hdragRef.current?.classList.add('dragging');

    const onMove = (me) => {
      if (!draggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      let pct = ((me.clientX - rect.left) / rect.width) * 100;
      pct = Math.max(0, Math.min(100, pct));

      if (pct < COLLAPSE_THRESHOLD) {
        setLeftCollapsed(true);
        setRightCollapsed(false);
      } else if (pct > (100 - COLLAPSE_THRESHOLD)) {
        setRightCollapsed(true);
        setLeftCollapsed(false);
      } else {
        setLeftCollapsed(false);
        setRightCollapsed(false);
        setSplitPercent(pct);
      }
    };
    const onUp = () => {
      draggingRef.current = false;
      hdragRef.current?.classList.remove('dragging');
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  // ── Drag-and-drop JSON load on the container ─────────────────────
  const onDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.name.endsWith('.json')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        const bee = simRef?.current?.bee;
        if (bee && data.bee) bee.deserialise(data.bee);
      } catch { /* ignore */ }
    };
    reader.readAsText(file);
  }, [simRef]);

  const onDragOver = (e) => { e.preventDefault(); };

  // ── Layout ───────────────────────────────────────────────────────
  let leftFlex, rightFlex;
  if (leftCollapsed) {
    leftFlex  = '0 0 0px';
    rightFlex = '1 1 0';
  } else if (rightCollapsed) {
    leftFlex  = '1 1 0';
    rightFlex = '0 0 0px';
  } else {
    leftFlex  = `0 0 ${splitPercent}%`;
    rightFlex = `0 0 ${100 - splitPercent}%`;
  }

  return (
    <div
      ref={containerRef}
      className="viewport-container"
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      {/* Left expand strip (shown when left is collapsed) */}
      {leftCollapsed && (
        <div
          className="collapse-strip"
          onClick={() => { setLeftCollapsed(false); setSplitPercent(35); }}
          title="Expand left viewport"
        >
          <span className="arrow">▶</span>
        </div>
      )}

      {/* Left Viewport */}
      {!leftCollapsed && (
        <div style={{ flex: leftFlex, display:'flex', minWidth:0, overflow:'hidden' }}>
          <Viewport
            ref={viewport1Ref}
            viewType={view1Type}
            onViewChange={onView1Change}
            simRef={simRef}
            label="A"
          />
        </div>
      )}

      {/* Horizontal drag handle */}
      {!leftCollapsed && !rightCollapsed && (
        <div
          ref={hdragRef}
          className="hdrag-handle"
          onMouseDown={onMouseDown}
        />
      )}

      {/* Right Viewport */}
      {!rightCollapsed && (
        <div style={{ flex: rightFlex, display:'flex', minWidth:0, overflow:'hidden' }}>
          <Viewport
            ref={viewport2Ref}
            viewType={view2Type}
            onViewChange={onView2Change}
            simRef={simRef}
            label="B"
          />
        </div>
      )}

      {/* Right expand strip (shown when right is collapsed) */}
      {rightCollapsed && (
        <div
          className="collapse-strip collapse-strip-r"
          onClick={() => { setRightCollapsed(false); setSplitPercent(65); }}
          title="Expand right viewport"
        >
          <span className="arrow">◀</span>
        </div>
      )}
    </div>
  );
}
