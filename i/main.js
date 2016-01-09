/*

		AUTHOR: Peter van der Walt
		With:
		Serial, DRO, Webcam: Andrew Hodel
		Jog Widget:  Arthur Wolf and Kliment
		3D Viewer:  John Lauer and Joe Walnes

    LaserWeb - A Web Based Marlin Laser cutter Controller
    Copyright (C) 2015 Andrew Hodel & Peter van der Walt

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

// Specific to your machine.  Also see same config in ui.js


// add some functions to the string object
String.prototype.trim = function() {
	return this.replace(/^\s+|\s+$/g,"");
}
String.prototype.ltrim = function() {
	return this.replace(/^\s+/,"");
}
String.prototype.rtrim = function() {
	return this.replace(/\s+$/,"");
}

firmware = '';


$(document).ready(function() {

	$('#3dpmode').click(function() {
    var $this = $(this);
    // $this will contain a reference to the checkbox
    if ($this.is(':checked')) {
        console.log('3dmode active');
				$('#tempDisplay').show();
				$('#tempControl').show();
    } else {
        console.log('3dmode Stopped');
				$('#tempDisplay').hide();
				$('#tempControl').hide();
    }
	});

	$('#thickness').change(function() {
		$('#perpass').val($(this).val());
		console.log((this).val());
	});

	// Spinner for Feedrate
	$('.spinnerXY .btn:first-of-type').on('click', function() {
		$('.spinnerXY input').val( parseInt($('.spinnerXY input').val(), 10) + 100);
	});
	$('.spinnerXY .btn:last-of-type').on('click', function() {
		$('.spinnerXY input').val( parseInt($('.spinnerXY input').val(), 10) - 100);
	});

	$('.spinnerZ .btn:first-of-type').on('click', function() {
		$('.spinnerZ input').val( parseInt($('.spinnerZ input').val(), 10) + 10);
	});
	$('.spinnerZ .btn:last-of-type').on('click', function() {
		$('.spinnerZ input').val( parseInt($('.spinnerZ input').val(), 10) - 10);
	});

	// Spinner for Rapids speed
	$('.spinnermove .btn:first-of-type').on('click', function() {
		$('.spinnermove input').val( parseInt($('.spinnermove input').val(), 10) + 100);
	});
	$('.spinnermove .btn:last-of-type').on('click', function() {
		$('.spinnermove input').val( parseInt($('.spinnermove input').val(), 10) - 100);
	});

	// Spinner for Cut Speed
	$('.spinnercut .btn:first-of-type').on('click', function() {
		$('.spinnercut input').val( parseInt($('.spinnercut input').val(), 10) + 100);
	});
	$('.spinnercut .btn:last-of-type').on('click', function() {
		$('.spinnercut input').val( parseInt($('.spinnercut input').val(), 10) - 100);
	});

	// Spinner for Thickness
	$('.spinnerthickness .btn:first-of-type').on('click', function() {
		$('.spinnerthickness input').val( parseInt($('.spinnerthickness input').val(), 10) + 1);
	});
	$('.spinnerthickness .btn:last-of-type').on('click', function() {
		$('.spinnerthickness input').val( parseInt($('.spinnerthickness input').val(), 10) - 1);
	});

	// Spinner for Thickness per pass (Z-down)
	$('.spinnerperpass .btn:first-of-type').on('click', function() {
		$('.spinnerperpass input').val( parseInt($('.spinnerperpass input').val(), 10) + 1);
	});
	$('.spinnerperpass .btn:last-of-type').on('click', function() {
		$('.spinnerperpass input').val( parseInt($('.spinnerperpass input').val(), 10) - 1);
	});

	// Application Inits
	var socket = io.connect(''); // socket.io init
	var gCodeToSend = null; // if uploaded file is gcode

	// Millcrum
	var ogcode = document.getElementById('fileInputGcode');
	var odxf = document.getElementById('fileInputDXF');
	var osvg = document.getElementById('fileInputSVG');
	var omc = document.getElementById('fileInputMILL');
	var millcrumCode = document.getElementById('millcrumCode');
	var toSaveGcode = '';
	var generate = document.getElementById('generate');

	// Tell server.js we have started
	socket.emit('firstLoad', 1);

	// API for GCode Upload
	socket.on('gcodeFromAPI', function (data) {
		console.log(data);
			$('#gcodepreview').val(data.val);
			$('#gcC').click();
			if (boundingBox) {
				scene.remove( boundingBox );
			}
			openGCodeFromText();
			CodeToSend = data.val;
			document.getElementById('fileName').value = 'api-data';
			$('#mainStatus').html('Status: <b>LaserWeb API </b>');
			$('#sendToLaser').removeClass('disabled');
			document.getElementById('fileInputGcode').value = '';
			document.getElementById('fileInputDXF').value = '';
			//document.getElementById('fileInputSVG').value = '';
			//document.getElementById('fileInputMILL').value = '';
			$('#console').append('<p class="pf" style="color: #000000;"><b>New data from API...</b></p>');
			$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());
	});

	// Error Handling
	socket.on('serverError', function (data) {
		alert(data);
	});

	// List serial Ports
	socket.on('ports', function (data) {
		//console.log('ports event',data);
		$('#choosePort').html('<option val="no">Select a serial port</option>');
		for (var i=0; i<data.length; i++) {
			$('#choosePort').append('<option value="'+i+'">'+data[i].comName+':  '+data[i].manufacturer+'</option>');
		}
		$("#choosePort option:contains(undefined)").remove();  // Remove ttyS ports from UI
    var length = $('#choosePort > option').length;
		// If only one port, automatically connect to it
		if (length == 2) {
			// select first and only
			$('#choosePort').val('0');
			$('#choosePort').change();
		}

	});

	// Enable the machine control buttons once a port is selected
	$("#choosePort").change(function () {
        $('#openMachineControl').removeClass('disabled');
		$('#sendCommand').removeClass('disabled');
    });

	// Updater

	$('#viewChangelog').click(function() {
		$.get( "https://raw.githubusercontent.com/openhardwarecoza/LaserWeb/master/changelog.txt", function( data ) {
			var lines = data.split('\n');
			for (var line = 0; line < lines.length; line++){
      $( "#changelog" ).append(lines[line] + '<br/>');
    	}
		});
		$('#changewidget').modal('toggle');
	});

	$('#updateGit').click(function() {
		socket.emit('updateGit', 1);
		$('#console').append('<p class="pf" style="color: #000099 ;"><b>Checking for Updates on github.com/openhardwarecoza/LaserWeb...</b></p>');
		$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());
	});

	$('#upgradeGit').click(function() {
		socket.emit('upgradeGit', 1);
		$('#console').append('<p class="pf" style="color: #000099 ;"><b>Upgrading LaserWeb Software...</b></p>');
		$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());
	});

	socket.on('updateStatus', function (data) {
		$('#console').append('<p class="pf" style="color: #000 ;">'+data+'</p>');
		$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());
		if (data.indexOf('up-to-date') != -1) {
			$('#console').append('<p class="pf" style="color: #009900 ;"><b>LaserWeb is already up to date</b></p>');
			$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());
			$('#updateGit').show();
			$('#upgradeGit').hide();

		};
		if (data.indexOf(' branch is behind') != -1) {
			$('#console').append('<p class="pf" style="color: #990000 ;"><b>Updated version of LaserWeb Available</b></p>');
			$('#console').append('<p class="pf" style="color: #222222 ;"><b>New Major features:</b></p>');
			$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());
			$.get( "https://raw.githubusercontent.com/openhardwarecoza/LaserWeb/master/changelog.txt", function( data ) {
				var lines = data.split('\n');
				for (var line = 0; line < 4; line++){
					$('#console').append('<p class="pf" style="color: #222222 ;">'+lines[line]+'</p>');
					$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());
				}
				$('#console').append('<p class="pf" style="color: #e07900 ;"><b>Click Upgrade!</b></p>');
				$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());
			});
			$('#updateGit').hide();
			$('#upgradeGit').show();
		};
	});

	socket.on('upgradeStatus', function (data) {
		$('#console').append('<p class="pf" style="color: #000 ;">'+data+'</p>');
		$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());
		$('#updateGit').show();
		$('#upgradeGit').hide();
		$('#console').append('<p class="pf" style="color: #009900 ;"><b>Upgrade Complete. Restart LaserWeb Please!</b></p>');
		$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());
	});

	// obtain config options from server
	socket.on('config', function (data) {
		//console.log(data);
		$('#updateGit').click(); // Check for updates on startup - very nb - I add code to Laserweb so often!
		laserxmax = data.xmax
		laserymax = data.ymax


		// Enable Webcam if found
		if (data.showWebCam == true) {
			// show the webcam and link
			var webroot = window.location.protocol+'//'+window.location.hostname;
			console.log(webroot);
			$('#wcImg').attr('src', webroot+':'+data.webcamPort+'/?action=stream');
			$('#wcLink').attr('href', webroot+':'+data.webcamPort+'/javascript_simple.html');
			$('#webcam').show();
			$('#webcambutton').show();
		}

	});

	// Serial / Queue / Management stuff
	socket.on('qStatus', function (data) {
		var pct = 100-((data.currentLength/data.currentMax)*100);
		if (isNaN(pct)) { pct = 0; }
		$('#qStatus').html(Math.round(pct*100)/100+'%');
		var hWidth = Number($('#qStatusHolder').width());
		$('#qStatus').css('width',(pct*hWidth/100)+'px');
	});

	socket.on('serialRead', function (data) {
		if ($('#console p').length > 300) {
			// remove oldest if already at 300 lines
			$('#console p').first().remove();
		}
		var col = 'green';
		if (data.c == '1') {
			col = 'red';
		} else if (data.c == '2') {
			col = '#555';
		} else if (data.c == '3') {
			col = 'black';
		}
		if (data.l.indexOf('ok') != 0 && data.l.indexOf('wait') != 0) {  // Seeing OK all the time distracts users from paying attention
			$('#console').append('<p class="pf" style="color: '+col+';">'+data.l+'</p>');
			$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());
		}
	});

	$('#choosePort').on('change', function() {
		// select port
		socket.emit('usePort', $('#choosePort').val());
	});

	$('#sendCommand').on('click', function() {

		socket.emit('gcodeLine', { line: $('#command').val() });
		//$('#command').val('');

	});



		// Keyboard interaction to above #sendCommand - press Shift+Enter to send commands
		$('#command').keydown(function (e) {
			if (e.shiftKey) {
				var keyCode = e.keyCode || e.which;
				if (keyCode == 13) {
					// we have shift + enter
					$('#sendCommand').click();
					// stop enter from creating a new line
					e.preventDefault();
				}
			}
		});

	$('#clearJob').on('click', function() {
		$('#gcodepreview').val('');

	});


	$('#clearQ').on('click', function() {
		// if paused let user clear the command queue
		socket.emit('clearQ', 1);
		$('#sendToLaser').removeClass('disabled');
		$('#pause').removeClass('disabled');
		// must clear queue first, then unpause (click) because unpause does a sendFirstQ on server
		$('#pause').click();
	});

	$('#pause').on('click', function() {
		if ($('#pause').html() == 'Pause') {
			// pause queue on server
			socket.emit('pause', 1);
			$('#pause').html('Unpause');
			$('#clearQ').removeClass('disabled');
		} else {
			socket.emit('pause', 0);
			$('#pause').html('Pause');
			$('#clearQ').addClass('disabled');
		}
	});


	// Enable sendToLaser button, if we receive gcode in #gcodepreview


	$('#gcodepreview').bind('input propertychange', function() {
					$('#sendToLaser').addClass('disabled');
			if(this.value.length){
				  console.log('New Gcode');
				  $('#sendToLaser').addClass('disabled');
					$('#sendToLaser').removeClass('disabled');
					openGCodeFromText();
					$('#mainStatus').html('Status: <b>Gcode</b> loaded ...');
							$('#openMachineControl').removeClass('disabled');
					$('#sendCommand').removeClass('disabled');
					$('#sendToLaser').removeClass('disabled');
        }
  });

	// Send to laser button - start the job
	$('#sendToLaser').on('click', function() {
		socket.emit('clearQ', 1);
		socket.emit('pause', 0);
		$('#sendToLaser').addClass('disabled');
		$('#pause').removeClass('disabled');
		$('#mainStatus').html('Status: Lasering');
		socket.emit('gcodeLine', { line: $('#gcodepreview').val() });  //Works with Gcode pasted in #gcodepreview too (:
		//$('#gcodepreview').val('');
	});

	// Sends single commands to laser (typed into #command)
	$('#sendCommand').on('click', function() {
		socket.emit('gcodeLine', { line: $('#command').val() });
		$('#command').val('');
	});

	$('#command').keyup(function(event){
		if(event.keyCode == 13){
			$('#sendCommand').click();
		}
	});

/* // Disabling the context menu - not as useful as I thought it would be
	 $.fn.contextMenu = function (settings) {
		return this.each(function () {

		    // Open context menu
		    $(this).on("contextmenu", function (e) {
		        // return native menu if pressing control
		        if (e.ctrlKey) return;

		        //open menu
		        var $menu = $(settings.menuSelector)
		            .data("invokedOn", $(e.target))
		            .show()
		            .css({
		                position: "absolute",
		                left: getMenuPosition(e.clientX, 'width', 'scrollLeft'),
		                top: getMenuPosition(e.clientY, 'height', 'scrollTop')
		            })
		            .off('click')
		            .on('click', 'a', function (e) {
		                $menu.hide();

		                var $invokedOn = $menu.data("invokedOn");
		                var $selectedMenu = $(e.target);

		                //settings.menuSelected.call(this, $invokedOn, $selectedMenu);
		            });

		        return false;
		    });

		    //make sure menu closes on any click
		    $(document).click(function () {
		        $(settings.menuSelector).hide();
		    });
		});

		function getMenuPosition(mouse, direction, scrollDir) {
		    var win = $(window)[direction](),
		        scroll = $(window)[scrollDir](),
		        menu = $(settings.menuSelector)[direction](),
		        position = mouse + scroll;

		    // opening menu would pass the side of the page
		    if (mouse + menu > win && menu < mouse)
		        position -= menu;

		    return position;
		}

	};



	$("#renderArea").contextMenu({
	    menuSelector: "#contextMenu",
//	    menuSelected: function (invokedOn, selectedMenu) {
//		var msg = "You selected the menu item '" + selectedMenu.text() +
//		    "' on the value '" + invokedOn.text() + "'";
//		alert(msg);
//	    }
	});

*/



	$('#bounding').on('click', function() {
		socket.emit('gcodeLine', { line: 'G90\nG0 X'+$('#BBXMIN').val()+' Y'+$('#BBYMIN').val()+' F2000\nG90' });
		socket.emit('gcodeLine', { line: 'G90\nG0 X'+$('#BBXMAX').val()+' Y'+$('#BBYMIN').val()+' F2000\nG90' });
		socket.emit('gcodeLine', { line: 'G90\nG0 X'+$('#BBXMAX').val()+' Y'+$('#BBYMAX').val()+' F2000\nG90' });
		socket.emit('gcodeLine', { line: 'G90\nG0 X'+$('#BBXMIN').val()+' Y'+$('#BBYMAX').val()+' F2000\nG90' });
		socket.emit('gcodeLine', { line: 'G90\nG0 X'+$('#BBXMIN').val()+' Y'+$('#BBYMIN').val()+' F2000\nG90' });
		// socket.emit('gcodeLine', { line: 'G91\nG0 X-100 F'+$('#jogSpeedXY').val()+'\nG90' });
	});


	// Gcode Rotate from http://ideegeniali.altervista.org/progetti/?p=gcoderotator
	function processRot() {

	 var gcode=document.getElementById("gcodepreview").value.split('\n');
	  var a,b,x,y,xstart,xend,ystart,yend;
	  var xy = new Array(2);
	  var errori = '';
	  var s = '';
	  //f.AreaOutput.value='';
	  for (var i=0; gcode.length>i; i++) {
	    a = gcode[i];
	    b = a;
	    xstart = (a + ' ').toUpperCase().indexOf('X');
	    if ((a + ' ').toUpperCase().lastIndexOf('X') != xstart) { xstart = -1 };
	    xend   = (a + ' ').toUpperCase().indexOf(' ',xstart);
	    ystart = (a + ' ').toUpperCase().indexOf('Y');
	    if ((a + ' ').toUpperCase().lastIndexOf('Y') != ystart) { ystart = -1 };
	    yend   = (a + ' ').toUpperCase().indexOf(' ',ystart);

	    if ((xstart == -1) && (ystart == -1)) {
	      ;
	    } else if ((xstart == -1) && (ystart != -1)) {
	      errori += (i+1)+'  ';
	    } else if ((xstart != -1) && (ystart == -1)) {
	      errori += (i+1)+'  ';
	    } else {
	      x  = parseFloat(a.substring(xstart+1,xend));
	      y  = parseFloat(a.substring(ystart+1,yend));
	      xy = Convert(x,y);
	      x  = xy[0];
	      y  = xy[1];
	      x  = Math.round(x*1000)/1000;
	      y  = Math.round(y*1000)/1000;
	      if (ystart > xstart) {
		b=a.substring(0,xstart+1)+x+a.substring(xend,ystart+1)+y+a.substring(yend,a.length);
	      } else {
		b=a.substring(0,ystart+1)+y+a.substring(yend,xstart+1)+x+a.substring(xend,a.length);
	      }
	    }
	    s += b + '\n';
	  }
	  if (errori != '')
		{
			$('.bottom-left').notify({
				message: { text: 'WARNING: Rotation had errors. Please Check...' },
				type: 'danger'
			}).show();
		} else {
			$('.bottom-left').notify({
				message: { text: 'Rotation Succeeded. Please Check before cutting...' },
				type: 'success'
			}).show();
		}
	theOutput=document.getElementById("gcodepreview");
	theOutput.value=s;

	}

	// *** Rectangular Polar Coordinates Conversion ***

	function module(x,y) {
	  return (Math.sqrt(Math.pow(x,2)+Math.pow(y,2)));
	}

	function arg(x,y) {
	  return (Math.atan2(y,x));
	}

	function coorx(m,a) {
	  return (m * Math.cos(a));
	}

	function coory(m,a) {
	  return (m * Math.sin(a));
	}

	function Convert(OldX,OldY) {
	  var x=OldX;
	  var y=OldY;
	  x-=parseFloat(0);
	  y-=parseFloat(0);

	  var mod_=module(x,y);

	 // Rotation Value
	  var arg_=arg(x,y);
	      var rotvalue=document.getElementById("rotAngle").value;
	      arg_ = arg_ + (rotvalue*Math.PI/180);



	  x=coorx(mod_,arg_);
	  y=coory(mod_,arg_);


	  var out = new Array(2);
	  out[0] = x;
	  out[1] = y;
	  return out;
	}


	// Gcode Scaling and Translate: from http://eng-serve.com/cnc/gcode_scale.html -->
	function translateaxis(value,match)
	{
		newValue=fd((match*1.0)+(value*1.0));

		return newValue;
	}
	function scaleaxis(value,match)
	{
		newValue=fd((match*1.0)*(value*1.0));

		return newValue;
	}
	function replacechar(match)
	{
		newValue=match;
		newValue=match.replace(/[0-9|.]+/,function(m){return replacenumber(m)});
		return newValue; //"Goo["+match+"]";
	}
	function translate(axis,value,match)
	{
		newValue=match;
		newValue=match.replace(/-?[0-9|.]+/,function(m){return translateaxis(value,m)});
		return newValue; //"Goo["+match+"]";
	}
	function scale(axis,value,match)
	{
		newValue=match;
		newValue=match.replace(/[0-9|.]+/,function(m){return scaleaxis(value,m)});
		return newValue; //"Goo["+match+"]";
	}

	function processNoNeg()
	{
		// [X|x|Y|y|Z|z|I|i|J|j].[0-9|.]+

		theInput=document.getElementById("gcodepreview").value;
		theOutput=document.getElementById("gcodepreview");
		//theInput=theInput.replace(/[X|x|Y|y|Z|z|I|i|J|j].[0-9|.]+/g,function(m){return replacechar(m)});

		transX=document.getElementById("BBXMIN").value * -1;
		transY=document.getElementById("BBYMIN").value * -1;
		//transZ=document.getElementById("ZTRANS").value;
		transZ=0

		theInput=theInput.replace(/[X|x]\s*-?[0-9|.]+/g,function(m){return translate("X",transX,m)});
		theInput=theInput.replace(/[Y|y]\s*-?[0-9|.]+/g,function(m){return translate("Y",transY,m)});
		theInput=theInput.replace(/[Z|z]\s*-?[0-9|.]+/g,function(m){return translate("Z",transZ,m)});


		// I and J are always relative so no need to translate right?
		//theInput=theInput.replace(/[I|i].+[0-9|.]+/g,function(m){return translate("I",transX,m)});
		//theInput=theInput.replace(/[J|j].+[0-9|.]+/g,function(m){return translate("J",transY,m)});
		theOutput.value=theInput;

		 if (theOutput == '')
			{
				$('.bottom-left').notify({
					message: { text: 'WARNING: -Fix 0,0- had errors. Please Check...' },
					type: 'danger'
				}).show();
			} else {
				$('.bottom-left').notify({
					message: { text: 'Fixed Negative Coordinates.  Please Check before cutting...' },
					type: 'success'
				}).show();
			}
			//textarea.value=outputstring;
		}

	function process180()
	{
		// [X|x|Y|y|Z|z|I|i|J|j].[0-9|.]+

		theInput=document.getElementById("gcodepreview").value;
		theOutput=document.getElementById("gcodepreview");
		//theInput=theInput.replace(/[X|x|Y|y|Z|z|I|i|J|j].[0-9|.]+/g,function(m){return replacechar(m)});
		scaleX= -1;
		scaleY= 1;
		//scaleZ=document.getElementById("ZSCALE").value;
		scaleZ=1

		theInput=theInput.replace(/[X|x]\s*-?[0-9|.]+/g,function(m){return scale("X",scaleX,m)});
		theInput=theInput.replace(/[Y|y]\s*-?[0-9|.]+/g,function(m){return scale("Y",scaleY,m)});
		theInput=theInput.replace(/[Z|Z]\s*-?[0-9|.]+/g,function(m){return scale("Z",scaleZ,m)});
		theInput=theInput.replace(/[I|i]\s*-?[0-9|.]+/g,function(m){return scale("I",scaleX,m)});
		theInput=theInput.replace(/[J|j]\s*-?[0-9|.]+/g,function(m){return scale("J",scaleY,m)});

		transX=document.getElementById("BBXDIM").value;
		//transY=document.getElementById("BBYDIM").value;
		//transZ=document.getElementById("ZTRANS").value;
		transZ=0

		theInput=theInput.replace(/[X|x]\s*-?[0-9|.]+/g,function(m){return translate("X",transX,m)});
		//theInput=theInput.replace(/[Y|y]\s*-?[0-9|.]+/g,function(m){return translate("Y",transY,m)});
		theInput=theInput.replace(/[Z|z]\s*-?[0-9|.]+/g,function(m){return translate("Z",transZ,m)});


		// I and J are always relative so no need to translate right?
		//theInput=theInput.replace(/[I|i].+[0-9|.]+/g,function(m){return translate("I",transX,m)});
		//theInput=theInput.replace(/[J|j].+[0-9|.]+/g,function(m){return translate("J",transY,m)});
		theOutput.value=theInput;
		//textarea.value=outputstring;
		if (theOutput == '')
			{
				$('.bottom-left').notify({
					message: { text: 'WARNING: Mirror had errors. Please Check...' },
					type: 'danger'
				}).show();
			} else {
				$('.bottom-left').notify({
					message: { text: 'Mirror Succeeded. Please Check before cutting...' },
					type: 'success'
				}).show();
			}
			//textarea.value=outputstring;

	}

	function processScale()
	{
		// [X|x|Y|y|Z|z|I|i|J|j].[0-9|.]+

		theInput=document.getElementById("gcodepreview").value;
		theOutput=document.getElementById("gcodepreview");
		//theInput=theInput.replace(/[X|x|Y|y|Z|z|I|i|J|j].[0-9|.]+/g,function(m){return replacechar(m)});
		scaleX=document.getElementById("scaleFactor").value / 100;
		scaleY=document.getElementById("scaleFactor").value / 100;
		//scaleZ=document.getElementById("ZSCALE").value;
		scaleZ=1

		theInput=theInput.replace(/[X|x]\s*-?[0-9|.]+/g,function(m){return scale("X",scaleX,m)});
		theInput=theInput.replace(/[Y|y]\s*-?[0-9|.]+/g,function(m){return scale("Y",scaleY,m)});
		theInput=theInput.replace(/[Z|Z]\s*-?[0-9|.]+/g,function(m){return scale("Z",scaleZ,m)});
		theInput=theInput.replace(/[I|i]\s*-?[0-9|.]+/g,function(m){return scale("I",scaleX,m)});
		theInput=theInput.replace(/[J|j]\s*-?[0-9|.]+/g,function(m){return scale("J",scaleY,m)});


		// I and J are always relative so no need to translate right?
		//theInput=theInput.replace(/[I|i].+[0-9|.]+/g,function(m){return translate("I",transX,m)});
		//theInput=theInput.replace(/[J|j].+[0-9|.]+/g,function(m){return translate("J",transY,m)});
		theOutput.value=theInput;
		//textarea.value=outputstring;
		if (theOutput == '')
			{
				$('.bottom-left').notify({
					message: { text: 'WARNING: Scaling had errors. Please Check...' },
					type: 'danger'
				}).show();
			} else {
				$('.bottom-left').notify({
					message: { text: 'Scaling Succeeded. Please Check before cutting...' },
					type: 'success'
				}).show();

			//textarea.value=outputstring;
		}

	}

	function processTranslate()
	{
		// [X|x|Y|y|Z|z|I|i|J|j].[0-9|.]+

		theInput=document.getElementById("gcodepreview").value;
		theOutput=document.getElementById("gcodepreview");
		//theInput=theInput.replace(/[X|x|Y|y|Z|z|I|i|J|j].[0-9|.]+/g,function(m){return replacechar(m)});

		transX=document.getElementById("XTRANS").value;
		transY=document.getElementById("YTRANS").value;
		//transZ=document.getElementById("ZTRANS").value;
		transZ=0

		theInput=theInput.replace(/[X|x]\s*-?[0-9|.]+/g,function(m){return translate("X",transX,m)});
		theInput=theInput.replace(/[Y|y]\s*-?[0-9|.]+/g,function(m){return translate("Y",transY,m)});
		theInput=theInput.replace(/[Z|z]\s*-?[0-9|.]+/g,function(m){return translate("Z",transZ,m)});

		// I and J are always relative so no need to translate right?
		//theInput=theInput.replace(/[I|i].+[0-9|.]+/g,function(m){return translate("I",transX,m)});
		//theInput=theInput.replace(/[J|j].+[0-9|.]+/g,function(m){return translate("J",transY,m)});
		theOutput.value=theInput;
		//textarea.value=outputstring;
		if (theOutput == '')
			{
				$('.bottom-left').notify({
					message: { text: 'WARNING: Positional Translation had errors. Please Check...' },
					type: 'danger'
				}).show();
			} else {
				$('.bottom-left').notify({
					message: { text: 'Translation Succeeded. Please Check before cutting...' },
					type: 'success'
				}).show();

			//textarea.value=outputstring;
		}

	}

	function fd(number)
	{
		return number_format(number,6,".","");
	}
	function number_format( number, decimals, dec_point, thousands_sep )
	{
	      // http://kevin.vanzonneveld.net
	      // + original by: Jonas Raoni Soares Silva (http://www.jsfromhell.com)
	      // + improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
	      // + bugfix by: Michael White (http://crestidg.com)
	      // + bugfix by: Benjamin Lupton
	      // + bugfix by: Allan Jensen (http://www.winternet.no)
	      // + revised by: Jonas Raoni Soares Silva (http://www.jsfromhell.com)
	      // * example 1: number_format(1234.5678, 2, '.', '');
	      // * returns 1: 1234.57
	      var n = number, c = isNaN(decimals = Math.abs(decimals)) ? 2 : decimals;
	      var d = dec_point == undefined ? "," : dec_point;
	      var t = thousands_sep == undefined ? "." : thousands_sep, s = n < 0 ? "-" : "";
	      var i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "", j = (j = i.length) > 3 ? j % 3 : 0;
	      return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
	}


	$('#scale').on('click', function() {
		processScale();
		document.getElementById('scaleFactor').value = '100';
		openGCodeFromText();
	});

	$('#translate').on('click', function() {
		processTranslate();
		document.getElementById('scaleFactor').value = '100';
		document.getElementById('XTRANS').value = '0';
		document.getElementById('YTRANS').value = '0';
		document.getElementById('ZTRANS').value = '0';
		openGCodeFromText();

	});

	$('#flip').on('click', function() {
		process180();
		document.getElementById('scaleFactor').value = '100';
		document.getElementById('XTRANS').value = '0';
		document.getElementById('YTRANS').value = '0';
		document.getElementById('ZTRANS').value = '0';
		openGCodeFromText();
		openGCodeFromText();
	});

	$('#rotate').on('click', function() {

		processRot();
		document.getElementById('scaleFactor').value = '100';
		document.getElementById('XTRANS').value = '0';
		document.getElementById('YTRANS').value = '0';
		document.getElementById('ZTRANS').value = '0';
		openGCodeFromText();
	});




	$('#noneg').on('click', function() {
		console.log('Fixing 0x0 Offset to not be Negative.');
		processNoNeg();
		document.getElementById('scaleFactor').value = '100';
		document.getElementById('XTRANS').value = '0';
		document.getElementById('YTRANS').value = '0';
		document.getElementById('ZTRANS').value = '0';
		openGCodeFromText();
	});


	// Context Menu Items
	$('#rotate90').on('click', function() {
		document.getElementById('rotAngle').value = '90';
		processRot();
		openGCodeFromText();
		$('#noneg').click();
	});

	$('#scale05x').on('click', function() {
		document.getElementById('scaleFactor').value = '50';
		processScale();
		openGCodeFromText();
	});


	$('#scale2x').on('click', function() {
		document.getElementById('scaleFactor').value = '200';
		processScale();
		openGCodeFromText();
	});

	$('#scale5x').on('click', function() {
		document.getElementById('scaleFactor').value = '500';
		processScale();
		openGCodeFromText();
	});

	$('#scale10x').on('click', function() {
		document.getElementById('scaleFactor').value = '1000';
		processScale();
		openGCodeFromText();
	});

	// End of Scaling Function



	// Jog and machine control Buttons
	$('#xM01').on('click', function() {
		socket.emit('gcodeLine', { line: 'G91\nG0 X-0.1 F'+$('#jogSpeedXY').val()+'\nG90' });
	});


	$('#xM').on('click', function() {
		socket.emit('gcodeLine', { line: 'G91\nG0 X-1 F'+$('#jogSpeedXY').val()+'\nG90' });
	});

	$('#xMTen').on('click', function() {
		socket.emit('gcodeLine', { line: 'G91\nG0 X-10 F'+$('#jogSpeedXY').val()+'\nG90' });
	});

	$('#xMCen').on('click', function() {
		socket.emit('gcodeLine', { line: 'G91\nG0 X-100 F'+$('#jogSpeedXY').val()+'\nG90' });
	});

	$('#xP01').on('click', function() {
		socket.emit('gcodeLine', { line: 'G91\nG0 X0.1 F'+$('#jogSpeedXY').val()+'\nG90' });
	});

	$('#xP').on('click', function() {
		socket.emit('gcodeLine', { line: 'G91\nG0 X1 F'+$('#jogSpeedXY').val()+'\nG90' });
	});

	$('#xPTen').on('click', function() {
		socket.emit('gcodeLine', { line: 'G91\nG0 X10 F'+$('#jogSpeedXY').val()+'\nG90' });
	});

	$('#xPCen').on('click', function() {
		socket.emit('gcodeLine', { line: 'G91\nG0 X100 F'+$('#jogSpeedXY').val()+'\nG90' });
	});

	$('#yP01').on('click', function() {
		socket.emit('gcodeLine', { line: 'G91\nG0 Y0.1 F'+$('#jogSpeedXY').val()+'\nG90' });
	});

	$('#yP').on('click', function() {
		socket.emit('gcodeLine', { line: 'G91\nG0 Y1 F'+$('#jogSpeedXY').val()+'\nG90' });
	});

	$('#yPTen').on('click', function() {
		socket.emit('gcodeLine', { line: 'G91\nG0 Y10 F'+$('#jogSpeedXY').val()+'\nG90' });
	});

	$('#yPCen').on('click', function() {
		socket.emit('gcodeLine', { line: 'G91\nG0 Y100 F'+$('#jogSpeedXY').val()+'\nG90' });
	});

	$('#yM01').on('click', function() {
		socket.emit('gcodeLine', { line: 'G91\nG0 Y-0.1 F'+$('#jogSpeedXY').val()+'\nG90' });
	});

	$('#yM').on('click', function() {
		socket.emit('gcodeLine', { line: 'G91\nG0 Y-1 F'+$('#jogSpeedXY').val()+'\nG90' });
	});

	$('#yMTen').on('click', function() {
		socket.emit('gcodeLine', { line: 'G91\nG0 Y-10 F'+$('#jogSpeedXY').val()+'\nG90' });
	});

	$('#yMCen').on('click', function() {
		socket.emit('gcodeLine', { line: 'G91\nG0 Y-100 F'+$('#jogSpeedXY').val()+'\nG90' });
	});

	$('#zP01').on('click', function() {
		socket.emit('gcodeLine', { line: 'G91\nG0 Z0.1 F'+$('#jogSpeedZ').val()+'\nG90' });
	});

	$('#zP').on('click', function() {
		socket.emit('gcodeLine', { line: 'G91\nG0 Z1 F'+$('#jogSpeedZ').val()+'\nG90' });
	});

	$('#zPTen').on('click', function() {
		socket.emit('gcodeLine', { line: 'G91\nG0 Z10 F'+$('#jogSpeedZ').val()+'\nG90' });
	});

	$('#zM01').on('click', function() {
		socket.emit('gcodeLine', { line: 'G91\nG0 Z-0.1 F'+$('#jogSpeedZ').val()+'\nG90' });
	});

	$('#zM').on('click', function() {
		socket.emit('gcodeLine', { line: 'G91\nG0 Z-1 F'+$('#jogSpeedZ').val()+'\nG90' });
	});

	$('#zMTen').on('click', function() {
		socket.emit('gcodeLine', { line: 'G91\nG0 Z-10 F'+$('#jogSpeedZ').val()+'\nG90' });
	});

	$('#homeX').on('click', function() {
		if (firmware.indexOf('Lasaur') == 0) {
			socket.emit('gcodeLine', { line: 'G30' });
		} else if (firmware.indexOf('Grbl') == 0) {
			socket.emit('gcodeLine', { line: '$H' });
		} else {
			socket.emit('gcodeLine', { line: 'G28 X0' });
		}
	});

	$('#homeY').on('click', function() {
		if (firmware.indexOf('Lasaur') == 0) {
			socket.emit('gcodeLine', { line: 'G30' });
		} else if (firmware.indexOf('Grbl') == 0) {
			socket.emit('gcodeLine', { line: '$H' });
		} else {
			socket.emit('gcodeLine', { line: 'G28 Y0' });
		}
	});

	$('#homeZ').on('click', function() {
		if (firmware.indexOf('Lasaur') == 0) {
			socket.emit('gcodeLine', { line: 'G30' });
		} else if (firmware.indexOf('Grbl') == 0) {
			socket.emit('gcodeLine', { line: '$H' });
		} else {
			socket.emit('gcodeLine', { line: 'G28 Z0' });
		}
	});

	$('#homeAll').on('click', function() {
		if (firmware.indexOf('Lasaur') == 0) {
			socket.emit('gcodeLine', { line: 'G30' });
		} else if (firmware.indexOf('Grbl') == 0) {
			socket.emit('gcodeLine', { line: '$H' });
		} else {
			socket.emit('gcodeLine', { line: 'G28' });
		}
	});

	$('#zeroWork').on('click', function() {
		socket.emit('gcodeLine', { line: 'G92 X0 Y0 Z0' });
	});

	$('#motorsOff').on('click', function() {
		socket.emit('gcodeLine', { line: 'M84' });
	});

	$('#fan25').on('click', function() {
		socket.emit('gcodeLine', { line: 'M106 S64' });
	});

	$('#fan50').on('click', function() {
		socket.emit('gcodeLine', { line: 'M106 S128' });
	});

	$('#fan75').on('click', function() {
		socket.emit('gcodeLine', { line: 'M106 S192' });
	});

	$('#fan100').on('click', function() {
		socket.emit('gcodeLine', { line: 'M106 S255' });
	});

	$('#fanOff').on('click', function() {
		socket.emit('gcodeLine', { line: 'M107' });
	});

	// Firmware Specific Buttons

	// Grbl

	$('#sendReset').on('click', function() {
		socket.emit('doReset', 1);
	});

	$('#sendUnlock').on('click', function() {
		socket.emit('gcodeLine', { line: '$X' });
	});


	$('#sendGrblHelp').on('click', function() {
		socket.emit('gcodeLine', { line: '$' });
	});

	$('#sendGrblSettings').on('click', function() {
		socket.emit('gcodeLine', { line: '$$' });
	});


	// Tabs for the CGode/Millcrum text edit blocks
	$('#mcC').on('click', function() {
		$('#mcA').addClass('active');
		$('#gcA').removeClass('active');
		$('#mcPosition').show();
		$('#gcPosition').hide();
	});

	$('#gcC').on('click', function() {
		$('#gcA').addClass('active');
		$('#mcA').removeClass('active');
		$('#gcPosition').show();
		$('#mcPosition').hide();
	});

	// Toggle Modal for Jogging and Machine Control widget
	$('#openMachineControl').on('click', function() {
		$('#machineControl').modal('toggle');
	});

	// Toggle Modal for Webcam Widget
	$('#webcambutton').on('click', function() {
		$('#webcamwidget').modal('toggle');
	});

	$("#webcamwidget").draggable({
		handle: ".modal-header"
	});

	$("#cutParams").draggable({
		handle: ".modal-header"
	});

	$("#machineControl").draggable({
		handle: ".modal-header"
	});

	$("#openJSCADUI").draggable({
		handle: ".modal-header"
	});

	$("#rasterwidget").draggable({
		handle: ".modal-header"
	});

	// handle generate click (Created GCode)
	generate.addEventListener("click", function() {

	//console.log("Creating Millcrum");
	var mcheader = 'var tool = {units:"mm",diameter:0.1,passDepth:'+$('#perpass').val()+',step:1,rapid:'+$('#rapidSpeed').val()+',plunge:10000,cut:'+$('#cutSpeed').val()+',zClearance:0,returnHome:true};\n\n';
	var mcCode = mcheader + document.getElementById('millcrumCode').value

		// This sends the mc JS vars to mc.js and creates GCode
		try {
			eval(mcCode);
		} catch (e) {
			// log it to the alert window
			console.log(e+'Millcrum Code Error:');
		}

		// Generate Gcode view and setup job for sending
		document.getElementById('millcrumCode').value = mcCode;
		openGCodeFromText();
		gCodeToSend = document.getElementById('gcodepreview').value;
				$('#console').append('<p class="pf" style="color: #000000;"><b>Incoming file Converted to GCode...</b></p>');
				$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());
		// Activate GCode Tab
		$('#gcC').click();


	});

	// Handle File Open buttons

	// open .gcode (File Open Function)
	ogcode.addEventListener('change', function(e) {
		$('#console').append('<br><span style="color: #060606;"><u><b>New Job Loaded: GCODE</b></u></span><br>');
		$('#sendToLaser').addClass('disabled');
		var fileInputGcode = document.getElementById('fileInputGcode');
		var fileName = fileInputGcode.value.replace("C:\\fakepath\\", "");
		console.log(fileName);
		var r = new FileReader();
		r.readAsText(fileInputGcode.files[0]);
		r.onload = function(e) {
				scene.remove(object);
				scene.remove(cylinder);
				scene.remove(helper);
				scene.remove(axesgrp);
				document.getElementById('millcrumCode').value = '';
				document.getElementById('gcodepreview').value = this.result;
				$('#gcC').click();
				if (boundingBox) {
					scene.remove( boundingBox );
				}
				openGCodeFromText();
				gCodeToSend = this.result;
				document.getElementById('fileName').value = fileName;
				$('#mainStatus').html('Status: <b>'+fileName+' </b> loaded ...');
				$('#sendToLaser').removeClass('disabled');
				document.getElementById('fileInputGcode').value = '';
				document.getElementById('fileInputDXF').value = '';
				//document.getElementById('fileInputSVG').value = '';
				//document.getElementById('fileInputMILL').value = '';
				$('#console').append('<p class="pf" style="color: #000000;"><b>GCode File Upload Complete...</b></p>');
				$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());

			}
		});



	// open .dxf  (File Open Function)
	odxf.addEventListener('change', function(e) {
		$('#console').append('<br><span style="color: #060606;"><u><b>New Job Loaded: DXF</b></u></span><br>');
		$('#sendToLaser').addClass('disabled');
		$("#layersbody").empty();
		var r = new FileReader();
		r.readAsText(odxf.files[0]);
		r.onload = function(e) {

			fileName = fileInputDXF.value.replace("C:\\fakepath\\", "");
			dxf = new Dxf();


			pwr = {};
			cutSpeed = {};
			row = [];

			$('#console').append('<p class="pf" style="color: #000000;"><b>Parsing DXF:...</b></p>');
			$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());

			//NEW Dxf
			var parser2 = new window.DxfParser();
			var dxf2 = parser2.parseSync(r.result);
			cadCanvas = new processDXF(dxf2);

			//END NEW DXF


			dxf.parseDxf(r.result);

			var errStr = '';
			if (dxf.invalidEntities.length > 0) {
				for (var c=0; c<dxf.invalidEntities.length; c++) {
					errStr += 'Invalid Entity: '+dxf.invalidEntities[c] + '\n';
					}
				errStr += '\n';
			}

			if (dxf.alerts.length > 0) {
				for (var c=0; c<dxf.alerts.length; c++) {
					errStr += dxf.alerts[c] + '\n\n';
				}
			}

			if (errStr != '') {
				console.log('DXF Errors:'+errStr);
				$('#console').append('<br><p class="pf" style="color: #c95500;"><b><u>DXF Errors!:</u></b><br>'+errStr+'NB! There were errors while parsing the DXF. Usually this is normal, unsupported elements are not processed. Check render before cutting...</p>');
				$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());
			}

				s = '// setup a new Millcrum object with that tool';  // tool defined in 	generate.addEventListener("click", function() {
				s += '// setup a new Millcrum object with that tool\nvar mc = new Millcrum(tool);\n\n';
				s += '// set the surface dimensions for the viewer\nmc.surface('+(dxf.width*1.1)+','+(dxf.height*1.1)+');\n\n\n';

				// convert polylines to millcrum
				for (var c=0; c<dxf.polylines.length; c++) {
					if (dxf.polylines[c].layer == '') {
						// name it polyline+c
						dxf.polylines[c].layer = 'polyline'+c;
					}
					s += '//LAYER '+dxf.polylines[c].layer+'\n';
					s += 'var polyline'+c+' = {type:\'polygon\',name:\''+dxf.polylines[c].layer+'\',points:[';
					for (var p=0; p<dxf.polylines[c].points.length; p++) {
						s += '['+dxf.polylines[c].points[p][0]+','+dxf.polylines[c].points[p][1]+'],';
					}

					//s += ']};\nmc.cut(\'centerOnPath\', polyline'+c+', '+$('#thickness').val()+', [0,0]);\n\n';
					s += ']};\n';
				}

				// convert lines to millcrum
				for (var c=0; c<dxf.lines.length; c++) {
					s += 'var line'+c+' = {type:\'polygon\',name:\'line'+c+'\',points:[';
					s += '['+dxf.lines[c][0]+','+dxf.lines[c][1]+'],';
					s += '['+dxf.lines[c][3]+','+dxf.lines[c][4]+'],';

					//s += ']};\nmc.cut(\'centerOnPath\', line'+c+', '+$('#thickness').val()+', [0,0]);\n\n';
					s += ']};\n';
				}


				//console.log(dxf);
				// for each line/polyline, do:
				for (var c=0; c<dxf.polylines.length; c++) {
					row[c] = dxf.polylines[c].layer
				}
				for (var c=0; c<dxf.lines.length; c++) {
					row[c] = dxf.polylines[c].layer
				}


				Array.prototype.unique = function()
				{
					var n = {},r=[];
					for(var i = 0; i < this.length; i++)
					{
						if (!n[this[i]])
						{
							n[this[i]] = true;
							r.push(this[i]);
						}
					}
					return r;
				}

				layers = [];
				layers = row.unique();
				//console.log(layers);
				for (var c=0; c<layers.length; c++) {
					$('#layers > tbody:last-child').append('<tr><td>'+layers[c]+'</td><td><input class=simplebox name=sp'+c+' id=sp'+c+' value=3200>&nbsp;mm/m</td><td><input class=simplebox name=pwr'+c+' id=pwr'+c+' value=100>&nbsp;%</td></tr>');
				}

			}

			document.getElementById('fileInputGcode').value = '';
			document.getElementById('fileInputDXF').value = '';


			$('#generate').hide();
			$('#dxfparamstomc').show();
			$('#svgparamstomc').hide();
			$('#cutParams').modal('toggle');
			document.getElementById('fileName').value = fileName;

	});

			//});
	$('#dxfparamstomc').on('click', function() {  // DXF job Params to MC


				//console.log(layers);
				// for each line/polyline, do:
				for (var c=0; c<dxf.polylines.length; c++) {
					var lay = layers.indexOf(dxf.polylines[c].layer);
					//console.log(lay);
					pwr[c] = $('#pwr'+lay).val();
					cutSpeed[c] = $('#sp'+lay).val();
					s += '\nmc.cut(\'centerOnPath\', polyline'+c+', '+$('#thickness').val()+', '+pwr[c]+', '+cutSpeed[c]+', [0,0]);\n\n';
				}
				for (var c=0; c<dxf.lines.length; c++) {
					s += '\nmc.cut(\'centerOnPath\', line'+c+', '+$('#thickness').val()+','+pwr[c]+', '+cutSpeed[c]+', [0,0]);\n\n';
				}

				s += '\nmc.get();\n';

				// load the new millcrum code
				document.getElementById('millcrumCode').value = s;
				document.getElementById('gcodepreview').value = '';

				$('#mcC').click();
				document.getElementById('fileName').value = fileName;
				$('#mainStatus').html('Status: <b>'+fileName+' </b> loaded ...');
				$('#sendToLaser').removeClass('disabled');
				if (boundingBox) {
					scene.remove( boundingBox );
				}
				generate.click();
				document.getElementById('fileInputGcode').value = '';
				document.getElementById('fileInputDXF').value = '';
				//document.getElementById('fileInputSVG').value = '';
				//document.getElementById('fileInputMILL').value = '';
				$('#console').append('<p class="pf" style="color: #000000;"><b>DXF File Upload Complete...</b></p>');
				$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());


	});


