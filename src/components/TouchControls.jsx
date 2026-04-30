/**
 * TouchControls.jsx
 *
 * Full-screen overlay: two virtual joysticks, saccade buttons, mode toggle,
 * optional gyro controls.
 *
 * Works on both touch (mobile) and mouse (desktop OSC mode).
 *
 * Axis contract (matches touchController.js):
 *   Left  X → yaw      Left  Y → fwd/back
 *   Right Y → climb    Right X → strafe (hover only; locked in fast mode)
 *
 * Props
 * ──────────────────────────────────────────────────────────────────────
 *  touchControllerRef   ref to a TouchController instance
 *  isHover              boolean — true when in Hover flight mode
 *  speed                number  — current bee speed in m/s
 *  gyroAvailable        boolean
 *  gyroEnabled          boolean
 *  onToggleGyro         () => void
 */

import { useEffect, useRef, useCallback } from 'react';

const OUTER_R    = 52;                      // outer ring radius  (px)
const INNER_R    = 22;                      // thumb nub radius   (px)
const MAX_DIST   = OUTER_R - INNER_R - 4;  // max nub travel     (px)
const MIN_HOVER_SPEED = 0.6;               // m/s — mirrors PARAMS.minHoverSpeed

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

function clampStick(dx, dy) {
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d > MAX_DIST) { const s = MAX_DIST / d; return [dx * s, dy * s]; }
  return [dx, dy];
}

