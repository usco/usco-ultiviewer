usco-viewer
============================

development
-----------
since the viewer has a few "core" dependencies: those need to be re-built regularly 
(ie when the dependencies get updated)
these include:
 - asset manager (soon to be migrated back into kernel)
 - various parsers

To build :

    $ grunt core



building a release
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

    var ultiViewer = document.querySelector('usco-ultiviewer');

load a resource/model:

    ultiViewer.loadResource("http://foo/demo-data/pr2_head_tilt.stl");

removing all displayed models from the scene

    ultiViewer.clearScene();

removing all resources 
    
    ultiViewer.clearResources();

removing all resouces, and flush cache
    
    ultiViewer.clearResources({clearCache:true});

Licence
=======
MIT
