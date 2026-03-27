# Project Context

- **Owner:** Bert Temme
- **Project:** 3dtilesrenderer-styling-plugin — styling plugin for 3DTilesRendererJS implementing Cesium 3D Tiles Styling Specification
- **Stack:** JavaScript (ES modules), Three.js, GLSL, MapLibre GL JS, 3DTilesRendererJS, npm
- **npm package name:** @bertt/3dtilesrenderer-styling-plugin (https://www.npmjs.com/package/@bertt/3dtilesrenderer-styling-plugin)
- **Blog style:** https://bertt.wordpress.com/ — English, no emoticons, businesslike, to the point
- **Created:** 2026-03-27

## Learnings

### Documentation delivery (2026-03-27)

**Documentation decisions:**
- README: Structured with architecture diagram (Mermaid flowchart), prerequisites, full working example, style syntax reference table, and publishing notes
- BLOG: Written for geospatial professionals, uses two Mermaid diagrams to explain data flow, includes honest "what's not supported in V1" section
- Style choice: Mermaid `flowchart LR` for README (technical), Mermaid sequence for BLOG (narrative)
- Table format for quick reference of supported vs unsupported Cesium spec features

**Blog style notes:**
- No emoticons, no hype ("exciting", "innovative")
- Direct explanation of what the plugin does and what it enables
- Assumed audience: geospatial/GIS developers familiar with 3D Tiles concepts but not Cesium specifics
- Avoided jargon where possible; explained EXT_mesh_features and EXT_structural_metadata in plain terms
- Emphasized client-side rendering as a key benefit (no server processing)
- Concrete example (Sibbe, Limburg) to ground abstract concepts
- Conclusion focuses on capability and freedom, not marketing angle
