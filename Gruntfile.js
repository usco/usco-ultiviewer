
module.exports = function (grunt) {
  grunt.initConfig({
    browserify: {
      basic: {
        src: ['node_modules/usco-assetmanager/src/assetManager.coffee'],
        dest: 'public/main.js',
        options: {
          aliasMappings: [
            {
              cwd: 'shared',
              src: ['**/*.js'],
              dest: 'lib',
            },
          ]
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-browserify');

  // Task(s).
  grunt.registerTask('test', ['jshint', 'jasmine_node']);
  grunt.registerTask('build', ['jshint', 'jasmine_node','concat','uglify']);
  grunt.registerTask('release', ['concat','uglify','jasmine_node','release']);
  grunt.registerTask('default', ['browserify']);
};

//see https://github.com/jmreidy/grunt-browserify/blob/master/examples/mappings/Gruntfile.js

