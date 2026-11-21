# Reference-Learned Asset Generator

## Product requirement

PixelForge must learn visual structure and rendering characteristics from a curated set of artist-approved reference images, then synthesize new assets from the learned model.

Reference images are training data only. They are not runtime texture sources. Generation must not:
- warp, recolor, crop, mirror, rearrange, or otherwise transform a selected source sprite into the output;
- paste source-image patches or sample source pixels into generated assets;
- use nearest-neighbour source-pixel lookup as a generation method;
- present a procedural drawing template with a few reference-derived dimensions and colors as a learned generator.

The output is a newly synthesized image sampled from model weights and generation controls. The original dataset remains unchanged and is only read by the training pipeline.

## Separation of responsibilities

### 1. Dataset

A dataset is a collection of licensed, artist-approved source images with metadata:
- asset category and subtype (for the first experiment: tree species);
- growth stage and state (young, mature, ancient, autumn, winter, leafless);
- transparent foreground mask and normalized ground pivot;
- source attribution, license, author, and provenance;
- optional species and visual annotations.

The importer validates dimensions, alpha, color mode, duplicate files, and metadata. It must not silently treat a whole sprite sheet as one sample. Individual samples are segmented or manually selected and reviewed before entering a training set.

Dataset splits are made by source asset, not by augmented copies, so near-identical variants cannot leak between training and validation.

### 2. Preprocessing

Preprocessing creates normalized training tensors while retaining the original files:
- preserve RGBA and a separate alpha mask;
- normalize canvas and pivot without stretching the subject;
- preserve hard pixel edges and native palette relationships;
- remove only confirmed background pixels;
- record every transform in a reproducible manifest.

Augmentation is conservative and configurable. It must not introduce anti-aliasing, blur, arbitrary hue shifts, or geometric distortions that change species identity or the reference art direction.

### 3. Training

Training consumes only the curated dataset and produces versioned model weights plus a training manifest. The initial research candidate is a compact latent image model:
- an encoder/decoder learns a compact representation of sprite structure and pixel clusters;
- a conditional latent generator learns to sample new representations;
- conditioning labels control category/species, growth stage, and seasonal state;
- alpha/mask prediction is handled explicitly so output remains a transparent sprite.

The first practical baseline to benchmark is Stable Diffusion 1.5 with a LoRA adapter, trained through Hugging Face Diffusers. Its 512px generation path is a smaller starting point than SDXL, and Diffusers documents LoRA training for both SD 1.5 and SDXL. This is a candidate, not a final model decision: compare it against SDXL LoRA and a compact sprite-native model on the same held-out dataset. Evaluate pixel-cluster quality, silhouette control, diversity, memorization, model size, training cost, and inference latency before selecting a production path. The base checkpoint and every adapter must have recorded licenses and comply with their redistribution and use terms.

A model is not considered trained merely because it has been initialized, fitted to a single image, or can reconstruct training examples. Validation must demonstrate plausible unseen samples and meaningful diversity.

### 4. Generation and asset import

The first release does not require an AI model to run inside the browser. PixelForge remains a usable editor and asset library without a model, API key, subscription, or always-on server.

A learned model is an optional, separately versioned asset-generation tool. When a compatible model has been trained in an available environment, it may generate a batch of new transparent PNGs. The user imports those outputs into PixelForge for review, cleanup, pivot assignment, tagging, and library use. Generation must never silently call a paid endpoint.

If a future model can run locally in a browser or on Android, it may be added as an optional backend only after a real device benchmark. It must load model weights explicitly, never load reference sprites at generation time, and keep inference off the UI thread where supported. No claim of Android compatibility is made before testing.

Every imported model or generated batch records its model/version, dataset version where known, license, generation settings, and provenance. PixelForge must remain fully functional when no model is installed.

## Training and device constraints

Training and generation are optional capabilities; the core product must not depend on either being available.

The initial target workflow assumes an Android phone, no desktop computer, no paid API, and no paid cloud GPU. Therefore:
- do not require local training or local model storage on the phone;
- do not require a permanent inference server or API key;
- do not make a paid hosted endpoint part of the application;
- keep dataset preparation, project editing, and generated-PNG import usable on Android;
- treat free GPU notebooks as an optional, best-effort batch-training route only when their free quota and terms permit it.

Free notebook sessions can be time-limited, unavailable, or changed by their providers. They are not a dependable runtime dependency. A training run must be resumable where the environment supports checkpoints, and outputs must be downloadable/exportable back to the phone. If no free GPU session is available, the learned-model milestone pauses; PixelForge must not disguise hand-authored procedural output as learned generation.

The training pipeline must be reproducible and open-source. Model weights are not bundled into the web app or repository by default. A future on-device inference backend is a separate research milestone, not a prerequisite for the editor or asset library.

Before choosing the model implementation, first establish that a free training environment is actually available and can complete a small pilot. The initial Stable Diffusion 1.5 LoRA baseline is only a candidate; its checkpoint license and restrictions must be reviewed before use or redistribution. Do not place base-model weights in the PixelForge repository. Record:
- number and diversity of training images;
- training hardware and time;
- model parameter count and artifact size;
- validation reconstruction and novel-sample grids;
- export size and whether the resulting PNG batch can be transferred to an Android phone;
- inference latency and peak memory only if an on-device backend is separately tested;
- visual review against the approved pixel-art direction.

If the available dataset or hardware cannot support the target quality, report that limitation and propose a dataset/training plan. Do not silently fall back to source-image transformations or hand-authored procedural trees.

## First vertical slice: trees

The first learned generator is limited to trees. It must be evaluated on multiple distinct species and visual forms, not only one reference image.

Required checks:
1. Training, validation, and test sets contain separate source assets.
2. Generated samples do not contain copied source regions or source-image pixel reuse.
3. Generated samples are not memorized duplicates of training assets.
4. Species and growth-stage conditioning are reflected in silhouette and structure, not only palette.
5. Seasonal conditioning changes the learned foliage/material appearance without destroying the underlying species identity.
6. Transparent background, complete silhouette, and consistent pivot are preserved.
7. Multiple seeds produce structurally distinct, plausible outputs.
8. A human visual review approves detail density, pixel clusters, palette, shading, and silhouette before the generator is considered usable.

## Acceptance gates

### Gate A — dataset readiness
A documented, licensed dataset exists with reviewed samples, labels, provenance, and leakage-safe splits.

### Gate B — learning proof
The trained model produces novel samples from learned weights. A test demonstrates that generation runs without loading source images.

### Gate C — quality proof
Held-out and novel samples pass the visual review and diversity checks. Reconstructing or recoloring training sprites is not sufficient.

### Gate D — workflow proof
A generated batch can be exported from the optional training environment and imported into PixelForge on Android. On-device model inference is a later optional gate, not a requirement for the core app.

No gate may be marked complete based solely on TypeScript checks, unit tests, or successful model loading.

## Explicitly out of scope

- Claiming machine learning when the implementation is a hand-authored procedural grammar.
- Using an image-generation API or paid inference endpoint at runtime.
- Shipping reference sprites as hidden runtime textures for generation.
- Treating a single uploaded tree as enough data to learn a complete art style.
- Claiming production readiness without held-out samples and human visual review.
