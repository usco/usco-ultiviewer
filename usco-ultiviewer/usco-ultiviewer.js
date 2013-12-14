function Resource(uri)
{
  this.uri = uri;
  this.name = uri.split("/").pop();
  this.fetchProgress = 10;
  this.parseProgress = 0;
  this.totalRawSize = 0;

  //temporary, this needs to be a filter
  this.totalDisplaySize = "";
  this.loaded = false;
}

Resource.prototype.onLoaded = function()
{
  this.loaded = true;
  
}

Resource.prototype.onLoadFailure = function(error)
{
   this.error = error;
}

Resource.prototype.onDownloadProgress = function(progress)
{
  function bytesToSize(bytes) {
   var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
   if (bytes == 0) return '0 Bytes';
   var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
   return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
  };

  this.totalRawSize = progress.total;
  this.totalDisplaySize = bytesToSize(progress.total);

  var progress = progress.download || 100;
  this.fetchProgress = progress.toFixed(2);
}


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

    console.log("THREE.AMFParser",THREE.AMFParser);
    //this.$.assetsMgr.addParser("amf",THREE.AMFParser);
    //this.$.assetsMgr._assetManager.addParser( "amf",THREE.AMFParser);
  },

  //public api
  loadResource: function(uri, autoCenter, autoResize, display)
  {
      var self = this;
      var autoCenter = autoCenter === undefined ? true: autoCenter;
      var autoResize = autoResize === undefined ? true: autoResize;
      var display = display === undefined ? true: display;

      var resource = new Resource( uri );

      function addResource(res)
      {
        console.log("blabla recieved resource result",res);
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
          //FIXME: should be already in the resource itself
          shape.meta.resource.uri = uri;
          
          self.addToScene(shape);
        }
        else
        {
            console.log("right here");

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
                //resourceData.applyMatrix( new THREE.Matrix4().makeScale( scaling, scaling, scaling ) );
              }
            }
            }catch(error)
            {console.log("failed to auto resize ",error)}
      
            resourceData.meta = {};
            resourceData.meta.resource = res;
            //FIXME: should be already in the resource itself
            resourceData.meta.resource.uri = uri;

            self.addToScene(resourceData);
        }
      }
      
      this.resources.push(resource);

      console.log("loading ", uri)
      var resourcePromise = this._assetManager.load( uri );//this.$.assetsMgr.read( uri );
      resourcePromise.then(addResource.bind(this));
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
		 //link.download = name;
		 this.resources[0].uri;//link.href = this.selectedObject.meta.resource.uri;//
		 link.click();
     console.log("this.selectedObject",this.selectedObject);
     event.preventDefault();
     event.stopPropagation();
  },
  //attribute change handlers
  showGridChanged:function()
	{
		console.log("showGridChanged");//, this.showGrid);
		this.grid.toggle(this.showGrid)
	},
  //helpers
  _associateResourceWithInstance:function()
  {

  }
});
