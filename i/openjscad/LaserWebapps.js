/*

    AUTHOR:  Peter van der Walt

*/
	// Show all exceptions to the user:
	OpenJsCad.AlertUserOfUncaughtExceptions();

		function updateSolid()
		{
			gProcessor.setJsCad(document.getElementById('code').value);
		}

		function loadGeargen()
		{
			gProcessor = new OpenJsCad.Processor(document.getElementById("viewer"));
			getProg('openjscad_files/gear.jscad');
			$('#JSHelp').empty();
			$( "#JSHelp" ).append("Try Negative and Zero Teeth Count too: (works best on Gear 1)<table style='width: 100%; text-align: center;'><tr><td><img src=openjscad/img/InternalGear_Small.png></td><td><img src=openjscad/img/RackAndPinion_Small.png></td><td><img src=openjscad/img/RegularSpurGear_Small.png></td></tr><tr><td>Tooth count < 0</td><td>Tooth count = 0</td><td>Tooth count > 0</td></tr></table>"
			);
		}

		function loadBoxgen()
		{
			gProcessor = new OpenJsCad.Processor(document.getElementById("viewer"));
			getProg('openjscad_files/lasercut_box.jscad');
			$('#JSHelp').empty();
			$( "#JSHelp" ).append("Try the Cutouts features too!"
			);
		}

		function getProg(name) {
			el = document.getElementById('code');
			$.get(name, function(data) {
				el.value = data;
				updateSolid();
			});
		}
