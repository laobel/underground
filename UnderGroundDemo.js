import GlobeSurfaceTileProviderWrapper from './GlobeSurfaceTileProviderWrapper'
import QuantizedMeshTerrainDataWrapper from './QuantizedMeshTerrainDataWrapper'

class UnderGroundDemo {
    constructor(viewer) {
        this._viewer = viewer;
    }

    activate() {
        GlobeSurfaceTileProviderWrapper.activate159();
        QuantizedMeshTerrainDataWrapper.activate();

        var viewer = this._viewer;
        viewer.scene.globe.baseColor = new Cesium.Color(0, 0, 0, 0);
        viewer.scene._hdr = false;
        if (viewer.imageryLayers) {
            for (var i = 0; i < viewer.imageryLayers.length; i++) {
                viewer.imageryLayers.get(i).alpha = 0.8;
            }
        }
        var blueBox = viewer.entities.add({
            name: 'Blue box',
            position: Cesium.Cartesian3.fromDegrees(-114.0, 40.0, 5),
            box: {
                dimensions: new Cesium.Cartesian3(400000.0, 300000.0, 500000.0),
                material: Cesium.Color.BLUE
            }
        });
    }
}

export default UnderGroundDemo;