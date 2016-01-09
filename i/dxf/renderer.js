/**
 * Returns the angle in radians of the vector (p1,p2). In other words, imagine
 * putting the base of the vector at coordinates (0,0) and finding the angle
 * from vector (1,0) to (p1,p2).
 * @param  {Object} p1 start point of the vector
 * @param  {Object} p2 end point of the vector
 * @return {Number} the angle
 */
THREE.Math.angle2 = function(p1, p2) {
	var v1 = new THREE.Vector2(p1.x, p1.y);
	var v2 = new THREE.Vector2(p2.x, p2.y);
	v2.sub(v1); // sets v2 to be our chord
	v2.normalize(); // normalize because cos(theta) =
	// if(v2.y < 0) return Math.PI + (Math.PI - Math.acos(v2.x));
	if(v2.y < 0) return -Math.acos(v2.x);
	return Math.acos(v2.x);
};


THREE.Math.polar = function(point, distance, angle) {
	var result = {};
	result.x = point.x + distance * Math.cos(angle);
	result.y = point.y + distance * Math.sin(angle);
	return result;
};

/**
 * Calculates points for a curve between two points
 * @param startPoint - the starting point of the curve
 * @param endPoint - the ending point of the curve
 * @param bulge - a value indicating how much to curve
 * @param segments - number of segments between the two given points
 */
THREE.BulgeGeometry = function ( startPoint, endPoint, bulge, segments ) {

	var vertex, i,
		center, p0, p1, angle,
		radius, startAngle,
		thetaAngle;

	THREE.Geometry.call( this );

	this.startPoint = p0 = startPoint ? new THREE.Vector2(startPoint.x, startPoint.y) : new THREE.Vector2(0,0);
	this.endPoint = p1 = endPoint ? new THREE.Vector2(endPoint.x, endPoint.y) : new THREE.Vector2(1,0);
	this.bulge = bulge = bulge || 1;

	angle = 4 * Math.atan(bulge);
	radius = p0.distanceTo(p1) / 2 / Math.sin(angle/2);
	center = THREE.Math.polar(startPoint, radius, THREE.Math.angle2(p0,p1) + (Math.PI / 2 - angle/2));

	this.segments = segments = segments || Math.max( Math.abs(Math.ceil(angle/(Math.PI/18))), 6); // By default want a segment roughly every 10 degrees
	startAngle = THREE.Math.angle2(center, p0);
	thetaAngle = angle / segments;


	this.vertices.push(new THREE.Vector3(p0.x, p0.y, 0));

	for(i = 1; i <= segments - 1; i++) {

		vertex = THREE.Math.polar(center, Math.abs(radius), startAngle + thetaAngle * i);

		this.vertices.push(new THREE.Vector3(vertex.x, vertex.y, 0));

	}

};

THREE.BulgeGeometry.prototype = Object.create( THREE.Geometry.prototype );

/**
 * Viewer class for a dxf object.
 * @param {Object} data - the dxf object
 * @param {Number} width - width of the rendering canvas in pixels
 * @param {Number} height - height of the rendering canvas in pixels
 * @constructor
 */
