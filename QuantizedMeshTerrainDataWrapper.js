/**
 * set skirt height 0 to disable tile skirt for QuantizedMeshTerrainData
 * for Cesium 1.51
 */
function QuantizedMeshTerrainDataWrapper() {
    this._originQuantizedMeshTerrainDataCreateMesh = Cesium.QuantizedMeshTerrainData.prototype.createMesh;
}

QuantizedMeshTerrainDataWrapper.activate = function() {
    var when = Cesium.when;
    var defaultValue = Cesium.defaultValue;
    var defined = Cesium.defined;
    var DeveloperError = Cesium.DeveloperError;
    var IndexDatatype = Cesium.IndexDatatype;
    var TaskProcessor = Cesium.TaskProcessor;
    var TerrainEncoding = Cesium.TerrainEncoding;
    var TerrainMesh = Cesium.TerrainMesh;
    
    var createMeshTaskProcessor = new TaskProcessor('createVerticesFromQuantizedTerrainMesh');
    
    Cesium.QuantizedMeshTerrainData.prototype.createMesh = function(tilingScheme, x, y, level, exaggeration) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(tilingScheme)) {
            throw new DeveloperError('tilingScheme is required.');
        }
        if (!defined(x)) {
            throw new DeveloperError('x is required.');
        }
        if (!defined(y)) {
            throw new DeveloperError('y is required.');
        }
        if (!defined(level)) {
            throw new DeveloperError('level is required.');
        }
        //>>includeEnd('debug');
    
        var ellipsoid = tilingScheme.ellipsoid;
        var rectangle = tilingScheme.tileXYToRectangle(x, y, level);
        exaggeration = defaultValue(exaggeration, 1.0);
    
        var verticesPromise = createMeshTaskProcessor.scheduleTask({
            minimumHeight : this._minimumHeight,
            maximumHeight : this._maximumHeight,
            quantizedVertices : this._quantizedVertices,
            octEncodedNormals : this._encodedNormals,
            includeWebMercatorT : true,
            indices : this._indices,
            westIndices : this._westIndices,
            southIndices : this._southIndices,
            eastIndices : this._eastIndices,
            northIndices : this._northIndices,
            westSkirtHeight : 0,
            southSkirtHeight : 0,
            eastSkirtHeight : 0,
            northSkirtHeight : 0,
            rectangle : rectangle,
            relativeToCenter : this._boundingSphere.center,
            ellipsoid : ellipsoid,
            exaggeration : exaggeration
        });
    
        if (!defined(verticesPromise)) {
            // Postponed
            return undefined;
        }
    
        var that = this;
        return when(verticesPromise, function(result) {
            var vertexCount = that._quantizedVertices.length / 3;
            vertexCount += that._westIndices.length + that._southIndices.length + that._eastIndices.length + that._northIndices.length;
            var indicesTypedArray = IndexDatatype.createTypedArray(vertexCount, result.indices);
    
            var vertices = new Float32Array(result.vertices);
            var rtc = result.center;
            var minimumHeight = result.minimumHeight;
            var maximumHeight = result.maximumHeight;
            var boundingSphere = defaultValue(result.boundingSphere, that._boundingSphere);
            var obb = defaultValue(result.orientedBoundingBox, that._orientedBoundingBox);
            var occlusionPoint = that._horizonOcclusionPoint;
            var stride = result.vertexStride;
            var terrainEncoding = TerrainEncoding.clone(result.encoding);
    
            that._skirtIndex = result.skirtIndex;
            that._vertexCountWithoutSkirts = that._quantizedVertices.length / 3;
    
            that._mesh = new TerrainMesh(
                    rtc,
                    vertices,
                    indicesTypedArray,
                    minimumHeight,
                    maximumHeight,
                    boundingSphere,
                    occlusionPoint,
                    stride,
                    obb,
                    terrainEncoding,
                    exaggeration,
                    result.westIndicesSouthToNorth,
                    result.southIndicesEastToWest,
                    result.eastIndicesNorthToSouth,
                    result.northIndicesWestToEast);
    
            // Free memory received from server after mesh is created.
            that._quantizedVertices = undefined;
            that._encodedNormals = undefined;
            that._indices = undefined;
    
            that._uValues = undefined;
            that._vValues = undefined;
            that._heightValues = undefined;
    
            that._westIndices = undefined;
            that._southIndices = undefined;
            that._eastIndices = undefined;
            that._northIndices = undefined;
    
            return that._mesh;
        });
    };
}

QuantizedMeshTerrainDataWrapper.prototype.deactivate = function() {
    Cesium.QuantizedMeshTerrainData.prototype.createMesh = this._originQuantizedMeshTerrainDataCreateMesh;
}
