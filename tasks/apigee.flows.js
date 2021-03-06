
var fs = require('fs');
var os = require('os');
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

  var regexToTestPath = /\{.+\}/;
  var regexToDeleteNamedURIPart = /\{.+:\s\(/g;
  var regexToDeleteClosingCurlyBracket = /\}/g;
  var regexToDeleteNamedURIWithSquareBracket = /\{.+:\s\[/g;

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
    fs.createReadStream(sourceURI)
      .pipe(es.split())
      .pipe(es.parse())
      .pipe(es.map(parseResource))
      .pipe(es.map(formXMLText))
      .pipe(es.map(saveResourceFlowsToFile))
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
      op.path = parseURI(op.path);
      return callback(null, Mustache.render(apigeeFlowTemplate, op));
    }, function (err, result) {
      if (err) return callback(err);
      var transformed = { path: path.path, ops: result };
      callback(null, transformed);
    });
  }

  function formXMLText(resource, callback) {
    grunt.log.writeln('forming text for ' + resource[0].path);
    var text = '';
    resource[0].ops.forEach(function (element, index, array) {
      text += element;
    });
    var flowName = parseFlowName(resource[0].path);
    callback(null, { path: flowName, text: text });
  }

  function saveResourceFlowsToFile(flows, callback) {
    grunt.log.writeln('saving flow for: ' + flows.path + '.xml');
    var text = '<?xml version="1.0" encoding="UTF-8"?>' + os.EOL + flows.text;
    var filePath = path.join(flowsPath, flows.path + '.xml');
    grunt.file.write(filePath);
    fs.writeFile(filePath, flows.text, 'utf8', function (err) {
      if (err) return callback(err);
      callback(null);
    });
  }

  function parseFlowName(path) {
    var fileName = path.replace(/\//, ''); // replace the first slach by empty string
    fileName = fileName.replace(/\//g, '-'); // replace the intermadiate slasheh by a dash
    return fileName;
  }

  function parseURI(uri) {
    uri = uri.replace(/\//g, '\\/');
    if (!regexToTestPath.test(uri)) {
      return uri;
    }

    uri = uri.replace(regexToDeleteNamedURIPart, '(');
    uri = uri.replace(regexToDeleteClosingCurlyBracket, '');
    uri = uri.replace(regexToDeleteNamedURIWithSquareBracket, '[');

    return uri;
  }
};
