// Author Jordan Sitkin https://github.com/dustMason/Machine-Art

// not used directly in laserweb, but this is where I ported the code from (peter van der walt)

console.log('In svg main');

var artworks = [
  './art/homer.svg',
  './art/phone.svg'
];

var $svgElm = $("#svg"),
    $menu = $("#menu-art"),
    generateButton = document.getElementById("btn-generate"),
    copyButton = document.getElementById("btn-copy"),
    gcodeText = document.getElementById("gcode");

artworks.forEach(function(artwork) {
  $menu.append($("<option value=\""+artwork+"\">"+artwork+"</option>"));
});

$menu.change(function(e) {
  e.preventDefault();
  var artwork = $(this).val();
  $svgElm.html("");
  $("#work-area").find("canvas").remove();

  generateButton.onclick = function(e) {
    e.preventDefault();
    var XMLS = new XMLSerializer();
    var svgfile = XMLS.serializeToString($svgElm.get(0));

    gcodeText.innerHTML = svg2gcode(svgfile, {
      feedRate: 1500,
      seekRate: 10000,
      bitWidth: 1,
      scale: 0.75
    });
  };

  if (artwork.indexOf("js") > 0) {
    $.getScript(artwork);
  } else if (artwork.indexOf("svg") > 0) {
    $.get(artwork, null, function(data) {
      var svgNode = $("svg", data);
      var docNode = document.adoptNode(svgNode[0]);
      $svgElm.html(docNode);
    }, 'xml');
  }
}).change();
