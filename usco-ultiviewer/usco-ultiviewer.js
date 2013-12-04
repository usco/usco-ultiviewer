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

computeObject3DBoundingSphere = function(object)
{
  if( object.geometry === undefined)
  {
      var bbox = new THREE.Box3();
  }
  else
  {
    var bbox = object.geometry.boundingBox.clone();
  }
  
  object.traverse(function (child) {
    if (child instanceof THREE.Mesh)
    {
        if( child.geometry !==undefined)
        {
          var childBox = child.geometry.boundingBox.clone();
          childBox.translate( child.localToWorld( new THREE.Vector3() ) );
          bbox.union( childBox );
        }
    }
  });
  return bbox.getBoundingSphere();
}

Polymer('usco-ultiviewer', {
  selectedObject : null,
  showGrid: false,

  resources : [], //TODO: move this to asset manager ??
  created: function()
  {
    this.super();
    this.warningSize = 100000;//byte size above which to display a warning to the user
    this.minObjectSize = 20;//minimum size (in arbitrarty/opengl units) before requiring re-scaling (upwards)
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
  },

  //public api
  loadResource: function(uri, autoCenter, autoResize)
  {
      var self = this;
      var autoCenter = autoCenter === undefined ? true: autoCenter;
      var autoResize = autoResize === undefined ? true: autoResize;

      var resource = new Resource( uri );

      function addResource(res)
      {
        var resourceData = res.resource;//todo: better structure needed

        
    
        if( ! resourceData instanceof THREE.Object3D)
        {
          var geometry = res.resource;
          geometry.computeBoundingBox();
				  geometry.computeCentroids();
				  geometry.computeBoundingSphere();

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
          self.addToScene(shape);
        }
        else
        {
            var bSphere = computeObject3DBoundingSphere(resourceData);
            console.log("bSphere", bSphere);
            if( autoResize)
            {
              var size = bSphere.radius;

              if( size < this.minObjectSize)
              {
                resource.centeringRequired = true;
                var ratio = size/this.minObjectSize;
                var scaling = 1/ratio;
                resourceData.applyMatrix( new THREE.Matrix4().makeScale( scaling, scaling, scaling ) );
              }
            }


            self.addToScene(resourceData);
        }
        
        
        
      }
      
      this.resources.push(resource);

      var resourcePromise = this.$.assetsMgr.read( uri );
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
  //attribute change handlers
  showGridChanged:function()
	{
		console.log("showGridChanged");//, this.showGrid);
		this.grid.toggle(this.showGrid)
	},
  //helpers
});
