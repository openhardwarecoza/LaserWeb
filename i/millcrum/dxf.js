/*

    AUTHOR:  Andrew Hodel

*/

var Dxf = function() {
	this.invalidEntities = [];
	this.layers = [];
	this.lines = [];
	this.polylines = [];
	this.minPoint = [0,0];
	this.maxPoint = [0,0];
	this.width = 0;
	this.height = 0;
	this.avgSize = 0;
	this.alerts = [];
};

Dxf.prototype.terneryDiff = function(a,b) {
	return (a > b)? a-b : b-a;
};

Dxf.prototype.addDegrees = function(base,mod) {
        // this function expects a 360 degree number
        // base and mod must be between 0-360
        var v = base+mod;
        if (v > 360) {
                v = 360-v;
        } else if (v < 0) {
                v = 360+v;
        }
        return Math.abs(v);
};

Dxf.prototype.distanceFormula = function(p1,p2) {
        // get the distance between p1 and p2
        var x1 = p1[0];
        var y1 = p1[1];
        var x2 = p2[0];
        var y2 = p2[1];
        var a = (x2-x1)*(x2-x1);
        var b = (y2-y1)*(y2-y1);
        return Math.sqrt(a+b);
};

Dxf.prototype.newPointFromDistanceAndAngle = function(pt,ang,distance) {
        // use cos and sin to get a new point with an angle
        // and distance from an existing point
        // pt = [x,y]
        // ang = in degrees
        // distance = N
        var r = [];
        r.push(pt[0]+(distance*Math.cos(ang*Math.PI/180)));
        r.push(pt[1]+(distance*Math.sin(ang*Math.PI/180)));
        return r;
};

Dxf.prototype.crossProduct = function(v1,v2) {
	// get the cross product of 2 matrices
	return [(v1[1]*v2[2]) - (v1[2]*v2[1]), (v1[2]*v2[0]) - (v1[0]*v2[2]), (v1[0]*v2[1]) - (v1[1]*v2[0])];
};

Dxf.prototype.calcBulgeCenter = function(p1,p2) {

	var bulge = p1[2];

	var chord = [];
	chord.push(p2[0]-p1[0]);
	chord.push(p2[1]-p1[1]);
	// need to set the Z dimension for crossProduct, default is -1
	chord.push(-1);

	// get the frobenius/euclidean norm of the chord
	// which is the square root of the sum of the absolute squares of the elements
	var chord_length = Math.sqrt((chord[0]*chord[0])+(chord[1]*chord[1]));

	// get the sagitta
	var sagitta = (bulge*chord_length)/2;

	var inc_angle = Math.atan(bulge)*4;
	var radius = (chord_length/2)/Math.sin(inc_angle/2);

	// now we need the cross product of the chord based on a negative or positive bulge
	if (bulge >= 0) {
		var perp = this.crossProduct(chord,[0,0,-1]);

	} else {
		var perp = this.crossProduct(chord,[0,0,1]);
		radius = -radius;
	}

	// get the mid point which is just halving the chord vector (*.5) then adding the p1 vector to that result
	var chord_mid_pt = [(chord[0]*.5)+p1[0], (chord[1]*.5)+p1[1]];

	// get the unit vector which is the perp vector divided by the frobenius/euclidean norm of the perp vector
	var unit_vec = [perp[0]/Math.sqrt((perp[0]*perp[0])+(perp[1]*perp[1])), perp[1]/Math.sqrt((perp[0]*perp[0])+(perp[1]*perp[1]))]

	// and then the arc_center which is: multiply the (radius-sagitta) by the unit_vec then add that to chord_mid_pt
	var c = [((radius-sagitta)*unit_vec[0])+chord_mid_pt[0],((radius-sagitta)*unit_vec[1])+chord_mid_pt[1]];

	return c;

};

Dxf.prototype.handleHeader = function(d) {

	//console.log('handleHeader',d);

	// loop through the header and pull out info we want
	for (var c=0; c<d.length; c++) {
		if (d[c] == '$acadver') {
			console.log('autocad drawing database version '+d[c+1]);
			// no need to continue parsing the header until we want more data
			// some editors don't even include a header section!
			break;
		}
	}

};

