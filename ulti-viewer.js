
Polymer('ulti-viewer', {
  selectedObject : null,
  selectedObjects:null,
  showGrid: false,
  showControls: true,
  showDimensions: true,
  autoRotate: true,
  resources : [], 
  created: function()
  {
    this.super();
    this.minObjectSize = 20;//minimum size (in arbitrarty/opengl units) before requiring re-scaling (upwards)
    this.maxObjectSize = 200;//maximum size (in arbitrarty/opengl units) before requiring re-scaling (downwards)
  },
  enteredView:function()
  {
    this.threeJs      = this.$.threeJs;
    this.assetManager = this.$.assetManager;
    //window.PointerGestures.dispatcher.recognizers.hold.HOLD_DELAY = 40;//HACK !!see https://github.com/Polymer/PointerGestures/issues/17
    //this.assetManager.stores["xhr"].timeout = 0;//prevent timeout
    //workaround/hack for some css issues
    try{
    $('<style></style>').appendTo($(document.body)).remove();
    }catch(error){}
  },
  leftView:function()
  {
    this.clearResources({clearCache:true});
  },
  //event handlers
  //prevents scrolling whole page if using scroll & mouse is within viewer
  onMouseWheel:function (event)
  {
    event.preventDefault();
    return false;
  },
  //helpers
  _centerMesh:function( object )
  {
    //TODO: should this be added to our object/mesh classes
    //centering hack
    if(!object.boundingSphere) computeObject3DBoundingSphere( object );
    var offset = object.boundingSphere.center;
    object.applyMatrix( new THREE.Matrix4().makeTranslation( -offset.x, -offset.y, -offset.z ) );
  },
  _resizeMesh:function( object )
  {  
    if(!object.boundingSphere) computeObject3DBoundingSphere( object );
    var size = object.boundingSphere.radius;
    if( size < this.minObjectSize)
    {
      var ratio = object.boundingSphere.radius/this.minObjectSize;
      var scaling = 1/ratio;
      object.applyMatrix( new THREE.Matrix4().makeScale( scaling, scaling, scaling ) );
    }
    else if(size > this.maxObjectSize)
    {
      var ratio = object.boundingSphere.radius/this.maxObjectSize;
      var scaling = 1/ratio;
      object.applyMatrix( new THREE.Matrix4().makeScale( scaling, scaling, scaling ) );
    }
  },  
  //public api
  addToScene:function( object, sceneName )
  {
    var autoCenter = autoCenter === undefined ? true: autoCenter;
    var autoResize = autoResize === undefined ? true: autoResize;
    //if(autoCenter) this._centerMesh( object );
    //if(autoResize) this._resizeMesh( object );
    
    //var geometry = object.geometry;
    //geometry.computeBoundingBox();
        /*geometry.computeBoundingSphere();
        geometry.computeVertexNormals();//needed at least for .ply files
        geometry.computeFaceNormals();*/
    
    this.threeJs.addToScene( object, sceneName );
  },
  removeFromScene:function( object, sceneName )
  {
    this.threeJs.removeFromScene( object,sceneName );
  },
  loadMesh:function( uriOrData )
  {
    function onError(error){console.log("FAIL",error);};
    this.loadResource( uriOrData ).then( this.addToScene.bind(this) ).fail(onError);
  },
  loadResource:function(uriOrData)
  {
    var self = this;
    var resource = this.assetManager.loadResource( uriOrData, {parsing:{useWorker:true,useBuffers:true} } );
    this.resources.push( resource );
    var resourceDeferred = resource.deferred;//this.assetManager.loadResource( uriOrData, {parsing:{useWorker:true} } );
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
    
    function resourceLoadFailed(reason)
    {
      console.log("failed to load resource", error);
    }
    //TODO add correctly handling of errors
    return resourceDeferred.promise.then( formatResource, resourceLoadFailed ).fail( resourceLoadFailed );
  },
  resourceLoadFailed:function(reason)
  {
    console.log("failed to load resource", error);
  },
  loadResource_OLD: function(uri, autoCenter, autoResize, display, keepRawData)
  {
      var self = this;
      var autoCenter = autoCenter === undefined ? true: autoCenter;
      var autoResize = autoResize === undefined ? true: autoResize;
      var display = display === undefined ? true: display;
      var keepRawData = keepRawData === undefined ? true: keepRawData;

      var resource = new Resource( uri );

      function addResource(res)
      {
        this.showControls = true;

        var resourceData = res.data;

        if( !(resourceData instanceof THREE.Object3D) )
        {
          var geometry = resourceData;
          geometry.computeBoundingBox();
				  geometry.computeBoundingSphere();

          //needed at least for .ply files
          geometry.computeVertexNormals();
          geometry.computeFaceNormals();

          //var material = new THREE.MeshNormalMaterial();//new THREE.MeshLambertMaterial({ color: 0x00a9ff});//THREE.MeshPhongMaterial( { color: 0x00a9ff, specular: 0xffffff, shininess: 10, shading: THREE.FlatShading} );
          //nice color: 0x00a9ff
          var material = new THREE.MeshPhongMaterial( { color: 0x17a9f5, specular: 0xffffff, shininess: 10, shading: THREE.FlatShading} );
          var shape = new THREE.Mesh(geometry, material);

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

          shape.meta = {};
          shape.meta.resource = res;
          self.addToScene(shape);
        }
        else
        {
            resourceData.meta = {};
            resourceData.meta.resource = res;
            self.addToScene(resourceData);
        }
      }
      
      function loadFailed(res)
      {
        //console.log("load failed",res.error);
        //TODO: do this cleanly via type checking or somethg
        var error = res.error;
        if( error.indexOf("No parser found") != -1)
        {
          error = "sorry, the "+resource.ext+" format is not supported";
        }
        resource.error = error;
      }

      this.resources.push(resource);
      
      var resourceDeferred = this._assetManager.load( uri, null, {keepRawData:keepRawData} );//this.$.assetsMgr.read( uri );
      var resourcePromise = resourceDeferred.promise;
      //console.log("resourcePromise",resourcePromise)
      if (display) resourcePromise.then(addResource.bind(this));
      resourcePromise.then(resource.onLoaded.bind(resource), loadFailed, resource.onDownloadProgress.bind(resource) );

      this.resouceDeferreds.push( resourceDeferred );
  },

  clearResources:function(options)
  {
    var options = options || {};
    var clearCache = options.clearCache || false;
    //TODO:impact this on asset manager, for cleaner "cleanup"
    while((deferred=this.resouceDeferreds.pop()) != null){
      deferred.reject();
    }
    this.resources = [];

    if( clearCache ) this._assetManager.assetCache = {};
  },
  //event handlers
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
  dismissResource:function(event, detail, sender) {
    var resource = sender.templateInstance.model.resource;
    console.log("resource",resource);
    var index = this.resources.indexOf(resource);
    resource.deferred.reject("canceling");
    this.assetManager.unloadResource( resource.uri );
    if (index > -1) this.resources.splice(index, 1);
  },
  //event handlers  
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
  } ,
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
