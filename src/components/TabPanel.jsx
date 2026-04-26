import { useState } from 'react';

const TABS = ['Help', 'Status'];

function HelpTab() {
  return (
    <div className="tab-content">
      <div className="help-section">
        <h3>Flight Modes</h3>
        <p>The bee has two flight modes. Press <b style={{color:'#f5a623'}}>H</b> or <b style={{color:'#f5a623'}}>Tab</b> to toggle (you must slow down first to enter hover).</p>
        <p className="help-note">Free Flight is fast, forward-directed movement. Hover is helicopter-like movement in any direction at lower speed.</p>
      </div>

      <div className="help-section">
        <h3>Free Flight Controls</h3>
        <table className="help-table">
          <tbody>
            <tr><td>W / ↑</td><td>Accelerate forward</td></tr>
            <tr><td>S / ↓</td><td>Brake / slow down</td></tr>
            <tr><td>A / ←</td><td>Continuous head yaw left (body follows)</td></tr>
            <tr><td>D / →</td><td>Continuous head yaw right (body follows)</td></tr>
            <tr><td>Space</td><td>Ascend / climb</td></tr>
            <tr><td>Shift / Ctrl</td><td>Descend</td></tr>
            <tr><td>H / Tab</td><td>Switch to Hover mode (slow down first)</td></tr>
          </tbody>
        </table>
        <p className="help-note">In free flight the bee's head yaws first (saccade), then the body gradually catches up over ~0.3–1.5 s. Direction of travel follows the body heading.</p>
      </div>

      <div className="help-section">
        <h3>Saccade Keys (both modes)</h3>
        <table className="help-table">
          <tbody>
            <tr><td>1</td><td>Snap head/body 75° anti-clockwise (left)</td></tr>
            <tr><td>2</td><td>30° left</td></tr>
            <tr><td>3</td><td>15° left</td></tr>
            <tr><td>4</td><td>5° left</td></tr>
            <tr><td>5</td><td>2° left</td></tr>
            <tr><td>6</td><td>2° right</td></tr>
            <tr><td>7</td><td>5° right</td></tr>
            <tr><td>8</td><td>15° right</td></tr>
            <tr><td>9</td><td>30° right</td></tr>
            <tr><td>0</td><td>75° right (clockwise)</td></tr>
          </tbody>
        </table>
        <p className="help-note">Saccades are one-shot angular steps: in Free Flight the head snaps instantly and the body follows; in Hover the whole bee rotates immediately.</p>
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
            <tr><td>H / Tab</td><td>Switch back to Free Flight</td></tr>
          </tbody>
        </table>
        <p className="help-note">In hover mode the bee moves like a helicopter — strafe in any direction at low speed. Yaw via Q/E or saccade keys (1–0).</p>
      </div>

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

      <div className="help-section">
        <h3>About the Bee Eye</h3>
        <p>The <b>Bee Eye</b> view simulates the compound eye of a honey bee using an ommatidia model based on Andy Giger's B-EYE algorithm. Each hexagonal facet represents a single ommatidium, sampling the visual scene with a Gaussian acceptance function. Angular resolution varies across the eye from ~1.5° to ~3.7° as in the real eye.</p>
        <p className="help-note">Reference: Laughlin SB, Horridge GA (1972). Angular sensitivity of the retinula cells of dark-adapted worker bee. Z Vergl Physiol 77:422–425.</p>
      </div>
    </div>
  );
}

function StatusTab({ flightMode, speed }) {
  return (
    <div className="tab-content">
      <div className="help-section">
        <h3>Bee Status</h3>
        <table className="help-table">
          <tbody>
            <tr><td>Flight Mode</td><td>{flightMode}</td></tr>
            <tr><td>Speed</td><td>{typeof speed === 'number' ? speed.toFixed(2) : '0.00'} m/s</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function TabPanel({ flightMode, speed }) {
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
      {activeTab === 'Help'   && <HelpTab />}
      {activeTab === 'Status' && <StatusTab flightMode={flightMode} speed={speed} />}
    </div>
  );
}
