// Code courtesy of https://github.com/mrdoob/three.js/issues/6549

THREE.GridHelperRect = function ( sizeX, stepX, sizeZ, stepZ ) {

    var x = Math.round( sizeX / stepX );
    var y = Math.round( sizeZ / stepZ );

    sizeX = x * stepX;
    sizeZ = y * stepZ;

//    console.log( "Grid sizeX: " + sizeX * 2 );
    //console.log( "Grid sizeZ: " + sizeZ * 2 );

    var geometry = new THREE.Geometry();
    var material = new THREE.LineBasicMaterial( { vertexColors: THREE.VertexColors } );

    this.color1 = new THREE.Color( 0x444444 );
    this.color2 = new THREE.Color( 0x888888 );

    for ( var i = - 1 * sizeX; i <= sizeX; i += stepX ) {

        geometry.vertices.push(
            new THREE.Vector3( i, 0, - 1 * sizeZ ), //x Y z
            new THREE.Vector3( i, 0, sizeZ ) //x Y z
        );

        var color = i === 0 ? this.color1 : this.color2;

        geometry.colors.push( color, color, color, color );

    }

    for ( var i = - 1 * sizeZ; i <= sizeZ; i += stepZ ) {

        geometry.vertices.push(
            new THREE.Vector3( - 1 * sizeX, 0, i ), //x Y z
            new THREE.Vector3( sizeX, 0, i ) //x Y z
        );

        var color = i === 0 ? this.color1 : this.color2;

        geometry.colors.push( color, color, color, color );

    }

    THREE.Line.call( this, geometry, material, THREE.LinePieces );

};

THREE.GridHelperRect.prototype = Object.create( THREE.Line.prototype );
THREE.GridHelperRect.prototype.constructor = THREE.GridHelper;

THREE.GridHelperRect.prototype.setColors = function( colorCenterLine, colorGrid ) {

    this.color1.set( colorCenterLine );
    this.color2.set( colorGrid );

    //this.geometry.colorsNeedUpdate = true;

}
