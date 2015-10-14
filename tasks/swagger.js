
var _ = require('lodash');
var os = require('os');
var fs = require('fs');
var path = require('path');
var async = require('async');
var request = require('request');
var config = require('../config');

module.exports = function (grunt) {
  'use strict';

  grunt.registerTask('readAPI',
  'Read the api-docs from the source, it can be a swagger object, or the file path or URL of your Swagger API',
  function () {
    grunt.log.writeln('reading swagger from: ' + config.source.url);
    var done = this.async();
    readAPIDocs(done);
  });

  function readAPIDocs(callback) {
    request.get(config.source.url, function (err, res, body) {
      if (err) {
        grunt.log.error('something went wrong reading api-docs :[');
        grunt.log.error(err);
        return callback();
      }

      var docs = JSON.parse(body);
      async.map(docs.apis, function iterator(api, callback) { // callback(err, transformed)
        return downloadAPIDocs(api.path, callback);
      }, function (err, result) {
        if (err) {
          grunt.log.error('something went wrong reading api-docs of a path :[');
          grunt.log.error(err);
          return callback();
        }

        saveToFiles(result, function (err) {
          if (err) {
            grunt.log.error('something went wrong saving results to file :[');
            grunt.log.error(err);
            return callback();
          }

          grunt.log.writeln('API read successfully! :]');
          return callback();
        });
      });
    }).auth(config.source.user, config.source.password, true);
  }

  function downloadAPIDocs(api, callback) {
    var url = config.source.url + api;
    request.get(url, function (err, res, body) {
      if (err) return callback(err, null);

      var docs = JSON.parse(body);
      async.map(docs.apis, function (item, callback) {
        return callback(null, item);
      }, function (err, result) {
        if (err) {
          grunt.log.error('something went wrong reading api-docs of: ' + api);
          grunt.log.error(err);
          return callback();
        }

        grunt.log.writeln('read ' + result.length + ' paths for ' + api)
        return callback(null, result);
      })
    }).auth(config.source.user, config.source.password, true);
  }

  function saveToFiles(result, callback) {
    var dirPath = path.join(__dirname, '../', grunt.config.get('exportAPI.dest.data'));
    var filePath = path.join(dirPath, 'swagger');
    grunt.file.mkdir(dirPath);
    grunt.file.write(filePath);

    var text = formResultText(result);
    fs.writeFile(filePath, text, 'utf8', callback);
  }

  function formResultText(result) {
    var item = _.map(result, function (array) { return array; });
    var text = '';
    result.forEach(function (element, index, array) {
      text += (JSON.stringify(element) + os.EOL);
    });

    return text;
  }
};
