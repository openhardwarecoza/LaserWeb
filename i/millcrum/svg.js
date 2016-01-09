/*

    AUTHOR:  Andrew Hodel

*/

var Svg = function() {
	this.paths = [];
	this.alerts = [];
	this.width = 0;
	this.height = 0;
	this.units = 'mm';
};

Svg.prototype.process = function(r) {
			// use the DOMParser to parse the svg's xml, it's built into the browser
			var node = new DOMParser().parseFromString(r, 'image/svg+xml');
			//console.log('svg root',node.children);
			//console.log('number of root children',node.children[0].children.length);

			// the primitive objects in svg are
			// 'path', 'text', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'image' and 'use'
			// http://www.w3.org/Graphics/SVG/IG/resources/svgprimer.html#simple_objects

			// the first element in the svg has the width and height as an attribute
			// they may be in one of a few different formats, which are of course unspecified
			// 100 100px 100mm 100in
			// we need to split them back into real numbers, then save the unit measure
			var isNumRe = /^-{0,1}\d*\.{0,1}\d+$/;
			for (key in node.children[0].attributes) {
				if (typeof(node.children[0].attributes[key]) == 'object') {
					if (node.children[0].attributes[key].name == 'width') {
						this.width = node.children[0].attributes[key].value;
						if (isNumRe.test(this.width)) {
							this.width = Number(this.width);
						} else {
							// get numbers from string
							var n = Number(this.width.replace(/\D/g, ''));
							// split on that to get the unit
							this.units = this.width.split(n.toString())[1].toLowerCase();
							// set this.width to n
							this.width = n;
						}
					} else if (node.children[0].attributes[key].name == 'height') {
						this.height = node.children[0].attributes[key].value;
						if (isNumRe.test(this.height)) {
							this.height = Number(this.height);
						} else {
							// get numbers from string
							this.height = Number(this.height.replace(/\D/g, ''));
						}
					}
				}
			}

			// for our purposes we need to loop through the svg and find any of these primitive objects
			var svgElements = node.getElementsByTagName('*');

			// loop through every element
			for (var c=0; c<svgElements.length; c++) {

				if (svgElements[c].nodeName == 'path') {
					// this is a valid element to parse, this only parses paths
					var thisPath = [];

					// this is the d string
					// it contains various commands, most notable m - moveto, l - lineto, c - curve and z - useless.
					var val = svgElements[c].attributes['d'].value;

					//console.log('\n\nvalid path: ',val);

					// need to apply any transform from this elements transform attribute
					// as well as any parent transforms all the way to the root g element
					// we just loop back up the chain, apply all the transforms to each other, then apply the ending result transform to the actual object as needed
					var transforms = [];

					function getT(e) {
						if (e.attributes['transform']) {
							transforms.push(e.attributes['transform']);
						}
						if (e.parentNode.attributes['transform']) {
							return getT(e.parentNode)
						}
						return true;
					}

					getT(svgElements[c]);

					// now transforms represents all the parent transforms
					// and svgElements[c].attributes['transform'] represents the element's unique transform
					// https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/transform
					var translates = [];
					var matrices = [];
					for (var tr=0; tr<transforms.length; tr++) {

						// first split the () because we know it's a transform function so the name is not yet relevant
						// we just need the parameters
						var params = transforms[tr].value.slice(0,-1).split('(')[1].split(',');

						// now convert the params to numbers
						for (pp in params) {
							params[pp] = Number(params[pp]);
						}

						if (transforms[tr].value.match('translate')) {
							translates.push(params);
						} else if (transforms[tr].value.match('matrix')) {
							matrices.push(params);
						}
						// probably need to add support for other transform types here, svg why you so complicated
						// scale, rotate, skewX, skewY
					}

					//console.log('translates', translates);

					// all translates can just be added together
					var finalTranslate = [0,0];
					for (tr in translates) {
						finalTranslate[0] = finalTranslate[0] + translates[tr][0];
						finalTranslate[1] = finalTranslate[1] + translates[tr][1];
					}
					// checked working
					//console.log('finalTranslate',finalTranslate);

					// all matrices can be multiplied together
					var finalMatrix = [1,1,1,1,1,1];
					for (var mr=0; mr<matrices.length; mr++) {
						finalMatrix[0] = finalMatrix[0]*matrices[mr][0];
						finalMatrix[1] = finalMatrix[1]*matrices[mr][1];
						finalMatrix[2] = finalMatrix[2]*matrices[mr][2];
						finalMatrix[3] = finalMatrix[3]*matrices[mr][3];
						finalMatrix[4] = finalMatrix[4]*matrices[mr][4];
						finalMatrix[5] = finalMatrix[5]*matrices[mr][5];
					}
					// needs work and then matrices need to be applied to the points
					// they are currently not
					//console.log('finalMatrix',finalMatrix);

					// then loop through each character
					for (var ca=0; ca<val.length; ca++) {
						if (val[ca].toLowerCase() == 'm' || val[ca].toLowerCase() == 'l' || val[ca].toLowerCase() == 'c' || val[ca].toLowerCase() == 'z') {
							var currentPart = val[ca];
							var partStr = '';
							ca++;

							// continue loop until another character is found
							for (var caa=ca; ca<val.length; ca++) {
								if (val[ca] == 'm' || val[ca] == 'l' || val[ca] == 'c' || val[ca] == 'z') {
									// this exits this for loop
									ca--;
									break;
								} else {
									partStr += val[ca];
								}
							}

							// remove first char if it is a space
							if (partStr.charAt(0) == ' ') {
								partStr = partStr.substr(1);
							}

							// remove last char if it is a space
							if (partStr.charAt(partStr.length-1) == ' ') {
								partStr = partStr.substr(0,partStr.length-1);
							}

							//console.log('path for part '+currentPart,partStr);

							// now split partStr up into it's arguments
							var args = partStr.split(/,| /);
							for (n=0; n<args.length; n++) {
								// make all numbers
								// parse any arithmetic in there
								args[n] = this.addbits(args[n]);
							}

							// we also add the finalTranslate to each point in a path
							if (currentPart == 'M') {
								// this is a move to or start point of the path
								// if the m is uppercase, the points are absolute
								for (var mm=0; mm<args.length; mm++) {
									thisPath.push([args[mm]+finalTranslate[0],args[mm+1]+finalTranslate[1]]);
									mm++;
								}

							} else if (currentPart == 'm') {
								// this is a move to or start point of the path
								// if the m is lowercase, the points are relative

								for (var mm=0; mm<args.length; mm++) {
									if (mm > 1) {
										// points after the first pair are relative to the previous point
										args[mm] = args[mm]+args[mm-2];
										args[mm+1] = args[mm+1]+args[mm-1];
									}
									thisPath.push([args[mm]+finalTranslate[0],args[mm+1]+finalTranslate[1],'isFromM']);
									mm++;
								}

							} else if (currentPart == 'L') {
								// this is a line to
								// if the l is uppercase, the points are absolute
								for (var mm=0; mm<args.length; mm++) {
									thisPath.push([args[mm]+finalTranslate[0],args[mm+1]+finalTranslate[1]]);
									mm++;
								}

							} else if (currentPart == 'l') {
								// this is just another point, a line to

								for (var mm=0; mm<args.length; mm++) {
									if (mm > 1) {
										// points after the first pair are relative to the previous point
										args[mm] = args[mm]+args[mm-2];
										args[mm+1] = args[mm+1]+args[mm-1];
									} else if (mm === 0) {
										// the first point needs to relative to the latest real point
										// which could be from another command like m or c, l never comes first
										args[mm] = args[mm]+thisPath[thisPath.length-1][0]-finalTranslate[0];
										args[mm+1] = args[mm+1]+thisPath[thisPath.length-1][1]-finalTranslate[1];
									}
									thisPath.push([args[mm]+finalTranslate[0],args[mm+1]+finalTranslate[1]]);
									mm++;
								}

							} else if (currentPart == 'c') {

								if (args.length%6 !== 0) {
									this.alerts.push('c command found in path which <strong>is not divisible by 6!</strong>  Something is wrong with your editor - http://www.w3.org/TR/SVG/paths.html#PathDataCubicBezierCommands');
									break;
								}

								// c commands will always be divisible by 6
								// each will have the parameters
								// first control point x, 1st cp y, 2nd cp x, 2nd cp y, end point x, end point y
								// the first point will be the first point in the m command
								// the end point of the first curve will be the 5th and 6th argument to the first c command (which is really the first 6 points)
								// with the rest of the curve being filled with points drawn out using the control points for a Cubic Bezier curve
								// s commands are the same as the c commands except use only a 2nd control point where the first is a reflection of the 2nd

								// first get each c set
								var cSets = [];
								for (var mm=0; mm<args.length; mm+=6) {
									cSets.push([[args[mm],args[mm+1]],[args[mm+2],args[mm+3]],[args[mm+4],args[mm+5]]]);
								}

								// now loop through each c set
								for (var cs=0; cs<cSets.length; cs++) {
								//for (var cs=0; cs<3; cs++) {

									if (cs > 0) {
										// points after the first pair are relative to the previous end point
										cSets[cs][0][0] = cSets[cs][0][0]+cSets[cs-1][2][0];
										cSets[cs][0][1] = cSets[cs][0][1]+cSets[cs-1][2][1];
										cSets[cs][1][0] = cSets[cs][1][0]+cSets[cs-1][2][0];
										cSets[cs][1][1] = cSets[cs][1][1]+cSets[cs-1][2][1];
										cSets[cs][2][0] = cSets[cs][2][0]+cSets[cs-1][2][0];
										cSets[cs][2][1] = cSets[cs][2][1]+cSets[cs-1][2][1];
									} else if (cs === 0) {
										// the first point needs to be relative to the latest real point
										// which could be from another command like m or l, c never comes first
										cSets[cs][0][0] = cSets[cs][0][0]+thisPath[thisPath.length-1][0]-finalTranslate[0];
										cSets[cs][0][1] = cSets[cs][0][1]+thisPath[thisPath.length-1][1]-finalTranslate[1];
										cSets[cs][1][0] = cSets[cs][1][0]+thisPath[thisPath.length-1][0]-finalTranslate[0];
										cSets[cs][1][1] = cSets[cs][1][1]+thisPath[thisPath.length-1][1]-finalTranslate[1];
										cSets[cs][2][0] = cSets[cs][2][0]+thisPath[thisPath.length-1][0]-finalTranslate[0];
										cSets[cs][2][1] = cSets[cs][2][1]+thisPath[thisPath.length-1][1]-finalTranslate[1];
									}
									var cubic = this.cubicBezier([thisPath[thisPath.length-1], [cSets[cs][0][0]+finalTranslate[0],cSets[cs][0][1]+finalTranslate[1]], [cSets[cs][1][0]+finalTranslate[0],cSets[cs][1][1]+finalTranslate[1]], [cSets[cs][2][0]+finalTranslate[0],cSets[cs][2][1]+finalTranslate[1]]]);
									for (a in cubic) {
										thisPath.push(cubic[a]);
									}
									// add end point of curve from c command
									thisPath.push([cSets[cs][2][0]+finalTranslate[0],cSets[cs][2][1]+finalTranslate[1],'isNonCurve']);
								}

							} else if (currentPart == 'z' || currentPart == 'Z') {
								// this just designates the end of the d string
							} else {
								this.alerts.push('<strong>Unknown command '+currentPart+'</strong> found in d string for path, right now Millcrum only uses the lowercase c which Inkscape exports.');
							}

						}
					}

					this.paths.push(thisPath);

				} else if (svgElements[c].nodeName == 'text' || svgElements[c].nodeName == 'rect' || svgElements[c].nodeName == 'circle' || svgElements[c].nodeName == 'ellipse' || svgElements[c].nodeName == 'line' || svgElements[c].nodeName == 'polyline' || svgElements[c].nodeName == 'polygon' || svgElements[c].nodeName == 'image' || svgElements[c].nodeName == 'use') {
					this.alerts.push('Found element that was <strong>'+svgElements[c].nodeName+'</strong>, not a <strong>path</strong>, please convert all objects to paths in your svg editor (Inkscape -> Path -> Object to Path).');
				}

			}
};

