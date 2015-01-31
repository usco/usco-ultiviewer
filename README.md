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

General guidelines:
-------------------

 - things need to be "natural"
 - things need to be smooth (all in the background)
 - avoid "hickups" and blocks : save and reload all the application state
 that includes last used design, tools etc 
 
 - given how anoying it can be to "visualize" the offsets from center etc in openscad,
 displaying the x/y plane offset arrows on the workplane could be usefull

 - "rwylo" : right where you left off : if you reload the app it should
 be in the same state you left it : this includes:
   - loaded meshes
   - annotations
   - selected tool
   - toggled options
   - camera angle/position


Supported drag & drop sources:
------------------------------
- urls
- urls from text files
- files from desktop

General ui behaviour
--------------------
 - double tap : zoom in on selected point of selected object
 - one tool active at a time: you should not have measurement/annotation
 tools active at the same time as translate/rotate etc
 
Order of precendence with mouse interactions:
---------------------------------------------
 1) object transformations
 2) camera movements
 3) object picking/selection
 
 - Annotations are "closer" to the user: do not let taps/clicks
 fall through 
 

Measurements
------------
- if any measurement is active, deactivate object selection :
zooming in etc distracts from taking measures across objects

Editing
-------
- left click on object : select 
- shift + click : multiple select
- ctrl + d : duplicate object
- supr/del : delete object 

- material/color picker
- put on plane (arbitrary , or based on selection)
- align
- mirror
- multiple selection

-------------------
Undo redo/history considerations
--------------------------------

- need to "regroup" change "events" fired too closely together (ie turn a set of very fine
grained discrete events into one bigger event): 
  * particularly for moving /rotating/Scaling objects visually

- using object observation does not resolve this , as it still gives discrete, very small
changes, which are not that usefull 

- also important: when "watching" changes to object attributes: compound changes need to be used:
ie , when watching a 3d object's position, you need to consider x,y,z components as a whole, 
and not isolated changes

Licence
=======
AGPL
