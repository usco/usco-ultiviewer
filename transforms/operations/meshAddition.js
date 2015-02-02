Command = require('./command');

//FIXME: find a better name, this operation is when a mesh/shape/whatever gets added/Created

MeshAddition = function ( value, target)
{
  Command.call( this );
  this.type = "MeshAddition";
  this.value = value;
  this.target = target;
}
MeshAddition.prototype = Object.create( Command.prototype );
MeshAddition.prototype.constructor=MeshAddition;
MeshAddition.prototype.clone = function()
{
  return new MeshAddition( this.value, this.target);
}

MeshAddition.prototype.undo = function()
{
  this._oldParent = this.value.parent;
  this.value.parent.remove(this.value);
  //hack
  //this.value.renderable.visible = false;
}

MeshAddition.prototype.redo = function()
{
  this._oldParent.add(this.value);
  //hack
  //this.value.renderable.visible = true;
}

module.exports = MeshAddition;