Svg.prototype.addbits = function(s){
    var total= 0, s= s.match(/[+\-]*(\.\d+|\d+(\.\d+)?)/g) || [];
    while(s.length){
        total+= parseFloat(s.shift());
    }
    return total;
}

Svg.prototype.cubicBezier = function(b) {
	// expects an array with 4 points
	// p1 (start), cp1, cp2, p2 (end)
	// should return a path of line segments from p1 to p2
	// which represent the curve

	// doing this is relatively simple, I don't know why it's not explained better on the Internet

	// first you
	// get distance for p1 -> cp1
	// get distance for cp1 -> cp2
	// get distance for cp2 -> p2

	// then if you wanted to get 100 points on the path
	// you would just do a loop with 100 iterations
	// and in each loop, do this with increase % steps based on the loop count:

	// 	get point at 1% (100 steps) of distance between p1 -> cp1
	// 	repeat for cp1 -> cp2
	// 	repeat for cp2 -> p2
	// 	then you would be down to 3 points from the original 4

	// 	then get the line distance for the 2 new lines which connect the 3 new points
	// 	and the points at 1% of each of those lines
	// 	which would leave you with 2 points

	// 	then repeat again to get the line distance for the new line which would connect those 2 points
	// 	and get the point at 1% of that line
	// 	which would give you the true point of 1% of the actual bezier curve

	//console.log('generating line segments for cubic bezier',b);
	//console.log('should generate a curved path from',b[0],'to',b[3]);

	// we use a bit of the dxf library here
	var dxfLib = new Dxf();

	// get distance to calculate a reasonable number of line segments
	var dist = dxfLib.distanceFormula(b[0],b[3]);
	if (this.units == 'in') {
		// for inches, assume a .25in bit with 10 lines segments per diameter
		var numLineSegments = Math.round(dist/(.25/10));
	} else {
		// we are assuming 1px = 1mm for your toolchain, if you are using inches change units to in
		// going to base it on 10 line segments for a 6.35mm bit
		var numLineSegments = Math.round(dist/(6.35/10));
	}

	var distances = [dxfLib.distanceFormula(b[0],b[1]),dxfLib.distanceFormula(b[1],b[2]),dxfLib.distanceFormula(b[2],b[3])];
	// we need the angle of each of the lines in distances to calculate the new points
	// which is 180 times the atan2 of the slope 180*Math.atan2(p1y-p2y,p1x-p2x)/Math.PI
	var angles = [dxfLib.addDegrees(180,180*Math.atan2(b[0][1]-b[1][1],b[0][0]-b[1][0])/Math.PI), dxfLib.addDegrees(180,180*Math.atan2(b[1][1]-b[2][1],b[1][0]-b[2][0])/Math.PI), dxfLib.addDegrees(180,180*Math.atan2(b[2][1]-b[3][1],b[2][0]-b[3][0])/Math.PI)];
	//console.log('distances for 4 original points',distances);
	//console.log('angles for those 3 lines',angles);

	var percentOfLine = 1/numLineSegments;

	var newPoints = [];

/*
	// just testing to return a point between p1 and p2
	console.log('distance',dist);
	var ang = Math.atan2(b[0][1]-b[3][1], b[0][0]-b[3][0])*180/Math.PI;
	ang = dxfLib.addDegrees(180,ang);
	console.log('angle',ang);
	//ang = dxfLib.addDegrees(angOffset,ang);
	var pt = dxfLib.newPointFromDistanceAndAngle(b[0],ang,dist/2);
	return [pt];
*/

	for (var c=1; c<numLineSegments; c++) {
		// here's the loop for each line segment
		// we need the point at percentOfLine for each line distance
		var threePoints = [];
		var twoDistances = [];
		var twoAngles = [];
		var twoPoints = [];
		var oneDistance = 0;
		var oneAngle = 0;
		var point = [];

		for (var r=0; r<distances.length; r++) {
			// this takes us from 4 points down to 3 points
			// get the 3 points for the original 3 distances
			threePoints.push(dxfLib.newPointFromDistanceAndAngle(b[r],angles[r],distances[r]*percentOfLine*c));
		}

		// get the 2 distances for those 3 points
		twoDistances = [dxfLib.distanceFormula(threePoints[0],threePoints[1]),dxfLib.distanceFormula(threePoints[1],threePoints[2])];
		// get the 2 angles for those 2 distances/3 points
		twoAngles = [dxfLib.addDegrees(180,180*Math.atan2(threePoints[0][1]-threePoints[1][1],threePoints[0][0]-threePoints[1][0])/Math.PI) ,dxfLib.addDegrees(180,180*Math.atan2(threePoints[1][1]-threePoints[2][1],threePoints[1][0]-threePoints[2][0])/Math.PI)];
		//console.log('twoAngles',twoAngles);

		// now loop through those 2 distances
		// taking us from 3 points to 2 points
		for (var r=0; r<twoDistances.length; r++) {
			twoPoints.push(dxfLib.newPointFromDistanceAndAngle(threePoints[r],twoAngles[r],twoDistances[r]*percentOfLine*c));
		}

		// now get the distance for those 2 points
		oneDistance = dxfLib.distanceFormula(twoPoints[0],twoPoints[1]);
		// and the angle for that distance/2 points
		oneAngle = dxfLib.addDegrees(180,180*Math.atan2(twoPoints[0][1]-twoPoints[1][1],twoPoints[0][0]-twoPoints[1][0])/Math.PI);

		// then finally get the one point, which actually lies on the curve
		point = dxfLib.newPointFromDistanceAndAngle(twoPoints[0],oneAngle,oneDistance*percentOfLine*c);
		//console.log('point',point);

		newPoints.push(point);

	}

	return newPoints;

}
