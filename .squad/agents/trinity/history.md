# Project Context

- **Owner:** Bert Temme
- **Project:** 3dtilesrenderer-styling-plugin — styling plugin for 3DTilesRendererJS implementing Cesium 3D Tiles Styling Specification
- **Stack:** JavaScript (ES modules), Three.js, GLSL, MapLibre GL JS, 3DTilesRendererJS, npm
- **Sample:** sample/sibbe/ — MapLibre GL viewer with BAG buildings in Limburg (Sibbe area)
- **3D Tiles:** implicit tiling QUADTREE, GLB content with height and identificatie attributes
- **Viewer:** MapLibre GL + 3DTilesRendererJS, Maptiler terrain, OpenFreeMap vector tiles
- **Created:** 2026-03-27

## Learnings

<!-- Append new learnings below. -->

### MapLibre + Three.js + 3DTilesRenderer Integration (2026-03-27)

**Integration Pattern:**
- MapLibre custom layer with `renderingMode: '3d'` enables Three.js rendering on the map canvas
- Camera sync achieved via `camera.projectionMatrix.fromArray(matrix)` from MapLibre's render matrix
- TilesRenderer requires three critical GLTF extensions: GLTFMeshFeaturesExtension, GLTFStructuralMetadataExtension, GLTFCesiumRTCExtension
- Plugin registration must happen after GLTF loader setup but before scene addition
- Update loop pattern: `tiles.setCamera()` → `tiles.setResolutionFromRenderer()` → `tiles.update()` → `renderer.render()` → `map.triggerRepaint()`

**Color Gradient Design:**
- Chose dark-to-light progression: deep navy (#1a1a2e) → dark blue (#16213e) → medium blue (#0f3460) → purple (#533483) → vivid rose (#e94560)
- Reasoning: High contrast makes building heights immediately readable; dark base colors don't compete with map labels; vivid rose highlights tall structures
- Height thresholds at 5m, 10m, 15m, 20m based on typical Dutch building typology (single-story, 2-story, 3-story, 4-story, tall)

**CDN Import Strategy:**
- Used importmap with esm.sh for all npm packages (three@0.177.0, 3d-tiles-renderer@0.4.2)
- Local relative import for CesiumStylingPlugin: `../../src/CesiumStylingPlugin.js`
- MapLibre imported as ES module from esm.sh instead of UMD bundle
- DRACO decoder loaded from Google's CDN (versioned path for stability)

**Challenges:**
- Avoided bundler requirement: importmap + esm.sh enables native ES module imports in browser
- Three.js addons path handling: used `three/addons/` with trailing slash in importmap
- 3DTilesRenderer subpath imports: multiple entries needed for `/three` and `/plugins` subpaths
