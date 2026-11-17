# Canvas Renderer

The first renderer uses the browser Canvas 2D API. Rendering is kept in the `@pixelforge/renderer` workspace package and receives projection and camera values as explicit inputs.

## Initial responsibilities

- Clear and paint the viewport.
- Draw the world grid using the shared coordinate projection.
- Apply camera translation and zoom.
- Render at the device pixel ratio, capped at 2 to balance sharpness and performance.

## Camera model

The camera stores screen-space translation (`x`, `y`) and a positive zoom factor. The initial supported zoom range is 20% to 400%.

Pointer dragging pans the camera. Wheel input zooms around the cursor position so the world point under the pointer remains stationary. Reset returns the camera to its default position and scale.

## Boundaries

The renderer does not own project data, React state, asset loading, or persistence. The UI owns interaction state and passes a render configuration to the renderer.

## Follow-up work

- Add viewport culling and visible chunk bounds.
- Add tile and object draw commands.
- Add pixel-art image sampling and sprite rendering.
- Add render layers and depth sorting.
- Move expensive generation and preprocessing to Web Workers when needed.
