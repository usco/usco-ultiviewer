
Polymer('ulti-viewer', {
  selectedObject : null,
  selectedObjects:null,
  
  showGrid: true,
  showAxes: true,
  showControls: true,
  showDimensions: true,
  autoRotate: false,
  
  resources : [], 
  created: function()
  {
    this.super();
    this.minObjectSize = 20;//minimum size (in arbitrarty/opengl units) before requiring re-scaling (upwards)
    this.maxObjectSize = 200;//maximum size (in arbitrarty/opengl units) before requiring re-scaling (downwards)
  },
  attached:function()
  {
    this.threeJs      = this.$.threeJs;
    this.assetManager = this.$.assetManager;
    
    /*//workaround/hack for some css issues:FIXME: is this still necessary??
    try{
    $('<style></style>').appendTo($(document.body)).remove();
    }catch(error){}*/
  },
  detached:function()
  {
    this.clearResources({clearCache:true});
  },
  //public api
  loadMesh:function( uriOrData, options )
  {
    var options = options || {};
    var display = options.display === undefined ? true: options.display;
    var keepRawData = options.keepRawData === undefined ? true: options.keepRawData;
    
    var resourcePromise = this.loadResource( uriOrData );
    
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
    if( display ) resourcePromise.then( this.addToScene.bind(this) ).fail(onDisplayError);
    
    //      resourcePromise.then(resource.onLoaded.bind(resource), loadFailed, resource.onDownloadProgress.bind(resource) );
    //possible alternative to resizing : zooming in on objects
          /*var viewOffset = this.camera.position.clone().sub( this.camera.target ) ;
          var stuff =viewOffset.clone().normalize();
          stuff.multiplyScalar( geometry.boundingSphere.radius*4 );
          //this.camera.position.copy(stuff);          
          var camPos = this.camera.position.clone();
          var tgt = stuff;
          var cam = this.camera;
          var tween = new TWEEN.Tween( camPos )
            .to( tgt , 700 )
            .easing( TWEEN.Easing.Quadratic.In )
            .onUpdate( function () {
              cam.position.copy(camPos);   
            } )
            .start();*/
  },
  clearScene:function(sceneName){
    var sceneName = sceneName || "main";
    this.threeJs.clearScene(sceneName);
  },
  addToScene:function( object, sceneName, options )
  {
    var autoCenter = autoCenter === undefined ? true: autoCenter;
    var autoResize = autoResize === undefined ? true: autoResize;
    
    var options = {autoCenter:true,autoResize:true};
    this.threeJs.addToScene( object, sceneName, options );
  },
  removeFromScene:function( object, sceneName )
  {
    this.threeJs.removeFromScene( object,sceneName );
  },
  loadResource:function(uriOrData)
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
        //nice color: 0x00a9ff
        var material = new THREE.MeshPhongMaterial( { color: 0x17a9f5, specular: 0xffffff, shininess: 10, shading: THREE.FlatShading} );
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
    
    //TODO add correctly handling of errors
    var self = this;
    return resourceDeferred.promise.then( formatResource, self.resourceLoadFailed ).fail( self.resourceLoadFailed );
  },
  resourceLoadFailed:function(resource)
  {
    console.log("failed to load resource", resource.error);
  },
  clearResources:function()
  {
    this.assetManager.clearResources();
    this.resources = [];
  },
  //remove a resource
  dismissResource:function(event, detail, sender) {
    var resource = sender.templateInstance.model.resource;
    console.log("resource",resource);
    var index = this.resources.indexOf(resource);
    resource.deferred.reject("canceling");
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
    var data=e.dataTransfer.getData("Text");
    if( data!= "" ){
        this.asyncFire('text-dropped', {data:data} );
        this.loadMesh( e.detail.data );
    }

    var files = e.dataTransfer.files;
    if(files)
    {
      this.asyncFire('files-dropped', {data:files});
      for (var i = 0, f; f = files[i]; i++) {
        this.loadMesh( f );
      }
    }
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
    console.log("highlightedObjectChanged",oldHovered,newHovered);
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
    if(this.selectedObjects)
    {
      if(this.selectedObjects.length>0)
      {
        this.selectedObject = this.selectedObjects[0];
      }
    }
  },
  selectedObjectChanged:function(oldSelection)
  {
    return;
    //FIXME: removed for now
    var newSelection = this.selectedObject;
    this.selectObject(newSelection, oldSelection);

    //this.clearVisualFocusOnSelection();

    if(oldSelection && oldSelection.helpers)
      {

        if(this.showDimensions)
        {
          var dims = oldSelection.helpers.dims;
          if(dims)
          {
            oldSelection.remove(dims);
            oldSelection.helpers.dims = null;
          }
        }
      }

    if(newSelection)
    {
      //TODO: refactor
      if(this.showDimensions)
      {
        var objDims = new ObjectDimensionsHelper({mesh:newSelection});
        newSelection.add( objDims );
        if(!(newSelection.helpers)) newSelection.helpers = {}
        newSelection.helpers.dims = objDims;
      }
      //this.visualFocusOnSelection(newSelection);
      if(this.autoRotate) this.autoRotate = false;//TODO: this should be a selection effect aswell
    }
  },
  //TODO: move this somewhere else, preferably a helper
  visualFocusOnSelection : function(selection)
  {
    //visual helper: make object other than main selection slightly transparent
      //console.log("this.rootAssembly.children",this.renderer)
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
  },
  //TODO: move this somewhere else, preferably a helper
  clearVisualFocusOnSelection : function()
  {
      for(var i = 0; i < this.rootAssembly.children.length;i++)
      {
        var child = this.rootAssembly.children[i];
        child.material.opacity = child.material._oldOpacity;
        child.material.transparent = child.material._oldTransparent;
        //child.renderDepth = child.material._oldRenderDepth;
      }
  },
  selectObject:function(newSelection, oldSelection)
  {
    this.selectionColor = 0xfffccc;
    if(oldSelection != null && newSelection != null)
    {    
      //console.log("SELECTED object changed",newSelection.name,"OLD",oldSelection.name);
    }
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
