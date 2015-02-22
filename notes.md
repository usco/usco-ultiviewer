

PARTS
=====

  - "parts" are semi abstract: 
    - a set of parameters PLUS
    - an algorithm 


  - each part can be implemented in different ways, in different 3d modelling programs, 
  parametrically or not
  
  - each implementation has a source ( parametric file(s) (a single entry point), and 
  a "source instance" ie for example a generated stl file
  
  - implementations encompass the idea of "parallel evolution" or " lots of people can 
  come up with the same idea for an object, it is still essentially the same entity"
  
  - they also include the idea, that while 3d modeling tools can change 
  (openscad , freecad etc), the part is still the same part, and 
  the parameters to create a given object are still essentially the same



ALL INSTANCES are just clones of each other

ALL INSTANCES can have different transform and/or be at different nodes in the
overall hierarchy 

IF an instance is different, it is not an instance of the same implementation

INSTANCES are NOT their meshes ! but they have mesh data too !


Note (to self):
 - this makes instances the same as "entities" ?


Uniqueness ids etc
------------------

  Uniqueness/ hash of implementations:
      
      ROOT + partName+partVersion+partParameters
      
      partName(bom) + partVersion

  Uniqueness/ hash of model files (stl etc):
  
      ????
  
  
  All part instances in assemblies (since annotations **depend** on assemblies)
  should have uuids, this way, no problem with reordering, id overlaps etc etc
  or short ids, since collision can only be local ?
  
  ie either
  
        7c7b8605-dcd2-41f1-a913-4ecc0215b298
        
  or
  
        z5KyMg
        
  

Mesh file (instance) requirements, load ordering etc
----------------------------------------------------

- "part waiter" : if you need to wait for meshes to load (load time of the 
hierarchies is trivial, unlike meshes) you can use part waiters (deferreds/promises) to
hold off doing actions until the meshes are actually loaded

- note: they should be called instanceMesh waiters

ANNOTATIONS
===========

  - Annotations are attached to implementation INSTANCES , NOT to implementations
  (although since all instances of an implementation are the same it may not 
  always matter, except for relationships/annotations BETWEEN objects )
  
  - this means that the objectIds in the annotations data structures should refer
  to INSTANCES not IMPLEMENTATIONS
  
  - actually we need both or for it to be user settable:
    this means : we need 
      * a partId/ hash
      * an instance id/hash

  - partIds : via bom ?
  - instanceIDs: numeric, uuid ??
  - needs to be recallable with bare-bones systems

USER INTERACTIONS
=================

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
 
 
Web/remote API interactions:
----------------------------

- optimstic: always assume things have succeeded, deal with errors later:
this allows the interaction to be fast (since it is local to the editor)
 
Order of precendence with mouse interactions:
---------------------------------------------
 1) object transformations
 2) camera movements
 3) object picking/selection
 
 - Annotations are "closer" to the user: do not let taps/clicks
 fall through
 
 important stuff
 ---------------

  USER drags a MESH file onto viewer:
  - if already registered, just add it to view

  WHEN MOVING/ROTATING THE CAMERA:

  - make all annotations NOT selectable
  - prevent any other interactions


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

- how do we deal with "hidden" changes: ie if a root objects gets deleted, all its children get
deleted too, but it still is only one "undo redo action"

- persistance: perhaps even (simple) undo redo operations could be stored/reloaded?


  #undoable actions
    General:
      * add or remove 3d mesh/part
      * translate, rotate, scale
      * edit properties (name)
    
    Annotations:
      * add or remove
      * edit properties (name, text)
      * switch between instance and class 
  

  extra spicy:
  ------------
  - get coordinates of drag & drop on screen, unproject, and put objects where you drag them in the 3d view
  
  
 


 


