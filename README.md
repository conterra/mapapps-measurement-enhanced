# Measurement Enhanced Bundle
The Measurement Enhanced Bundle extends the Measurement Bundle by further capabilities. It now allows you to measure angles either between two 
position and the Azimuth or three positions.

![alt text](https://github.com/conterra/mapapps-measurement-enhanced/blob/master/Azimuth.JPG)

![alt text](https://github.com/conterra/mapapps-measurement-enhanced/blob/master/freeAngle.JPG)

Sample App
------------------
https://demos.conterra.de/mapapps/resources/apps/downloads_measurement_enhanced/index.html

Installation Guide
------------------
**Requirement: map.apps 3.2.0**

1. Add the bundle "dn_measurementenhanced" to your app and use the tool named "extendedMeasurementTool"
2. The bundle is not compatible with the Identify component of the featureinfo bundle. Therefore, it must be deactivated in app. json as follows:
```
"featureinfo": {
    "Identify": {
        "componentEnabled": false
    }
}
```

The "dn_measurementenhanced" bundle provides an Identify component as a replacement for it in the OSGI system.

#### Configurable Components of dn_measurementenhanced:

##### MeasurementFactory:
```
"MeasurementFactory": {
    "showTools": [
        "area",
        "distance",
        "location",
        "angle"
    ],
    "defaultTool": "area",
    "defaultAreaUnit": "HECTARES",
    "defaultLengthUnit": "KILOMETERS",
    "defaultLocationUnit": "DECIMAL_DEGREES",
    "defaultAngleUnit": "DEGREES",
    "finishWithButton": true,
    "geometryServiceURL": "@@geometry.service.url@@"
}
```

Development Guide
------------------
### Define the mapapps remote base
Before you can run the project you have to define the mapapps.remote.base property in the pom.xml-file:
`<mapapps.remote.base>http://%YOURSERVER%/ct-mapapps-webapp-%VERSION%</mapapps.remote.base>`

##### Other methods to to define the mapapps.remote.base property.
1. Goal parameters
`mvn install -Dmapapps.remote.base=http://%YOURSERVER%/ct-mapapps-webapp-%VERSION%`

2. Build properties
Change the mapapps.remote.base in the build.properties file and run:
`mvn install -Denv=dev -Dlocal.configfile=%ABSOLUTEPATHTOPROJECTROOT%/build.properties`
