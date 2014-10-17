#!/usr/bin/env node

var fs = require('fs');
var xml2js = require('xml2js');
var extend = require('xtend');

var extractSimpleItems = function (input, items, opts) {
    var rv = {},
        options = opts || {};

    items.forEach(function(item) {
        if (typeof(input[item]) !== 'undefined') {

            if (options.numerical) {
                rv[item] = parseFloat(input[item][0]);
            } else {
                rv[item] = input[item][0];
            }
        }
    });
    return rv;
};

var parseMetadata = function (input) {
    var rv = {};
    var md = input[0];

    var oneOfs = ['name', 'desc', 'time', 'email', 'url', 'urlname', 'keywords'];
    rv = extend(rv, extractSimpleItems(md, oneOfs));

    if (md.bounds) {
        var bounds = md.bounds[0]['$'];
        rv.bounds = {
            lat: {
                min: parseFloat(bounds.minlat),
                max: parseFloat(bounds.maxlat)
            },
            lon: {
                min: parseFloat(bounds.minlon),
                max: parseFloat(bounds.maxlon)
            }
        };
    }
    return rv;
};

var parseWaypoint = function(input) {

    var outPoint = {};

    outPoint.lat = parseFloat(input['$'].lat);
    outPoint.lon = parseFloat(input['$'].lon);

    var stringValues = [ 'time', 'name', 'cmt', 'desc', 'src', 'sym', 'type', 'fix', 'url', 'urlname' ];
    var numericalValues = [ 'ele', 'geoidheight', 'sat', 'hdop', 'vdop', 'pdop', 'ageofdgpsdata', 'magvar' ];

    outPoint = extend(outPoint, extractSimpleItems(input, stringValues));
    outPoint = extend(outPoint, extractSimpleItems(input, numericalValues, { numerical: true }));

    return outPoint;
}

var parseWaypoints = function(input) {

    var points = [];
    for (var i = 0; i < input.length; i++) {

        var wpt = parseWaypoint(input[i]);
        points.push(wpt);
    }

    return points;
}

var parseTracks = function (input) {
    var output = [];
    for (var trackn=0; trackn < input.length; trackn++) {
        var inTrack = input[trackn];
        var outTrack = {};

        var stringValues = ['name', 'cmt', 'desc', 'src', 'type', 'url', 'urlname'];
        var numericalValues = ['number'];

        outTrack = extend(outTrack, extractSimpleItems(inTrack, stringValues));
        outTrack = extend(outTrack, extractSimpleItems(inTrack, numericalValues, { numerical: true }));

        outTrack.segments = [];

        for (var trksegn=0; trksegn < inTrack.trkseg.length; trksegn++) {
            outTrack.segments.push(parseWaypoints(inTrack.trkseg[trksegn].trkpt));
        }

        output.push(outTrack);
    }

    if (output.length) {
        return { tracks: output };
    } else {
        return {};
    }
}

var parseRoutes = function (input) {
    var output = [];
    for (var routen=0; routen < input.length; routen++) {
        var inRoute = input[routen];
        var outRoute = {};

        var stringValues = ['name', 'cmt', 'desc', 'src', 'type', 'email', 'url', 'urlname'];
        var numericalValues = ['number']

        outRoute = extend(outRoute, extractSimpleItems(inRoute, stringValues));
        outRoute = extend(outRoute, extractSimpleItems(inRoute, numericalValues, { numerical: true }));

        outRoute.points = parseWaypoints(inRoute.rtept);

        output.push(outRoute);
    }

    if (output.length) {
        return { routes: output };
    } else {
        return {};
    }
}

exports.convert = function (fname, cb) {
    var parser = new xml2js.Parser();
    var result = {};

    fs.readFile(fname, function(err, data) {
        if (err) {
            console.error('Error reading file: ' + err);
            cb(result);
        }
        parser.parseString(data, function(err, xmlObj) {
            if (err) {
                console.error('Error parsing GPX file: ' + err);
                cb(result);
            }

            var source = xmlObj.gpx;

            if (source.metadata) {
                result = extend(result, parseMetadata(source.metadata));
            }

            if (source.wpt) {
                var wpts = parseWaypoints(source.wpt);
                result = extend(result, { waypoints: wpts });
            }

            if (source.trk) {
                result = extend(result, parseTracks(source.trk));
            }

            if (source.rte) {
                result = extend(result, parseRoutes(source.rte));
            }

            cb(result);
        });
    });
};
