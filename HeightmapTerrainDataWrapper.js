/**
 * set skirt height 0 to disable tile skirt for QuantizedMeshTerrainData
 * for Cesium 1.51
 */
function HeightmapTerrainDataWrapper(){
    this._originHeightmapTerrainDataCreateMesh = Cesium.HeightmapTerrainData.prototype.createMesh;
}

HeightmapTerrainDataWrapper.activate=function(){
    var when=Cesium.when,
        BoundingSphere=Cesium.BoundingSphere,
        Cartesian3=Cesium.Cartesian3,
        defaultValue=Cesium.defaultValue,
        defined=Cesium.defined,
        defineProperties=Cesium.defineProperties,
        DeveloperError=Cesium.DeveloperError,
        GeographicProjection=Cesium.GeographicProjection,
        HeightmapEncoding=Cesium.HeightmapEncoding,
        HeightmapTessellator=Cesium.HeightmapTessellator,
        OrientedBoundingBox=Cesium.OrientedBoundingBox,
        CesiumMath=Cesium.Math,
        Rectangle=Cesium.Rectangle,
        TaskProcessor=Cesium.TaskProcessor,
        TerrainEncoding=Cesium.TerrainEncoding,
        TerrainMesh=Cesium.TerrainMesh,
        TerrainProvider=Cesium.TerrainProvider
    ;

    var taskProcessor = new TaskProcessor('createVerticesFromHeightmap');

    /**
     * Creates a {@link TerrainMesh} from this terrain data.
     *
     * @private
     *
     * @param {TilingScheme} tilingScheme The tiling scheme to which this tile belongs.
     * @param {Number} x The X coordinate of the tile for which to create the terrain data.
     * @param {Number} y The Y coordinate of the tile for which to create the terrain data.
     * @param {Number} level The level of the tile for which to create the terrain data.
     * @param {Number} [exaggeration=1.0] The scale used to exaggerate the terrain.
     * @returns {Promise.<TerrainMesh>|undefined} A promise for the terrain mesh, or undefined if too many
     *          asynchronous mesh creations are already in progress and the operation should
     *          be retried later.
     */
    Cesium.HeightmapTerrainData.prototype.createMesh = function(tilingScheme, x, y, level, exaggeration) {
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
        var nativeRectangle = tilingScheme.tileXYToNativeRectangle(x, y, level);
        var rectangle = tilingScheme.tileXYToRectangle(x, y, level);
        exaggeration = defaultValue(exaggeration, 1.0);

        // Compute the center of the tile for RTC rendering.
        var center = ellipsoid.cartographicToCartesian(Rectangle.center(rectangle));

        var structure = this._structure;

        var levelZeroMaxError = TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap(ellipsoid, this._width, tilingScheme.getNumberOfXTilesAtLevel(0));
        var thisLevelMaxError = levelZeroMaxError / (1 << level);
        this._skirtHeight = Math.min(thisLevelMaxError * 4.0, 1000.0);

        var verticesPromise = taskProcessor.scheduleTask({
            heightmap : this._buffer,
            structure : structure,
            includeWebMercatorT : true,
            width : this._width,
            height : this._height,
            nativeRectangle : nativeRectangle,
            rectangle : rectangle,
            relativeToCenter : center,
            ellipsoid : ellipsoid,
            //skirtHeight : this._skirtHeight,
            skirtHeight : 0,
            isGeographic : tilingScheme.projection instanceof GeographicProjection,
            exaggeration : exaggeration,
            encoding : this._encoding
        });

        if (!defined(verticesPromise)) {
            // Postponed
            return undefined;
        }

        var that = this;
        return when(verticesPromise, function(result) {
            // Clone complex result objects because the transfer from the web worker
            // has stripped them down to JSON-style objects.
            that._mesh = new TerrainMesh(
                center,
                new Float32Array(result.vertices),
                TerrainProvider.getRegularGridIndices(result.gridWidth, result.gridHeight),
                result.minimumHeight,
                result.maximumHeight,
                BoundingSphere.clone(result.boundingSphere3D),
                Cartesian3.clone(result.occludeePointInScaledSpace),
                result.numberOfAttributes,
                OrientedBoundingBox.clone(result.orientedBoundingBox),
                TerrainEncoding.clone(result.encoding),
                exaggeration,
                result.westIndicesSouthToNorth,
                result.southIndicesEastToWest,
                result.eastIndicesNorthToSouth,
                result.northIndicesWestToEast);

            // Free memory received from server after mesh is created.
            that._buffer = undefined;
            return that._mesh;
        });
    };


};

HeightmapTerrainDataWrapper.prototype.deactivate = function() {
    Cesium.HeightmapTerrainData.prototype.createMesh = this._originHeightmapTerrainDataCreateMesh;
};

