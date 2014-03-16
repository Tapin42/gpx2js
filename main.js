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

var parseTracks = function (input) {
    var output = [];
    for (var trackn=0; trackn < input.length; trackn++) {
        var inTrack = input[trackn];
        var outTrack = {};
        var oneOfs = ['name', 'cmt', 'desc', 'src', 'number', 'type'];

        outTrack = extend(outTrack, extractSimpleItems(inTrack, oneOfs));

        for (var trksegn=0; trksegn < inTrack.trkseg.length; trksegn++) {
            var inSegment = inTrack.trkseg[trksegn];
            var outSegment = {};

            for (var trkptn=0; trkptn < inSegment.trkpt.length; trkptn++) {
                var inPoint = inSegment.trkpt[trkptn];
                var outPoint = {};

                outPoint.lat = inPoint['$'].lat;
                outPoint.lon = inPoint['$'].lon;

                oneOfs = ['ele', 'time', 'geoidheight', 'name', 'cmt',
                          'desc', 'src', 'sym', 'type', 'sat', 'hdop', 'vdop',
                          'pdop', 'ageofdgpsdata'];

                outPoint = extend(outPoint, extractSimpleItems(inPoint, oneOfs));

                if (outSegment.points) {
                    outSegment.points.push(outPoint);
                } else {
                    outSegment.points = [ outPoint ];
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

            cb(result);
        });
    });
};
