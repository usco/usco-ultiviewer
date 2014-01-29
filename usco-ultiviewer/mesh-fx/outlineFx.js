
//some effects should not be combinable : how to ?

function MeshFx(mesh)
{
  this.mesh = mesh;
  
  //store the meshe's original attributes (for those that need changing)
  // so we can set them back when the effect is unapplied
  this.meshOriginalAttributes = {};
  this.object = new THREE.Object3D();
}

MeshFx.prototype.apply = function()
{

}

MeshFx.prototype.unapply = function()
{

}

MeshFx.prototype.validate = function()
{

}
///////////////////////


///////////////////////

function OutlineFx(mesh, color)
{
  MeshFx.call( this );
  this.color = color || 0xffc200;
  this.mesh = mesh;

  if(this.mesh != undefined && this.mesh != null)
  {
    if(!(this.mesh.__objectEffects))
    {
      this.mesh.__objectEffects = {};
    }
  }

  //this.selectionColor = 0xff5400;//0xfffccc;
//this.outlineColor = 0xffc200;
}

OutlineFx.prototype = Object.create( MeshFx.prototype );

OutlineFx.prototype.validate = function(mesh)
{
  return (!(selection.hoverOutline != null) && !(selection.outline != null) && !(selection.name === "hoverOutline") && !(selection.name === "boundingCage") && !(selection.name === "selectOutline"))
}

OutlineFx.prototype.apply = function()
{
  var hoverEffect = new THREE.Object3D();
  var outline, outlineMaterial;

  //hover color
  this.meshOriginalAttributes["color"] = this.mesh.material.color.getHex();
  this.mesh.material.color.setHex(this.color);

  
  outlineMaterial = new THREE.MeshBasicMaterial({
      color: 0xffc200,
      side: THREE.BackSide
    });

  outline = new THREE.Mesh(this.mesh.geometry, outlineMaterial);
  outline.scale.multiplyScalar(1.03);
  outline.name = "hoverOutline";
  //this.mesh.hoverOutline = outline;
  this.object.add(outline);
  this.mesh.add(this.object);
}

OutlineFx.prototype.unApply = function()
{
  this.mesh.material.color.setHex(this.meshOriginalAttributes["color"]);
  this.mesh.remove(hoverOutline);
  this.mesh.hoverOutline = null;
}

