# Project Format

PixelForge projects use a versioned JSON data model. The initial format identifier is `pixelforge` and the current format version is `1`.

## Root structure

- `format`: format identifier.
- `formatVersion`: integer used to select a parser and migration path.
- `id`: stable project identifier.
- `name`: user-facing project name.
- `createdAt`: ISO 8601 creation timestamp.
- `updatedAt`: ISO 8601 last modification timestamp.
- `settings`: project-wide settings.

## Initial settings

- `projection`: coordinate projection mode, tile dimensions, elevation scale, and origin.
- `chunkSize`: positive integer defining the width and height of a map chunk in tiles.

## Compatibility

Readers must reject unsupported major format versions instead of silently interpreting unknown data. Future format changes will use explicit migration functions and tests.

## Storage

The data model is independent of its storage backend. IndexedDB will be the initial local persistence layer. Import and export will use UTF-8 JSON until the packaged `.pforge` archive format is specified.
