# Biological Tree Generation Model

## Purpose

PixelForge tree generation must preserve species identity before rasterization. A seed may vary an individual within a species, but it must not turn a pine into a baobab-shaped tree. Species identity is expressed through structural constraints, not only palette or a randomly selected silhouette preset.

The current PPAE integration provides useful building blocks (species definitions, morphology archetypes, a structural skeleton, foliage masses, and pixel rasterizers). Its current skeleton builder still uses a largely shared branching procedure: primary branches alternate left/right, branch reach is sampled from broad canvas-relative ranges, and secondary branches use a common rule. This is insufficient to guarantee distinct botanical growth forms.

## Generation pipeline

The target pipeline is:

1. **Species profile** — immutable, versioned botanical constraints and visual traits.
2. **Growth model** — stage-dependent trunk, leader, branch, and crown development.
3. **Branching grammar** — deterministic topology and placement rules specific to the species.
4. **Canopy model** — species-specific foliage placement, shape, density, and layering.
5. **Pixel rasterization** — convert the validated structural model into pixel clusters and material shading.
6. **Biological validation** — measure the generated structure against the selected species profile; reject or deterministically repair invalid structures before rasterization.

Randomness is allowed only inside the ranges permitted by the selected species profile. The species profile and stage are hard constraints; seed is a source of individual variation.

## First supported species

The first milestone deliberately supports three species deeply rather than exposing a large catalogue with weak differentiation.

### Oak

- Broad, spreading crown; mature crown is generally wider than it is tall.
- Strong trunk with a visible transition into major scaffold branches.
- Major branches spread in multiple directions and divide into smaller branches.
- Rounded, connected foliage masses distributed around branch ends; foliage should read as a broad crown, not isolated dots.
- Individual variation may alter asymmetry, branch curvature, crown fullness, and trunk irregularity without losing the broad oak silhouette.

### Pine

- One dominant, mostly upright central leader.
- Crown is conical: widest in the lower/middle crown and progressively narrower toward the apex.
- Branches form recognizable whorls or tiers around the leader; tier spacing and branch lengths are constrained by height.
- Foliage is attached to branch tiers and forms needle-like / clustered masses, not a single round broadleaf canopy.
- The apex remains visible and narrow. A mature pine must not resolve into a baobab-like swollen trunk with a broad umbrella crown.

### Birch

- Slender, mostly upright trunk with relatively small diameter compared with total height.
- Crown is light and airy, with fine branches and separated foliage clusters.
- Branches generally angle upward or outward; the crown should not become a heavy, dense dome.
- Bark material is pale with characteristic dark horizontal marks; bark treatment is separate from the geometry model.
- Individual variation may affect lean, branch spacing, and crown openness while preserving a slender silhouette.

## Growth stages

The same species grammar must be evaluated at each supported lifecycle stage. Stage changes scale and topology intentionally; it must not replace the species grammar.

- Sapling / young: fewer branch orders and a smaller crown, but the pine leader, oak scaffold pattern, or birch slenderness remains recognizable.
- Mature: full species-specific structure.
- Ancient: larger and more irregular, while retaining species identity.
- Damaged / dead: foliage loss and exposed deadwood are state changes layered over the species skeleton, not a different species.

The first implementation milestone should validate sapling, mature, and ancient for oak, pine, and birch. Other stages can use existing PPAE behavior until their rules are explicitly covered.

## Structural rules and measurements

The validator should inspect the structural descriptor before rasterization. Initial measurements:

- trunk slenderness: trunk base width relative to total height;
- crown aspect ratio: crown width relative to crown height;
- leader continuity: presence and vertical continuity of the dominant pine axis;
- pine tier profile: branch groups by height and decreasing reach toward the apex;
- oak scaffold spread: primary branch coverage on both sides and multiple crown quadrants;
- birch openness: spacing between foliage masses and visible gaps through the crown;
- canopy-to-trunk ratio;
- branch order counts and attachment validity;
- all generated geometry remains inside the fitted canvas and connected to the trunk/root structure.

Thresholds must be calibrated from generated samples and reference silhouettes. Do not invent precision thresholds before inspecting the actual distributions. Validation results should expose measurements and actionable failure codes, not only a boolean.

## Determinism and variation

- Same species + stage + profile + seed + model version must produce byte-identical output.
- Different seeds should vary individual structure while remaining inside the species envelope.
- Model version must be included in generation metadata and cache keys when the grammar changes.
- Invalid species/archetype combinations must fail explicitly; do not silently fall back to a random archetype.

## Implementation sequence

1. Add explicit species growth profiles for oak, pine, and birch, with typed branch and canopy constraints.
2. Replace the shared primary/secondary branch placement with species-specific grammar strategies while preserving PPAE's rasterizer contracts.
3. Make canopy generation follow branch topology and species-specific distribution.
4. Add structural metrics and validation tests for identity preservation, determinism, seed variation, connectivity, and bounds.
5. Add UI controls for species-appropriate form variants only after the underlying rules are enforced.
6. Tune pixel cluster rendering against approved visual references; geometry quality and pixel-art quality are separate acceptance gates.

## Acceptance criteria for the first milestone

- Oak, pine, and birch are distinguishable in silhouette when rendered as flat monochrome masks.
- A mature pine consistently has a dominant upright leader and tiered, narrowing crown; it cannot pass validation with a broad baobab-like canopy.
- A mature oak consistently has a broad spreading crown and scaffold branches.
- A mature birch consistently has a slender trunk and airy crown.
- Seed variation changes individuals without violating species constraints.
- Sapling, mature, and ancient stages preserve the species' defining structure.
- Generation is deterministic and does not regress existing PNG export, pivot, or asset-library integration.
- Tests run in CI; no claim of local execution is made unless actually run.

## Non-goals for this milestone

- Supporting every botanical species in the initial pass.
- Using image-generation models to draw trees.
- Replacing the PPAE pixel rasterizers before evaluating whether they can render the improved structural output.
- Claiming botanical accuracy beyond the explicitly modeled traits and tested constraints.
