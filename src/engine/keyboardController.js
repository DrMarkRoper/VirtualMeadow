/**
 * keyboardController.js
 *
 * Handles all keyboard events and writes into the shared inputState each
 * frame via flush().  Extracted from BeeController so that touch and keyboard
 * inputs compose cleanly through the same interface.
 */

import { inputState } from './inputState.js';
import { FLIGHT } from './bee.js';

const DEG = Math.PI / 180;

const SACCADE_MAP = {
  'Digit1':  75 * DEG,
  'Digit2':  30 * DEG,
  'Digit3':  15 * DEG,
  'Digit4':   5 * DEG,
  'Digit5':   2 * DEG,
  'Digit6':  -2 * DEG,
  'Digit7':  -5 * DEG,
  'Digit8': -15 * DEG,
  'Digit9': -30 * DEG,
  'Digit0': -75 * DEG,
};

export class KeyboardController {
  /**
   * @param {() => string} getFlightMode  — returns current FLIGHT mode string
   */
  constructor(getFlightMode) {
    this._getFlightMode = getFlightMode;
    this._keys = {};

    this._onKeyDown = (e) => {
      this._keys[e.code] = true;

      // Mode toggle
      if (e.code === 'KeyH' || e.code === 'Tab') {
        e.preventDefault();
        inputState.modeToggle = true;
      }

      // Discrete saccades — one-shot on keydown (e.repeat guards auto-fire)
      if (!e.repeat && SACCADE_MAP[e.code] !== undefined) {
        inputState.saccade += SACCADE_MAP[e.code];
      }
    };

    this._onKeyUp = (e) => { this._keys[e.code] = false; };

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup',   this._onKeyUp);
  }

  /**
   * Called each frame (before bee.update).  Writes continuous axes into
   * inputState.  Saccades and modeToggle are written in the event handlers
   * above and cleared by bee.update.
   */
  flush() {
    const k = this._keys;
    const mode = this._getFlightMode();

    // Forward / back
    if (k['KeyW'] || k['ArrowUp'])   inputState.move.fwd   =  1;
    if (k['KeyS'] || k['ArrowDown']) inputState.move.fwd   = -1;

    // Strafe (hover) / yaw (free)
    if (mode === FLIGHT.FREE) {
      if (k['KeyA'] || k['ArrowLeft'])  inputState.yaw =  1;
      if (k['KeyD'] || k['ArrowRight']) inputState.yaw = -1;
    } else {
      if (k['KeyA'] || k['ArrowLeft'])  inputState.move.strafe = -1;
      if (k['KeyD'] || k['ArrowRight']) inputState.move.strafe =  1;
      if (k['KeyQ'])                    inputState.yaw =  1;
      if (k['KeyE'])                    inputState.yaw = -1;
    }

    // Climb / descend
    if (k['Space'])                                          inputState.climb =  1;
    if (k['ShiftLeft'] || k['ShiftRight'] || k['ControlLeft']) inputState.climb = -1;
  }

  dispose() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup',   this._onKeyUp);
  }
}
