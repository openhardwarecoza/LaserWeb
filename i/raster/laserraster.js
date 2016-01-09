/*

    AUTHOR:  Peter van der Walt

    LaserWeb Raster to GCODE Paperscript
    Copyright (C) 2015 Peter van der Walt

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
    WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
    MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
    ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
    WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
    ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
    OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.

*/

// add MAP function to the Numbers function
Number.prototype.map = function (in_min, in_max, out_min, out_max) {
  return (this - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

this.RasterNow = function( _callback){
  console.time("Process Raster");
  var startTime = Date.now();

  // Initialise
	project.clear();
	var path = '';
	var raster = '';
  var lastgrey = '';
	var intensity = '';
	var gcodex = '';
	var gcodey = '';

  //Pull params from the Global context
  minIntensity = globals.minpwr2;
  maxIntensity = globals.maxpwr2;
  spotSize1 = globals.spotSize;
  imgheight = globals.imgH;
  imgwidth = globals.imgW;
  feedRate = globals.feed;
  rapidRate = globals.rapid;

  // Log it as a sanity check
  console.log('Constraining Laser power between '+minIntensity+'% and '+maxIntensity+'%');
  console.log('Height: '+imgheight+'px, Width: '+imgwidth+'px');
  console.log('Spot Size: '+spotSize1+'mm');
  console.log('Raster Width: '+raster.width+' Height: '+raster.height);
  console.log('G0: '+rapidRate+' mm/min, G1: '+feedRate+' mm/min');


  // Create a raster item using the image tag 'origImage'
  raster = new Raster('origImage');
  raster.visible = false;
  var gridSize = 1;
  var spacing = 1;

  // As the web is asynchronous, we need to wait for the raster to load before we can perform any operation on its pixels.
  raster.on('load', function() {

    var imgheight = globals.imgH;
    var imgwidth = globals.imgW;
    console.log('Width: '+imgwidth+'  Height: '+imgheight);

    // Init some variables we'll be using in the process
    s = ''; // Resultant gcode
    c = 0;  // Keep count of Gcode lines so we can optimise, lower = better
    xm = 0; // Keep count of Gcode lines so we can optimise, lower = better
    skip = 0;
    var dir = 1;
    var lastPosx = '0';
    var lastPosy = '0';
    var lastIntensity = '0';
    var megaPixel = 0;
    var todraw = 0;

    // GCODE Header
    s += '; GCODE generated by Laserweb \n';
    s += '; Laser Max: '+minIntensity+'%\n';
    s += '; Laser Min: '+maxIntensity+'%\n';
    s += '; Laser Spot Size '+spotSize1+'mm\n';
    s += '; Laser Feedrate '+feedRate+'mm/min\n\n';
    s += 'G21\nG90\nG1 F'+feedRate+'\nG0 F'+rapidRate+'\n';

    // Iterate through the Pixels

    for (var y = 0; y < raster.height; y++) {
      posy = y;
      posy = (posy * spotSize1);
      posy = posy.toFixed(1);
      newLine = (imgheight * spotSize1) - posy  // Offset Y since Gcode runs from bottom left and paper.js runs from top left
      s += 'G0 Y'+newLine+'\n';
      // Left To Right!
	  for(var x = 0; x < raster.width ; x++) {
        //console.log('Spot: X: '+x+' Y: '+y);
        megaPixel++
        color = raster.getPixel(x, y);
        // Scale the path by the amount of gray in the pixel color:
        grayLevel = color.gray.toFixed(1);  // var grayLevel = color.gray.toFixed(2); // two decimal precision is plenty - for testing I will drop it to 1 decimal (10% increments)
        if (dir > 0) {
			posx = x + 1;
		} else {
			posx = raster.width -1 -x
		}
        posy = y;


        // Optimise: when the greyValue is the same as the one before, we don't write it, we append it and write on longer G1 move instead
				if (typeof lastGrey != 'undefined' && lastGrey == grayLevel && (x+1) != raster.width && x != 0) {  // Optimisation code:  Test file without this was 50363 lines, with this was only 18292 lines.
					//console.log('Could Optimise, still on '+grayLevel);
					xm++; // Increment the X step over
          skip++
          todraw = 0;
				} else {

          if (xm > 0) {
            //posx = posx - (xm / 1000);
          }
          intensity = (1 -grayLevel) * 100; //  Also add out Firmware specific mapping using intensity (which is 0-100) and map it between minIntensity and maxIntensity variables above * firmware specific multiplier (grbl 0-255, smoothie 0-1, etc)
          //Constraining Laser power between minIntensity and maxIntensity
          //console.log('Constraining');

          if (parseFloat(intensity) > 0) {
            intensity = intensity.map(0, 100, parseInt(minIntensity,10), parseInt(maxIntensity,10));
          } else {
            intensity = 0;
          };

          // Firmware Specific Gcode Output
          if (firmware.indexOf('Grbl') == 0) {
            intensity = intensity.map(0, 100, 0, 255);
            //console.log('Mapping Intensity range for Grbl S0-S255');
            intensity = intensity.toFixed(0);
          } else if (firmware.indexOf('Smooth') == 0) {
            intensity = intensity.map(0, 100, 0, 1);
            //console.log('Mapping Intensity range for Smoothieware S0-S1');
            intensity = intensity.toFixed(2);
          } else {
            intensity = intensity.map(0, 100, 0, 100);
            //console.log('Mapping Intensity range for S0-S100');
            intensity = intensity.toFixed(0);
          }

          c++;
          xm = 0;
          //console.log('From: '+lastPosx+', '+lastPosy+'  - To: '+posx+', '+posy+' at '+lastIntensity+'%');

          posx = (posx * spotSize1);
          posy = (posy * spotSize1);
          posx = posx.toFixed(1);
          posy = posy.toFixed(1);
          gcodey = (imgheight * spotSize1) - posy  // Offset Y since Gcode runs from bottom left and paper.js runs from top left
          gcodey = gcodey.toFixed(1);

          if (lastIntensity > 0) {
            s += 'G1 X'+posx+' Y'+gcodey+' S'+lastIntensity+' ; Engrave ->\n';
          } else {
            if (intensity > 0 ) {
              s += 'G0 X'+posx+' Y'+gcodey+' ; Whitespace ->\n';
            };
          }

          // Draw canvas (not used for GCODE generation)
          path = new Path.Line({
            from: [(lastPosx * gridSize), (lastPosy * gridSize)],
            to: [(posx * gridSize), (posy * gridSize)],
            strokeColor: 'black'
          });
          path.strokeColor = 'black';
          //path.scale(1 - grayLevel);
          path.opacity = (lastIntensity / 100);

          // store to use in next loop
          var lastIntensity = intensity;
          var lastGrey = grayLevel; // store to compare in next loop
        } // end of optimaise

      }
      // End of line handling
      if (xm > 0) {
        //posx = posx - (xm / 1000);
      }
      dir = - dir;
    }

  // Populate the GCode textarea
  document.getElementById('gcodepreview').value = s;
  console.log('Optimsed by number of line: '+skip);

  // Some Post-job Stats and Cleanup
  console.log('Number of GCode Moves: '+c);
  var pixeltotal = raster.width * raster.height;
  console.log('Pixels: '+megaPixel+' done, of '+pixeltotal);

  console.timeEnd("Process Raster");
  var currentTime = Date.now();
  var elapsed = (currentTime - startTime);
  $('#console').append('<p class="pf" style="color: #009900;"><b>Raster completed in '+elapsed+' ms</b></p>');
  $('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());
  _callback();  // Done!
});
};
