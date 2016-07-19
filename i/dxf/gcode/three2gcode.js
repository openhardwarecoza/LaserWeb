/*

    AUTHOR:  John Lauer
    -- changes by AUTHOR: Peter van der Walt

*/

var options = {};

/**
* Iterate over the text3d that was generated and create
* Gcode to mill/cut the three.js object.
*/
function generateGcodeCallback(threeGroup, cutSpeed, laserPwr, rapidSpeed) {

console.log('inside generateGcodeCallback')
console.log('Group', threeGroup);
console.log('CutSpeed', cutSpeed);
console.log('Laser Power', laserPwr);
console.log('RapidSpeed', rapidSpeed);
   // get settings
   //getSettings();

   // Firmware specific Sxxx params
   if (firmware.indexOf('Grbl') == 0) {
      laserPwr = laserPwr * 2.55;
      laserPwr = laserPwr.toFixed(0);
   } else if (firmware.indexOf('Smooth') == 0) {
     laserPwr = laserPwr / 100; //.map(0, 100, 0, 1);
     laserPwr = laserPwr.toFixed(2);
   } else if (firmware.indexOf('Lasaur') == 0) {
     laserPwr = laserPwr * 2.55;
     laserPwr = laserPwr.toFixed(0);
   } else {
     laserPwr = laserPwr;
   }


   options["pointsperpath"] = 1;
   options["holes"] = 0;
   options["cut"] = 'solid';
   options["dashPercent"] = 20;
   options["mode"] = 'laser';
   options["laseron"] = 'M3';
   options["lasersvalue"] = laserPwr;
   options["millclearanceheight"] = 5.00;
   options["milldepthcut"] = 3.00;
   options["millfeedrateplunge"] = 200.00;
   options["feedrate"] = cutSpeed;

	  var g = "";

   // get the THREE.Group() that is the txt3d
   var grp = threeGroup
   var txtGrp = threeGroup;

   var that = this;
   var isLaserOn = false;
   var isAtClearanceHeight = false;
   var isFeedrateSpecifiedAlready = false;
   subj_paths = [];
   subj_path2 = [];
   console.log(txtGrp);
   txtGrp.traverse( function(child) {
       if (child.type == "Line") {
           // let's create gcode for all points in line
           for (i = 0; i < child.geometry.vertices.length; i++) {

               var localPt = child.geometry.vertices[i];
               var worldPt = grp.localToWorld(localPt.clone());
               if (i == 0) {
                   // first point in line where we start lasering/milling
                   // move to point

                   // if milling, we need to move to clearance height
                   if (options.mode == "mill") {
                       if (!isAtClearanceHeight) {
                           g += "G0 Z" + options.millclearanceheight + "\n";
                       }
                   }

                   // move to start point
                   g += "G0 X" + worldPt.x.toFixed(3) +
                       " Y" + worldPt.y.toFixed(3) + " F" + rapidSpeed + "\n";


                  //subj_paths.push(worldPt.x.toFixed(3) +',' + worldPt.y.toFixed(3));
                   // if milling move back to depth cut
                   if (options.mode == "mill") {
                       var halfDistance = (options.millclearanceheight - options.milldepthcut) / 2;
                       g += "G0 Z" + (options.millclearanceheight - halfDistance).toFixed(3)
                           + "\n";
                       g += "G1 F" + options.millfeedrateplunge +
                           " Z" + options.milldepthcut + "\n";
                       isAtClearanceHeight = false;
                   }

               }
               else {

                   // we are in a non-first line so this is normal moving

                   // see if laser or milling
                   if (options.mode == "laser") {

                       // if the laser is not on, we need to turn it on
                    if (firmware.indexOf('Grbl') == 0) {
                       if (!isLaserOn) {
                           if (options.laseron == "M3") {
                               g += "M3 S" + options.lasersvalue;
                           } else {
                               g += options.laseron;
                           }
                           g += " ;laser on\n";
                           isLaserOn = true;
                       }
                     }
                   } else {
                       // this is milling. if we are not at depth cut
                       // we need to get there


                   }

                   // do normal feedrate move
                   var feedrate;
                   if (isFeedrateSpecifiedAlready) {
                       feedrate = "";
                   } else {
                       feedrate = " F" + options.feedrate;
                       isFeedrateSpecifiedAlready = true;
                   }
                   //console.log('World', worldPt);
                   //console.log('Local', localPt);
                   g += "G1" + feedrate;
                   g += " X" + worldPt.x.toFixed(3);
                   g += " Y" + worldPt.y.toFixed(3);
                   g += " S" + options.lasersvalue + "\n";
                   //subj_paths.push(worldPt.x.toFixed(3) +',' + worldPt.y.toFixed(3));
                   var xpos = parseFloat(worldPt.x.toFixed(3));
                   var ypos = parseFloat(worldPt.y.toFixed(3));
                   subj_paths.push({X:xpos,Y:ypos});


               }
           }

           // make feedrate have to get specified again on next line
           // if there is one
           isFeedrateSpecifiedAlready = false;

           // see if laser or milling
           if (options.mode == "laser") {
               // turn off laser at end of line
               isLaserOn = false;
               if (firmware.indexOf('Grbl') == 0) {
                 if (options.laseron == "M3")
                     g += "M5 ;laser off;\n";
                 else
                     g += "M9 ;laser off;\n";
              }
           } else {
               // milling. move back to clearance height
               g += "G0 Z" + options.millclearanceheight + "\n";
               isAtClearanceHeight = true;
           }
           console.log('Input Path', subj_paths);
           subj_path2 = getInflatedPath(subj_paths, 5);
           console.log('Output Path', subj_path2);

          // var mesh = createClipperPathsAsMesh(subj_path2, 0xff0000, 0.2, subj_path2);
          // tool_offset = createClipperPathsAsLines(subj_path2);
          // tool_offset.translateX(laserxmax /2 * -1);
          // tool_offset.translateY(laserymax /2 * -1);
          // tool_offset.name = 'Mill Path';
          //scene.add(tool_offset);  // Plasma Mode! W.I.P



       }
   });

   console.log("generated gcode. length:", g.length);

  isGcodeInRegeneratingState = false;

  // Remove DXF Preview
  if (typeof(dxfObject) !== 'undefined') {
    scene.remove(dxfObject);
  };

  // Send to LaserWeb
  //document.getElementById("gcodepreview").value = g;
  return g;

};


