import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_CAMERA,
  DEFAULT_PROJECTION,
  panCamera,
  zoomCameraAt,
  type Camera2D
} from "@pixelforge/core";
import { drawIsometricGrid } from "@pixelforge/renderer";

interface WorldCanvasProps {
  projectionMode?: "ISOMETRIC" | "TOP_DOWN";
}

function WorldCanvas({ projectionMode = "ISOMETRIC" }: WorldCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [camera, setCamera] = useState<Camera2D>({ ...DEFAULT_CAMERA });
  const [isPanning, setIsPanning] = useState(false);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const cameraRef = useRef(camera);
  cameraRef.current = camera;

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const bounds = container.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.floor(bounds.width));
    const height = Math.max(1, Math.floor(bounds.height));

    if (canvas.width !== Math.floor(width * pixelRatio) || canvas.height !== Math.floor(height * pixelRatio)) {
      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
    }

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawIsometricGrid(context, {
      width,
      height,
      cameraX: cameraRef.current.x,
      cameraY: cameraRef.current.y,
      zoom: cameraRef.current.zoom,
      projection: {
        ...DEFAULT_PROJECTION,
        mode: projectionMode
      }
    });
  }, [projectionMode]);

  useEffect(() => {
    render();
  }, [camera, render]);

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
    pointerRef.current = { x: event.clientX, y: event.clientY };
    setIsPanning(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const previous = pointerRef.current;
    if (!previous) return;

    setCamera((current) => panCamera(
      current,
      event.clientX - previous.x,
      event.clientY - previous.y
    ));
    pointerRef.current = { x: event.clientX, y: event.clientY };
  };

  const stopPanning = () => {
    pointerRef.current = null;
    setIsPanning(false);
  };

  const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    const anchorX = event.clientX - bounds.left - bounds.width / 2;
    const anchorY = event.clientY - bounds.top - bounds.height / 2;
    const factor = Math.exp(-event.deltaY * 0.0012);

    setCamera((current) => zoomCameraAt(
      current,
      current.zoom * factor,
      anchorX,
      anchorY
    ));
  };

  const resetCamera = () => setCamera({ ...DEFAULT_CAMERA });

  return (
    <div className="canvas-wrap" ref={containerRef}>
      <canvas
        ref={canvasRef}
        className={isPanning ? "world-canvas panning" : "world-canvas"}
        aria-label="Interactive isometric world grid. Drag to pan and scroll to zoom."
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopPanning}
        onPointerCancel={stopPanning}
        onLostPointerCapture={stopPanning}
        onWheel={handleWheel}
      />
      <div className="canvas-tools">
        <button className="canvas-tool" type="button" onClick={() => setCamera((current) => zoomCameraAt(current, current.zoom / 1.2, 0, 0))} aria-label="Zoom out">−</button>
        <span>{Math.round(camera.zoom * 100)}%</span>
        <button className="canvas-tool" type="button" onClick={() => setCamera((current) => zoomCameraAt(current, current.zoom * 1.2, 0, 0))} aria-label="Zoom in">+</button>
        <button className="canvas-tool reset-camera" type="button" onClick={resetCamera}>Reset</button>
      </div>
      <div className="canvas-hint-overlay">
        <strong>World grid</strong>
        <span>Drag to move · Scroll to zoom</span>
      </div>
      <div className="canvas-footer">
        <span>0 × 0 tiles</span>
        <span>{projectionMode.replace("_", " ")} PROJECTION</span>
      </div>
    </div>
  );
}

export default WorldCanvas;
