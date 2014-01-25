
Polymer('usco-ultiviewer', {
  selectedObject : null,
  showGrid: false,
  resources : [], //TODO: move this to asset manager ??
  created: function()
  {
    this.super();
    window.PointerGestures.dispatcher.recognizers.hold.HOLD_DELAY = 40;//HACK !!see https://github.com/Polymer/PointerGestures/issues/17

    var AssetManager = require("assetManager");
    var xhrStore = require("usco-xhr-store");
    var stlParser = require("usco-stl-parser");
    var amfParser = require("usco-amf-parser");
    var objParser = require("usco-obj-parser");
    var plyParser = require("usco-ply-parser");
    var ctmParser = require("usco-ctm-parser");
    //console.log("AssetManager",AssetManager, "xhrStore",xhrStore)
    //console.log("stlParser", stlParser, "amfParser",amfParser );

    this._assetManager = new AssetManager();
    this._assetManager.stores["xhr"] = new xhrStore();
    this._assetManager.addParser("stl", stlParser );
    this._assetManager.addParser("amf", amfParser );
    this._assetManager.addParser("obj", objParser );
    this._assetManager.addParser("ply", plyParser );
    this._assetManager.addParser("ctm", ctmParser );

    //prevent timeout
    this._assetManager.stores["xhr"].timeout = 0;
    
  
    this.warningSize = 100000;//byte size above which to display a warning to the user
    this.minObjectSize = 40;//minimum size (in arbitrarty/opengl units) before requiring re-scaling (upwards)
    this.maxObjectSize = 100;//maximum size (in arbitrarty/opengl units) before requiring re-scaling (downwards)

  },
  enteredView:function()
  {
    this.super();
    this.addEventListener('longstatictap', this.onLongstatictap);

    //add grid
    this.grid = new THREE.CustomGridHelper(200,10,this.cameraUp);
    this.grid.toggle(this.showGrid)
	  this.scene.add(this.grid);

    /*experimental*/
    
    /*this.dimensionArrowTest = new SizeArrowHelper(100,10);
    this.scene.add( this.dimensionArrowTest );

    this.diamArrowTest = new DiameterHelper(100,30);
    this.scene.add( this.diamArrowTest );*/

    //this.$.assetsMgr.addParser("amf",THREE.AMFParser);
    //this.$.assetsMgr._assetManager.addParser( "amf",THREE.AMFParser);
  },
  leftView:function()
  {
    //alert("left view")
  },
  //public api
  loadResource: function(uri, autoCenter, autoResize, display, keepRawData)
  {
      var self = this;
      var autoCenter = autoCenter === undefined ? true: autoCenter;
      var autoResize = autoResize === undefined ? true: autoResize;
      var display = display === undefined ? true: display;
      var keepRawData = keepRawData === undefined ? true: keepRawData;

      var resource = new Resource( uri );

      function addResource(res)
      {
        var resourceData = res.data;

        if( !(resourceData instanceof THREE.Object3D) )
        {
          var geometry = resourceData;
          geometry.computeBoundingBox();
				  geometry.computeCentroids();
				  geometry.computeBoundingSphere();

          //needed at least for .ply files
          geometry.computeVertexNormals();
          geometry.computeFaceNormals();

          //var material = new THREE.MeshNormalMaterial();//new THREE.MeshLambertMaterial({ color: 0x00a9ff});//THREE.MeshPhongMaterial( { color: 0x00a9ff, specular: 0xffffff, shininess: 10, shading: THREE.FlatShading} );
          //nice color: 0x00a9ff
          var material = new THREE.MeshPhongMaterial( { color: 0x17a9f5, specular: 0xffffff, shininess: 10, shading: THREE.FlatShading} );
          var shape = new THREE.Mesh(geometry, material);

          //centering hack
          if( autoCenter)
          {
            var offset = geometry.boundingSphere.center;
            geometry.applyMatrix( new THREE.Matrix4().makeTranslation( -offset.x, -offset.y, -offset.z ) );
          }
          //resizing hacks
          if( autoResize)
          {
            var size = geometry.boundingSphere.radius;

            if( size < this.minObjectSize)
            {
              resource.centeringRequired = true;
              var ratio = geometry.boundingSphere.radius/this.minObjectSize;
              var scaling = 1/ratio;
              geometry.applyMatrix( new THREE.Matrix4().makeScale( scaling, scaling, scaling ) );
            }
            else if(size > this.maxObjectSize)
            {
              resource.scalingRequired = true;
              var ratio = geometry.boundingSphere.radius/this.maxObjectSize;
              var scaling = 1/ratio;
              geometry.applyMatrix( new THREE.Matrix4().makeScale( scaling, scaling, scaling ) );
            }
          }
          
          shape.meta = {};
          shape.meta.resource = res;
          self.addToScene(shape);
        }
        else
        {
            try
            {
              if( autoResize)
              {
                var bSphere = computeObject3DBoundingSphere(resourceData);
                var size = bSphere.radius;

                if( size < this.minObjectSize)
                {
                  resource.centeringRequired = true;
                  var ratio = size/this.minObjectSize;
                  var scaling = 1/ratio;
                  resourceData.applyMatrix( new THREE.Matrix4().makeScale( scaling, scaling, scaling ) );
                }
            }
            }catch(error)
            {console.log("failed to auto resize ",error)}
      
     
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
      
      var resourcePromise = this._assetManager.load( uri, null, {keepRawData:keepRawData} );//this.$.assetsMgr.read( uri );
      //console.log("resourcePromise",resourcePromise)
      if (display) resourcePromise.then(addResource.bind(this));
      resourcePromise.then(resource.onLoaded.bind(resource), loadFailed, resource.onDownloadProgress.bind(resource) );
  },
  //event handlers
  onLongstatictap:function(event)
  {
    var event = event.impl || event;
    console.log("LONG STATIC TAP",event.detail.position);
  },
  onLongmovetap:function(event)
  {
    var event = event.impl || event;
    console.log("LONG Move TAP",event.detail.position);
  },
  onDownloadTap:function(event)
  {
     console.log("downloadTap")
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
      /*var rawData = this.selectedObject.meta.resource.rawData;
      var name = this.selectedObject.meta.resource.name;
      var ext = this.selectedObject.meta.resource.name.split(".").pop()
      if(rawData != null) 
      {

        var blob = new Blob([rawData],{type : 'application/'+ext})
        var url = URL.createObjectURL(blob);
        //var blobURL = window.webkitURL.createObjectURL(blob);

        href = url;//rawData;
        link.download = name;
      }*/
     if( ! href) return;

		 link.href = href;
		 link.click();
     event.preventDefault();
     event.stopPropagation();
  },
  dismissResource:function(event, detail, sender) {
    var model = sender.templateInstance.model.resource;
    var index = this.resources.indexOf(model);
    if (index > -1) this.resources.splice(index, 1);
  },
  handleDragOver:function(e) {
    if (e.preventDefault) {
      e.preventDefault();
    }
    //console.log("drag over")
  },
  handleDragEnter:function(e) {
    //console.log("drag enter")
  },
  handleDragLeave:function(e) {
    //console.log("drag leave")
  },
  handleDrop:function(e) {
    //this.classList.remove('over');  // this / e.target is previous target element.
     if (e.preventDefault) {
      e.preventDefault(); // Necessary. Allows us to drop.
    }
    console.log("drag drop",e.dataTransfer);
    var data=e.dataTransfer.getData("Text");
    console.log("data",data)
    if(data)
    {
      this.loadResource(data);
    }
    
    //we have files (desktop dnd)
    var files = e.dataTransfer.files;
    console.log("files",files);
    if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
      console.log('The File APIs are not fully supported in this browser.');
      //TODO: handle error
    }
    else {
      var self= this;
      for (var i = 0, f; f = files[i]; i++) {
        var reader = new FileReader();
        var fileName = f.name;
        console.log("here",f)
        reader.onload = function(e){
          var geometry=  self._assetManager.parsers["stl"].parse(e.target.result);
          var material = new THREE.MeshPhongMaterial( { color: 0x17a9f5, specular: 0xffffff, shininess: 10, shading: THREE.FlatShading} );
          var shape = new THREE.Mesh(geometry, material);
          self.addToScene(shape);
        }

        reader.onprogress = function(e){
          if (e.lengthComputable) {
            var percentage = Math.round((e.loaded * 100) / e.total);
            console.log( 'Loaded : '+percentage+'%'+' of '+fileName);
          }  
        }
        reader.readAsBinaryString(f);
      }
    }
  },
  //attribute change handlers
  showGridChanged:function(){this.grid.toggle(this.showGrid)},
  highlightedObjectChanged:function(oldHovered)
  {
      this.selectionColor = 0xff5400;//0xfffccc;
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

        outline = new THREE.Mesh(curHovered.geometry, outlineMaterial);
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
          oldHovered.remove(oldHovered.hoverOutline);
          oldHovered.hoverOutline = null;
        }
      }
  },
  selectedObjectChanged:function(oldSelection)
  {
    var newSelection = this.selectedObject;
    this.selectObject(newSelection, oldSelection);

    this.clearVisualFocusOnSelection();

    if(oldSelection && oldSelection.helpers)
      {
        var dims = oldSelection.helpers.dims;
        if(dims)
        {
          oldSelection.remove(dims);
          oldSelection.helpers.dims = null;
        }
      }

    if(newSelection)
    {
      //TODO: refactor
      var objDims = new ObjectDimensionsHelper({mesh:newSelection});
      newSelection.add( objDims );
      if(!(newSelection.helpers)) newSelection.helpers = {}
      newSelection.helpers.dims = objDims;
      this.visualFocusOnSelection(newSelection);
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
          //child.renderDepth = child.material._oldRenderDepth;
          /*child.material.renderDepth = 1e20;
          child.material.depthTest=false;
          child.material.depthWrite=false
          child.renderDepth = 1e20;*/
        
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
        //newSelection.currentSelectHex = newSelection.material.color.getHex();
        //newSelection.material.color.setHex(0xff5400);
    }
  },
  //FIXME: for some reason, cannot bind the camera's methods? these are cumbersome
  centerView:function(){
    //this.controls.object.position =  new THREE.Vector3(); //.sub( this.controls.object.position.clone());// 
    this.controls.center = new THREE.Vector3();
    this.camera.centerView();
  },
  rotateViewLeft:function(){
    this.controls.rotateRight();
  },
  rotateViewRight:function(){
    this.controls.rotateLeft();
  },
  rotateViewUp:function(){
    this.controls.rotateDown();
  },
  rotateViewDown:function(){
    this.controls.rotateUp();
  },
  zoomViewIn:function(){
    this.controls.zoomOut();
  },
  zoomViewOut:function(){
    this.controls.zoomIn();
  },
  //prevents scrolling whole page if using scroll & mouse is within viewer
  onMouseWheel:function (event)
  {
    event.preventDefault();
    return false;
  }

});
