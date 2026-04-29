# 🐝 VirtualMeadow

A browser-based 3D flight simulator that lets you experience a flower meadow from the perspective of a honey bee — compound eyes and all.

Try the live demo: <a href="https://DrMarkRoper.github.io/VirtualMeadow" target="_blank" rel="noopener noreferrer">Virtual Meadow</a>

<img width="1430" height="678" alt="VirtualMeadow(2)_v_0_1" src="https://github.com/user-attachments/assets/2b8a27a1-8538-439f-99e8-47407205ebfc" />

---

## What is it?

VirtualMeadow drops you into a procedurally generated wildflower meadow and lets you fly through it as a bee. It has two distinct flight modes — Fast (forward-directed flight with saccadic head-then-body turning, matching how bees actually navigate) and Hover (helicopter-style, any direction, low speed) for close inspection of flowers.

The bee automatically follows the terrain contour at a constant height above the ground, mimicking optic-flow-based terrain following used by real bees in flight. Space and Shift control the target height above ground; if the terrain rises, the bee rises with it.

A second viewport renders the world through a simulated compound eye (the B-EYE model), showing the blurred, faceted vision of both the left and right compound eyes simultaneously. The simulation is seeded, so every world is reproducible, and the bee state can be saved and restored as JSON.

---

## Features

- **Two flight modes** — Fast and Hover, switchable at any speed; triggering the switch while moving automatically brakes the bee to a stop before entering Hover; speed is held when the throttle key is released in Fast mode
- **Saccadic yaw** — head snaps instantly to a new angle; body follows rapidly behind (~100 ms delay), replicating the zig-zag flight pattern of real bees
- **Terrain-following flight** — the bee maintains a constant height above the ground surface.
- **Dual compound eye view** — a B-EYE renderer produces left and right eye mosaics side-by-side, each a 60°-tilted field sampled through ~4,900 ommatidia with Gaussian acceptance kernels; overlapping binocular ommatidia can be highlighted in gold
- **Four viewports** — 3rd person, 1st person, top-down map (with compass), and compound eye; each panel can show any view independently
- **Procedural world** — fractal noise terrain, 280 flowers across 6 species, 18 cloud groups, all seeded for reproducibility
- **Full touch / mobile support** — on-screen virtual joysticks, saccade buttons, mode toggle, and optional device-orientation (gyroscope) yaw; compound-eye renderer runs in a performance-reduced mode on mobile
- **Live status panel** — real-time display of map-space position (X east / Y north, SW-corner origin), compass bearing with cardinal label, above-ground and absolute altitude
- **World boundary** — hard stop at the meadow edge (±100 m); the bee cannot fly beyond the terrain
- **Save / Load** — export and restore the bee's position, heading, speed as a JSON file

---

## Installation

