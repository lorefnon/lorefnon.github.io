module.exports = function(grunt) {

  grunt.loadNpmTasks('grunt-browserify');

  grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),

    browserify: {
      dist: {
        files: {
          'assets/javascripts/index.js': ['_assets/javascripts/index.js'],
          'assets/javascripts/post.js': ['_assets/javascripts/post.js']
        },
        options: {
          transform: [
            ['babelify', { presets: ["es2015"] }],
            'uglifyify'
          ]
        }
      }
    }

  });

  grunt.registerTask('default', ['browserify'])

}
