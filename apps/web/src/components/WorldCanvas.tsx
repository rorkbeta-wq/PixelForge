import { useCallback, useEffect, useRef, useState } from "react";
import { createTileMap, DEFAULT_CAMERA, DEFAULT_PROJECTION, hitTestTile, panCamera, zoomCameraAt, type Camera2D, type TileCoordinate } from "@pixelforge/core";
import { drawTileMap } from "@pixelforge/renderer";

interface WorldCanvasProps {
  projectionMode?: "ISOMETRIC" | "TOP_DOWN";
  onTileSelect?: (tile: TileCoordinate | null) => void;
}

function WorldCanvas({ projectionMode = "ISOMETRIC", onTileSelect }: WorldCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [camera, setCamera] = useState<Camera2D>({ ...DEFAULT_CAMERA });
  const [isPanning, setIsPanning] = useState(false);
  const [selectedTile, setSelectedTile] = useState<TileCoordinate | null>(null);
  const [map] = useState(() => createTileMap(20, 20, 32));
  const pointerRef = useRef<{ x: number; y: number; startX: number; startY: number; moved: boolean } | null>(null);
  const cameraRef = useRef(camera);
  cameraRef.current = camera;
  const projection = { ...DEFAULT_PROJECTION, mode: projectionMode };

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const bounds = container.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.floor(bounds.width));
    const height = Math.max(1, Math.floor(bounds.height));
    if (canvas.width !== Math.floor(width * ratio) || canvas.height !== Math.floor(height * ratio)) {
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
    }
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawTileMap(context, { width, height, cameraX: cameraRef.current.x, cameraY: cameraRef.current.y, zoom: cameraRef.current.zoom, projection, map, selectedTile });
  }, [map, projection, selectedTile]);

  useEffect(() => { render(); }, [camera, render]);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(render);
    observer.observe(container);
    return () => observer.disconnect();
  }, [render]);

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0 && event.button !== 1) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerRef.current = { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const pointer = pointerRef.current;
    if (!pointer) return;
    const dx = event.clientX - pointer.x;
    const dy = event.clientY - pointer.y;
    if (!pointer.moved && Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) > 3) {
      pointer.moved = true;
      setIsPanning(true);
    }
    if (pointer.moved) setCamera(current => panCamera(current, dx, dy));
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  };

  const stopPointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const pointer = pointerRef.current;
    if (pointer && !pointer.moved && event.type === "pointerup" && event.button === 0) {
      const bounds = event.currentTarget.getBoundingClientRect();
      const sx = (event.clientX - bounds.left - bounds.width / 2 - cameraRef.current.x) / cameraRef.current.zoom;
      const sy = (event.clientY - bounds.top - bounds.height / 2 - cameraRef.current.y) / cameraRef.current.zoom;
      const tile = hitTestTile(map, { x: sx, y: sy }, projection);
      setSelectedTile(tile);
      onTileSelect?.(tile);
    }
    pointerRef.current = null;
    setIsPanning(false);
  };

  const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left - bounds.width / 2;
    const y = event.clientY - bounds.top - bounds.height / 2;
    setCamera(current => zoomCameraAt(current, current.zoom * Math.exp(-event.deltaY * 0.0012), x, y));
  };

  return (
    <div className="canvas-wrap" ref={containerRef}>
      <canvas ref={canvasRef} className={isPanning ? "world-canvas panning" : "world-canvas"}
        aria-label="Finite tile map. Tap a tile to select it, drag to pan, scroll to zoom."
        onPointerDown={handlePointerDown} onPointerMove={handlePointerMove}
        onPointerUp={stopPointer} onPointerCancel={stopPointer}
        onLostPointerCapture={() => { pointerRef.current = null; setIsPanning(false); }}
        onWheel={handleWheel} />
      <div className="canvas-tools">
        <button className="canvas-tool" type="button" onClick={() => setCamera(c => zoomCameraAt(c, c.zoom / 1.2, 0, 0))} aria-label="Zoom out">−</button>
        <span>{Math.round(camera.zoom * 100)}%</span>
        <button className="canvas-tool" type="button" onClick={() => setCamera(c => zoomCameraAt(c, c.zoom * 1.2, 0, 0))} aria-label="Zoom in">+</button>
        <button className="canvas-tool reset-camera" type="button" onClick={() => setCamera({ ...DEFAULT_CAMERA })}>Reset</button>
      </div>
      <div className="canvas-hint-overlay"><strong>Map · {map.width} × {map.height}</strong><span>Tap a tile to select · Drag to move · Scroll to zoom</span></div>
      <div className="canvas-footer"><span>{selectedTile ? `Tile ${selectedTile.x}, ${selectedTile.y}` : "No tile selected"}</span><span>{projectionMode.replace("_", " ")} PROJECTION</span></div>
    </div>
  );
}
export default WorldCanvas;
