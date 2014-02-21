module.exports = (grunt) ->
  
  #different builds:
  # browser
  # -->standalone (index.html)
  # -->integration (custom element + deps only)
  # desktop
  # -->linux
  # -->win
  # -->mac
  # mobile
  # N/A
  # node.js 
  grunt.initConfig
    pkg: grunt.file.readJSON("package.json")
    currentBuild: null
    browserify:
      basic:
        src: ["node_modules/usco-assetmanager/src/assetManager.coffee", "node_modules/usco-xhr-store/src/xhrStore.coffee", "node_modules/usco-stl-parser/STLParser.js", "node_modules/usco-amf-parser/AMFParser_stream.js", "node_modules/usco-obj-parser/OBJParser.js", "node_modules/usco-ply-parser/PLYParser.js","node_modules/usco-ctm-parser/CTMParser.js"]
        dest: "public/main.js"
        options:
          transform: ["coffeeify","workerify"]
          ignore: ["three"]
          external: []
          alias: ["node_modules/usco-assetmanager/src/assetManager.coffee:assetManager", "node_modules/usco-xhr-store/src/xhrStore.coffee:usco-xhr-store", "node_modules/usco-stl-parser/STLParser.js:usco-stl-parser", "node_modules/usco-amf-parser/AMFParser_stream.js:usco-amf-parser", "node_modules/usco-obj-parser/OBJParser.js:usco-obj-parser", "node_modules/usco-ply-parser/PLYParser.js:usco-ply-parser","node_modules/usco-ctm-parser/CTMParser.js:usco-ctm-parser"]
          aliasMappings: [
            cwd: "shared"
            src: ["**/*.js"]
            dest: "lib"
          ]

    uglify:
      main:
        options:
          banner: "/*! <%= pkg.name %> <%= grunt.template.today(\"yyyy-mm-dd\") %> */\n"

        dist:
          files:
            "public/<%= pkg.name %>.min.js": ["public/main.js"]

      integration:
        options: {}
        #compress:true,
        #sourceMap:'build/integration/usco-ultiviewer.js.map',
        #sourceMappingURL:'/'
        #sourceMapIn:'build/integration/platform.js.map'
        files:
          "build/<%= currentBuild %>/usco-ultiviewer.min.js": ["build/<%= currentBuild %>/usco-ultiviewer.js"]
          "build/<%= currentBuild %>/platform.min.js": ["build/<%= currentBuild %>/platform.js"]

      standalone:
        files:
          "build/<%= currentBuild %>/index.min.js": ["build/<%= currentBuild %>/index.js"]
          "build/<%= currentBuild %>/platform.min.js": ["build/<%= currentBuild %>/platform.js"]

    exec:
      standalone:
        command: "vulcanize -i index.html -o build/<%= currentBuild %>/index.html"
        stdout: true
        stderr: true

      integration:
        command: "vulcanize --csp -i smoke.html -o build/<%= currentBuild %>/usco-ultiviewer.html"
        stdout: true
        stderr: true

      update_git:
        command: "git pull"
        stdout: true
        stderr: true
      update_bower1:
        command: "rm -r components"
        stdout: true
        stderr: true
      update_bower2:
        command: "bower install"
        stdout: true
        stderr: true
      update_npm1:
        command: "rm -r node_modules"
        stdout: true
        stderr: true
      update_npm2:
        command: "npm install"
        stdout: true
        stderr: true
  

    nodewebkit:
      options:
        version: "0.6.3" #0.8.2 0.6.3 works with polymer but unresolved does not get removed, does not work from 0.7.0 onwards, 0.8.2 works only partially (wrong order of events)
        build_dir: "_tmp/desktop" # Where the build version of my node-webkit app is saved
        mac: false # We want to build it for mac
        win: false # We want to build it for win
        linux32: false # We don't need linux32
        linux64: true # We don't need linux64
        keep_nw: true
      src: ["build/<%= currentBuild %>/**"] # Your node-wekit app

    replace:
      integration:
        src: ["build/<%= currentBuild %>/usco-ultiviewer.html"]
        dest: "build/<%= currentBuild %>/usco-ultiviewer.html"
        replacements: [
          from: "../components/platform"
          to: ""
        ,
          from: "../components/"
          to: ""
        ,
          from: "usco-ultiviewer.js"
          to: "usco-ultiviewer.min.js"
        ]

      bla:
        src: ["build/<%= currentBuild %>/index.html"]
        overwrite:true
        replacements: [
          from: "../../components/platform/"
          to: ""
        ,
          from: "../components/"
          to: ""

        ]

      bli:
        src: ['components/platform/platform.js']
        dest: 'components/platform/platform_.js',  
        replacements: [
              from: 'global',                 
              to: 'fakeGlobal' 
        ] 

      standalone:
        src: ["build/<%= currentBuild %>/platform.js"]
        dest: "build/<%= currentBuild %>/platform.js"
        replacements: [
          from: "global" # string replacement
          to: "fakeGlobal"
        ]
        

    copy:
      integration:
        files: [
          #{src: 'components/platform/platform.js.map',dest: 'build/<%= currentBuild %>/platform.js.map'} ,
          src: "components/platform/platform.js"
          dest: "build/<%= currentBuild %>/platform.js"
        ]
      standalone:
        files: [
          {src: 'components/platform/platform.js.map',dest: 'build/<%= currentBuild %>/platform.js.map'}
          src: "components/platform/platform.js"
          dest: "build/<%= currentBuild %>/platform.js"
        ]
      desktop:
        files: [
          src: "package.json"
          dest: "build/<%= currentBuild %>/package.json"
          {src: ['demo-data/**'], dest: 'build/<%= currentBuild %>/'}
          #{expand: true, src: ['components/**'], dest: 'build/<%= currentBuild %>'}
        ]
      desktopFinal:
        files: [
          {expand: true, src: ['_tmp/desktop/releases/usco-ultiviewer/linux64/usco-ultiviewer/**'], dest: 'build/<%= currentBuild %>/'},
        ]

    rename:
      desktopFinal:
        src: '_tmp/desktop/releases/usco-ultiviewer/'
        dest: 'build/<%= currentBuild %>/'

    htmlmin:
      integration:
        options: {}
        files: # Dictionary of files
          "build/integration/usco-ultiviewer.html": "build/integration/usco-ultiviewer.html"

    clean:
      integration: ["build/<%= currentBuild %>"]
      postIntegration: ["build/<%= currentBuild %>/platform.js", "build/<%= currentBuild %>/usco-ultiviewer.js"]
      standalone: ["build/<%= currentBuild %>"]
      postStandalone: ["build/<%= currentBuild %>/platform.js", "build/<%= currentBuild %>/index.js"]

      desktop:["build/<%= currentBuild %>"]
  
  #generic
  grunt.loadNpmTasks "grunt-contrib-watch"
  grunt.loadNpmTasks "grunt-contrib-copy"
  grunt.loadNpmTasks "grunt-rename"
  grunt.loadNpmTasks "grunt-exec"
  grunt.loadNpmTasks "grunt-text-replace"
  grunt.loadNpmTasks "grunt-contrib-clean"
  
  #builds generation
  grunt.loadNpmTasks "grunt-browserify"
  grunt.loadNpmTasks "grunt-node-webkit-builder"
  grunt.loadNpmTasks "grunt-contrib-uglify"
  grunt.loadNpmTasks "grunt-contrib-htmlmin"
  
  #release cycle

  
  # Task(s).
  #grunt.registerTask "test", ["jshint", "jasmine_node"]
  #grunt.registerTask "release", ["concat", "uglify", "jasmine_node", "release"]
  grunt.registerTask "core", ["browserify", "uglify:main"]
  
  #Project update (dependencies etc)
  @registerTask 'update', 'update the project s dependencies', () =>
    @task.run "exec:update_git"
    @task.run "exec:update_bower1"
    @task.run "exec:update_bower2"
    #@task.run "exec:update_npm1"
    #@task.run "exec:update_npm2"

  #Builds
  @registerTask 'build', 'Build usco-viewer for the chosen target/platform etc', (target = 'browser', subTarget='standalone') =>
    minify = grunt.option('minify');
    platform = grunt.option('platform');
    console.log("target", target, "sub", subTarget,"minify",minify,"platform",platform)
    grunt.config.set("currentBuild", "#{target}-#{subTarget}")
    
    @task.run "clean:#{subTarget}"
    @task.run "copy:#{subTarget}"
    @task.run "exec:#{subTarget}"
    @task.run "replace:#{subTarget}"

    if minify
      @task.run "uglify:#{subTarget}"
      #issues with ,'htmlmin:integration'
      postClean = subTarget[0].toUpperCase() + subTarget[1..-1].toLowerCase()
      @task.run "clean:post#{postClean}"

    if target is 'desktop'
      @task.run "replace:bla"
      @task.run "copy:desktop"
      @task.run "nodewebkit"
      @task.run "rename:desktopFinal"
      

