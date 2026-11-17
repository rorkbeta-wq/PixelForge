# Map Grid and Tile System

The first map implementation uses a finite rectangular tile map with a configurable width, height, and chunk size. The default new map is 20 × 20 tiles with a chunk size of 32.

## Data model

A `TileMap` stores tiles in row-major order. Each cell contains a tile asset identifier or `null` when it is empty. The model is immutable at the update boundary: `setTile` returns a new map and a copied tile array.

## Coordinates

World coordinates represent tile-space positions. A tile occupies the half-open region `[x, x + 1) × [y, y + 1)`. `hitTestTile` converts a projected screen point back into tile-space and returns a coordinate only when it lies inside the finite map.

## Rendering

The Canvas 2D renderer draws the finite map as projected tile polygons, outlines each cell, and highlights the selected tile. Camera pan and zoom remain independent of map data.

Chunk streaming, asset-backed tile rendering, painting tools, and biome rules are intentionally deferred to later increments.
