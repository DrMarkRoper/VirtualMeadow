# 🐝 VirtualMeadow

A browser-based 3D flight simulator that lets you experience a flower meadow from the perspective of a honey bee — compound eyes and all.

Built with React, Vite, and Three.js.

---

## What is it?

VirtualMeadow drops you into a procedurally generated wildflower meadow and lets you fly through it as a bee. It has two distinct flight modes — fast free flight with saccadic head-then-body turning (matching how bees actually navigate), and slow hovering for close inspection of flowers.

The bee automatically follows the terrain contour at a constant height above the ground, mimicking optic-flow-based terrain following used by real bees in flight. Space and Shift control the target height above ground (AGL); if the terrain rises, the bee rises with it.

A second viewport renders the world through a simulated compound eye (the B-EYE model), showing the blurred, faceted vision of both the left and right compound eyes simultaneously. The simulation is seeded, so every world is reproducible, and the bee state can be saved and restored as JSON.

---

## Features

- **Two flight modes** — free flight and hover, switchable on the fly
- **Saccadic yaw** — head snaps instantly to a new angle; body follows rapidly behind (~100 ms delay), replicating the zig-zag flight pattern of real bees
- **Terrain-following flight** — the bee maintains a constant height above the ground surface; Space/Shift adjust that target AGL, not absolute altitude
- **Dual compound eye view** — a B-EYE renderer produces left and right eye mosaics side-by-side, each a 60°-tilted field sampled through ~4 900 ommatidia with Gaussian acceptance kernels; overlapping binocular ommatidia can be highlighted in gold
- **Four viewports** — 3rd person, 1st person, top-down map (with compass), and compound eye; each panel can show any view independently
- **Procedural world** — fractal noise terrain, 280 flowers across 6 species (scaled to 5× real-flower size), 18 cloud groups, all seeded for reproducibility
- **Live status panel** — real-time display of map-space position (X east / Y north, SW-corner origin), compass bearing with cardinal label, above-ground and absolute altitude
- **Save / Load** — export and restore the bee's position, heading, speed, and target AGL as a JSON file

---

## Installation

You will need [Node.js](https://nodejs.org/) (v18 or later).

```bash
git clone https://github.com/your-username/VirtualMeadow.git
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

| Key | Action |
|-----|--------|
| `H` or `Tab` | Switch between Free Flight and Hover (slow down first to enter Hover) |

---

### Free Flight

Fast, forward-directed movement. The bee always flies in the direction its body is pointing; the head can look ahead of the body turn.

| Key | Action |
|-----|--------|
| `W` / `↑` | Accelerate forward |
| `S` / `↓` | Brake |
| `A` / `←` | Turn head left (body follows) |
| `D` / `→` | Turn head right (body follows) |
| `Space` | Increase target height above ground (climb) |
| `Shift` / `Ctrl` | Decrease target height above ground (descend) |

---

### Hover

Helicopter-style low-speed movement. Useful for inspecting individual flowers.

| Key | Action |
|-----|--------|
| `W` / `↑` | Move forward |
| `S` / `↓` | Move backward |
| `A` / `←` | Strafe left |
| `D` / `→` | Strafe right |
| `Q` | Yaw left |
| `E` | Yaw right |
| `Space` | Increase target height above ground (climb) |
| `Shift` / `Ctrl` | Decrease target height above ground (descend) |

---

### Saccade keys (both modes)

Bees navigate by a series of rapid fixed-angle saccades rather than smooth continuous turns. Press once for an instant snap; in free flight the head snaps and the body catches up within ~100–200 ms; in hover the whole bee rotates immediately.

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

Each of the two panels has four view buttons along the bottom:

| Icon | View | Description |
|------|------|-------------|
| 🎥 3rd | Third person | Camera follows behind and above the bee |
| 👁 1st | First person | Camera at the bee's head, facing the same direction |
| 🗺 Map | God / Map | Top-down view with terrain elevation, flowers, and compass |
| 🐝 Eye | Bee Eye | Live dual compound-eye ommatidia render (left eye left, right eye right) |

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
| **References** | B-EYE background, Laughlin & Horridge (1972) citation, link to Andy Giger's original B-EYE tool |

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
| Max speed (free flight) | 8.0 m/s |
| Acceleration | 4.0 m/s² |
| Continuous head yaw rate | 2.0 rad/s |
| Body yaw follow rate | 6.0 rad/s (head leads ~100 ms) |
| Hover move speed | 0.6 m/s |
| Min AGL | 0.5 m |
| Max AGL | 60.0 m |
| Terrain follow rate | 6.0 (exponential, time constant ≈ 167 ms) |
| AGL climb rate (free flight) | 3.0 m/s |
| AGL climb rate (hover) | 1.0 m/s |
| Wing flap rate | 12 Hz |

---

## Compound eye — how it works

The B-EYE renderer is a JavaScript port of Andy Giger's algorithm, extended for a true 3-D environment with dual compound eyes. See the original tool and documentation at **[andygiger.com/science/beye/beyehome.html](https://andygiger.com/science/beye/beyehome.html)**.

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

For each ommatidium `i`, the renderer applies a **Gaussian acceptance kernel** (`CreateGaussLow`): 25 angular sample directions (1 central + 8 × 2 rings) weighted by a Gaussian whose σ is derived from Laughlin & Horridge (1972). Each direction is:

1. Rotated from head-local space to world space by the bee's total head yaw (body yaw + relative head yaw)
2. Projected onto the dominant cubemap face to get a pixel coordinate
3. Read from that face's CPU pixel buffer (`Uint8Array`, transferred from GPU once per frame)

The weighted average of the 25 samples gives the ommatidium's RGB colour.

### Display

Each eye's ommatidia are mapped into a 60×160 hex grid (`_buildWabe`) and drawn as filled circles on a 2-D canvas — left eye occupying the left half, right eye the right half, separated by a faint dividing line.

---

## Known limitations

- **No mobile / touch support** — keyboard only
- **World boundary not enforced** — the bee can fly beyond the 200 m edge (terrain returns flat ground at the border)
- **Save/load restores bee state only** — the world seed is saved but loading it does not yet rebuild the scene from a new seed
- **B-EYE is CPU-bound** — the GPU → CPU pixel readback (`readRenderTargetPixels`) is synchronous; large render targets or slow GPUs will reduce frame rate

---

## References

- Giger, A. — B-EYE: original interactive compound-eye simulator.
  [andygiger.com/science/beye/beyehome.html](https://andygiger.com/science/beye/beyehome.html)
- Laughlin SB, Horridge GA (1972). "Angular sensitivity of the retinula cells of dark-adapted worker bee." *Z Vergl Physiol* 77:422–425 — source for the angular resolution gradient and inter-ommatidial angles used in `_buildOmmatidia` and `_buildGauss`

---

## License

MIT
