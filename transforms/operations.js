!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var o;"undefined"!=typeof window?o=window:"undefined"!=typeof global?o=global:"undefined"!=typeof self&&(o=self),o.operations=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
Command = require('./command');

AttributeChange = function (target, attrName, oldValue, newValue)
{
  Command.call( this );
  this.type = "attributeChange";
  this.target = target;
  this.attrName = attrName;
  this.value = newValue;
  this.oldValue = oldValue;
  
  console.log("new attribute change operation", target, attrName, newValue, oldValue);
}
AttributeChange.prototype = Object.create( Command.prototype );
AttributeChange.prototype.constructor=AttributeChange;
AttributeChange.prototype.clone = function()
{
  return new AttributeChange( this.target, this.attrName, this.oldValue, this.value );
}

AttributeChange.prototype.undo = function()
{
  console.log("undo attrib change", this.value, this.oldValue, this.attrName);
  this.target.properties[this.attrName][2] = this.oldValue;//update( this.oldAttributes );
  this.target[this.attrName] = this.oldValue;
  
  //this.target.updateRenderables();
  //this.target.attributeChanged(this.attrName,this.oldValue, this.value ); 
}

AttributeChange.prototype.redo = function()
{
  this.target.properties[this.attrName][2] = this.value;//update( this.newAttributes );
  this.target[this.attrName] = this.value;
}

