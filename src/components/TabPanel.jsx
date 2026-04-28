import { useState } from 'react';

const TABS = ['Help', 'Status', 'About'];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert a Three.js bodyYaw (radians) to a 0–359° compass bearing.
 *  bodyYaw=0 → facing −Z = North.  Positive bodyYaw rotates CCW (west). */
function bearingDeg(bodyYaw) {
  // heading increases clockwise from North when bodyYaw increases CCW,
  // so compass = (−bodyYaw in degrees + 360) mod 360
  return (((-bodyYaw * 180) / Math.PI) % 360 + 360) % 360;
}

/** Return a short cardinal/intercardinal label for a compass bearing. */
function cardinalLabel(deg) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg / 45) % 8];
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

function HelpTab() {
  return (
    <div className="tab-content">
      {/* Flight Modes intro — full width */}
      <div className="help-section">
        <h3>Flight Modes</h3>
        <p>The bee has two flight modes. Press <b style={{color:'#f5a623'}}>H</b> or <b style={{color:'#f5a623'}}>Tab</b> to toggle (you must slow down first to enter hover).</p>
        <p className="help-note">Free Flight is fast, forward-directed movement. Hover is helicopter-like movement in any direction at lower speed.</p>
      </div>

      {/* Two columns: Free Flight | Hover */}
      <div className="help-two-col">
        <div className="help-section">
          <h3>Free Flight Controls</h3>
          <table className="help-table">
            <tbody>
              <tr><td>W / ↑</td><td>Accelerate forward</td></tr>
              <tr><td>S / ↓</td><td>Brake / slow down</td></tr>
              <tr><td>A / ←</td><td>Head yaw left (body follows)</td></tr>
              <tr><td>D / →</td><td>Head yaw right (body follows)</td></tr>
              <tr><td>Space</td><td>Ascend / climb</td></tr>
              <tr><td>Shift / Ctrl</td><td>Descend</td></tr>
              <tr><td>H / Tab</td><td>Switch to Hover mode</td></tr>
            </tbody>
          </table>
          <p className="help-note">Head yaws first, body gradually catches up over ~0.3–1.5 s. Direction of travel follows the body heading.</p>
        </div>

        <div className="help-section">
          <h3>Hover / Scanning Controls</h3>
          <table className="help-table">
            <tbody>
              <tr><td>W / ↑</td><td>Move forward</td></tr>
              <tr><td>S / ↓</td><td>Move backward</td></tr>
              <tr><td>A / ←</td><td>Strafe left</td></tr>
              <tr><td>D / →</td><td>Strafe right</td></tr>
              <tr><td>Q</td><td>Yaw left</td></tr>
              <tr><td>E</td><td>Yaw right</td></tr>
              <tr><td>Space</td><td>Ascend</td></tr>
              <tr><td>Shift / Ctrl</td><td>Descend</td></tr>
              <tr><td>H / Tab</td><td>Switch to Free Flight</td></tr>
            </tbody>
          </table>
          <p className="help-note">Helicopter-style — strafe in any direction at low speed. Yaw via Q/E or saccade keys (1–0).</p>
        </div>
      </div>

      {/* Two columns: Saccades 1–5 (left) | 6–0 (right) */}
      <div className="help-two-col">
        <div className="help-section">
          <h3>Saccades 1–5 (Left)</h3>
          <table className="help-table">
            <tbody>
              <tr><td>1</td><td>75° anti-clockwise (left)</td></tr>
              <tr><td>2</td><td>30° left</td></tr>
              <tr><td>3</td><td>15° left</td></tr>
              <tr><td>4</td><td>5° left</td></tr>
              <tr><td>5</td><td>2° left</td></tr>
            </tbody>
          </table>
          <p className="help-note">One-shot snaps. Free Flight: head snaps, body follows. Hover: whole bee rotates.</p>
        </div>

        <div className="help-section">
          <h3>Saccades 6–0 (Right)</h3>
          <table className="help-table">
            <tbody>
              <tr><td>6</td><td>2° right</td></tr>
              <tr><td>7</td><td>5° right</td></tr>
              <tr><td>8</td><td>15° right</td></tr>
              <tr><td>9</td><td>30° right</td></tr>
              <tr><td>0</td><td>75° clockwise (right)</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Full-width sections */}
      <div className="help-section">
        <h3>Viewport Views</h3>
        <table className="help-table">
          <tbody>
            <tr><td>🗺 Map</td><td>2D top-down god/map view of the meadow</td></tr>
            <tr><td>🎥 3rd Person</td><td>Camera follows behind and above the bee</td></tr>
            <tr><td>👁 1st Person</td><td>Camera at the bee's head position, looking forward</td></tr>
            <tr><td>🐝 Bee Eye</td><td>Compound eye ommatidia view (B-EYE algorithm, after Andy Giger)</td></tr>
          </tbody>
        </table>
        <p className="help-note">Click any view thumbnail in the bottom-left of a viewport to switch its camera. Both viewports can show the same or different views simultaneously.</p>
      </div>

      <div className="help-section">
        <h3>Panels &amp; Layout</h3>
        <table className="help-table">
          <tbody>
            <tr><td>Divider (H)</td><td>Drag between the two viewports to resize. Drag to the edge to collapse one panel.</td></tr>
            <tr><td>Divider (V)</td><td>Drag between viewports and this tab panel to resize vertically.</td></tr>
            <tr><td>Arrow strip</td><td>Click the arrow strip at either side of the viewport area to expand a collapsed viewport.</td></tr>
          </tbody>
        </table>
      </div>

      <div className="help-section">
        <h3>Save / Load</h3>
        <p>Use the <b style={{color:'#f5a623'}}>💾 Save</b> button to download a JSON file with the bee position and world seed. Use <b style={{color:'#f5a623'}}>📂 Open</b> or drag-and-drop a JSON file onto the app to restore a saved session.</p>
      </div>
    </div>
  );
}

