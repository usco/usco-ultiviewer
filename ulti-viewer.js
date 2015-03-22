
Polymer('ulti-viewer', Polymer.mixin({
  /**
   * toggle to show grid or not
   * 
   * @attribute showGrid
   * @type boolean
  */
  showGrid: true,
  /**
   * toggle to show axes or not
   * 
   * @attribute showAxes
   * @type boolean
  */
  showAxes: false,
  /**
   * toggle to show camera controls or not
   * 
   * @attribute showControls
   * @type boolean
  */
  showControls: false,
  /**
   * toggle to show dimensions of selected object(s)
   * 
   * @attribute showDimensions
   * @type boolean
  */
  showDimensions: true,
  /**
   * toggle to show annotations of selected object(s)
   * 
   * @attribute showAnnotations
   * @type boolean
  */
  showAnnotations: true,
  /**
   * toggle to show the bill of materials
   * 
   * @attribute showBOM
   * @type boolean
  */
  showBOM: false,
  /**
   * toggle for view auto rotation
   * 
   * @attribute autoRotate
   * @type boolean
  */
  autoRotate: false,
  /**
   * toggle to allow selection & autorotate: if false, selecting
   * object(s) stops the autorotation
   * 
   * @attribute selectRotate
   * @type boolean
  */
  selectRotate:true,
  
  /**
   * toggles zooming in on selected object
   * 
   * 
   * @attribute selectionZoom
   * @type boolean
  */
  selectionZoom:false,
  
  /**
   * orientation of the camera: top, left, right, bottom, diagonal
   * 
   * @attribute camOrientation
   * @type string
  */
  camOrientation:"diagonal",
  /**
   * how much time do we wait for before removing loading bar in case of an error
   * 
   * @attribute dismissalTimeOnError
   * @type integer
  */
  dismissalTimeOnError:3000, 
  /**
   * currently selected object (or first in list
   * of currently selected objects)
   * 
   * @attribute selectedObject
   * @type object
  */
  selectedObject : null,
  /**
   * list of all currently selected objects 
   * 
   * @attribute selectedObjects
   * @type list
  */
  selectedObjects:null,
  /**
   * list of all currently loaded resources
   * 
   * @attribute resources
   * @type list
  */
  resources : null, 
  
  //After this point, highly experimental attributes
  activeTool : null,
  toolCategory: null,
  
  design      : {},
  assembly    : {},//assembly or hierarchy ?
  
  parts: {},
  partWaiters: {},
  partMeshInstances:{},
  
  //TODO: do seperation between selected MESHES/3D objects and selected "data" objects/entitities
  //reminder: meshes are just REPRESENTATIONS of "entities"
  //entities can be: Parts (or should that be part instances?) , annotations
  
  selectedEntity: null,
  
  /*
    global flag for interaction modes
  */
  uiMode : "default",
  camActive:false,
  
  camActiveChanged:function(){
    //console.log("this.camActive",this.camActive);
    if(this.camActive)
    {
      this.uiMode = "camera";
    }
    else{
      this.uiMode = "default";
    }
    
    //console.log("this.uiMode",this.uiMode);
  },
  
  appInfos:{
    ns:"youmagineJam",
    name:"Jam!",
    interactions:[
      "Left mouse: select/interact",
      "Right mouse: rotate",
      "Mouse wheel : zoom in/out",
      "Double tap : zoom in on object/point"
    ],
    version:"0.0.2"
  },
  appSettings:{
    grid:{
      show:false,
      size:"",
    },
    bom:{
      show:false,//this belongs in the bom system
    },
    annotations:{
      show:false,
    }
  },
  
  created: function()
  {
    this._kernel = new window.UscoKernel();
    //no need to put this in kernel, this is ui level...or is it ?
    this.selectedEntities = [];
    this.resources = [];
    
    this.settings = {
      minObjectSize: 20,//minimum size (in arbitrarty/opengl units) before requiring re-scaling (upwards)
      maxObjectSize: 200//maximum size (in arbitrarty/opengl units) before requiring re-scaling (downwards)
    }
    
    //helpers
    this._zoomInOnObject = new ZoomInOnObject();
    this._outlineObject  = new OutlineObject();
    
    //bom, assemblies etc, are all files in the root path of design's url
    
    var Nested = window.Nested;
    var self = this;
    Nested.observe(this._kernel.activeAssembly, function( change ){
      self.activeHierarchyStructureChanged( change, self );
    })
    
    //alternative key binding
    key('backspace', function(){ 
      return false
    });
    
    key('delete', function(){ 
      self.deleteObject();
    });
    key('⌘+r,ctrl+d', function(){ 
      self.duplicateObject();
      return false;
    });
    key('⌘+z,ctrl+z', function(){ 
      self.undo();
    });
    key('⌘+shift+z,ctrl+shift+z', function(){ 
      self.redo();
    });
    
    key('m', function(){ 
      self.toTranslateMode();
    });
    key('r', function(){ 
      self.toRotateMode();
    });
    key('s', function(){ 
      self.toScaleMode();
    });
    
    key('F11', function(){ 
      self.handleFullScreen();
    });
    // multiple shortcuts that do the same thing
    /*key('⌘+r, ctrl+r', function(){ });*/
  },
  ready:function(){
    this.threeJs      = this.$.threeJs;
    this.assetManager = this.$.assetManager;
  },
  domReady:function()
  {
    //setup some visual utilities
    this._zoomInOnObject.camera = this.$.cam.object;
    
     //add the selection helper
    //dimensions display helper
    //var ObjectDimensionsHelper = require("ObjectDimensionsHelper");
    
    this.objDimensionsHelper = new ObjectDimensionsHelper({textBgColor:"#ffd200"});
    this.addToScene( this.objDimensionsHelper, "helpers", {autoResize:false, autoCenter:false, persistent:true, select:false } );
    
    this.camViewControls = new CamViewControls({size:9, cornerWidth:1.5,
      //planesColor:"#17a9f5",edgesColor:"#17a9f5",cornersColor:"#17a9f5",
      highlightColor:"#ffd200",
      opacity:0.95},
       [this.$.fooCam]);//[this.$.cam,
    this.camViewControls.init( this.$.fooCam.object, this.$.naviView );
    this.addToScene( this.camViewControls, "naviScene", {autoResize:false, autoCenter:false, persistent:true, select:false } );
    this.$.fooCtrl.init(this.$.fooCam.object, this.$.perspectiveView);
    
    this.threeJs.updatables.push( this.updateOverlays.bind(this) ); 
    
    //FIXME: does this work at all focusing rules are unclear
    this.async(function(){
      this.$.perspectiveView.focus();
    },null,10);
    
    //initialise stuff 
    this.$.transforms.init( this.$.cam.object, this.$.perspectiveView );
    var controls = this.$.transforms.controls;
    this.addToScene( controls, "helpers", {autoResize:false, autoCenter:false, persistent:true, select:false } );
    
    //for fetching any parameters passed to viewer via url
    this.addEventListener("urlparams-found", this.urlParamsFoundHandler, false);
    this.addEventListener("url-dropped", this.urlDroppedHandler, false);
    this.addEventListener("text-dropped", this.textDroppedHandler, false);
    this.addEventListener("files-dropped", this.filesDroppedHandler, false);
    
    //mixin tests
    this.parseUrlParams();
    this.initDragAndDrop();
    this.initFullScreen();
    this.attachNoScroll();
    
    this.historyManager = this.$.history;
    //if we recieve a "newOperation" event, add it to history  
    var self = this;
    
    this.addEventListener('newOperation', function(e) {
      var operation = e.detail.msg;
      console.log("newOperation",operation.type, operation);
      self.historyManager.addCommand( operation );
      
      //FIXME : experimental hack/exp
      if(operation.type === "translation"){
        operation.target.userData.entity.pos = operation.target.position.toArray();
      }
      
      if(operation.type === "rotation"){
        operation.target.userData.entity.rot = operation.target.rotation.toArray().slice( 0, 3 );
      }
      
      if(operation.type === "scale"){
        operation.target.userData.entity.sca = operation.target.scale.toArray();
      }
      //if(self.generateCodeOnTheFly) self.generateCodeFromHistory();
    });
    
    //var label = new LabelHelperPlane({text:"255",fontSize:8,color:"#FF00FF"});
    //label.position.x += label.width/2;
    //label.position.y += label.height/2;
    //this.threeJs.scenes["main"].add( label );
    
    //FIXME: multi selection tools
    this._selectionGroup = new THREE.Object3D();
    this._selectionGroup.name = "ghostGroup";
    this._selectionGroup.transformable = true;
    this.threeJs.scenes["main"].add( this._selectionGroup );
    
  },
  detached:function()
  {
    this.clearResources();
    this.detachDragAndDrop();
    this.detachNoScroll();
  },
  //internal api
  injectPlugin:function(pluginNode){
    //console.log("injecting plug in", pluginNode, pluginNode.methodsToInject);
    //inject plugin's methods
    for(var i=0;i<pluginNode.methodsToInject.length;i++)
    {
      var methodName    = pluginNode.methodsToInject[i];
      if(this[methodName]) throw new Error("Method '"+ methodName+"' already exists, cannot add it to "+this.localName);
      this[methodName]  = pluginNode[methodName];
    }
  },
  //public api
  
  //FIXME: this should be elsewhere, in a design specific 
  loadDesign:function( uriOrData, options ){
    console.log("this would load a design at "+ uriOrData );
    this.design = this._kernel.loadDesign( uriOrData, options, null );    
    return;
    //FIXME ; just for testing, disregard
    var self = this;
    var serverUri = "http://localhost:3080/api/designs/demo-design/documents"; 
    var callback = function (data)
    {
      data.map( function( entry ){
        var path = serverUri+"/"+entry;
        console.log("entry", entry, path);
        self.loadMesh( path, {addToAssembly:false, display:false} );
      });
      
      //hack
      self._kernel.loadActiveAssemblyState( function(){
        //hack
        self.updateVisualsBasedOnEntities(self._kernel.activeDesign.activeAssembly.children);
      } );
      
    }
    
    this.design = this._kernel.loadDesign( uriOrData, options, callback );    
  },
  
  loadMesh:function( uriOrData, options )
  {
    var options     = options || {};
    var display     = options.display === undefined ? true: options.display;
    var addToAssembly= options.addToAssembly === undefined ? true: options.addToAssembly;
    var keepRawData = options.keepRawData === undefined ? true: options.keepRawData;
    
    if(!uriOrData){ console.warn("no uri or data to load"); return};
    var self = this;
    var co = this._kernel.co;
    var resource = this.assetManager.loadResource( uriOrData, {keepRawData:true, parsing:{useWorker:true,useBuffers:true} } );
    this.resources.push( resource );
    
    co(function* (){
      try{
        var meshData = yield resource.deferred.promise;
        //TODO: UNIFY api for parsers, this is redundant
        //geometry
        var shape = resource.data;
        if( !(shape instanceof THREE.Object3D) )
        {
          var material = new THREE.MeshPhongMaterial( { color: 0x17a9f5, specular: 0xffffff, shininess: 5, shading: THREE.FlatShading} );
          shape = new THREE.Mesh(shape, material);
        }
        
        //FIXME ; should this be handled by the asset manager or the parsers ? 
        //ie , this won't work for loaded hierarchies etc
        var geometry = shape.geometry;
        if(geometry)
        {
          geometry.computeVertexNormals();//needed at least for .ply files
          geometry.computeFaceNormals();
        }
        
        //part type registration etc
        //we are registering a yet-uknown Part's type, getting back an instance of that type
        var partKlass = self._kernel.registerPartType( null, null, shape, {name:resource.name, resource:resource} );
        if( addToAssembly ) {
          var part = self._kernel.makePartTypeInstance( partKlass );
          self._kernel.registerPartInstance( part );
        }
        
        if( display || addToAssembly ){
          self._meshInjectPostProcess( shape );
          //self.selectedEntities = [ shape.userData.entity ];
        }
      }catch( error ){
        console.log("failed to load resource", resource.error);
        //do not keep error message on screen for too long, remove it after a while
        self.async(function() {
          self.dismissResource(resource);
        }, null, self.dismissalTimeOnError);
      }
      
    })
  },
  clearScene:function(sceneName){
    var sceneName = sceneName || "main";
    this.threeJs.clearScene(sceneName);
    
    this.selectedObjects = [];//TODO: move this to three-js element ?
    this.$.cam.resetView();
    
    this.selectedEntities = [];
  },
  addToScene:function( object, sceneName, options )
  {
    var options = options || {};
    options.autoCenter = options.autoCenter === undefined ? true: options.autoCenter;
    options.autoResize = options.autoResize === undefined ? false: options.autoResize;
    options.minSize    = options.minSize === undefined ? this.settings.minObjectSize: options.minSize; 
    options.maxSize    = options.maxSize === undefined ? this.settings.maxObjectSize: options.maxSize; 
    options.persistent = options.persistent === undefined ? false: options.persistent; 
    options.select     = options.select === undefined ? true: options.select; 
    
    this.threeJs.addToScene( object, sceneName, options );
    //TODO: should we select the object we added by default ?
    //makes sense for single item viewer ...
    if(options.select) this.selectedObjects = [object]; //this.selectedObject = object;
    return object;
  },
  
  removeFromScene:function( object, sceneName )
  {
    var sceneName = sceneName || "main" ;
    this.threeJs.removeFromScene( object, sceneName );
  },
  clearResources:function()
  {
    this.assetManager.clearResources();
    this.resources = [];
  },
  //remove a resource
  dismissResource:function(resource){
    var index = this.resources.indexOf(resource);
    resource.deferred.reject("cancelling");
    this.assetManager.unloadResource( resource.uri );
    if (index > -1) this.resources.splice(index, 1);
  },
  //////////////////
  //event handlers
  doubleTapHandler:function( event ){
    var pickingInfos = event.detail.pickingInfos;
    if(!pickingInfos) return;
    if(pickingInfos.length == 0) return;
    var object = pickingInfos[0].object; 
    //console.log("object double tapped", object);
    this._zoomInOnObject.execute( object, {position:pickingInfos[0].point} );
  },
  urlParamsFoundHandler:function( event ){
    var urlParams = event.detail.params;
    if("meshUri" in urlParams)
    {
      for( var i=0;i<urlParams["meshUri"].length;i++)
      {
        this.loadMesh(urlParams["meshUri"][i],{display:true});
      }
    }
    //FIXME:should be either or
    if("designUri" in urlParams){
      //TODO: split it out
      this.loadDesign( urlParams[ "designUri" ][0] );
    }
  },
  urlDroppedHandler:function( event ){
    //console.log("urlDroppedHandler",event);
    this.loadMesh( event.detail.data );
  },
  textDroppedHandler:function( event ){
    //console.log("textDroppedHandler",event);
    this.loadMesh( event.detail.data );
  },
  filesDroppedHandler:function( event ){
    //console.log("filesDroppedHandler",event);
    for (var i = 0, f; f = event.detail.data[i]; i++) {
        this.loadMesh( f, {display: true} );
        /*
        var promise = 
        promise.then(function( result ){
        
          console.log("got some results", result ); 
        });*/
    }
  },
  onReqDismissResource:function(event, detail, sender) {
    var resource = sender.templateInstance.model.resource;
    //console.log("resource",resource);
    this.dismissResource( resource );
  },
  objectPicked:function(e){
    /*TODO: externalize all of this into custom elements for
      how to handle event binding ?
      perhaps better to use pub/sub ?
    */
    
    //are we currently moving the camera around ? in that case, do nothing
    if( this.uiMode === "camera" )
    {
      return;
    }
    //FIXME: experimental: try to select the ROOT helper if possible
    var pickingDatas = e.detail.pickingInfos;
    if(!pickingDatas) return;
    if(pickingDatas.length == 0) return;
    //console.log("object picked", e);
    
    var object = pickingDatas[0].object; 
    
    function walkUp( node ){
      if(node){
        if(node instanceof AnnotationHelper){
          return node;
        }
        if( node.parent)
        {
          return walkUp( node.parent );
        }
      }
      return null;
    }
    
    var annotation = walkUp(object);
    if(annotation)
    {
      console.log("found root helper", annotation);
      //this.selectedObject = annotation;
      e.stopImmediatePropagation();
      return;
    }
    this.$.annotations.onPicked( e );
    
    pickingDatas = e.detail.pickingInfos;
    if(pickingDatas.length == 0 || !this.selectedObject) return;
    
    var object= pickingDatas[0].object;//closest point
    
    //FIXME: hardCoded, do this better
    if(this.toolCategory === "annotations" && this.activeTool) return;
    
    //TODO: should be togglable behaviour
    if(this.selectionZoom) this._zoomInOnObject.execute( object );
    //FIXME: weird issue with rescaled models and worldToLocal
  },
  //attribute change handlers
  autoRotateChanged:function()
  {
    var controls = this.$.camCtrl;
    if(this.autoRotate == false ) return;
    
    var rotSpeed = {rotSpeed:0.0};
    var rotSpeedTarget = {rotSpeed:2.0}
    var tween = new TWEEN.Tween( rotSpeed )
    .to( rotSpeedTarget , 1000 )
    .easing( TWEEN.Easing.Linear.None )
    .onUpdate( function () {
      controls.autoRotateSpeed = rotSpeed.rotSpeed;
    } )
    .start();
  },
  highlightedObjectChanged:function(oldHovered,newHovered)
  {
    return;
    console.log("highlightedObjectChanged", oldHovered, newHovered);
    if(oldHovered){ oldHovered.highlight( null ); }
    if(newHovered){
      console.log(newHovered._originalNode );
      newHovered.highlight( newHovered._originalNode );
    }
  },
  selectedObjectsChanged:function(oldSelections, newSelections)
  {
   //for group move, rotate etc
   var selectionGroup = this._selectionGroup;
  
   if(oldSelections){
      
      for(var i=0;i<oldSelections.length;i++)
      {
        var selection = oldSelections[i];
        
        //un-applying outline effect : TODO: not sure about implementation
        this._outlineObject.removeFrom( selection );
        //if(selection.material) selection.material.color.setHex( selection.material._oldColor );
        
        //ONLY for group move, rotate etc beware of side effects !//TODO: deal with deleted objects
        //TODO: it needs to work for all entities , not just parts
        if(oldSelections.length > 1 && this._kernel.isEntityinActiveAssembly( selection.userData.entity ) )
        { 
          THREE.SceneUtils.detach( selection,  selectionGroup, this.threeJs.scenes["main"]);
        }
      }
      selectionGroup.position.set( 0, 0, 0);
      selectionGroup.rotation.set( 0, 0, 0);
      selectionGroup.scale.set( 1, 1, 1);
      
      //
      /*selectionGroup = this._selectionGroup = new THREE.Object3D();
      this._selectionGroup.transformable = true;
      this.threeJs.scenes["main"].add( this._selectionGroup );*/
    }
    
    
   //FIXME entities//FIXME: avoid double loop , see below
   this.selectedEntities = newSelections.filter( function( selection ){
      return ( selection.userData && selection.userData.entity );
   }).map( function( selection ){
    return selection.userData.entity;
   });
    
   if(newSelections){
      var _fakeAvgPos = new THREE.Vector3();//for multi selection only;
      
      for(var i=0;i<newSelections.length;i++)
      {
        var selection = newSelections[i];
        
        //applying outline effect : TODO: not sure about implementation
        this._outlineObject.addTo( selection );
        /*if(selection.material){
          selection.material._oldColor = selection.material.color.getHex( );
          selection.material.color.setHex( 0xFF0000 );
        }*/
        if(newSelections.length >1 ){
          _fakeAvgPos.add( selection.position.clone() );
          THREE.SceneUtils.attach( selection, this.threeJs.scenes["main"], selectionGroup);
        }
      }
      
      if(newSelections.length >1 ){
        this.selectedObject = selectionGroup;
        //if we use the shadow group, its position, rotation need to be the average of all
        //the sub parts?
        /*_fakeAvgPos.divideScalar( newSelections.length )
        selectionGroup.position.copy(  _fakeAvgPos ); 
        
        //trick so the inital , avg position of the group does not matter
        for(var i=0;i<newSelections.length;i++){
          var matrixWorldInverse = new THREE.Matrix4();
		      matrixWorldInverse.getInverse( selectionGroup.matrixWorld );
		      newSelections[i].applyMatrix( matrixWorldInverse );
		      
        }*/
      }
      else{
        this.selectedObject  = newSelections[0];
      }
    }
  },
  selectedObjectChanged:function(oldSelection, newSelection)
  {
    console.log("selectedObjectChanged", this.selectedObject, oldSelection, newSelection);
    var newSelection = this.selectedObject;
    
    if( oldSelection ){
       //FIXME: hack
       if( oldSelection.highlight ){
          oldSelection.highlight( false );
       }
       //this.clearVisualFocusOnSelection();
      if( oldSelection.helpers && ! (oldSelection instanceof AnnotationHelper) )
      {
        //this.objDimensionsHelper.detach( oldSelection );
      }
    }
    if( newSelection ){
      //FIXME: hack
      if( newSelection.highlight ){
        newSelection.highlight( true );
      }
      //FIXME: do this differently ?
      if(this.toolCategory === "annotations" &&  this.activeTool) return;
      
      if(this.showDimensions)
      {
        if(! (newSelection instanceof AnnotationHelper) )
        {
          //this.objDimensionsHelper.attach( newSelection );
          if(!(newSelection.helpers)) newSelection.helpers = {}
        }
      }
      //this.visualFocusOnSelection(newSelection);
    }
  },
  selectedEntityChanged:function( oldEntity, newEntity ){
    console.log("selectedEntity changed", oldEntity, newEntity );
    //FIXME:hack
    if( newEntity && "notes" in newEntity && newEntity.type == "note" ) this.selectedObject =null;
    if( newEntity ){
      newEntity._selected = true;
    }
  },
  selectedEntitiesChanged:function( oldEntities, newEntitites){
    console.log("selectedEntitIES changed", oldEntities, newEntitites );
  },
  
  activeHierarchyStructureChanged:function(changes, self){
    console.log("changes in assembly", changes);// self._kernel.activeAssembly);
    
    //this needs to hook up into the api and current storage system
    self._kernel.saveActiveAssemblyState();
    
    //react to the changes, update visuals
    changes.map( function( change ){
      //get visuals for entities that were removed:
      var removedEntities = change.removed;
      var addedEntities   = [ change.object[ change.index ] ].filter(function(n){ return n != undefined });
      var changePath      = change.path;
      console.log("removedEntities", removedEntities,"addedEntities",addedEntities, "changePath",changePath);
      
      //remove the visuals of the removed entities
      removedEntities.map( function( entity ) {
        var meshInstance = self._kernel.getMeshOfEntity( entity );
        if( meshInstance && meshInstance.parent ){
          meshInstance.parent.remove( meshInstance );
        }
      });
      
      var co = self._kernel.co;
      //add the visuals of the added entities
      addedEntities.map( function( entity ) {
        //FIXME: use methods, not specific data structures
        co(function* (){
          var meshInstance = yield self._kernel.getPartMeshInstance( entity ) ;
          meshInstance.userData.entity = entity;//FIXME : should we have this sort of backlink ?
          if( meshInstance){
            //FIXME/ make a list of all operations needed to be applied on part meshes
            computeObject3DBoundingSphere( meshInstance, true );
            centerMesh( meshInstance ); //FIXME do not use the "global" centerMesh
            
            meshInstance.position.fromArray( entity.pos )
            meshInstance.rotation.fromArray( entity.rot );
            meshInstance.scale.fromArray(  entity.sca );
            
            self.threeJs.scenes["main"].add( meshInstance );
            self._meshInjectPostProcess( meshInstance );
          }
        });
        
      });
    });
    //self.updateVisuals();
  },
  
  //various
  /*experimental : updates content of 3d view based on
    data: 
  */
  updateVisuals:function(){
  },
  
  //FIXME: this is purely visual related, so nothing to do here
  updateOverlays: function(){
    var p, v, percX, percY, left, top;
    var camera = this.$.cam.object;
    var projector = new THREE.Projector();

    var overlays = this.shadowRoot.querySelectorAll("overlay-note");
    
    for(var i=0;i<overlays.length;i++)
    {
      var overlay = overlays[i];
      var number = overlay.number;
      var annotation = this.annotations[number];
      
      //console.log("annotation",annotation,this.selectedEntity);
      var target = this._kernel.entitiesToMeshInstancesMap[ annotation.instId ] ;//this.selectedEntity;
      
      if( !target) return;
      
      if( annotation.type !== "note") {
        overlay.style.visibility = "hidden";
        continue;
      }
          //this.$.noteContent.style.opacity = 0;
          //this.$.noteContent.style.visibility="hidden";
      
      //if( target.object !== annotation.partId ) continue;
      overlay.style.visibility = "visible";
      var overlayEl = overlay;
      var position = new THREE.Vector3().fromArray( annotation.position );
      
      var self = this;
      drawOverlay( overlayEl, position);
    }
    
    function drawOverlay( overlay , offset)
    {
      p = new THREE.Vector3().setFromMatrixPosition( target.matrixWorld );// target.matrixWorld.getPosition().clone();
      p.x += offset.x; 
      p.y += offset.y;
      p.z += offset.z ;
      v = p.clone().project( camera );
      percX = (v.x + 1) / 2;
      percY = (-v.y + 1) / 2;
      
      // scale these values to our viewport size
      left = percX * self.clientWidth;
      top = percY * self.clientHeight;
      
      width = overlay.clientWidth;
      height = overlay.clientHeight;
      width = 30;
      height = 30;
      
      overlay.style.left = (left - width / 2) + 'px'
      overlay.style.top = (top - height / 2) + 'px'
    }
  },
  
  //interactions
  duplicateObject:function(){
    console.log("duplicating selection")
    var self = this;
    //FIXME: how to deal with objects that are already hieararchies (ie amf ?): and not just geometry
    var duplicates = [];
    //multiple selection is handled out of the box
    this.selectedEntities.map( function( entity ){
    
      var duplicateEntity = self._kernel.duplicateEntity( entity );
      duplicates.push( duplicateEntity );
    
    });
    
    this.selectedEntities = [ duplicates ];
  },
  
  deleteObject:function(){
    console.log("deleting selection");
    //TODO : how to handle deletion's selection removal and undo-redo?*/
    var self = this;
    //multiple selection is handled out of the box
    this.selectedEntities.map( function( entity ){
      //get the parent first !
      var parentEntity = self._kernel.activeAssembly.getParentNode( entity );
      
      self._kernel.removeEntity( entity );//remove !== delete
      //dispatch operation event for undo/redo
      self.fire( "delete-entity", {entity:entity} );//FIXME: ughh why the double event?      
      var operation = new Deletion( entity, parentEntity );
      self.fire('newOperation', {msg: operation});
      
    });
    this.selectedObject   = null;
    this.selectedEntity   = null;
    this.selectedEntities = [];
    this.selectedObjects  = [];
  },
  
  toRotateMode:function(){
    this.activeTool = this.activeTool === "rotate" ? null: "rotate";
  }, 
  toTranslateMode:function(){
    this.activeTool = this.activeTool === "translate" ? null: "translate";
  }, 
  toScaleMode:function(){
    this.activeTool = this.activeTool === "scale" ? null: "scale";
  }, 
  //helpers
 
  //mesh insertion post process
  //FIXME: do this better , but where ?
  _meshInjectPostProcess:function( mesh ){
    var self = this;
    //FIXME: not sure about these, they are used for selection levels
    mesh.selectable      = true;
    mesh.selectTrickleUp = false;
    mesh.transformable   = true;
    //FIXME: not sure, these are very specific for visuals
    mesh.castShadow = true;
    //mesh.receiveShadow = true;
    
    //FIXME: not sure where this should be best: used to dispatch "scene insertion"/creation operation
    //var operation = new MeshAddition( mesh );
    //self.historyManager.addCommand( operation );
  },
  updateVisualsBasedOnEntities:function( entities ){
    var self = this;
    entities.map( function( entity ) {
      //FIXME: use methods, not specific data structures
      var meshInstance = self._kernel.getPartMeshInstance( entity ) ;
      meshInstance.userData.entity = entity;//FIXME : should we have this sort of backlink ?
      if( meshInstance){
        computeObject3DBoundingSphere( meshInstance, true );
        centerMesh( meshInstance ); //FIXME do not use the "global" centerMesh
        
        meshInstance.position.fromArray( entity.pos )
        meshInstance.rotation.fromArray( entity.rot );
        meshInstance.scale.fromArray(  entity.sca );
        
        self.threeJs.scenes["main"].add( meshInstance );
        self._meshInjectPostProcess( meshInstance );
      }
    });
  },
  
  //FIXME: here or where?
  undo:function(){
    this.historyManager.undo();
  },
  redo:function(){
    this.historyManager.redo();
  },
  
  //filters
  toFixed:function(o, precision){
    if(!o) return "";
    return o.toFixed(precision);
  },
}, Window.dragAndDropMixin, Window.fullScreenMixin, Window.noScrollMixin, Window.urlParamsMixin));
