import { useRef, useState } from 'react';

export default function Toolbar({ onSave, onLoad, flightMode, speed }) {
  const fileInputRef = useRef(null);
  const [loadError, setLoadError] = useState(null);

  const handleLoadClick = () => {
    setLoadError(null);
    fileInputRef.current?.click();
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        onLoad?.(data);
      } catch {
        setLoadError('Invalid file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="toolbar">
      <button className="toolbar-btn" onClick={onSave} title="Save simulation state to JSON">
        💾 Save
      </button>
      <button className="toolbar-btn" onClick={handleLoadClick} title="Open saved simulation JSON">
        📂 Open
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
      {loadError && <span style={{ color: '#f44', fontSize: 11 }}>{loadError}</span>}

      <div className="toolbar-sep" />
      <span style={{ fontSize: 11, color: '#888' }}>Drag JSON file to load ·</span>

      {/* Status on the right */}
      <div className="toolbar-status">
        <span>
          Speed: <b>{typeof speed === 'number' ? speed.toFixed(1) : '0.0'} m/s</b>
        </span>
        <span className={`mode-badge${flightMode === 'Hover' ? ' hover' : ''}`}>
          {flightMode || 'Free Flight'}
        </span>
      </div>
    </div>
  );
}
