# PixelForge

Open-source, browser-based 2D game development studio focused on pixel-art worlds and game assets.

PixelForge is being developed as a mobile-first, local-first tool. The initial release focuses on the foundations required for a reliable world editor.

## Development status

**Current milestone:** Core Foundation (0.1.0)

Implemented:
- TypeScript workspace with a React and Vite web application
- Initial studio interface with World, Assets, Characters, and Animation workspaces
- Isometric and top-down coordinate projection primitives
- Versioned project data model
- Canvas 2D isometric and top-down grid renderer
- Interactive camera with pointer panning and cursor-centered zoom
- Unit tests for coordinate transforms, camera behavior, and project validation

Planned next:
- IndexedDB project persistence
- Map and chunk data structures
- Basic map editing interactions

## Requirements

- Node.js 20 or newer
- npm 10 or newer

## Getting started

```bash
npm install
npm run dev
```

## Quality checks

```bash
npm test
npm run typecheck
npm run build
```

## Project principles

- Free and open-source
- Mobile-first browser interface
- Offline-first and local-first workflows
- No mandatory cloud services
- Modular TypeScript architecture
- Versioned, documented project format

## License

The project license will be selected before the first public release.
