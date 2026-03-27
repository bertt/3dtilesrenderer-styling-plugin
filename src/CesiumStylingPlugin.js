import * as THREE from 'three';

/**
 * Plugin for 3DTilesRendererJS that implements Cesium 3D Tiles Styling Specification.
 * Applies color conditions to mesh features based on property values from EXT_structural_metadata.
 *
 * @example
 * const plugin = new CesiumStylingPlugin({
 *   style: {
 *     color: {
 *       conditions: [
 *         ["${feature['height']} <= 5", "color('#1a1a2e')"],
 *         ["${feature['height']} <= 10", "color('#16213e')"],
 *         ["true", "color('#ffffff')"]
 *       ]
 *     }
 *   }
 * });
 * tilesRenderer.registerPlugin(plugin);
 */
export class CesiumStylingPlugin {
  /**
   * @param {Object} options - Plugin configuration
   * @param {Object} options.style - Cesium 3D Tiles style object
   * @param {Object} [options.style.color] - Color styling configuration
   * @param {Array<Array<string>>} [options.style.color.conditions] - Array of [condition, colorExpression] pairs
   * @param {string} [options.style.show] - Show condition (not implemented in v1)
   */
  constructor(options = {}) {
    this.name = 'CesiumStylingPlugin';
    this.tiles = null;
    this.style = options.style || {};
    this.needsUpdate = false;
    this._onLoadModel = this._onLoadModel.bind(this);
  }

  /**
   * Initialize the plugin with a TilesRenderer instance.
   * @param {TilesRenderer} tiles - The 3DTilesRenderer instance
   */
  init(tiles) {
    this.tiles = tiles;
    tiles.addEventListener('load-model', this._onLoadModel);
  }

  /**
   * Dispose of the plugin and clean up resources.
   */
  dispose() {
    if (this.tiles) {
      this.tiles.removeEventListener('load-model', this._onLoadModel);
      this.tiles = null;
    }
  }

  /**
   * Handle the load-model event from TilesRenderer.
   * @private
   * @param {Object} event - Event object containing the loaded scene and tile
   */
  _onLoadModel(event) {
    const { scene, tile } = event;
    
    if (!scene || !this.style.color || !this.style.color.conditions) {
      return;
    }

    const structuralMetadata = this._findStructuralMetadata(scene);
    
    scene.traverse((object) => {
      if (object.isMesh) {
        this._applyStylesToMesh(object, structuralMetadata);
      }
    });
  }

  /**
   * Find structural metadata in the scene hierarchy.
   * @private
   * @param {THREE.Object3D} scene - The loaded scene
   * @returns {Object|null} The structural metadata object or null
   */
  _findStructuralMetadata(scene) {
    if (scene.userData && scene.userData.structuralMetadata) {
      return scene.userData.structuralMetadata;
    }

    let current = scene;
    while (current) {
      if (current.userData && current.userData.structuralMetadata) {
        return current.userData.structuralMetadata;
      }
      current = current.parent;
    }

    return null;
  }