$('#generateOutputFileButton2').on('click', function() {
	//generateOutputFile();
	$('#openJSCADUI').modal('toggle');  // Close Modal
	console.log('Previewing');
	fileName = 'Gear Generator';
	dxf = new Dxf();
	pwr = {};
	cutSpeed = {};
	row = [];

	$('#console').append('<p class="pf" style="color: #000000;"><b>Parsing DXF:...</b></p>');
	$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());

	dxf = new Dxf();
	dxf.parseDxf($('#dxf').val());
	/*
	var errStr = '';
	if (dxf.invalidEntities.length > 0) {
		for (var c=0; c<dxf.invalidEntities.length; c++) {
			errStr += 'Invalid Entity: '+dxf.invalidEntities[c] + '\n';
			}
		errStr += '\n';
	}

	if (dxf.alerts.length > 0) {
		for (var c=0; c<dxf.alerts.length; c++) {
			errStr += dxf.alerts[c] + '\n\n';
		}
	}

	if (errStr != '') {
		console.log('DXF Errors:'+errStr);
		$('#console').append('<br><p class="pf" style="color: #c95500;"><b><u>DXF Errors!:</u></b><br>'+errStr+'NB! There were errors while parsing the DXF. Usually this is normal, unsupported elements are not processed. Check render before cutting...</p>');
		$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());
	}
	*/

		s = '// setup a new Millcrum object with that tool';  // tool defined in 	generate.addEventListener("click", function() {
		s += '// setup a new Millcrum object with that tool\nvar mc = new Millcrum(tool);\n\n';
		s += '// set the surface dimensions for the viewer\nmc.surface('+(dxf.width*1.1)+','+(dxf.height*1.1)+');\n\n\n';

		// convert polylines to millcrum
		for (var c=0; c<dxf.polylines.length; c++) {
			if (dxf.polylines[c].layer == '') {
				// name it polyline+c
				dxf.polylines[c].layer = 'polyline'+c;
			}
			s += '//LAYER '+dxf.polylines[c].layer+'\n';
			s += 'var polyline'+c+' = {type:\'polygon\',name:\''+dxf.polylines[c].layer+'\',points:[';
			for (var p=0; p<dxf.polylines[c].points.length; p++) {
				s += '['+dxf.polylines[c].points[p][0]+','+dxf.polylines[c].points[p][1]+'],';
			}

			//s += ']};\nmc.cut(\'centerOnPath\', polyline'+c+', '+$('#thickness').val()+', [0,0]);\n\n';
			s += ']};\n';
		}

		// convert lines to millcrum
		for (var c=0; c<dxf.lines.length; c++) {
			s += 'var line'+c+' = {type:\'polygon\',name:\'line'+c+'\',points:[';
			s += '['+dxf.lines[c][0]+','+dxf.lines[c][1]+'],';
			s += '['+dxf.lines[c][3]+','+dxf.lines[c][4]+'],';

			//s += ']};\nmc.cut(\'centerOnPath\', line'+c+', '+$('#thickness').val()+', [0,0]);\n\n';
			s += ']};\n';
		}


		//console.log(dxf);
		// for each line/polyline, do:
		for (var c=0; c<dxf.polylines.length; c++) {
			row[c] = dxf.polylines[c].layer
		}
		for (var c=0; c<dxf.lines.length; c++) {
			row[c] = dxf.polylines[c].layer
		}


		Array.prototype.unique = function()
		{
			var n = {},r=[];
			for(var i = 0; i < this.length; i++)
			{
				if (!n[this[i]])
				{
					n[this[i]] = true;
					r.push(this[i]);
				}
			}
			return r;
		}

		layers = [];
		layers = row.unique();
		//console.log(layers);
		for (var c=0; c<layers.length; c++) {
			$('#layers > tbody:last-child').append('<tr><td>'+layers[c]+'</td><td><input class=simplebox name=sp'+c+' id=sp'+c+' value=3200>&nbsp;mm/m</td><td><input class=simplebox name=pwr'+c+' id=pwr'+c+' value=100>&nbsp;%</td></tr>');
		}





	$('#generate').hide();
	$('#dxfparamstomc').show();
	$('#svgparamstomc').hide();
	$('#cutParams').modal('toggle');
	document.getElementById('fileName').value = fileName;

});