module.exports = AttributeChange;

},{"./command":3}],2:[function(require,module,exports){
Command = require('./command');

Clone = function ( source, target )
{
  Command.call( this );
  this.type = "clone";
  this.source = source;
  this.target = target;
  //this.value = value;
}
Clone.prototype = Object.create( Command.prototype );
Clone.prototype.constructor=Clone;
Clone.prototype.clone = function()
{
  return new Clone( this.source, this.target);
}

Clone.prototype.undo = function()
{
  this._oldParent = this.target.parent;
  this.target.parent.remove(this.target);
  
  //hack
  this.target.renderable.visible = false;
}

Clone.prototype.redo = function()
{
  this._oldParent.add(this.target);
  
  //hack
  this.target.renderable.visible = true;
}

module.exports = Clone;

},{"./command":3}],3:[function(require,module,exports){
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

},{}],4:[function(require,module,exports){
Command = require('./command');

Creation = function (target, parentObject, options)
{
  Command.call( this );
  this.type = "creation";
  this.target = target;
  this.parentObject = parentObject;
  this.value = options;
}
Creation.prototype = Object.create( Command.prototype );
Creation.prototype.constructor=Creation;
Creation.prototype.clone = function()
{
  return new Creation( this.target, this.parentObject, this.value);
}

Creation.prototype.undo = function()
{
  this._oldParent = this.target.parent;
  this.target.parent.remove(this.target);
  
  //semi hack
  if(this.target.renderable)
  {
    this.target.renderable._oldParent = this.target.renderable.parent;
    this.target.renderable.parent.remove(this.target.renderable);
  }
}

Creation.prototype.redo = function()
{
  this._oldParent.add(this.target);
  
  //semi-hack
  if(this.target.renderable)
  {
    this.target.renderable._oldParent.add( this.target.renderable );
  }
}

module.exports = Creation;

},{"./command":3}],5:[function(require,module,exports){
Command = require('./command');

Deletion = function (target, parentObject)
{
  Command.call( this );
  this.type = "deletion";
  this.target = target;
  this.parentObject = parentObject;
}
Deletion.prototype = Object.create( Command.prototype );
Deletion.prototype.constructor=Deletion;
Deletion.prototype.clone = function()
{
  return new Creation( this.target, this.parentObject);
}

Deletion.prototype.undo = function()
{
    this.parentObject.add(this.target);
}

Deletion.prototype.redo = function()
{
  this.parentObject.remove(this.target);
}

module.exports = Deletion;

},{"./command":3}],6:[function(require,module,exports){
Command = require('./command');

Extrusion = function (target, value, sourceShape, parentObject)
{
  Command.call( this );
  this.type = "extrusion";
  this.target = target;
  this.value = value;
  this.sourceShape = sourceShape;
  this.parentObject = parentObject;
}
Extrusion.prototype = Object.create( Command.prototype );
Extrusion.prototype.constructor=Extrusion;
Extrusion.prototype.clone = function()
{
  return new Extrusion( this.target, this.value, this.sourceShape, this.parentObject);
}

Extrusion.prototype.undo = function()
{
    this.parentObject.remove(this.target);
}

Extrusion.prototype.redo = function()
{
  this.parentObject.add(this.target);
}

module.exports = Extrusion;

},{"./command":3}],7:[function(require,module,exports){
Command = require('./command');

Import = function ( value, target)
{
  Command.call( this );
  this.type = "import";
  this.value = value;
  this.target = target;
}
Import.prototype = Object.create( Command.prototype );
Import.prototype.constructor=Import;
Import.prototype.clone = function()
{
  return new Import( this.value, this.target);
}
/*Not sure about this
Import.prototype.execute = function(value)
{
    this.target.position.add(value);
}*/

Import.prototype.undo = function()
{
  this._oldParent = this.value.parent;
  this.value.parent.remove(this.value);
  //hack
  this.value.renderable.visible = false;
}

Import.prototype.redo = function()
{
  this._oldParent.add(this.value);
  //hack
  this.value.renderable.visible = true;
}

module.exports = Import;

},{"./command":3}],8:[function(require,module,exports){
Command = require('./command');

//FIXME: HAAACK !
Intersection = function ( leftOperand, rightOperands, result )
{
  Command.call( this );
  this.type = "intersection";
  this.target = leftOperand;
  this.result = result ;
  this.operands = rightOperands || [];
}
Intersection.prototype = Object.create( Command.prototype );
Intersection.prototype.constructor=Intersection;
Intersection.prototype.clone = function()
{
  return new Intersection( this.target, this.operands, this.result );
}

Intersection.prototype.undo = function()
{
  var resRenderable = this.result.renderable;
  var resRenderableParent = resRenderable.parent;
  resRenderableParent.remove( resRenderable ) ;
  
  //re-add operands to view
  var leftOpRenderable = this.target.renderable;
  resRenderableParent.add( leftOpRenderable );
  
  var operands = this.operands;
  for(var i = 0; i < operands.length;i++)
  {
      var op = operands[i].renderable;
      resRenderableParent.add( op );
  }
}

Intersection.prototype.redo = function()
{
  var leftOpRenderable = this.target.renderable;
  var leftOpRenderableParent = leftOpRenderable.parent;
  leftOpRenderableParent.remove( leftOpRenderable);
  
  leftOpRenderableParent.add(this.result.renderable);
  
  var operands = this.operands;
  for(var i = 0; i < operands.length;i++)
  {
      var op = operands[i].renderable;
      op.parent.remove( op );
  } 
  //target.dispatchEvent( { type: 'shapeChanged' } );
}

module.exports = Intersection;

},{"./command":3}],9:[function(require,module,exports){
Command = require('./command');

Mirror = function ( target, axis)
{
  Command.call( this );
  this.type = "mirroring";
  this.target = target;
  this.value = axis
}
Mirror.prototype = Object.create( Command.prototype );
Mirror.prototype.constructor=Translation;
Mirror.prototype.clone = function()
{
  return new Mirror( this.target, this.value);
}

Mirror.prototype.undo = function()
{
    this.target.mirror(this.value);
}

Mirror.prototype.redo = function()
{
    this.target.mirror(this.value);
}

module.exports = Mirror;

},{"./command":3}],10:[function(require,module,exports){

Command = require('./command');

Creation = require('./creation');
Deletion = require('./deletion');
Clone = require('./clone');
Import = require('./import');
AttributeChange = require('./attributeChange');

Translation = require('./translation');
Rotation = require('./rotation');
Scaling = require('./scaling');

Mirror = require('./mirror');
Extrusion = require('./extrusion');

Union = require('./union');
Subtraction = require('./subtraction2');
Intersection = require('./intersection');





},{"./attributeChange":1,"./clone":2,"./command":3,"./creation":4,"./deletion":5,"./extrusion":6,"./import":7,"./intersection":8,"./mirror":9,"./rotation":11,"./scaling":12,"./subtraction2":13,"./translation":14,"./union":15}],11:[function(require,module,exports){
Command = require('./command');

Rotation = function ( value, target)
{
  Command.call( this );
  this.type = "rotation";
  this.value = value;
  this.target = target;
}
Rotation.prototype = Object.create( Command.prototype );
Rotation.prototype.constructor=Rotation;
Rotation.prototype.clone = function()
{
  return new Rotation( this.value.clone(), this.target);
}

Rotation.prototype.undo = function()
{
    //this.target.position.sub(this.value);
    this.target.rotation.x -= this.value.x;
    this.target.rotation.y -= this.value.y;
    this.target.rotation.z -= this.value.z;
}

Rotation.prototype.redo = function()
{
    this.target.rotation.x += this.value.x;
    this.target.rotation.y += this.value.y;
    this.target.rotation.z += this.value.z;
}

module.exports = Rotation;

},{"./command":3}],12:[function(require,module,exports){
Command = require('./command');

Scaling = function ( value, target)
{
  Command.call( this );
  this.type = "scaling";
  this.value = value;
  this.target = target;
}
Scaling.prototype = Object.create( Command.prototype );
Scaling.prototype.constructor=Scaling;
Scaling.prototype.clone = function()
{
  return new Scaling( this.value.clone(), this.target);
}

Scaling.prototype.undo = function()
{
  this.target.scale.x -= this.value.x;
  this.target.scale.y -= this.value.y;
  this.target.scale.z -= this.value.z;
}

Scaling.prototype.redo = function()
{
  this.target.scale.x += this.value.x;
  this.target.scale.y += this.value.y;
  this.target.scale.z += this.value.z;
}

module.exports = Scaling;

},{"./command":3}],13:[function(require,module,exports){
Command = require('./command');

//FIXME: HAAACK !
Subtraction2 = function ( leftOperand, rightOperands, result)
{
  Command.call( this );
  this.type = "subtraction";
  this.target = leftOperand;
  this.result = result ;
  this.operands = rightOperands || [];

  this._undoBackup = null;
  
}
Subtraction2.prototype = Object.create( Command.prototype );
Subtraction2.prototype.constructor=Subtraction2;
Subtraction2.prototype.clone = function()
{
  return new Subtraction2( this.target, this.operands, this.result );
}
  

Subtraction2.prototype.undo = function()
{
  /*var target = this.target;
  if(!(this._undoBackup)) this._undoBackup = target.geometry.clone();
  target.geometry = this.original.clone();//FIXME: seriously ? how many clones do we need ?*/
  
  //target.updateRenderables();
  //remove resulting shape from view
  var resRenderable = this.result.renderable;
  var resRenderableParent = resRenderable.parent;
  resRenderableParent.remove( resRenderable ) ;
  
  //re-add operands to view
  var leftOpRenderable = this.target.renderable;
  resRenderableParent.add( leftOpRenderable );
  
  var operands = this.operands;
  for(var i = 0; i < operands.length;i++)
  {
      var op = operands[i].renderable;
      resRenderableParent.add( op );
  }
  
}
Subtraction2.prototype.redo = function()
{
  /*var target = this.target;
  target.geometry = this._undoBackup.clone();//FIXME: seriously ? how many clones do we need ?
  
  target.updateRenderables();*/
  var leftOpRenderable = this.target.renderable;
  var leftOpRenderableParent = leftOpRenderable.parent;
  leftOpRenderableParent.remove( leftOpRenderable);
  
  leftOpRenderableParent.add(this.result.renderable);
  
  var operands = this.operands;
  for(var i = 0; i < operands.length;i++)
  {
      var op = operands[i].renderable;
      op.parent.remove( op );
  }
}

module.exports = Subtraction2;

},{"./command":3}],14:[function(require,module,exports){
Command = require('./command');

Translation = function ( value, target)
{
  Command.call( this );
  this.type = "translation";
  this.value = value;
  this.target = target;
}
Translation.prototype = Object.create( Command.prototype );
Translation.prototype.constructor=Translation;
Translation.prototype.clone = function()
{
  return new Translation( this.value.clone(), this.target );
}
/*Not sure about this
Translation.prototype.execute = function(value)
{
    this.target.position.add(value);
}*/

Translation.prototype.undo = function()
{
    this.target.position.sub( this.value );
}

Translation.prototype.redo = function()
{
    this.target.position.add( this.value );
}

module.exports = Translation;

},{"./command":3}],15:[function(require,module,exports){
Command = require('./command');

//FIXME: HAAACK !, should perhaps be closer to esprima node
/*target : result

*/
Union = function ( leftOperand, rightOperands, result )
{
  Command.call( this );
  this.type = "union";
  this.target = leftOperand;
  this.result = result ;
  this.operands = rightOperands || [];
}
Union.prototype = Object.create( Command.prototype );
Union.prototype.constructor=Union;
Union.prototype.clone = function()
{
  return new Union( this.target, this.operands, this.result );
}

Union.prototype.undo = function()
{
  var resRenderable = this.result.renderable;
  var resRenderableParent = resRenderable.parent;
  resRenderableParent.remove( resRenderable ) ;
  
  //re-add operands to view
  var leftOpRenderable = this.target.renderable;
  resRenderableParent.add( leftOpRenderable );
  
  var operands = this.operands;
  for(var i = 0; i < operands.length;i++)
  {
      var op = operands[i].renderable;
      resRenderableParent.add( op );
  }
}
Union.prototype.redo = function()
{
  var leftOpRenderable = this.target.renderable;
  var leftOpRenderableParent = leftOpRenderable.parent;
  leftOpRenderableParent.remove( leftOpRenderable);
  
  leftOpRenderableParent.add(this.result.renderable);
  
  var operands = this.operands;
  for(var i = 0; i < operands.length;i++)
  {
      var op = operands[i].renderable;
      op.parent.remove( op );
  }
}

module.exports = Union;

},{"./command":3}]},{},[10])(10)
});