# VirtualMeadow v.0.1 – React/Vite App

This is the development version of VirtualMeadow built with React + Vite + Three.js.
For immediate use, open `../VirtualMeadow.html` in your browser instead.

## Quick Start

```bash
cd meadow-app
npm install
npm run dev
```

Then open http://localhost:5173 in your browser.

## Build for production

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
  App.jsx                     Main layout + animation loop
  App.css                     All styles
  components/
    Toolbar.jsx               Save/Load toolbar
    ViewportContainer.jsx     Horizontal split + collapse
    Viewport.jsx              Single viewport with view selector
    TabPanel.jsx              Help + Status tabs
  engine/
    noise.js                  Fractal noise for terrain
    scene.js                  Three.js scene, terrain, flowers
    bee.js                    Bee model + flight controller
    beeEye.js                 B-EYE ommatidia renderer (port of Processing code)
```
