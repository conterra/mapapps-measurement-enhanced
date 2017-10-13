/*
 * Copyright (C) 2017 con terra GmbH (info@conterra.de)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
define([
    "dojo/_base/declare", "./MeasurementEnhancedUI", "esri/tasks/GeometryService", "esri/units"
], function (declare, MeasurementEnhancedUI, GeometryService, units, undefined) {
    return declare([], /** @lends measurement.MeasurementFactory.prototype*/{
        // injected
        _esriMap: undefined,
        _geometryService: undefined,
        /**
         * Factory for the measurement tools provided by esri.dijit.Measurement.
         * @constructs
         */
        constructor: function () {
        },
        createInstance: function () {
            var i18n = this._i18n.get(),
                map = this._esriMap,
                props = this._properties || {},
                // deprecated property
                geometryServiceURL = props.geometryServiceURL;

            var geometryService = this._geometryService;
            if (geometryServiceURL && (!geometryService || geometryService.url !== geometryServiceURL)) {
                // replace geometry service only if urls are different
                geometryService = new GeometryService(geometryServiceURL);
            }
            return new MeasurementEnhancedUI({
                map: map,
                i18n: i18n,
                _geometryService: geometryService,
                _mapState: this._mapState,
                _mapModel: this._mapModel,
                _coordinateTransformer: this._coordinateTransformer,
                defaultLengthUnit: units[props.defaultLengthUnit],
                defaultAreaUnit: units[props.defaultAreaUnit],
                defaultLocationUnit: units[props.defaultLocationUnit],
                finishWithButton: props.finishWithButton,
                showTools: props.showTools || [],
                defaultTool: props.defaultTool,
                skipAreaUnits: props.skipAreaUnits,
                skipLengthUnits: props.skipLengthUnits,
                skipLocationUnits: props.skipLocationUnits,
                skipAngleUnits: props.skipAngleUnits,
                _symbolTable: props._symbolTable,
                resultTextSymbol: props.resultTextSymbol,
                areaTextSymbol: props.areaTextSymbol,
                distanceLinesegmentTextSymbol: props.distanceLinesegmentTextSymbol,
                _esriMapReference: this._esriMapReference
            });
        }
    });
});