// ── Canvas draw ───────────────────────────────────────────────────────────────
function drawStick(canvas, state, opts = {}) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2;
  ctx.clearRect(0, 0, W, H);

  const { active, dx = 0, dy = 0 } = state;
  const { lockedX = false, axisLabels = null } = opts;  // lockedX = fast-mode right stick

  // Outer ring — amber when active, normal white ring otherwise
  ctx.beginPath();
  ctx.arc(cx, cy, OUTER_R, 0, Math.PI * 2);
  ctx.strokeStyle = active
    ? 'rgba(245,166,35,0.60)'
    : 'rgba(255,255,255,0.20)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Fill on activation
  if (active) {
    ctx.beginPath();
    ctx.arc(cx, cy, OUTER_R, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(245,166,35,0.06)';
    ctx.fill();
  }

  // Cross-hair
  const hairColor = 'rgba(255,255,255,0.09)';
  ctx.beginPath();
  ctx.moveTo(cx - OUTER_R + 8, cy); ctx.lineTo(cx + OUTER_R - 8, cy);
  // In fast mode, suppress horizontal line to indicate axis is locked
  if (!lockedX) {
    ctx.moveTo(cx, cy - OUTER_R + 8); ctx.lineTo(cx, cy + OUTER_R - 8);
  } else {
    ctx.moveTo(cx, cy - OUTER_R + 8); ctx.lineTo(cx, cy + OUTER_R - 8);
  }
  ctx.strokeStyle = hairColor;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Axis labels
  if (axisLabels) {
    ctx.font = '8px system-ui';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillText(axisLabels.top,    cx, cy - OUTER_R + 13);
    ctx.fillText(axisLabels.bottom, cx, cy + OUTER_R - 3);
    if (!lockedX && axisLabels.left && axisLabels.right) {
      // Left label: right-aligned, nudged inward so text isn't clipped by the ring edge
      ctx.textAlign = 'right';
      ctx.fillText(axisLabels.left,  cx - OUTER_R + 13, cy + 4);
      // Right label: left-aligned, nudged inward symmetrically
      ctx.textAlign = 'left';
      ctx.fillText(axisLabels.right, cx + OUTER_R - 13, cy + 4);
    }
    // When lockedX (fast-mode RHS) we simply show no horizontal labels —
    // the 'ALT ONLY' text is already displayed in the vjoy-label below the canvas.
  }

  // Nub position — lock X to centre in fast mode
  const nx = cx + (active ? (lockedX ? 0 : dx) : 0);
  const ny = cy + (active ? dy : 0);

  // Shadow
  ctx.beginPath();
  ctx.arc(nx + 1, ny + 2, INNER_R, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fill();

  // Body gradient
  const grad = ctx.createRadialGradient(nx - 5, ny - 5, 2, nx, ny, INNER_R);
  if (active) {
    grad.addColorStop(0, 'rgba(255,215,80,0.95)');
    grad.addColorStop(1, 'rgba(200,130,0,0.88)');
  } else {
    grad.addColorStop(0, 'rgba(210,210,210,0.85)');
    grad.addColorStop(1, 'rgba(100,100,100,0.72)');
  }
  ctx.beginPath();
  ctx.arc(nx, ny, INNER_R, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Rim
  ctx.beginPath();
  ctx.arc(nx, ny, INNER_R, 0, Math.PI * 2);
  ctx.strokeStyle = active
    ? 'rgba(255,200,60,0.85)'
    : 'rgba(255,255,255,0.30)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

// ── Single joystick wrapper ───────────────────────────────────────────────────
function VirtualJoystick({ canvasRef, label }) {
  return (
    <div className="vjoy-wrap">
      <canvas
        ref={canvasRef}
        className="vjoy-canvas"
        width={OUTER_R * 2 + 4}
        height={OUTER_R * 2 + 4}
      />
      <span className="vjoy-label">{label}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TouchControls({
  touchControllerRef,
  isHover,
  pendingHover,
  speed,
  gyroAvailable,
  gyroEnabled,
  onToggleGyro,
}) {
  const lCanvasRef = useRef(null);
  const rCanvasRef = useRef(null);

  // Per-joystick mutable state — does NOT trigger re-renders
  const lState = useRef({ active: false, id: null, dx: 0, dy: 0 });
  const rState = useRef({ active: false, id: null, dx: 0, dy: 0 });

  // Keep a ref so event-handler closures always see the latest isHover
  // without needing to recreate handlers on every mode change.
  const isHoverRef = useRef(isHover);
  useEffect(() => { isHoverRef.current = isHover; }, [isHover]);

  // ── Draw helpers ─────────────────────────────────────────────────
  const redrawLeft = useCallback(() => {
    // Fast mode:  LHS X = yaw        → YL / YR
    // Hover mode: LHS X = strafe     → SL / SR
    drawStick(lCanvasRef.current, lState.current, {
      axisLabels: {
        top:    '▲ FWD',
        bottom: '▼ BACK',
        left:   isHover ? 'SL' : 'YL',
        right:  isHover ? 'SR' : 'YR',
      },
    });
  }, [isHover]);

  const redrawRight = useCallback(() => {
    // Fast mode:  RHS X locked (alt only)
    // Hover mode: RHS X = yaw        → YL / YR
    drawStick(rCanvasRef.current, rState.current, {
      lockedX: !isHover,
      axisLabels: {
        top:    '▲ UP',
        bottom: '▼ DN',
        left:   isHover ? 'YL' : undefined,
        right:  isHover ? 'YR' : undefined,
      },
    });
  }, [isHover]);

  // Redraw right stick whenever hover mode changes
  useEffect(() => { redrawRight(); }, [redrawRight]);
  // Initial draw of both
  useEffect(() => { redrawLeft(); redrawRight(); }, [redrawLeft, redrawRight]);

  // ── Unified pointer/touch handlers ──────────────────────────────
  // We handle both touch and mouse so the overlay works on desktop too.

  const pushAxes = useCallback(() => {
    const tc = touchControllerRef?.current;
    if (!tc) return;
    const ln = lState.current.active
      ? [lState.current.dx / MAX_DIST, lState.current.dy / MAX_DIST]
      : [0, 0];

    let rx = 0, ry = 0;
    if (rState.current.active) {
      const rawX = rState.current.dx / MAX_DIST;
      const rawY = rState.current.dy / MAX_DIST;
      if (isHoverRef.current) {
        // Cross-joystick: only the dominant axis fires.
        // This prevents mixing height and yaw inputs which makes hover hard to control.
        if (Math.abs(rawX) >= Math.abs(rawY)) {
          rx = rawX; ry = 0;
        } else {
          rx = 0;    ry = rawY;
        }
      } else {
        rx = rawX; ry = rawY;
      }
    }
    tc.setLeftStick(ln[0], ln[1]);
    tc.setRightStick(rx, ry);
  }, [touchControllerRef]);

  // ── Touch wiring ────────────────────────────────────────────────
  const makeTouchHandlers = useCallback((stateRef, canvasRef, redraw) => {
    const opts = { passive: false };

    const onStart = (e) => {
      e.preventDefault();
      if (stateRef.current.active) return;
      const t = e.changedTouches[0];
      const rect = canvasRef.current.getBoundingClientRect();
      const [cdx, cdy] = clampStick(
        t.clientX - rect.left  - rect.width  / 2,
        t.clientY - rect.top   - rect.height / 2,
      );
      stateRef.current = { active: true, id: t.identifier, dx: cdx, dy: cdy };
      pushAxes(); redraw();
    };

    const onMove = (e) => {
      e.preventDefault();
      const t = Array.from(e.changedTouches).find(x => x.identifier === stateRef.current.id);
      if (!t) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const [cdx, cdy] = clampStick(
        t.clientX - rect.left  - rect.width  / 2,
        t.clientY - rect.top   - rect.height / 2,
      );
      stateRef.current = { ...stateRef.current, dx: cdx, dy: cdy };
      pushAxes(); redraw();
    };

    const onEnd = (e) => {
      e.preventDefault();
      const t = Array.from(e.changedTouches).find(x => x.identifier === stateRef.current.id);
      if (!t) return;
      stateRef.current = { active: false, id: null, dx: 0, dy: 0 };
      pushAxes(); redraw();
    };

    return { onStart, onMove, onEnd, opts };
  }, [pushAxes]);

  // ── Mouse wiring (desktop) ──────────────────────────────────────
  const makeMouseHandlers = useCallback((stateRef, canvasRef, redraw) => {
    const onDown = (e) => {
      e.preventDefault();
      const rect = canvasRef.current.getBoundingClientRect();
      const [cdx, cdy] = clampStick(
        e.clientX - rect.left  - rect.width  / 2,
        e.clientY - rect.top   - rect.height / 2,
      );
      stateRef.current = { active: true, id: 'mouse', dx: cdx, dy: cdy };
      pushAxes(); redraw();

      const onMove = (me) => {
        const [mdx, mdy] = clampStick(
          me.clientX - rect.left  - rect.width  / 2,
          me.clientY - rect.top   - rect.height / 2,
        );
        stateRef.current = { ...stateRef.current, dx: mdx, dy: mdy };
        pushAxes(); redraw();
      };
      const onUp = () => {
        stateRef.current = { active: false, id: null, dx: 0, dy: 0 };
        pushAxes(); redraw();
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup',   onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup',   onUp);
    };

    return { onDown };
  }, [pushAxes]);

  // ── Attach all listeners ────────────────────────────────────────
  useEffect(() => {
    const lc = lCanvasRef.current;
    const rc = rCanvasRef.current;
    if (!lc || !rc) return;

    const lt = makeTouchHandlers(lState, lCanvasRef, redrawLeft);
    const rt = makeTouchHandlers(rState, rCanvasRef, redrawRight);
    const lm = makeMouseHandlers(lState, lCanvasRef, redrawLeft);
    const rm = makeMouseHandlers(rState, rCanvasRef, redrawRight);

    lc.addEventListener('touchstart',  lt.onStart, lt.opts);
    lc.addEventListener('touchmove',   lt.onMove,  lt.opts);
    lc.addEventListener('touchend',    lt.onEnd,   lt.opts);
    lc.addEventListener('touchcancel', lt.onEnd,   lt.opts);
    lc.addEventListener('mousedown',   lm.onDown);

    rc.addEventListener('touchstart',  rt.onStart, rt.opts);
    rc.addEventListener('touchmove',   rt.onMove,  rt.opts);
    rc.addEventListener('touchend',    rt.onEnd,   rt.opts);
    rc.addEventListener('touchcancel', rt.onEnd,   rt.opts);
    rc.addEventListener('mousedown',   rm.onDown);

    return () => {
      lc.removeEventListener('touchstart',  lt.onStart);
      lc.removeEventListener('touchmove',   lt.onMove);
      lc.removeEventListener('touchend',    lt.onEnd);
      lc.removeEventListener('touchcancel', lt.onEnd);
      lc.removeEventListener('mousedown',   lm.onDown);

      rc.removeEventListener('touchstart',  rt.onStart);
      rc.removeEventListener('touchmove',   rt.onMove);
      rc.removeEventListener('touchend',    rt.onEnd);
      rc.removeEventListener('touchcancel', rt.onEnd);
      rc.removeEventListener('mousedown',   rm.onDown);
    };
  }, [makeTouchHandlers, makeMouseHandlers, redrawLeft, redrawRight]);

  // ── Saccade ─────────────────────────────────────────────────────
  const saccade = useCallback((dir, size, e) => {
    e.preventDefault();
    touchControllerRef?.current?.fireSaccade(dir, size);
  }, [touchControllerRef]);

  // ── Mode toggle — plain onClick for instant single-tap ──────────
  // (touch-action: manipulation on the button removes 300 ms delay)
  const onModeToggle = useCallback(() => {
    touchControllerRef?.current?.triggerModeToggle();
  }, [touchControllerRef]);

  // Mode button disabled while the bee is auto-braking to enter hover
  const modeDisabled = pendingHover;

  return (
    <div className="touch-overlay">

      {/* ── Left joystick ─────────────────────────────
            Fast:  FWD/BACK + YAW
            Hover: FWD/BACK + STRAFE                   */}
      <div className="touch-zone touch-zone-left">
        <VirtualJoystick
          canvasRef={lCanvasRef}
          label={isHover ? 'FWD/BACK + STRAFE' : 'FWD/BACK + YAW'}
        />
      </div>

      {/* ── Right joystick ────────────────────────────
            Fast:  ALT ONLY
            Hover: YAW + ALT                           */}
      <div className="touch-zone touch-zone-right">
        <VirtualJoystick
          canvasRef={rCanvasRef}
          label={isHover ? 'YAW + ALT' : 'ALT ONLY'}
        />
      </div>

      {/* ── Saccade — left side ────────────────────── */}
      <div className="touch-saccade-group touch-saccade-left">
        <button
          className="touch-saccade-btn"
          onTouchStart={(e) => saccade('left', 'large', e)}
          onMouseDown={(e)  => saccade('left', 'large', e)}
          title="Saccade left 30°"
        >↺<span>30°</span></button>
        <button
          className="touch-saccade-btn"
          onTouchStart={(e) => saccade('left', 'small', e)}
          onMouseDown={(e)  => saccade('left', 'small', e)}
          title="Saccade left 15°"
        >↺<span>15°</span></button>
      </div>

      {/* ── Saccade — right side ───────────────────── */}
      <div className="touch-saccade-group touch-saccade-right">
        <button
          className="touch-saccade-btn"
          onTouchStart={(e) => saccade('right', 'large', e)}
          onMouseDown={(e)  => saccade('right', 'large', e)}
          title="Saccade right 30°"
        >↻<span>30°</span></button>
        <button
          className="touch-saccade-btn"
          onTouchStart={(e) => saccade('right', 'small', e)}
          onMouseDown={(e)  => saccade('right', 'small', e)}
          title="Saccade right 15°"
        >↻<span>15°</span></button>
      </div>

      {/* ── Top bar ────────────────────────────────── */}
      <div className="touch-top-bar">

        {/* Mode toggle — single onClick, greyed out when can't transition */}
        <button
          className={`touch-mode-btn${isHover ? ' hover' : ''}${modeDisabled ? ' disabled' : ''}`}
          onClick={onModeToggle}
          disabled={modeDisabled}
          title={pendingHover ? 'Braking to hover…' : 'Toggle flight mode (Tab)'}
        >
          {pendingHover ? '⏸ BRAKING' : isHover ? '🚁 HOVER' : '🐝 FAST'}
        </button>

        {/* Gyro toggle */}
        {gyroAvailable && (
          <button
            className={`touch-gyro-btn${gyroEnabled ? ' active' : ''}`}
            onClick={onToggleGyro}
            title={gyroEnabled ? 'Disable gyro steering' : 'Enable gyro steering'}
          >
            ⟳ GYRO
          </button>
        )}

        {/* Recalibrate */}
        {gyroAvailable && gyroEnabled && (
          <button
            className="touch-gyro-btn"
            onClick={() => touchControllerRef?.current?.recalibrateGyro()}
            title="Re-zero gyro"
          >
            ⊕ ZERO
          </button>
        )}

      </div>
    </div>
  );
}
