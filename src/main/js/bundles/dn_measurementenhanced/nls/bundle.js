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
define({ root:
({
    bundleName: "Measurement Enhanced",
    bundleDescription: "Extends the measurement bundle.",
    ui : {
        srs: "Reference System:",
        title: "Point measurement",
        tooltip: "measure point coordinate",
        finishBtnLabel: "Finish",
        lat: "Lat",
        lon: "Lon",
        labelAzimut: "Azimuth"
    },
    widget:{
        showTools: {
            angle: "angle measurement",
            coordinate: "location measurement"
        },
        defaultTool: {
            angle: "Angle",
            coordinate: "Location"
        },
        defaultAngleUnit: {
            title: "angle units",
            DEGREES: "degree",
            GON: "grade"
        }
    },
    window: {
        title: "Measurement Tools"
    },
    tool: {
        title: "Extended Measurement"
    }
})

,
"de":true
});