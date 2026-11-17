# Generator adapters

This workspace normalizes output from external procedural generators into PixelForge sprite assets.

## PPAE tree adapter

The first adapter targets the public `NatureGenerator.generateTreeStage` API from [PPAE Engine](https://github.com/Mairon31/ppae-engine).

PPAE currently exposes a TypeScript API and returns a native RGBA pixel buffer with a ground pivot. The adapter copies that buffer into a PixelForge-owned `Uint8ClampedArray`, validates its dimensions and pivot, and records the species, lifecycle stage, profile, seed, and source versions.

The adapter uses structural TypeScript interfaces rather than importing PPAE directly. This keeps the workspace buildable before PPAE publishes its package and avoids coupling PixelForge's asset contract to an alpha dependency.

### Integration

Build PPAE from its source repository and pass a `NatureGenerator` instance plus the selected profile to `generatePpaeTree`:

```ts
import { DEFAULT_STYLE_PROFILES, NatureGenerator } from "@pixelproject/ppae";
import { generatePpaeTree } from "@pixelforge/generators";

const sprite = generatePpaeTree(
  new NatureGenerator(),
  {
    species: "oak",
    stage: "mature",
    profileId: "detailed-32x32",
    profile: DEFAULT_STYLE_PROFILES["detailed-32x32"],
    seed: 12345
  },
  {
    sourceVersion: "0.2.0-alpha.1",
    generatorVersion: "0.1.0"
  }
);
```

PPAE is distributed under Apache-2.0. When bundling or redistributing PPAE code, retain its license and required notices. This adapter does not vendor or redistribute PPAE source.

## Current scope

- Tree generation only.
- No PPAE dependency is installed in the PixelForge workspace yet.
- Visual suitability, performance, and generated output still require a real browser preview and seed comparison.
- The adapter is an integration boundary, not a decision that PPAE's visual style is approved for production.
