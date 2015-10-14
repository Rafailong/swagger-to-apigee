
module.exports = function (grunt) {
  grunt.initConfig({
   pkg: grunt.file.readJSON('package.json'),
   availabletasks: { // task
     tasks: {
       options: {
         filter: 'exclude',
         tasks: ['mkdir', 'availabletasks', 'warn', 'default']
       }
     } // target
   },
   exportAPI: {
      dest: './data/swagger'
   },
   exportApigeeFlows: {
      dest: './data/apigee/flows'
   }
 });

 require('load-grunt-tasks')(grunt);
 grunt.loadTasks('tasks');
 grunt.registerTask('default', ['availabletasks']);
};
