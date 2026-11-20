# Reference-based Tree Generator

## Goal

Build tree assets from an artist-approved image reference. The reference defines the visual language: silhouette, branch rhythm, canopy grouping, bark and foliage palette, cluster scale, and shading density. The generator must not substitute a generic procedural tree grammar for those traits.

## First milestone

The first milestone is a local, deterministic reference-ingestion pipeline:

1. Load a user-provided PNG/JPEG in the browser.
2. Remove a connected background region sampled from the image corners, with an adjustable tolerance.
3. Crop to the remaining alpha bounds while preserving transparency.
4. Measure the silhouette bounds, approximate trunk axis, row occupancy, and dominant colors.
5. Produce controlled derived variants from the source pixels (small horizontal silhouette deformation and seasonal palette mapping).
6. Save the cleaned reference and derived PNG assets in IndexedDB with provenance metadata.

All processing stays in the browser. No network upload, hosted inference, paid API, or image-generation service is used.

## Reference model

A reference profile stores:
- source dimensions and crop bounds;
- background-removal tolerance;
- alpha bounds and silhouette occupancy by row;
- estimated trunk axis and base anchor;
- dominant palette samples;
- processing algorithm version and source asset ID.

The profile is an analysis record, not a claim that hidden 3D topology has been reconstructed.

## Variation model

The first variation pass intentionally makes conservative image-space changes:
- deterministic horizontal width/lean variation around the estimated trunk axis;
- source-preserving pixel sampling (nearest-neighbour);
- seasonal palette mapping for green, autumn, and winter looks;
- unchanged root/base anchor and transparent background.

These are derived sprite variants, not independent biological reconstructions. New branch topology, separate trunk/canopy layers, growth-stage reconstruction, and true structural regeneration require a later segmentation/editor milestone and visual validation against multiple references.

## Acceptance criteria

- Background removal is limited to connected pixels matching corner background colors; interior dark pixels must not be globally erased.
- Output is tightly cropped, transparent PNG with no ground, grass, rocks, or scene background added.
- Same reference, settings, and seed produce identical output.
- Nearest-neighbour sampling preserves hard pixel edges.
- Original reference remains unchanged and is saved separately from generated variants.
- Metadata records the source reference, algorithm version, settings, and seed.
- The interface clearly distinguishes analyzed reference assets from generated variants.