Dxf.prototype.handleEntities = function(d) {

	//console.log('handleEntities',d);

	// each entity starts with '  0' then the next line is the type of entity
	var currentEntity = {type:'',lines:[]};

	var entitiesToKeep = ['lwpolyline','polyline','line','circle','arc'];

	var totalEntities = 0;

	// loop through all of the entities lines
	for (var c=0; c<d.length; c++) {

		if (d[c] == '  0') {

			// if the next line is undefined then there are no more entities
			if (typeof(d[c+1] != 'undefined')) {

				var isValid = false;

				// now we can see if this entity is one we want to process
				for (var i=0; i<entitiesToKeep.length; i++) {
					if (entitiesToKeep[i] == d[c+1]) {
						// this is a keeper
						//console.log('found keeper entity '+d[c+1]);
						currentEntity = {type:d[c+1], lines:[]};

						c++;

						// loop through the next lines until the next '  0'
						while (d[c] != '  0') {

							// add line to currentEntity.lines
							currentEntity.lines.push(d[c]);

							// increment entities line counter
							c++;

						}

						if (d[c+1] == 'vertex' && entitiesToKeep[i] == 'polyline') {
							// polyline entities have vertex blocks which are terminated by the same
							// string as the entity blocks so we need to handle that

							for (var r=c; r<d.length; r++) {
								if (d[c] == 'seqend') {
									// exit this for loop, this is another place a while won't work in js
									break;
								}
								// keep adding points
								currentEntity.lines.push(d[c]);
								c++;
							}
						}

						// need to decrement the line counter by one so not to skip every other entity
						c--;

						// send to entity handler type
						if (entitiesToKeep[i] == 'line') {
							this.handleLine(currentEntity);
						} else if (entitiesToKeep[i] == 'polyline' || entitiesToKeep[i] == 'lwpolyline') {
							this.handlePolyline(currentEntity);
						} else if (entitiesToKeep[i] == 'circle' || entitiesToKeep[i] == 'arc') {
							this.handleArc(currentEntity);
						}
						totalEntities++;

						isValid = true;

					}
				}

				if (!isValid && d[c+1] != undefined && d[c+1] != '  0') {
					this.invalidEntities.push(d[c+1]);
				}

			}

		}
	}

};

