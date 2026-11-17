# PixelForge Architecture

## Product principles

- Browser-based and mobile-first.
- Local-first: projects remain usable without an account or remote service.
- Offline-first: core editing workflows must not depend on a network connection.
- Modular: domain logic stays independent from the React interface.
- Deterministic: procedural systems accept explicit seeds and configuration.
- Portable: project data uses documented, versioned formats.

## Initial technology

| Area | Initial choice |
| --- | --- |
| Interface | React + TypeScript |
| Build tooling | Vite |
| 2D rendering | Canvas 2D |
| Local project storage | IndexedDB |
| Background work | Web Workers |
| Unit tests | Vitest |
| Browser tests | Playwright, introduced when editor workflows exist |

## Repository layout

- `apps/web`: browser application.
- `packages/core`: shared domain types and mathematical primitives.
- Additional engine packages are introduced when their boundaries and responsibilities are implemented.

## Coordinate model

World coordinates use X and Y for the ground plane and Z for elevation. The initial isometric projection uses:

```
screenX = originX + (worldX - worldY) * tileWidth / 2
screenY = originY + (worldX + worldY) * tileHeight / 2 - worldZ * heightUnit
```

Top-down projection uses:

```
screenX = originX + worldX * tileWidth
screenY = originY + worldY * tileHeight - worldZ * heightUnit
```

The inverse isometric transform requires a known Z value because screen coordinates alone do not identify elevation.

## First milestone: Core Foundation

1. Establish the TypeScript workspace and browser application.
2. Implement and test coordinate projection primitives.
3. Define versioned project data and persistence boundaries.
4. Add the Canvas renderer and camera after the coordinate model is stable.
