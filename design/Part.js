import {generateUUID} from "utils";

//FIXME: how much of an overlap with bom ?
//FIXME: how much of an overlap with asset manager?
class PartRegistry{

  //container for all already loaded meshes
  //TODO : should this be a facade ?
  //TODO: is this not redundant with assets, but stored by part id ???
  static partMeshTemplates  = {}; //the original base mesh: ONE PER PART
  static _partMeshWaiters   = {};//internal : when
  static partMeshInstances = {};

  
  
  /* 
    adds the "template mesh" for a given part
    this will be used as a basic instance to clone for all instances
    
    FIXME: is this no close to defining a class , of which all instances are...instances?
  */
  addTemplateMeshForPart( mesh, partId ){
    this.partMeshOriginal[ partId ] = mesh;
    
    //anybody waiting for that mesh yet ?
    if( this._partMeshWaiters[ partId ] ){
      console.log("resolving mesh of ", partId );
      this._partMeshWaiters[ partId ].resolve( mesh );
    }
  }
  
  
  /* wrapper abstracting whether one needs to wait for the part's mesh or not
  */
  *getEntityMesh( partId ){
    if( ! this.partMeshOriginal[ partId ] ) return;
    if( ! this._partMeshWaiters[ partId ] ) {
      this._partMeshWaiters[ partId ] = Q.defer();
    }
    
    //partMeshesToWaitFor.push( self.partWaiters[ partId ].promise );
    var mesh = yield this._partMeshWaiters[ partId ];
    return mesh
  }
  
  
  
  /* register a instance's 3d mesh
  this needs to be done PER INSTANCE not just once per part
  */
  registerInstanceMesh( mesh, partId ){
    if( !this.partMeshInstances[ partId ] )
    {
      this.partMeshInstances[ partId ] = [];
    }
    this.partMeshInstances[ partId ].push( mesh );
    
    //do we have ANY meshes for this part
    //if not, add it to templates
    if( ! this._partMeshTemplates[ partId ] ){
      this._partMeshTemplates[ partId ] = mesh;
      this.addTemplateMeshForPart( mesh, partId );
    }
  }
  
}

class Part{
  constructor(name = ""){
    this.name = name;
    this.uid = generateUUID(); //each instance needs a unique uid
  }
}


export Part;
