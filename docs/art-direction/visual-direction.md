# PixelForge Visual Direction

**Status:** Initial art-direction baseline  
**Version:** 0.1  
**Scope:** Environment scenes, world assets, lighting, and color grading

## Visual target

PixelForge targets detailed, readable fantasy-game pixel art with a cohesive painted-pixel finish. The intended result should resemble a real in-game environment, not a cinematic concept-art illustration and not an image that merely imitates pixel art.

The user's manually color-graded night-town screenshot supplied during the visual-direction discussion is the current reference for nighttime exposure and lighting. It is the authority for the qualitative rules below. The reference image has not yet been added to the repository.

## Nighttime color and lighting

Night scenes must read as genuinely dark.

- Keep the overall exposure low. Do not lift the entire scene to reveal every object.
- Let most unlit areas fall into deep, cool shadows: near-black navy, indigo, and restrained blue-violet.
- Keep ambient blue light subtle. Avoid a bright, evenly visible blue wash across the street, buildings, foliage, and rooftops.
- Use warm amber and orange primarily at actual light sources: lanterns, windows, braziers, and fires.
- Keep each light source local. Its illumination should fall off naturally with distance; do not spread a broad yellow/orange overlay across the whole environment.
- Preserve a small readable amount of form and texture in shadow. Darkness should conceal detail without turning every shadow into a flat black silhouette.
- Avoid artificial shadow lifting, excessive fill light, bright moonlight, or global glow unless a scene explicitly calls for it.
- Highlights should be selective. The brightest values belong to the light source and the surfaces directly receiving its light.

## Color grading principles

The target grade is defined by contrast and distribution of light, not by simply applying a dark filter.

- Maintain a strong separation between cool, mostly unlit environment and warm, locally illuminated surfaces.
- Keep midtones restrained and avoid raising their brightness across the entire image.
- Keep warm highlights concentrated around lamps and windows.
- Keep cool shadows deep and subdued rather than saturated and luminous.
- Avoid clipping large areas into bright orange or pure black. Retain material texture where the light allows it to be seen.
- The scene should feel quiet, nocturnal, and atmospheric rather than brightly readable.

## Environment presentation

- Build coherent, functional spaces. Streets, alleys, courtyards, doorways, carts, crates, barrels, vegetation, and architectural details must have a plausible relationship to the location.
- Do not add props merely to fill empty space. Every fence, banner, sign, cart, container, and decoration needs a believable placement and purpose.
- Keep roads and walkable areas visually continuous and unobstructed unless an intentional obstacle is part of the scene.
- Maintain consistent perspective, scale, contact with the ground, and object construction.
- Avoid disconnected or floating objects, malformed architecture, duplicated structural elements, and visual tangles.
- Darkness is part of the composition. Do not add unnecessary objects or brighten the scene just to occupy or expose empty areas.

## Pixel-art rendering quality

- Use fine, controlled pixel clusters and deliberate edges. Do not exaggerate pixel size into coarse, blocky 8-bit styling.
- Preserve readable silhouettes and material-specific texture.
- Avoid noisy, randomly scattered detail, excessive micro-highlights, soft painterly blur, and generic AI-like texture patterns.
- Use coherent clusters, consistent edge treatment, and intentional texture rhythms across assets.
- Keep the visual density and rendering treatment consistent between terrain, architecture, vegetation, props, and characters.

## Characters and equipment

When characters are present, anatomy and equipment must be unambiguous and physically coherent.

- A character holding two daggers must have exactly two hands and exactly one dagger in each hand.
- Do not duplicate weapons, limbs, fingers, or equipment.
- Keep character scale, ground contact, perspective, and lighting consistent with the environment.
- Character silhouettes must remain readable without overpowering the location.

## Scene composition

- Environment-only scenes are valid and should not receive an automatically added protagonist, NPC, combat effect, or HUD.
- Do not add a game interface, captions, labels, minimaps, or action bars unless explicitly requested.
- For a requested town scene, prioritize town architecture and street layout rather than replacing it with a forest clearing or generic fantasy ruin.
- Respect the requested time of day. A night scene should not be lit like dusk or a moonlit daytime scene.

## Practical review checklist

Before accepting a generated or authored scene, check:

1. Does it read as night at first glance?
2. Are most unlit areas genuinely dark?
3. Are warm highlights restricted to plausible light sources and nearby surfaces?
4. Does illumination fall off instead of washing the whole scene?
5. Are shadow details restrained but still structurally readable?
6. Are perspective, scale, ground contact, and architecture coherent?
7. Does every prominent prop belong in that location?
8. Is the pixel detail controlled rather than coarse, noisy, or blur-like?
9. Are there any duplicated, malformed, or physically impossible objects?
10. Does the scene follow the user's processed night-town reference rather than the brighter ungraded generation?

## Relationship to asset generation

This visual direction is a presentation and quality baseline for PixelForge assets and assembled scenes. It does not require every asset to contain nighttime lighting baked into its pixels.

Where practical, keep reusable assets neutral enough to be placed in different lighting conditions. Scene-level lighting and color grading should be applied consistently by the renderer or a deterministic processing stage, rather than independently inventing a different lighting style for each asset.

Generator adapters may expose style controls, but their output must be reviewed against this shared direction. An upstream generator's default palette or pixel scale is not automatically the PixelForge standard.