function processDXF(data) {
  console.log(data);
  var i, entity;

  for(i = 0; i < data.entities.length; i++) {
    entity = data.entities[i];

    if(entity.type === 'DIMENSION') {
      if(entity.block) {
        var block = data.blocks[entity.block];
        for(j = 0; j < block.entities.length; j++) {
          drawEntity(block.entities[j], data);
        }
      } else {
        console.log('WARNING: No block for DIMENSION entity');
      }
    } else {
      drawEntity(entity, data);
    }
  }


function drawEntity(entity, data) {
  if(entity.type === 'CIRCLE' || entity.type === 'ARC') {
    drawCircle(entity, data);
  } else if(entity.type === 'LWPOLYLINE' || entity.type === 'LINE') {
    drawLine(entity, data);
  } else if(entity.type === 'TEXT') {
    drawText(entity, data);
  } else if(entity.type === 'SOLID') {
    drawSolid(entity, data);
  } else if(entity.type === 'POINT') {
    drawPoint(entity, data);
  }
}

function drawLine(entity, data) {
  var geometry = new THREE.Geometry(),
    color = getColor(entity, data),
    material, lineType, vertex, startPoint, endPoint, bulgeGeometry,
    bulge, i, line;

  // create geometry
  for(i = 0; i < entity.vertices.length; i++) {

    if(entity.vertices[i].bulge) {
      bulge = entity.vertices[i].bulge;
      startPoint = entity.vertices[i];
      endPoint = i + 1 < entity.vertices.length ? entity.vertices[i + 1] : geometry.vertices[0];

      bulgeGeometry = new THREE.BulgeGeometry(startPoint, endPoint, bulge);

      geometry.vertices.push.apply(geometry.vertices, bulgeGeometry.vertices);
    } else {
      vertex = entity.vertices[i];
      geometry.vertices.push(new THREE.Vector3(vertex.x, vertex.y, 0));
    }

  }
  if(entity.shape) geometry.vertices.push(geometry.vertices[0]);


  // set material
  //if(entity.lineType) {
  //  lineType = data.tables.lineTypes[entity.lineType];
  //}

  if(lineType && lineType.pattern && lineType.pattern.length !== 0) {
    material = new THREE.LineDashedMaterial({ color: color, gapSize: 4, dashSize: 4});
  } else {
    material = new THREE.LineBasicMaterial({ linewidth: 1, color: color });
  }

  // if(lineType && lineType.pattern && lineType.pattern.length !== 0) {

  //           geometry.computeLineDistances();

  //           // Ugly hack to add diffuse to this. Maybe copy the uniforms object so we
  //           // don't add diffuse to a material.
  //           lineType.material.uniforms.diffuse = { type: 'c', value: new THREE.Color(color) };

  // 	material = new THREE.ShaderMaterial({
  // 		uniforms: lineType.material.uniforms,
  // 		vertexShader: lineType.material.vertexShader,
  // 		fragmentShader: lineType.material.fragmentShader
  // 	});
  // }else {
  // 	material = new THREE.LineBasicMaterial({ linewidth: 1, color: color });
  // }

  line = new THREE.Line(geometry, material);
  line.translateX(laserxmax /2 * -1);
  line.translateY(laserymax /2 * -1);
  scene.add(line);
}

function drawCircle(entity, data) {

// Laserweb - calc and draw gcode
var radius = entity.radius;
console.log('Radius:'+radius+' and Center '+entity.center.x+','+entity.center.y+','+entity.center.z+',\n'); // Radius:220 and Center 0,0,0,
var arcTotalDeg = entity.startAngleDeg - entity.endAngleDeg;
console.log('Start Angle: '+entity.startAngleDeg+', End Angle: '+entity.endAngleDeg+', thus spanning '+arcTotalDeg+'deg' );

// Do some math here, to determine starting point (using center, Radius and start angle?)
// Do some math here, to determine starting point (using  center, Radius and End angle?)
// Do some math here, to draw line segments (sections spaced radius away from center, from start point to end point (lengh of segment is number of segments divide by arcTotalDeg)?)
// Write that to GCODE
// end Laserweb

// Draw it since its cool to see (note this is a straigh three.js view of it, not via gcode.  Can be used in the Cutting Params view by coloring object/layers to change params)
  var geometry, material, circle;

  geometry = new THREE.CircleGeometry(entity.radius, 32, entity.startAngle, entity.angleLength);
  geometry.vertices.shift();

  material = new THREE.LineBasicMaterial({ color: getColor(entity, data) });

  circle = new THREE.Line(geometry, material);
  circle.position.x = entity.center.x;
  circle.position.y = entity.center.y;
  circle.position.z = entity.center.z;
  circle.translateX(laserxmax /2 * -1);
  circle.translateY(laserymax /2 * -1);
  scene.add(circle);
}

function drawSolid(entity, data) {
  var material, mesh, solid, verts;
  geometry = new THREE.Geometry();

  verts = geometry.vertices;
  verts.push(new THREE.Vector3(entity.points[0].x, entity.points[0].y, entity.points[0].z));
  verts.push(new THREE.Vector3(entity.points[1].x, entity.points[1].y, entity.points[1].z));
  verts.push(new THREE.Vector3(entity.points[2].x, entity.points[2].y, entity.points[2].z));
  verts.push(new THREE.Vector3(entity.points[3].x, entity.points[3].y, entity.points[3].z));

  // Calculate which direction the points are facing (clockwise or counter-clockwise)
  var vector1 = new THREE.Vector3();
  var vector2 = new THREE.Vector3();
  vector1.subVectors(verts[1], verts[0]);
  vector2.subVectors(verts[2], verts[0]);
  vector1.cross(vector2);

  // If z < 0 then we must draw these in reverse order
  if(vector1.z < 0) {
    geometry.faces.push(new THREE.Face3(2, 1, 0));
    geometry.faces.push(new THREE.Face3(2, 3, 0));
  } else {
    geometry.faces.push(new THREE.Face3(0, 1, 2));
    geometry.faces.push(new THREE.Face3(0, 3, 2));
  }


  material = new THREE.MeshBasicMaterial({ color: getColor(entity, data) });

  mesh = new THREE.Mesh(geometry, material);

  mesh.translateX(laserxmax /2 * -1);
  mesh.translateY(laserymax /2 * -1);

  scene.add(mesh);
}

function drawText(entity, data) {
  var geometry, material, text;

  geometry = new THREE.TextGeometry(entity.text, { height: 0, size: entity.textHeight || 12 });

  material = new THREE.MeshBasicMaterial({ color: getColor(entity, data) });

  text = new THREE.Mesh(geometry, material);
  text.position.x = entity.startPoint.x;
  text.position.y = entity.startPoint.y;
  text.position.z = entity.startPoint.z;

  text.translateX(laserxmax /2 * -1);
  text.translateY(laserymax /2 * -1);

  scene.add(text);
}

function drawPoint(entity, data) {
  var geometry, material, point;

  geometry = new THREE.Geometry();

  geometry.vertices.push(new THREE.Vector3(entity.position.x, entity.position.y, entity.position.z));

  // TODO: could be more efficient. PointCloud per layer?

  var numPoints = 1;

  var color = getColor(entity, data);
  var colors = new Float32Array( numPoints*3 );
  colors[0] = color.r;
  colors[1] = color.g;
  colors[2] = color.b;

  geometry.colors = colors;
  geometry.computeBoundingBox();

  material = new THREE.PointCloudMaterial( { size: 0.05, vertexColors: THREE.VertexColors } );
  point = new THREE.PointCloud(geometry, material);

  point.translateX(laserxmax /2 * -1);
  point.translateY(laserymax /2 * -1);

  scene.add(point);
}

//function getColor(entity, data) {
//  var color = entity.color || data.tables.layers[entity.layer].color;
//  if(color === 0xffffff) {
//    color = 0x000000;
//  }
//  return color;
//}

function getColor(entity, data) {
//  var color = entity.color || data.tables.layers[entity.layer].color;
//  if(color === 0xffffff) {
//    color = 0x000000;
//  }
  return 0x000099;
}


function createLineTypeShaders(data) {
  var ltype, type;
  var ltypes = data.tables.lineTypes;

  for(type in ltypes) {
    ltype = ltypes[type];
    if(!ltype.pattern) continue;
    ltype.material = createDashedLineShader(ltype.pattern);
  }
}

function createDashedLineShader(pattern) {
  var i,
    dashedLineShader = {},
    totalLength = 0.0;

  for(i = 0; i < pattern.length; i++) {
    totalLength += Math.abs(pattern[i]);
  }

  dashedLineShader.uniforms = THREE.UniformsUtils.merge([

    THREE.UniformsLib[ 'common' ],
    THREE.UniformsLib[ 'fog' ],

    {
      'pattern': { type: 'fv1', value: pattern },
      'patternLength': { type: 'f', value: totalLength }
    }

  ]);

  dashedLineShader.vertexShader = [
    'attribute float lineDistance;',

    'varying float vLineDistance;',

    THREE.ShaderChunk[ 'color_pars_vertex' ],

    'void main() {',

    THREE.ShaderChunk[ 'color_vertex' ],

    'vLineDistance = lineDistance;',

    'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',

    '}'
  ].join('\n');

  dashedLineShader.fragmentShader = [
    'uniform vec3 diffuse;',
    'uniform float opacity;',

    'uniform float pattern[' + pattern.length + '];',
    'uniform float patternLength;',

    'varying float vLineDistance;',

    THREE.ShaderChunk[ 'color_pars_fragment' ],
    THREE.ShaderChunk[ 'fog_pars_fragment' ],

    'void main() {',

    'float pos = mod(vLineDistance, patternLength);',

    'for ( int i = 0; i < ' + pattern.length + '; i++ ) {',
    'pos = pos - abs(pattern[i]);',
    'if( pos < 0.0 ) {',
    'if( pattern[i] > 0.0 ) {',
    'gl_FragColor = vec4(1.0, 0.0, 0.0, opacity );',
    'break;',
    '}',
    'discard;',
    '}',

    '}',

    THREE.ShaderChunk[ 'color_fragment' ],
    THREE.ShaderChunk[ 'fog_fragment' ],

    '}'
  ].join('\n');

  return dashedLineShader;
}

}