$('#generatePreview').on('click', function() {
	//generateOutputFile();
	//$('#gearGenerator').modal('toggle');  // Close Modal
	console.log('Previewing');
	fileName = 'Gear Generator';
	dxf = new Dxf();
	pwr = {};
	cutSpeed = {};
	row = [];

	$('#console').append('<p class="pf" style="color: #000000;"><b>Parsing DXF:...</b></p>');
	$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());

	dxf = new Dxf();
	dxf.parseDxf($('#dxf').val());

	/*var errStr = '';
	if (dxf.invalidEntities.length > 0) {
		for (var c=0; c<dxf.invalidEntities.length; c++) {
			errStr += 'Invalid Entity: '+dxf.invalidEntities[c] + '\n';
			}
		errStr += '\n';
	}

	if (dxf.alerts.length > 0) {
		for (var c=0; c<dxf.alerts.length; c++) {
			errStr += dxf.alerts[c] + '\n\n';
		}
	}

	if (errStr != '') {
		console.log('DXF Errors:'+errStr);
		$('#console').append('<br><p class="pf" style="color: #c95500;"><b><u>DXF Errors!:</u></b><br>'+errStr+'NB! There were errors while parsing the DXF. Usually this is normal, unsupported elements are not processed. Check render before cutting...</p>');
		$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());
	}
	*/

		s = '// setup a new Millcrum object with that tool';  // tool defined in 	generate.addEventListener("click", function() {
		s += '// setup a new Millcrum object with that tool\nvar mc = new Millcrum(tool);\n\n';
		s += '// set the surface dimensions for the viewer\nmc.surface('+(dxf.width*1.1)+','+(dxf.height*1.1)+');\n\n\n';

		// convert polylines to millcrum
		for (var c=0; c<dxf.polylines.length; c++) {
			if (dxf.polylines[c].layer == '') {
				// name it polyline+c
				dxf.polylines[c].layer = 'polyline'+c;
			}
			s += '//LAYER '+dxf.polylines[c].layer+'\n';
			s += 'var polyline'+c+' = {type:\'polygon\',name:\''+dxf.polylines[c].layer+'\',points:[';
			for (var p=0; p<dxf.polylines[c].points.length; p++) {
				s += '['+dxf.polylines[c].points[p][0]+','+dxf.polylines[c].points[p][1]+'],';
			}

			//s += ']};\nmc.cut(\'centerOnPath\', polyline'+c+', '+$('#thickness').val()+', [0,0]);\n\n';
			s += ']};\n';
		}

		// convert lines to millcrum
		for (var c=0; c<dxf.lines.length; c++) {
			s += 'var line'+c+' = {type:\'polygon\',name:\'line'+c+'\',points:[';
			s += '['+dxf.lines[c][0]+','+dxf.lines[c][1]+'],';
			s += '['+dxf.lines[c][3]+','+dxf.lines[c][4]+'],';

			//s += ']};\nmc.cut(\'centerOnPath\', line'+c+', '+$('#thickness').val()+', [0,0]);\n\n';
			s += ']};\n';
		}


		//console.log(dxf);
		// for each line/polyline, do:
		for (var c=0; c<dxf.polylines.length; c++) {
			row[c] = dxf.polylines[c].layer
		}
		for (var c=0; c<dxf.lines.length; c++) {
			row[c] = dxf.polylines[c].layer
		}


		Array.prototype.unique = function()
		{
			var n = {},r=[];
			for(var i = 0; i < this.length; i++)
			{
				if (!n[this[i]])
				{
					n[this[i]] = true;
					r.push(this[i]);
				}
			}
			return r;
		}

		layers = [];
		layers = row.unique();
		//console.log(layers);
		for (var c=0; c<layers.length; c++) {
			$('#layers > tbody:last-child').append('<tr><td>'+layers[c]+'</td><td><input class=simplebox name=sp'+c+' id=sp'+c+' value=3200>&nbsp;mm/m</td><td><input class=simplebox name=pwr'+c+' id=pwr'+c+' value=100>&nbsp;%</td></tr>');
		}





	$('#generate').hide();
	$('#dxfparamstomc').show();
	$('#svgparamstomc').hide();
	//$('#cutParams').modal('toggle');
	document.getElementById('fileName').value = fileName;

	//console.log(layers);
	// for each line/polyline, do:
	for (var c=0; c<dxf.polylines.length; c++) {
		var lay = layers.indexOf(dxf.polylines[c].layer);
		//console.log(lay);
		pwr[c] = $('#pwr'+lay).val();
		cutSpeed[c] = $('#sp'+lay).val();
		s += '\nmc.cut(\'centerOnPath\', polyline'+c+', '+$('#thickness').val()+', 100, 3200, [0,0]);\n\n';
	}
	for (var c=0; c<dxf.lines.length; c++) {
		s += '\nmc.cut(\'centerOnPath\', line'+c+', '+$('#thickness').val()+', 100, 3200, [0,0]);\n\n';
	}

	s += '\nmc.get();\n';

	// load the new millcrum code
	document.getElementById('millcrumCode').value = s;
	document.getElementById('gcodepreview').value = '';

	$('#mcC').click();
	document.getElementById('fileName').value = fileName;
	$('#mainStatus').html('Status: <b>'+fileName+' </b> loaded ...');
	$('#sendToLaser').removeClass('disabled');
	if (boundingBox) {
		scene.remove( boundingBox );
	}
	generate.click();
	document.getElementById('fileInputGcode').value = '';
	document.getElementById('fileInputDXF').value = '';
	//document.getElementById('fileInputSVG').value = '';
	//document.getElementById('fileInputMILL').value = '';
	$('#console').append('<p class="pf" style="color: #000000;"><b>Preview from OpenJSCAD Complete...</b></p>');
	$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());



});


	// open Gear Generator (courtesy of http://hessmer.org/gears/InvoluteSpurGearBuilder.html)
	$('#gearButton').on('click', function() {
		$('#console').append('<br><span style="color: #060606;"><u><b>Opening OpenJSCAD</b></u></span><br>');
		$('#sendToLaser').addClass('disabled');
		var gCurrentFile = null;
		var gProcessor=null;

		loadGeargen();


		$('#openJSCADUI').modal('toggle');


		document.getElementById('fileName').value = fileName;
		$('#mainStatus').html('Status: Gear Generator loaded ...');
		$('#sendToLaser').removeClass('disabled');
		generate.click();
		document.getElementById('fileInputGcode').value = '';
		document.getElementById('fileInputDXF').value = '';
		//document.getElementById('fileInputSVG').value = '';
		//document.getElementById('fileInputMILL').value = '';
		$('#console').append('<p class="pf" style="color: #000000;"><b>Gear Generator Complete...</b></p>');
		$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());

});


