
Polymer('ulti-viewer', Polymer.mixin({
  /**
   * toggle to show grid or not
   * 
   * @attribute showGrid
   * @type boolean
  */
  showGrid: false,
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
  bom         : [],
  assembly    : {},//assembly or hierarchy ?
  
  parts: {},
  partWaiters: {},
  partMeshInstances:{},
  
  //TODO: do seperation between selected MESHES/3D objects and selected "data" objects/entitities
  //reminder: meshes are just REPRESENTATIONS of "entities"
  //entities can be: Parts (or should that be part instances?) , annotations
  
  selectedEntity: null,
  
  /*
    This is used when more than one mesh/object is selected 
  */
  _selectionGroup: null,
  
  
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
  
  
  observe:{
    'selectedObject.parent':'selectedObjectParentChanged'
  },
  
  created: function()
  {
    this.resources = [];
    this.meshes    = [];
    
    this.settings = {
      minObjectSize: 20,//minimum size (in arbitrarty/opengl units) before requiring re-scaling (upwards)
      maxObjectSize: 200//maximum size (in arbitrarty/opengl units) before requiring re-scaling (downwards)
    }
    
    //helpers
    this._zoomInOnObject = new ZoomInOnObject();
    
    //TODO: remove this, just temporary
    this.bom = [];
    this.design = {
      //_editable:true //extra settable flags, runtime
    };
    
    //bom, assemblies etc, are all files in the root path of design's url
    
    //FIXME/ experimental 
    this.assembly = {
      children: []
    }
    
    var Nested = window.Nested;
    var self = this;
    Nested.observe(this.assembly, function( bla ){
      console.log("change in assembly", bla);
      localStorage.setItem("ultiviewer-data-assembly", JSON.stringify( self.assembly ) );
    })
    /*Nested.unobserve(this.assembly, function( bla ){
      console.log("change in assembly(unobserve)", bla);
      localStorage.setItem("ultiviewer-data-assembly", JSON.stringify( self.assembly ) );
    })
    Nested.deliverChangeRecords(function(blo){
      console.log("blo", blo);
    })*/
    
    
    //alternative key binding
    var self = this;
    key('delete', function(){ 
      self.deleteObject();
    });
    key('⌘+r,ctrl+d', function(){ 
      self.duplicateObject();
      return false;
    });
    key('⌘+z,ctrl+z', function(){ 
      self.duplicateObject();
    });
    key('⌘+shift+z,ctrl+shift+z', function(){ 
      self.duplicateObject();
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
    
    //FIXME: does this work at all ???
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
    
    /*
    var lastOp = null;
    //time based accumulator, to remove extra operations
    function operationAccumulator( op ){
      if(!lastOp){
        lastOp = op; 
        lastOp._timeStamp = new Date().getTime();
        return op;
        }
        
      var newTime = new Date().getTime();
      var difference = newTime - lastOp._timeStamp;
      lastOp = op; 
      lastOp._timeStamp = newTime;
      console.log( "timeStamp",difference );
      if(lastOp.type === op.type && difference < 30000)
      {
        return op;
      }
      return lastOp;
    }*/
    
    this.addEventListener('newOperation', function(e) {
      var operation = e.detail.msg;
      console.log("newOperation",operation.type, operation);
      self.historyManager.addCommand( operation );
      /*var validOp = operationAccumulator( operation );
      if( validOp )
      {
      }*/
      //if(self.generateCodeOnTheFly) self.generateCodeFromHistory();
    });
    
    //var label = new LabelHelperPlane({text:"255",fontSize:8,color:"#FF00FF"});
    //label.position.x += label.width/2;
    //label.position.y += label.height/2;
    //this.threeJs.scenes["main"].add( label );
    
    
    //FIXME: multi selection
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
  loadMesh:function( uriOrData, options )
  {
    var options     = options || {};
    var display     = options.display === undefined ? true: options.display;
    var keepRawData = options.keepRawData === undefined ? true: options.keepRawData;
    
    if(!uriOrData){ console.warn("no uri or data to load"); return};
    var resourcePromise = this._loadResource( uriOrData );
    
    function loadFailed(res)
    {
      //TODO: do this cleanly via type checking or somethg
      var error = res.error;
      if( error.indexOf("No parser found") != -1)
      {
        error = "sorry, the "+resource.ext+" format is not supported";
      }
    }
    function onDisplayError(error){console.log("FAILED to display",error);};
    
    //FIXME: temporary hack for annotations etc
    var self = this;
    
    function afterAdded( mesh ){ 
      //FIXME: this is wrong, we are not waiting for a part, but for a mesh (implementation)
      //we notify any and all 'waiters' that the part is ready
      //Q deferreds 
      var partId = mesh.userData.part.id;
      self.parts[ partId ] = mesh ;
      self._meshInjectPostProcess( mesh );
    }
    if( display ){
      
      //fire import event ??
      /*resourcePromise.then( function(){
        var operation = new Import(importedPart, resource);
        self.fire('newOperation', {msg: operation});
      });*/
      return resourcePromise.then( this.addToScene.bind(this), onDisplayError ).then(afterAdded);
    }
    return resourcePromise;
    //resourcePromise.then(resource.onLoaded.bind(resource), loadFailed, resource.onDownloadProgress.bind(resource) );
  },
  clearScene:function(sceneName){
    var sceneName = sceneName || "main";
    this.threeJs.clearScene(sceneName);
    
    this.selectedObjects = [];//TODO: move this to three-js element ?
    this.$.cam.resetView();
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
  _loadResource:function(uriOrData)
  {
    var self = this;
    var resource = this.assetManager.loadResource( uriOrData, {parsing:{useWorker:true,useBuffers:true} } );
    this.resources.push( resource );
    
    var resourceDeferred = resource.deferred;
    
    //TODO: UNIFY api for parsers, this is redundant
    function formatResource(resource)
    {
      //geometry
      var shape = resource.data;
      if( !(shape instanceof THREE.Object3D) )
      {
        //console.log("formating resource");
        //nice color: 0x00a9ff
        var material = new THREE.MeshPhongMaterial( { color: 0x17a9f5, specular: 0xffffff, shininess: 5, shading: THREE.FlatShading} );
        //new THREE.MeshLambertMaterial( {opacity:1,transparent:false,color: 0x0088ff} );
        shape = new THREE.Mesh(shape, material);
      }
      
      hashCode = function(s){
        return s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);              
      }

      shape.userData.part = {};
      shape.userData.part.name = resource.name;//"Part"+self.partId;
      shape.userData.part.id = hashCode(resource.uri)//FIXME this is wrong, that is based on mesh file, not for part
      shape.name = resource.name;
      
      
      var partName = resource.name.substr(0, resource.name.lastIndexOf('.')); 
      //check if the implementation (the stl, amf etc) file is already registered as an implementation of 
      //some part
      /*var callback = function( bla )
      {
      
      }
      self.$.dialogs.addEventListener("partInstanceDone", callback, false);*/
      
      if( !self._isPartImplementationInBom( resource.name ) ){
        self.$.dialogs.resource = resource;
        self.$.dialogs.partName = partName;
        self.$.dialogs.partNames = self._getPartNamesFromBom();
        self.$.dialogs.toggle();
        
        //self.$.dialogs.removeEventListener("partInstanceDone", callback);
      }
      
      shape.userData.part.bomId = self._registerImplementationInFakeBOM( resource.uri, partName );
      
      //FIXME ; should this be handled by the asset manager or the parsers ? 
      //ie , this won't work for loaded hierarchies etc
      var geometry = shape.geometry;
      if(geometry)
      {
        geometry.computeVertexNormals();//needed at least for .ply files
        geometry.computeFaceNormals();
      }
      return shape;
    }
    
    var self = this;
    return resourceDeferred.promise
      .then( formatResource)
      .fail( this.resourceLoadFailed.bind(this) );
  },
  resourceLoadFailed:function(resource)
  {
    console.log("failed to load resource", resource.error);
    //do not keep error message on screen for too long, remove it after a while
    this.async(function() {
      this.dismissResource(resource);
    }, null, this.dismissalTimeOnError);
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
  //event handlers
  doubleTapHandler:function( event ){
    //console.log("double tap in viewer", event);
    
    var pickingInfos = event.detail.pickingInfos;
    if(!pickingInfos) return;
    if(pickingInfos.length == 0) return;
    var object = pickingInfos[0].object; 
    //console.log("object double tapped", object);
     
    if(this.selectedObject){
      this._zoomInOnObject.execute( object, {position:pickingInfos[0].point} );
    }
  },
  urlParamsFoundHandler:function( event ){
    var urlParams = event.detail.params;
    //console.log("URLparams", urlParams);
    if("modelUrl" in urlParams)
    {
      for( var i=0;i<urlParams["modelUrl"].length;i++)
      {
        this.loadMesh(urlParams["modelUrl"][i],{display:true});
      }
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
        if(selection.material) selection.material.color.setHex( selection.material._oldColor );
        
        //for group move, rotate etc
        THREE.SceneUtils.detach( selection,  selectionGroup, this.threeJs.scenes["main"]);
      }
      selectionGroup.position.set( 0, 0, 0);
      selectionGroup.rotation.set( 0, 0, 0);
      selectionGroup.scale.set( 1, 1, 1);
    }
    
   if(newSelections){
      for(var i=0;i<newSelections.length;i++)
      {
        var selection = newSelections[i];
        if(selection.material){
          selection.material._oldColor = selection.material.color.getHex( );
          selection.material.color.setHex( 0xFF0000 );
        }
        
        THREE.SceneUtils.attach( selection, this.threeJs.scenes["main"], selectionGroup);
      }
      
      if(newSelections.length >1 ){
        this.selectedObject = selectionGroup;
      }
      else{
        this.selectedObject = newSelections[0];
      }
    }
    return;
  
    //console.log("selectedObjectsChanged", this.selectedObjects);
    if(this.selectedObjects)
    {
      if(this.selectedObjects.length>0)
      {
        this.selectedObject = this.selectedObjects[0];
        //
        //FIXME: unify data structures between parts & annotations
        if(this.selectedObject.userData.data) this.selectedEntity = this.selectedObject.userData.data;
        if(this.selectedObject.userData.part) this.selectedEntity = this.selectedObject.userData.part;
      }
      else{
        this.selectedObject = null;
        this.selectedEntity = null;
      }
    }
    
    //console.log("selectedObjects", this.selectedObjects );
    
    /*
     if(newSelections && newSelections.length > 0 )
    {
      this.selectedObject = this.selectedObjects[0];
      //FIXME: unify data structures between parts & annotations
      if(this.selectedObject.userData.data) this.selectedEntity = this.selectedObject.userData.data;
      if(this.selectedObject.userData.part) this.selectedEntity = this.selectedObject.userData.part;
    }    
    if(oldSelections && oldSelections.length == 0)
    {
       this.selectedObject = null;
       this.selectedEntity = null;
    }*/
    
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
      //this.outlineObject( newSelection, oldSelection );
      if(this.selectionZoom) this._zoomInOnObject.execute( newSelection );
      
      
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
  
  //FIXME : weird hack to solve issues with undo redo operations that add/remove items
  //from the scene : a removed item is 'invisible', so selectedObject should become null
  selectedObjectParentChanged:function(){
    if(!this.selectedObject) return
    //console.log("dfsdfdsf", this.selectedObject.parent);
    if(!this.selectedObject.parent){
      this.selectedObject = null;
      this.selectedEntity = null;
    }
  },
  //important data structure change watchers, not sure this should be here either
  activeToolChanged:function(oldTool,newTool){
    //console.log("activeToolChanged",oldTool,newTool, this.activeTool);
  },
  toolCategoryChanged:function(oldCateg,newCateg){
    //console.log("toolCategoryChanged",oldCateg,newCateg, this.toolCategory);
  },
  /*
  assemblyChanged:function(oldAssembly, newAssembly){
    console.log("assembly changed", newAssembly);
  },*/
  
  /*
  xRayTest:function(){
    var scene = this.threeJs.getScene("main");
    scene = this.selectedObject;
    scene.traverse(function( child ) {
		  if ( child.material && child instanceof THREE.Mesh ){
		    //child.material.highlight( flag );
		    child.material.blending = THREE.AdditiveBlending;//AdditiveAlphaBlending;//AdditiveBlending;
        child.material.transparent=true;
        child.material.opacity = 0.99;
        child.material.side = THREE.BackSide;
		  }
    });
    
  },*/
  //various
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
      var target = this.parts[ annotation.partId] ;//this.selectedEntity;
      
      if( annotation.type !== "note") {
        overlay.style.visibility = "hidden";
        continue;
      }
          //this.$.noteContent.style.opacity = 0;
          //this.$.noteContent.style.visibility="hidden";
      
      if( !target) return;
      //if( target.object !== annotation.partId ) continue;
      overlay.style.visibility = "visible";
      var overlayEl = overlay;
      var position = new THREE.Vector3().fromArray( annotation.position );
      /*if(!annotation.poi){

        var poi = new THREE.Object3D();
        poi.boundingSphere = new THREE.Sphere(offset.clone(), 15);
        
        //for debugging only
        var foo = new THREE.Mesh( new THREE.BoxGeometry(10,10,10), new THREE.MeshBasicMaterial({color:0xFF0000,wireframe:true}) );
        var foo = new THREE.Mesh( new THREE.SphereGeometry(10,32,32), new THREE.MeshBasicMaterial({color:0xFF0000,wireframe:true}) );
        var bla = offset.clone();
        bla = target.localToWorld( bla );
        foo.position.copy( bla );
        //this.addToScene(foo, "main", {autoCenter:false,autoResize:false,select:false} );
        
        target.add(poi);
        poi.position.copy( bla );
        annotation.poi = poi;
      }*/
      
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
      //console.log("gna",overlay, left, top);
    }
  },
  
  //interactions
  duplicateObject:function(){
    console.log("duplicating selection")
    if(!this.selectedObject) return;
    
    //FIXME: we do not handle AMF etc like files for now (which are already hierarchies
    //and not geometry 
    //FIXME: this is kinda horrible, and not data driven, since we clone A REPRESENTATION
    //OF THE DATA ! not the data itself
    //FIXME: metadta needs to be (mostly) the same
    //Geometry should be pointer to the same data structure
    //TODO: how to deal with objects that are already hieararchies (ie amf ?)
    
    /*when you clone : 
      * userData is the same
      * geometry is the same
      * you get a new mesh/object3d instance (custom pos,rot, scale etc)
    
    */
    var original = this.selectedObject;
    var geom     = original.geometry;
    var mat      = original.material.clone();//we have to clone otherwise hover effects etc are applied to all
    var userData = original.userData;
    
    var partMesh = new THREE.Mesh(geom,mat);
    partMesh.userData = JSON.parse(JSON.stringify( original.userData ));//userData; //FIXME: problem with object pointers, weakrefs are needed
    partMesh.position.copy( original.position );
    partMesh.rotation.copy( original.rotation );
    partMesh.scale.copy(  original.scale );
    
    //FIXME/ make a list of all operations needed to be applied on part meshes
    computeObject3DBoundingSphere( partMesh, true );
    
    this.threeJs.scenes["main"].add( partMesh );
    this._meshInjectPostProcess( partMesh );
    
    //FIXME REFACTOR: add to bom
    console.log("clone userData", partMesh.userData , "mesh registry", this.partMeshInstances);
    //self._unRegisterInstanceFromBom( cloned.userData.part.bomId , selectedObject );
  },
  
  deleteObject:function(){
    console.log("deleting selection");
    var selectedObject = this.selectedObject;
    var selectedEntity = this.selectedEntity;
    
    //var index = this.assembly.children.indexOf(5);
    //this.assembly.children.push( assemblyEntry );
    //console.log("assembly", this.assembly);
    
    
    this.fire( "delete-entity", {entity:selectedEntity} );
    //FIXME: temporary workaround/hack as you cannot dispatch events to children    
    this.$.annotations.deleteEntityHandler(null, {entity:selectedEntity},null );
    
    
        //FIXME: hack
    if( selectedObject && selectedObject.userData ){
      var assembly = this.assembly;
      for(var i=assembly.children.length-1;i>=0;i--){
        if(assembly.children[i].instId == selectedObject.userData.part.instId )
        {
          assembly.children.splice(i, 1);
        }
      }
    }
    
    //fire operation
    if(selectedObject && selectedObject.parent)
    {
      var operation = new Deletion(selectedObject, selectedObject.parent);
      this.fire('newOperation', {msg: operation});
    }
    
    //FIXME: refactor REMOVAL FROM BOM
    try{
      this._unRegisterInstanceFromBom( selectedObject.userData.part.bomId , selectedObject );
    }catch(error){} //FIXME: only works for items in bom
    
    if(!selectedObject) return; 
    //FIXME : is this needed ? should the change watcher of annotations/objects
    //deal with it: so far, YES, since annotations do NOT know about their representations
    selectedObject.parent.remove( selectedObject ) ;
    
    this.selectedObject = null;
    this.selectedEntity = null;
    
    //TODO : how to handle deletion's selection removal and undo-redo?
    
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
  //FIXME: obviously, replace this with something real
  /*
    Register an IMPLEMENTATIOn in the bom: an implementation is for example a mesh/ mesh file
    (stl , amf) etc: why an implementation ? because an entity/part can be created in different
    software, different formats etc, it still remains the same entity*/
  _registerImplementationInFakeBOM:function( meshUri, partName ){
    console.log("registering", meshUri, "as implementation of ", partName); 
    if(!partName) throw new Error("no part name specified");
    
    var partIndex = -1;
    var bomEntry = null;
    
    for(var i=0;i<this.bom.length;i++)
    {
      var entry = this.bom[i];
      partIndex = i;
      if(entry.name === partName)
      {
        bomEntry = entry;
        break;
      }
    }
    
    
    if(!bomEntry){
      partIndex += 1; 
      bomEntry = {
        id:partIndex , 
        name:partName,
        description:"",
        version:"0.0.1",
        qty: 0,
        unit:"EA",
        url:"",
        implementations:{"default":meshUri},
        parameters:"",
        _instances:[],
        _instances2:{}
       };
      this.bom.push( bomEntry );
    }
    console.log("BOM",this.bom);
    return partIndex;
  },
  
  _isPartImplementationInBom:function( implementationName ){
    for(var i=0;i<this.bom.length;i++)
    {
      var entry = this.bom[i];
      //var implemNames = Object.keys(entry.implementations).map(key => entry.implementations[key]); 
      var implemNames = Object.keys(entry.implementations).map(function (key) {
          return entry.implementations[key];
      });
      
      if(implemNames.indexOf( implementationName ) !== -1)
      {
        return true;
      }
    }
    return false;
  },
  
  _getPartNamesFromBom:function(){
    
    var partNames = this.bom.map(function (obj) {
      return obj.name
    });
    
    return partNames;
  },
  
  _addEmtpyBomEntry:function( partName, description ){
  
      partIndex = this.bom.length-1;
      
      bomEntry = {
      id:partIndex , 
      name:partName,
      description:"",
      version:"0.0.1",
      qty: 0,
      unit:"EA",
      url:"",
      implementations:{"default":""},
      parameters:"",
      _instances2:{}
     };
     
    this.bom.push( bomEntry );
  },
  
  _assignInstanceToSpecificBomEntry:function( instance ){
  
    var partId = instance.userData.part.partId;
    
    this._unRegisterInstanceFromBom( partId, instance );
    this._registerInstanceInBom( partId, instance );
  },
  
  _registerInstanceInBom:function( partId, instance )
  {
    var bomEntry = this.bom[ partId ];
    if(!bomEntry) throw new Error("bad partId specified");
    
    //console.log("registering", instance, "as instance of ", bomEntry.name ); 
    bomEntry._instances.push( instance);
    //FIXME can't we use the length of instances ? or should we allow for human settable variation
    bomEntry.qty += 1;
  },
  
  _unRegisterInstanceFromBom:function( partId, instance ){
    var bomEntry = this.bom[ partId ];
    if(!bomEntry) throw new Error("bad partId specified");
    
    var index = bomEntry._instances.indexOf( instance );
    if( index == -1 ) return;
    
    bomEntry._instances.splice( index, 1 );
    //FIXME can't we use the length of instances ? or should we allow for human settable variation
    bomEntry.qty -= 1;
  },
  
  //mesh insertion post process
  //FIXME: do this better , but where ?
  _meshInjectPostProcess:function( mesh ){
    var self = this;
    //register new instance in the Bill of materials
    self._registerInstanceInBom( mesh.userData.part.bomId, mesh );
    self._registerPartMeshInstance( mesh );
    
    //FIXME: not sure about these, they are used for selection levels
    mesh.selectable      = true;
    mesh.selectTrickleUp = false;
    mesh.transformable   = true;
    //FIXME: not sure, these are very specific for visuals
     mesh.castShadow = true;
    //mesh.receiveShadow = true;
    
    //FIXME: not sure where this should be best: used to dispatch "scene insertion"/creation operation
    var operation = new MeshAddition( mesh );
    //var event = new CustomEvent('newOperation',{detail: {msg: operation}});
    //self.dispatchEvent(event);
    self.historyManager.addCommand( operation );
  },
  
  _registerPartMeshInstance: function( mesh ){
    var userData = mesh.userData;
    var partId   = mesh.userData.part.id;//FIXME : partID VS partInstanceID
    var instId   = "";
    
    if( !this.partMeshInstances[partId] )
    {
      this.partMeshInstances[partId] = [];
    }
    this.partMeshInstances[partId].push( mesh );
    
    if(this.partWaiters[ partId ])
    {
      console.log("resolving mesh for ", partId);
      this.partWaiters[ partId ].resolve( mesh );
    }
    
    //each instance needs a unique uid
    //FIXME: this should not be at the MESH level, so this is the wrong place for that    
    mesh.userData.part.instId = this.generateUUID();
    
    //FIXME: experimental hack , for a more data driven based approach
    
    var assemblyEntry = {
      partId:partId,
      instId:mesh.userData.part.instId, 
      pos: mesh.position.toArray(), 
      rot:mesh.rotation.toArray(), 
      scale:mesh.scale.toArray()
    };
    this.assembly.children.push( assemblyEntry );
    console.log("assembly", this.assembly);
  },
  
  
  //FIXME: here or where?
  undo:function(){
    this.historyManager.undo();
  },
  redo:function(){
    this.historyManager.redo();
  },
  
  shiftPressed:function(){
    //console.log("shift pressed")
  },
 
 //FIXME: taken from three.js , this should be a utility somewhere
 generateUUID: function () {

		// http://www.broofa.com/Tools/Math.uuid.htm

		var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split( '' );
		var uuid = new Array( 36 );
		var rnd = 0, r;

		return function () {

			for ( var i = 0; i < 36; i ++ ) {

				if ( i == 8 || i == 13 || i == 18 || i == 23 ) {

					uuid[ i ] = '-';

				} else if ( i == 14 ) {

					uuid[ i ] = '4';

				} else {

					if ( rnd <= 0x02 ) rnd = 0x2000000 + ( Math.random() * 0x1000000 ) | 0;
					r = rnd & 0xf;
					rnd = rnd >> 4;
					uuid[ i ] = chars[ ( i == 19 ) ? ( r & 0x3 ) | 0x8 : r ];

				}
			}

			return uuid.join( '' );

		};

	}(),
 
 
  //filters
  toFixed:function(o, precision){
    if(!o) return "";
    return o.toFixed(precision);
  },
}, Window.dragAndDropMixin, Window.fullScreenMixin, Window.noScrollMixin, Window.urlParamsMixin));