Dxf.prototype.handleArc = function(d) {

	//console.log('handleArc',d);

	// x,y,r,startAngle,endAngle
	var thisArc = [0,0,0,0,0];

	// now loop through each of the lines for the arc
	// 10,20,30 start point
	// 40 radius
	// 50,51 start angle, end angle
	for (var c = 0; c < d.lines.length; c++) {
		if (d.lines[c] == ' 10') {
			c++;
			thisArc[0] = Number(d.lines[c]);
		} else if (d.lines[c] == ' 20') {
			c++;
			thisArc[1] = Number(d.lines[c]);
		} else if (d.lines[c] == ' 40') {
			c++;
			thisArc[2] = Number(d.lines[c]);
		} else if (d.lines[c] == ' 50') {
			c++;
			thisArc[3] = Number(d.lines[c]);
		} else if (d.lines[c] == ' 51') {
			c++;
			thisArc[4] = Number(d.lines[c]);
		}
	}

	if (d.type == 'circle') {
		thisArc[3] = 0;
		thisArc[4] = 360;
	} else {
		this.alerts.push('Arc detected, arcs are difficult to close paths with.  It may be easier to edit the DXF and generate polylines.');
		console.log('Arc detected, arcs are difficult to close paths with.  It may be easier to edit the DXF and generate polylines.');
		$('.bottom-left').notify({
			message: { text: 'WARNING: Arc detected, arcs are difficult to close paths with.  It may be easier to edit the DXF and generate polylines.' },
			type: 'danger'
		}).show();
	}

	// probably need to include 210,220,230 extrusion direction here
	// but it's ok for now

	if (thisArc[4] == 0) {
		thisArc[4] = 360;
	}

	var arcTotalDeg = thisArc[4] - thisArc[3];

	// now we need to create the line segments in the arc
	var numSegments = 40;
	var degreeStep = arcTotalDeg / numSegments;

  console.log('MILLCRUM:  thisArc: '+thisArc)

	// holder for the path
	var newPoints = [];

	// now loop through each degreeStep
	for (var a=0; a<numSegments+1; a++) {
		var pt = this.newPointFromDistanceAndAngle([thisArc[0],thisArc[1]], this.addDegrees(thisArc[3], (degreeStep * a)), thisArc[2]);
		// add the point
		newPoints.push(pt);
	}

	// check if arc exceeds min and max DXF point
	// if so update

	for (var i=0; i<newPoints.length-1; i++) {
		var p1 = newPoints[i];

		// for x
		if (p1[0] > this.maxPoint[0]) {
			this.maxPoint[0] = p1[0];
		} else if (p1[0] < this.minPoint[0]) {
			this.minPoint[0] = p1[0];
		}

		// for y
		if (p1[1] > this.maxPoint[1]) {
			this.maxPoint[1] = p1[1];
		} else if (p1[1] < this.minPoint[1]) {
			this.minPoint[1] = p1[1];
		}

	}

	if (d.type == 'circle') {
		this.polylines.push({layer:'circle',points:newPoints});
	} else {
		// arcs need to be created as lines so the polylines can be followed
		for (var c=0; c<newPoints.length; c++) {
			if (c+1 <= newPoints.length-1) {
				this.lines.push([newPoints[c][0],newPoints[c][1],0,newPoints[c+1][0],newPoints[c+1][1],0]);
			}
		}
	}

};

Dxf.prototype.handleLine = function(d) {

	//console.log('handleLine',d);

	var thisLine = [0,0,0,0,0,0];

	// now loop through each of the lines for the line
	// 10,20,30 = x,y,z start
	// 11,21,31 = x,y,z end
	for (var c = 0; c < d.lines.length; c++) {
		if (d.lines[c] == ' 10') {
			c++;
			thisLine[0] = Number(d.lines[c]);
		} else if (d.lines[c] == ' 20') {
			c++;
			thisLine[1] = Number(d.lines[c]);
		} else if (d.lines[c] == ' 30') {
			c++;
			thisLine[2] = Number(d.lines[c]);
		} else if (d.lines[c] == ' 11') {
			c++;
			thisLine[3] = Number(d.lines[c]);
		} else if (d.lines[c] == ' 21') {
			c++;
			thisLine[4] = Number(d.lines[c]);
		} else if (d.lines[c] == ' 31') {
			c++;
			thisLine[5] = Number(d.lines[c]);
		}
	}

	// check if line exceeds min and max DXF point
	// if so update

	// for x start
	if (thisLine[0] > this.maxPoint[0]) {
		this.maxPoint[0] = thisLine[0];
	} else if (thisLine[0] < this.minPoint[0]) {
		this.minPoint[0] = thisLine[0];
	}

	// for y start
	if (thisLine[1] > this.maxPoint[1]) {
		this.maxPoint[1] = thisLine[1];
	} else if (thisLine[1] < this.minPoint[1]) {
		this.minPoint[1] = thisLine[1];
	}

	// for x end
	if (thisLine[3] > this.maxPoint[0]) {
		this.maxPoint[0] = thisLine[3];
	} else if (thisLine[3] < this.minPoint[0]) {
		this.minPoint[0] = thisLine[3];
	}

	// for y end
	if (thisLine[4] > this.maxPoint[1]) {
		this.maxPoint[1] = thisLine[4];
	} else if (thisLine[4] < this.minPoint[1]) {
		this.minPoint[1] = thisLine[4];
	}

	this.lines.push(thisLine);

};

