
Polymer('ulti-viewer', {
  selectedObject : null,
  selectedObjects:null,
  
  showGrid: true,
  showAxes: true,
  showControls: true,
  showDimensions: true,
  autoRotate: false,
  selectRotate:true,//to allow selection & autorotate
  
  resources : null, 
  
  dismissalTimeOnError:3000, //how much time do we wait for before removing loading bar in case of an error
  created: function()
  {
    this.resources = [];
    this.meshes    = [];
    this.minObjectSize = 20;//minimum size (in arbitrarty/opengl units) before requiring re-scaling (upwards)
    this.maxObjectSize = 200;//maximum size (in arbitrarty/opengl units) before requiring re-scaling (downwards)
  },
  attached:function()
  {
    this.threeJs      = this.$.threeJs;
    this.assetManager = this.$.assetManager;
    
    //add the selection helper
    //dimensions display helper
    this.objDimensionsHelper = new ObjectDimensionsHelper();
    this.addToScene( this.objDimensionsHelper, "helpers", {autoResize:false, autoCenter:false, persistent:true} );
    
    //needed since we do not inherit from three-js but do composition
    if (this.requestFullscreen) document.addEventListener("fullscreenchange", this.onFullScreenChange.bind(this), false);
    if (this.mozRequestFullScreen) document.addEventListener("mozfullscreenchange", this.onFullScreenChange.bind(this), false);
    if (this.msRequestFullScreen) document.addEventListener("msfullscreenchange", this.onFullScreenChange.bind(this), false);
    if (this.webkitRequestFullScreen) document.addEventListener("webkitfullscreenchange", this.onFullScreenChange.bind(this), false);
    
    /*//workaround/hack for some css issues:FIXME: is this still necessary??
    try{
    $('<style></style>').appendTo($(document.body)).remove();
    }catch(error){}*/
  },
  detached:function()
  {
    this.clearResources();
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
    if( display ) resourcePromise.then( this.addToScene.bind(this), onDisplayError )
    
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
    options.minSize    = options.minSize === undefined ? this.minObjectSize: options.minSize; 
    options.maxSize    = options.maxSize === undefined ? this.maxObjectSize: options.maxSize; 
    options.persistent = options.persistent === undefined ? false: options.persistent; 
    
    this.threeJs.addToScene( object, sceneName, options );
    //TODO: should we select the object we added by default ?
    //makes sense for single item viewer ...
    this.selectedObject = object;
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
        var shape = new THREE.Mesh(shape, material);
      }
      
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
  //prevents scrolling whole page if using scroll & mouse is within viewer
  onMouseWheel:function (event)
  {
    event.preventDefault();
    return false;
  },
  handleDragOver:function(e) {
    if (e.preventDefault) {
      e.preventDefault();
    }
  },
  handleDrop:function(e)
  {
    if (e.preventDefault) {
      e.preventDefault(); // Necessary. Allows us to drop.
    }
  
    var data = e.dataTransfer.getData("url");
    if( data!= "")
    {
      this.asyncFire('url-dropped', {data:data} );
      this.loadMesh( data );
      return;
    }
    
    var data=e.dataTransfer.getData("Text");
    if( data!= "" ){
        this.asyncFire('text-dropped', {data:data} );
        this.loadMesh( e.detail.data );
        return;
    }

    var files = e.dataTransfer.files;
    if(files)
    {
      this.asyncFire('files-dropped', {data:files});
      for (var i = 0, f; f = files[i]; i++) {
        this.loadMesh( f );
      }
      return;
    }
  },
  onReqDismissResource:function(event, detail, sender) {
    var resource = sender.templateInstance.model.resource;
    //console.log("resource",resource);
    this.dismissResource( resource );
  },
  onDownloadTap:function(event)
  {
     var link = document.createElement("a");
     //TODO: rethink this whole aspect: even when keeping the initial "raw" data
     //things are a bit convoluted : perhaps an intermediary step would be for the viewer
     //to be able to act as a "format converter": once we have working "writers/serialisers"
     //the initial data format would not matter and exporting data would be more clean
     var href = null;
     var download = null;
     
     //walk up the object tree
     function findSelectionsResource(object)
     {
        var currentObject = object;            
        while(currentObject)
        {
           if (!(!currentObject.meta))
           {
              return currentObject;
           }
           currentObject= object.parent;
        }
     }
     resourceRoot = findSelectionsResource(this.selectedObject);

     if( resourceRoot ) href = resourceRoot.meta.resource.uri;
     if( ! href) return;

		 link.href = href;
		 link.click();
     event.preventDefault();
     event.stopPropagation();
  },
  //attribute change handlers
  onFullScreenChange:function()
  {
    //workaround to reset this.fullScreen to correct value when pressing exit etc in full screen mode
    this.fullScreen = !(!document.fullscreenElement &&    // alternative standard method
    !document.mozFullScreenElement && !document.webkitFullscreenElement);
  },
  fullScreenChanged:function()
  {
    if(this.fullScreen)
    {
      if(this.requestFullScreen)this.requestFullScreen();
      if(this.webkitRequestFullScreen)this.webkitRequestFullScreen();
      if(this.mozRequestFullScreen)this.mozRequestFullScreen();
      if(this.msRequestFullscreen)this.msRequestFullscreen();
    }
    else
    {
      if(document.cancelFullScreen) document.cancelFullScreen();
      if(document.webkitCancelFullScreen) document.webkitCancelFullScreen();
      if(document.mozCancelFullScreen) document.mozCancelFullScreen();
      if(document.msCancelFullScreen) document.msCancelFullScreen();
    }
    
  },
  //FIXME
  /*autoRotateChanged:function()
  {
    this.controls.autoRotate = this.autoRotate;

    if(this.autoRotate ==false ) return;
    
    var rotSpeed = {rotSpeed:0.0};
    var rotSpeedTarget = {rotSpeed:2.0}
    var controls = this.controls;
    var tween = new TWEEN.Tween( rotSpeed )
            .to( rotSpeedTarget , 1000 )
            .easing( TWEEN.Easing.Linear.None )
            .onUpdate( function () {
              controls.autoRotateSpeed = rotSpeed.rotSpeed;
            } )
            .start();
  },*/
  highlightedObjectChanged:function(oldHovered,newHovered)
  {
    return;
    //console.log("highlightedObjectChanged",oldHovered,newHovered);
    this.selectionColor = 0xf7c634;//0xff5400;//0xfffccc;
	  this.outlineColor = 0xffc200;
    function validForOutline(selection)
    {
      return (!(selection.hoverOutline != null) && !(selection.outline != null) && !(selection.name === "hoverOutline") && !(selection.name === "boundingCage") && !(selection.name === "selectOutline"))
    }

    var curHovered = this.highlightedObject;

    if (curHovered != null )
    {
      var hoverEffect = new THREE.Object3D();
      var outline, outlineMaterial;
      curHovered.currentHoverHex = curHovered.material.color.getHex();
      curHovered.material.color.setHex(this.selectionColor);
      //curHovered.material.vertexColors = THREE.FaceColors;
      
      //curHovered.currentHoverHexSpec = curHovered.material.specular.getHex();
      //curHovered.material.specular.setHex(this.selectionColor);
      
      //curHovered.material.shininess=8; //.setHex(this.selectionColor);
      outlineMaterial = new THREE.MeshBasicMaterial({
          color: 0xffc200,
          side: THREE.BackSide
        });

      outlineMaterialTest = new THREE.LineBasicMaterial({
          color: 0xffc200,
          linewidth: 10
          //side: THREE.BackSide
        });
      outlineMaterialTest = new THREE.MeshBasicMaterial({ 
          color: 0xffc200,
          wireframe: true, wireframeLinewidth: 4 ,side: THREE.BackSide} );

      outline = new THREE.Object3D();//new THREE.Mesh(curHovered.geometry, outlineMaterial);
      outline.scale.multiplyScalar(1.03);
      outline.name = "hoverOutline";
      curHovered.hoverOutline = outline;
      curHovered.add(outline);
    }
    if(oldHovered != null)
    {
      if (oldHovered.hoverOutline != null)
      {
        oldHovered.material.color.setHex(oldHovered.currentHoverHex);
        //oldHovered.material.specular.setHex(oldHovered.currentHoverHexSpec);
        //oldHovered.material.shininess = 10;

        oldHovered.remove(oldHovered.hoverOutline);
        oldHovered.hoverOutline = null;
      }
    }
  },
  selectedObjectsChanged:function()
  {
    //f96a5e
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
    
    //FIXME: keep the red outline ?
    //this.outlineObject( newSelection, oldSelection );
    this.zoomInOnObject( newSelection );
    
    //this.clearVisualFocusOnSelection();
    if( oldSelection && oldSelection.helpers )
    {
      this.objDimensionsHelper.detach( oldSelection );
    }
    if(newSelection)
    {
      if(this.showDimensions)
      {
        this.objDimensionsHelper.attach( newSelection );
        if(!(newSelection.helpers)) newSelection.helpers = {}
      }
      //this.visualFocusOnSelection(newSelection);
    }
  },
  //helpers
  //FIXME: this is a "helper"/transform/whatever 
  //just like centering , resizing etc... food for thought/
  //refactoring
  //TODO: move these somewhere else, preferably a helper
  focusOnObject  :function(newSelection, oldSelection)
  {
    //visual helper: make objects other than main selection slightly transparent
    if( newSelection ) {
      for(var i = 0; i < this.rootAssembly.children.length;i++)
      {
        var child = this.rootAssembly.children[i];
        if(selection == child)
        {
          child.material.opacity = child.material._oldOpacity;
          child.material.transparent = child.material._oldTransparent;
          continue;
        }
        child.material._oldOpacity = child.material.opacity;
        child.material._oldTransparent = child.material.transparent;
        child.oldRenderDepth = child.renderDepth;
    
        //child.renderDepth = 0;
        //child.material.renderDepth = 0;
        child.material.opacity = 0.3;
        child.material.transparent = true;
      }
    }
    
    if(!newSelection && !oldSelection)
    {
      for(var i = 0; i < this.rootAssembly.children.length;i++)
      {
        var child = this.rootAssembly.children[i];
        child.material.opacity = child.material._oldOpacity;
        child.material.transparent = child.material._oldTransparent;
        //child.renderDepth = child.material._oldRenderDepth;
      }
    }
  },
  zoomInOnObject:function( object , options){
   //possible alternative to resizing : zooming in on objects
    if(!object) return;
    
    var options = options || {};
    
    var proximity = options.proximity === undefined ? 2: options.proximity;
    var zoomTime = options.zoomTime === undefined ? 400: options.zoomTime;
    
    var camera = this.$.cam.object;
    var viewOffset = camera.position.clone().sub( camera.target ) ;
    viewOffset.normalize();
    viewOffset.multiplyScalar( object.boundingSphere.radius*2*proximity );
    var camPos = camera.position.clone();
    var tgt = viewOffset;
    
    if(camPos.equals(tgt))
    {
      //already at target, do nothing
      return;
    }   
    var tween = new TWEEN.Tween( camPos )
      .to( tgt , zoomTime )
      .easing( TWEEN.Easing.Quadratic.In )
      .onUpdate( function () {
        camera.position.copy(camPos);   
      } )
      .start();
   },
   outlineObject:function(newSelection, oldSelection)
  {
    this.selectionColor = 0xfffccc;
    //remove from old selection
    if(oldSelection != null)
    {
      oldSelection.remove(oldSelection.outline);
      oldSelection.cage = null;
      oldSelection.outline = null;
      //oldSelection.material.color.setHex( oldSelection.currentSelectHex );
    }
    //add to new selection
    if(newSelection != null)
    {
        var outlineMaterial = new THREE.MeshBasicMaterial({
          color: 0xff0000,//0xffc200,
          side: THREE.BackSide
        });
        outline = new THREE.Mesh(newSelection.geometry, outlineMaterial);
        outline.name = "selectOutline";
        outline.scale.multiplyScalar(1.02);
        newSelection.outline = outline;
        newSelection.add(outline);
    }
  },
});