$('#boxButton').on('click', function() {
	$('#console').append('<br><span style="color: #060606;"><u><b>Opening OpenJSCAD</b></u></span><br>');
	$('#sendToLaser').addClass('disabled');
	var gCurrentFile = null;
	var gProcessor=null;

	loadBoxgen();



	$('#openJSCADUI').modal('toggle');


	document.getElementById('fileName').value = fileName;
	$('#mainStatus').html('Status: Gear Generator loaded ...');
	$('#sendToLaser').removeClass('disabled');
	generate.click();
	document.getElementById('fileInputGcode').value = '';
	document.getElementById('fileInputDXF').value = '';
	//document.getElementById('fileInputSVG').value = '';
	//document.getElementById('fileInputMILL').value = '';
	$('#console').append('<p class="pf" style="color: #000000;"><b>Gear Generator Complete...</b></p>');
	$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());

});

/* // Taking out SVG support  - https://github.com/openhardwarecoza/LaserWeb/issues/27
	// open .svg (File Open Function)
	osvg.addEventListener('change', function(e) {

    // Don't like having to do thi :(

		$('.bottom-left').notify({
			message: { text: 'Note: SVG is buggy at this time.  See https://github.com/openhardwarecoza/LaserWeb/issues/27 -  use DXF or GCODE if possible :(' },
			type: 'danger'
		}).show();

		// :(

		$('#svgparamstomc').show();
		$('#dxfparamstomc').hide();

		$('#console').append('<br><span style="color: #060606;"><u><b>New Job Loaded: SVG</b></u></span><br>');
		$('#sendToLaser').addClass('disabled');
		var r = new FileReader();
		r.readAsText(osvg.files[0]);
		r.onload = function(e) {

			var fileName = fileInputSVG.value.replace("C:\\fakepath\\", "");
			svg = new Svg();
			svg.process(r.result);
			pwr = {};
			cutSpeed = {};
			row = [];

			console.log('\n\nall paths',svg.paths);
			console.log('svg units '+svg.units);

			if (svg.alerts.length > 0) {
				var errStr = '';
				for (a in svg.alerts) {
					errStr += svg.alerts[a]+'\n\n';
				}
				console.log('SVG Errors:'+errStr);
				$('#console').append('<br>Parsing SVG:<br><p class="pf" style="color: #c95500;"><b><u>SVG Errors:</u></b><br>'+errStr+'</p>');
				$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());
				//doAlert(errStr, 'SVG Errors:');
			}

			// now that we have a proper path in absolute coordinates regardless of transforms, matrices or relative/absolute coordinates
			// we can write out the millcrum (clean) code

			// we need to flip all the y points because svg and cnc are reverse
			// this way, regardless, what people draw is what they get on the machine
			// that requires getting the actual min and max, moving everything into the positive
			// then flipping the y

			// millcrum code holder
			s = '// Setup SVG Job';
			s += '// setup a new Millcrum object with that tool\nvar mc = new Millcrum(tool);\n\n';
			s += '// set the surface dimensions for the viewer, svg import specified '+svg.units+'\nmc.surface('+svg.width+','+svg.height+');\n\n\n';


			for (var c=0; c<svg.paths.length; c++) {
				$('#layers > tbody:last-child').append('<tr><td>Path'+[c]+'</td><td><input class=simplebox name=sp'+[c]+' id=sp'+[c]+' value=3200>&nbsp;mm/m</td><td><input class=simplebox name=pwr'+[c]+' id=pwr'+[c]+' value=100>&nbsp;%</td></tr>');
				}

			$('#generate').hide();
			$('#dxfparamstomc').hide();
			$('#svgparamstomc').show();
			$('#cutParams').modal('toggle');

		}

});

	$('#svgparamstomc').on('click', function() {  // DXF job Params to MC

		// now loop through the paths and write them to mc code
		for (var c=0; c<svg.paths.length; c++) {
			pwr[c] = $('#pwr'+[c]).val();
			cutSpeed[c] = $('#sp'+[c]).val();
			s += 'var polygon'+c+' = {type:\'polygon\',name:\'polygon'+c+'\',points:['
			for (var p=0; p<svg.paths[c].length; p++) {
				svg.paths[c][p][1] = svg.height-svg.paths[c][p][1];
				s += '['+svg.paths[c][p][0]+','+svg.paths[c][p][1]+'],';
			}
			s += ']};\n';
			s += 'mc.cut(\'centerOnPath\', polygon'+c+', '+$('#thickness').val()+','+pwr[c]+', '+cutSpeed[c]+', [0,0]);\n\n';

		}

		s += 'mc.get();\n\n';

		// load the new millcrum code
		document.getElementById('millcrumCode').value = s;
		document.getElementById('gcodepreview').value = '';

			$('#mcC').click();
			document.getElementById('fileName').value = fileName;
			$('#mainStatus').html('Status: <b>'+fileName+' </b> loaded ...');
			$('#sendToLaser').removeClass('disabled');
			generate.click();
			document.getElementById('fileInputGcode').value = '';
			document.getElementById('fileInputDXF').value = '';
			document.getElementById('fileInputSVG').value = '';
			document.getElementById('fileInputMILL').value = '';
			$('#console').append('<p class="pf" style="color: #000000;"><b>SVG File Upload Complete...</b></p>');
			$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());

	});

	// open .millcrum (File Open Function)
	omc.addEventListener('change', function(e) {
		$('#console').append('<br><span style="color: #060606;"><u><b>New Job Loaded: MILLCRUM</b></u></span><br>');
		$('#sendToLaser').addClass('disabled');
		var r = new FileReader();
		r.readAsText(omc.files[0]);
		r.onload = function(e) {
			// load the file
			var fileName = fileInputMILL.value.replace("C:\\fakepath\\", "");
			document.getElementById('gcodepreview').value = '';
			document.getElementById('millcrumCode').value = this.result;
			$('#mcC').click();
			generate.click();

			$('#gcC').click();

			gCodeToSend = document.getElementById('gcodepreview').value;

			document.getElementById('fileName').value = fileName;

			$('#mainStatus').html('Status: <b>'+fileName+' </b> loaded ...');
			$('#sendToLaser').removeClass('disabled');
			document.getElementById('fileInputGcode').value = '';
			document.getElementById('fileInputDXF').value = '';
			document.getElementById('fileInputSVG').value = '';
			document.getElementById('fileInputMILL').value = '';
			$('#console').append('<p class="pf" style="color: #000000;"><b>MILLCRUM File Upload Complete...</b></p>');
			$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());

		}
	});*/

	// Handle File Save Button

	$('#saveGcode').on('click', function() {
		var textToWrite = document.getElementById("gcodepreview").value;
		var textFileAsBlob = new Blob([textToWrite], {type:'text/plain'});
		var fileNameToSaveAsExt = document.getElementById("fileName").value;
		var fileNameToSaveAs = fileNameToSaveAsExt.replace(/\.[^/.]+$/, "")
		var fileNameToSaveAs = fileNameToSaveAs + '-LaserWeb.gcode';

		var downloadLink = document.createElement("a");
		downloadLink.download = fileNameToSaveAs;
		downloadLink.innerHTML = "Download File";
		if (window.webkitURL != null)
		{
			// Chrome allows the link to be clicked
			// without actually adding it to the DOM.
			downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
		}
		else
		{
			// Firefox requires the link to be added to the DOM
			// before it can be clicked.
			downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
			downloadLink.onclick = destroyClickedElement;
			downloadLink.style.display = "none";
			document.body.appendChild(downloadLink);
		}

		downloadLink.click();

	});


	function destroyClickedElement(event)
	{
		document.body.removeChild(event.target);
	}


	// Handle feedback data from the machine:  Marlin
	// Position [data =  X:100.00 Y:110.00 Z:10.00 E:0.00]
	socket.on('posStatusM', function(data) {
			data = data.replace(/:/g,' ');
			data = data.replace(/X/g,' ');
			data = data.replace(/Y/g,' ');
			data = data.replace(/Z/g,' ');
			data = data.replace(/E/g,' ');
			var posArray = data.split(/(\s+)/);
			$('#mX').html('X: '+posArray[2]);
			$('#mY').html('Y: '+posArray[4]);
			$('#mZ').html('Z: '+posArray[6]);
			cylinder.position.x = (parseInt(posArray[2],10) - (laserxmax /2));
			cylinder.position.y = (parseInt(posArray[4],10) - (laserymax /2));
			cylinder.position.z = (parseInt(posArray[6],10) + 20);
	});

	// Handle position feedback data from the machine:  Smoothie
	// Position [data =  ok C: X:190.000 Y:10.000 Z:1.000 A:190.000 B:10.000 C:1.000  E:0.000 ]
	socket.on('posStatusS', function(data) {
			data = data.replace(/:/g,' ');
			data = data.replace(/X/g,' ');
			data = data.replace(/Y/g,' ');
			data = data.replace(/Z/g,' ');
			data = data.replace(/E/g,' ');
			var posArray = data.split(/(\s+)/);
			$('#mX').html('X: '+posArray[4]);
			$('#mY').html('Y: '+posArray[6]);
			$('#mZ').html('Z: '+posArray[8]);
			cylinder.position.x = (parseInt(posArray[4],10) - (laserxmax /2));
			cylinder.position.y = (parseInt(posArray[6],10) - (laserymax /2));
			cylinder.position.z = (parseInt(posArray[8],10) + 20);
	});

	// Handle feedback data from the machine:  LasaurGrbl
	// Position [data =  CL1L2L3L4X4.995Y5.005V14.11b ]
	socket.on('posStatusL', function(data) {
			//console.log(data);
			data = data.replace(/X/g,' ');
			data = data.replace(/Y/g,' ');
			data = data.replace(/V/g,' ');
			var posArray = data.split(/(\s+)/);
			//console.log(posArray);
			$('#mX').html('X: '+posArray[2]);
			$('#mY').html('Y: '+posArray[4]);
			$('#mZ').html('Z: -.--');
			cylinder.position.x = (parseInt(posArray[2],10) - (laserxmax /2));
			cylinder.position.y = (parseInt(posArray[4],10) - (laserymax /2));
			//cylinder.position.z = (parseInt(posArray[8],10) + 20);
			if (data.indexOf('C') != -1) {
			$('#chiller_status_btn').addClass('btn-danger');
			$('#chiller_status_btn').removeClass('btn-success');
			$('#chiller_status_btn').html("Chiller Failed!"); }
			if (data.indexOf('C') == -1) {
			$('#chiller_status_btn').removeClass('btn-danger');
			$('#chiller_status_btn').addClass('btn-success');
			$('#chiller_status_btn').html("Chiller Active"); }
			if (data.indexOf('D') != -1) {
			$('#door_status_btn').addClass('btn-danger');
			$('#door_status_btn').removeClass('btn-success');
			$('#door_status_btn').html("Door Open!"); }
			if (data.indexOf('D') == -1) {
			$('#door_status_btn').removeClass('btn-danger');
			$('#door_status_btn').addClass('btn-success');
			$('#door_status_btn').html("Doors Engaged"); }
			if (data.indexOf('L') != -1) {
			$('#limit_status_btn').addClass('btn-danger');
			$('#limit_status_btn').removeClass('btn-success');
			$('#limit_status_btn').html("Limit Triggered!"); }
			if (data.indexOf('L') == -1) {
			$('#limit_status_btn').removeClass('btn-danger');
			$('#limit_status_btn').addClass('btn-success');
			$('#limit_status_btn').html("Limits OK"); }
			if (data.indexOf('U') != -1) {
				$('.bottom-left').notify({
					message: { text: 'Unknown GCODE' },
					type: 'warning'
				}).show();
			}

			if (data.indexOf('N') != -1) {
				$('.bottom-left').notify({
					message: { text: 'Bad Number Format' },
					type: 'warning'
				}).show();
			}

			if (data.indexOf('E') != -1) {
				$('.bottom-left').notify({
					message: { text: 'Expected Command Letter' },
					type: 'warning'
				}).show();
			}

			if (data.indexOf('B') != -1) {
				$('.bottom-left').notify({
					message: { text: 'FW: Buffer Overflow!' },
					type: 'warning'
				}).show();
			}

			if (data.indexOf('T') != -1) {
				$('.bottom-left').notify({
					message: { text: 'Transmission Error' },
					type: 'warning'
				}).show();
			}

			if (data.indexOf('R') != -1) {
				$('.bottom-left').notify({
					message: { text: 'Serial Stop Request' },
					type: 'warning'
				}).show();
			}

	});

	// Handle feedback from the machine: Grbl

	socket.on('machineStatus', function (data) {
		//$('#mStatus').html(data.status);
		//$('#mX').html('X: '+data.mpos[0]);
		//$('#mY').html('Y: '+data.mpos[1]);
		//$('#mZ').html('Z: '+data.mpos[2]);
		$('#mX').html('X: '+data.wpos[0]);
		$('#mY').html('Y: '+data.wpos[1]);
		$('#mZ').html('Z: '+data.wpos[2]);
		cylinder.position.x = (parseInt(data.wpos[0],10) - (laserxmax /2));
		cylinder.position.y = (parseInt(data.wpos[1],10) - (laserymax /2));
		cylinder.position.z = (parseInt(data.wpos[2],10) + 20);
		//console.log(data);
	});



	// Endstop [data = echo:endstops hit:  Y:154.93] (marlin)
	socket.on('endstopAlarm', function(data) {
			console.log("Endstop Hit!");
			data = data.replace(/:/g,' ');
			var esArray = data.split(/(\s+)/);
			//console.log(esArray);  // ["echo", " ", "endstops", " ", "hit", "   ", "X", " ", "71.61"]
			$('#console').append('<p class="pf" style="color: red;">'+esArray[6]+' Axis Endstop Hit</p>');
			$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());
			$('.bottom-left').notify({
				message: { text: 'WARNING: '+esArray[6]+' Axis Endstop Hit' },
				type: 'danger'
			}).show();
	});

	// Unknown Command [data = echo:Unknown command: "X26.0480 Y29.1405 R7.4125"   unknownGcode] (marlin)
	socket.on('unknownGcode', function(data) {
			var gcArray = data.split(/:/);
			// NB MIGHT MAKE IT PAUSE WHEN THIS HAPPENS, A WRONG COMMAND MIGHT ANYWAY MEAN A RUINED JOB
			$('#console').append('<p class="pf" style="color: red;">Unknown GCode:  '+gcArray[2]+'</p>');
			$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());
			$('.bottom-left').notify({
				message: { text: 'Unknown GCODE: '+gcArray[2] },
				type: 'warning'
			}).show();
	});

	// Temp Control
	$('#sethe').on('click', function() {
		socket.emit('gcodeLine', { line: 'M104 S'+$('#hotend').val()+'\n' });
	});

	$('#setbed').on('click', function() {
		socket.emit('gcodeLine', { line: 'M140 S'+$('#hotend').val()+'\n' });
	});


	// Temp Guages
	g2 = new JustGage({
        id: 'g2',
				relativeGaugeSize: true,
        value: 0,
        min: 0,
        max: 250,
        symbol: '℃',
        pointer: true,
        pointerOptions: {
          toplength: -15,
          bottomlength: 10,
          bottomwidth: 12,
          color: '#8e8e93',
          stroke: '#ffffff',
          stroke_width: 3,
          stroke_linecap: 'round'
        },
        gaugeWidthScale: 1.1,
        counter: true
      });

	g3 = new JustGage({
					id: 'g3',
						relativeGaugeSize: true,
						value: 0,
						min: 0,
						max: 130,
						symbol: '℃',
						pointer: true,
						pointerOptions: {
							toplength: -15,
							bottomlength: 10,
							bottomwidth: 12,
							color: '#8e8e93',
							stroke: '#ffffff',
							stroke_width: 3,
							stroke_linecap: 'round'
						},
						gaugeWidthScale: 1.1,
						counter: true
					});


	// temperature [data = T:24.31 /0 @:0 B:24.31 /0 @:0]  // Not in use in UI at the moment but I want to use Marlin's temp sensing at some point to check nozzle or water temp etc on the laser (marlin)
	socket.on('tempStatus', function(data) {

		if (data.indexOf('ok') == 0) {
			// this is a normal temp status
			var fs = data.split(/[TB]/);
			var t = fs[1].split('/');
			var b = fs[2].split('/');
			t[0] = t[0].slice(1);
			b[0] = b[0].slice(1);
			for (var i=0; i<2; i++) {
				t[i] = t[i].trim();
				b[i] = b[i].trim();
			}
			$('#eTC').html(t[0]+'C');
			g2.refresh(t[0]);
			$('#eTS').html(t[1]+'C');
			$('#bTC').html(b[0]+'C');
			g3.refresh(b[0]);
			$('#bTS').html(b[1]+'C');

		} else {
			// this is a waiting temp status
			var fs = data.split(/[TB]/);
			var t = fs[1].split('/');
			var b = fs[2].split('/');
			t[0] = t[0].slice(1);
			b[0] = b[0].slice(1);
			for (var i=0; i<2; i++) {
				t[i] = t[i].trim();
				b[i] = b[i].trim();
			}
			$('#eTC').html(t[0]+'C');
			g2.refresh(t[0]);
			$('#eTS').html(t[1]+'C');
			$('#bTC').html(b[0]+'C');
			g3.refresh(b[0]);
			$('#bTS').html(b[1]+'C');
		}
	});




	socket.on('firmware', function(data) {
		firmware = data
		//console.log(firmware);
		if (firmware) {
			$('#firmwareDet').removeClass('btn-danger');
			$('#firmwareDet').addClass('btn-success');
			$('#firmwareDet').html(firmware);

			if (firmware.indexOf('Lasaur') == 0) {
				//console.log('Enabling Lasersaur Features');
				$('#console').append('<p class="pf" style="color: red;">Enabling Lasersaur Features</p>');
				$('#door_status_btn').show();
				$('#chiller_status_btn').show();
				$('#limit_status_btn').show();
				$('#zeroWork').hide();
				$('#motorsOff').hide();
				$('#FanGrp').hide();
				$('#xhomelabel').html("");
				$('#yhomelabel').html("");
				$('#zhomelabel').html("");
				$('#AirGrp').show();
			}

		if (firmware.indexOf('Grbl') == 0) {
				//console.log('Enabling Grbl Features');
				$('#console').append('<p class="pf" style="color: red;">Enabling Grbl Features</p>');
				$('#sendReset').show();
				$('#sendUnlock').show();
				$('#sendGrblHelp').show();
				$('#sendGrblSettings').show();
				$('#door_status_btn').hide();
				$('#chiller_status_btn').hide();
				$('#limit_status_btn').hide();
				$('#zeroWork').hide();
				$('#motorsOff').hide();
				$('#FanGrp').hide();
				$('#xhomelabel').html("");
				$('#yhomelabel').html("");
				$('#zhomelabel').html("");
				$('#AirGrp').show();
			}


		if (firmware.indexOf('Lasaur') == -1 && firmware.indexOf('Grbl') != 0) {
				$('#sendReset').hide();
				$('#sendUnlock').hide();
				$('#sendGrblHelp').hide();
				$('#sendGrblSettings').hide();
				$('#door_status_btn').hide();
				$('#chiller_status_btn').hide();
				$('#limit_status_btn').hide();
				//console.log('Enabling Marlin/Smoothie Features');
				$('#console').append('<p class="pf" style="color: red;">Enabling Marlin/Smoothie Features</p>');
				$('#AirGrp').hide();
				$('#zeroWork').show();
				$('#motorsOff').show();
				$('#FanGrp').show();

			};

		}
	});

	$('#code').bind('input propertychange', function() {
			console.log('empty');
				// Todo if empty
				if(this.value.length){
					updateSolid();
					console.log('full');
				}
	});

	// OpenJsCad
	$('#jsEA').on('click', function() {
		$('#jsE').addClass('active');
		$('#jsV').removeClass('active');
		$('#jsD').removeClass('active');
		$('#jsEdit').show();
		$('#jsDXF').hide();
		$('#jsView').hide();
	});
	$('#jsVA').on('click', function() {
		$('#jsV').addClass('active');
		$('#jsE').removeClass('active');
		$('#jsD').removeClass('active');
		$('#jsEdit').hide();
		$('#jsDXF').hide();
		$('#jsView').show();
	});
	$('#jsDA').on('click', function() {
		$('#jsD').addClass('active');
		$('#jsE').removeClass('active');
		$('#jsV').removeClass('active');
		$('#jsEdit').hide();
		$('#jsView').hide();
		$('#jsDXF').show();
	});

	// Raster support
	var paperscript = {};

	var fileImg = document.getElementById('fileImage');
		fileImg.addEventListener('change', function(e) {
			$('#rasterwidget').modal('toggle');
			var selectedFile = event.target.files[0];
			var reader = new FileReader();
			document.getElementById('fileImage').value = '';

			var imgtag = document.getElementById("origImage");
			imgtag.title = selectedFile.name;

			reader.onload = function(event) {
				imgtag.src = event.target.result;
				setImgDims();

			};

			reader.readAsDataURL(selectedFile);
		});

		$( "#laserpwrslider" ).slider({
				range:true,
				min: 0,
				max: 100,
				values: [ 0, 100 ],
				slide: function( event, ui ) {
					minpwr = [ui.values[ 0 ]];
					maxpwr = [ui.values[ 1 ]];
					$('#rasterNow').removeClass('disabled');
					$('#laserpwr').html( $( "#laserpwrslider" ).slider( "values", 0 ) + '% - ' + $( "#laserpwrslider" ).slider( "values", 1 ) +'%');
					setImgDims()
				}
		});
		$('#laserpwr').html( $( "#laserpwrslider" ).slider( "values", 0 ) + '% - ' + $( "#laserpwrslider" ).slider( "values", 1 ) +'%');
		minpwr = $( "#laserpwrslider" ).slider( "values", 0 );
		maxpwr = $( "#laserpwrslider" ).slider( "values", 1 );


		$( "#spotsizeslider" ).slider({
				min: 0,
				max: 250,
				values: [ 100 ],
				slide: function( event, ui ) {
					//spotSize = [ui.values[ 0 ]];
					$('#rasterNow').removeClass('disabled');
					setImgDims()
				}
		});

		$('#spotsize').html(':  '+ ($( "#spotsizeslider" ).slider( "values", 0 ) / 100) + 'mm ');
		spotSizeMul = $( "#spotsizeslider" ).slider( "values", 0 ) / 100;

		$('#rasterNow').on('click', function() {
			spotSize = $( "#spotsizeslider" ).slider( "values", 0 ) / 100;
			laserFeed = $('#feedRate').val();
			laserRapid = $('#rapidRate').val();
			window.globals = {
				  completed: function() { gcodereceived(); },
					minpwr2: [minpwr],
					maxpwr2: [maxpwr],
					spotSize: [spotSize],
					imgH: [height],
					imgW: [width],
					feed: [laserFeed],
					rapid: [laserRapid]
			};
			window.paper.RasterNow(function() {
				gcodereceived();
			});
		});

		$('#spotSize').bind('input propertychange', function() {
					//console.log('empty');
					// Todo if empty
					if(this.value.length){
					setImgDims();
					}
		});
});

