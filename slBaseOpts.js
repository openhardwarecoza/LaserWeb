// base machine options
var slBaseOpts = {'machines':[
{section:'Mechanical', options: [
{opt:'laserxmax',name:'Bed: X Length',value:'600'},
{opt:'laserymax',name:'Bed: Y Length',value:'400'}
]},
{section:'GCODE', options: [
{opt:'startgcode',name:'Start Gcode',value:'G1\nG90'},
{opt:'endgcode',name:'Post Gcode',value:'G28 X0'},
{opt:'laseron',name:'Laser ON command',value:'M03'},
{opt:'laseroff',name:'Laser OFF command',value:'M05'},
{opt:'0svalue',name:'0% power: S value',value:'0'},
{opt:'100svaluee',name:'100% power: S value',value:'255'},
]},

]}

module.exports = slBaseOpts;
