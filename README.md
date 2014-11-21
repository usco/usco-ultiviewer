usco-viewer
============================

One possible way to generate a "minified" build for embeding is:

- install vulcanize

        npm install vulcanize
        
- generate the release 

        vulcanize ulti-viewer.html --csp --inline --strip --output embed/ulti-viewer-embed.html
        
  this generates the concatenated ulti-viewer + dependencies *without* webcomponentsjs/platform.js 
  
  you should now have two new files : 
  
    ulti-viewer-embed.html
    
    ulti-viewer-embed.js

- you can then copy/ use either :
  **webcomponents.min.js** or 
  **webcomponents.js** 
  these are files that you can find in your local **components/webcomponentsjs** folder
   (you must have run "bower install" first)

**reminder :** webcomponents/platform is a set of polyfills for web components, and as of chrome 38 for
  example, not even needed in the browsers that implement things natively

- you can then use ulti-viewer files + webcomponents like demonstrated in **embed/embed-demo.html**
the only difference to the standard demo is the path/name of the files

- a pre-built version (following the steps above) is already present by default in the embed folder


This will be AUTOMATED soon



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


interactions:
=============

Measurements
- if any measurement is active, deactivate object selection :
zooming in etc distracts from taking measures across objects

Editing
- left click on object : select 
- shift + click : multiple select
- ctrl + d : duplicate object

Licence
=======
AGPL
