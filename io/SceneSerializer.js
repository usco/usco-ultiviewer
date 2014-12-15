
SceneSerializer = function () {};

SceneSerializer.prototype = {

	constructor: SceneSerializer,

	serialize: function ( scene ) {

		var position = Vector3String( scene.position );
		var rotation = Vector3String( scene.rotation );
		var scale = Vector3String( scene.scale );

		var nobjects = 0;
		var ngeometries = 0;
		var nmaterials = 0;
		var ntextures = 0;

		var objectsArray = [];
		var geometriesArray = [];
		var materialsArray = [];
		var texturesArray = [];

		var geometriesMap = {};
		var materialsMap = {};
		var texturesMap = {};

		// extract objects, geometries, materials, textures

		var checkTexture = function ( map ) {

			if ( ! map ) return;

			if ( ! ( map.id in texturesMap ) ) {

				texturesMap[ map.id ] = true;
				texturesArray.push( TextureString( map ) );
				ntextures += 1;

			}

		};

		var linesArray = [];

		function createObjectsList( object, pad ) {
		

			for ( var i = 0; i < object.children.length; i ++ ) {

				var node = object.children[ i ];
				var ignore = false;

				if ( node instanceof THREE.Mesh ) {

					linesArray.push( MeshString( node, pad ) );
					nobjects += 1;
					
					if(node.userData.resource)
					{
					  console.log("imported mesh", node);
					}

					if ( ! ( node.geometry.id in geometriesMap ) ) {

						geometriesMap[ node.geometry.id ] = true;
						geometriesArray.push( GeometryString( node.geometry ) );
						ngeometries += 1;

					}

					if ( ! ( node.material.id in materialsMap ) ) {

            console.log("material");
						materialsMap[ node.material.id ] = true;
						materialsArray.push( MaterialString( node.material ) );
						nmaterials += 1;

						/*checkTexture( node.material.map );
						checkTexture( node.material.envMap );
						checkTexture( node.material.lightMap );
						checkTexture( node.material.specularMap );
						checkTexture( node.material.bumpMap );
						checkTexture( node.material.normalMap );*/

					}

				} else if ( node instanceof THREE.Light ) {

					//nobjects += 1;
					ignore = true;

				} else if ( node instanceof THREE.Camera ) {

					//nobjects += 1;
					ignore = true;

				}
				//FIXME: should it be so explicit ? or add a serializable flag?
				else if ( node instanceof ShadowPlane ) {

					//nobjects += 1;
					ignore = true;

				}
			  else if ( node instanceof THREE.Object3D ) {

          
					linesArray.push( ObjectString( node, pad ) );
					nobjects += 1;

				}

        if(!ignore)
        {
				  if ( node.children.length > 0 ) {

					  linesArray.push( PaddingString( pad + 1 ) + '\t\t"children" : {' );

				  }

				  createObjectsList( node, pad + 2 );

				  if ( node.children.length > 0 ) {

					  linesArray.push( PaddingString( pad + 1 ) + "\t\t}" );

				  }

				  linesArray.push( PaddingString( pad ) + "\t\t}" + ( i < object.children.length - 1 ? ",\n" : "" ) );
        }
			}

		}

		createObjectsList( scene, 0 );

		var objects = linesArray.join( "\n" );

		// extract fog
    //NOT needed

		// generate sections

		var geometries = generateMultiLineString( geometriesArray, ",\n\n\t" );
		var materials = generateMultiLineString( materialsArray, ",\n\n\t" );
		var textures = generateMultiLineString( texturesArray, ",\n\n\t" );

		// generate defaults

		var activeCamera = null;

		scene.traverse( function ( node ) {

			if ( node instanceof THREE.Camera && node.userData.active ) {

				activeCamera = node;

			}

		} );

		var defcamera = LabelString( activeCamera ? getObjectName( activeCamera ) : "" );
		var deffog = LabelString( scene.fog ? getFogName( scene.fog ) : "" );

		// templates

		function Vector2String( v ) {

			return "[" + v.x + "," + v.y + "]";

		}

		function Vector3String( v ) {

			return "[" + v.x + "," + v.y + "," + v.z + "]";

		}

		function ColorString( c ) {

			return "[" + c.r.toFixed( 3 ) + "," + c.g.toFixed( 3 ) + "," + c.b.toFixed( 3 ) + "]";

		}

		function LabelString( s ) {

			return '"' + s + '"';

		}

		function NumConstantString( c ) {

			var constants = [ "NearestFilter", "NearestMipMapNearestFilter" , "NearestMipMapLinearFilter",
							  "LinearFilter", "LinearMipMapNearestFilter", "LinearMipMapLinearFilter" ];

			for ( var i = 0; i < constants.length; i ++ ) {

				if ( THREE[ constants[ i ] ] === c ) return LabelString( constants[ i ] );

			};

			return "";

		}

		function PaddingString( n ) {

			var output = "";

			for ( var i = 0; i < n; i ++ ) output += "\t";

			return output;

		}


		//

		function ObjectString( o, n ) {

			var output = [

			'\t\t' + LabelString( getObjectName( o ) ) + ' : {',
			'	"position" : ' + Vector3String( o.position ) + ',',
			'	"rotation" : ' + Vector3String( o.rotation ) + ',',
			'	"scale"	   : ' + Vector3String( o.scale ) + ',',
			'	"visible"  : ' + o.visible + ( o.children.length ? ',' : '' )

			];

			return generateMultiLineString( output, '\n\t\t', n );

		}

		function MeshString( o, n ) {

			var output = [

			'\t\t' + LabelString( getObjectName( o ) ) + ' : {',
			'	"geometry" : ' + LabelString( getGeometryName( o.geometry ) ) + ',',
			'	"material" : ' + LabelString( getMaterialName( o.material ) ) + ',',
			'	"position" : ' + Vector3String( o.position ) + ',',
			'	"rotation" : ' + Vector3String( o.rotation ) + ',',
			'	"scale"	   : ' + Vector3String( o.scale ) + ',',
			'	"visible"  : ' + o.visible + ( o.children.length ? ',' : '' )

			];

			return generateMultiLineString( output, '\n\t\t', n );

		}

		//

		function GeometryString( g ) {

			if ( g instanceof THREE.SphereGeometry ) {

				var output = [

				'\t' + LabelString( getGeometryName( g ) ) + ': {',
				'	"type"    : "sphere",',
				'	"radius"  : ' 		 + g.parameters.radius + ',',
				'	"widthSegments"  : ' + g.parameters.widthSegments + ',',
				'	"heightSegments" : ' + g.parameters.heightSegments,
				'}'

				];

			} else if ( g instanceof THREE.BoxGeometry ) {

				var output = [

				'\t' + LabelString( getGeometryName( g ) ) + ': {',
				'	"type"    : "cube",',
				'	"width"  : '  + g.parameters.width  + ',',
				'	"height"  : ' + g.parameters.height + ',',
				'	"depth"  : '  + g.parameters.depth  + ',',
				'	"widthSegments"  : ' + g.widthSegments + ',',
				'	"heightSegments" : ' + g.heightSegments + ',',
				'	"depthSegments" : '  + g.depthSegments,
				'}'

				];

			} else if ( g instanceof THREE.PlaneGeometry ) {

				var output = [

				'\t' + LabelString( getGeometryName( g ) ) + ': {',
				'	"type"    : "plane",',
				'	"width"  : '  + g.width  + ',',
				'	"height"  : ' + g.height + ',',
				'	"widthSegments"  : ' + g.widthSegments + ',',
				'	"heightSegments" : ' + g.heightSegments,
				'}'

				];

			} else if ( g instanceof THREE.Geometry ) {

				if ( g.sourceType === "ascii" || g.sourceType === "ctm" || g.sourceType === "stl" || g.sourceType === "vtk" ) {

					var output = [

					'\t' + LabelString( getGeometryName( g ) ) + ': {',
					'	"type" : ' + LabelString( g.sourceType ) + ',',
					'	"url"  : ' + LabelString( g.sourceFile ),
					'}'

					];

				} else {

					var output = [];

				}

			} else {

				var output = [];

			}

			return generateMultiLineString( output, '\n\t\t' );

		}

		function MaterialString( m ) {

			if ( m instanceof THREE.MeshBasicMaterial ) {

				var output = [

				'\t' + LabelString( getMaterialName( m ) ) + ': {',
				'	"type"    : "MeshBasicMaterial",',
				'	"parameters"  : {',
				'		"color"  : ' 	+ m.color.getHex() + ',',

				m.map ? 		'		"map" : ' + LabelString( getTextureName( m.map ) ) + ',' : '',
				m.envMap ? 		'		"envMap" : ' + LabelString( getTextureName( m.envMap ) ) + ',' : '',
				m.specularMap ? '		"specularMap" : ' + LabelString( getTextureName( m.specularMap ) ) + ',' : '',
				m.lightMap ? 	'		"lightMap" : ' + LabelString( getTextureName( m.lightMap ) ) + ',' : '',

				'		"reflectivity"  : ' + m.reflectivity + ',',
				'		"transparent" : ' + m.transparent + ',',
				'		"opacity" : ' 	+ m.opacity + ',',
				'		"wireframe" : ' + m.wireframe + ',',
				'		"wireframeLinewidth" : ' + m.wireframeLinewidth,
				'	}',
				'}'

				];


			} else if ( m instanceof THREE.MeshLambertMaterial ) {

				var output = [

				'\t' + LabelString( getMaterialName( m ) ) + ': {',
				'	"type"    : "MeshLambertMaterial",',
				'	"parameters"  : {',
				'		"color"  : ' 	+ m.color.getHex() + ',',
				'		"ambient"  : ' 	+ m.ambient.getHex() + ',',
				'		"emissive"  : ' + m.emissive.getHex() + ',',

				m.map ? 		'		"map" : ' + LabelString( getTextureName( m.map ) ) + ',' : '',
				m.envMap ? 		'		"envMap" : ' + LabelString( getTextureName( m.envMap ) ) + ',' : '',
				m.specularMap ? '		"specularMap" : ' + LabelString( getTextureName( m.specularMap ) ) + ',' : '',
				m.lightMap ? 	'		"lightMap" : ' + LabelString( getTextureName( m.lightMap ) ) + ',' : '',

				'		"reflectivity"  : ' + m.reflectivity + ',',
				'		"transparent" : ' + m.transparent + ',',
				'		"opacity" : ' 	+ m.opacity + ',',
				'		"wireframe" : ' + m.wireframe + ',',
				'		"wireframeLinewidth" : ' + m.wireframeLinewidth,
				'	}',
				'}'

				];

			} else if ( m instanceof THREE.MeshPhongMaterial ) {

				var output = [

				'\t' + LabelString( getMaterialName( m ) ) + ': {',
				'	"type"    : "MeshPhongMaterial",',
				'	"parameters"  : {',
				'		"color"  : ' 	+ m.color.getHex() + ',',
				'		"ambient"  : ' 	+ m.ambient.getHex() + ',',
				'		"emissive"  : ' + m.emissive.getHex() + ',',
				'		"specular"  : ' + m.specular.getHex() + ',',
				'		"shininess" : ' + m.shininess + ',',

				m.map ? 		'		"map" : ' + LabelString( getTextureName( m.map ) ) + ',' : '',
				m.envMap ? 		'		"envMap" : ' + LabelString( getTextureName( m.envMap ) ) + ',' : '',
				m.specularMap ? '		"specularMap" : ' + LabelString( getTextureName( m.specularMap ) ) + ',' : '',
				m.lightMap ? 	'		"lightMap" : ' + LabelString( getTextureName( m.lightMap ) ) + ',' : '',
				m.normalMap ? 	'		"normalMap" : ' + LabelString( getTextureName( m.normalMap ) ) + ',' : '',
				m.bumpMap ? 	'		"bumpMap" : ' + LabelString( getTextureName( m.bumpMap ) ) + ',' : '',

				'		"bumpScale"  : ' + m.bumpScale + ',',
				'		"reflectivity"  : ' + m.reflectivity + ',',
				'		"transparent" : ' + m.transparent + ',',
				'		"opacity" : ' 	+ m.opacity + ',',
				'		"wireframe" : ' + m.wireframe + ',',
				'		"wireframeLinewidth" : ' + m.wireframeLinewidth,
				'	}',
				'}'

				];

			} else if ( m instanceof THREE.MeshDepthMaterial ) {

				var output = [

				'\t' + LabelString( getMaterialName( m ) ) + ': {',
				'	"type"    : "MeshDepthMaterial",',
				'	"parameters"  : {',
				'		"transparent" : ' + m.transparent + ',',
				'		"opacity" : ' 	+ m.opacity + ',',
				'		"wireframe" : ' + m.wireframe + ',',
				'		"wireframeLinewidth" : ' + m.wireframeLinewidth,
				'	}',
				'}'

				];

			} else if ( m instanceof THREE.MeshNormalMaterial ) {

				var output = [

				'\t' + LabelString( getMaterialName( m ) ) + ': {',
				'	"type"    : "MeshNormalMaterial",',
				'	"parameters"  : {',
				'		"transparent" : ' + m.transparent + ',',
				'		"opacity" : ' 	+ m.opacity + ',',
				'		"wireframe" : ' + m.wireframe + ',',
				'		"wireframeLinewidth" : ' + m.wireframeLinewidth,
				'	}',
				'}'

				];

			} else if ( m instanceof THREE.MeshFaceMaterial ) {

				var output = [

				'\t' + LabelString( getMaterialName( m ) ) + ': {',
				'	"type"    : "MeshFaceMaterial",',
				'	"parameters"  : {}',
				'}'

				];

			}

			return generateMultiLineString( output, '\n\t\t' );

		}

		function TextureString( t ) {

			// here would be also an option to use data URI
			// with embedded image from "t.image.src"
			// (that's a side effect of using FileReader to load images)

			var output = [

			'\t' + LabelString( getTextureName( t ) ) + ': {',
			'	"url"    : "' + t.sourceFile + '",',
			'	"repeat" : ' + Vector2String( t.repeat ) + ',',
			'	"offset" : ' + Vector2String( t.offset ) + ',',
			'	"magFilter" : ' + NumConstantString( t.magFilter ) + ',',
			'	"minFilter" : ' + NumConstantString( t.minFilter ) + ',',
			'	"anisotropy" : ' + t.anisotropy,
			'}'

			];

			return generateMultiLineString( output, '\n\t\t' );

		}

		//

		function generateMultiLineString( lines, separator, padding ) {

			var cleanLines = [];

			for ( var i = 0; i < lines.length; i ++ ) {

				var line = lines[ i ];

				if ( line ) {

					if ( padding ) line = PaddingString( padding ) + line;
					cleanLines.push(  line );

				}

			}

			return cleanLines.join( separator );

		}

		function getObjectName( o ) {

			return o.name ? o.name : "Object_" + o.id;

		}

		function getGeometryName( g ) {

			return g.name ? g.name : "Geometry_" + g.id;

		}

		function getMaterialName( m ) {

			return m.name ? m.name : "Material_" + m.id;

		}

		function getTextureName( t ) {

			return t.name ? t.name : "Texture_" + t.id;

		}

		function getFogName( f ) {

			return f.name ? f.name : "Default fog";

		}

		//

		var output = [
			'{',
			'	"metadata": {',
			'		"formatVersion" : "0.0.1",',
			'		"type"		: "scene",',
			'		"generatedBy"	: "SceneSerializer",',
			'		"objects"       : ' + nobjects + ',',
			'		"geometries"    : ' + ngeometries + ',',
			'		"materials"     : ' + nmaterials + ',',
			'		"textures"      : ' + ntextures,
			'	},',
			'',
			'	"urlBaseType": "relativeToScene",',
			'',

			'	"objects" :',
			'	{',
			objects,
			'	},',
			'',

			'	"geometries" :',
			'	{',
			'\t' + 	geometries,
			'	},',
			'',

			'	"materials" :',
			'	{',
			'\t' + 	materials,
			'	},',
			'',

			'	"textures" :',
			'	{',
			'\t' + 	textures,
			'	},',
			'',
			'	"defaults" :',
			'	{',
			'		"camera"  : ' + defcamera ,
			'	}',
			'}'
		].join( '\n' );

		return JSON.parse( output );

	}

}
