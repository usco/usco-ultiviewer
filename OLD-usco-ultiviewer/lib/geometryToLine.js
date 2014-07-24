function geometryToline( geo ) {
    //by westlangley: http://stackoverflow.com/questions/15316493/three-js-method-to-convert-wireframe-of-geometry-to-a-three-line
    var geometry = new THREE.Geometry();
    var vertices = geometry.vertices;

    for ( i = 0; i < geo.faces.length; i++ ) {

        var face = geo.faces[ i ];

        if ( face instanceof THREE.Face3 ) {

                vertices.push( geo.vertices[ face.a ].clone() );
                vertices.push( geo.vertices[ face.b ].clone() );
                vertices.push( geo.vertices[ face.b ].clone() );
                vertices.push( geo.vertices[ face.c ].clone() );
                vertices.push( geo.vertices[ face.c ].clone() );
                vertices.push( geo.vertices[ face.a ].clone() );

        } else if ( face instanceof THREE.Face4 ) {

                vertices.push( geo.vertices[ face.a ].clone() );
                vertices.push( geo.vertices[ face.b ].clone() );
                vertices.push( geo.vertices[ face.b ].clone() );
                vertices.push( geo.vertices[ face.c ].clone() );
                vertices.push( geo.vertices[ face.c ].clone() );
                vertices.push( geo.vertices[ face.d ].clone() );
                vertices.push( geo.vertices[ face.d ].clone() );
                vertices.push( geo.vertices[ face.a ].clone() );

        }

    }

    geometry.computeLineDistances();

    return geometry;

}
