/**
 * touchController.js
 *
 * Reads from two virtual joysticks and an optional device-orientation stream,
 * then writes into the shared inputState each frame via flush(isHover).
 *
 * Axis mapping
 * ─────────────────────────────────────────────────────────────────────
 *  Left stick  X  →  yaw          (CCW = left/+, CW = right/−)   both modes
 *  Left stick  Y  →  fwd / back   (push = forward)                both modes
 *  Right stick Y  →  climb        (push up = ascend)              both modes
 *  Right stick X  →  strafe       (left/right)                    hover ONLY
 *                    (X axis is silently ignored in fast mode)
 *
 * Axis values are set externally by the React component:
 *   touchController.setLeftStick(x, y)   // −1…+1 each
 *   touchController.setRightStick(x, y)
 */

import { inputState } from './inputState.js';

const GYRO_ALPHA    = 0.12;   // low-pass smoothing
const GYRO_SCALE    = 0.6;    // degrees of tilt → yaw contribution
const GYRO_DEADZONE = 1.5;    // degrees of centre dead-band

export class TouchController {
  constructor() {
    this._lx = 0; this._ly = 0;   // left stick
    this._rx = 0; this._ry = 0;   // right stick

    // Gyroscope
    this._gyroEnabled    = false;
    this._gyroCalibrated = false;
    this._gyroZero       = 0;
    this._gyroFiltered   = 0;
    this._gyroRaw        = 0;

    this._onOrientation = (e) => {
      if (e.gamma == null) return;
      this._gyroRaw = e.gamma;
      if (!this._gyroCalibrated) {
        this._gyroZero       = e.gamma;
        this._gyroCalibrated = true;
        this._gyroFiltered   = 0;
      } else {
        const raw = e.gamma - this._gyroZero;
        this._gyroFiltered = GYRO_ALPHA * raw + (1 - GYRO_ALPHA) * this._gyroFiltered;
      }
    };
  }

  // ── Public setters ────────────────────────────────────────────────
  setLeftStick(x, y)  { this._lx = x; this._ly = y; }
  setRightStick(x, y) { this._rx = x; this._ry = y; }

  /** Fire a discrete saccade.  direction: 'left'|'right', size: 'small'|'large' */
  fireSaccade(direction, size = 'small') {
    const DEG   = Math.PI / 180;
    const angle = size === 'large' ? 30 * DEG : 15 * DEG;
    inputState.saccade += direction === 'left' ? angle : -angle;
  }

  triggerModeToggle() { inputState.modeToggle = true; }

  // ── Gyroscope ─────────────────────────────────────────────────────
  enableGyro() {
    if (this._gyroEnabled) return;
    this._gyroEnabled = true;
    window.addEventListener('deviceorientation', this._onOrientation);
  }
  disableGyro() {
    if (!this._gyroEnabled) return;
    this._gyroEnabled = false;
    window.removeEventListener('deviceorientation', this._onOrientation);
  }
  recalibrateGyro() {
    this._gyroZero       = this._gyroRaw;
    this._gyroFiltered   = 0;
    this._gyroCalibrated = true;
  }
  get gyroActive() { return this._gyroEnabled && this._gyroCalibrated; }

  // ── flush(isHover) — call once per frame before bee.update ────────
  /**
   * Axis mapping (matches TouchControls joystick labels)
   * ─────────────────────────────────────────────────────
   * Fast mode
   *   LHS Y → fwd / back     LHS X → yaw
   *   RHS Y → climb          RHS X → (ignored)
   *
   * Hover mode
   *   LHS Y → fwd / back     LHS X → strafe
   *   RHS Y → climb          RHS X → yaw
   *
   * @param {boolean} isHover  true when bee.flightMode === FLIGHT.HOVER
   */
  flush(isHover) {
    if (isHover) {
      // Hover: left stick = movement, right stick = altitude + yaw
      inputState.move.fwd    += -this._ly;   // Left  Y → fwd/back
      inputState.move.strafe +=  this._lx;   // Left  X → strafe
      inputState.climb       += -this._ry;   // Right Y → climb
      inputState.yaw         += -this._rx;   // Right X → yaw
    } else {
      // Fast: left stick = fwd + yaw, right stick = altitude only
      inputState.move.fwd += -this._ly;      // Left  Y → fwd/back
      inputState.yaw      += -this._lx;      // Left  X → yaw
      inputState.climb    += -this._ry;      // Right Y → climb
      // Right X ignored in fast mode
    }

    // Gyro → additional yaw
    if (this._gyroEnabled && this._gyroCalibrated) {
      const dev = this._gyroFiltered;
      const abs = Math.abs(dev);
      if (abs > GYRO_DEADZONE) {
        const contribution = Math.sign(dev) * (abs - GYRO_DEADZONE) * GYRO_SCALE / 90;
        inputState.yaw = Math.max(-1, Math.min(1, inputState.yaw - contribution));
      }
    }

    // Clamp all axes to [−1, +1]
    inputState.move.fwd    = Math.max(-1, Math.min(1, inputState.move.fwd));
    inputState.move.strafe = Math.max(-1, Math.min(1, inputState.move.strafe));
    inputState.yaw         = Math.max(-1, Math.min(1, inputState.yaw));
    inputState.climb       = Math.max(-1, Math.min(1, inputState.climb));
  }

  dispose() { this.disableGyro(); }
}
