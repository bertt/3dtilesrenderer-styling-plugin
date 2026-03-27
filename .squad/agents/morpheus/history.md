# Project Context

- **Owner:** Bert Temme
- **Project:** 3dtilesrenderer-styling-plugin — styling plugin for 3DTilesRendererJS implementing Cesium 3D Tiles Styling Specification
- **Stack:** JavaScript (ES modules), Three.js, GLSL, MapLibre GL JS, 3DTilesRendererJS, npm
- **Created:** 2026-03-27

## Session 1 (2026-03-27): Plugin Architecture & Initial Implementation

### Key Architecture Decisions

1. **Styling Implementation:** Vertex Color Approach
   - Apply colors per vertex based on feature ID (`_FEATURE_ID_0` attribute)
   - Leverages EXT_mesh_features and EXT_structural_metadata
   - No custom shaders required for V1 (works with standard Three.js materials)
   - Efficient: single geometry draw call per mesh
   - Trade-off: color interpolation at feature boundaries (future: flat shading)

2. **Expression Evaluation:** Regex + Function Constructor
   - Parse Cesium 3D Tiles Styling expressions: `${feature['height']} <= 10`
   - Regex replaces tokens with actual values, then evaluates with Function constructor
   - Safe execution in strict mode, no external dependencies
   - Trade-off: blocked in strict CSP environments (future: CSP-safe allowlist mode)

3. **Package Architecture:** Peer Dependencies Model
   - Scoped package: `@bertt/3dtilesrenderer-styling-plugin`
   - Peer dependencies: three (>=0.150.0), 3d-tiles-renderer (>=0.3.0)
   - ES module native, zero bundled dependencies
   - CDN-friendly (esm.sh can resolve peer deps)
   - Trade-off: users must install peer deps (prevents version conflicts)

4. **Sample Design:** CDN + Modern Frontend
   - importmap + esm.sh for all dependencies
   - No bundler required (native ES modules in browser)
   - MapLibre GL JS + Three.js + 3DTilesRendererJS
   - Sibbe, Limburg use case: BAG buildings colored by height

5. **Documentation Strategy:** V1 Core Focus
   - README: practical developer guide (installation, API, examples)
   - BLOG: technical deep-dive for blog.wordpress.com
   - Intentionally limit scope: mark unsupported features (show, defines, math functions)
   - Defer advanced topics to V2

### Team Decisions

- **Neo** (Plugin Dev): Architecture lead — vertex colors, expression evaluator, package config
- **Trinity** (Frontend): Sample lead — MapLibre viewer, color gradient, CDN strategy
- **Mouse** (Tech Writer): Documentation lead — README/BLOG content, scope definition

### Outcome

- ✅ Working plugin with live sample
- ✅ Complete npm-ready package
- ✅ Production documentation
- ✅ Clear architectural foundation for V2 features

## Learnings

- Vertex colors + EXT_mesh_features enables efficient per-feature styling without custom shaders
- Function constructor + regex is practical alternative to full expression parser (lighter bundle)
- Peer dependencies pattern works well for plugins targeting npm ecosystem
- importmap + esm.sh provides excellent DX for no-build-tool samples
- V1 scope discipline: document what's NOT supported to manage expectations

