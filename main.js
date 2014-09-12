#!/usr/bin/env node

var fs = require('fs');
var xml2js = require('xml2js');
var extend = require('xtend');

var extractSimpleItems = function (input, items) {
    var rv = {};
    items.forEach(function(item) {
        if (typeof(input[item]) !== 'undefined') {
            rv[item] = input[item][0];
        }
    });
    return rv;
};

var parseMetadata = function (input) {
    var rv = {};
    var md = input[0];
    if (md.name)     { rv.name = md.name[0]; }
    if (md.desc)     { rv.desc = md.desc[0]; }
    if (md.time)     { rv.time = md.time[0]; }
    if (md.email)    { rv.email = md.email[0]; }
    if (md.url)      { rv.url = md.url[0]; }
    if (md.urlname)  { rv.urlname = md.urlname[0]; }
    if (md.keywords) { rv.keywords = md.keywords[0]; }
    if (md.bounds) {
        var bounds = md.bounds[0]['$'];
        rv.bounds = {
            lat: {
                min: bounds.minlat,
                max: bounds.maxlat
            },
            lon: {
                min: bounds.minlon,
                max: bounds.maxlon
            }
        };
    }
    return rv;
};

var parseWaypoint = function(input) {

    var outPoint = {};

    outPoint.lat = input['$'].lat;
    outPoint.lon = input['$'].lon;

    oneOfs = ['ele', 'time', 'geoidheight', 'name', 'cmt',
              'desc', 'src', 'sym', 'type', 'sat', 'hdop', 'vdop',
              'pdop', 'ageofdgpsdata', 'magvar', 'fix', 'url', 'urlname'];

    return extend(outPoint, extractSimpleItems(input, oneOfs));
}

var parseTracks = function (input) {
    var output = [];
    for (var trackn=0; trackn < input.length; trackn++) {
        var inTrack = input[trackn];
        var outTrack = {};
        var oneOfs = ['name', 'cmt', 'desc', 'src', 'number', 'type', 'url', 'urlname'];

        outTrack = extend(outTrack, extractSimpleItems(inTrack, oneOfs));

        for (var trksegn=0; trksegn < inTrack.trkseg.length; trksegn++) {
            var inSegment = inTrack.trkseg[trksegn];
            var outSegment = {};

            for (var trkptn=0; trkptn < inSegment.trkpt.length; trkptn++) {

                var wpt = parseWaypoint(inSegment.trkpt[trkptn]);
                if (outSegment.points) {
                    outSegment.points.push(wpt);
                } else {
                    outSegment.points = [ wpt ];
                }
            }

            if (outTrack.segments) {
                outTrack.segments.push(outSegment);
            } else {
                outTrack.segments = [ outSegment ];
            }
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
        var oneOfs = ['name', 'cmt', 'desc', 'src', 'number', 'type', 'email', 'url', 'urlname'];

        outRoute = extend(outRoute, extractSimpleItems(inRoute, oneOfs));

        for (var wptn=0; wptn < inRoute.rtept.length; wptn++) {
            
            var wpt = parseWaypoint(inRoute.rtept[wptn]);
            if (outRoute.points) {
                outRoute.points.push(wpt);
            } else {
                outRoute.points = [ wpt ];
            }
        }

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
