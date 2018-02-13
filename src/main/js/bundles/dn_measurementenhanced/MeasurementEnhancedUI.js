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
        "require",
        "dojo/_base/declare",
        "dojo/_base/connect",
        "dojo/_base/array",
        "dojo/dom-style",
        "dojo/dom-class",
        "ct/mapping/edit/SymbolTableLookupStrategy",
        "ct/mapping/edit/GraphicsRenderer",
        "esri/geometry/mathUtils",
        "esri/geometry/Point",
        "esri/geometry/Polyline",
        "esri/dijit/Measurement",
        "dijit/form/Button",
        "dijit/form/DropDownButton",
        "measurement/MeasurementUI",
        "dijit/DropDownMenu",
        "dijit/MenuItem",
        "dojo/text!./templates/MeasurementEnhancedUI.html",
        "esri/SpatialReference",
        "ct/mapping/geometry",
        "esri/symbols/TextSymbol",
        "esri/geometry/screenUtils",
        "esri/geometry/ScreenPoint",
        "dijit/form/CheckBox",
        "esri/graphic",
        "dojo/number"
    ],
    function (require, declare, connect, d_array, domStyle, domClass, SymbolTableLookupStrategy, GraphicsRenderer, MathUtils,
              Point, Polyline, esri_Measurement, Button, DropDownButton, Measurement, DropDownMenu, MenuItem, templateString,
              SpatialReference, geometry, TextSymbol, screenUtils, ScreenPoint, Checkbox, Graphic, d_number) {

        return declare([Measurement],
            {
                coordinates: [],

                constructor: function () {
                    this._conterra = {
                        _inputPoints: [],
                        _previousResult: 0,
                        _measureResultTextGraphics: [],
                        _measureEndAfterUnitChange: false
                    };
                    this.templateString = templateString;
                },

                startup: function () {
                    this.setupGraphicsNode();
                    var started = this._started;
                    esri_Measurement.prototype.startup.apply(this);
                    //Measurement does not call this.inherited(arguments) !
                    if (this.defaultTool) {
                        switch (this.defaultTool) {
                            case "angle":
                            case "distance":
                            case "location":
                            case "area":
                                this.setTool(this.defaultTool, true);
                            default:
                                return;
                        }
                    }
                    this._started = true;
                    if (!started) {
                        this._buttonDijits["angle"] = this._angleButton;
                        var toolIds = ["area", "distance", "location", "angle"];
                        d_array.forEach(toolIds, this.hideTool, this);
                        d_array.forEach(this.showTools || toolIds, this.showTool, this);
                        if (this._activateOnStartup) {
                            delete this._activateOnStartup;
                            this.activateMeasurement();
                        }
                    }
                },

                setTool: function (toolID, active) {
                    this._removeMeasureTextGraphics();
                    this._renderer.clear();

                    switch (toolID) {
                        case "angle": {
                            if (this.activeTool === "angle") { // user wants to untoggle all tools
                                this.activeTool = "";
                                this.deactivateMeasurement2();
                            } else {
                                this._resetToolState();
                                this.activeTool = toolID;
                                domClass.add(this._unitDropDown.domNode, "dijitHidden");
                                this._angleButton.setChecked(true);
                                this._areaButton.setChecked(false);
                                this._distanceButton.setChecked(false);
                                this._locationButton.setChecked(false);
                                this.measureAngle();
                            }
                            break;
                        }
                        default: {
                            if (this.activeTool === "angle") { //deactivate angle meas. because other tool was clicked
                                this.deactivateMeasurement2();
                            }
                            else if (this.activeTool === null) {
                                domClass.remove(this._unitDropDown.domNode, "dijitHidden");
                            }
                            this.inherited(arguments);
                            if (this.activeTool !== null) {
                                this.activeTool = toolID;
                            } else {
                                this.activeTool = null;
                            }
                        }
                    }
                },

                measureAngle: function () {
                    this._createAngleUnitList();

                    //Wait for map clicks
                    this._clickMapHandler = connect.connect(this._map, "onClick", this, "_measureAngleMouseClickHandler");
                },

                setupGraphicsNode: function () {
                    var symbolTable = this._symbolTable || {
                        "point": {
                            "url": require.toUrl("esri/dijit/images/flag.png"),
                            "width": 24, // Although the icon's actual size is 27x30 we have to specify smaller dimensions here to force the icon to display at the correct size. The unit is not px but pt.
                            "height": 24,
                            "xoffset": 9,
                            "yoffset": 11,
                            "type": "esriPMS"
                        },
                        "polyline": {
                            "color": [0, 128, 255, 255],
                            "width": 3,
                            "type": "esriSLS",
                            "style": "esriSLSSolid"
                        },
                        "polygon": {
                            "color": [0, 128, 255, 255],
                            "width": 3,
                            "type": "esriSLS",
                            "style": "esriSLSSolid"
                        }
                    };
                    var mapModel = this._mapModel;
                    var renderer = this._renderer = GraphicsRenderer.createForGraphicsNode("angleMeasurementGraphicNode", mapModel);
                    renderer.set({
                        symbolLookupStrategy: new SymbolTableLookupStrategy({
                            lookupByGeometryType: true,
                            lookupTable: symbolTable
                        })
                    });
                    if (renderer.get("hasNodeCreated")) {
                        mapModel.fireModelStructureChanged({
                            source: this
                        });
                    }
                },

                angleToggleButton: function () {
                    this.clearResult();
//                    this._toggleStaticLocationTable(false, true);
                    // hide the resultTable that can be displayed by the location measurement tool
                    domStyle.set(this.resultTable.domNode, "display", "none");
                    domStyle.set(this.resultValueContainer.domNode, "display", "block");
                    domStyle.set(this.greenPinDiv, "visibility", "hidden");
                    var active = this._angleButton.checked;
                    this.setTool("angle", active);
                },

                _createAngleUnitList: function () {
                    if (!this.angleUnitDropDown) {
                        this._filterUnits(this.skipAngleUnits);
                        var that = this;
                        var widgetI18n = this.i18n.widget;

                        var menu = new DropDownMenu({style: "display: none;"});
                        var menuItem1 = new MenuItem({
                            label: widgetI18n.defaultAngleUnit.DEGREES,
                            onClick: function () {
                                that.angleUnitDropDown.setLabel(widgetI18n.defaultAngleUnit.DEGREES);
                            }
                        });
                        menu.addChild(menuItem1);

                        var menuItem2 = new MenuItem({
                            label: widgetI18n.defaultAngleUnit.GON,
                            onClick: function () {
                                that.angleUnitDropDown.setLabel(widgetI18n.defaultAngleUnit.GON);
                            }
                        });
                        menu.addChild(menuItem2);

                        this.angleUnitDropDown = new DropDownButton({
                            id: "angleUnits",
                            name: "angleUnits",
                            dropDown: menu,
                            label: widgetI18n.defaultAngleUnit.DEGREES
                        });
                        this.angleUnitDropDown.placeAt(this._unitDropDownAngle).startup();
                        connect.connect(this.angleUnitDropDown.dropDown, "onItemClick", that, that._changeUnit);
                    } else {
                        domClass.remove(this._unitDropDownAngle, "dijitHidden");
                    }
                    domClass.remove(this._azimuthNode, "dijitHidden");
                },

                /**
                 * This method recognizes angle unit changes only
                 */
                _changeUnit: function (e) {
                    var unitLabel = e.label;
                    if (this._angleButton_meas) {
                        var alpha;
                        if (unitLabel === this.i18n.widget.defaultAngleUnit.DEGREES) {
                            alpha = this._angleButton_meas;
                        } else if (unitLabel === this.i18n.widget.defaultAngleUnit.GON) {
                            alpha = this._angleButton_meas / 360 * 400;
                        }
                        this.setResult(alpha.toFixed(0).toString() + " " + unitLabel);
                        // alter the textSymbol in the map
                        var unitSign = this._getUnitShortcutForAngle(unitLabel);
                        // there can only be one result graphic when measuring angles
                        this._conterra._measureResultTextGraphics[this._conterra._measureResultTextGraphics.length - 1].symbol.text = alpha.toFixed(0).toString() + " " + unitSign;
                        this._renderer.graphicsNode.refresh();
                    }
                },

                _destroyAngleUnitList: function () {
                    this.angleUnitDropDown && this.angleUnitDropDown.destroyRecursive();
                },

                deactivateMeasurement2: function () {
                    //deactivateMeasurement()
                    this.clearResult();
                    this._angleButton_meas = 0;
                    this.coordinates = [];

                    //Reverse UI modifications
                    if (this.activeTool !== "") {
                        domClass.remove(this._unitDropDown.domNode, "dijitHidden");
                    }
                    if (this._unitDropDownAngle) {
                        domClass.add(this._unitDropDownAngle, "dijitHidden");
                    }
                    if (this._azimuthNode) {
                        domClass.add(this._azimuthNode, "dijitHidden");
                    }
                    this._angleButton && this._angleButton.setChecked(false);

                    delete this.activeTool;

                    //Reset measurement functions
                    this.hideDrawing();
                    connect.disconnect(this._clickMapHandler);
                },

                _measureAngleMouseClickHandler: function (e) {
                    var isAzumuth = this.azimuthCheckbox.get("checked");

                    //Check if there is already a finished angle drawn
                    if (this.coordinates.length === 3) {
                        this._renderer.clear();
                        this.coordinates = [];
                    }

                    //Get coordinates
                    var ref = this._mapState.getSpatialReference();

                    this.point = e.mapPoint;
                    this.coordinates.push(this.point);

                    if (this.coordinates.length === 1) {
                        this._renderer.draw({
                            geometry: this.point
                        });
                        this.setResult("");
                    }

                    if (this.coordinates.length === 2) {
                        var line = new Polyline(ref);
                        line.addPath([this.coordinates[0], this.coordinates[1]]);
                        this._renderer.draw({
                            geometry: line
                        });
                        // when azimuth angle measurement: 
                        if (isAzumuth) {
                            var coord0 = this.coordinates[0];
                            // add the northern point 
                            var pNew = geometry.createPoint(coord0.x, coord0.y + 100, ref);
                            this.coordinates.push(pNew);
                            var lengthUserLine = MathUtils.getLength(coord0, this.coordinates[1]);
                            // alter the y with the user line length
                            this.coordinates[2].y = this.coordinates[0].y + lengthUserLine;
                            // draw it
                            var line = new Polyline(ref);
                            line.addPath([this.coordinates[0], this.coordinates[2]]);

                            this._renderer.draw({
                                geometry: line
                            });
                            this._calcAngleAndShowResult(ref);
                            return;
                        }
                    }
                    if (this.coordinates.length === 3) {
                        var line = new Polyline(ref);
                        line.addPath([this.coordinates[0], this.coordinates[2]]);
                        this._renderer.draw({
                            geometry: line
                        });
                        this._calcAngleAndShowResult(ref);
                    }
                },

                _calcAngleAndShowResult: function (ref) {
                    var srs = ref.wkid;
                    var targetSrs = new SpatialReference(3857);

                    //calculate angle
                    if (srs !== targetSrs.wkid) {
                        var p1 = this._coordinateTransformer.transform(new Point(this.coordinates[0], srs), targetSrs.wkid);
                        var p2 = this._coordinateTransformer.transform(new Point(this.coordinates[1], srs), targetSrs.wkid);
                        var p3 = this._coordinateTransformer.transform(new Point(this.coordinates[2], srs), targetSrs.wkid);
                    }
                    else {
                        var p1 = this.coordinates[0];
                        var p2 = this.coordinates[1];
                        var p3 = this.coordinates[2];
                    }

                    //calculate quadrant relative to p1
                    p2.quadrant = this._getQuadrant(p2, p1);
                    p3.quadrant = this._getQuadrant(p3, p1);

                    //Konstruktion von rechtwinkligen Dreiecken aus p1 und p2 bzw p1 und p3
                    //Berechnung der Winkel an p1
                    var a = Math.atan((Math.abs(p2.y - p1.y) / Math.abs(p2.x - p1.x))) * 180 / Math.PI;
                    var b = Math.atan((Math.abs(p3.y - p1.y) / Math.abs(p3.x - p1.x))) * 180 / Math.PI;

                    var quadrantsString = [p2.quadrant, p3.quadrant].join(' ');
                    switch (quadrantsString) {
                        case '1 1':
                            this._angleButton_meas = (Math.abs(b - a));
                            if (b < a) this._angleButton_meas = (360 - this._angleButton_meas);
                            break;
                        case '2 1':
                            this._angleButton_meas = 360 - (360 - (a + b));
                            break;
                        case'3 1':
                            this._angleButton_meas = 360 - (180 + a - b);
                            break;
                        case'4 1':
                            this._angleButton_meas = 360 - (180 - (a + b));
                            break;
                        case'1 2':
                            this._angleButton_meas = 360 - (a + b);
                            break;
                        case'2 2':
                            this._angleButton_meas = (Math.abs(a - b));
                            if (a < b) this._angleButton_meas = (360 - this._angleButton_meas);
                            break;
                        case'3 2':
                            this._angleButton_meas = 360 - (360 - (180 - (a + b)));
                            break;
                        case'4 2':
                            this._angleButton_meas = 360 - (180 - a + b);
                            break;
                        case'1 3':
                            this._angleButton_meas = 360 - (180 + a - b);
                            break;
                        case'2 3':
                            this._angleButton_meas = 360 - (180 - (a + b));
                            break;
                        case'3 3':
                            this._angleButton_meas = (Math.abs(b - a));
                            if (b < a) this._angleButton_meas = (360 - this._angleButton_meas);
                            break;
                        case'4 3':
                            this._angleButton_meas = 360 - (360 - (a + b));
                            break;
                        case'1 4':
                            this._angleButton_meas = 360 - (360 - (180 - (a + b)));
                            break;
                        case'2 4':
                            this._angleButton_meas = 360 - (180 - a + b);
                            break;
                        case'3 4':
                            this._angleButton_meas = 360 - (a + b);
                            break;
                        case'4 4':
                            this._angleButton_meas = (Math.abs(a - b));
                            if (a < b) this._angleButton_meas = (360 - this._angleButton_meas);
                            break;
                        default:
                            console.log("error");
                            break;
                    }

                    var alpha = this._angleButton_meas;
                    var unitLabel = this.angleUnitDropDown.label;
                    if (unitLabel === this.i18n.widget.defaultAngleUnit.GON) {
                        alpha = this._angleButton_meas / 360 * 400;
                    }
                    /*var circleGeometry = new Circle(this.coordinates[0], {
                        radius: 2000
                    });
                    this._renderer.draw({
                        geometry: circleGeometry
                    });*/

                    var resultString = alpha.toFixed(0).toString();
                    this._renderAngleText(quadrantsString, unitLabel, resultString);

                    this.setResult(resultString + " " + unitLabel);
                },

                _renderAngleText: function (quadrantsString, unitLabel, resultString) {
                    var unitSign = this._getUnitShortcutForAngle(unitLabel);
                    var resultStringWithUnit = resultString + " " + unitSign;
                    var textSymbolConstrArgs = resultStringWithUnit;
                    var textSymbolJSON = this.resultTextSymbol;
                    if (textSymbolJSON) {
                        textSymbolJSON.text = resultStringWithUnit;
                        textSymbolConstrArgs = textSymbolJSON;
                    }
                    var textSymbol = new TextSymbol(textSymbolConstrArgs);

                    var point = this._calcPointInQuadrant(quadrantsString);

                    // text
                    var g = this._renderer.draw({
                        geometry: point,
                        symbol: textSymbol
                    });
                    this._conterra._measureResultTextGraphics.push(g);
                },

                _getUnitShortcutForAngle: function (unitLabel) {
                    return (unitLabel === this.i18n.widget.defaultAngleUnit.GON) ? "gon" : "°";
                },

                _createPointGeomForText: function (geometries) {
                    var extent = geometry.calcExtent(geometries);
                    var center = extent.getCenter();
                    var ref = this._mapState.getSpatialReference();
                    var p = geometry.createPoint(center.x, center.y, ref);
                    return p;
                },

                _getQuadrant: function (point, relativeTo) {
                    var tempPoint = {
                        x: point.x - relativeTo.x,
                        y: point.y - relativeTo.y
                    };
                    if (tempPoint.x >= 0 && tempPoint.y >= 0) return 1;
                    if (tempPoint.x >= 0 && tempPoint.y <= 0) return 2;
                    if (tempPoint.x <= 0 && tempPoint.y <= 0) return 3;
                    if (tempPoint.x <= 0 && tempPoint.y >= 0) return 4;
                },

                _calcGeoPointForPixelDistance: function (srcPoint, distanceInPxX, distanceInpxY) {
                    var mapState = this._mapState;
                    var screeSize = mapState.getSize();
                    var mapExtent = mapState.getExtent();
                    var screenPointOfP1 = screenUtils.toScreenGeometry(mapExtent, screeSize.width, screeSize.height, srcPoint);
                    // calc new screen point
                    var screenPointNew = new ScreenPoint(screenPointOfP1.x + distanceInPxX, screenPointOfP1.y + distanceInpxY, srcPoint.spatialReference);
                    // convert to map point
                    return screenUtils.toMapGeometry(mapExtent, screeSize.width, screeSize.height, screenPointNew);
                },

                _calcPointInQuadrant: function (quadrantsString) {
                    var manipulateX = 0;
                    var manipulateY = 0;
                    var pixelDistance = 25; // pixel

                    // calc the distance
                    var mapState = this._mapState;
                    var ref = mapState.getSpatialReference();
                    var point = this.coordinates[0];
                    var mapPointNew = this._calcGeoPointForPixelDistance(point, pixelDistance, pixelDistance);

                    // get distance between p1 and the new mapPoint
                    var geomDistance = MathUtils.getLength(point, mapPointNew);

                    var angleBelow180 = (this._angleButton_meas < 180);
                    var pointInTriangle;

                    switch (quadrantsString) {
                        case '1 1':
                        case '4 2':
                            manipulateX -= geomDistance;
                            manipulateY -= geomDistance;
                            break;
                        case '2 1':
                            // angle must be <= 180°
                            break;
                        case '4 1':
                            manipulateY -= geomDistance;
                            break;
                        case '1 2':
                            manipulateX -= geomDistance;
                            break;
                        case '2 2':
                        case '1 3':
                            manipulateX -= geomDistance;
                            manipulateY += geomDistance;
                            break;
                        case '3 2':
                            // angle must be <= 180°
                            break;
                        case '2 3':
                            manipulateY += geomDistance;
                            break;
                        case '3 3':
                        case '2 4':
                            manipulateX += geomDistance;
                            manipulateY += geomDistance;
                            break;
                        case '4 3':
                            // angle must be <= 180°
                            break;
                        case '1 4':
                            // angle must be <= 180°
                            break;
                        case '3 4':
                            manipulateX += geomDistance;
                            break;
                        case '4 4':
                        case '3 1':
                            manipulateX += geomDistance;
                            manipulateY -= geomDistance;
                            break;
                        default:
                            console.log("error");
                            break;
                    }
                    if (angleBelow180) {
                        pointInTriangle = this._createPointGeomForText(this.coordinates);
                    }
                    var resultPoint = pointInTriangle || geometry.createPoint(point.x + manipulateX, point.y + manipulateY, ref);
                    return resultPoint;
                },

                deactivateMeasurement: function () {
                    this.inherited(arguments);
                },

                setResult: function (result) {
                    this.resultValue.setAttribute("content", result); //keine Nachkommastellen
                },

                hideDrawing: function () {
                    this.coordinates = [];
                    this.point = null;
                    var renderer = this._renderer;
                    if (!renderer) {
                        return;
                    }
                    renderer.clear();     // clears the marker
                },

                /**
                 * The measure text graphic can be either in the MapModel Graphicslayer node,
                 * or in the esriMap.graphics GraphicsLayer (not in sync with MapModel).
                 */
                _removeMeasureTextGraphics: function (clearLast) {
                    var textGraphics = this._conterra._measureResultTextGraphics;
                    if (textGraphics.length > 0) {
                        if (clearLast) {
                            var last = textGraphics[textGraphics.length - 1];
                            if (this.activeTool === "angle") {
                                this._renderer.erase(last);
                            } else {
                                this._esriMapReference.esriMap.graphics.remove(last);
                            }
                        } else {
                            d_array.forEach(textGraphics, function (textGraphic) {
                                if (this.activeTool === "angle") {
                                    this._renderer.erase(textGraphic);
                                } else {
                                    this._esriMapReference.esriMap.graphics.remove(textGraphic);
                                }
                            }, this);
                        }
                    }
                },

                /**
                 * Override super class method
                 */
                onMeasureStart: function () {
                    this._removeMeasureTextGraphics();
                    if (this._renderer) {
                        this._renderer.clear();
                    }
                    if (this._clickMapHandler) {
                        connect.disconnect(this._clickMapHandler);
                    }
                    if (this.activeTool === "distance") {
                        this._clickMapHandler = connect.connect(this._map, "onClick", this, "_renderDistanceText");
                    }
                    this._conterra.currentlyMeasuring = this.activeTool;
                    this.inherited(arguments);
                },

                /**
                 * Override super class method
                 */
                onMeasure: function (activeTool, userGeometry, result, unit) {
                    // for polyline measurements
                    if (activeTool === "distance") {
                        this.userGeometry = userGeometry;
                        this.unit = unit;
                        this.sectionResult = result;
                    }
                    this.inherited(arguments);
                },

                _renderDistanceText: function () {
                    // we need our own input point list, because the ESRI widgets resets it before onMeasureEnd
                    this._conterra._inputPoints = this._inputPoints;
                    var lastSegmentDistance = this.sectionResult - this._conterra._previousResult;

                    // create the point between the userGeometry and the last click point
                    var line = new Polyline(this.userGeometry.spatialReference);
                    var lastClickPoint = this._inputPoints[this._inputPoints.length - 2];
                    if (!lastClickPoint) {
                        return;
                    }
                    line.addPath([this.userGeometry, lastClickPoint]);
                    var textSymbolPoint = line.getExtent().getCenter();
                    // round
                    var r = d_number.format(lastSegmentDistance.toFixed(2), {pattern: this.numberPattern});
                    //this._drawMeasureResultAsText(activeTool, textSymbolPoint, r, unit, this.distanceLinesegmentTextSymbol, false);
                    this._conterra._previousResult = this.sectionResult;

                    this._drawMeasureResultAsText(this.activeTool, textSymbolPoint, r, this.unit, this.distanceLinesegmentTextSymbol, false);
                },

                /**
                 * Override super class method
                 */
                onMeasureEnd: function (activeTool, userGeometry, result, unit) {
                    this.inherited(arguments);
                    var r = result;
                    if (activeTool !== "location" && result.toFixed && this.numberPattern) {
                        r = d_number.format(result.toFixed(2), {pattern: this.numberPattern});
                    }
                    // we want to remove the last text graphic after unit selectbox change, but not on normal measure end events
                    var clearAll = (activeTool === "distance" && this._conterra._measureEndAfterUnitChange) ? true : false;
                    var clearLast = (activeTool === "distance") ? false : !clearAll;
                    // special case: when ending distance measurements and only one line was drawn, remove the segment graphic (last)
                    if (activeTool === "distance" && this._conterra._inputPoints.length === 2) {
                        this._drawMeasureResultAsText(activeTool, textSymbolPoint, r, unit, this.distanceLinesegmentTextSymbol, false);
                        clearLast = true;
                    }
                    var textSymbol = (activeTool === "area") ? this.areaTextSymbol : this.resultTextSymbol;
                    this._drawMeasureResultAsText(activeTool, userGeometry, r, unit, textSymbol, clearAll, clearLast);
                    this._conterra._inputPoints = [];
                    this._conterra._measureEndAfterUnitChange = false;
                    this._conterra._previousResult = 0;
                    this._conterra.currentlyMeasuring = null;
                },

                onUnitChange: function (unit, activeTool) {
                    if (this._measureGraphic !== null) {
                        this._conterra._measureEndAfterUnitChange = true;
                    }
                    this.inherited(arguments);
                },

                _drawMeasureResultAsText: function (activeTool, userGeometry, result, unit, textSymbol, removeOld, clearLast) {
                    if (removeOld) {
                        this._removeMeasureTextGraphics();
                    }
                    if (clearLast) {
                        this._removeMeasureTextGraphics(true);
                    }

                    var point = userGeometry.getExtent().getCenter();
                    point = this._coordinateTransformer.transform(point, 3857);

                    var resultStringWithUnit = result + " " + unit;
                    var textSymbolConstrArgs = resultStringWithUnit;
                    var textSymbolJSON = textSymbol;
                    if (textSymbolJSON) {
                        textSymbolJSON.text = resultStringWithUnit;
                        textSymbolConstrArgs = textSymbolJSON;
                    }
                    var ref = this._mapState.getSpatialReference();
                    var tSymbol = new TextSymbol(textSymbolConstrArgs);
//                    if(activeTool === "location"){
                    // TODO:    fix the calcGeoPointForPixelDistance method.
                    //          esri/geometry/screenUtils toMapGeometry() does not work as expected, so we need to transform again
                    // returns point in map coordinates
//                        point = this._calcGeoPointForPixelDistance(point, 0, 10000);
//                    } else {
                    // make sure map coords are used
                    point = this._coordinateTransformer.transform(point, ref.wkid);
//                    }
                    var g = new Graphic(point, tSymbol);
                    this._conterra._measureResultTextGraphics.push(g);
                    this._esriMapReference.esriMap.graphics.add(g);
                },

                destroy: function () {
                    this.hideDrawing();
                    this._removeMeasureTextGraphics();
                    connect.disconnect(this._clickMapHandler);
                    this._renderer.detachNode(); // clears the node
                    this._renderer = null;
                    this._mapModel.fireModelStructureChanged({// redraw the map
                        source: this
                    });
                    this._conterra = null;
                    this.inherited(arguments);
                }
//                ,
//                // draft of displaying measure widget coordinates in map srs
//                _advancedLocationDisplayHandler: function(mapPoint, mapPointX, mapPointY, e, mouseClicked) {
//                    var ref = this._mapState.getSpatialReference();
//                    var srs = ref.wkid;
//                    if(e){
//                        var f = {
//                            coordinates: [[mapPointX, mapPointY]], 
//                            sr: {wkid: 4326}, 
//                            conversionType: this._unitStrings[this.currentLocationUnit]
//                        }; 
//                        this._updateGeocoordinateStringLocation(mouseClicked, mapPoint.geometry);
//                    } else {
//                        var pointInMapSrs = this._coordinateTransformer.transform(mapPoint, srs);
//                        var xyStringRounded = this._calculateXY(pointInMapSrs.x, pointInMapSrs.y);
//                        if(mouseClicked){
//                            this._updateStaticLocation(xyStringRounded[0], xyStringRounded[1]);
//                            this.onMeasureEnd(this.activeTool, pointInMapSrs, [xyStringRounded[0], xyStringRounded[1]], this.getUnit());
//                        } else {
//                            this._updateMouseLocation(xyStringRounded[0], xyStringRounded[1]);
//                        } 
//                    }
//                }

            });
    });