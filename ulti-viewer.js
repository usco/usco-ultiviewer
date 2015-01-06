
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
  showAxes: true,
  /**
   * toggle to show camera controls or not
   * 
   * @attribute showControls
   * @type boolean
  */
  showControls: true,
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
  selectionZoom:true,
  
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
  
  annotations : [],
  activeAnnotation:null,
  hierarchy   : null,
  bom         : null,
  
  parts: {},
  _partWaiters: {},
  _annotationMeshes: [],//list of all annotation 3d meshes
  
  created: function()
  {
    this.resources = [];
    this.meshes    = [];
    
    this.settings = {
      minObjectSize: 20,//minimum size (in arbitrarty/opengl units) before requiring re-scaling (upwards)
      maxObjectSize: 200//maximum size (in arbitrarty/opengl units) before requiring re-scaling (downwards)
    }
    
    //note: annotation positions are relative to their parent
    this.annotations  = [];
    
    //helpers
    this._zoomInOnObject = new ZoomInOnObject();
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
    this.objDimensionsHelper = new ObjectDimensionsHelper({textBgColor:"#ffd200"});
    this.addToScene( this.objDimensionsHelper, "helpers", {autoResize:false, autoCenter:false, persistent:true, select:false } );
    
    this.transformControls = new THREE.TransformControls(this.$.cam.object,this.$.perspectiveView);
    this.addToScene( this.transformControls, "helpers", {autoResize:false, autoCenter:false, persistent:true, select:false } );
    this.transformControls.enabled = false;
    
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
    
    //fetch any parameters passed to viewer via url
    this.getUrlParams();
    
    //mixin tests
    this.initDragAndDrop();
    this.initFullScreen();
    this.attachNoScroll();
    
    this.addEventListener("url-dropped", this.urlDroppedHandler, false);
    this.addEventListener("text-dropped", this.textDroppedHandler, false);
    this.addEventListener("files-dropped", this.filesDroppedHandler, false);
    
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
    var options = options || {};
    var display = options.display === undefined ? true: options.display;
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
      mesh.castShadow = true;
      //mesh.receiveShadow = true;
      var partId = mesh.userData.part.id;
      self.parts[ partId] = mesh ;
      if(self._partWaiters[ partId ])
      {
        //console.log("resolving mesh for ", partId);
        self._partWaiters[ partId ].resolve( mesh );
      }
      
      //FIXME: not sure about these, they are used for selection levels
      mesh.selectable = true;
      mesh.selectTrickleUp = false;
      
    }
    if( display ) return resourcePromise.then( this.addToScene.bind(this), onDisplayError ).then(afterAdded);
    
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
    options.autoResize = options.autoResize === undefined ? true: options.autoResize;
    options.minSize    = options.minSize === undefined ? this.settings.minObjectSize: options.minSize; 
    options.maxSize    = options.maxSize === undefined ? this.settings.maxObjectSize: options.maxSize; 
    options.persistent = options.persistent === undefined ? false: options.persistent; 
    options.select     = options.select === undefined ? true: options.select; 
    
    this.threeJs.addToScene( object, sceneName, options );
    //TODO: should we select the object we added by default ?
    //makes sense for single item viewer ...
    if(options.select) this.selectedObject = object;
    
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
      shape.userData.part.id = hashCode(resource.uri)
      shape.userData.resource = resource;
      shape.name = resource.name;
      
      /*var geometry = shape.geometry;
      if(geometry)
      {
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
        geometry.computeVertexNormals();//needed at least for .ply files
        geometry.computeFaceNormals();
      }*/
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
    if(this.selectedObject){
      this._zoomInOnObject.execute( this.selectedObject, {position:event.detail.pickingInfos[0].point} );
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
        this.loadMesh( f );
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
    console.log("object picked", e);
    //FIXME: experimental: try to select the ROOT helper if possible
    var pickingDatas = e.detail.pickingInfos;
    if(!pickingDatas) return;
    if(pickingDatas.length == 0) return;
    
    var object = pickingDatas[0].object; 
    
    function walkUp( node ){
      if(node){
        if(node instanceof AnnotationHelper){
          return node;
        }
        if( node.parent)
        {
          return walkUp( node.parent);
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
      return
    }
    
    this.$.annotations.onPicked( e );
    var selection = this.$.annotations.getSelection();
    
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
  selectedObjectsChanged:function()
  {
    //console.log("selectedObjectsChanged", this.selectedObjects);
    if(this.selectedObjects)
    {
      if(this.selectedObjects.length>0)
      {
        this.selectedObject = this.selectedObjects[0];
      }
      else{
        this.selectedObject = null;
      }
    }
  },
  selectedObjectChanged:function(oldSelection)
  {
    //console.log("selectedObjectChanged", this.selectedObject);
    var newSelection = this.selectedObject;
    
    //FIXME: hack
    if( oldSelection && oldSelection.highlight ){
      oldSelection.highlight(false);
    }
    if( newSelection && newSelection.highlight ){
      newSelection.highlight(true);
    }
    
    //this.clearVisualFocusOnSelection();
    if( oldSelection && oldSelection.helpers && ! (oldSelection instanceof AnnotationHelper) )
    {
      this.objDimensionsHelper.detach( oldSelection );
      this.transformControls.detach( oldSelection );
    }
    
    //FIXME: do this differently ?
    if(this.toolCategory === "annotations" &&  this.activeTool) return;
    
    //FIXME: keep the red outline ?
    //this.outlineObject( newSelection, oldSelection );
    if(this.selectionZoom) this._zoomInOnObject.execute( newSelection );
    if(newSelection)
    {
      if(this.transformControls.enabled && !(newSelection instanceof AnnotationHelper)){
        this.transformControls.attach( newSelection );
      }
      if(this.showDimensions)
      {
        if(! (newSelection instanceof AnnotationHelper) )
        {
          this.objDimensionsHelper.attach( newSelection );
          if(!(newSelection.helpers)) newSelection.helpers = {}
        }
      }
      //this.visualFocusOnSelection(newSelection);
    }
    
  },
  //important data structure change watchers, not sure this should be here either
  annotationsChanged:function(oldAnnotations, newAnnotations){
    var removedAnnotations = [];
    if(oldAnnotations){
      if(oldAnnotations.length == 1)
      {
        if("removed" in oldAnnotations[0]){
          //console.log("array observer");
          newAnnotations = [ this.annotations[oldAnnotations[0].index ] ];
          removedAnnotations = oldAnnotations[0].removed;
        }
      }
    }
    console.log("annotationschanged", oldAnnotations, newAnnotations, this.annotations);
    /*for(var i=0;i<removedAnnotations.length;i++)
    {
    }*/
    //console.log("parts", this.parts);
    var self = this;
    var Q = require("q");
    
    for(var i=0;i<newAnnotations.length;i++)
    {
      addAnnotation( newAnnotations[i] );
    }
    
    function addAnnotation( annotationData ){
      var annotationHelper = null;
      
      var annotation = {};
      //fixme: hack:
      annotation._orig = annotationData;
      
      
      for (var key in annotationData)
      {
        if(["position","normal","orientation","center","start","mid","end"].indexOf( key ) > -1 )
        {
          annotation[key] = new THREE.Vector3().fromArray( annotationData[key] );
        }
        else if(["object","startObject","midObject","endObject"].indexOf( key ) > -1 ){
          if(!annotation._instances) annotation._instances = {};
          annotation._instances[key] = annotationData[key];//push( annotationData[key] );
        }
        else{
          annotation[key] = annotationData[key];
        }
      }
      //console.log("annotation",annotation);
      
      var partsToWaitFor = [];
      var argNames = [];
      for( var key in annotation._instances  )//var i=0;i<annotation._instances.length;i++)
      {
        var partId = annotation._instances[key];
        
        if(!self._partWaiters[ partId ] )
        {
          self._partWaiters[ partId ] = Q.defer();
        }
        partsToWaitFor.push( self._partWaiters[ partId ].promise );
        argNames.push( key );
        
        //var partIndex = self.parts.indexOf( partId );
        //resolve all waiters where 
        if( partId in self.parts)
        {
          self._partWaiters[ partId ].resolve( self.parts[ partId ] );
        }
      }
      //only add annotation once ALL its dependency parts have been loaded
      Q.all( partsToWaitFor).then(function(res)
      {
        for(var i=0;i<argNames.length;i++)
        {
          var key = argNames[i];
          annotation[key] = res[i];
        }
        finalizeAnnotation();
      });
      
      function finalizeAnnotation(){
        var annotationHelper = null;
        switch(annotation.type)
        {
          case "distance":
            var annotationHelper = new DistanceHelper({arrowColor:0x000000,
              textBgColor:"#ffd200",
              start:annotation.start, end:annotation.end,
              startObject:annotation.startObject,
              endObject:annotation.endObject
              });
            //annotationHelper.position.sub( annotation.startObject.position );
            //annotation.startObject.add( annotationHelper );
            //TODO: uughh do not like this
            //this.threeJs.updatables.push( annotationHelper ); 
            //annotationHelper.set( {start:annotationHelper.start, end:annotationHelper.end} );
            annotationHelper.updatable = true;
            self.addToScene( annotationHelper, "main", {autoResize:false, autoCenter:false, persistent:false, select:false } );
            
          break;
          case "thickness":
            var annotationHelper = new ThicknessHelper({arrowColor:0x000000,
              textBgColor:"#ffd200",
              thickness:annotation.value, point:annotation.position,
              normal: annotation.normal});
              
            annotationHelper.position.sub( annotation.object.position );
            annotation.object.add( annotationHelper );
          break;
          
          case "diameter":
            var annotationHelper = new DiameterHelper({arrowColor:0x000000,
              textBgColor:"#ffd200",
              diameter:annotation.value, orientation:annotation.orientation,
              center:annotation.center});
              
            annotationHelper.position.sub( annotation.object.position );
            annotation.object.add( annotationHelper );
          break;
          case "angle":
            var annotationHelper = new AngularDimHelper({arrowColor:0x000000,
              textBgColor:"#ffd200",
              start:annotation.start, mid: annotation.mid, end:annotation.end,
              startObject:annotation.startObject,
              midObject:annotation.midObject,
              endObject:annotation.endObject});
              
            annotationHelper.position.sub( annotation.startObject.position );
            annotation.startObject.add( annotationHelper );
          break;
          case "note":
            var annotationHelper = new NoteHelper({arrowColor:0x000000,
              textBgColor:"#ffd200",
              point:annotation.position, object:annotation.object})
              
            annotationHelper.position.sub( annotation.object.position );
            annotation.object.add( annotationHelper );
        }
        
        annotationHelper._orig = annotation._orig;
        //store annotation object/mesh
        self._annotationMeshes.push( annotationHelper );
      }
    }
  },
  showAnnotationsChanged:function(oldShowAnnotations, newShowAnnotations){
    var _annotationMeshes = this._annotationMeshes;
    for(var i=0;i<_annotationMeshes.length;i++)
    {
      if(newShowAnnotations){
      _annotationMeshes[i].show();
      }else
      {
        _annotationMeshes[i].hide();
      }
    }
  },
  activeToolChanged:function(oldTool,newTool){
    //console.log("activeToolChanged",oldTool,newTool, this.activeTool);
  },
  toolCategoryChanged:function(oldCateg,newCateg){
    //console.log("toolCategoryChanged",oldCateg,newCateg, this.toolCategory);
  },
  
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
    
  },
  //helpers
 
  //various
  updateOverlays: function(){
    var p, v, percX, percY, left, top;
    var camera = this.$.cam.object;
    var target = this.selectedObject;
    var projector = new THREE.Projector();

    var overlays = this.shadowRoot.querySelectorAll("overlay-note");
    
    for(var i=0;i<overlays.length;i++)
    {
      var overlay = overlays[i];
      var number = overlay.number;
      var annotation = this.annotations[number];
      
      if( annotation.type !== "note") continue;
      if( target.userData.part.id !== annotation.partId ) continue;
      
      var overlayEl = overlay;
      var position = new THREE.Vector3().fromArray( annotation.position );
     
      //position.sub( target.position );
      
      //this.matrixWorld.multiplyMatrices( this.parent.matrixWorld, this.matrix );
      //position.add( 
      //annotationHelper.position.sub( annotation.object.position );
      //annotation.object.add( annotationHelper );
      
      
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
      
      /*if(!overlay.poi)
      {
        overlay.poi = annotation.poi;
        overlay.zoomInOnObject = this.zoomInOnObject.bind(this)
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
  annotationDone:function(e,detail,sender){
    var annotation = detail;
    //console.log("annotation raw", annotation);
    //add annotationData to storage
    for(key in annotation)
    {
      if(annotation[key] instanceof THREE.Vector3)
      {
        annotation[key] = annotation[key].toArray();
      }
      if(annotation[key] instanceof THREE.Object3D)
      {
        annotation.partId = annotation[key].userData.part.id;
        annotation[key] = annotation[key].userData.part.id;
        //delete annotation[key];
      }
      if(key === "point")
      {
        annotation["position"] = annotation[key];
        delete annotation[key];
      }
    }
    console.log("annotation done", annotation);
    this.annotations.push( annotation );
  },
  duplicateObject:function(){
    console.log("duplicating selection")
    if(!this.selectedObject) return;
    
    var cloned = this.selectedObject.clone();
    cloned.material = this.selectedObject.material.clone();
    
    this.addToScene( cloned, "main",{autoResize:false, autoCenter:false } );
  },
  
  deleteObject:function(){
    console.log("deleting selection")
    if(!this.selectedObject) return;
    //this.removeFromScene( this.selectedObject, "main" );
    
    if(this.selectedObject instanceof AnnotationHelper )
    {
      //FIXME how to handle this better
      var annotation = this.selectedObject._orig;
      
      console.log("please remove annotation", annotation);
      var index = this.annotations.indexOf( annotation );
      this.annotations.splice(index, 1);
    }
    
    //FIXME : is this needed ? should the change watcher of annotations/objects
    //deal with it: so far, YES, since annotations do NOT know about their representations
    this.selectedObject.parent.remove( this.selectedObject ) ;
    this.selectedObject = null;
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
  getUrlParams:function( ){
    //see http://stackoverflow.com/questions/1034621/get-current-url-in-web-browser
    var match,
        pl     = /\+/g,  // Regex for replacing addition symbol with a space
        search = /([^&=]+)=?([^&]*)/g,
        decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
        query  = window.location.search.substring(1);

    urlParams = {};
    while (match = search.exec(query))
    {
       var key = decode(match[1]);
       var value = decode(match[2]);
       if( key in urlParams){
        urlParams[key] = [urlParams[key]].concat([value]);
       }else
       {
        urlParams[key] = value
       }
    }
    //console.log("URL", urlParams);
    if("modelUrl" in urlParams)
    {
      if( Object.prototype.toString.call( urlParams["modelUrl"] ) === '[object Array]' )
      {
        for( var i=0;i<urlParams["modelUrl"].length;i++)
        {
          this.loadMesh(urlParams["modelUrl"][i],{display:true});
        }
      }
      else
      {
        this.loadMesh(urlParams["modelUrl"],{display:true});
      }
    }
  },
  //filters
  toFixed:function(o, precision){
    if(!o) return "";
    return o.toFixed(precision);
  },
}, Window.dragAndDropMixin, Window.fullScreenMixin, Window.noScrollMixin));
