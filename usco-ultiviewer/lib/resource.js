function Resource(uri)
{
  this.uri = uri;
  var _uriElems = uri.split("?")
  this.name = _uriElems.shift().split("/").pop();
  this.ext = this.name.split(".").pop().toLowerCase();
  this.queryParams = _uriElems.pop();
  //console.log("params", this.queryParams,"name:",this.name,"ext",this.ext)
  this.fetchProgress = 10;
  this.parseProgress = 0;
  this.totalRawSize = 0;

  //temporary, this needs to be a filter
  this.totalDisplaySize = "";
  this.loaded = false;

  this.error = null;
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
