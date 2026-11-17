# Asset Pipeline Architecture

## Goal

PixelForge generates and manages its own reusable visual asset library. A separate world-generation system consumes that library to build biomes and locations.

The asset pipeline and world generator are independent systems connected by a stable asset manifest format.

## Scope

The first vertical slice is a Forest biome asset pack. It should prove that PixelForge can:

1. Run one or more reusable procedural asset generators.
2. Convert their output into a common PixelForge asset format.
3. validate and preview the generated assets.
4. Store assets locally and export portable asset packs.
5. Let a world generator select assets by semantic metadata and placement rules.

AI image generation is not part of the initial pipeline. A future text assistant may translate user intent into generator settings, but it must not be required for generation.

## System boundaries

### Asset Studio

Owns generator selection, parameter forms, seeds, batch generation, previews, processing, validation, and asset-library management.

### Generator adapters

Each external or internal generator is wrapped by an adapter. The adapter translates PixelForge settings into generator-specific inputs and converts its outputs into PixelForge's normalized output contract.

External generator code must not be imported directly into the core domain model. Prefer isolated packages, workers, or a documented adapter boundary so a generator can be replaced without changing the Asset Studio or World Engine.

### Asset processor

Performs deterministic post-processing where applicable:

- Image dimension and format checks.
- Alpha/transparency inspection.
- Optional palette quantization and nearest-neighbour resizing.
- Sprite bounds and pivot assistance.
- Atlas packing and manifest generation.

Processing must preserve the original generated file. Destructive processing should create a derived asset revision.

### Asset library

Stores source files, processed files, metadata, generator settings, provenance, and version information. IndexedDB is the initial browser storage target. Asset packs must be exportable independently of a browser database.

### World generation

Consumes only normalized PixelForge assets and metadata. It does not depend on the original generator implementation.

## Initial asset categories

- `terrain-tile`: ground and surface tiles.
- `terrain-transition`: edge, corner, and blend tiles with connection rules.
- `sprite`: trees, rocks, plants, props, structures, and other standalone objects.
- `autotile-set`: a collection of terrain tiles plus its adjacency or Wang-tile rules.
- `animation`: ordered frames, timing, and playback metadata.

Do not assume that every asset is a square tile. Large sprites may span multiple world cells and use a ground anchor.

## Normalized asset manifest

The manifest is the contract between Asset Studio and World Generation. It should include:

- Stable asset ID and schema version.
- Category and semantic tags.
- File references for source, processed image, and optional thumbnail.
- Pixel dimensions and optional logical footprint.
- Projection and tile-metric compatibility.
- Pivot or ground anchor in pixel coordinates.
- Biome affinity and allowed surface tags.
- Placement constraints, density weight, and collision footprint where relevant.
- Generator ID, generator version, settings, and seed.
- Provenance: upstream project, source revision, license identifier, and required notices.

The manifest must not embed image bytes. Images remain separate files referenced by stable paths or IDs.

## Example manifest shape

```json
{
  "schemaVersion": 1,
  "id": "forest.oak.001",
  "category": "sprite",
  "tags": ["tree", "oak", "deciduous"],
  "image": {
    "source": "assets/forest/oak-001.source.png",
    "processed": "assets/forest/oak-001.png",
    "width": 96,
    "height": 112
  },
  "projection": "ISOMETRIC",
  "anchor": { "x": 48, "y": 101 },
  "footprint": { "width": 2, "height": 2 },
  "biomes": ["forest", "dark-forest"],
  "placement": {
    "surfaces": ["grass", "dirt"],
    "minElevation": 0,
    "maxElevation": 3,
    "weight": 0.65
  },
  "provenance": {
    "generatorId": "example-tree-generator",
    "generatorVersion": "1.0.0",
    "seed": 12345,
    "license": "MIT"
  }
}
```

This is a conceptual contract, not a finalized public schema. Validation rules and optional fields must be specified before implementation.

## Generator adapter contract

A generator adapter should expose:

- A stable adapter ID and version.
- A capability description (supported categories, projections, output formats, parameter schema).
- Input validation and default settings.
- Deterministic generation from an explicit seed when the upstream generator supports it.
- Progress and cancellation where practical.
- A normalized result containing generated files and source provenance.

Generator-specific parameters belong to the adapter, not to the shared asset manifest.

## Licensing and provenance

Before adopting or copying code or assets from an upstream project:

1. Confirm the repository's actual license file and applicable asset licenses.
2. Record the exact upstream repository and commit or release.
3. Preserve copyright and license notices.
4. Review dependencies and transitive licenses.
5. Keep unlicensed or unclear material out of the distributed application until permission is established.

A public repository is not automatically open source. If no license is present, do not copy, modify, or redistribute its code.

## First implementation sequence

1. Complete the upstream-generator survey and license review.
2. Select one generator suitable for a small Forest asset experiment.
3. Define and test the normalized manifest schema.
4. Build one adapter and run it in a Web Worker when browser-compatible.
5. Add preview, validation, and local library storage.
6. Export a portable Forest asset pack.
7. Connect that pack to a separate biome/world-generation prototype.

## Non-goals for the first slice

- AI image generation.
- A general-purpose node editor.
- A full infinite-world streaming engine.
- Character and animation generation.
- A large collection of biomes.
- Destructive overwriting of source assets.

## Relationship to the existing map prototype

The current finite tile map remains useful as a renderer and interaction test fixture. It is not the canonical world-generation model and must not constrain the world to a fixed 20 × 20 area.

The existing projection, camera, and Canvas renderer are reusable foundations. The current dense finite tile array should remain a small-map implementation until chunk storage and world-coordinate generation are designed separately.