Dxf.prototype.handlePolyline = function(d, isPoints) {
	if (typeof(isPoints) == 'undefined') {
		var isPoints = false;
	}

	//console.log('handlePolyline',d);

	var singleEntity = {layer:'',points:[]};

	// keep track of what coord we are in within this entity
	var currentCoord = -1;

	// keep track of the first layer name
	var gotFirstLayerName = false;

	if (d.type == 'lwpolyline') {
		// if the type is lwpolyline then the first coordinate is the first coordinate
		for (var c = 0; c < d.lines.length; c++) {

			if (d.lines[c].match(/ 8/) && gotFirstLayerName == false) {
				// the first ' 8' means the next line will be the layer name
				// sometimes there is a '  8' and sometimes a ' 8' so we need to match on ' 8' which will get '  8'
				// for some reason there are sometimes with some editors multiple of them
				// the first one is the one that matters
				c++;
				singleEntity.layer = d.lines[c];
				gotFirstLayerName = true;
			} else if (d.lines[c] == ' 10') {
				// this means the next line will be the X coordinate of a point

				// inc the currentCoord
				currentCoord++;
				c++;
				singleEntity.points.push([Number(d.lines[c])]);
			} else if (d.lines[c] == ' 20') {
				// this means the next line will be the Y coordinate of a point
				c++;
				singleEntity.points[currentCoord].push(Number(d.lines[c]));
			} else if (d.lines[c] == ' 42') {
				// this means the next line will be the curve value
				c++;
				singleEntity.points[currentCoord].push(Number(d.lines[c]));
			}

		}
	} else if (d.type == 'polyline') {
		// if the type is polyline then the first coordinate is the offset
		// followed by VERTEX blocks which contain the points

		// now loop through each of the lines for the polyline
		for (var c = 0; c < d.lines.length; c++) {

			if (d.lines[c].match(/ 8/) && gotFirstLayerName == false) {
				// the first ' 8' means the next line will be the layer name
				// sometimes there is a '  8' and sometimes a ' 8' so we need to match on ' 8' which will get '  8'
				// for some reason there are sometimes with some editors multiple of them
				// the first one is the one that matters
				c++;
				singleEntity.layer = d.lines[c];
				gotFirstLayerName = true;
			} else if (d.lines[c] == 'vertex') {
				// we need to now loop through this vertex to get the coordinates
				// go to the next line
				c++;
				for (var r=c; r<d.lines.length; r++) {

					if (d.lines[c] == '10') {
						// inc the currentCoord
						currentCoord++;
						c++;
						singleEntity.points.push([Number(d.lines[c])]);
					} else if (d.lines[c] == '20') {
						c++;
						singleEntity.points[currentCoord].push(Number(d.lines[c]));
					} else if (d.lines[c] == '42') {
						c++;
						singleEntity.points[currentCoord].push(Number(d.lines[c]));
					} else if (d.lines[c] == '  0' || d.lines[c] == 'vertex') {
						break;
					}

					c++;
				}
			}
		}
	}

	//console.log('polyline singleEntity',singleEntity);

	if (singleEntity.points.length == 0) {
		// this has no points, go on to the next
		//console.log('polyline has no points');
		return true;
	}

	// now for this polyline we need to process it
	//console.log('processing polyline');

	// loop through each point in polygon to update the min and max
	// values for the whole dxf

	for (var i=0; i<singleEntity.points.length-1; i++) {
		var p1 = singleEntity.points[i];

		// for x
		if (p1[0] > this.maxPoint[0]) {
			this.maxPoint[0] = p1[0];
		} else if (p1[0] < this.minPoint[0]) {
			this.minPoint[0] = p1[0];
		}

		// for y
		if (p1[1] > this.maxPoint[1]) {
			this.maxPoint[1] = p1[1];
		} else if (p1[1] < this.minPoint[1]) {
			this.minPoint[1] = p1[1];
		}

	}

	// loop through each point in polygon again to calculate the bulges
	var newPoints = [];

	for (var i=0; i<singleEntity.points.length-1; i++) {

		var p1 = singleEntity.points[i];
		var p2 = singleEntity.points[i+1];

		// temp for displaying points later
		var thisLoopPoints = [];

		/*
		console.log('\nPOINT LOOP #'+i+' for '+singleEntity.layer);
		console.log('p1',p1);
		console.log('p2',p2);
		console.log('cv',cv);
		*/

		if (p1[0] == p2[0] && p1[1] == p2[1]) {
			// the points are the exact same

		} else {
			// the points are different

			if (typeof(p1[2]) != 'undefined') {
				// there is a bulge, get the center point
				var cv = this.calcBulgeCenter(p1, p2);

				if (false) {
					// the bulge point are on the same line, stupid editor
					// just add the points
					newPoints.push(p1,p2);
				} else {
					// this is a proper curve point, calculate it

					// radius between p1 and cv
					var r = this.distanceFormula(p1, cv);
					var startPointQuad = 0;
					var endPointQuad = 0;
					var startAng = 0;
					var endAng = 0;

					//
					//   2   |   1
					//       |
					// ------|-------
					//       |
					//   3   |   4
					//
					// first find start point quadrant relative to cv
					// and end point quadrant relative to cv

					// start point
					if (p1[0] > cv[0] && p1[1] > cv[1]) {
						startPointQuad = 1;
					} else if (p1[0] < cv[0] && p1[1] > cv[1]) {
						startPointQuad = 2;
					} else if (p1[0] < cv[0] && p1[1] < cv[1]) {
						startPointQuad = 3;
					} else if (p1[0] > cv[0] && p1[1] < cv[1]) {
						startPointQuad = 4;
					}

					// end point
					if (p2[0] > cv[0] && p2[1] > cv[1]) {
						endPointQuad = 1;
					} else if (p2[0] < cv[0] && p2[1] > cv[1]) {
						endPointQuad = 2;
					} else if (p2[0] < cv[0] && p2[1] < cv[1]) {
						endPointQuad = 3;
					} else if (p2[0] > cv[0] && p2[1] < cv[1]) {
						endPointQuad = 4;
					}

					// start angle from cv to p1
					var startSlope = (cv[1] - p1[1]) / (cv[0] - p1[0]);
					var startAng = 180 * Math.atan(startSlope) / Math.PI;
					if (p1[2] >= 0) {
						// positive curve
						if (startPointQuad == 2) {
							startAng = 180 + startAng;
						} else if (startPointQuad == 3) {
							startAng = 180 + startAng;
						} else if (startPointQuad == 4) {
							startAng = 360 + startAng;
						}
					} else {
						// negative curve
						if (startPointQuad == 2) {
							startAng = 180 + startAng;
						} else if (startPointQuad == 3) {
							startAng = 180 + startAng;
						} else if (startPointQuad == 4) {
							startAng = 360 + startAng;
						}
					}

					// end angle from cv to p2
					var endSlope = (cv[1] - p2[1]) / (cv[0] - p2[0]);
					var endAng = 180 * Math.atan(endSlope) / Math.PI;
					if (p1[2] < 0) {
						// negative curve
						if (endPointQuad == 2) {
							endAng = 180 + endAng;
						} else if (endPointQuad == 3) {
							endAng = 180 + endAng;
						} else if (endPointQuad == 4) {
							endAng = 360 + endAng;
						}
					} else {
						// positive curve
						if (endPointQuad == 2) {
							endAng = 180 + endAng;
						} else if (endPointQuad == 3) {
							endAng = 180 + endAng;
						} else if (endPointQuad == 4) {
							endAng = 360 + endAng;
						}
					}

					if (p1[2] < 0) {
						// this is a negative curve so it will be an arc that goes from p1 to p2 except
						// it will be bulging toward the cv point and not away from it like normal
						var arcTotalDeg = 360 - this.addDegrees(endAng, -startAng);
					} else {
						var arcTotalDeg = this.addDegrees(endAng, -startAng);
					}

					// now we need to create the line segments in the arc
					var numSegments = 40;
					var degreeStep = arcTotalDeg / numSegments;

					// now loop through each degreeStep
					for (var a=1; a<numSegments+1; a++) {
						// for a positive curve the start point is always a lower number of degrees
						if (p1[2] < 0) {
							// for a negative curve we need to subtract degreeStep
							var pt = this.newPointFromDistanceAndAngle(cv, this.addDegrees(startAng, -(degreeStep * a)), r);
						} else {
							// for a positive curve we add degreeStep
							var pt = this.newPointFromDistanceAndAngle(cv, this.addDegrees(startAng, (degreeStep * a)), r);
						}
						// add the point
						newPoints.push(pt);
						thisLoopPoints.push(pt);
					}

				}


			} else {
				// line segment without curve, add it
				newPoints.push(p1,p2);
				i++;
			}

		}

		/*
		console.log('startAng',startAng);
		console.log('endAng',endAng);
		console.log('startPointQuad',startPointQuad);
		console.log('endPointQuad',endPointQuad);
		console.log('thisLoopPoints ' + thisLoopPoints.length);
		*/


/*
		for (var nn=0; nn<thisLoopPoints.length; nn++) {
			console.log(nn,thisLoopPoints[nn]);
		}
*/

		//console.log('POINT LOOP #'+i+' '+thisLoopPoints.length,p1,p2);

	}

	//console.log('POINTS AFTER PROCESSING',newPoints.length);

	// set newPoints as this polygons points
	this.polylines.push({layer:singleEntity.layer,points:newPoints});

};

