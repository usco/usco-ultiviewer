usco-viewer
============================

One possible way to generate a "minified" build for embeding could be:

- install vulcanize

        npm install vulcanize
        
- generate the release

        vulcanize embed.html --csp --inline --strip --output app/embed.html

building a release: DEPRECATED
------------------
Various builds targets (browser, desktop, standalone or integration) are available ,
but it is advised to only build the specific version you require as some of these can
take a bit of time to generate.

Once a build is complete, you will find the resulting files in the build/target-subtarget 
folder : for example: **build/browser-integration** or **build/desktop-standalone** etc

To build the viewer for **integration** into a website:

    $ grunt build:browser:integration

To build it **standalone** for usage in the browser using the provided demo index.html

    $ grunt build:browser:standalone

Some optional build flags are also available
 - --minify

**Note**: the *grunt core* build should be done *before* building a release


viewer element public api
------------------
 
API usage:

Since we are dealing with Polymer.js custom elements, all the following have to be used after the component
was loaded (for example using the 'polymer-ready' callback)

first, get the instance of the viewer :

    var ultiViewer = document.querySelector('ulti-viewer');

load a resource/model:

    ultiViewer.loadMesh("http://foo/demo-data/pr2_head_tilt.stl");

removing all displayed models from the scene

    ultiViewer.clearScene();

removing all resources 
    
    ultiViewer.clearResources();

removing all resouces, and flush cache
    
    ultiViewer.clearResources({clearCache:true});

Licence
=======
MIT
