import {generateUUID} from "utils";

//FIXME: how much of an overlap with bom ?
//FIXME: how much of an overlap with asset manager?
class PartRegistry{

  //container for all already loaded meshes
  //TODO : should this be a facade ?
  //TODO: is this not redundant with assets, but stored by part id ???
  static partMeshOriginal  = {}; //the original base mesh: ONE PER PART
  static partMeshInstances = {};
  static partMeshInstanceWaiters = {};
  
  
  /* 
    adds the "template mesh" for a given part
    this will be used as a basic instance to clone for all instances
  */
  addTemplateMeshForPart( mesh, partId ){
    this.partMeshOriginal[ partId ] = mesh;
  
  }
  
  
  /* wrapper abstracting whether one needs to wait for the part data or not
  */
  *getEntityMesh(){
    yield someMesh
  }
  
  /* register a instance's 3d mesh
  this needs to be done PER INSTANCE not just once per part
  */
  registerInstanceMesh( mesh, partId ){
    if( !this.partMeshInstances[partId] )
    {
      this.partMeshInstances[partId] = [];
    }
    this.partMeshInstances[partId].push( mesh );
    
    //huh ..FIXME this is just wrong, again confusion PART vs INSTANCE
    if(this.partMeshInstanceWaiters[ partId ])
    {
      console.log("resolving mesh for ", partId);
      this.partWaiters[ partId ].resolve( mesh );
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
