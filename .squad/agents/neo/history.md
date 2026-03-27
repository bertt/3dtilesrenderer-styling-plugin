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

### 2026-03-28: Rewrote CesiumStylingPlugin for 3d-tiles-renderer@0.4.23

**Correct Metadata API (0.4.23):**
- `scene.userData.structuralMetadata` does NOT exist at scene level in 0.4.23
- Metadata is attached to each **mesh** via `mesh.userData.meshFeatures` and `mesh.userData.structuralMetadata`
- Retrieve property table index: `meshFeatures.getFeatureInfo()[0]?.propertyTable`
- Retrieve all properties for a feature: `structuralMetadata.getPropertyTableData(tableIndex, featureId)`
- Returns a plain object like `{ identificatie: '0503100000017823', height: 7.2 }`
- Feature ID vertex attribute is **lowercase** in 0.4.23: `_feature_id_0` (with `_FEATURE_ID_0` as fallback)

**THREE Injection Pattern:**
- Do NOT do `import * as THREE from 'three'` at module level — causes "Multiple instances of Three.js" warning
- Accept `THREE` as constructor option: `new CesiumStylingPlugin({ THREE, style })`
- Fallback: `async _getThree()` does a dynamic `import('three')` if not supplied
- Store as `this._THREE` and use throughout the class

**Color Lookup Table Optimization:**
- Do NOT call `getPropertyTableData` once per vertex (N vertices × M features = wasteful)
- Instead: collect unique feature IDs in a `Set`, call metadata once per unique ID, store in a `Map`
- Then per-vertex loop just reads from the `Map` — O(unique features) metadata calls instead of O(vertices)

**applyToTiles() Method:**
- Traverses `this.tiles.group` and re-applies `_styleMesh` to all meshes
- Used for runtime style updates after changing `plugin.style`

<!-- Append new learnings below. -->
