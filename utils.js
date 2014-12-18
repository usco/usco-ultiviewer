
var dragAndDropMixin = {
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
    e.dataTransfer.dropEffect = 'copy'; 
    console.log("e",e,e.dataTransfer)
  
    var data = e.dataTransfer.getData("url");
    if( data!= "")
    {
      this.asyncFire('url-dropped', {data:data} );
      return;
    }
    
    var data=e.dataTransfer.getData("Text");
    if( data!= "" ){
        this.asyncFire('text-dropped', {data:data} );
        return;
    }

    var files = e.dataTransfer.files;
    if(files)
    {
      this.asyncFire('files-dropped', {data:files});
      /*for (var i = 0, f; f = files[i]; i++) {
        this.loadMesh( f );
      }*/
      return;
    }
  },
}
