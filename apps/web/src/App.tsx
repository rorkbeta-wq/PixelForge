import { useState } from "react";
import type { TileCoordinate } from "@pixelforge/core";
import WorldCanvas from "./components/WorldCanvas";
type Workspace = "World" | "Assets" | "Characters" | "Animation";
const workspaces: Workspace[] = ["World", "Assets", "Characters", "Animation"];

function App() {
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace>("World");
  const [selectedTile, setSelectedTile] = useState<TileCoordinate | null>(null);
  return (
    <main className="studio-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="PixelForge home"><span className="brand-mark">P</span><span>PixelForge</span><span className="version">0.1.0</span></a>
        <div className="project-name">Untitled project</div>
        <div className="topbar-actions"><span className="save-status"><i /> Local workspace</span><button className="button button-muted" type="button">Export</button></div>
      </header>
      <div className="workspace">
        <aside className="sidebar">
          <div className="section-label">WORKSPACE</div>
          <nav className="workspace-nav" aria-label="Studio workspaces">
            {workspaces.map(workspace => <button className={activeWorkspace === workspace ? "nav-item active" : "nav-item"} key={workspace} onClick={() => setActiveWorkspace(workspace)} type="button}><span className={`nav-icon icon-${workspace.toLowerCase()}`} />{workspace}{workspace !== "World" && <span className="soon">SOON</span>}</button>)}
          </nav>
          <div className="sidebar-bottom"><div className="section-label">PROJECT</div><div className="project-entry"><span className="folder-icon" /> Untitled project</div><div className="project-meta">No project saved yet</div></div>
        </aside>
        <section className="editor">
          <div className="editor-toolbar"><div><div className="eyebrow">WORLD STUDIO</div><h1>{activeWorkspace === "World" ? "World editor" : `${activeWorkspace} studio`}</h1></div><div className="toolbar-controls"><span className="mode-chip">ISOMETRIC</span><span className="zoom-value">20 × 20 MAP</span></div></div>
          <div className="editor-canvas-slot">{activeWorkspace === "World" ? <WorldCanvas onTileSelect={setSelectedTile} /> : <div className="coming-soon"><span className="coming-soon-mark">✳</span><strong>{activeWorkspace} Studio</strong><span>This workspace is planned for a future release.</span></div>}</div>
        </section>
        <aside className="inspector">
          <div className="inspector-heading">INSPECTOR</div>
          <div className="empty-inspector"><span className="inspector-symbol">◇</span><strong>{selectedTile ? "Tile selected" : "Nothing selected"}</strong><span>{selectedTile ? `Grid coordinate: ${selectedTile.x}, ${selectedTile.y}` : "Select a tile on the map to inspect its coordinates."}</span></div>
          <div className="inspector-section"><div className="section-label">MAP SETTINGS</div><div className="setting-row"><span>Dimensions</span><strong>20 × 20</strong></div><div className="setting-row"><span>Projection</span><strong>Isometric</strong></div><div className="setting-row"><span>Tile size</span><strong>64 × 32</strong></div><div className="setting-row"><span>Chunk size</span><strong>32 × 32</strong></div></div>
        </aside>
      </div>
      <footer className="statusbar"><span>PIXELFORGE ENGINE</span><span>MAP GRID & TILE SYSTEM · IN DEVELOPMENT</span><span>LOCAL-FIRST</span></footer>
    </main>
  );
}
export default App;
