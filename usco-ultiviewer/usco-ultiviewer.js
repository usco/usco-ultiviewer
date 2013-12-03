Polymer('usco-ultiviewer', {
  selectedObject : null,
  showGrid: true,
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
  loadResource: function(uri)
  {
      var self = this;
      function addRes(res)
      {
        var material = new THREE.MeshLambertMaterial( {color: 0x0088ff} );
        var shape = new THREE.Mesh(res.resource, material);

        console.log("here", res, shape);
        self.addToScene(shape);
      }
      //this._onResourceLoaded.bind(this) 
      this.$.assetsMgr.read(uri).then(addRes);
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
