/*

    AUTHOR:  John Lauer
    -- Significant UI changes by AUTHOR: Peter van der Walt

*/


var scene = null;
var object = null;
var cylinder = null;
var axes = null;
var axesgrp = null;
var helper = null;


var added = false;


// Specific to your machine
var laserxmax = 600
var laserymax = 400
var lineincrement = 50


$(function() {

	scene = createScene($('#renderArea'));
});

function createObject(gcode) {
  if (object) {
        scene.remove(object);
    }
    object = createObjectFromGCode(gcode);
	object.translateX(laserxmax /2 * -1);
	object.translateY(laserymax /2 * -1);

    scene.add(object);

 if (cylinder) {
        scene.remove(cylinder);
    }
	// jogArrow Cylinder
    		cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0, 5, 40, 15, 1, false), new THREE.MeshNormalMaterial());
            cylinder.overdraw = true;
            cylinder.rotation.x = -90 * Math.PI / 180;
            cylinder.material.opacity = 0.6;
            cylinder.material.transparent = true;
            cylinder.castShadow = false;
            cylinder.position.x = (laserxmax /2 * -1)
			cylinder.position.y = (laserymax /2 * -1)
			cylinder.position.z = 20;
			cylinder.needsUpdate = true;
		scene.add(cylinder)


 if (helper) {
        scene.remove(helper);
    }

	helper = new THREE.GridHelperRect((laserxmax /2), 10, (laserymax /2), 10);
            helper.setColors(0x0000ff, 0x707070);
            helper.position.y = 0;
            helper.position.x = 0;
            helper.position.z = 0;
            helper.rotation.x = 90 * Math.PI / 180;
            helper.material.opacity = 0.15;
            helper.material.transparent = true;
            helper.receiveShadow = false;
            //console.log("helper grid:", helper);
            this.grid = helper;
            //this.sceneAdd(this.grid);
			scene.add(helper);



 if (axes) {
        scene.remove(axes);
    }

 if (axesgrp) {
        scene.remove(axesgrp);
    }
	axesgrp = new THREE.Object3D();

	        axes = new THREE.AxisHelper(120);

            axes.material.transparent = true;
            axes.material.opacity = 0.8;
            axes.material.depthWrite = false;
            axes.position.set(0,0,-0.0001);
            axes.translateX(laserxmax /2 * -1);
			axes.translateY(laserymax /2 * -1);

            scene.add(axes);

			var x = [];
			var y = [];
		    for (var i = 0; i < laserxmax ; i+=lineincrement) {

				x[i] = this.makeSprite(this.scene, "webgl", {
					x: i,
					y: -10,
					z: 0,
					text: i,
					color: "#ff0000"
				});
				axesgrp.add(x[i]);
			}

			 for (var i = 0; i < laserymax ; i+=lineincrement) {

				y[i] = this.makeSprite(this.scene, "webgl", {
					x: -10,
					y: i,
					z: 0,
					text: i,
					color: "#006600"
				});
				axesgrp.add(y[i]);
			}
		    // add axes labels
            var xlbl = this.makeSprite(this.scene, "webgl", {
                x: 125,
                y: 0,
                z: 0,
                text: "X",
                color: "#ff0000"
            });
            var ylbl = this.makeSprite(this.scene, "webgl", {
                x: 0,
                y: 125,
                z: 0,
                text: "Y",
                color: "#006600"
            });
            var zlbl = this.makeSprite(this.scene, "webgl", {
                x: 0,
                y: 0,
                z: 125,
                text: "Z",
                color: "#0000ff"
            });


            axesgrp.add(xlbl);
            axesgrp.add(ylbl);
            axesgrp.add(zlbl);

			axesgrp.translateX(laserxmax /2 * -1);
			axesgrp.translateY(laserymax /2 * -1);
			scene.add(axesgrp);

	}

function openGCodeFromText() {
	console.time("Process 3D View");
	var startTime = Date.now();
	var gcode = $('#gcodepreview').val();
	//if (document.hasFocus()) {
	createObject(gcode);
        //console.log('adding object with existing focus');
  //  } else {
        // wait for focus, then render
        //console.log('waiting for focus');
	//$(window).bind('focus', function(event) {
	//    createObject(gcode);
  //          //console.log('focus exists');
  //          // unbind for next object load
            $(this).unbind(event);
  //      });
  //  }
	console.timeEnd("Process 3D View");
	var currentTime = Date.now();
	var elapsed = (currentTime - startTime);
	$('#console').append('<p class="pf" style="color: #009900;"><b>3D Render completed in '+elapsed+' ms</b></p>');
	$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());
}

function makeSprite(scene, rendererType, vals) {
            var canvas = document.createElement('canvas'),
                context = canvas.getContext('2d'),
                metrics = null,
                textHeight = 100,
                textWidth = 0,
                actualFontSize = 10;
            var txt = vals.text;
            if (vals.size) actualFontSize = vals.size;

            context.font = "normal " + textHeight + "px Arial";
            metrics = context.measureText(txt);
            var textWidth = metrics.width;

            canvas.width = textWidth;
            canvas.height = textHeight;
            context.font = "normal " + textHeight + "px Arial";
            context.textAlign = "center";
            context.textBaseline = "middle";
            //context.fillStyle = "#ff0000";
            context.fillStyle = vals.color;

            context.fillText(txt, textWidth / 2, textHeight / 2);

            var texture = new THREE.Texture(canvas);
            texture.needsUpdate = true;
						texture.minFilter = THREE.LinearFilter;

            var material = new THREE.SpriteMaterial({
                map: texture,
                useScreenCoordinates: false,
                transparent: true,
                opacity: 0.6
            });
            material.transparent = true;
            //var textObject = new THREE.Sprite(material);
            var textObject = new THREE.Object3D();
            textObject.position.x = vals.x;
            textObject.position.y = vals.y;
            textObject.position.z = vals.z;
            var sprite = new THREE.Sprite(material);
            textObject.textHeight = actualFontSize;
            textObject.textWidth = (textWidth / textHeight) * textObject.textHeight;
            if (rendererType == "2d") {
                sprite.scale.set(textObject.textWidth / textWidth, textObject.textHeight / textHeight, 1);
            } else {
                sprite.scale.set(textWidth / textHeight * actualFontSize, actualFontSize, 1);
            }

            textObject.add(sprite);

            //scene.add(textObject);
            return textObject;
}
