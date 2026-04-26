# 🐝 VirtualMeadow

A browser-based 3D flight simulator that lets you experience a flower meadow from the perspective of a honey bee — compound eyes and all.

Built with React, Vite, and Three.js.

---

## What is it?

VirtualMeadow drops you into a procedurally generated wildflower meadow and lets you fly through it as a bee. It has two distinct flight modes — fast free flight with saccadic head-then-body turning (matching how bees actually navigate), and slow hovering for close inspection of flowers. A second viewport renders the world through a simulated compound eye (the B-EYE model), showing the blurred, faceted vision that real bees use to read optic flow.

The simulation is seeded, so every world is reproducible, and the bee state can be saved and restored as JSON.

---

## Features

- **Two flight modes** — free flight and hover, switchable on the fly
- **Saccadic yaw** — head snaps instantly to a new angle; body follows rapidly behind (~100 ms delay), replicating the zig-zag flight pattern of real bees
- **Compound eye view** — a B-EYE ommatidia renderer samples a live perspective render and maps it through 4 900 individual facets with Gaussian blur kernels
- **Four viewports** — 3rd person, 1st person, top-down map, and compound eye; each panel can show any view independently
- **Procedural world** — fractal noise terrain, 280 flowers across 6 species, 18 cloud groups, all seeded for reproducibility
- **Save / Load** — export and restore the bee's position, heading, and speed as a JSON file

---

## Installation

You will need [Node.js](https://nodejs.org/) (v18 or later).

```bash
git clone https://github.com/your-username/VirtualMeadow.git
cd VirtualMeadow/meadow-app
npm install
npm run dev
```

Then open **http://localhost:5173** in your browser.

To build a static bundle for hosting:

```bash
npm run build      # outputs to meadow-app/dist/
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
| `Space` | Climb |
| `Shift` / `Ctrl` | Descend |

#### Saccade keys (discrete head snaps — free flight only)

Bees navigate by a series of rapid fixed-angle saccades rather than smooth continuous turns. Press once for an instant head snap; the body catches up within ~100–200 ms.

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
| `Space` | Ascend |
| `Shift` / `Ctrl` | Descend |

---

### Viewport switching

Each of the two panels has four view buttons along the bottom:

| Icon | View | Description |
|------|------|-------------|
| 🎥 3rd | Third person | Camera follows behind and above the bee |
| 👁 1st | First person | Camera at the bee's head, facing the same direction |
| 🗺 Map | God / Map | Top-down orthographic overview |
| 🐝 Eye | Bee Eye | Live compound-eye ommatidia render |

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
| Compound eye | B-EYE port (Andy Giger) — Gaussian-kernel ommatidia sampling |
| Terrain | Fractal value noise (`noise.js`) on a 120×120 `PlaneGeometry` |
| Styling | Single CSS file with custom properties — no CSS frameworks |

---

## World parameters

| Parameter | Value |
|-----------|-------|
| World size | 200 × 200 m |
| Max terrain height | 10 m |
| Flower count | 280 (6 species) |
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
| Min / max altitude | 0.5 m / 60 m |
| Wing flap rate | 12 Hz |

---

## Compound eye — how it works

The B-EYE renderer is a JavaScript port of Andy Giger's Processing algorithm. Each frame it:

1. Renders the scene to an offscreen `WebGLRenderTarget` through a 110° perspective camera at the bee's head
2. Maps each of 4 900 ommatidia's angular position `(ax, ay)` to a pixel in that render using `px = W/2 + f·tan(ax)`, where `f = (W/2) / tan(55°)`
3. Applies a Gaussian acceptance kernel (σ derived from angular sensitivity data, Laughlin & Horridge 1972) to nearby pixels
4. Draws the result as coloured hexagons on a 2D canvas

---

## Known limitations

- **No mobile / touch support** — keyboard only
- **World boundary not enforced** — the bee can fly beyond the 200 m edge (terrain returns flat ground)
- **Save/load restores bee state only** — the world seed is saved but loading it does not yet rebuild the scene from the new seed
- **B-EYE is CPU-bound** — the GPU → CPU pixel readback (`readRenderTargetPixels`) is synchronous; large render targets will drop frame rate

---

## Reference

- Giger, A. — original B-EYE Processing sketch (ommatidia sampling algorithm)
- Laughlin SB, Horridge GA (1972). "Angular sensitivity of the retinula cells of dark-adapted worker bee." *Z Vergl Physiol* 77:422–425 — source for the angular resolution gradient across the bee eye

---

## License

MIT
