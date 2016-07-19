/*

		AUTHOR: Peter van der Walt
		With:
		Serial, DRO, Webcam: Andrew Hodel
		Jog Widget:  Arthur Wolf and Kliment
		3D Viewer:  John Lauer and Joe Walnes
		SVG: Jordan Sitkin https://github.com/dustMason/Machine-Art
		DXF: Andrew Hodel and https://github.com/gdsestimating/three-dxf

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

// First thing first - see if we have WebGL available!

var canvas = ''
var webgl = ''
canvas = !! window.CanvasRenderingContext2D;
webgl = ( function () { try { return !! window.WebGLRenderingContext && !! document.createElement( 'canvas' ).getContext( 'experimental-webgl' ); } catch( e ) { return false; } } )();


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
var svgscale = 0;
var svgrows = '';

var gcodePreamble = [];
var gcodePostamble = [];

$(document).ready(function() {

	// Tooltips
	$('.btn').tooltip();


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

	var localSettings = []; // locally stored presets

	socket.on('machinesettings', function (data) {
		// incoming presets
		localSettings = data.machines;
		loadMachineSettings(data.exists);
		//console.log(localSettings);
	});


  //  Keep track of websocket server status
	// Can be used to detect when server.js goes up and down, etc
	socket.on('error', function(exception) {
	  console.log('SOCKET ERROR: '+exception);
		$('#console').append('<p class="pf" style="color: #ff0000;"><b>WS Server Error:</b> '+exception+'</p>Check whether node server.js is running');
		$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());
		$('#wsDet').removeClass('btn-success');
		$('#wsDet').addClass('btn-danger');
		$('#wsDet').html('Server: ERR: '+exception);
	})

	socket.on('close', function(exception) {
		console.log('SOCKET CLOSE '+exception);
		$('#console').append('<p class="pf" style="color: #ff0000;"><b>WS Server Closed:</b> '+exception+'</p>Check whether node server.js is running');
		$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());
		$('#wsDet').removeClass('btn-success');
		$('#wsDet').addClass('btn-danger');
		$('#wsDet').html('Server: CLOSED');
	})

	socket.on('disconnect', function(exception) {
		console.log('SOCKET DISCONNECT '+exception);
		$('#console').append('<p class="pf" style="color: #ff0000;"><b>WS Server Disconnect:</b> '+exception+'</p>Check whether node server.js is running');
		$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());
		$('#wsDet').removeClass('btn-success');
		$('#wsDet').addClass('btn-danger');
		$('#wsDet').html('Server: OFFLINE');
	})

	socket.on('connect', function() {
		console.log('SOCKET CONNECT ');
		$('#console').append('<p class="pf" style="color: #009900;"><b>WS Server Connected</b></p>');
		$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());
		$('#wsDet').removeClass('btn-danger');
		$('#wsDet').addClass('btn-success');
		$('#wsDet').html('Server: OK');
	})

	socket.on('connect_failed', function(exception) {
		console.log('SOCKET FAILED '+exception);
		$('#console').append('<p class="pf" style="color: #ff0000;"><b>WS Server Exception:</b> '+exception+'</p>Check whether node server.js is running');
		$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());
		$('#wsDet').removeClass('btn-success');
		$('#wsDet').addClass('btn-danger');
		$('#wsDet').html('Server: OFFLINE');
	})

		// handle preset changes
		$('#selectPreset').on('change', function(e) {
			console.log('Select Preset');
			defaultSlicer = 'machines';
			if ($('#selectPreset').val() > 0) {
				// this is a valid preset
				var preset = localSettings[defaultSlicer][Number($('#selectPreset').val())-1].opts;
				for (c in preset) {
					// update values
					$('[name="slOptsArray-'+preset[c].o+'"]').val(preset[c].v);
				}

				// reset changed options color to black
				$('[name|="slOptsArray"]').css('color','black');

				// enable Delete Preset
				$('#deletePreset').removeClass('disabled');

			} else {
				// disable Delete Preset
				$('#deletePreset').addClass('disabled');
			}
		});

		// create new preset
			$('#newPreset').on('click', function() {

				if ($('#newPresetName').val() == '') {
					alert('You must type a name for a preset to save it.');
					return;
				}

				var opts = [];
				jQuery.each($('[name|="slOptsArray"]').serializeArray(), function( c, field ) {
					field.name = field.name.slice(12);
					//console.log(field.name, field.value);
					opts.push({o:field.name, v:field.value});
				});

				socket.emit('savePreset', {'default':'machines', 'name': $('#newPresetName').val(), 'opts': opts, isNew:true});

				// clear field
				$('#newPresetName').val('');

				// reset changed options color to black
				$('[name|="slOptsArray"]').css('color','black');

			});

			// update selected preset
	$('#updatePreset').on('click', function() {

		if ($('#selectPreset option:selected').val() == 0) {
			// this is the slicer presets option, can't be updated
			alert('select a preset to update first');
		}

		var opts = [];
		jQuery.each($('[name|="slOptsArray"]').serializeArray(), function( c, field ) {
			field.name = field.name.slice(12);
			//console.log(field.name, field.value);
			opts.push({o:field.name, v:field.value});
		});

		socket.emit('savePreset', {'default':'machines', 'name': $('#selectPreset :selected').html(), 'opts': opts, isNew:false});

		// reset changed options color to black
		$('[name|="slOptsArray"]').css('color','black');

		// disable Update Preset
		$('#updatePreset').addClass('disabled');

	});


	// handle preset changes
		$('#selectPreset').on('change', function(e) {

			if ($('#selectPreset').val() > 0) {
				// this is a valid preset
				var preset = localSettings['machines'][Number($('#selectPreset').val())-1].opts;
				for (c in preset) {
					// update values
					//$('[name="slOptsArray-'+preset[c].o+'"]').val(preset[c].v);
					console.log(preset[c]);
				}

				// reset changed options color to black
				$('[name|="slOptsArray"]').css('color','black');

				// enable Delete Preset
				$('#deletePreset').removeClass('disabled');

			} else {
				// disable Delete Preset
				$('#deletePreset').addClass('disabled');
			}
		});

		// delete selected preset
	$('#deletePreset').on('click', function() {

		if ($('#selectPreset option:selected').val() == 0) {
			// this is the slicer presets option, can't be updated
			alert('select a preset to delete first');
		}

		socket.emit('deletePreset', {'default':'machines', 'name': $('#selectPreset :selected').html()});

		// disable Update and Delete Preset
		$('#updatePreset').addClass('disabled');
		$('#deletePreset').addClass('disabled');

	});


	function loadMachineSettings(exists) {
		// {"machine":[{"name":"Freeburn2","opts":[{"o":"laserxmax","v":"600"},{"o":"laserymax","v":"400"},{"o":"startgcode","v":"\nG91\nG21"},{"o":"endgcode","v":""},{"o":"laseron","v":"M03"},{"o":"laseroff","v":"M5"},{"o":"Laser0","v":"0"},{"o":"laser100","v":"255"},{"o":"button1","v":"M106"}]}]}
		$('#selectPreset').html('<option value="0">machines presets</option>');
		for (c in localSettings['machines']) {
			$('#selectPreset').append('<option value="'+(Number(c)+Number(1))+'">'+localSettings['machines'][c].name+'</option>');
		}

		//console.log('exists: '+exists);

		if (exists == -2) {
			// select newly created preset (last as it was added)
			$('#selectPreset').val($('#selectPreset option').last().val());
		} else if (exists >= 0) {
			// select updated preset
			$('#selectPreset option').each(function() {
				if (Number($(this).val()) == Number(exists)+1) {
					// set selected to this option
					$(this).prop('selected', true);
				}
			});
		}
		// exists == -1 if this is the first load or delete

	}

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
			document.getElementById('fileInputSVG').value = '';
			//document.getElementById('fileInputMILL').value = '';
			$('#console').append('<p class="pf" style="color: #000000;"><b>New data from API...</b></p>');
			$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());
	});

	// Error Handling
	socket.on('serverError', function (data) {
		//alert(data);
		$('#console').append('<hr><p class="pf" style="color: #990000 ;"><b>ERROR: </b>'+data+'</p>');
		$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());
	});

	// List serial Ports
	socket.on('ports', function (data) {
		console.log('ports event',data);
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
		$('#console').append('<hr><p class="pf" style="color: #000099 ;"><b>Checking for Updates on github.com/openhardwarecoza/LaserWeb...</b></p>');
		$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());
	});
	$('#upgradeGit').click(function() {
		socket.emit('upgradeGit', 1);
		$('#console').append('<hr><p class="pf" style="color: #000099 ;"><b>Upgrading LaserWeb Software...</b></p>');
		$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());
	});
	socket.on('updateStatus', function (data) {
		$('#console').append('<p class="pf" style="color: #000 ;">'+data+'</p>');
		$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());
		if (data.indexOf('up-to-date') != -1) {
			$('#console').append('<p class="pf" style="color: #009900 ;"><b>LaserWeb is already up to date</b></p><hr>');
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
				$('#console').append('<p class="pf" style="color: #e07900 ;"><b>Click Upgrade!</b></p><hr>');
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

	var baseSlOpts;
	// load Machine Profiles from server
	socket.on('slOpts', function (data) {
		//console.log('load Machine Profiles from server');
		baseSlOpts = data;
		//console.log(baseSlOpts);
		loadBaseSlOpts();
	});

	function loadBaseSlOpts() {
			$('#slOptsValues').html('');
			var baseOpts = baseSlOpts['machines'];
			for (var i in baseOpts) {
				// add section header
				$('#slOptsValues').append('<h5>'+baseOpts[i].section+'</h5>');
				var s = '<table class="table table-hover table-striped table-condensed" style="width: 100%;">';
				for (var c in baseOpts[i].options) {
					// add option input
					//var s = '<table><tr><td>';
					s += '<tr><td style="width: 500%;"> '+baseOpts[i].options[c].name+'</td><td style="width: 50%;">'
					if (typeof baseOpts[i].options[c].value == 'object') {
						// select
						s += '<select name="slOptsArray-'+baseOpts[i].options[c].opt+'"><option></option>';
						for (var l in baseOpts[i].options[c].value) {
							s += '<option>'+baseOpts[i].options[c].value[l]+'</option>';
						}
						s += '</select>';
					//} else if (baseOpts[i].options[c].value.length > 10) {
					// textarea
					//	s += '<textarea style="width: 80%; height: 100px;" name="slOptsArray-'+baseOpts[i].options[c].opt+'">'+baseOpts[i].options[c].value+'</textarea><br />';
					} else {
						// text
						s += '<input type="text" name="slOptsArray-'+baseOpts[i].options[c].opt+'" size="5" value="'+baseOpts[i].options[c].value+'" />';
						s += '</td></tr>'
					}
				}
				s += '</table>'
				$('#slOptsValues').append(s);
			}

			// change handler
			$('[name|="slOptsArray"]').change(function(e) {
				// an option has been changed
				//console.log('chg',e.target.name);
				// change color of that field to indicate change has been made
				$('[name="'+e.target.name+'"]').css('color','red');
				if ($('#selectPreset').val() > 0) {
					// enable Update Preset
					$('#updatePreset').removeClass('disabled');
				}
			});
		}

	// obtain config options from server
	socket.on('config', function (data) {
		//console.log(data);
		if (webgl) {
			$('#updateGit').click(); // Check for updates on startup - very nb - I add code to Laserweb so often!
		};
		laserxmax = data.xmax;
		laserymax = data.ymax;

		gcodePreamble = data.gcodePreamble;
		gcodePostamble = data.gcodePostamble;

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
		if (data.l.indexOf('Aborted') == 0 ) {  // Seeing OK all the time distracts users from paying attention
			$('#console').append('<p class="pf" style="color: '+col+';">'+data.l+'</p>');
			$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());
			$('#sendToLaser').removeClass('disabled');
		} else if (data.l.indexOf('ok') != 0 && data.l.indexOf('wait') != 0) {  // Seeing OK all the time distracts users from paying attention
			$('#console').append('<p class="pf" style="color: '+col+';">'+data.l+'</p>');
			$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());
		}

	});

	$('#choosePort').on('change', function() {
		// select port
		socket.emit('usePort', $('#choosePort').val());
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


	//$('#sendCommand').on('click', function() {
	//
	//		socket.emit('gcodeLine', { line: $('#command').val() });
	//		console.log( { line: $('#command').val() });
	//		//$('#command').val('');
	//});

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

	});

	$('#pause').on('click', function() {
		if ($('#pause').html() == 'Pause') {
			// pause queue on server
			socket.emit('pause', 1);
			$('#pause').html('Unpause');
			socket.emit('gcodeLine', { line: 'M81\n' });
			socket.emit('gcodeLine', { line: 'M5\n' });
			$('#clearQ').removeClass('disabled');
		} else {
			socket.emit('gcodeLine', { line: 'M80\n' });
			socket.emit('gcodeLine', { line: 'M3\n' });
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
		socket.emit('printGcode', { line: $('#gcodepreview').val() });  //Works with Gcode pasted in #gcodepreview too (:
		//$('#gcodepreview').val('');
	});

	// Send to laser button - start the job
	$('#rasterWidgetSendRasterToLaser').on('click', function() {
		socket.emit('clearQ', 1);
		socket.emit('pause', 0);
		$('#rasterWidgetSendRasterToLaser').addClass('disabled');
		$('#pause').removeClass('disabled');
		$('#mainStatus').html('Status: Lasering');
		socket.emit('printGcode', { line: $('#gcodepreview').val() });  //Works with Gcode pasted in #gcodepreview too (:
		//$('#gcodepreview').val('');
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
// End of Context Menu


	$('#bounding').on('click', function() {
		$('#console').append('<span class="pf" style="color: #000000;"><b>Drawing Bounding Box...</b></span><br>');
		$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());
		socket.emit('gcodeLine', { line: 'G90\nG0 X'+$('#BBXMIN').val()+' Y'+$('#BBYMIN').val()+' F2000\nG0 X'+$('#BBXMAX').val()+' Y'+$('#BBYMIN').val()+' F2000\nG0 X'+$('#BBXMAX').val()+' Y'+$('#BBYMAX').val()+' F2000\nG0 X'+$('#BBXMIN').val()+' Y'+$('#BBYMAX').val()+' F2000\nG0 X'+$('#BBXMIN').val()+' Y'+$('#BBYMIN').val()+' F2000\nG90' });
	});


	// Gcode Rotate from http://ideegeniali.altervista.org/progetti/?p=gcoderotator
	function processRot() {
	 var gcode=document.getElementById("gcodepreview").value.split('\n');
	 	$("#gcodelinestbody").empty();
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
		$("#gcodelinestbody").empty();
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
		$("#gcodelinestbody").empty();
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
		$("#gcodelinestbody").empty();
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
		$("#gcodelinestbody").empty();
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
			socket.emit('gcodeLine', { line: '~\nG30' });
		} else if (firmware.indexOf('Grbl') == 0) {
			socket.emit('gcodeLine', { line: '$H' });
		} else {
			socket.emit('gcodeLine', { line: 'G28 X0' });
		}
	});
	$('#homeY').on('click', function() {
		if (firmware.indexOf('Lasaur') == 0) {
			socket.emit('gcodeLine', { line: '~\nG30' });
		} else if (firmware.indexOf('Grbl') == 0) {
			socket.emit('gcodeLine', { line: '$H' });
		} else {
			socket.emit('gcodeLine', { line: 'G28 Y0' });
		}
	});
	$('#homeZ').on('click', function() {
		if (firmware.indexOf('Lasaur') == 0) {
			socket.emit('gcodeLine', { line: '~\nG30' });
		} else if (firmware.indexOf('Grbl') == 0) {
			socket.emit('gcodeLine', { line: '$H' });
		} else {
			socket.emit('gcodeLine', { line: 'G28 Z0' });
		}
	});
	$('#homeAll').on('click', function() {
		if (firmware.indexOf('Lasaur') == 0) {
			socket.emit('gcodeLine', { line: '~\nG30' });
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


	$('#AirOn').on('click', function() {
		if (firmware.indexOf('Lasaur') == 0) {
			socket.emit('gcodeLine', { line: 'M80' });
		} else if (firmware.indexOf('Grbl') == 0) {
			socket.emit('gcodeLine', { line: 'M8' });
		}
	});


	$('#AirOff').on('click', function() {
		if (firmware.indexOf('Lasaur') == 0) {
			socket.emit('gcodeLine', { line: 'M81' });
		} else if (firmware.indexOf('Grbl') == 0) {
			socket.emit('gcodeLine', { line: 'M9' });
		}
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

	// Toggle modal for machine settings
	$('#machinesetbtn').on('click', function() {
		$('#settingswidget').modal('toggle');
	});




	$('.modal.draggable>.modal-dialog').draggable({
    cursor: 'move',
    handle: '.modal-header'
	});
	$('.modal.draggable>.modal-dialog>.modal-content>.modal-header').css('cursor', 'move');

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
				document.getElementById('fileInputSVG').value = '';
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
		document.getElementById('gcodepreview').value = '';
		openGCodeFromText();
		var r = new FileReader();
		console.log('Reader', r)
		r.readAsText(odxf.files[0]);
		r.onload = function(e) {
			fileName = fileInputDXF.value.replace("C:\\fakepath\\", "");

			// Remove the UI elements from last run
			if (typeof(dxfObject) !== 'undefined') {
				scene.remove(dxfObject);
			};

			if (typeof(showDxf) !== 'undefined') {
				scene.remove(showDxf);
			};

			if (typeof(tool_offset) !== 'undefined') {
				scene.remove(tool_offset);
				toolPath = null;
			};


			dxfObject = new THREE.Group();

			row = [];
			pwr = [];
			cutSpeed = [];
			$('#console').append('<p class="pf" style="color: #000000;"><b>Parsing DXF:...</b></p>');
			$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());

			//NEW Dxf  -- experimental
			parser2 = new window.DxfParser();
			dxf2 = parser2.parseSync(r.result);
			//console.log('DXF Data', dxf2);
			//cadCanvas = new processDXF(dxf2);

			for (i = 0; i < dxf2.entities.length; i++ ) {
				//console.log('Layer: ', dxf2.entities[i].layer);
				row[i] = dxf2.entities[i].layer
				drawEntity(i, dxf2.entities[i]);
			};


			// Make the 'geometry' object disappear
			for (i=0; i<dxfObject.children.length; i++) {
					dxfObject.children[i].material.color.setHex(0x000000);
					dxfObject.children[i].material.opacity = 0.3;
			}

			// Sadly removing it from the scene makes gcode circles end up at 0,0 since localToWorld needs it in the scene
			scene.add(dxfObject);

			// // Make a copy to show, because we need the original copy, untranslated, for the gcodewriter parsing
			// showDxf = dxfObject.clone();
			// // And display the showpiece, translated to virtual 0,0
			// showDxf = dxfObject.clone();
			// showDxf.translateX(laserxmax /2 * -1);
			// showDxf.translateY(laserymax /2 * -1);
			// scene.add(showDxf);

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
				 	$('#layers > tbody:last-child').append('<tr><td>'+layers[c]+'</td><td>  <div class="input-group" style="margin-bottom:10px; width: 100%;"><input class="form-control" name=sp'+c+' id=sp'+c+' value=3200><span class="input-group-addon"  style="width: 100px;">mm/m</span></div></td><td><div class="input-group" style="margin-bottom:10px; width: 100%;"><input class="form-control" name=pwr'+c+' id=pwr'+c+' value=100><span class="input-group-addon"  style="width: 100px;">%</span></div></td></tr>');
		  }

			document.getElementById('fileInputGcode').value = '';
			document.getElementById('fileInputDXF').value = '';
			$('#generate').hide();
			$('#dxfparamstomc').show();
			$('#svgparamstomc').hide();
			$('#cutParams').modal('toggle');
			document.getElementById('fileName').value = fileName;
		};
	});

			//});
	$('#dxfparamstomc').on('click', function() {  // DXF job Params to MC
				//console.log('Layers: ', layers);
				var g = ";Gcode generated by ChiliPeppr / Laserweb Dxf2Gcode;\n";
		    g += "G21 ;mm\n";
				g += 'G90\n';
				if (firmware.indexOf('Lasaur') == 0) {
					g += 'M80\n'; // Air Assist on
				};

				//dxfObject.translateX(laserxmax /2);
				//dxfObject.translateY(laserymax /2);

				dxfObject.updateMatrix();

				for (var c=0; c<dxf2.entities.length; c++) {
					var lay = layers.indexOf(dxf2.entities[c].layer);
					//console.log(lay);
					 	pwr[c] = $('#pwr'+lay).val();
					 	cutSpeed[c] = $('#sp'+lay).val();
						rapidSpeed = $('#rapidSpeed').val()
						dxfThickness = $('#thickness').val()

						g += generateGcodeCallback(window["dxfEntity" + c], cutSpeed[c], pwr[c], rapidSpeed)

					}
				document.getElementById('fileName').value = fileName;
				$('#mainStatus').html('Status: <b>'+fileName+' </b> loaded ...');
				if (boundingBox) {
					scene.remove( boundingBox );
				}

				if (firmware.indexOf('Lasaur') == 0) {
					g += 'M81\n'; // Air Assist off
				};

				var gCodeToSend = g;

				document.getElementById("gcodepreview").value = g;

				openGCodeFromText();
				$('#sendToLaser').removeClass('disabled');
				document.getElementById('fileInputGcode').value = '';
				document.getElementById('fileInputDXF').value = '';
				document.getElementById('fileInputSVG').value = '';
				//document.getElementById('fileInputMILL').value = '';
				$('#console').append('<p class="pf" style="color: #000000;"><b>NewDXFLib Complete...</b></p>');
				$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());
				//$('#noneg').click();

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
	document.getElementById('fileInputSVG').value = '';
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
		//generate.click();
		document.getElementById('fileInputGcode').value = '';
		document.getElementById('fileInputDXF').value = '';
		document.getElementById('fileInputSVG').value = '';
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
	//generate.click();
	document.getElementById('fileInputGcode').value = '';
	document.getElementById('fileInputDXF').value = '';
	document.getElementById('fileInputSVG').value = '';
	//document.getElementById('fileInputMILL').value = '';
	$('#console').append('<p class="pf" style="color: #000000;"><b>Gear Generator Complete...</b></p>');
	$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());
});

  // New Library
  // open .svg (File Open Function)

$('#96dpi').on('click', function() {
	svgscale = ((25.4/72))
	$('#svgScaleValue').html('  1px = '+ (svgscale) + 'mm ');
});

$('#90dpi').on('click', function() {
	svgscale = ((25.4/90))
	$('#svgScaleValue').html('  1px = '+ (svgscale) + 'mm ');
});

$('#72dpi').on('click', function() {
	svgscale = ((25.4/72))
	$('#svgScaleValue').html('  1px = '+ (svgscale) + 'mm ');
});

	$('#svgScaleValue').html('  1px = '+ (svgscale) + 'mm ');


$('#processSVG').on('click', function() {
	processSVG();
	$('#svgwidget').modal('toggle');
	$('#gcC').click();
	openGCodeFromText();
	gCodeToSend = this.result;
	$('#sendToLaser').removeClass('disabled');
	document.getElementById('fileInputGcode').value = '';
	document.getElementById('fileInputDXF').value = '';
	document.getElementById('fileInputSVG').value = '';
	//document.getElementById('fileInputMILL').value = '';
	$('#console').append('<p class="pf" style="color: #000000;"><b>SVG File Upload Complete...</b></p>');
	$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());
	//$('#noneg').click();
});

osvg.addEventListener('change', function(e) {
	var fileInputSVG = document.getElementById('fileInputSVG');
	var fileName = fileInputSVG.value.replace("C:\\fakepath\\", "");
	$('#mainStatus').html('Status: <b>'+fileName+' </b> loaded ...');
	document.getElementById('fileName').value = fileName;
	$('#console').append('<br><span style="color: #060606;"><u><b>New Job Loaded: Svg</b></u></span><br>');
	$('#sendToLaser').addClass('disabled');
	document.getElementById('millcrumCode').value = '';
	document.getElementById('gcodepreview').value = '';

		var selectedFile = event.target.files[0];
		var reader = new FileReader();
		var r = new FileReader();
		document.getElementById('fileInputSVG').value = '';

		//var imgtag = document.getElementById("svgEngrave");
		//imgtag.title = selectedFile.name;

		reader.onload = function(event) {
 			var svg = document.getElementById('svgEngrave');
			svg.innerHTML = reader.result;
			//console.log('Colors in SVG: '+svgcolors)
			$('#svgwidget').modal('toggle');
		};
		reader.readAsText(selectedFile);
	});


	// Helper function
	RGBToHex = function(r,g,b){
	var bin = r << 16 | g << 8 | b;
	return (function(h){
			return new Array(7-h.length).join("0")+h
	})(bin.toString(16).toUpperCase())
	}

	hexToRgb = function(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

	$('#pullcolors').on('click', function() {
  	$("#svglinestbody").empty();
		$('#svgnewway').show();
		$('#svgoldway').hide();
		var svg2 = $('#svgEngrave').html();
		svgrows = pullcolors(svg2).unique();
		for (c = 0; c < svgrows.length; c++) {

		};
		//console.log(svgrows.length);
		for (i = 0; i < svgrows.length; i++) {
			var r = svgrows[i][0];
			var g = svgrows[i][1];
			var b = svgrows[i][2];
			$('#svglinestable > tbody:last-child').append('<tr><td bgcolor="'+RGBToHex(r, g, b)+'"></td><td>  <div class="input-group" style="margin-bottom:10px; width: 100%;"><input style="text-align: right;" class=form-control name=svgf'+i+' id=sp'+i+' value=3200><span class="input-group-addon"  style="width: 100px;">mm/min</span></div></td><td><div class="input-group" style="margin-bottom:10px; width: 100%;"><input style="text-align: right;" class=form-control name=svgpwr'+i+' id=pwr'+i+' value=100><span class="input-group-addon"  style="width: 100px;">%</span></div></td></tr>');
		};
		$('#processSVG').removeClass('disabled');
	});

	// New SVG
	function processSVG() {
		var s = '';
		var svg = $('#svgEngrave').html();
		//console.log(svg);
		console.log('Scale: '+svgscale);
		//console.log(svg);
		//var svgfile = XMLS.serializeToString(svg);
		SVGlaserRapid = $('#SVGrapidRate').val();
		SVGlaserScale = svgscale * ($('#SVGscaleval').val() / 100);
		//SVGlaserFeed = $('#SVGfeedRate[i]').val();
		//SVGlaserPwr = $('#SVGlaserPwr[i]').val();
			for (i = 0; i < svgrows.length; i++) {
				SVGlaserFeed = $('#sp'+i).val();
				SVGlaserPwr = $('#pwr'+i).val();
				parsecolor = svgrows[i];
				console.log('Color to parse now: '+parsecolor);
				s += svg2gcode(svg, {
					feedRate: SVGlaserFeed,
					seekRate: SVGlaserRapid,
					bitWidth: 0.1,
					scale: SVGlaserScale,
					safeZ: 0.01,
					laserpwr: SVGlaserPwr,
					gcodePreamble: gcodePreamble,
					gcodePostamble: gcodePostamble
				})
			};
			document.getElementById("gcodepreview").value = s;
	};

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

	socket.on('posStatusT', function(data) {
		var data2 = JSON.parse(data);
		console.log('TinyG Status: ' + data);
		$('#mX').html('X: '+data2.sr.posx);
		$('#mY').html('Y: '+data2.sr.posy);
		$('#mZ').html('Z: '+data2.sr.posz);
		cylinder.position.x = (parseInt(data2.sr.posx) - (laserxmax /2));
		cylinder.position.y = (parseInt(data2.sr.posy) - (laserymax /2));
		cylinder.position.z = (parseInt(data2.sr.posz) + 20);
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
			if (fs[1]) {
				var t = fs[1].split('/');
				t[0] = t[0].slice(1);
				for (var i=0; i<2; i++) {
					t[i] = t[i].trim();
				}
				$('#eTC').html(t[0]+'C');
				g2.refresh(t[0]);
				$('#eTS').html(t[1]+'C');
			};

			if (fs[2]) {
				var b = fs[2].split('/');
				b[0] = b[0].slice(1);
				for (var i=0; i<2; i++) {
				b[i] = b[i].trim();
				}
				$('#bTC').html(b[0]+'C');
				g3.refresh(b[0]);
				$('#bTS').html(b[1]+'C');
			};
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
				$('#zeroWork').show();
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

	var rasterCalib = document.getElementById('rastercalibrationButton');
		$('#rastercalibrationButton').on('click', function() {
			$('#rasterwidget').modal('show');
			$('#rasterparams').show();
			$('#rasterProgressShroud').hide();
			var rasterWidgetTitle = document.getElementById("rasterModalLabel");
			rasterWidgetTitle.innerText = 'Raster Engraving Calibration';
			var sendToLaserButton = document.getElementById("rasterWidgetSendRasterToLaser");
			$('#rasterWidgetSendRasterToLaser').addClass('disabled');
			sendToLaserButton.style.display = "inline";
			//uncomment the next 2 lines to enable the raster output attempt from laserraster.js
			//var rasterOutput = document.getElementById("rasterOutput");
			//rasterOutput.style.display = "inline";
			//laserraster.js may have the code for that commented out, so check
			var imgtag = document.getElementById("origImage");
			imgtag.title = 'Calibration Image';
			imgtag.src = 'raster/calibration.jpg';
			setImgDims();
		});

	var fileImg = document.getElementById('fileImage');
		fileImg.addEventListener('change', function(e) {
			$('#rasterProgressShroud').hide();
			$('#rasterparams').show();
			$('#rasterwidget').modal('show');
			$('#rasterparams').show();
			$('#rasterProgressShroud').hide();
			var rasterWidgetTitle = document.getElementById("rasterModalLabel");
			rasterWidgetTitle.innerText = 'Raster Engraving';
			var sendToLaserButton = document.getElementById("rasterWidgetSendRasterToLaser");
			sendToLaserButton.style.display = "none";
			var rasterOutput = document.getElementById("rasterOutput");
			rasterOutput.style.display = "none";
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

		$( "#laservariablespeedslider" ).slider({
				range:true,
				min: 0,
				max: 100,
				values: [ 20, 80 ],
				slide: function( event, ui ) {
					$('#rasterNow').removeClass('disabled');
					laserRapid = $('#rapidRate').val();
					$('#laservariablespeed').html( $( "#laservariablespeedslider" ).slider( "values", 0 )*laserRapid/100.0 + ' - ' + $( "#laservariablespeedslider" ).slider( "values", 1 )*laserRapid/100.0);
				}
		});
		$('#laservariablespeed').html( $( "#laservariablespeedslider" ).slider( "values", 0 )*$('#rapidRate').val()/100.0 + ' - ' + $( "#laservariablespeedslider" ).slider( "values", 1 )*$('#rapidRate').val()/100.0);

		$("#useRasterBlackWhiteSpeeds").change( function() {
			if($('#useRasterBlackWhiteSpeeds').prop('checked')) {
				$("#blackwhitespeedsection").show();
			} else {
				$("#blackwhitespeedsection").hide();
			}
		});

		$("#rapidRate").change( function() {
			$('#laservariablespeed').html( $( "#laservariablespeedslider" ).slider( "values", 0 )*$('#rapidRate').val()/100.0 + ' - ' + $( "#laservariablespeedslider" ).slider( "values", 1 )*$('#rapidRate').val()/100.0);
		});

		$('#spotsize').html(':  '+ ($( "#spotsizeslider" ).slider( "values", 0 ) / 100) + 'mm ');
		spotSizeMul = $( "#spotsizeslider" ).slider( "values", 0 ) / 100;

		$('#rasterNow').on('click', function() {
			$('#rasterWidgetSendRasterToLaser').addClass('disabled');
			var spotSize = $( "#spotsizeslider" ).slider( "values", 0 ) / 100;
			var laserFeed = $('#feedRate').val();
			var laserRapid = $('#rapidRate').val();
			var blackspeed = $( "#laservariablespeedslider" ).slider( "values", 0 ) * laserRapid / 100.0;
			var whitespeed = $( "#laservariablespeedslider" ).slider( "values", 1 ) * laserRapid / 100.0;
			var useVariableSpeed = $('#useRasterBlackWhiteSpeeds').prop('checked');
			$('#rasterProgressShroud').hide();

			window.paper.RasterNow({
				firmware: firmware,
			  completed: gcodereceived,
				minIntensity: [minpwr],
				maxIntensity: [maxpwr],
				spotSize1: [spotSize],
				imgheight: [height],
				imgwidth: [width],
				feedRate: [laserFeed],
				blackRate: [blackspeed],
				whiteRate: [whitespeed],
				useVariableSpeed: [useVariableSpeed],
				rapidRate: [laserRapid]
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
	width = img.naturalWidth;
	height = img.naturalHeight;
	$("#dims").text(width+'px x '+height+'px');
	$('#canvas-1').prop('width', (width*2));
	$('#canvas-1').prop('height', (height*2));
	//$('#canvas-1').prop('width', laserxmax);
	//$('#canvas-1').prop('height', laserymax);
	var physwidth = spotSizeMul * (width+1);
	var physheight = spotSizeMul * (height);
	$("#physdims").text(physwidth.toFixed(1)+'mm x '+physheight.toFixed(1)+'mm');
	$('#spotsize').html( ($( "#spotsizeslider" ).slider( "values", 0 ) / 100) + 'mm (distance between dots )<br>Resultant Job Size: '+ physwidth.toFixed(1)+'mm x '+physheight.toFixed(1)+'mm' );

	//  Draw a rect showing outer dims of Engraving - engravings with white space to sides are tricky to visualise without
	rectWidth = physwidth +spotSizeMul, rectHeight = physheight + spotSizeMul;
	if (boundingBox) {
		scene.remove( boundingBox );
	}
	BBmaterial = new THREE.LineDashedMaterial( { color: 0xcccccc, dashSize: 10, gapSize: 5, linewidth: 2 });
	BBgeometry = new THREE.Geometry();
	BBgeometry.vertices.push(
		new THREE.Vector3( -spotSizeMul, 0, 0 ),
		new THREE.Vector3( -spotSizeMul, (rectHeight + 1) , 0 ),
		new THREE.Vector3( (rectWidth + 1), (rectHeight +1), 0 ),
		new THREE.Vector3( (rectWidth + 1), 0, 0 ),
		new THREE.Vector3( -spotSizeMul, 0, 0 )
	);
 	boundingBox= new THREE.Line( BBgeometry, BBmaterial );
	boundingBox.translateX(laserxmax /2 * -1);
	boundingBox.translateY(laserymax /2 * -1);
 	scene.add( boundingBox );
	};

function gcodereceived() {
	var rasterSendToLaserButton = document.getElementById("rasterWidgetSendRasterToLaser");
	if (rasterSendToLaserButton.style.display == "none") {
		$('#rasterwidget').modal('hide');
		$('#rasterparams').show();
		$('#rasterProgressShroud').hide();
	} else {
		$('#rasterWidgetSendRasterToLaser').removeClass('disabled');
	}
	console.log('New Gcode');
	$('#sendToLaser').removeClass('disabled');
	openGCodeFromText();
	gCodeToSend = document.getElementById('gcodepreview').value;
	$('#mainStatus').html('Status: <b>Gcode</b> loaded ...');
	$('#openMachineControl').removeClass('disabled');
	$('#sendCommand').removeClass('disabled');
	$('#sendToLaser').removeClass('disabled');
};
