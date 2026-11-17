# PPAE tree generator integration

PixelForge vendors the tree morphology and rasterization modules from PPAE Engine and exposes them through the `@pixelforge/ppae/tree` workspace package.

## Generator controls

The Asset Studio tree generator supports the upstream species catalog, lifecycle stages, native style profiles, environmental states, and unsigned 32-bit seeds. Generation is deterministic for identical inputs.

Generated output contains an RGBA pixel buffer, dimensions, and a ground pivot. The Asset Studio converts the buffer to PNG and stores it with the original generator ID, version, seed, upstream repository, and license in IndexedDB.

## Upstream source

- Repository: https://github.com/Mairon31/ppae-engine
- Upstream revision: `ed98da220d9ac30e35b23da555d60f5a0ec84a51`
- Upstream version: `0.2.0-alpha.1`
- License: Apache-2.0
- Vendored source: `packages/ppae/vendor/ppae`
- Attribution and license: `packages/ppae/NOTICE.md` and `packages/ppae/vendor/ppae/LICENSE`

The integration keeps upstream generation code isolated from PixelForge's asset manifest and storage contracts. This allows the generator to be replaced or upgraded without changing the asset library format.

## Current limitations

- Generation currently runs synchronously on the browser main thread; move it to a Web Worker before large batch generation.
- Only tree generation is exposed by this adapter.
- Pixel style suitability for PixelForge's target art direction still requires visual review across species, seeds, and profiles.
- Tests and CI validate reproducibility and integration; they do not replace visual art-direction review.