Dxf.prototype.parseDxf = function(d) {

	// parse a dxf file (ASCII) which is passed as d

	// first we need to split the file up into newlines
	var l = String(d).split('\n');

	var sections = [];
	var currentSection = [];

	//console.log('parsing dxf sections');

	// first loop through and find all the sections
	for (var c = 0; c < l.length; c++) {

		if (l[c].toLowerCase().match(/section/)) {
			// this starts a section, add a new section object
			currentSection = [];
		} else if (l[c].toLowerCase().match(/endsec/)) {
			// this ends a section, move currentSection into sections
			sections.push(currentSection);
		} else {
			// this is something to be inserted into currentSection
			// also remove any newline characters from the end of the string
			currentSection.push(l[c].toLowerCase().replace(/(\r\n|\n|\r)/gm,''));
		}
	}

	// now go through each section and send each to the correct handler
	for (var c = 0; c<sections.length; c++) {

		//console.log('section #'+c,sections[c]);

		// right now we just get the header and entities, and even the header isn't used that often
		if (sections[c][1].match(/header/)) {
			this.handleHeader(sections[c]);
		} else if (sections[c][1].match(/entities/)) {
			this.handleEntities(sections[c]);
		}

	}

	// set dxf width and height now that all entities are processed
	this.width = this.maxPoint[0] - this.minPoint[0];
	this.height = this.maxPoint[1] - this.minPoint[1];
	this.avgSize = (this.width+this.height)/2;

	// now we can loop through all the lines and make polylines for all
	// lines which share a common end to next start point, procedurally

	// this only converts lines to polylines when points match exactly
	// there is no rounding and if 2 points are off by even .0000000001
	// they will not convert as who knows what scale things are at
	// edit your DXF's correctly

	// this holds the lines we will remove which were turned into polylines
	var removeLines = [];

	for (var c=0; c<this.lines.length; c++) {

		var tempPolyline = [];
		var startLine = 0;

		try {

		// if this lines end point and the next lines start point are the same
		if (this.lines[c][3] == this.lines[c+1][0] && this.lines[c][4] == this.lines[c+1][1]) {

			startLine = c;
			// this line and the next line are connected
			// add this line start point
			tempPolyline.push([this.lines[c][0],this.lines[c][1]]);
			// add next line start point
			tempPolyline.push([this.lines[c+1][0],this.lines[c+1][1]]);
			// add next line end point
			tempPolyline.push([this.lines[c+1][3],this.lines[c+1][4]]);
			c++;
			// while this lines end point and the next lines start point remain the same
			for (var r=c; r<this.lines.length-1; r++) {
				if (this.lines[c][3] == this.lines[c+1][0] && this.lines[c][4] == this.lines[c+1][1]) {
					// add the next lines start point
					//tempPolyline.push([this.lines[c+1][0],this.lines[c+1][1]]);
					// add the next lines end point
					tempPolyline.push([this.lines[c+1][3],this.lines[c+1][4]]);
					c++;
				}
			}

			// if the previous lines end point equals the first lines start point
			if (tempPolyline[0][0] == tempPolyline[tempPolyline.length-1][0] && tempPolyline[0][1] == tempPolyline[tempPolyline.length-1][1]) {
				// we know it's a valid polygon

				// remove all those lines from this.lines
				removeLines.push([startLine,c-startLine]);

				// add tempPolyline to this.polylines
				this.polylines.push({layer:'',points:tempPolyline});

			}
		} else {

			// here we can check if the points were close and inform the user
			// that these points were close but not exact so we couldn't form a polyline

			//if (this.terneryDiff(this.lines[c][3],this.lines[c+1][0]) < this.avgSize/20 && this.terneryDiff(this.lines[c][4],this.lines[c+1][1]) < this.avgSize/20) {
			var pointDiff = this.distanceFormula([this.lines[c][3],this.lines[c][4]], [this.lines[c+1][0],this.lines[c+1][1]]);
			if (pointDiff < this.avgSize/20) {
				this.alerts.push('line'+c+' and line'+Number(c+1)+' could be part of a polyline they are '+pointDiff+' units away from one another.  Make lines start and end at the exact same point and they will form polylines.');
				$('.bottom-left').notify({
					message: { text: 'WARNING: Arc detected, arcs are difficult to close paths with.  It may be easier to edit the DXF and generate polylines.' },
					type: 'danger'
				}).show();
			}

		}

		} catch (err) {
			console.log(err);
			console.log(this.lines.length,c);
			console.log(this.lines[c]);
		}

	}

	for (var c=0; c<removeLines.length; c++) {
		for (var r=0; r<removeLines[c][1]+1; r++) {
			delete this.lines[removeLines[c][0]+r];
		}
	}

	// reset the array index after deleting
	this.lines = this.lines.filter(function(){return true;});

/*

	// this is a WIP way of connecting lines which are not ordered
	// it is more procedural when ordered
	// this needs to be completed because lines may be drawn out of order
	// and probably are for most drawings

	// this is an array of lines which have common lines
	var commonLines = [];

	console.log('lines',this.lines);

	for (var c=0; c<this.lines.length; c++) {

		// with each start and end point of each line
		// we need to loop through every _other_ line to see
		// if there is a match
		for (var d=0; d<this.lines.length; d++) {

			if (d == c) {
				// we do not need to check on the line we are checking on (first loop)
			} else {
				// check if this line _d_ shares a point with _c_
				// (first line x1 == second line x1 && first line y1 == second line y1) ||
				// (first line x1 == second line x2 && first line y1 == second line y2) ||
				// (first line x2 == second line x1 && first line y2 == second line y1) ||
				// (first line x2 == second line x2 && first line y2 == second line y2)
				if ((this.lines[c][0] == this.lines[d][0] && this.lines[c][1] == this.lines[d][1]) || (this.lines[c][0] == this.lines[d][3] && this.lines[c][1] == this.lines[d][4]) || (this.lines[c][3] == this.lines[d][0] && this.lines[c][4] == this.lines[d][1]) || (this.lines[c][3] == this.lines[d][3] && this.lines[c][4] == this.lines[d][4])) {
					// they share a point
					if (!commonLines[c]) {
						// create an entry in commonLines for this _c_ point if it does not exist
						commonLines[c] = [];
					}
					// add this _d_ point as a common line to c
					commonLines[c].push(d);
				}
			}

		}

	}

	console.log('commonLines',commonLines);
*/

	//console.log(this);

};
