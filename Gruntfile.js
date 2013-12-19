
module.exports = function (grunt) {


  //different builds:
  // browser, standalone
  // browser, integration
  // desktop
  // node.js 

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    browserify: {
      basic: {
        src: ['node_modules/usco-assetmanager/src/assetManager.coffee',
        'node_modules/usco-xhr-store/src/xhrStore.coffee',
        'node_modules/usco-stl-parser/STLParser.js',
        'node_modules/usco-amf-parser/AMFParser_stream.js',
        'node_modules/usco-obj-parser/OBJParser.js',
        'node_modules/usco-ply-parser/PLYParser.js',
        ],
        dest: 'public/main.js',
        options: {
          transform: ['coffeeify'],
          ignore:["three"],
          external: [],
          alias:[
            'node_modules/usco-assetmanager/src/assetManager.coffee:assetManager',
            'node_modules/usco-xhr-store/src/xhrStore.coffee:usco-xhr-store',
            'node_modules/usco-stl-parser/STLParser.js:usco-stl-parser',
            'node_modules/usco-amf-parser/AMFParser_stream.js:usco-amf-parser',
            'node_modules/usco-obj-parser/OBJParser.js:usco-obj-parser',
            'node_modules/usco-ply-parser/PLYParser.js:usco-ply-parser'
          ],
          aliasMappings: [
            {
              cwd: 'shared',
              src: ['**/*.js'],
              dest: 'lib',
            },
          ]
        }
      }
    },
    uglify: {
      main:{
        options: {
          banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
        },
        dist: {
          files: {
            'public/<%= pkg.name %>.min.js': ['public/main.js']
          }
        }
      },
      integration:
      {
        options:{
          //compress:true,
          //sourceMap:'build/integration/usco-ultiviewer.js.map',
          //sourceMappingURL:'/'
          //sourceMapIn:'build/integration/platform.js.map'
        },
        files: {
            'build/integration/usco-ultiviewer.min.js': ['build/integration/usco-ultiviewer.js'],
            'build/integration/platform.min.js': ['build/integration/platform.js']
          }
      }
    },
    exec: {
      standalone: {
        command: 'vulcanize --csp -i index.html -o build/build.html',
        stdout: true,
        stderr: true
      },
      integration: {
        command: 'vulcanize --csp -i smoke.html -o build/integration/usco-ultiviewer.html',
        stdout: true,
        stderr: true
      }
    },
    nodewebkit: {
      options: {
          version:"0.8.2",// 0.6.3 works with polymer , does not work from 0.7.0 onwards
          build_dir: 'build/desktop', // Where the build version of my node-webkit app is saved
          mac: false, // We want to build it for mac
          win: false, // We want to build it for win
          linux32: false, // We don't need linux32
          linux64: true // We don't need linux64
      },
      src: ['build/**'] // Your node-wekit app
    },
    replace: {
      integration:{
        src: ['build/integration/usco-ultiviewer.html'],
        dest: 'build/integration/usco-ultiviewer.html', 
        replacements: [
            {from:'../components/platform', to:''},
            {from: '../components/',      to: ''}, 
            {from: 'usco-ultiviewer.js',      to: 'usco-ultiviewer.min.js'}, 
            ] 
      },    
      testing:{
        src: ['components/platform/platform.js'],
        dest: 'components/platform/platform_.js',  
        replacements: [{ 
              from: 'global',                   // string replacement
              to: 'fakeGlobal' 
            }] 
       }
    },
    copy: {
      integration: {
        files:[
        //{src: 'components/platform/platform.js.map',dest: 'build/integration/platform.js.map'} ,
        {src: 'components/platform/platform.js',dest: 'build/integration/platform.js'} ,
       ]
     },
    },

    htmlmin: {                                     
    integration: {                                      
      options: {                                 
      },
      files: {                                   // Dictionary of files
        'build/integration/usco-ultiviewer.html': 'build/integration/usco-ultiviewer.html',   
      }
    },
  },
  clean:{
    integration:["build/integration"],
    postIntegration:["build/integration/platform.js","build/integration/usco-ultiviewer.js"]     
  }

  });

  //generic
  grunt.loadNpmTasks('grunt-exec');
  grunt.loadNpmTasks('grunt-text-replace');
  grunt.loadNpmTasks('grunt-contrib-clean');

  //builds generation
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-node-webkit-builder');

  //release cycle
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-htmlmin');

  // Task(s).
  grunt.registerTask('test', ['jshint', 'jasmine_node']);
  grunt.registerTask('build', ['jshint', 'jasmine_node','concat','uglify']);
  grunt.registerTask('release', ['concat','uglify','jasmine_node','release']);
  grunt.registerTask('default', ['browserify','uglify']);

  //test for polymer vulcanizer (ie full release)
  grunt.registerTask('vulcan', ['exec']);

  //should be a sub task/target
  grunt.registerTask('desktopBuild', ['nodewebkit']);

  //integration build
  grunt.registerTask('integrationbuild', ['clean:integration', 'copy:integration','exec:integration','replace:integration','uglify:integration','clean:postIntegration']);//issues with ,'htmlmin:integration'

  //desktop build
  grunt.registerTask('desktopbuild', ['clean:integration', 'copy:integration','exec:standalone','replace:integration','uglify:integration','clean:postIntegration']);

  

};

//see https://github.com/jmreidy/grunt-browserify/blob/master/examples/mappings/Gruntfile.js

