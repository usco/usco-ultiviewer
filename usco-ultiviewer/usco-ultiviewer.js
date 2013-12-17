Polymer('usco-ultiviewer', {
  selectedObject : null,
  showGrid: false,

  resources : [], //TODO: move this to asset manager ??
  created: function()
  {
    this.super();
    var AssetManager = require("assetManager");
    var xhrStore = require("usco-xhr-store");
    var stlParser = require("usco-stl-parser");
    var amfParser = require("usco-amf-parser");
    var objParser = require("usco-obj-parser");
    var plyParser = require("usco-ply-parser");
    //console.log("AssetManager",AssetManager, "xhrStore",xhrStore)
    //console.log("stlParser", stlParser, "amfParser",amfParser );

    this._assetManager = new AssetManager();
    this._assetManager.stores["xhr"] = new xhrStore();
    this._assetManager.addParser("stl", stlParser );
    this._assetManager.addParser("amf", amfParser );
    this._assetManager.addParser("obj", objParser );
    this._assetManager.addParser("ply", plyParser );
  
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

    this.dimensionArrowTest = new SizeArrowHelper(100,10);
    this.scene.add( this.dimensionArrowTest );
    //this.$.assetsMgr.addParser("amf",THREE.AMFParser);
    //this.$.assetsMgr._assetManager.addParser( "amf",THREE.AMFParser);
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
          var material = new THREE.MeshPhongMaterial( { color: 0x00a9ff, specular: 0xffffff, shininess: 10, shading: THREE.FlatShading} );
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
      
      this.resources.push(resource);
      
      var resourcePromise = this._assetManager.load( uri, null, {keepRawData:keepRawData} );//this.$.assetsMgr.read( uri );
      if (display) resourcePromise.then(addResource.bind(this));
      resourcePromise.then(resource.onLoaded.bind(resource), null, resource.onDownloadProgress.bind(resource) );
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
  },
  selectObject:function(newSelection, oldSelection)
  {
    this.selectionColor = 0xfffccc;
    if(oldSelection != null && newSelection != null)
    {    
      console.log("SELECTED object changed",newSelection.name,"OLD",oldSelection.name);
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
  //helpers
  _associateResourceWithInstance:function()
  {

  }
});