  /**
   * Apply color styling to a mesh based on feature properties.
   * @private
   * @param {THREE.Mesh} mesh - The mesh to style
   * @param {Object|null} structuralMetadata - The structural metadata object
   */
  _applyStylesToMesh(mesh, structuralMetadata) {
    const geometry = mesh.geometry;
    
    if (!geometry.attributes._FEATURE_ID_0) {
      return;
    }

    if (!structuralMetadata || !structuralMetadata.propertyTables || 
        structuralMetadata.propertyTables.length === 0) {
      return;
    }

    const featureIdAttribute = geometry.attributes._FEATURE_ID_0;
    const propertyTable = structuralMetadata.propertyTables[0];
    const vertexCount = featureIdAttribute.count;

    const colors = new Float32Array(vertexCount * 3);

    for (let i = 0; i < vertexCount; i++) {
      const featureId = featureIdAttribute.getX(i);
      const color = this._getColorForFeature(featureId, propertyTable);
      
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    if (mesh.material) {
      mesh.material = mesh.material.clone();
      mesh.material.vertexColors = true;
      mesh.material.needsUpdate = true;
    }
  }

  /**
   * Get the color for a specific feature based on style conditions.
   * @private
   * @param {number} featureId - The feature index
   * @param {Object} propertyTable - The property table from structural metadata
   * @returns {THREE.Color} The color for this feature
   */
  _getColorForFeature(featureId, propertyTable) {
    const conditions = this.style.color.conditions;

    const feature = this._getFeatureProperties(featureId, propertyTable);

    for (let i = 0; i < conditions.length; i++) {
      const [conditionExpr, colorExpr] = conditions[i];
      
      if (this._evaluateCondition(conditionExpr, feature)) {
        return this._parseColor(colorExpr);
      }
    }

    return new THREE.Color(0xffffff);
  }

  /**
   * Get all properties for a feature from the property table.
   * @private
   * @param {number} featureId - The feature index
   * @param {Object} propertyTable - The property table
   * @returns {Object} Object containing feature properties
   */
  _getFeatureProperties(featureId, propertyTable) {
    const feature = {};

    if (propertyTable.getProperty && typeof propertyTable.getProperty === 'function') {
      const propertyNames = Object.keys(propertyTable.properties || {});
      for (const propName of propertyNames) {
        try {
          feature[propName] = propertyTable.getProperty(featureId, propName);
        } catch (e) {
          feature[propName] = undefined;
        }
      }
    } else if (propertyTable.properties) {
      for (const [propName, propArray] of Object.entries(propertyTable.properties)) {
        if (propArray && propArray[featureId] !== undefined) {
          feature[propName] = propArray[featureId];
        }
      }
    }

    return feature;
  }

  /**
   * Evaluate a Cesium style condition expression.
   * @private
   * @param {string} expression - The condition expression
   * @param {Object} feature - The feature properties object
   * @returns {boolean} True if the condition matches
   */
  _evaluateCondition(expression, feature) {
    if (expression === 'true' || expression === '"true"') {
      return true;
    }

    if (expression === 'false' || expression === '"false"') {
      return false;
    }

    try {
      const jsExpression = this._convertCesiumExpression(expression, feature);
      return Function('"use strict"; return (' + jsExpression + ')')();
    } catch (e) {
      console.warn('Failed to evaluate condition:', expression, e);
      return false;
    }
  }

  /**
   * Convert Cesium style expression to JavaScript expression.
   * @private
   * @param {string} expression - The Cesium expression
   * @param {Object} feature - The feature properties object
   * @returns {string} JavaScript expression
   */
  _convertCesiumExpression(expression, feature) {
    let jsExpr = expression;

    jsExpr = jsExpr.replace(/\$\{feature\['([^']+)'\]\}/g, (match, propName) => {
      const value = feature[propName];
      if (typeof value === 'string') {
        return JSON.stringify(value);
      }
      return value !== undefined ? value : 'undefined';
    });

    jsExpr = jsExpr.replace(/\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (match, propName) => {
      const value = feature[propName];
      if (typeof value === 'string') {
        return JSON.stringify(value);
      }
      return value !== undefined ? value : 'undefined';
    });

    // Normalize == to === and != to !== without corrupting existing === and !==
    // Process from longest operator to shortest to avoid partial matches
    jsExpr = jsExpr.replace(/([^=!<>])===([^=])/g, '$1===$2');  // keep === as-is
    jsExpr = jsExpr.replace(/([^=!<>])==([^=])/g, '$1===$2');   // upgrade == to ===
    jsExpr = jsExpr.replace(/!==([^=])/g, '!==$1');             // keep !== as-is
    jsExpr = jsExpr.replace(/!=([^=])/g, '!==$1');              // upgrade != to !==

    return jsExpr;
  }

  /**
   * Parse a Cesium color expression to a THREE.Color.
   * @private
   * @param {string} expression - The color expression
   * @returns {THREE.Color} The parsed color
   */
  _parseColor(expression) {
    expression = expression.trim();

    const colorHexMatch = expression.match(/color\s*\(\s*['"]#([0-9a-fA-F]{6})['"]\s*(?:,\s*([0-9.]+)\s*)?\)/);
    if (colorHexMatch) {
      const color = new THREE.Color(`#${colorHexMatch[1]}`);
      return color;
    }

    const rgbMatch = expression.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
    if (rgbMatch) {
      return new THREE.Color(
        parseInt(rgbMatch[1]) / 255,
        parseInt(rgbMatch[2]) / 255,
        parseInt(rgbMatch[3]) / 255
      );
    }

    const rgbaMatch = expression.match(/rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)/);
    if (rgbaMatch) {
      return new THREE.Color(
        parseInt(rgbaMatch[1]) / 255,
        parseInt(rgbaMatch[2]) / 255,
        parseInt(rgbaMatch[3]) / 255
      );
    }

    const hexMatch = expression.match(/^#([0-9a-fA-F]{6})$/);
    if (hexMatch) {
      return new THREE.Color(expression);
    }

    console.warn('Failed to parse color expression:', expression);
    return new THREE.Color(0xffffff);
  }
}
