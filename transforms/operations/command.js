//operation "class"
Command = function ( type, value, target)
{
  this.type = type;
  this.value = value;
  this.target = target;
}
Command.prototype.clone = function()
{
  throw new Error("not implemented");
}

Command.prototype.undo = function()
{
  throw new Error("not implemented");
}

Command.prototype.redo = function()
{
  throw new Error("not implemented");
}

module.exports = Command;
