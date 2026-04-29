/**
 * inputState.js — Shared flight input state.
 *
 * Both KeyboardController and TouchController write into this object each
 * frame.  BeeController.update() reads from it instead of from raw keyboard
 * events so that touch and keyboard compose naturally.
 *
 * Axes are normalised:
 *   move.fwd   –1 (back) … +1 (forward)
 *   move.strafe –1 (left) … +1 (right)
 *   yaw        –1 (CW / right) … +1 (CCW / left)
 *   climb      –1 (descend) … +1 (ascend)
 *
 * saccade is consumed once per set — whoever reads it should zero it
 * immediately after use.
 */

export const inputState = {
  move:    { fwd: 0, strafe: 0 },
  yaw:     0,          // continuous yaw axis  (-1 … +1)
  climb:   0,          // continuous climb     (-1 … +1)
  saccade: 0,          // one-shot radians; consumer clears after reading
  modeToggle: false,   // true for one frame when mode-toggle fires
};

/** Zero the per-frame axes (call at the start of each update). */
export function clearInputState() {
  inputState.move.fwd    = 0;
  inputState.move.strafe = 0;
  inputState.yaw         = 0;
  inputState.climb       = 0;
  // saccade and modeToggle are cleared by the consumer (bee.update)
}