var boundingBox = null;

function setImgDims() {
	spotSizeMul = $( "#spotsizeslider" ).slider( "values", 0 ) / 100;
	minpwr = $( "#laserpwrslider" ).slider( "values", 0 );
	maxpwr = $( "#laserpwrslider" ).slider( "values", 1 );

	var img = document.getElementById('origImage');
	width = img.clientWidth;
	height = img.clientHeight;
	$("#dims").text(width+'px x '+height+'px');
	$('#canvas-1').prop('width', (width*2));
	$('#canvas-1').prop('height', (height*2));
	//$('#canvas-1').prop('width', laserxmax);
	//$('#canvas-1').prop('height', laserymax);
	var physwidth = spotSizeMul * width;
	var physheight = spotSizeMul * height;
	$("#physdims").text(physwidth.toFixed(1)+'mm x '+physheight.toFixed(1)+'mm');
	$('#spotsize').html( ($( "#spotsizeslider" ).slider( "values", 0 ) / 100) + 'mm (distance between dots )<br>Resultant Job Size: '+ physwidth.toFixed(1)+'mm x '+physheight.toFixed(1)+'mm' );


	//  Draw a rect showing outer dims of Engraving - engravings with white space to sides are tricky to visualise without
	rectWidth = physwidth, rectHeight = physheight;
	if (boundingBox) {
		scene.remove( boundingBox );
	}
	BBmaterial = new THREE.LineDashedMaterial( { color: 0xcccccc, dashSize: 10, gapSize: 5, linewidth: 2 });
	BBgeometry = new THREE.Geometry();
	BBgeometry.vertices.push(
		new THREE.Vector3( -1, -1, 0 ),
		new THREE.Vector3( -1, (rectHeight + 1) , 0 ),
		new THREE.Vector3( (rectWidth + 1), (rectHeight +1), 0 ),
		new THREE.Vector3( (rectWidth + 1), -1, 0 ),
		new THREE.Vector3( -1, -1, 0 )
	);
 	boundingBox= new THREE.Line( BBgeometry, BBmaterial );
	boundingBox.translateX(laserxmax /2 * -1);
	boundingBox.translateY(laserymax /2 * -1);
 	scene.add( boundingBox );
	};

function gcodereceived() {
	$('#rasterwidget').modal('toggle');
	console.log('New Gcode');
	$('#sendToLaser').removeClass('disabled');
	openGCodeFromText();
	gCodeToSend = document.getElementById('gcodepreview').value;
	$('#mainStatus').html('Status: <b>Gcode</b> loaded ...');
	$('#openMachineControl').removeClass('disabled');
	$('#sendCommand').removeClass('disabled');
	$('#sendToLaser').removeClass('disabled');
};
