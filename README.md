# gpx2js

A simple node.js package for converting GPX files to JSON.

## Usage

```
var gpx2js = require('gpx2js');

gpx2js.convert('./demo.gpx', function(rv) {
    console.log(JSON.stringify(rv, null, 4));
});

```
