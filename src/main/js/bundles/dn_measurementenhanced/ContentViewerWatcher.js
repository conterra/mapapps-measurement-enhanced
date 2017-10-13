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
    "dojo/_base/declare", "dojo/aspect"
], function (declare, aspect) {
    /*
     * COPYRIGHT 2010-2011 con terra GmbH Germany
     * 
     * Komponente um das Problem zu lösen, dass beim Messen der Distanz und Area, beim Zeichnen der Linien ein Popup erzeugt wird.
     * Das Öffnen des Popups lässt sich sogar in map.apps nachstellen (z.B. release app), wenn man das measure tool mit noGroup: true konfiguriert. 
     * Interessant ist auch, dass wenn das agsprinting popup gleichzeitig offen ist, das ungewünschte Popup nicht erscheint.
     */
    return declare([], {

        activate: function () {
            var measureWidget = this.measureWidget;
            var enableAgain = false;

            aspect.before(this.showGraphicContent, "showContent", function (args) {
                // check if measurement is active
                if (measureWidget.activeTool !== null) {
                    return;
                }
                if (measureWidget._conterra && measureWidget._conterra.currentlyMeasuring &&
                    (measureWidget._conterra.currentlyMeasuring === "distance" || measureWidget._conterra.currentlyMeasuring === "area")) {
                    this.disable();
                    enableAgain = true;
                }
            });
            aspect.after(this.showGraphicContent, "showContent", function (args) {
                if (enableAgain) {
                    this.enable();
                    enableAgain = false;
                }
            });

            var cv = this.contentViewer;
            var isAlreadyShowingFunction = cv.isAlreadyShowing;
            aspect.before(this.contentViewer, "showContentInfo", function (args) {
                // check if measurement is active
                if (measureWidget.activeTool !== "distance" && measureWidget.activeTool !== "area") {
                    return;
                }
                if (measureWidget._conterra && measureWidget._conterra.currentlyMeasuring &&
                    (measureWidget._conterra.currentlyMeasuring === "distance" || measureWidget._conterra.currentlyMeasuring === "area")) {
                    cv.isAlreadyShowing = function () {
                        this.isAlreadyShowing = isAlreadyShowingFunction;
                        return true;
                    };
                }
            });
        }

    });
});