function getInflatedPath(paths, delta, joinType) {
var scale = 10000;
  console.log('Inside getInflatedPath');
     ClipperLib.JS.ScaleUpPath(paths, scale);
     console.log('Scaled Path: ', paths);
     var miterLimit = 2;
     var arcTolerance = 10;
     joinType = joinType ? joinType : ClipperLib.JoinType.jtRound
     var co = new ClipperLib.ClipperOffset(miterLimit, arcTolerance);
     co.AddPath(paths, joinType, ClipperLib.EndType.etClosedPolygon);
     //var delta = 0.0625; // 1/16 inch endmill
     var offsetted_paths = new ClipperLib.Path();
     co.Execute(offsetted_paths, delta * scale);

     console.log('Offset Path: ', offsetted_paths);
       // scale back down
       for (var i = 0; i < offsetted_paths.length; i++) {
           for (var j = 0; j < offsetted_paths[i].length; j++) {
               offsetted_paths[i][j].X = offsetted_paths[i][j].X / scale;
               offsetted_paths[i][j].Y = offsetted_paths[i][j].Y / scale;
           }
       }
       ClipperLib.JS.ScaleDownPaths(paths, scale);
     return offsetted_paths;

 };

 function createClipperPathsAsLines(paths) {

   var geometry = new THREE.Geometry(),
     color = 0xff0000,
     material, lineType, vertex, startPoint, endPoint, i, line;


   if (paths.length == 1) {
       var shape = new THREE.Shape();
       var i = 0;
       for (var j = 0; j < paths[i].length; j++) {
           var pt = paths[i][j];
           //if (j == 0) shape.moveTo(pt.X, pt.Y);
           //else shape.lineTo(pt.X, pt.Y);
           geometry.vertices.push(new THREE.Vector3(pt.X, pt.Y, 0));
       }
    };

    material = new THREE.LineBasicMaterial({ linewidth: 1, color: color, transparent: true });

    millgeom = new THREE.Line(geometry, material);
    return millgeom;

 };

 function createClipperPathsAsMesh(paths, color, opacity, holePath) {
             //console.log("createClipperPathsAsMesh. paths:", paths, "holePath:", holePath);
             if(color === undefined)
                color = 0xff0000;
             var mat = new THREE.MeshBasicMaterial({
                 color: color,
                 transparent: true,
                 opacity: opacity,
                 side: THREE.DoubleSide,
                 depthWrite: false
             });


             if (paths.length == 1) {
                 var shape = new THREE.Shape();
                 var i = 0;
                 for (var j = 0; j < paths[i].length; j++) {
                     var pt = paths[i][j];
                     if (j == 0) shape.moveTo(pt.X, pt.Y);
                     else shape.lineTo(pt.X, pt.Y);
                 }

                 // see if asked to create hole
                 // multiple holes supported now
                 if (holePath !== undefined && holePath != null) {
                     if (!(Array.isArray(holePath))) {
                         holePath = [holePath];
                     }

                     for (var hi = 0; hi < holePath.length; hi++) {
                         var hp = holePath[hi];
                         console.log("adding hole:", hp);
                         var hole = new THREE.Path();
                         //var i = 0;
                         for (var j = 0; j < hp.length; j++) {
                             var pt = hp[j];
                             if (j == 0) hole.moveTo(pt.X, pt.Y);
                             else hole.lineTo(pt.X, pt.Y);
                         }
                         shape.holes.push(hole);
                     }
                 }

                 var geometry = new THREE.ShapeGeometry( shape );
                 var shapeMesh = new THREE.Mesh(geometry, mat);

                 //group.add(shapeMesh);
                 return shapeMesh;
             } else {
                 var group = new THREE.Object3D();

                 for (var i = 0; i < paths.length; i++) {
                     var shape = new THREE.Shape();
                     for (var j = 0; j < paths[i].length; j++) {
                         var pt = paths[i][j];
                         if (j == 0) shape.moveTo(pt.X, pt.Y);
                         else shape.lineTo(pt.X, pt.Y);
                     }

                     // see if asked to create hole
                     // multiple holes supported now
                     if (holePath !== undefined && holePath != null) {
                         if (!(Array.isArray(holePath))) {
                             holePath = [holePath];
                         }

                         for (var hi = 0; hi < holePath.length; hi++) {
                             var hp = holePath[hi];
                             console.log("adding hole:", hp);
                             var hole = new THREE.Path();
                             //var i = 0;
                             for (var j = 0; j < hp.length; j++) {
                                 var pt = hp[j];
                                 if (j == 0) hole.moveTo(pt.X, pt.Y);
                                 else hole.lineTo(pt.X, pt.Y);
                             }
                             shape.holes.push(hole);
                         }
                     }

                     var geometry = new THREE.ShapeGeometry( shape );
                     var shapeMesh = new THREE.Mesh(geometry, mat);

                     group.add(shapeMesh);
                 }
                 return group;
             }
             //this.sceneAdd(group);

         };
