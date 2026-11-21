# Reference-based Tree Generator

> **Status: superseded.** This document describes the earlier image-space variation prototype. It is retained as historical context only and is not the product requirement for the learned generator.
>
> The active requirements are in [Reference-Learned Asset Generator](./reference-learned-generator.md).

## Historical prototype

The original milestone loaded a user-provided image, removed a connected corner background, cropped the foreground, measured silhouette bounds and dominant colors, then produced conservative derived variants by changing source pixels.

That prototype was useful for validating browser-side image ingestion, background cleanup, component selection, transparency, and IndexedDB export. It did not learn an art style and did not synthesize independent assets.

## Explicit limitation

Image-space deformation, source-pixel sampling, recoloring, and pixel rearrangement are not acceptable generation methods for the learned generator. They may remain available only as clearly labeled image-editing utilities, separate from learned synthesis.

## Migration

The reference ingestion and asset-library portions may be reused after review. The current procedural reconstruction and source-pixel variation paths must not be presented as the learned generator or treated as satisfying its acceptance criteria.
