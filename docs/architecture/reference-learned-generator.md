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

### 4. Runtime generation

The browser runtime loads a trained, versioned model artifact. It receives semantic controls and a seed, then samples a new latent representation and decodes it to RGBA.

Runtime constraints:
- no network access is required after the model artifact is installed;
- no reference sprite is loaded or sampled during generation;
- same model version, prompt/conditioning, and seed produce deterministic output where the selected runtime supports deterministic kernels;
- unsupported deterministic kernels must be documented and tested for repeatability bounds;
- model loading and inference run off the UI thread where supported;
- the renderer exports transparent PNG with a ground pivot and provenance metadata.

The model artifact is imported into the local model library. PixelForge must show model version, training dataset version, supported labels, license, file size, and runtime compatibility.

## Training and device constraints

Training and inference are separate capabilities.

The product must not claim that a browser on a typical Android phone can efficiently train a high-quality generative image model from scratch. Training may require a capable GPU and a dedicated training environment. LoRA reduces the number of trainable parameters and adapter size, but it does not remove the need to load the base model or make training practical on an ordinary Android phone. PixelForge's core editor and inference workflow remain local-first and must not depend on a paid service.

The training pipeline must be reproducible and open-source. It should support exporting portable model weights for browser inference. A free external notebook or another user's machine may be used as an optional training environment, but no hosted service is a required product dependency.

Before choosing the model implementation, run a feasibility benchmark with a small, legally usable pilot dataset. The initial Stable Diffusion 1.5 LoRA baseline uses the CreativeML OpenRAIL-M checkpoint; the model license must be reviewed and its restrictions preserved wherever weights or derivatives are redistributed. Do not place base-model weights in the PixelForge repository. Record:
- number and diversity of training images;
- training hardware and time;
- model parameter count and artifact size;
- validation reconstruction and novel-sample grids;
- inference latency and peak memory on Android-class hardware;
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

### Gate D — device proof
The exported model runs within measured memory and latency budgets on supported devices, including Android browser targets where feasible.

No gate may be marked complete based solely on TypeScript checks, unit tests, or successful model loading.

## Explicitly out of scope

- Claiming machine learning when the implementation is a hand-authored procedural grammar.
- Using an image-generation API or paid inference endpoint at runtime.
- Shipping reference sprites as hidden runtime textures for generation.
- Treating a single uploaded tree as enough data to learn a complete art style.
- Claiming production readiness without held-out samples and human visual review.
