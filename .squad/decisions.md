# Squad Decisions

## Active Decisions

### Vertex Color Approach for Per-Feature Styling (Neo, 2026-03-27)

**Status:** Implemented

Apply vertex colors to mesh geometry, with one color per vertex based on the vertex's feature ID.

**Rationale:**
- Works with standard Three.js materials (no custom shaders needed for V1)
- Efficient - single geometry draw call, no splitting meshes
- Compatible with all material types (MeshStandardMaterial, MeshBasicMaterial, etc.)
- Leverages existing `_FEATURE_ID_0` attribute from EXT_mesh_features
- Simple to implement: read feature properties → evaluate conditions → set vertex colors

**Trade-offs:**
- Pro: No shader modifications needed
- Pro: Works with existing materials
- Pro: Single draw call per mesh
- Con: Color interpolation at feature boundaries (could be addressed with flat shading in future)
- Con: Cannot style individual features with patterns/textures (vertex colors only)

---

### Expression Evaluator Using Regex + Safe Function Constructor (Neo, 2026-03-27)

**Status:** Implemented

Parse Cesium expressions with regex token replacement, then evaluate using Function constructor.

**Rationale:**
- Regex replacement converts `${feature['propertyName']}` to actual values
- Function constructor is safer than eval (runs in own scope, strict mode)
- No external parser dependencies (keeps bundle small, CDN-friendly)
- Handles all required operators and boolean logic
- String values are JSON.stringify'd to prevent injection

**Trade-offs:**
- Pro: Zero dependencies
- Pro: Handles full JavaScript operator set
- Pro: Safe execution context
- Con: Uses Function constructor (blocked in strict CSP environments)
- Con: No syntax validation before runtime
- Future: Could add CSP-safe mode with allowlist of operators

---

### Package.json Structure and Peer Dependencies (Neo, 2026-03-27)

**Status:** Implemented

Use `peerDependencies` for three and 3d-tiles-renderer (not dependencies). Set `type: "module"` for ES module package. Expose both `main` and `module` pointing to `src/index.js`. Include only `src/` in npm package files. Use scoped package name `@bertt/3dtilesrenderer-styling-plugin`.

**Rationale:**
- peerDependencies avoid version conflicts and duplicate installs
- Users control their three.js and 3d-tiles-renderer versions
- ES module native, no transpilation needed
- Works in Node.js (with --experimental-modules) and browsers
- Small package size (only source, no node_modules)
- Scoped name prevents npm namespace collisions

**Trade-offs:**
- Pro: No dependency bloat
- Pro: Works with any compatible three.js version
- Pro: CDN-friendly (esm.sh resolves peers automatically)
- Con: Users must manually install peer deps
- Con: No version bundling (user responsible for compatibility)

---

### Color Gradient for Sibbe Sample (Trinity, 2026-03-27)

**Status:** Implemented

Dark navy to vivid rose gradient based on building height:
- 0-5m: Deep navy `#1a1a2e` (single-story buildings)
- 5-10m: Dark blue `#16213e` (2-story residential)
- 10-15m: Medium blue `#0f3460` (3-story buildings)
- 15-20m: Purple `#533483` (4-story buildings)
- >20m: Vivid rose `#e94560` (tall buildings)
- Fallback: White `#ffffff`

**Rationale:**
- High contrast progression ensures immediate visual hierarchy
- Dark base colors (navy/blue) complement map labels without competition
- Vivid rose provides strong visual pop for tallest structures
- Gradient aligns with typical Dutch building typology in the Sibbe area

---

### CDN Strategy: importmap + esm.sh (Trinity, 2026-03-27)

**Status:** Implemented

Use importmap + esm.sh for all dependencies. Local plugin imported via relative path `../../src/CesiumStylingPlugin.js`.

**Rationale:**
- No bundler required: runs directly in browser with native ES modules
- esm.sh provides versioned, production-ready ESM builds
- Importmap enables clean import statements matching npm package syntax
- MapLibre imported from esm.sh instead of UMD for consistency
- DRACO decoder from Google CDN (stable versioned path)

---

### Documentation Scope for V1 (Mouse, 2026-03-27)

**Status:** Implemented

Document in README.md and BLOG.md: architecture, installation, usage, API, sample instructions, publishing. Defer to V2: advanced error handling, performance tuning, API TypeScript types, troubleshooting, integration examples beyond sample.

Intentionally mark as unsupported: show, defines, math functions (clamp, min, max), regex, string comparisons, ternary operators, pointSize, meta.

**Rationale:**
- V1 focuses on core use cases (per-feature color styling)
- Documentation maintenance plan established
- Clear expectations about feature support
- Future versions can add advanced features without breaking existing docs

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