function StatusTab({ flightMode, speed, beePos, beeOrientation, beeAltitude, terrainAltitude }) {
  const bearing  = typeof beeOrientation === 'number' ? beeOrientation : 0;
  const cardinal = cardinalLabel(bearing);

  return (
    <div className="tab-content">
      <div className="help-section">
        <h3>Bee Status</h3>
        <table className="help-table status-table">
          <tbody>
            <tr><td>Flight Mode</td><td>{flightMode}</td></tr>
            <tr><td>Speed</td><td>{typeof speed === 'number' ? speed.toFixed(2) : '0.00'} m/s</td></tr>
          </tbody>
        </table>
      </div>

      <div className="help-section">
        <h3>Position &amp; Orientation</h3>
        <table className="help-table status-table">
          <tbody>
            <tr>
              <td>X&nbsp;(East)</td>
              <td>{typeof beePos?.x === 'number' ? beePos.x.toFixed(1) : '—'} m</td>
            </tr>
            <tr>
              <td>Y&nbsp;(North)</td>
              <td>{typeof beePos?.y === 'number' ? beePos.y.toFixed(1) : '—'} m</td>
            </tr>
            <tr>
              <td>Orientation</td>
              <td>
                {typeof beeOrientation === 'number'
                  ? `${bearing.toFixed(1)}° ${cardinal}`
                  : '—'}
              </td>
            </tr>
          </tbody>
        </table>
        <p className="help-note">Coordinates use a map-space system: origin at the south-west corner, X increases eastward, Y increases northward. The meadow spans 0–200 m on each axis.</p>
      </div>

      <div className="help-section">
        <h3>Altitude</h3>
        <table className="help-table status-table">
          <tbody>
            <tr>
              <td>Above ground</td>
              <td>{typeof terrainAltitude === 'number' ? terrainAltitude.toFixed(2) : '—'} m</td>
            </tr>
            <tr>
              <td>Absolute (ASL)</td>
              <td>{typeof beeAltitude === 'number' ? beeAltitude.toFixed(2) : '—'} m</td>
            </tr>
          </tbody>
        </table>
        <p className="help-note">Absolute altitude is the bee's world-space Y. Above-ground altitude is the margin above the terrain surface directly below the bee.</p>
      </div>
    </div>
  );
}

function AboutTab() {
  return (
    <div className="tab-content">
      <div className="help-section">
        <h3>About the project</h3>
        <p>Hi, I am Mark Roper. In the early 2010's I did a PhD in honeybee cognition. Specifically how bees, at a neurobiological level, identify and discriminate different flower species. Part of that investigation was in understanding how bees process visual information, and how their flight dynamics underpin their remarkable abilities. During my research Dr Andy Giger kindly provided me with a copy of his B-Eye programme (see below) which envisages what a bee might see when looking at images. Here, I have ported that to a 3d virtual meadow where the bee can fly past, or hover next to, different flowers. This is not a correct scientific representation, but I hope it provides a fun and insightful experience into what it is like as a bee; having a very wide field of view, yet limited visual acuity.</p>
        <p>This application is fully open source, the code can be found at:&nbsp;
          <a
            href="https://github.com/DrMarkRoper/VirtualMeadow"
            target="_blank"
            rel="noreferrer"
            style={{ color: '#f5a623', wordBreak: 'break-all' }}
          >
            https://github.com/DrMarkRoper/VirtualMeadow
          </a>
        </p>
      </div>

      <div className="help-section">
        <h3>About the Bee Eye</h3>
        <p>The <b>Bee Eye</b> view simulates the compound eye of a honey bee using an ommatidia model based on Andy Giger's B-EYE algorithm. Each hexagonal facet represents a single ommatidium, sampling the visual scene with a Gaussian acceptance function. Angular resolution varies across the eye from ~1.5° to ~3.7° as in the real eye.</p>
        <p className="help-note">Reference: Laughlin SB, Horridge GA (1972). Angular sensitivity of the retinula cells of dark-adapted worker bee. Z Vergl Physiol 77:422–425.</p>
      </div>

      <div className="help-section">
        <h3>B-EYE — Andy Giger</h3>
        <p>The ommatidia placement and Gaussian acceptance function used in this simulation are based on the B-EYE model developed by Andy Giger. The original interactive tool and detailed documentation are available on his website:</p>
        <p>
          <a
            href="https://andygiger.com/science/beye/beyehome.html"
            target="_blank"
            rel="noreferrer"
            style={{ color: '#f5a623', wordBreak: 'break-all' }}
          >
            andygiger.com/science/beye/beyehome.html
          </a>
        </p>
      </div>
    </div>
  );
}

export default function TabPanel({ flightMode, speed, beePos, beeOrientation, beeAltitude, terrainAltitude }) {
  const [activeTab, setActiveTab] = useState('Help');

  return (
    <div className="tab-panel">
      <div className="tab-bar">
        {TABS.map(tab => (
          <button
            key={tab}
            className={`tab-btn${activeTab === tab ? ' active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
      {activeTab === 'Help'       && <HelpTab />}
      {activeTab === 'Status'     && (
        <StatusTab
          flightMode={flightMode}
          speed={speed}
          beePos={beePos}
          beeOrientation={beeOrientation}
          beeAltitude={beeAltitude}
          terrainAltitude={terrainAltitude}
        />
      )}
      {activeTab === 'About'      && <AboutTab />}
    </div>
  );
}