You will need [Node.js](https://nodejs.org/) (v18 or later).

```bash
git clone https://github.com/DrMarkRoper/VirtualMeadow.git
cd VirtualMeadow
npm install
npm run dev
```

Then open **http://localhost:5173** in your browser.

To build a static bundle for hosting:

```bash
npm run build      # outputs to dist/
npm run preview    # local preview of the production build
```

---

## Controls

### Flight mode toggle

| Input | Action |
|-------|--------|
| `H` or `Tab` | Switch between Fast and Hover at any speed |
| Touch **🐝 FAST** / **🚁 HOVER** button | Same toggle on touch screens |

Pressing the toggle while moving in Fast mode will automatically brake the bee to a stop at full deceleration before entering Hover — the touch button shows **⏸ BRAKING** during this transition and cannot be re-triggered until it completes.

---

### Fast Mode (keyboard)

Fast, forward-directed movement. Speed is held when you release the throttle key.

| Key | Action |
|-----|--------|
| `W` / `↑` | Accelerate forward |
| `S` / `↓` | Brake |
| `A` / `←` | Yaw left (head snaps, body follows ~100 ms) |
| `D` / `→` | Yaw right (head snaps, body follows ~100 ms) |
| `Space` | Climb |
| `Shift` / `Ctrl` | Descend |

---

### Hover Mode (keyboard)

Helicopter-style low-speed movement. Useful for inspecting individual flowers.

| Key | Action |
|-----|--------|
| `W` / `↑` | Move forward |
| `S` / `↓` | Move backward |
| `A` / `←` | Strafe left |
| `D` / `→` | Strafe right |
| `Q` | Yaw left |
| `E` | Yaw right |
| `Space` | Climb |
| `Shift` / `Ctrl` | Descend |

---

### Touch / On-Screen Controls

Virtual joystick overlays appear automatically on mobile. On desktop they can be toggled per viewport with the **🕹 OSC** button in the view selector.

**Fast Mode — touch**

| Control | Action |
|---------|--------|
| Left stick ↑↓ | Accelerate / brake |
| Left stick ←→ | Yaw left (YL) / right (YR) |
| Right stick ↑↓ | Climb / descend (ALT ONLY — horizontal axis locked) |
| ◀ / ▶ buttons | Saccade 15° or 30° |

**Hover Mode — touch**

| Control | Action |
|---------|--------|
| Left stick ↑↓ | Move forward / backward |
| Left stick ←→ | Strafe left (SL) / right (SR) |
| Right stick ↑↓ | Climb / descend |
| Right stick ←→ | Yaw left (YL) / right (YR) |
| ◀ / ▶ buttons | Saccade 15° or 30° |

---

### Saccade keys (both modes)

Bees navigate by a series of rapid fixed-angle saccades rather than smooth continuous turns. Press once for an instant snap; in Fast mode the head snaps and the body catches up within ~100–200 ms; in Hover mode the whole bee rotates immediately.

| Key | Angle | Direction |
|-----|-------|-----------|
| `1` | 75° | Left |
| `2` | 30° | Left |
| `3` | 15° | Left |
| `4` | 5° | Left |
| `5` | 2° | Left |
| `6` | 2° | Right |
| `7` | 5° | Right |
| `8` | 15° | Right |
| `9` | 30° | Right |
| `0` | 75° | Right |

---

### Viewport switching

Each of the two panels has view buttons and a controls toggle in the toolbar along the bottom:

| Icon | View | Description |
|------|------|-------------|
| 🎥 3rd | Third person | Camera follows behind and above the bee |
| 👁 1st | First person | Camera at the bee's head, facing the same direction |
| 🗺 Map | God / Map | Top-down view with terrain, flowers, and compass |
| 🐝 Eye | Bee Eye | Live dual compound-eye ommatidia render |
| 🕹 OSC | On-screen controls | Toggle virtual joystick overlay for this viewport (on by default on mobile, off on desktop) |

The Bee Eye panel also has two controls:

- **bino** checkbox — outlines binocular ommatidia (within the overlapping forward field of both eyes) in gold
- **☀ brightness slider** — multiplies the output brightness (0.2× – 4.0×)

---

### Tab panel

The panel below the viewports has three tabs:

| Tab | Contents |
|-----|----------|
| **Help** | Full control reference and layout guide |
| **Status** | Live bee telemetry — flight mode, speed, map position, compass heading, above-ground and absolute altitude |
| **About** | Project Details and B-EYE background, Laughlin & Horridge (1972) citation, link to Andy Giger's original B-EYE tool |

---

### Save / Load

| Control | Action |
|---------|--------|
| **Save** button | Downloads the current bee state as a `.json` file |
| **Open** button | Loads a previously saved `.json` file |
| Drag & drop | Drop a `.json` file anywhere on the app to load it |

---

## Tech stack

| Layer | Library |
|-------|---------|
| Framework | React 18 + Vite |
| 3D rendering | Three.js 0.161 |
| Compound eye | B-EYE port (Andy Giger) — dual-eye cubemap sampling with Gaussian-kernel ommatidia |
| Terrain | Fractal value noise (`noise.js`) on a 120×120 `PlaneGeometry` |
| Styling | Single CSS file with custom properties — no CSS frameworks |

---

## World parameters

| Parameter | Value |
|-----------|-------|
| World size | 200 × 200 m |
| Max terrain height | 10 m |
| Flower count | 280 (6 species) |
| Flower scale | 5× (`FLOWER_SCALE`) |
| Default seed | 12345 |
| Fog | Exponential, density 0.008 |

---

## Bee flight parameters

| Parameter | Value |
|-----------|-------|
| Max speed (Fast mode) | 8.0 m/s |
| Acceleration | 4.0 m/s² |
| Continuous head yaw rate | 2.0 rad/s |
| Body yaw follow rate | 6.0 rad/s (head leads ~100 ms) |
| Hover move speed | 0.6 m/s |
| Min AGL | 0.5 m |
| Max AGL | 60.0 m |
| Terrain follow rate | 6.0 (exponential, time constant ≈ 167 ms) |
| AGL climb rate (Fast mode) | 3.0 m/s |
| AGL climb rate (hover) | 1.0 m/s |
| Wing flap rate | 12 Hz |

---

## Compound eye — how it works

The B-EYE renderer is a JavaScript port of Dr Andy Giger's algorithm, extended for a true 3-D environment with dual compound eyes. See the original tool and documentation at **[andygiger.com/science/beye/beyehome.html](https://andygiger.com/science/beye/beyehome.html)**.

### Scene capture

Each frame, the scene is rendered into **six 128×128 face targets** forming a cubemap centred on the bee's head position — one face each for ±X, ±Y, and ±Z. Using six fixed perspective cameras (90° FOV each) avoids the sign and orientation inconsistencies of Three.js's built-in `CubeCamera`.

### Ommatidium grid

`_buildOmmatidia()` is a direct port of Giger's `CreateOmm`. It generates ~4 900 angular positions `(ax, ay)` in the hemisphere forward of each eye, with spacing derived from angular sensitivity data: horizontal inter-ommatidial angle varies from ~1.5° (acute zone, frontal) to ~3.7° (periphery); vertical spacing is similar. Each `(ax, ay)` represents one facet of the compound eye.

### Dual-eye layout

Two eye instances are produced from the same ommatidium grid by rotating each facet's direction by ±`EYE_TILT_DEG` (60°) around the head's Y axis:

- **Left eye** — tilted +60° (directions biased toward the bee's left)
- **Right eye** — tilted −60° (directions biased toward the bee's right)

An ommatidium is flagged **binocular** if its head-local direction falls within 30° of head-forward — i.e. inside the zone where both eyes' fields overlap. When the *bino* toggle is enabled, binocular hexagons are outlined in gold.

### Sampling

For each ommatidium `i`, the renderer applies a **Gaussian acceptance kernel** (`CreateGaussLow`): 25 angular sample directions (1 central + 8 × 2 rings) weighted by a Gaussian whose σ is derived from Laughlin & Horridge (1972). On mobile, the kernel is reduced to 9 samples (1 central + 1 ring) and the face targets to 64×64 to maintain interactive frame rates. Each direction is:

1. Rotated from head-local space to world space by the bee's total head yaw (body yaw + relative head yaw)
2. Projected onto the dominant cubemap face to get a pixel coordinate
3. Read from that face's CPU pixel buffer (`Uint8Array`, transferred from GPU once per frame)

The weighted average of the 25 samples gives the ommatidium's RGB colour.

### Display

Each eye's ommatidia are mapped into a 60×160 hex grid (`_buildWabe`) and drawn as filled circles on a 2-D canvas — left eye occupying the left half, right eye the right half, separated by a faint dividing line.

---

## Known limitations

- **Save/load restores bee state only** — the world seed is saved but loading it does not yet rebuild the scene from a new seed
- **B-EYE is CPU-bound** — the GPU → CPU pixel readback (`readRenderTargetPixels`) is synchronous; large render targets or slow GPUs will reduce frame rate; on mobile the renderer runs at reduced resolution and frame rate to compensate

---

## References

- Giger, A. — B-EYE: original interactive compound-eye simulator.
  [andygiger.com/science/beye/beyehome.html](https://andygiger.com/science/beye/beyehome.html)
- Laughlin SB, Horridge GA (1972). "Angular sensitivity of the retinula cells of dark-adapted worker bee." *Z Vergl Physiol* 77:422–425 — source for the angular resolution gradient and inter-ommatidial angles used in `_buildOmmatidia` and `_buildGauss`

---

## License
If used in publications, or other works, please cite:
- [1] Giger A D, B-Eye, https://andygiger.com/science/beye/beyehome.html
- [2] Roper M, VirtualMeadow, https://github.com/DrMarkRoper/VirtualMeadow

MIT

