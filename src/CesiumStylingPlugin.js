/**
 * Plugin for 3DTilesRendererJS that implements Cesium 3D Tiles Styling Specification.
 * Compatible with 3d-tiles-renderer@0.4.23 using the meshFeatures / structuralMetadata
 * API on mesh.userData (set by GLTFExtensionsPlugin).
 *
 * Pass your THREE instance via the constructor to avoid duplicate-module warnings:
 *
 * @example
 * import * as THREE from 'three';
 * tiles.registerPlugin(new CesiumStylingPlugin({
 *   THREE,
 *   style: {
 *     color: {
 *       conditions: [
 *         ["${feature['height']} <= 6",  "color('#9ecae1')"],
 *         ["${feature['height']} <= 12", "color('#4292c6')"],
 *         ["true",                        "color('#084594')"]
 *       ]
 *     }
 *   }
 * }));
 */
export class CesiumStylingPlugin {
  /**
   * @param {Object}  options
   * @param {Object}  options.style       - Cesium 3D Tiles style object
   * @param {Object}  [options.THREE]     - THREE namespace (avoids duplicate-module warning)
   */
  constructor(options = {}) {
    this.name = 'CesiumStylingPlugin';
    this.tiles = null;
    this.style = options.style || {};
    this._THREE = options.THREE || null;
    this._onLoadModel = this._onLoadModel.bind(this);
  }

  // ── Plugin lifecycle ──────────────────────────────────────────────────────

  init(tiles) {
    this.tiles = tiles;
    tiles.addEventListener('load-model', this._onLoadModel);
  }

  dispose() {
    if (this.tiles) {
      this.tiles.removeEventListener('load-model', this._onLoadModel);
      this.tiles = null;
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Re-apply the current style to all already-loaded tiles.
   * Call after changing `plugin.style`.
   */
  applyToTiles() {
    if (!this.tiles) return;
    this.tiles.group.traverse((object) => {
      if (object.isMesh) {
        this._styleMesh(object);
      }
    });
  }

  // ── THREE lazy-loader ─────────────────────────────────────────────────────

  async _getThree() {
    if (this._THREE) return this._THREE;
    this._THREE = await import('three');
    return this._THREE;
  }

  // ── Event handler ─────────────────────────────────────────────────────────

  async _onLoadModel(event) {
    const { scene } = event;
    if (!scene || !this.style?.color?.conditions) return;

    await this._getThree();

    scene.traverse((object) => {
      if (object.isMesh) {
        this._styleMesh(object);
      }
    });
  }

  // ── Core styling logic ────────────────────────────────────────────────────

  _styleMesh(mesh) {
    const THREE = this._THREE;
    if (!THREE) return;

    const { meshFeatures, structuralMetadata } = mesh.userData ?? {};
    if (!meshFeatures || !structuralMetadata) return;

    const geometry = mesh.geometry;
    const featureIdAttr =
      geometry.attributes['_feature_id_0'] ||
      geometry.attributes['_FEATURE_ID_0'];
    if (!featureIdAttr) return;

    const featureInfo = meshFeatures.getFeatureInfo();
    const tableIndex = featureInfo[0]?.propertyTable;
    if (tableIndex == null) return;

    // Build a per-unique-featureId color lookup (one metadata call per unique ID)
    const uniqueIds = new Set();
    for (let i = 0; i < featureIdAttr.count; i++) {
      uniqueIds.add(Math.round(featureIdAttr.getX(i)));
    }

    const colorLookup = new Map();
    for (const featureId of uniqueIds) {
      const props = structuralMetadata.getPropertyTableData(tableIndex, featureId);
      colorLookup.set(featureId, this._resolveColor(props));
    }

    // Assign vertex colors from the lookup table
    const vertexCount = featureIdAttr.count;
    const colors = new Float32Array(vertexCount * 3);
    for (let i = 0; i < vertexCount; i++) {
      const id = Math.round(featureIdAttr.getX(i));
      const c = colorLookup.get(id);
      colors[i * 3]     = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    if (mesh.material) {
      mesh.material = mesh.material.clone();
      mesh.material.vertexColors = true;
      mesh.material.needsUpdate = true;
    }
  }

  // ── Condition evaluator ───────────────────────────────────────────────────

  /**
   * Evaluate style conditions against feature properties and return a THREE.Color.
   * @param {Object|null} props - Result of structuralMetadata.getPropertyTableData()
   * @returns {THREE.Color}
   */
  _resolveColor(props) {
    const THREE = this._THREE;
    const conditions = this.style?.color?.conditions;
    if (!conditions) return new THREE.Color(0xffffff);

    for (const [conditionExpr, colorExpr] of conditions) {
      if (this._evaluateCondition(conditionExpr, props)) {
        return this._parseColor(colorExpr);
      }
    }

    return new THREE.Color(0xffffff);
  }

  _evaluateCondition(expression, props) {
    if (expression === 'true' || expression === '"true"') return true;
    if (expression === 'false' || expression === '"false"') return false;

    try {
      const jsExpr = this._substituteProperties(expression, props);
      return Function('"use strict"; return (' + jsExpr + ')')();
    } catch (e) {
      console.warn('[CesiumStylingPlugin] Failed to evaluate condition:', expression, e);
      return false;
    }
  }

  /**
   * Replace `${feature['prop']}` / `${prop}` tokens with actual values from props.
   * Numeric values that are null/undefined are treated as 0 for comparisons.
   */
  _substituteProperties(expression, props) {
    const substitute = (propName) => {
      const value = props?.[propName];
      if (value === null || value === undefined) return '0';
      if (typeof value === 'string') return JSON.stringify(value);
      return String(value);
    };

    let jsExpr = expression;
    jsExpr = jsExpr.replace(/\$\{feature\['([^']+)'\]\}/g, (_, p) => substitute(p));
    jsExpr = jsExpr.replace(/\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (_, p) => substitute(p));

    // Normalize == → === and != → !== without corrupting existing triple-char operators
    jsExpr = jsExpr.replace(/([^=!<>])={2}([^=])/g, '$1===$2');
    jsExpr = jsExpr.replace(/([^=!<>])!{1}={1}([^=])/g, '$1!==$2');

    return jsExpr;
  }

  // ── Color parser ──────────────────────────────────────────────────────────

  _parseColor(expression) {
    const THREE = this._THREE;
    expression = expression.trim();

    // color('#RRGGBB') or color('#RRGGBB', alpha)
    const hexMatch = expression.match(/color\s*\(\s*['"]#([0-9a-fA-F]{6})['"]\s*(?:,\s*[0-9.]+\s*)?\)/);
    if (hexMatch) return new THREE.Color(`#${hexMatch[1]}`);

    // rgb(r, g, b)
    const rgbMatch = expression.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
    if (rgbMatch) {
      return new THREE.Color(
        parseInt(rgbMatch[1]) / 255,
        parseInt(rgbMatch[2]) / 255,
        parseInt(rgbMatch[3]) / 255
      );
    }

    // rgba(r, g, b, a) — alpha ignored for vertex colors
    const rgbaMatch = expression.match(/^rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*[0-9.]+\s*\)$/);
    if (rgbaMatch) {
      return new THREE.Color(
        parseInt(rgbaMatch[1]) / 255,
        parseInt(rgbaMatch[2]) / 255,
        parseInt(rgbaMatch[3]) / 255
      );
    }

    // bare #RRGGBB
    if (/^#[0-9a-fA-F]{6}$/.test(expression)) return new THREE.Color(expression);

    console.warn('[CesiumStylingPlugin] Unknown color expression:', expression);
    return new THREE.Color(0xffffff);
  }
}
