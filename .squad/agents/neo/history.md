# Project Context

- **Owner:** Bert Temme
- **Project:** 3dtilesrenderer-styling-plugin — styling plugin for 3DTilesRendererJS implementing Cesium 3D Tiles Styling Specification
- **Stack:** JavaScript (ES modules), Three.js, GLSL, MapLibre GL JS, 3DTilesRendererJS, npm
- **Key files:** src/CesiumStylingPlugin.js, package.json
- **3D Tiles data:** sample/sibbe/ — BAG buildings in Limburg (Sibbe area), generated with pg2b3dm with height attribute
- **tileset.json:** Uses implicit tiling (QUADTREE), pg2b3dm 2.27.0, 3 content GLB files
- **Created:** 2026-03-27

## Learnings

### 2026-03-27: Created CesiumStylingPlugin

**Plugin Pattern:**
- 3DTilesRendererJS uses an event-based plugin system
- Plugins must have `init(tiles)`, `dispose()`, and `name` property
- Listen to `load-model` event to process tiles as they load
- No lifecycle hooks or render loops needed - purely reactive

**Structural Metadata Access:**
- GLTFStructuralMetadataExtension attaches metadata to `scene.userData.structuralMetadata`
- May need to traverse up the scene tree to find the root with metadata
- Property tables expose properties as `propertyTable.properties[propertyName][featureIndex]`
- Alternative: `propertyTable.getProperty(featureIndex, propertyName)` method if available
- Wrote robust helper that tries both access patterns

**Vertex Coloring Approach:**
- Each vertex has `_FEATURE_ID_0` attribute mapping to feature index
- Read feature properties from property table using feature ID
- Evaluate Cesium color conditions (parsed with regex + safe Function constructor)
- Create Float32Array for vertex colors (r,g,b per vertex)
- Set `geometry.setAttribute('color', ...)` and `material.vertexColors = true`
- Must clone material before modifying to avoid affecting other meshes

**Expression Evaluation:**
- Cesium syntax: `${feature['propertyName']}` or `${propertyName}`
- Convert to JS by replacing tokens with actual values (JSON.stringify for strings)
- Normalize operators: `==` → `===`, `!=` → `!==`
- Use Function constructor (safer than eval) with "use strict"
- Handle "true" literal as always-matching condition

**Color Parsing:**
- Support `color('#RRGGBB')`, `color('#RRGGBB', alpha)`, `rgb(r,g,b)`, `rgba(r,g,b,a)`
- Use regex patterns to extract color components
- Map to THREE.Color (0-1 range, not 0-255)

<!-- Append new learnings below. -->
