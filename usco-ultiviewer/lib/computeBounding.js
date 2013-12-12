
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
