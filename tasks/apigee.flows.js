
var fs = require('fs');
var util = require('util');
var path = require('path');
var async = require('async');
var stream = require('stream');
var es = require('event-stream');
var Mustache = require('mustache');

module.exports = function (grunt) {
  'use strict';

  var flowsPath = path.join(__dirname, '../', grunt.config.get('exportApigeeFlows.dest.data'));
  var sourceURI = path.join(__dirname, '../', grunt.config.get('exportAPI.dest.data'), 'swagger');
  var apigeeFlowTemplateURI = path.join(__dirname, '../', 'templates', 'apigee-flow.mst');
  var apigeeFlowTemplate = undefined;

  grunt.registerTask('exportApigeeProxies',
  'Creates Apigee conditional flows from a valid source.',
  function () {
    var done = this.async();
    fs.readFile(apigeeFlowTemplateURI, 'utf8', function (err, data) {
      if (err) {
        grunt.log.error('Error while reading file.');
        grunt.log.error(err);
        return done();
      }

      apigeeFlowTemplate = data;
      doProcess(done);
    });
  });

  function doProcess(done) {
    var lineNumber = 1;
    var readStream = fs.createReadStream(sourceURI)
      .pipe(es.split())
      .pipe(es.parse())
      .pipe(es.map(parseResource))
      .pipe(es.map(formXMLText))
      // .pipe(es.map(saveResourceFlowsToFile))
      .on('error', function(err){
        grunt.log.error('Error while reading file.');
        grunt.log.error(err);
        return done();
      })
      .on('end', function(){
        grunt.log.writeln('Read entirefile.');
        return done();
      });
  }

  function parseResource(resource, callback) {
    async.map(resource, function (path, callback) {
      grunt.log.writeln('parsing path ' + path.path);
      return parseResourceOperation(path, callback);
    }, function (err, result) {
      if (err) return callback(err);
      callback(null, result);
    });
  }

  function parseResourceOperation(path, callback) {
    grunt.log.writeln('it has ' + path.operations.length + ' operations');
    async.map(path.operations, function interator(op, callback) {
      if (!op.path) op.path = path.path;
      return callback(null, Mustache.render(apigeeFlowTemplate, op));
    }, function (err, result) {
      if (err) return callback(err);
      var transformed = {
        path: path.path,
        ops: result
      };
      callback(null, transformed);
    });
  }

  function formXMLText(resource, callback) {
    console.log(resource);
    callback(null);
  }

  // function saveResourceFlowsToFile(flows, callback) {
  //   fs.writeFile()
  // }
};
