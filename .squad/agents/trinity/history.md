# Project Context

- **Owner:** Bert Temme
- **Project:** 3dtilesrenderer-styling-plugin — styling plugin for 3DTilesRendererJS implementing Cesium 3D Tiles Styling Specification
- **Stack:** JavaScript (ES modules), Three.js, GLSL, MapLibre GL JS, 3DTilesRendererJS, npm
- **Sample:** sample/sibbe/ — MapLibre GL viewer with BAG buildings in Limburg (Sibbe area)
- **3D Tiles:** implicit tiling QUADTREE, GLB content with height and identificatie attributes
- **Viewer:** MapLibre GL + 3DTilesRendererJS, Maptiler terrain, OpenFreeMap vector tiles
- **Created:** 2026-03-27

## Learnings

### Height-Based Color Styling Integration (2026-03-27)

**How the plugin was wired in:**
- Added `import { CesiumStylingPlugin } from '../../src/CesiumStylingPlugin.js'` directly (relative path, no importmap entry needed)
- Registered after `ImplicitTilingPlugin` and `GLTFExtensionsPlugin` in `initTiles()`
- `THREE` is passed as a constructor option (`{ THREE, style: {...} }`) to avoid the duplicate three.js module warning that occurs when the plugin independently imports three

**Color scheme applied (Sibbe BAG buildings):**
- `#9ecae1` — light blue, ≤ 6 m (single-storey / low buildings)
- `#4292c6` — medium blue, ≤ 9 m (2-storey residential)
- `#f7f7f7` — near-white, ≤ 12 m (3-storey buildings)
- `#ef3b2c` — red-orange, ≤ 18 m (4-storey / taller residential)
- `#99000d` — deep red, > 18 m (tall buildings / commercial)

**Height breakpoints:** 6 m, 9 m, 12 m, 18 m — selected for Dutch BAG building typology in Sibbe.

**Legend panel added:** Absolute-positioned top-right `#legend` div with color swatches; CSS uses `.legend-row` / `.legend-swatch` classes.

**Existing functionality preserved:** Click-to-inspect (meshFeatures / structuralMetadata), yellow selection highlight shader, DRACOLoader/KTX2Loader setup — all untouched.



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
