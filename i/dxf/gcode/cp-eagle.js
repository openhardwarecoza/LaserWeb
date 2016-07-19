requirejs.config({
   paths: {
       Three: 'http://threejs.org/build/three.min',
       ThreeTextGeometry: 'http://chilipeppr.com/js/three/TextGeometry',
       ThreeFontUtils: 'http://chilipeppr.com/js/three/FontUtils',
       ThreeHelvetiker: 'http://chilipeppr.com/js/three/threehelvetiker',
       Clipper: 'http://chilipeppr.com/js/clipper/clipper_unminified'
   },
   shim: {
       ThreeTextGeometry: ['Three'],
       ThreeFontUtils: ['Three', 'ThreeTextGeometry'],
       ThreeHelvetiker: ['Three', 'ThreeTextGeometry', 'ThreeFontUtils'],
   }
});

// Test this element. This code is auto-removed by the chilipeppr.load()
cprequire_test(["inline:com-chilipeppr-widget-eagle"], function (ew) {
    console.log("test running of " + ew.id);
    //ew.init();

    $('#com-chilipeppr-widget-eagle').css('position', 'relative');
    $('#com-chilipeppr-widget-eagle').css('background', 'none');
    $('#com-chilipeppr-widget-eagle').css('width', '300px');
    $('body').prepend('<div id="3dviewer"></div>');

    chilipeppr.load("#3dviewer", "http://fiddle.jshell.net/chilipeppr/y3HRF/show/light/", function () {
        cprequire(['inline:com-chilipeppr-widget-3dviewer'], function (threed) {
            threed.init({
                doMyOwnDragDrop: false
            });
            //$('#com-chilipeppr-widget-3dviewer .panel-heading').addClass('hidden');
            //autolevel.addRegionTo3d();
            //autolevel.loadFileFromLocalStorageKey('com-chilipeppr-widget-autolevel-recent8');
            //autolevel.toggleShowMatrix();

            // only init eagle widget once 3d is loaded
            // set doMyOwnDragDrop
            ew.init(true);
        });
    });


    chilipeppr.load("#test-drag-drop", "http://fiddle.jshell.net/chilipeppr/Z9F6G/show/light/",

    function () {
        cprequire(
        ["inline:com-chilipeppr-elem-dragdrop"],

        function (dd) {
            dd.init();
            dd.bind("body", null);
        });
    });

    chilipeppr.load("#com-chilipeppr-flash",
        "http://fiddle.jshell.net/chilipeppr/90698kax/show/light/",

    function () {
        console.log("mycallback got called after loading flash msg module");
        cprequire(["inline:com-chilipeppr-elem-flashmsg"], function (fm) {
            //console.log("inside require of " + fm.id);
            fm.init();
        });
    });


} /*end_test*/ );

cpdefine("inline:com-chilipeppr-widget-eagle", ["chilipeppr_ready", "Clipper", "jqueryuiWidget"], function () {
    return {
        id: "com-chilipeppr-widget-eagle",
        url: "http://fiddle.jshell.net/chilipeppr/3fe23xsr/show/light/",
        fiddleurl: "http://jsfiddle.net/chilipeppr/3fe23xsr/",
        name: "Widget / Eagle PCB v3",
        desc: "This widget lets you drag in an Eagle PCB \".brd\" file to mill.",
        publish: {},
        subscribe: {

        },
        foreignPublish: {},
        foreignSubscribe: {
            '/com-chilipeppr-elem-dragdrop/ondropped': 'We subscribe to this signal at a higher priority to intercept the signal, double check if it is an Eagle Brd file and if so, we do not let it propagate by returning false. That way the 3D Viewer, Gcode widget, or other widgets will not get Eagle Brd file drag/drop events because they will not know how to interpret them.'
        },
        init: function (doMyOwnDragDrop) {

            // the workspace may want to handle the drag drop
            // but when in dev mode it makes sense for us to do our own
            if (doMyOwnDragDrop) {
                this.setupDragDrop();
            } else {
                // the workspace is doing the drag/drop. this is important
                // because this code base for this widget is huge and thus
                // the workspace should handle dragging in BRD files
                // and once it sees one, it should then load this widget
                // so that users who don't use ChiliPeppr for BRD files
                // don't have to load all this insane code

            }

            this.setupUiFromLocalStorage();

            this.btnSetup();

            //this.status("Loaded...");

            this.forkSetup();

            this.lazyLoadTutorial();

            $('#com-chilipeppr-widget-eagle .btnAnimate').click( this.animateOverlapPath.bind(this) );

            // init 3d for eagle widget
            this.init3d();

            this.setupMouseOver();

            this.setupAdvancedInflateByUI();

            this.setupGcodeTab();
            this.setupFeedsDepths();

            // setup clear button
            $('#com-chilipeppr-widget-eagle .btn-clear').click(this.clearEagleBrd.bind(this));

            console.log(this.name + " done loading.");
        },
        setupFeedsDepths: function() {
            // As user changes vals, just update our global props
            var el = $('#com-chilipeppr-widget-eagle');
            var that = this;
            el.find('.trace-depth').change(function(evt) {
                console.log("evt:", evt);
                that.depthOfSignalMilling = evt.currentTarget.valueAsNumber;
                console.log("that.depthOfSignalMilling:", that.depthOfSignalMilling);
            });
            el.find('.trace-fr').change(function(evt) {
                console.log("evt:", evt);
                that.feedRateSignals = evt.currentTarget.valueAsNumber;
            });
            el.find('.trace-fr-plunge').change(function(evt) {
                console.log("evt:", evt);
                that.feedRatePlunge = evt.currentTarget.valueAsNumber;
            });
            el.find('.clearance-height').change(function(evt) {
                console.log("evt:", evt);
                that.clearanceHeight = evt.currentTarget.valueAsNumber;
            });
            el.find('.drill-feedrate').change(function(evt) {
                console.log("evt:", evt);
                if(evt.currentTarget.valueAsNumber) // arrow buttons send 2 events
                  that.drillFeedrate = evt.currentTarget.valueAsNumber;
            });
            el.find('.drill-max').change(function(evt) {
                console.log("evt:", evt);
                if(evt.currentTarget.valueAsNumber) // arrow buttons send 2 events
                  that.drillMaxDiameter = evt.currentTarget.valueAsNumber;
            });
            el.find('.drill-depth').change(function(evt) {
                console.log("evt:", evt);
                if(evt.currentTarget.valueAsNumber) // arrow buttons send 2 events
                  that.drillDepth = evt.currentTarget.valueAsNumber;
            });
            el.find('.dimension-mill-diameter').change(function(evt) {
                console.log("evt:", evt);
                /*
                TODO:
                - Test to exists holes they are smaller as this mill diameter and
                Compare that.drillMaxDiameter greater as this holes or alert!
                Cuz i.e.
                The user has 1mm and 1.5mm holes, the user settings are:
                  * that.drillMaxDiameter = 1.1
                  * that.millDiameter = 2
                then it's impossible to mill 1.5mm holes with a 2mm tool.
                Send user a message and prevent a change here
                */
                var choosedDiameter = evt.currentTarget.valueAsNumber;
                for ( var diameter in that.sortObjByKey(that.drillPads) ){
                  if(diameter > that.drillMaxDiameter && diameter < choosedDiameter){
                     evt.currentTarget.style.color = "#ff0000";
                     chilipeppr.publish("/com-chilipeppr-elem-flashmsg/flashmsg",
                           "Warning",
                           "The choosed mill diameter " + choosedDiameter + "mm are to small to mill holes with "
                              + diameter + "mm! Please check you drill max diameter!" ,
                        3 * 1000);
                      return;
                  } else {
                      evt.currentTarget.style.color = ""
                  }
                }

                if(evt.currentTarget.valueAsNumber) // arrow buttons send 2 events
                  that.millDiameter = evt.currentTarget.valueAsNumber;
            });
            el.find('.dimension-depth').keyup(function(evt) {
                console.log("evt:", evt);
                var item = $(evt.currentTarget);
                that.depthOfDimensions = parseFloat(item.val());
                console.log("depthOfDimensions:", that.depthOfDimensions);
                if (that.depthOfDimensions > 0) {
                    that.depthOfDimensions = that.depthOfDimensions * -1;
                    item.val(that.depthOfDimensions);
                }
                that.calcPasses(el);
            });
            el.find('.dimension-stepdown').keyup(function(evt) {
                console.log("evt:", evt);
                var item = $(evt.currentTarget);
                that.stepDownDimensions = parseFloat(item.val());
                if (isNaN(that.stepDownDimensions)) {
                    item.addClass("alert-danger");
                    return;
                }
                item.removeClass('alert-danger');
                if (that.stepDownDimensions > 0) {
                    that.stepDownDimensions = that.stepDownDimensions * -1;
                    item.val(that.stepDownDimensions);
                }
                if (that.stepDownDimensions < that.depthOfDimensions) {
                    // they can't make their step down be greater than dimensions
                    that.stepDownDimensions = that.depthOfDimensions;
                    item.val(that.stepDownDimensions);
                }
                that.calcPasses(el);
            });
            el.find('.dimension-feedrate').change(function(evt) {
                console.log("evt:", evt);
                that.feedRateDimensions = evt.currentTarget.valueAsNumber;
            });
            el.find('.dispenser-axis').change(function(evt) {
                console.log("evt:", evt);
                that.dispenserAxis = evt.currentTarget.valueAsNumber;
            });
            el.find('.stepsfordrop').change(function(evt) {
                console.log("evt:", evt);
                that.stepsfordrop = evt.currentTarget.valueAsNumber;
            });
            el.find('.cannula-diameter').change(function(evt) {
                console.log("evt:", evt);
                that.cannulaDiameter = evt.currentTarget.valueAsNumber;
            });
        },
        calcPasses: function(el) {
            // calc passes
            var passesFloat = this.depthOfDimensions / this.stepDownDimensions;
            var passes = parseInt(passesFloat);
            passesFloat -= passes;
            if (passesFloat > 0) passes++;
            el.find('.dimension-passes i').text(passes);
            var lastPass = this.depthOfDimensions - ((passes - 1) * this.stepDownDimensions);
            //if (lastPass == 0) lastPass = that.stepDownDimensions;
            el.find('.dimension-lastpass i').text(lastPass.toFixed(2));
            console.log("passes:", passes, "lastPass:", lastPass, "passesFloat:", passesFloat);
        },
        activateWidget: function() {
            console.log("activating Eagle BRD widget");
            this.reactivateMouseMove();
            this.sceneReAddMySceneGroup();
        },
        unactivateWidget: function() {
            console.log("unactivating Eagle BRD widget");
            this.sceneRemoveMySceneGroup();
            this.deactivateMouseMove();
        },
        init3d: function () {
            this.get3dObj();
            if (this.obj3d == null) {
                console.log("loading 3d scene failed, try again in 1 second");
                var attempts = 1;
                var that = this;
                setTimeout(function () {
                    that.get3dObj();
                    if (that.obj3d == null) {
                        attempts++;
                        setTimeout(function () {
                            that.get3dObj();
                            if (that.obj3d == null) {
                                console.log("giving up on trying to get 3d");
                            } else {
                                console.log("succeeded on getting 3d after attempts:", attempts);
                                that.onInit3dSuccess();
                            }
                        }, 5000);
                    } else {
                        console.log("succeeded on getting 3d after attempts:", attempts);
                        that.onInit3dSuccess();
                    }
                }, 1000);
            } else {
                this.onInit3dSuccess();
            }

        },
        onInit3dSuccess: function () {
            console.log("onInit3dSuccess. That means we finally got an object back.");
            this.clear3dViewer();

            // open the last file
            var that = this;
            //setTimeout(function () {
                that.open();
            //}, 1000);
        },
        obj3d: null, // gets the 3dviewer obj stored in here on callback
        obj3dmeta: null, // gets metadata for 3dviewer
        userCallbackForGet3dObj: null,
        get3dObj: function (callback) {
            this.userCallbackForGet3dObj = callback;
            chilipeppr.subscribe("/com-chilipeppr-widget-3dviewer/recv3dObject", this, this.get3dObjCallback);
            chilipeppr.publish("/com-chilipeppr-widget-3dviewer/request3dObject", "");
            chilipeppr.unsubscribe("/com-chilipeppr-widget-3dviewer/recv3dObject", this.get3dObjCallback);
        },
        get3dObjCallback: function (data, meta) {
            console.log("got 3d obj:", data, meta);
            this.obj3d = data;
            this.obj3dmeta = meta;
            if (this.userCallbackForGet3dObj) {
                //setTimeout(this.userCallbackForGet3dObj.bind(this), 200);
                //console.log("going to call callback after getting back the new 3dobj. this.userCallbackForGet3dObj:", this.userCallbackForGet3dObj);
                this.userCallbackForGet3dObj();
                this.userCallbackForGet3dObj = null;
            }
        },
        is3dViewerReady: false,
        clear3dViewer: function () {
            console.log("clearing 3d viewer");
            chilipeppr.publish("/com-chilipeppr-widget-3dviewer/sceneclear");
            //if (this.obj3d) this.obj3d.children = [];
            /*
            this.obj3d.children.forEach(function(obj3d) {
                chilipeppr.publish("/com-chilipeppr-widget-3dviewer/sceneremove", obj3d);
            });
            */
            this.is3dViewerReady = true;
        },
        clearEagleBrd: function() {
            this.get3dObj(this.clearEagleBrdStep2.bind(this));
        },
        clearEagleBrdStep2: function() {
            console.log("clearing Eagle BRD. this.obj3d:", this.obj3d, "this.mySceneGroup:", this.mySceneGroup);
            // remove all 3d viewer stuff
            this.sceneRemoveMySceneGroup();
            this.mySceneGroup = null;
            console.log("after clearing Eagle BRD. this.obj3d:", this.obj3d, "this.mySceneGroup:", this.mySceneGroup);


            //this.sceneRemove(this.threeDimensions);

            this.threeDimensions = null;

            // contains the end mill path (blue/gray line)
            /*this.threePathEndMill.forEach(function(threeObj) {
                this.sceneRemove(threeObj);
            }, this);*/
            this.threePathEndMill = [];

            // contains the mesh signals (wires/pads/smds/vias)
            /*this.threePathEndMillArr.forEach(function(p) {
                this.sceneRemove(p);
            }, this);
            this.threePathDeflatedActualArr.forEach(function(p) {
                this.sceneRemove(p);
            }, this);
            this.threePathInflatedActualArr.forEach(function(p) {
                this.sceneRemove(p);
            }, this);*/

            // now reset arrays since they're useless now that
            // we removed them and will regenerate below
            this.threePathEndMillArr = [];
            this.threePathDeflatedActualArr = [];
            this.threePathInflatedActualArr = [];
            this.pathEndMillArr = [];
            this.pathEndMillHolesArr = [];
            this.pathInflatedActualArr = [];
            this.pathDeflatedActualArr = [];

            // reset all main properties
            //this.pathsUnion = null;
            this.clipperBySignalKey = [];
            this.intersectObjects = [];
            this.clipperDimension = [];
            this.clipperSignalWires = [];
            this.clipperElements = [];
            this.clipperPads = [];
            this.clipperSmds = [];
            this.clipperVias = [];
            this.drillPads = {};
            this.drillVias = {};
            this.paths = null; // final paths generated from onRefresh() used to export gcode
            this.pathsUnion = null;
            this.pathsUnionHoles = null;

        },
        setupGcodeTab: function() {
            // attach click event to "Send Gcode to workspace" button
            $('#com-chilipeppr-widget-eagle .btn-eagle-sendgcodetows').click(this.sendGcodeToWorkspace.bind(this));
            //$('#com-chilipeppr-widget-eagle .process-list').sortable();
            //$('#com-chilipeppr-widget-eagle .process-list').disableSelection();
        },
        sendGcodeToWorkspace: function() {
            this.exportGcode();
            var info = {
                name: "Eagle BRD: " + this.fileInfo.name.replace(/.brd$/i, ""),
                lastModified: new Date()
            };
            // grab gcode from textarea
            var gcodetxt = $('.com-chilipeppr-widget-eagle-gcode').val();

            if (gcodetxt.length < 10) {
                chilipeppr.publish("/com-chilipeppr-elem-flashmsg/flashmsg", "Error Sending Gcode", "It looks like you don't have any Gcode to send to the workspace. Huh?", 5 * 1000);
                return;
            }

            // send event off as if the file was drag/dropped
            chilipeppr.publish("/com-chilipeppr-elem-dragdrop/ondropped", gcodetxt, info);

            // convert the color on the end mill path because it's irrelevant now based
            // on the gcode being shown by the 3d viewer
            this.threePathEndMill.forEach(function(threeObj) {
                console.log("tweaking endmill path now that we're sending gcode. threeObj:", threeObj);
                if (threeObj.children.length > 0) {
                    threeObj.children[0].material.opacity = 0.1;
                    threeObj.children[0].material.color = 0x000000;
                    /*threeObj.children.forEach(function(threeObjChild) {
                        threeObjChild.material.color = 0x000000;
                        threeObjChild.material.opacity = 0.1;
                    });*/
                } else {
                    threeObj.material.color = 0x000000;
                    threeObj.material.opacity = 0.1;
                }
            }, this);

            // or use alternate pubsub
            // "/com-chilipeppr-elem-dragdrop/loadGcode"
            var that = this;
            this.get3dObj(function() {
                console.log("got callback after 3dviewer re-sent us the 3dobj and 3dobjmeta. 3dobj:", that.obj3d, "obj3dmeta:", that.obj3dmeta);
                that.sceneReAddMySceneGroup();
            });
        },
        setupDragDrop: function () {
            // subscribe to events
            chilipeppr.subscribe("/com-chilipeppr-elem-dragdrop/ondragover", this, this.onDragOver);
            chilipeppr.subscribe("/com-chilipeppr-elem-dragdrop/ondragleave", this, this.onDragLeave);
            // /com-chilipeppr-elem-dragdrop/ondropped
            chilipeppr.subscribe("/com-chilipeppr-elem-dragdrop/ondropped", this, this.onDropped, 9); // default is 10, we do 9 to be higher priority
        },
        eagle: null, // contains the eagle object
        open: function (data, info) {

            // if we are passed the file data, then use that, otherwise look to
            // see if we had one saved from before, i.e. this is a browser reload scenario
            // and we'd like to show them their recent Eagle BRD
            var file;
            if (data) {
                console.log("open. loading from passed in data. data.length:", data.length, "info:", info);
                file = data;
                this.fileInfo = info;
                $('#com-chilipeppr-widget-eagle .eagle-draghere').addClass("hidden");
            } else {

                // try to retrieve the most recent board file
                file = localStorage.getItem('com-chilipeppr-widget-eagle-lastDropped');
                if (file && file.length > 0) {
                    this.fileInfo = localStorage.getItem('com-chilipeppr-widget-eagle-lastDropped-info');
                    if (this.fileInfo && this.fileInfo.match(/^{/)) {
                        this.fileInfo = JSON.parse(this.fileInfo);
                    }
                    console.log("open. loading data from localStorage. file.length:", file.length, "info:", this.fileInfo);
                } else {
                    // there's no file, just return
                    return;
                }

            }

            if (file) {

                // make sure this file is an Eagle board
                if (!(file.match(/<!DOCTYPE eagle SYSTEM "eagle.dtd">/i))) {
                    chilipeppr.publish("/com-chilipeppr-elem-flashmsg/flashmsg", "Error Loading Eagle BRD", "It looks like you had a previous Eagle BRD, but it doesn't seem to be the correct format.", 10 * 1000);
                    return;

                }

                chilipeppr.publish("/com-chilipeppr-elem-flashmsg/flashmsg", "Opening Eagle BRD", "Parsing Eagle BRD file and generating signal paths.", 3000, true);
                // reset main properties
                this.clearEagleBrd();
                this.clear3dViewer();

                // create board
                this.eagle = new EagleCanvas('eagle-canvas');
                this.eagle.loadText(file);
                //this.eagle.setScaleToFit('eagle-main');
                //this.eagle.setScale(this.eagle.getScale() / 2);
                //this.eagle.draw();
                //var that = this;
                this.draw3d(function() {
                    console.log("got callback from draw3d");
                });


                $('#com-chilipeppr-widget-eagle .btn-eagle-sendgcodetows').prop('disabled', false);
                console.log("eagle:", this.eagle);
            } else {
                console.log("no last file, so not opening");
            }
        },
        draw3d: function (callback) {
            if (!this.is3dViewerReady) {
                var that = this;
                setTimeout(function () {
                    if (!that.is3dViewerReady) {
                        setTimeout(function () {
                            if (!that.is3dViewerReady) {
                                console.log("giving up on drawing into 3d for Eagle Brd");
                            } else {
                                console.log("ready to draw 3d on 3rd attempt");
                                that.onDraw3dReady();
                                if (callback) callback();
                            }
                        }, 5000);
                    } else {
                        console.log("ready to draw 3d on 2nd attempt");
                        that.onDraw3dReady();
                        if (callback) callback();
                    }
                }, 2000);
            } else {
                console.log("ready to draw 3d on 1st attempt");
                this.onDraw3dReady();
                if (callback) callback();
            }
        },
        colorSignal: 0x8D2323, // match eagle colors. red for wire
        colorSmd: 0x8D2323, // same color as signal
        colorVia: 0xB4B400, // yellow
        colorPad: 0x238D23, // pads are green
        colorMill: 0x0000ff, // match color ChiliPeppr shows for milling
        colorHole: 0x8D8D8D, // light gray
        colorsDrop: [0x298A08, 0x868A08, 0x8A0808] , // green, yellow, red
        colorDimension: 0x8D8D8D, // light gray
        opacitySignal: 0.1,
        opacityDimension: 0.3,
        opacityVia: 0.1,
        opacityPad: 0.1,
        endmillSize: 0.0, // size of endmill that user picks
        actualEndmill: 0.2,
        inflateMillPathBy: null,
        paths: null, // final paths generated from onRefresh() used to export gcode
        pathsUnion: null,
        pathsUnionHoles: null,
        threeDimensions: null,
        clipperDimensions: [], // contains the dimensions of the board as clipper path
        onDraw3dReady: function () {
            console.group("draw3d");
            console.log("iterating Eagle Brd and drawing into 3d viewer");
            console.log("eagle obj we will draw:", this.eagle);
            this.clear3dViewer();

            // these methods will draw all Eagle objects into several global
            // properties, the most important of which is this.clipperBySignalKey
            // which holds a structured object of each signal, i.e. +3V, GND, etc.
            this.draw3dSignalWires(this.eagle.eagleLayersByName['Top']);
            this.draw3dSignalPolygons(this.eagle.eagleLayersByName['Top']);
            this.draw3dElements(this.eagle.eagleLayersByName['Top']);
            this.draw3dVias('1-16');
            this.threeDimensions = this.draw3dDimension(this.endmillSize);
            //this.obj3d.children = [];

            // obj3d is the original THREE.Object3D() for the 3d
            // viewer. the extents x/y/z vals are calculated off of
            // it so we need a fake object to put in there
            console.log("this.obj3d:", this.obj3d);
            /*
            if (this.obj3d == null) {
                this.obj3d = new THREE.Object3D();
                this.sceneAdd(this.obj3d);
            }
            */
            //this.obj3d.add(this.threeDimensions.clone());

            //this.drawUnionOfSignalWiresAndElements(
            //    this.eagle.eagleLayersByName['Top']);


            // old way of getting clipper paths
            //var paths = this.getClipperPaths();



            // this ensures no path acts like a hole. all these paths
            // should union themselves
            //var paths = this.getAllPathsAsOuterOrientation(paths);

            // for debug, draw the paths
            //var z = 0;

            /*
            var pathTest = this.getUnionOfClipperPaths([paths[0], paths[1]]);
            this.drawClipperPaths(pathTest, 0xff00ff, 0.9, z);
            console.log("pathTest:", pathTest);

            z += 1;
            paths.forEach(function(path) {
                this.drawClipperPaths([path], this.colorMill, 0.9, z);
                z += 0.2;
            }, this);
            */


            // we have all of these nicely formatted clipperPaths that were the result
            // of looking at each signal/via/pad and unioning each of those for one higher
            // level path. those paths are 90% good now, but we need to union them one last
            // time in case there's any overlap
            //this.pathsUnion = this.getUnionOfClipperPaths(paths);
            //this.pathsUnion = paths;

            // sometimes there is an inside path that doesn't get unioned, so do additional
            // processing

            //console.log("pathsUnion:", this.pathsUnion);
            //console.log("started with N paths. ended with N paths:", paths.length, this.pathsUnion.length);

            // for debug purposes, let's draw these
            //this.drawClipperPaths(this.pathsUnion, this.colorMill, 0.5);

            // check orientation of all new paths, because we could have ended up
            // with some inside paths, known as "holes"
            /*
            this.pathsUnionHoles = [];
            var ctr = 0;
            this.pathsUnion.forEach(function(path) {
                if (ClipperLib.Clipper.Orientation(path)) {
                    // do nothing.
                    this.pathsUnionHoles[ctr] = false;
                } else {
                    console.warn("found a hole:", path);
                    this.pathsUnionHoles[ctr] = true;
                }
                ctr++;
            }, this);
            */

            //var z = 0;
            /*
            z += 1;
            this.pathsUnion.forEach(function(path) {
                this.drawClipperPaths([path], 0xff0000, 0.5, z);
                z += 0.3;
            }, this);
            */

            //var endmillSize = this.findBestEndMillSize(pathsUnion);
            /*
            var endmillSize = this.findBestEndMillSizeLowestFirst(this.pathsUnion);
            $('#com-chilipeppr-widget-eagle .best-size').html(endmillSize);
            $('#com-chilipeppr-widget-eagle .inflate-by').val(endmillSize);
            */
            chilipeppr.publish('/com-chilipeppr-widget-3dviewer/viewextents' );
            setTimeout(this.onRefresh.bind(this, null, this.onDraw3dReadyAfter), 2000);
            //this.onRefresh();
            /*
            // this approach isolates out the ldc1000 region
            // then finds best endmill size again
            pathEndMill.push([{X:47,Y:10},{X:58.5,Y:10},{X:58.5,Y:18},{X:47,Y:18},{X:47,Y:10}]);
            var pathDiff = this.getUnionOfClipperPaths(pathEndMill);
            var pathDiff = this.getInflatePath(pathEndMill, 0.01);
            var endmillSize = this.findBestEndMillSizeLowestFirst(pathDiff);

            var pathEndMill = this.getInflatePath(pathDiff, endmillSize);

            //this.drawClipperPaths(pathDiff, this.colorMill, 0.8);
            this.drawClipperPaths(pathEndMill, this.colorMill, 0.8);
            */

            /*
            // this approach isolates out the TI tca9406 region
            // then finds best endmill size again
            pathEndMill.push([{X:5,Y:5},{X:9.5,Y:5},{X:9.5,Y:13},{X:5,Y:13},{X:5,Y:5}]);
            var pathDiff = this.getUnionOfClipperPaths(pathEndMill);
            //var pathDiff = this.getInflatePath(pathEndMill, 0.01);
            var endmillSize = this.findBestEndMillSizeLowestFirst(pathDiff);

            var pathEndMill = this.getInflatePath(pathDiff, endmillSize);

            //this.drawClipperPaths(pathDiff, this.colorMill, 0.8);
            this.drawClipperPaths(pathEndMill, this.colorMill, 0.8);
            */

            // try technique where inflate to desired endmill then subtract
            // the "best fit"
            //var pathEndMillDesired = this.getInflatePath(pathsUnion, 0.2);
            //var pathHotZones = this.getDiffOfClipperPaths(pathEndMillDesired, pathEndMill);
            //var pathHotZones2 = this.getDiffOfClipperPaths(pathHotZones, pathEndMillDesired);
            // subtract outer path from final
            //var pathHotZonesFinal = this.getDiffOfClipperPaths(pathHotZones2, pathHotZones);
            //this.drawClipperPaths(pathEndMillDesired, this.colorMill, 0.8);
            // trigger resize to ensure our mouse events
            // are lined up correctly


            console.log("done drawing Eagle PCB Board");
            console.groupEnd();
        },
        onDraw3dReadyAfter: function() {
            console.log("onDraw3dReadyAfter");
            // ask 3d viewer to set things up now
            chilipeppr.publish('/com-chilipeppr-widget-3dviewer/setunits', "mm" );
            chilipeppr.publish('/com-chilipeppr-widget-3dviewer/drawextents' );
            chilipeppr.publish('/com-chilipeppr-widget-3dviewer/viewextents' );
            $(window).trigger('resize');
            if (this.obj3dmeta && this.obj3dmeta.widget)
                this.obj3dmeta.widget.wakeAnimate();
        },
        clearanceHeight: 1.0, // move z to clearance
        // 1 oz = 0.035mm, 2 oz = 0.07mm, 3 oz = 0.105mm
        depthOfSignalMilling: -0.1, // cutting how deep?
        feedRatePlunge: 30, // plunging into FR4 copper
        feedRateSignals: 80, // feedrate for milling signals,pads,smds,vias
        feedRateDimensions: 100,
        drillFeedrate: 100.0, // mm/min
        drillMaxDiameter: 3.00, //mm/min
        drillDepth: -1.7, // std thickness
        depthOfDimensions: -1.7, // std thickness
        millDiameter: 2,
        stepDownDimensions: -0.5,
        stepDownPasses: 3, // use passes or dimension
        cannulaDiameter: 1,
        stepsfordrop: 0.5,
        dispenserAxis: 'D',
        renderedDrops: [],
        renderDispenserDrops:function(){
            var that = this;

            // remove all old drops
            this.renderedDrops.forEach(function(thing) {
                that.sceneRemove(thing);
            }, this);

            if(! $('#com-chilipeppr-widget-eagle .dispenser-active').is(':checked'))
               return;

            // get all smd pads,
            var clippers = this.clipperBySignalKey;
            console.group("drawDispenserDrops");
            for ( keyname in clippers ){
                if (clippers[keyname].smds) {
                    clippers[keyname].smds.forEach(function(smd){
                        // get absolute position'
                        var vector = new THREE.Vector3();
                        vector.setFromMatrixPosition( smd.threeObj.matrixWorld );

                        var diameter = that.cannulaDiameter+(that.cannulaDiameter/2);
                        var radius = diameter / 2;
                        var ar_drop = Math.PI * (radius*radius);

                        // Calculate bigger smd pads as canulla diameter*2
                        // +-----+
                        // | O O |
                        // | O O |
                        // +-----+
                        var s = smd.smd;
                        console.log("SMD Pad: ", s);
                        if(s.dx >= diameter*2 || s.dy >= diameter*2){
                            var steps_x = Math.round(s.dx/diameter);
                            var steps_y = Math.round(s.dy/diameter);
                            var space_x = (s.dx-(steps_x * diameter)) / steps_x;
                            var space_y = (s.dy-(steps_y * diameter)) / steps_y;

                            var startx = vector.x-(s.dx/2) + radius + (space_x/2);
                            var starty = vector.y-(s.dy/2) + radius + (space_y/2);

                            var group = new THREE.Object3D();//create an empty container
                            for(var iy=1; iy <= steps_y; iy++){
                                for(var ix=1; ix <= steps_x;ix++){
                                    var drop = that.drawSphere(startx, starty, (that.cannulaDiameter/2), that.colorsDrop[0]);
                                    group.add( drop );//add a mesh with geometry to it
                                    startx += diameter + space_x;
                                }
                                startx = vector.x-(s.dx/2) + radius + (space_x/2);
                                starty += diameter + space_y;
                            }
                            that.renderedDrops.push(group);
                            if(s.rot != null){
                                group.rotation.z = - parseInt(s.rot.substring(1)) * (Math.PI / 180);
                            }

                            that.sceneAdd(group);
                        }  else {
                            // calculate area and mark drop with traffic colors
                            var ar_smd = s.dx * s.dy;
                            var percent = percent = ar_smd / (ar_drop/100); // area from drop greather then smd pad
                            if(ar_smd > ar_drop)                            // area from smd pad greather then drop
                                percent = ar_drop / (ar_smd/100);
                            var color = that.colorsDrop[0];
                            if(percent < 80)
                                color = that.colorsDrop[1];
                            if(percent < 50)
                                color = that.colorsDrop[2];
                            // draw a drop (cone) on this position
                            var drop = that.drawSphere(vector.x, vector.y, (that.cannulaDiameter/2), color);
                            that.sceneAdd(drop);
                            that.renderedDrops.push(drop);
                        }
                    });
                } // end if (jlau 11/21)
            }
            console.groupEnd("drawDispenserDrops");

            // finish
        },
        generateGcodeHole:function(diameter, x, y){
            var radius = diameter/2;
            var gdiameter = radius-(this.millDiameter/2); // inside milling
            var passesDeep = this.depthOfDimensions/this.stepDownPasses; // TODO: calculate my own passes

            var result = '(generate hole at x:' + x + ' y:' + y + ' with dia:'+ diameter +' in ' + this.stepDownPasses + ' passes)' + "\n";
            result += "F" + this.feedRateDimensions + "\n";
            // Lift off
            result += "G00 Z" + this.clearanceHeight + "\n";
            // Go to outside from circle
            result += "G00 X" + (x - gdiameter) + " Y" + y + "\n";
            // check passes
            for(var i=0; i<this.stepDownPasses;i++){
               var deep = passesDeep*(i+1);
               // plunge in material
               result += "G00 Z" + deep.toFixed(4) + "\n";
               // mill circle
               result += "G02 I" + gdiameter.toFixed(4) + "\n";
            }

            // Lift off
            result += "G00 Z" + this.clearanceHeight + "\n";

            return result;
        },
        exportGcodeHeader:function(){
            var g = '';
            g += "(Gcode generated by ChiliPeppr Eagle PCB Widget " + (new Date()).toLocaleString() + ")\n";
            g += "G21 (mm mode)\n";
            g += "G90 (abs mode)\n";
            g += "M3 (spindle on)\n";
            g += "TO M6 (set tool)\n"
            return g;
        },
        exportGcodeMilling:function(){
            var g = '';
            this.paths.forEach(function(path) {
                // move to clearance
                g += "G0 Z" + this.clearanceHeight + "\n";
                // move to first position of path
                g += "G0 X" + path[0].X + " Y" + path[0].Y + "\n";
                // move down
                g += "G0 Z0\n";
                g += "G1 Z" + this.depthOfSignalMilling + " F" + this.feedRatePlunge + "\n";
                g += "F" + this.feedRateSignals + "\n";
                for (var i = 1; i < path.length; i++) {
                    var pt = path[i];
                    g += "G1 X" + pt.X + " Y" + pt.Y + "\n";
                }
                // move to first point
                g += "G1 X" + path[0].X + " Y" + path[0].Y + "\n";
                // just to be safe, move to 2nd point to ensure all copper milled out
                // but make sure we go at least 2mm, but no more
                var v1 = new THREE.Vector3(path[0].X, path[0].Y);
                var v2 = new THREE.Vector3(path[1].X, path[1].Y);
                var dist = v1.distanceTo(v2);
                if (dist > 2) {
                    // shorten it
                    var direction = new THREE.Vector3(v2.x-v1.x, v2.y-v1.y, 0);
                    direction.normalize();
                    var ray = new THREE.Ray(v1, direction);
                    v2 = ray.at(2);
                    //console.log("had to shorten distance. ray:", ray, " new v2:", v2, "v1:", v1);
                }
                g += "G1 X" + v2.x + " Y" + v2.y + "\n";
                if (dist < 2) {
                    // go to 3rd point as well
                    g += "G1 X" + path[2].X + " Y" + path[2].Y + "\n";
                }

                // done with signal, go to z clearance


            }, this);

            return g;
        },
        exportGcodeMarkVias:function(){
            var g = '';
            var that = this;

            if(! $('#com-chilipeppr-widget-eagle .drill-markholes').is(':checked'))
               return g;

            // Drilling, first sort to drill diameter and change tool to first diameter
            g += "(------ MARK VIAS -------)\n";
            for ( diameter in this.sortObjByKey(this.drillVias) ){
                this.drillVias[diameter].forEach(function(dvector){
                     g += "G0 Z" + that.clearanceHeight + "\n";
                     g += "G0 X" + dvector.X + " Y" + dvector.Y   + "\n";
                     g += "G0 Z0.1\n";
                     g += "G1 Z" + that.depthOfSignalMilling  + "\n";
                });
                g += "G0 Z" + that.clearanceHeight + "\n";
            }
            return g;
        },
        exportGcodeMarkPads:function(){
            var g = '';
            var that = this;

            if(! $('#com-chilipeppr-widget-eagle .drill-markholes').is(':checked'))
               return g;

            // Drilling, first sort to drill diameter and change tool to first diameter
            g += "(------ MARK PADS -------)\n";
            for ( diameter in this.sortObjByKey(this.drillPads) ){
               this.drillPads[diameter].forEach(function(dvector){
                     g += "G0 Z" + that.clearanceHeight + "\n";
                     g += "G0 X" + dvector.X + " Y" + dvector.Y   + "\n";
                     g += "G0 Z0.1\n";
                     g += "G1 Z" + that.depthOfSignalMilling  + "\n";
                });
                g += "G0 Z" + that.clearanceHeight + "\n";
            }
            return g;
        },
        exportGcodeDrillVias:function(){
            var g = '';
            var that = this;

            if(! $('#com-chilipeppr-widget-eagle .use-drilling').is(':checked'))
               return g;

            // Drilling, first sort to drill diameter and change tool to first diameter
            g += "(------ DRILLING VIAS -------)\n";
            for ( diameter in this.sortObjByKey(this.drillVias) ){
               g += "M5 (spindle off)\n";
               g += "T" + this.toolCount++ + " M6 (set tool to drill with diameter " + diameter + ")\n";
               g += "M3 (spindle on)\n";
               g += "F" + this.drillFeedrate + "\n";
               this.drillVias[diameter].forEach(function(dvector){
                     g += "G0 Z" + that.clearanceHeight + "\n";
                     g += "G0 X" + dvector.X + " Y" + dvector.Y   + "\n";
                     g += "G0 Z" + that.clearanceHeight/10 + "\n";
                     g += "G1 Z" + that.drillDepth  + "\n";
                });
                g += "G0 Z" + that.clearanceHeight + "\n";
            }
            return g;
        },
        exportGcodeDrillPads:function(){
            var g = '';

            if(! $('#com-chilipeppr-widget-eagle .use-drilling').is(':checked'))
               return g;

            var that = this;
            g += "(------ DRILLING PADS -------)\n";
            for ( diameter in this.sortObjByKey(this.drillPads)){
               // don't drill holes bigger as max diameter
               if(diameter > that.drillMaxDiameter)
                  break;
               g += "M5 (spindle off)\n";
               g += "T" + this.toolCount++ + " M6 (set tool to drill with diameter " + diameter + ")\n";
               g += "M3 (spindle on)\n";
               g += "F" + this.drillFeedrate + "\n";
               this.drillPads[diameter].forEach(function(dvector){
                     g += "G0 Z" + that.clearanceHeight + "\n";
                     g += "G0 X" + dvector.X + " Y" + dvector.Y   + "\n";
                     g += "G0 Z" + that.clearanceHeight/10 + "\n";
                     g += "G1 Z" + that.drillDepth  + "\n";
                });
                g += "G0 Z" + that.clearanceHeight + "\n";
            }
            return g;
        },
        exportGcodeDimensions:function(){

            var g = '';
            var that = this;

            var diaOfEndmill = $('.dimension-mill-diameter').val();

            // DIMENSION Milling
            g += "(------ DIMENSION Milling -------)\n";
            g += "M5 (spindle off)\n";
            g += "T" + this.toolCount++ + " M6 (set tool to mill dimension " + diaOfEndmill + ")\n";
            g += "M3 (spindle on)\n";
            g += "F" + this.feedRateDimensions + "\n";


            // generate holes are bigger as this.drillMaxDiameter
            for ( diameter in this.sortObjByKey(this.drillPads)){
                // only holes bigger as max diameter
                if (diameter < that.drillMaxDiameter) continue;
                this.drillPads[diameter].forEach(function(dvector) {
                    g += that.generateGcodeHole(diameter, dvector.X, dvector.Y)
                });
            }


            // generate dimensions
            // we need to take into account the diameter of the endmill
            // for milling dimensions
            console.group("Generating Dimension Milling");

            // if we have no dimensions, then let's return
            if (!this.clipperDimension || !this.clipperDimension.length > 0) {
                console.warn("for some reason there's no clipperDimension. huh?. returning.");
                return g;
            }

            // create new inflated path
            var millDim = this.getInflatePath([this.clipperDimension], diaOfEndmill / 2);
            millDim = millDim[0];
            // save original clipperDimensions to reset at end of method
            console.log("original clipperDimension", this.clipperDimension);
            console.log("inflated dimension:", millDim);
            var origClipperDimensions = this.clipperDimension;
            this.clipperDimension = millDim;

            // TODO: please check if exists holes in eagle board
            // move to clearance
            g += "G0 Z" + this.clearanceHeight + "\n";
            g += "(dimensions)\n";
            // move to first position of path
            if (this.clipperDimension[0] !== undefined)
                g += "G0 X" + this.clipperDimension[0].X + " Y" + this.clipperDimension[0].Y + "\n";
            // move down
            g += "G0 Z0\n";
            var newZ = 0;

            var didLastPass = false;
            while (!didLastPass) { //newZ > this.depthOfDimensions) {
                newZ += this.stepDownDimensions;
                if (newZ <= this.depthOfDimensions) {
                    // don't let z go that low
                    newZ = this.depthOfDimensions;
                    didLastPass = true;
                }
                g += "(step down " + this.stepDownDimensions + " for new z " + newZ + ")\n";
                g += "G1 Z" + newZ + " F" + this.feedRatePlunge + "\n";
                g += "F" + this.feedRateDimensions + "\n";
                console.log("this.clipperDimension:", this.clipperDimension);

                // we have dimensions defined as linePieces so must eliminate duplicates
                var lastPt = {X:null,Y:null};
                this.clipperDimension.forEach(function(pt) {
                    console.log("making final dimension mill. pt:", pt, "lastPt:", lastPt);
                    if (pt.X == lastPt.X && pt.Y == lastPt.Y) {
                        //console.log("dimension mill: skipping pt:", pt);
                    } else {
                        //console.log("dimension mill: adding pt:", pt);
                        g += "G1 X" + pt.X + " Y" + pt.Y + "\n";
                    }
                    lastPt = pt;
                });
                // move to first point
                //g += "G1 X" + this.clipperDimension[0].X + " Y" + this.clipperDimension[0].Y + "\n";
                // just to be safe, move to 2nd point no more than 3mm
                //g += "G1 X" + this.clipperDimension[1].X + " Y" + this.clipperDimension[1].Y + "\n";


            }
            this.clipperDimension = origClipperDimensions;
            console.groupEnd();
            return g;
        },
        exportGcodeDispenserDrop:function(drop, count){
            var g = '';
            var that = this;

            var dropDepth = (that.cannulaDiameter/4).toFixed(4); // got to 1/4 Diameter height, means 1mm drop / Z:0.25mm

            var vector = new THREE.Vector3();
            vector.setFromMatrixPosition( drop.matrixWorld  );

            var smallClearenceHight = (that.clearanceHeight/3).toFixed(4);

            g += "(generate Drop Nr: " + count + ")\n";        // Comment to see the blocks
            g += "G0 Z" + that.clearanceHeight + "\n";         // save height               i.e: Z:1mm
            g += "G0 X" + vector.x.toFixed(4)
                        + " Y" + vector.y.toFixed(4)
                        + "\n";                                // got to position of drop
            g += "G0 Z" + smallClearenceHight + "\n";          // fast go down to 1mm/3 =   i.e: Z:0.33mm
            g += "G1 Z" + dropDepth  + "\n";                   // careful go to dropdepth   i.e: Z:0.05mm
            g += "(chilipeppr_pause drop"
                  + count + " G1 "
                  + that.dispenserAxis
                  + that.stepsfordrop
                  + ")\n";                                     // Send pause event and wait for second cnc controller
            g += "G1 Z" + smallClearenceHight + "\n";          // slow go up to 1mm/3 =   i.e: Z:0.33mm

            return g;
        },
        exportGcodeDispenser:function(){
            var g = '';
            var that = this;

            if(! $('#com-chilipeppr-widget-eagle .dispenser-active').is(':checked'))
               return g;

            console.group('exportGcodeDispenser');

            // Drilling, first sort to drill diameter and change tool to first diameter
            g += "(------ DISPENSER DROP's -------)\n";
            g += "M5 (spindle stop)\n";
            g += "G0 Z" + that.clearanceHeight + "\n";
            var i = 0;
            this.renderedDrops.forEach(function(thing) {
               console.log('Thing', thing);
               if(thing.type == 'Object3D'){
                  thing.children.forEach(function(drop){
                     g += that.exportGcodeDispenserDrop(drop, ++i);
                  });
               }
               else{
                  g += that.exportGcodeDispenserDrop(thing, ++i);
               }
            }, this);
            g += "G0 Z" + that.clearanceHeight + "\n";
            console.log('Dispenser GCODE', g);
            console.groupEnd('exportGcodeDispenser');
            return g;
        },
        exportGcodeFooter:function(){
            var g = '';
            // move to clearance
            g += "G0 Z" + this.clearanceHeight + "\n";

            // finalize gcode
            g += "M5 (spindle stop)\n";
            g += "M30 (prog stop)\n";
            return g;
        },
        exportGcode: function() {
            // We will walk through our mondo clipperBySignalKey object to generate
            // our gcode.
            // we will start with wires,smds,pads,vias first.
            // then we'll move onto drills.
            // then we'll finish with dimensions because use may want to swap
            // endmills at end.
            // we will also start at lower left and work our way along the end of each
            // path and move to next.
            // we also need to remove redundant moves.

            this.toolCount = 0;
            var g = '';
            g +=  this.exportGcodeHeader();
            g +=  this.exportGcodeMilling();
            g +=  this.exportGcodeMarkVias();
            g +=  this.exportGcodeMarkPads();
            g +=  this.exportGcodeDrillVias();
            g +=  this.exportGcodeDrillPads();
            g +=  this.exportGcodeDimensions();
            g +=  this.exportGcodeDispenser();
            g +=  this.exportGcodeFooter();

            //console.log("gcode:", g);
            console.log("done generating gcode. length:", g.length);
            $('.com-chilipeppr-widget-eagle-gcode').text(g);
        },
        setupAdvancedInflateByUI: function() {
            var smdEl = $('#com-chilipeppr-widget-eagle .inflate-smds-by');
            var padEl = $('#com-chilipeppr-widget-eagle .inflate-pads-by');
            var viaEl = $('#com-chilipeppr-widget-eagle .inflate-vias-by');
            smdEl.keyup(function(evt) {
                console.log("smdEl got keyup. evt:", evt);
                $('#com-chilipeppr-widget-eagle .use-inflate-smds-by').prop('checked', true);
                var val = parseFloat(smdEl.val());
                if (isNaN(val)) {
                    smdEl.addClass("alert-danger");
                } else {
                    smdEl.removeClass("alert-danger");
                }
            });
            padEl.keyup(function(evt) {
                console.log("padEl got keyup. evt:", evt);
                $('#com-chilipeppr-widget-eagle .use-inflate-pads-by').prop('checked', true);
                var val = parseFloat(padEl.val());
                if (isNaN(val)) {
                    padEl.addClass("alert-danger");
                } else {
                    padEl.removeClass("alert-danger");
                }
            });
            viaEl.keyup(function(evt) {
                console.log("viaEl got keyup. evt:", evt);
                $('#com-chilipeppr-widget-eagle .use-inflate-vias-by').prop('checked', true);
                var val = parseFloat(viaEl.val());
                if (isNaN(val)) {
                    viaEl.addClass("alert-danger");
                } else {
                    viaEl.removeClass("alert-danger");
                }
            });

            // bind ctrl+enter
            var that = this;
            $('#com-chilipeppr-widget-eagle #eagle-main input').keypress(function(evt) {
                console.log("got keypress. evt:", evt);
                if (evt.ctrlKey && evt.charCode == 10) {
                    that.onRefresh(evt);
                }
            });
        },
        onRefresh: function(event, callback) {

            console.log("onRefresh. event:", event);

            if (event) {
                // this was from a button click. hide popover
                $('#com-chilipeppr-widget-eagle .btn-refresh').popover('hide');
            }

            this.inflateMillPathBy = parseFloat($('#com-chilipeppr-widget-eagle .inflate-by').val());
            var isMagicWand = $('#com-chilipeppr-widget-eagle .magic-wand-active').is(':checked');
            var isShow = $('#com-chilipeppr-widget-eagle .show-actual').is(':checked');
            var isSolid = $('#com-chilipeppr-widget-eagle .show-actual-asmesh').is(':checked');

            var extraTxt = "";
            if (isShow) extraTxt += "<br/><br/>You are showing the toolpath, so that will be rendered as well.";
            if (isSolid) extraTxt += " You wanted to show the paths as solid, so that may take minutes to generate.";
            if (isMagicWand) extraTxt += "<br/><br/>You asked for the Magic Wand, so we need to generate constrained normals for all toolpaths. This will take a long time. Please be patient.";

            chilipeppr.publish("/com-chilipeppr-elem-flashmsg/flashmsg", "Rendering Eagle BRD", "Rendering signals, vias, pads, SMD's, polygons, and thermals. " + extraTxt, 3 * 1000);
            // remove old mill path and inflated path
            setTimeout(this.onRefresh2nd.bind(this, event, callback), 200);
        },
        threePathEndMill: [],
        onRefresh2nd: function(event, callback) {

            this.inflateMillPathBy = parseFloat($('#com-chilipeppr-widget-eagle .inflate-by').val());
            var isMagicWand = $('#com-chilipeppr-widget-eagle .magic-wand-active').is(':checked');
            var isShow = $('#com-chilipeppr-widget-eagle .show-actual').is(':checked');
            var isSolid = $('#com-chilipeppr-widget-eagle .show-actual-asmesh').is(':checked');

            this.threePathEndMill.forEach(function(p) {
                this.sceneRemove(p);
            }, this);
            this.threePathEndMillArr.forEach(function(p) {
                this.sceneRemove(p);
            }, this);
            this.threePathEndMill = [];
            this.threePathEndMillArr = [];

            this.clear3dViewer();
            this.sceneReAddMySceneGroup();

            // COMPLICATED
            // 1. We need to create a path for the wires, smds, pads, and vias
            // for each signal
            // 2. Then we figure out polygons and remove from the polys the path
            // from step 1. We should actually remave the inflated paths of the
            // step 1 poly. That will leave us with a clipped poly
            // 3. Then we remove smds and pads from the poly.



            // let's let user use different inflate values for different types of segments
            var inflateBy = this.inflateMillPathBy;
            var inflateWiresBy = inflateBy; //0.35;
            var inflateSmdsBy = inflateBy; //0.25;
            var inflatePadsBy = inflateBy; //0.3;
            var inflateViasBy = inflateBy; //0.4;
            var inflatePolysBy = 0;

            // See if user overrode these (which is only allowed without magic wand)
            if ($('#com-chilipeppr-widget-eagle .use-inflate-smds-by').is(':checked')) {
                var val = parseFloat($('#com-chilipeppr-widget-eagle .inflate-smds-by').val());
                if (isNaN(val)) {
                    $('#com-chilipeppr-widget-eagle .inflate-smds-by').addClass("alert-danger");
                } else {
                    $('#com-chilipeppr-widget-eagle .inflate-smds-by').removeClass("alert-danger");
                    inflateSmdsBy = val;
                }
            }
            if ($('#com-chilipeppr-widget-eagle .use-inflate-pads-by').is(':checked')) {
                var val = parseFloat($('#com-chilipeppr-widget-eagle .inflate-pads-by').val());
                if (isNaN(val)) {
                    $('#com-chilipeppr-widget-eagle .inflate-pads-by').addClass("alert-danger");
                } else {
                    $('#com-chilipeppr-widget-eagle .inflate-pads-by').removeClass("alert-danger");
                    inflatePadsBy = val;
                }
            }
            if ($('#com-chilipeppr-widget-eagle .use-inflate-vias-by').is(':checked')) {
                var val = parseFloat($('#com-chilipeppr-widget-eagle .inflate-vias-by').val());
                if (isNaN(val)) {
                    $('#com-chilipeppr-widget-eagle .inflate-vias-by').addClass("alert-danger");
                } else {
                    $('#com-chilipeppr-widget-eagle .inflate-vias-by').removeClass("alert-danger");
                    inflateViasBy = val;
                }
            }

            // let's use the new clipperBySignalKey object
            var paths = [];
            console.log("this.clipperBySignalKey:", this.clipperBySignalKey);
            var keys = Object.keys(this.clipperBySignalKey);
            var debugZ = 0.5;

            // Step 0.8. If user wants to remove undefined SMDs from the path rendering
            // i.e. we'll just not mill them out

            if ($('#com-chilipeppr-widget-eagle .use-smd-ignoreundefined').is(':checked')) {

                console.log("removing undefined signal smds");
                for (var i = 0; i < keys.length; i++) {
                    var key = keys[i];
                    var signal = this.clipperBySignalKey[key];
                    console.log("step 0.9 key:", key, "signal:", signal);

                    if (key === undefined || key == "undefined") {
                        console.log("found undefined key");
                    } else {
                        continue;
                    }

                    // add smds (pads without holes)
                    if (signal.smds && signal.smds.length > 0) {

                        // make backup copy in case user wants to add them back in
                        if (!('smdsBackup' in signal)) {
                            signal.smdsBackup = signal.smds;
                        }

                        delete signal.smds;
                        console.log("just deleted smds from signal:", signal);

                        //signal.smds.forEach(function(smd) {
                        //}, this);
                    }
                }
            } else {
                // put back backup copy if it exists because we modify the original
                // wire clipper paths if user chose to "clip wires", but we cheat by keeping
                // a backup copy in case they uncheck the box later
                for (var i = 0; i < keys.length; i++) {
                    var key = keys[i];
                    if (key !== undefined) continue;
                    var signal = this.clipperBySignalKey[key];
                    if (signal.smds && 'smdsBackup' in signal)
                        signal.smds = signal.smdsBackup;
                }
            }

            // Step 0.9. If user wants to clip wires out of SMDs do it at this step
            if ($('#com-chilipeppr-widget-eagle .use-smd-clipwire').is(':checked')) {

                for (var i = 0; i < keys.length; i++) {
                    var key = keys[i];
                    var signal = this.clipperBySignalKey[key];
                    console.log("step 0.9 key:", key, "signal:", signal);

                    // make backup copy of original signal.wire.clipper
                    if (!(signal.wire && signal.wire.clipper)) {
                        continue;
                    }

                    if (!('clipperBackup' in signal.wire))
                        signal.wire.clipperBackup = signal.wire.clipper;

                    // add smds (pads without holes)
                    if (signal.smds && signal.smds.length > 0) {

                        signal.smds.forEach(function(smd) {

                            // we have each smd looping here, so just diff out this smd
                            // from each wire in this signal
                            if (signal.wire && signal.wire.clipper.length > 0) {
                                //signal.wire.clipper.forEach(function(path) {
                                    console.log("removing smd path from wire path. smd:", smd, "wire path:", signal.wire);

                                    signal.wire.clipper = this.getDiffOfClipperPaths(signal.wire.clipper, [smd.clipper]);
                                //}, this);
                            }

                        }, this);
                    }
                }
            } else {
                // put back backup copy if it exists because we modify the original
                // wire clipper paths if user chose to "clip wires", but we cheat by keeping
                // a backup copy in case they uncheck the box later
                for (var i = 0; i < keys.length; i++) {
                    var key = keys[i];
                    var signal = this.clipperBySignalKey[key];
                    if (signal.wire && 'clipperBackup' in signal.wire)
                        signal.wire.clipper = signal.wire.clipperBackup;
                }
            }


            // Step 1. Create a path for each signal that includes wires, pads,
            // smds, and vias
            console.log("doing step 1 of rendering");
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                var signal = this.clipperBySignalKey[key];
                console.log("step 1 key:", key, "signal:", signal);

                var signalPaths = [];
                var signalPathsInflated = [];
                var signalPathsInflatedHalf = [];

                // add smds (pads without holes)
                if (signal.smds && signal.smds.length > 0) {

                    signal.smds.forEach(function(smd) {
                        signalPaths.push(smd.clipper);

                        // decide whether to inflate smds or not based on user settings
                        var ip, ipHalf, ipConstraint;
                        if (true) {
                            ip = this.getInflatePath([smd.clipper], inflateSmdsBy);
                            //ipHalf = this.getInflatePath([smd.clipper], inflateSmdsBy / 2);
                        }  else {
                            ip = [smd.clipper];
                        }
                        ip.forEach(function(ipath) {
                            signalPathsInflated.push(ipath);
                        });
                        /*ipHalf.forEach(function(ipath) {
                            signalPathsInflatedHalf.push(ipath);
                        });*/
                        /*
                        if (key == "+5V") {
                            console.log("+3V smd:", smd);
                            this.drawClipperPaths([smd.clipper], 0xff0000, 0.99, debugZ);
                            //debugZ += 0.5;
                        }*/
                    }, this);
                }

                // add pads (have holes)
                if (signal.pads && signal.pads.length > 0) {
                    signal.pads.forEach(function(pad) {
                        signalPaths.push(pad.clipper);

                        // decide whether to inflate pads based on user settings
                        var ip, ipHalf;
                        if (true) {
                            ip = this.getInflatePath([pad.clipper], inflatePadsBy);
                            //ipHalf = this.getInflatePath([pad.clipper], inflatePadsBy / 2);
                        }  else {
                            ip = [smd.clipper];
                        }
                        ip.forEach(function(ipath) {
                            signalPathsInflated.push(ipath);
                        });
                        /*ipHalf.forEach(function(ipath) {
                            signalPathsInflatedHalf.push(ipath);
                        });*/
                    }, this);
                }

                // add vias
                if (signal.vias && signal.vias.length > 0) {
                    signal.vias.forEach(function(via) {
                        signalPaths.push(via.clipper);

                        // decide whether to inflate vias based on user settings
                        var ip, ipHalf;
                        if (true) {
                            ip = this.getInflatePath([via.clipper], inflateViasBy);
                            //ipHalf = this.getInflatePath([via.clipper], inflateViasBy / 2);
                        }  else {
                            ip = [smd.clipper];
                        }
                        ip.forEach(function(ipath) {
                            signalPathsInflated.push(ipath);
                        });
                        /*ipHalf.forEach(function(ipath) {
                            signalPathsInflatedHalf.push(ipath);
                        });*/
                    }, this);
                }

                // add wires
                if (signal.wire && signal.wire.clipper.length > 0) {
                    signal.wire.clipper.forEach(function(path) {
                        signalPaths.push(path);

                        // decide whether to inflate wires based on user settings
                        var ip, ipHalf;
                        if (true) {
                            // check orientation and if it's a hole deflate instead of inflate
                            if (ClipperLib.Clipper.Orientation(path)) {
                                // normal outer path
                                ip = this.getInflatePath([path], inflateWiresBy);
                                //ipHalf = this.getInflatePath([path], inflateWiresBy / 2);
                            } else {
                                // hole path
                                //console.warn("found hole path in signal wire. signal.wire:", signal.wire);
                                ip = this.getInflatePath([path], inflateWiresBy * -1);
                                //if (ClipperLib.Clipper.Orientation(ip)) {
                                    //console.warn("this deflated hole does not look like a hole anymore. huh?. ip:", ip);
                                    ClipperLib.Clipper.ReversePaths(ip);
                                //}
                                //ipHalf = this.getInflatePath([path], inflateWiresBy / 2 * -1);
                                //ipHalf.reverse();
                            }
                        }  else {
                            ip = [smd.clipper];
                        }
                        ip.forEach(function(ipath) {
                            signalPathsInflated.push(ipath);
                        });
                        /*ipHalf.forEach(function(ipath) {
                            signalPathsInflatedHalf.push(ipath);
                        });*/
                    }, this);
                }

                // add this signal path to overall paths
                var signalPathUnion = this.getUnionOfClipperPaths(signalPaths);
                signal.path = signalPathUnion;
                //if (key == "VSS") this.drawClipperPaths(signal.path, 0xff0000, 0.99, debugZ);

                // For pathInflated...
                console.log("signalPathsInflated:", signalPathsInflated);
                signal.pathInflated = this.getUnionOfClipperPaths(signalPathsInflated);
                //if (key == "VSS") this.drawClipperPaths(signal.pathInflated, 0xff0000, 0.99, 2);

                // TODO: If we start using this inflated half again
                //signal.pathInflatedHalf = this.getUnionOfClipperPaths(signalPathsInflatedHalf);

                //debugZ += 1;

            }
            console.log("new clipperBySignalKey with overallPath:", this.clipperBySignalKey);


            // Step 1.5. Clip each fully inflated signal by the half inflated signal so
            // that we can try to get no overlap and instead end up with half an overlap.
            /*
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                var signal = this.clipperBySignalKey[key];

                for (var i2 = 0; i2 < keys.length; i2++) {
                    if (i == i2) continue; // skip ourselves
                    var key2 = keys[i2];
                    var signal2 = this.clipperBySignalKey[key2];

                    signal.pathInflated = this.getDiffOfClipperPaths(signal.pathInflated, signal2.pathInflatedHalf);
                }
            }
            */

            // Only do this step if user asked for Magic Wand
            // Step 1.5: Inflate paths with half constraint
            // now do magic wand
            if (isMagicWand) {
                for (var i = 0; i < keys.length; i++) {
                    var key = keys[i];
                    var signal = this.clipperBySignalKey[key];
                    console.log("step 1.5 key:", key, "signal:", signal);

                    var signalPathsInflateConstraint = [];

                    // create constraint paths, which is all the other paths minus
                    // this one
                    var constraintPaths = [];
                    for (var i2 = 0; i2 < keys.length; i2++) {
                        if (i == i2) continue;
                        var key = keys[i2];
                        var signal2 = this.clipperBySignalKey[key];
                        signal2.path.forEach(function(path) {
                            constraintPaths.push(path);
                        });
                    }

                    // get inflated constraint path for this signal
                    if (i == 0) {
                        console.log("doing inflate with constraint for i:", i);
                        // create constraint
                        var ipc = this.getInflatePathWithConstraint(signal.path, inflateBy, constraintPaths);
                        ipc.forEach(function(ipath) {
                            signalPathsInflateConstraint.push(ipath);
                        });


                        // add this inflatedConstrained signal path to overall paths
                        var signalPathUnion = this.getUnionOfClipperPaths(signalPathsInflateConstraint);
                        signal.pathInflatedConstrained = signalPathUnion;
                        signal.pathInflated = signalPathUnion;
                    }

                }
            }


            // Step 2. If a signal has a poly, remove from the polys the other paths
            // from step 1. We should actually remove the inflated paths of the
            // step 1 poly. That will leave us with a clipped poly
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                var signal = this.clipperBySignalKey[key];
                //console.log("signal:", signal);

                var signalPaths = [];

                // deal with clipping polygons in this signal by clipping
                // them with any of the signals from other layers
                if (signal.poly && signal.poly.polys.length > 0) {

                    var polyCtr = 0;
                    signal.poly.polys.forEach(function(poly) {

                        console.log("poly:", poly, "signal:", signal);

                        // create our start of new path
                        poly.clipperWithOtherSignalsRemoved = ClipperLib.JS.Clone([poly.clipper]);

                        if (poly.pour == "cutout") {
                            //console.error("need to create cutout algo. poly:", poly);
                            // skip the cutout cuz nothing to render, instead this poly
                            // will get used to remove from real polys in other times thru
                            // this loop
                            //console.warn("found a cutout poly. still need to remove other signals");
                            //return;
                        }

                        // clip the poly by removing all paths from other signals
                        // loop thru all other inflated signal paths
                        for (var i2 = 0; i2 < keys.length; i2++) {
                            if (i == i2) continue; // skip ourselves
                            var key2 = keys[i2];
                            var signal2 = this.clipperBySignalKey[key2];
                            poly.clipperWithOtherSignalsRemoved = this.getDiffOfClipperPaths(poly.clipperWithOtherSignalsRemoved, signal2.pathInflated);

                            // cutout other polys in the entire document from this poly
                            // as well but only if their rank is less than this poly's rank
                            if (signal2.poly && signal2.poly.polys.length > 0) {
                                var poly1Rank = 1;
                                if (poly.rank > 1) poly1Rank = poly.rank;
                                signal2.poly.polys.forEach(function(poly2) {
                                    var poly2Rank = 1;
                                    if (poly2.rank > 1) poly2Rank = poly2.rank;
                                    if (poly2Rank < poly1Rank) {
                                        // that means poly2 is a stronger rank than me
                                        // so we need to cut it out of me
                                        console.log("found poly that is stronger rank, so cut it out");
                                        poly.clipperWithOtherSignalsRemoved = this.getDiffOfClipperPaths(poly.clipperWithOtherSignalsRemoved, [poly2.clipper]);
                                    }
                                }, this);

                                // also handle cutout polys, where ranks aren't relevant
                                signal.poly.polys.forEach(function(poly2) {
                                    if (poly2.pour == "cutout") {
                                        console.log("found poly that should cutout from other polys. poly2:", poly2);
                                        poly.clipperWithOtherSignalsRemoved = this.getDiffOfClipperPaths(poly.clipperWithOtherSignalsRemoved, [poly2.clipper]);
                                    }
                                }, this);
                            }
                        }

                        // additionally, this signal may have multiple polys and they
                        // may be setup for cutout of this one, so scan thru those
                        // and clip this poly if the other poly is asking us to
                        console.log("about to trim any polys in this signal with other polys in this signal that are cutouts");
                        if (poly.pour != "cutout") {
                            var polyCtr2 = 0;
                            signal.poly.polys.forEach(function(poly2) {
                                if (polyCtr == polyCtr2) return; // we don't want to analyze ourselves
                                console.log("poly2:", poly2, "signal:", signal);
                                if (poly2.pour == "cutout") {
                                    console.log("found poly that should cutout from other polys. poly2:", poly2);
                                    poly.clipperWithOtherSignalsRemoved = this.getDiffOfClipperPaths(poly.clipperWithOtherSignalsRemoved, [poly2.clipper]);
                                }
                                polyCtr2++;

                            }, this);
                        }

                        //this.drawClipperPaths(poly.clipperWithOtherSignalsRemoved, 0xff0000, 0.99, debugZ);
                        //debugZ += 5;

                        polyCtr++;

                    }, this);
                }
            }

            // Step 2.5: Also clip polys by the dimenions, meaning, don't let any poly
            // go beyond the dimensions of the board.
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                var signal = this.clipperBySignalKey[key];

                if (signal.poly && signal.poly.polys.length > 0) {

                    signal.poly.polys.forEach(function(poly) {

                        console.log("doing dimension clip. poly:", poly, "signal:", signal);
                        var regionOutside = this.getDiffOfClipperPaths(poly.clipperWithOtherSignalsRemoved, [this.clipperDimension]);
                        if (regionOutside != null && regionOutside.length > 0) {
                            // we found a region outside dimensions, clip it off
                            poly.clipperWithOtherSignalsRemoved = this.getDiffOfClipperPaths(poly.clipperWithOtherSignalsRemoved, regionOutside);
                        }
                        //this.drawClipperPaths(poly.clipperWithOtherSignalsRemoved, 0xff0000, 0.99, debugZ);
                        //debugZ += 5;
                    }, this);
                }
            }

            // Step 3. Now deal with removing smds/pads from the polys
            console.log("doing step 3");
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                var signal = this.clipperBySignalKey[key];
                //console.log("signal:", signal);

                var signalPaths = [];

                // deal with clipping polygons in this signal by clipping
                // them with any of the signals from other layers
                if (signal.poly && signal.poly.polys.length > 0) {

                    signal.poly.polys.forEach(function(poly) {

                        console.log("poly:", poly, "signal:", signal);
                        //this.drawClipperPaths(poly.clipperWithOtherSignalsRemoved, 0xff0000, 0.9, debugZ);
                        //debugZ += 1;

                        if (poly.pour == "cutout") {
                            //console.error("need to create cutout algo. poly:", poly);
                            poly.finalClipper = poly.clipperWithOtherSignalsRemoved
                        }


                        // handle thermals
                        if (poly.thermals == "no") {
                            //signalPaths.push(poly.clipper);
                            //poly.finalClipper = [poly.clipper];
                            poly.finalClipper = poly.clipperWithOtherSignalsRemoved

                        } else {
                            // they want thermals
                            //console.warn("need to calculate thermals");
                            // do thermals on pads and smds only, not on wires or vias
                            // remove pads/smds from poly to create holes in the poly
                            // then inflate the hole by inflateMillPathBy?
                            // then add stroked lines as cross hairs across hole
                            // then re-add pad/smd?

                            // create a path with holes, we may not get any
                            // based on the if statements below
                            var polyPathWithHoles = poly.clipperWithOtherSignalsRemoved;
                            //this.drawClipperPaths(polyPathWithHoles, 0x00ff00, 0.9, debugZ);
                            //debugZ += 0.1;

                            // remove the thermal shapes of smds from poly
                            if (signal.smds && signal.smds.length > 0) {

                                // let's do alternate approach. sometimes smds can
                                // overlap. it's not common, but on LED's for instance, multiple
                                // smds are near each other to create a more unique shape for
                                // the smd. so we need to union these and then do the thermal
                                // for each polygon region, rather than relying on the smd's
                                // themselves to indicate separation and independent thermals

                                var newSmdPaths = [];
                                signal.smds.forEach(function(smd) {
                                    newSmdPaths.push(ClipperLib.JS.Clone(smd.clipper));
                                }, this);

                                var newSmdPathsUnion = this.getUnionOfClipperPaths(newSmdPaths);
                                newSmdPathsUnion.forEach(function(path) {
                                    var cutoutPath = this.createThermalCutoutsFromSmd({clipper: path}, poly, inflateSmdsBy);
                                    // deflate the cutoutPath to ensure we don't run over the smd
                                    //cutoutPath = this.getInflatePath(cutoutPath, (inflateBy / 4) * -1);

                                    // remove the cutoutPath from poly
                                    polyPathWithHoles = this.getDiffOfClipperPaths(polyPathWithHoles, cutoutPath);
                                }, this);

                            }

                            // remove the thermals shapes of pads from poly
                            if (signal.pads && signal.pads.length > 0) {

                                signal.pads.forEach(function(pad) {

                                    console.log("removing thermal cutouts from poly. pad:", pad, "poly:", poly);

                                    var cutoutPath = this.createThermalCutoutsFromSmd(pad, poly, inflatePadsBy);

                                    // deflate the cutoutPath to ensure we don't run over the smd
                                    //cutoutPath = this.getInflatePath(cutoutPath, inflateBy * -1);

                                    // remove the cutoutPath from poly
                                    polyPathWithHoles = this.getDiffOfClipperPaths(polyPathWithHoles, cutoutPath);

                                }, this);
                            }

                            poly.finalClipper = polyPathWithHoles;

                        }

                        // debug. draw the final poly
                        //this.drawClipperPaths(poly.finalClipper, 0xff0000, 0.99, debugZ);
                        //debugZ += 2;

                    }, this);
                }
            }

            // Dispenser Code to render drops
            this.renderDispenserDrops();

            // Step 4. We now have a gorgeous clipperBySignalKey with polys that are
            // correct with all stuff removed. We have wires, pads, smds, vias.
            // We now need to union each signal to one final master union path.
            // Then we'll render those paths.
            console.log("doing step 4, final combining of each signal path");
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                var signal = this.clipperBySignalKey[key];
                console.log("key:", key, "signal:", signal);

                //signal.finalPath = ClipperLib.JS.Clone();

                // take main path and add poly
                if (signal.poly && signal.poly.polys.length > 0) {
                    signal.poly.polys.forEach(function(poly) {
                        console.log("adding final poly. signal.pathInflated:", signal.pathInflated, "poly.finalClipper:", poly.finalClipper);

                        // don't add cutout polys, ignore them, they're just for clipping
                        // purposes
                        if (poly.pour == "cutout") {
                            return;
                        }

                        // wipe out the poly region from the signal.pathInflated, meaning
                        // drop all the original smds/pads/vias/wires inside that poly because
                        // we have our modified poly ready to put there and don't want
                        // anything interfering with it

                        // however, to avoid problems, deflate the poly a tiny bit to do this
                        // so that when we do the final union we are guaranteed overlap

                        // we could possibly have a poly without signals
                        if (signal.pathInflated && signal.pathInflated.length > 0) {
                            var barelyDeflatedPoly = this.getInflatePath([poly.clipper], -0.00010);
                            signal.pathInflated = this.getDiffOfClipperPaths(signal.pathInflated, barelyDeflatedPoly);
                            poly.finalClipper.forEach(function(path) {
                                signal.pathInflated.push(path);
                            });
                        } else {
                            // just use the poly as final path
                            signal.pathInflated = poly.finalClipper;
                        }
                    }, this);
                    // now union the main path to the poly(s)
                    signal.pathInflated = this.getUnionOfClipperPaths(signal.pathInflated);
                }

                signal.pathInflated.forEach(function(path) {
                    paths.push(path);
                });
                //var threePath = this.drawClipperPaths(signal.pathInflated, 0xff0000, 0.3, 3);
                //this.threePathEndMillArr.push(threePath);
            }

            // Step 5.
            // Now we should have a full signal path for each signal where we
            // have wires,smds,pads, and vias as well as the polygons where the
            // polygon is cutout cleanly to represent what you would see in Eagle

            // Let's do an additional step and remove redundant lines so that we don't end
            // up with our endmill traversing the same path twice

            // We want full cycles around each signal to avoid inaccuracy in the milling,
            // so we likely want to overreach the path by one line segment (or even measure
            // at least 2mm into the beginning of each path, or 10x the endmill size)
            // Find the signal with the most amount of paths/points and end with that
            // because we may have a signal layer with a ground pour, or +V pour and that
            // will contain the majority of moves on it's own. But, start with shortest single
            // path and look to other signals to see if there are redundant lines and
            // remove them

            // Sort shortest path first
            /*
            paths.sort(function (a, b) {
                if (a.length > b.length) {
                    return 1;
                }
                if (a.length < b.length) {
                    return -1;
                }
                // a must be equal to b
                return 0;
            });
            */

            // make a fake duplicate
            //paths.push(ClipperLib.JS.Clone(paths[0]));

            // Sort longest path first
            paths.sort(function (a, b) {
                if (a.length > b.length) {
                    return -1;
                }
                if (a.length < b.length) {
                    return 1;
                }
                // a must be equal to b
                return 0;
            });

            // REDUNDANT PATH REDUCTION
            // Should really get this working to cut mill time in half
            if (false) {
            // make all paths be outer orientation
            for (var i = 0; i < paths.length; i++) {
                var path = paths[i];
                var orientation = ClipperLib.Clipper.Orientation(path);
                if (orientation == false) {
                    // it's a hole, reverse it
                    console.log("found hole. reversing it.");
                    path = path.reverse();
                }
            }

            console.log("doing redundant line ctr");
            var redundantLineCtr = 0;
            for (var path1Ctr = 0; path1Ctr < paths.length; path1Ctr++) {
                var path1 = paths[path1Ctr];
                for (var i = 0; i < path1.length; i++) {
                    var pt1 = path1[i];
                    var pt2 = (i+1 < path1.length) ? path1[i+1] : path1[0];
                    for (var path2Ctr = 0; path2Ctr < paths.length; path2Ctr++) {
                        if (path2Ctr == path1Ctr) continue; // skip myself
                        var path2 = paths[path2Ctr];
                        for (var i2 = 0; i2 < path2.length; i2++) {
                            var pt2pt1 = path2[i2];
                            var pt2pt2 = (i2+1 < path2.length) ? path2[i2+1] : path2[0];
                            if (pt1 != null && pt2 != null && pt2pt1 != null && pt2pt2 != null && pt1.X == pt2pt1.X && pt1.Y == pt2pt1.Y && pt2.X == pt2pt2.X && pt2.Y == pt2pt2.Y) {
                                //console.log("found redundant path. path1Ctr:", path1Ctr, "path2Ctr:", path2Ctr);
                                // try setting to null
                                pt1 = null;
                                path1[i] = null;
                                pt2.markedForDelete = true;
                                redundantLineCtr++;
                            }
                        }
                    }
                }
            }
            console.log("num of redundantLineCtr:", redundantLineCtr);

            // now loop thru and remove points that are nulls
            var removedPtsCtr = 0;
            var removedFromMarked = 0;
            var newPaths = [];
            for (var path1Ctr = 0; path1Ctr < paths.length; path1Ctr++) {
                var path1 = paths[path1Ctr];
                var newPath1 = [];
                for (var i = 0; i < path1.length; i++) {
                    var pt = path1[i];
                    if (pt == null)
                        removedPtsCtr++;
                    else if (pt.markedForDelete)
                        removedFromMarked++;
                    else
                        newPath1.push(pt);
                }
                if (newPath1.length > 0)
                    newPaths.push(newPath1);
            }
            paths = newPaths;
            console.log("removed all null pts. removedPtsCtr:", removedPtsCtr, "removedFromMarked:", removedFromMarked);
            } // end redundant path removal

            // remove redundant paths
            this.debugZ = 2;
            //paths = this.redundantPathRemoval(paths);

            // Now draw the paths
            var zLevel = 0;
            paths.forEach(function(path) {
                var threePath = this.drawClipperPaths([path], 0x0000ff, 0.4, zLevel, 0, true);
                //zLevel += 5;
                //zLevel += 0.1;
                this.threePathEndMill.push(threePath);
            }, this);

            // See if user wants to show actual endmill path as a cyan mesh
            zLevel = 5;
            if (isShow) {
                this.actualEndmill = parseFloat($('#com-chilipeppr-widget-eagle .actual-endmill-size').val());
                var localInflateBy = this.actualEndmill / 2;
                var trueInflateBy = this.actualEndmill;

                //var pathDeflatedActualArr = [];
                //var pathInflatedActualArr = [];

                // loop thru all paths and draw a mesh stroke
                // around the path with opacity set, such that when
                // multiples meshes are overlaid, their colors are darker
                // to visualize the toolpath. that means creating normals
                // for each pt and generating triangles to create mesh

                var group = new THREE.Object3D();
                var pathCtr = 0;

                var mat = new THREE.MeshBasicMaterial({
                    color: 0x00ffff,
                    transparent: true,
                    opacity: 0.99,
                    side: THREE.DoubleSide,
                    depthWrite: false
                });
                var mat2 = new THREE.MeshBasicMaterial({
                    color: 0x00ffff,
                    transparent: true,
                    opacity: 0.99,
                    depthWrite: false
                });

                paths.forEach(function(path) {
                    //if (pathCtr > 0) return;
                    //path = [{X:10, Y:10}, {X:20, Y:10}, {X:20, Y:20}];
                    //var geometry = new THREE.Geometry();


                    // create a clipper stroke path for each line segment
                    // we won't create one for the last pt because there's no line
                    // after it
                    var clipperStrokes = [];
                    var csThisPath = [];
                    //console.log("calculating stroke paths for each path");
                    for (var pi = 0; pi < path.length; pi++) {

                        var pt = path[pi];
                        //var pt2 = (pi + 1 < path.length) ? path[pi + 1] : null;
                        var pt2 = (pi + 1 < path.length) ? path[pi + 1] : path[0];

                        if (pt2 != null) {
                            var clipperStroke = this.addStrokeCapsToLine(pt.X, pt.Y, pt2.X, pt2.Y, localInflateBy * 2);
                            //clipperStrokes.push(clipperStroke);
                            if (clipperStroke.length > 1) console.warn("got more than 1 path on clipperStroke");
                            csThisPath.push(clipperStroke[0]);
                            //this.drawClipperPaths(clipperStroke, 0xff0000, 0.99, 0);
                        }

                    }
                    var csUnion = this.getUnionOfClipperPaths(csThisPath);
                    //console.log("drawing csUnion:", csUnion);

                    if (!isSolid) {
                        var threeObj = this.drawClipperPaths(csUnion, 0x00ffff, 0.5, 0);
                        //this.sceneAdd(group);
                        this.threePathEndMillArr.push(threeObj);
                    }

                    // This is SUPER SLOW cuz of the triangle calculation
                    if (isSolid) {

                        //if (csUnion.length > 1) console.warn("got more than 1 path on union");
                        // investigate holes
                        var csUnionHoles = [];
                        var csUnionOuter = [];
                        var ctr = 0;
                        csUnion.forEach(function(path) {
                            if (ClipperLib.Clipper.Orientation(path)) {
                                // do nothing.
                                //console.log("outer path:", path);
                                csUnionOuter.push(path);
                            } else {
                                //console.warn("found a hole:", path);
                                csUnionHoles.push(path);
                            }
                            ctr++;
                        }, this);
                        if (csUnionOuter.length > 1) console.warn("got more than 1 outer path");
                        var mesh = this.createClipperPathsAsMesh(csUnionOuter, 0x00ffff, 0.2, csUnionHoles);
                        this.sceneAdd(mesh);
                        this.threePathEndMillArr.push(mesh);
                    }
                    //clipperStrokes.push(csUnion[0]);


                    // now subtract the subsequent stroke path from each line so we get
                    // no overlap
                    //console.log("subtracting subsequent path from each");
                    /*
                    var geo = new THREE.Geometry();
                    var clipperStrokesDiffed = [];
                    var geometries = [];
                    for (var pi = 0; pi < path.length - 1; pi++) {
                        var cs = clipperStrokes[pi];
                        var cs2 = (pi + 1 < path.length) ? clipperStrokes[pi + 1] : null;

                        if (cs2 != null) {
                            var clipperStrokeDiff = this.getDiffOfClipperPaths(cs, cs2);
                            //if (clipperStrokeDiff.length > 1) console.warn("got more than 1 path doing a diff on stroke. should not happen.");
                            clipperStrokesDiffed.push(clipperStrokeDiff[0]);
                            var mesh = this.createClipperPathsAsMesh(clipperStrokeDiff, 0x00ffff, 0.2);
                            //console.log("going to merge mesh:", mesh);
                            if (mesh instanceof THREE.Object3D) {
                                // loop thru children
                                mesh.children.forEach(function(obj) {
                                    //obj.updateMatrix();
                                    //geo.merge(obj.geometry);

                                    geometries.push(obj.geometry);
                                });
                            } else {
                                // merge this geometry with previous
                                //mesh.updateMatrix();
                                //geo.merge(mesh.geometry);
                                geometries.push(mesh.geometry);
                            }
                            //geo.updateMatrix();
                            //this.sceneAdd(mesh);
                        }
                    }
                    */

                    /*
                    // we now have all our geometries and we want to merge them for efficiency
                    // but take the first, then last and work way to middle
                    for (var gi = 0; gi < 3; gi++) { //geometries.length

                        console.log("merging geo:", geo, "geo2:", geometries[gi]);
                        if (gi == 0) geo = geometries[gi];
                        else geo.merge(geometries[gi]);
                        console.log("after merge geo:", geo);
                        geo.mergeVertices();
                        console.log("after merge2 geo:", geo);
                        //geo.merge(geometries[geometries.length - 1 - gi]);
                    }
                    var shapeMesh = new THREE.Mesh(geo, mat);
                    this.sceneAdd(shapeMesh);
                    */

                    // we drew all diffed paths, but the last segment did not get diffed
                    // so draw that as well
                    //console.log("drawing last stroke");
                    /*
                    var lastStroke = clipperStrokes[clipperStrokes.length - 1];
                    var mesh = this.createClipperPathsAsMesh(lastStroke, 0x00ffff, 0.2);
                    this.sceneAdd(mesh);
                    */

                    pathCtr++;
                }, this);

                //this.sceneAdd(group);
                //this.threePathEndMillArr.push(group);
                //this.threePathDeflatedActualArr.push( group );
            }

            // Export Gcode
            this.paths = paths;
            setTimeout(this.exportGcode.bind(this), 500);

            if (callback) {
                console.log("there was a callback after final drawing of board.");
                callback();
            }
            //console.log("paths:", paths);
            console.log("done rendering Eagle BRD");
        },
        getInflatePathWithConstraint: function(paths, inflateBy, constraints) {

            // This method will inflate a path, but not allow the inflate to go
            // beyond half the distance to the paths in contraints

            console.log("getInflatePathWithConstraint. paths:", paths, "inflateBy", inflateBy, "constraints:", constraints);

            var newPaths = ClipperLib.JS.Clone(paths);

            // draw the path we are inflating
            //this.drawClipperPaths(newPaths, 0x0000ff, 0.99, 3);

            // draw the constraints
            var threeObj = this.drawClipperPaths(constraints, 0xff0000, 0.99, 3);
            this.threePathEndMillArr.push(threeObj);

            // Step 0. Generate normals for the path.
            for (var i = 0; i < newPaths.length; i++) {
                var path = newPaths[i];

                // iterate through points and generate normals
                for (var ptIndex = 0; ptIndex < path.length; ptIndex++) {
                    var pt = path[ptIndex];
                    pt.normals = this.getNormals(ptIndex, path);
                }
            }

            // Step 1. Build a Three.js object of the constraints as a per line structure
            // so when we raycast we get the individual line. I do think this could be
            // done as monolithic lines for better efficiency, but it may not help.
            var constraintGroup = new THREE.Group();
            var constraintLines = new THREE.Group();
            var cLineMat = new THREE.LineBasicMaterial({
                color: 0xff0000
            });
            for (var i = 0; i < constraints.length; i++) {
                var cPath = constraints[i];
                var groupOfLines = this.getThreeJsGroupOfLinesForPath(cPath, 0xff0000);
                constraintGroup.add(groupOfLines);

                // create a big line group too cuz more efficient to raycast against
                var lineGeo = new THREE.Geometry();
                for (var i2 = 0; i2 < cPath.length; i2++) {
                    var cpt = cPath[i2];
                    lineGeo.vertices.push(new THREE.Vector3(cpt.X, cpt.Y, 0));
                }
                // close it by adding first pt again
                lineGeo.vertices.push(new THREE.Vector3(cPath[0].X, cPath[0].Y, 0));
                var cLine = new THREE.Line(lineGeo, cLineMat);
                constraintLines.add(cLine);
            }
            var group2 = constraintGroup.clone();
            group2.position.setZ(3);
            console.log("group2:", group2);
            //group2.material.color = 0xff0000;
            this.sceneAdd(group2);

            // Step 2. Build normals for each constraint line because we have to project
            // those normals onto our paths to see if we need to add extra points to better
            // follow the curvature of our environment
            for (var i = 0; i < constraints.length; i++) {
                var cPath = constraints[i];
                for (var ptIndex = 0; ptIndex < cPath.length; ptIndex++) {
                    var cPt = cPath[ptIndex];
                    cPt.normals = this.getNormals(ptIndex, cPath);
                }
            }

            // Step 3. Loop thru paths and look at each line of the path and see
            // if the constraints project onto us, meaning we'll raycast 2 normals
            // for each point on the constraint lines (so this is a ton of CPU
            // being chewed up here) and if there is an intersection we'll add
            // that intersecting point to our main path so when we inflate
            // outward we have more points at good spots to match curvature
            // of constraint lines (i.e. let the environment around us influence
            // our inflate shape)
            var lineMat = new THREE.LineBasicMaterial({
                color: 0x0000ff,
                transparent: true,
                opacity: 0.9
            });
            var lineMat2 = new THREE.LineBasicMaterial({
                color: 0x00ff99,
                transparent: true,
                opacity: 0.9
            });
            var debugZ = 3;
            for (var i = 0; i < newPaths.length; i++) {
                var path = newPaths[i];

                //if (i != 1) continue;

                var newPath = [];

                // iterate through points (and lines)
                for (var ptIndex = 0; ptIndex < path.length; ptIndex++) {
                    //if (ptIndex > 10) continue;

                    var pt = path[ptIndex];
                    var pt2 = (ptIndex + 1 < path.length) ? path[ptIndex + 1] : path[0];

                    // we will essentially generate a new line here, meaning we'll
                    // rebuild a new path where we will at least get the same
                    // points we started with if there are no intersections from
                    // the contraints raycasted onto us, but if there are new points
                    // raycasted onto us, we'll add them into the array
                    pt.orig = true;
                    pt.origPtIndex = ptIndex;
                    newPath.push(pt);

                    var lineGeo = new THREE.Geometry();
                    var ptVector = new THREE.Vector3(pt.X, pt.Y, 0);
                    lineGeo.vertices.push(ptVector);
                    lineGeo.vertices.push(new THREE.Vector3(pt2.X, pt2.Y, 0));
                    var myLineObj = new THREE.Line(lineGeo, (ptIndex % 2 == 0) ? lineMat : lineMat2);
                    var myLine = new THREE.Group();
                    myLine.add(myLineObj);

                    // DEBUG. Draw it
                    var myLine2 = myLine.clone();
                    myLine2.position.setZ(debugZ)
                    this.threePathEndMillArr.push(myLine2);
                    this.sceneAdd(myLine2);
                    //debugZ += 0.2;

                    // we could get some new points here from the constraints raycasted
                    // onto this line. if so keep an array. then de-dupe and sort by distance.
                    // then add to line
                    var newPts = [];

                    // see if the environment intersects with me
                    for (var ci = 0; ci < constraints.length; ci++) {
                        //if (ci > 0) continue;
                        var cPath = constraints[ci];

                        for (var cptIndex = 0; cptIndex < cPath.length; cptIndex++) {
                            //if (ptIndex != 0 && ptIndex != 34) continue;
                            var cpt = cPath[cptIndex];

                            // project normal to see if it intersects with myLine
                            //console.log("projecting normal to see if it intersects with myLine. cpt:", cpt);
                            //if (i == 1 && ptIndex == 0) this.drawNormal(cpt.normals.n1, cpt, inflateBy * 2, 0xff0000, 0.1, 2.9);
                            //if (i == 1 && ptIndex == 0) this.drawNormal(cpt.normals.n2, cpt, inflateBy * 2, 0xff9900, 0.1, 2.9);
                            //if (ptIndex == 34) {
                            var rc1 = this.getIntersection(cpt, cpt.normals.n1, myLine, inflateBy * 2, 0xff0000);
                            // if we get an intersect, we want to use this ray but
                            // in reverse to create our inflate
                            if (rc1.length > 0) {
                                var iPt = rc1[0];
                                //console.log("found intersection of constraints onto myLine. ptIndex for myLine:", ptIndex, "rc1:", iPt);

                                // reverse direction of the ray
                                var newDir = {X:cpt.normals.n1.X * -1, Y:cpt.normals.n1.Y * -1};
                                var newPt = {
                                    X:iPt.point.x,
                                    Y:iPt.point.y,
                                    normal: {
                                        dir: newDir,
                                        dist: iPt.distance / 2
                                    }
                                };
                                this.drawNormal(newDir, newPt, iPt.distance / 2, 0x0000ff, 0.7, 3);
                                // push this point onto newPath
                                newPts.push(newPt);
                            }
                            var rc2 = this.getIntersection(cpt, cpt.normals.n2, myLine, inflateBy * 2, 0xff9900);
                            if (rc2.length > 0) {
                                var iPt = rc2[0];
                                //console.log("found intersection of constraints onto myLine. ptIndex for myLine:", ptIndex, "rc2:", iPt);

                                // reverse direction of the ray
                                var newDir = {X:cpt.normals.n2.X * -1, Y:cpt.normals.n2.Y * -1};
                                var newPt = {
                                    X:iPt.point.x,
                                    Y:iPt.point.y,
                                    normal: {
                                        dir: newDir,
                                        dist: iPt.distance / 2
                                    }
                                };
                                this.drawNormal(newDir, newPt, iPt.distance / 2, 0x0066ff, 0.7, 3);
                                // push this point onto newPath
                                newPts.push(newPt);

                            }

                        }

                    }
                    // done looking at contraint paths and points

                    // now that we have our newPts for myLine, we must de-dupe, then sort
                    // by distance

                    // de-dupe
                    if (newPts.length > 0) {
                        //console.log("newPts prior to de-dupe:", newPts);
                        newPtsDeDupe = this.uniqBy(newPts, JSON.stringify);
                        //console.log("newPts after de-dupe:", newPtsDeDupe);

                        // sort by distance
                        // (also toss any newPt that matches the first point of myLine
                        // or the last point of myLine)
                        ptVector = new THREE.Vector3(pt.X, pt.Y, 0);
                        var newPts2 = [];
                        newPts.forEach(function(newPt) {

                            // check if this point matches the start/end of this line
                            // and if so, toss it
                            if (newPt.X == pt.X && newPt.Y == pt.Y) return;
                            if (newPt.X == pt2.X && newPt.Y == pt2.Y) return;

                            var newPtVector = new THREE.Vector3(newPt.X, newPt.Y, 0);
                            newPt.dist = ptVector.distanceTo(newPtVector);
                            newPts2.push(newPt);
                        });
                        newPts2.sort(function (a, b) {
                            if (a.dist > b.dist) {
                                return 1;
                            }
                            if (a.dist < b.dist) {
                                return -1;
                            }
                            // a must be equal to b
                            return 0;
                        });

                        // now push these new points
                        console.log("newPts after removing if start/end pt and sorting by distance. newPts:", newPts2);
                        newPts2.forEach(function(newPt2) {
                            //newPath.push({X:newPt2.X, Y:newPt2.Y});
                            newPath.push(newPt2);
                        });
                    }
                }

                // replace this path with our newpath
                console.log("replacing old path with N points:", path.length, " with newPath with N points:", newPath.length, "newPath:", newPath);
                newPaths[i] = newPath;

            }

            // WARNING. May have to eliminate points/rays from step above that are the
            // opposite direction of outward facing paths. I don't want any inward facing
            // normals/rays. However, they may get eliminated automatically in the union
            // operation at the end of the process

            // Step 4. Now that we have all the points we need on our main
            // paths. Let's inflate now, but inflate intelligently, i.e don't
            // inflate beyond half the ray intersection of each normal
            for (var i = 0; i < newPaths.length; i++) {
                var path = newPaths[i];

                //if (i != 1) continue;

                var inflatedPath = [];

                // iterate through points (and lines)
                for (var ptIndex = 0; ptIndex < path.length; ptIndex++) {
                    //if (ptIndex > 10) continue;

                    var pt = path[ptIndex];
                    var pt2 = (ptIndex + 1 < path.length) ? path[ptIndex + 1] : path[0];

                    // draw shape from normal1 to normal2 to any points on our line up to,
                    // but not including pt2's normal1
                    console.log("drawing shape for ptIndex:", ptIndex, "pt:", pt);


                    if (pt.orig) {

                        // this is an original point, render the two normals
                        var n1Ray = new THREE.Ray(pt.normals.origin, pt.normals.n1.dir);
                        var n2Ray = new THREE.Ray(pt.normals.origin, pt.normals.n2.dir);
                        // project the ray outward to see if it intersects with constraints
                        // if it does we nee to shorten it, otherwise use the standard length
                        var rc1 = this.getIntersection(pt, pt.normals.n1, constraintLines, inflateBy * 2, 0xff0000);
                        var arrowHelper = new THREE.ArrowHelper(pt.normals.n1.dir, pt.normals.origin, inflateBy * 2, 0xff0000);
                        this.threePathEndMillArr.push(arrowHelper);
                        this.sceneAdd(arrowHelper);
                        var n1Pt;
                        if (rc1.length > 0) {
                            // we hit a constraint
                            var hitObj = rc1[0]; // use closest point we hit
                            console.log("rc1 hitObj:", hitObj);
                            n1Pt = n1Ray.at(hitObj.distance / 2);
                        } else {
                            // we did not hit constraint, so use normal inflation
                            n1Pt = n1Ray.at(inflateBy);
                        }

                        var rc2 = this.getIntersection(pt, pt.normals.n2, constraintLines, inflateBy * 2, 0xff0000);
                        var arrowHelper = new THREE.ArrowHelper(pt.normals.n2.dir, pt.normals.origin, inflateBy * 2, 0xff9900);
                        this.threePathEndMillArr.push(arrowHelper);
                        this.sceneAdd(arrowHelper);
                        var n2Pt;
                        if (rc2.length > 0) {
                            // we hit a constraint
                            var hitObj = rc2[0]; // use closest point we hit
                            console.log("rc2 hitObj:", hitObj);
                            n2Pt = n2Ray.at(hitObj.distance / 2);
                        } else {
                            // we did not hit constraint, so use normal inflation
                            n2Pt = n2Ray.at(inflateBy);
                        }

                        // order here is important. create winding triangles
                        // like the way Clipper.js does it
                        // normal 1
                        inflatedPath.push({X:n1Pt.x, Y:n1Pt.y, n1: true});
                        // orig pt
                        //inflatedPath.push(pt);
                        // normal 2
                        inflatedPath.push({X:n2Pt.x, Y:n2Pt.y, n2: true});

                    }
                }

                // DEBUG. draw clipper path of inflatedPath
                var threeObj = this.drawClipperPaths([inflatedPath], 0x00ff00, 0.99, 3);
                this.threePathEndMillArr.push(threeObj);
            }


            console.log("killing logging. done running");
            console.log = function() {};
            return newPaths;

            // we have to build a three.js object of lines for absolutely every single
            // point in the entire structure of paths. this is a heavy object, but is
            // needed for three.js's
            var group = new THREE.Group();
            for (var i = 0; i < path.length; i++) {

                // generate a test path of individual three.js lines
                var groupOfLines = this.getThreeJsGroupOfLinesForPath(newPath);
                group.add(mainPath.groupOfLines);

                // also generate a normals array for each mainPath
                // create normals for each pt on mainPath
                // each pt gets 2 normals, one on left for incoming line and one
                // on right for outgoing line
                var normalsArr = [];
                for (var ptIndex = 0; ptIndex < mainPath.orig.length; ptIndex++) {
                    var pt = mainPath.orig[ptIndex];
                    var normals = this.getNormals(ptIndex, mainPath.orig);

                    //console.log("normals:", normals);
                    //var ah1 = this.drawNormal(normals.n1, pt, size, 0xff0000, 0.9, 0);
                    //var ah2 = this.drawNormal(normals.n2, pt, size, 0x00ff00, 0.9, 0);
                    //console.log("ah1:", ah1);

                    // figure out inflate point for normal 1
                    var iPt = {};
                    iPt.dir = new THREE.Vector3(normals.n1.X, normals.n1.Y, 0);
                    iPt.origin = new THREE.Vector3(pt.X, pt.Y, 0);
                    iPt.distance = size;
                    // figure out the final inflate position
                    iPt.arrowHelper = new THREE.ArrowHelper( iPt.dir, iPt.origin, iPt.distance, 0xffff00 );
                    //this.sceneAdd(iPt.arrowHelper);
                    iPt.arrowHelper.updateMatrixWorld();
                    var vector = iPt.arrowHelper.line.geometry.vertices[1].clone();
                    vector.applyMatrix4( iPt.arrowHelper.line.matrixWorld );
                    iPt.inflatePt = vector;
                    //console.log("about to create particle for final inflate pt:", iPt.inflatePt);
                    var particle = this.getParticle(iPt.inflatePt.x, iPt.inflatePt.y, iPt.inflatePt.z, 0x0000ff);
                    //this.sceneAdd(particle);
                    normals.n1.iPt = iPt;

                    // figure out inflate point for normal 2
                    var iPt = {};
                    iPt.dir = new THREE.Vector3(normals.n2.X, normals.n2.Y, 0);
                    iPt.origin = new THREE.Vector3(pt.X, pt.Y, 0);
                    iPt.distance = size;
                    // figure out the final inflate position
                    iPt.arrowHelper = new THREE.ArrowHelper( iPt.dir, iPt.origin, iPt.distance, 0xffff00 );
                    //this.sceneAdd(iPt.arrowHelper);
                    iPt.arrowHelper.updateMatrixWorld();
                    var vector = iPt.arrowHelper.line.geometry.vertices[1].clone();
                    vector.applyMatrix4( iPt.arrowHelper.line.matrixWorld );
                    iPt.inflatePt = vector;
                    //console.log("about to create particle for final inflate pt:", iPt.inflatePt);
                    var particle = this.getParticle(iPt.inflatePt.x, iPt.inflatePt.y, iPt.inflatePt.z, 0x0000ff);
                    //this.sceneAdd(particle);
                    normals.n2.iPt = iPt;

                    normalsArr.push(normals);
                }
                mainPath.normals = normalsArr;

            }
        },
        sortObjByKey: function (obj){
          var keys = [];
          var sorted_obj = {};

          for(var key in obj){
              if(obj.hasOwnProperty(key)){
                  keys.push(key);
              }
          }

          // sort keys
          keys.sort();

          // create new array based on Sorted Keys
          jQuery.each(keys, function(i, key){
              sorted_obj[key] = obj[key];
          });

          return sorted_obj;
        },
        uniqBy: function(a, key) {
            var seen = {};
            return a.filter(function(item) {
                var k = key(item);
                return seen.hasOwnProperty(k) ? false : (seen[k] = true);
            })
        },
        redundantPathRemoval: function(paths) {
            // loop thru paths, and if another path is found that matches this, remove it
            console.log("doing redundantPathRemoval");
            var startedWithCnt = paths.length;
            var nrPaths = [];

            for (var i = 0; i < paths.length; i++) {
                var path = paths[i];

                if (this.isThisPathInOtherPaths(path, paths, i)) {
                    // this path is in the other paths, so delete it
                    paths[i] = [];
                }
            }

            // rebuild paths removing undefineds
            paths.forEach(function(path) {
                if (path.length != 0) nrPaths.push(path);
            }, this);
            console.log("started with " + startedWithCnt + " and ended with " + nrPaths.length + " paths");
            return nrPaths;
        },
        isThisPathInOtherPaths: function(path1, paths, indexToIgnore) {
            //console.log("isThisPathInOtherPaths. path1:", path1, "paths:", paths, "indexToIgnore:", indexToIgnore);

            //debugZ = 2;
            var isFound = false;
            for (var i = 0; i < paths.length; i++) {
                if (i == indexToIgnore) continue;

                var path2 = paths[i];
                //console.log("comparing path1 to path2 index:", i);

                // use diff trick. diff the 2 paths and if we get emptiness we have
                // a perfect overlap
                /*
                var unionPath = this.getUnionOfClipperPaths([path1], [path2]);
                // if the unionPath is identical to path1 then we have a match
                if (indexToIgnore == 0) {
                    this.drawClipperPaths([path1], 0xff0000, 0.19, this.debugZ);
                    this.drawClipperPaths([path2], 0x00ff00, 0.19, this.debugZ);
                    this.drawClipperPaths(unionPath, 0x0000ff, 0.99, this.debugZ);
                    this.debugZ += 2;
                }
                */

                if (this.isPathEqual(path1, path2)) {
                    this.drawClipperPaths([path1], 0xff0000, 0.99, this.debugZ);
                    this.drawClipperPaths([path2], 0x00ff00, 0.99, this.debugZ);
                    this.debugZ += 2;

                    // we found a duplicate path
                    console.warn("found a duplicate path. path index1:", indexToIgnore, " path index2:", i);
                    isFound = true;
                    return true;
                }
                //this.drawClipperPaths(diffPath, 0xff0000, 0.99, debugZ);
                //debugZ += 1;
            }
            return false;
        },
        isPathEqual: function(path1, path2) {
            if (path1.length != path2.length) {
                // clearly not equal
                //console.log("returning false cuz path lengths are not equal");
                return false;
            }
            for (var i = 0; i < path1.length; i++) {
                if (path1[i].X != path2[i].X || path1[i].Y != path2[i].Y) {
                    // a point wasn't equal, so we have inequality
                    //console.log("returning cuz a pt wasn't equal");
                    return false;
                }
            }
            return true;
        },
        createThermalCutoutsFromSmd: function(smd, poly, myInflateBy) {

            console.log("creating thermal cutouts for an smd:", smd);
            var cutoutPath = ClipperLib.JS.Clone([smd.clipper]);
            //return cutoutPath;

            // start with inflated smd
            var inflatedSmd = this.getInflatePath(cutoutPath, myInflateBy);

            // since we just want the endmill to go around the outside with a sliver
            // being cut off, deflate by 5% the inflateSmd path and then cutout from
            // inflateSmd
            var smdCutout = this.getInflatePath(inflatedSmd, myInflateBy * -0.05);

            // cutout from inflatedSmd
            inflatedSmd = this.getDiffOfClipperPaths(inflatedSmd, smdCutout);

            // now add back cross hairs, they should be width
            // of the poly outline stroke
            var width = poly.width;
            console.log("width of cross hairs:", width);

            // get center of smd
            console.log("smd:", smd);
            // get bounding box
            var threeInflateSmd = this.createClipperPathsAsMesh(inflatedSmd, 0x00ff00, 0.9);
            var bbox = new THREE.BoundingBoxHelper(threeInflateSmd);
            bbox.update();
            console.log("bbox:", bbox);
            var cx = ((bbox.box.max.x - bbox.box.min.x) / 2) + bbox.box.min.x;
            var cy = ((bbox.box.max.y - bbox.box.min.y) / 2) + bbox.box.min.y;
            var strokeX = this.addStrokeCapsToLine(bbox.box.min.x, cy, bbox.box.max.x, cy, width, "square" );
            var strokeY = this.addStrokeCapsToLine(cx, bbox.box.min.y, cx, bbox.box.max.y, width, "square" );
            //strokeX = this.getAllPathsAsOuterOrientation(strokeX);
            var clipperStroke = this.getUnionOfClipperPaths([strokeX[0], strokeY[0]]);
            //this.drawClipperPaths(clipperStroke, 0x00ff00, 0.99, debugZ);
            // inflate stroke
            clipperStroke = this.getInflatePath(clipperStroke, myInflateBy / 2);
            console.log("clipperStroke:", clipperStroke);

            // remove strokes from poly
            var pathWithStrokesRemoved = this.getDiffOfClipperPaths(inflatedSmd, clipperStroke);
            //this.drawClipperPaths(pathWithStrokesRemoved, 0x00ff00, 0.99, 5.0);

            // remove non-inflated smd
            //pathWithStrokesRemoved.push(smd.clipper);
            var pathWithSmdRemoved = this.getDiffOfClipperPaths(pathWithStrokesRemoved, [smd.clipper]);
            //this.drawClipperPaths(pathWithSmdRemoved, 0x0000ff, 0.99, 6.0);

            return pathWithSmdRemoved;
        },
        animateOrigSetting: null,
        animateDecrement: null,
        animateInflateEl: null,
        animateOverlapPath: function() {
            console.log("animateOverlapPath");
            this.animateOrigSetting = this.inflateMillPathBy;
            this.animateInflateEl = $('#com-chilipeppr-widget-eagle .inflate-by');
            this.animateDecrement = this.inflateMillPathBy;
            //this.animateInflateEl.val(origSetting - this.animateDecrement);
            //this.onRefresh();
            this.animateOverlapPathUpdate();
        },
        animateOverlapPathUpdate: function() {
            this.animateDecrement -= 0.01;
            if (this.animateDecrement <= 0.1) {
                this.inflateMillPathBy = this.animateOrigSetting;
                this.animateInflateEl.val(this.inflateMillPathBy);
                return;
            }
            this.animateInflateEl.val(this.animateDecrement);
            this.onRefresh();
            setTimeout(this.animateOverlapPathUpdate.bind(this), 100);
        },
        onRefreshOld: function(event, callback) {
            console.log("onRefresh. event:", event);
            this.inflateMillPathBy = parseFloat($('#com-chilipeppr-widget-eagle .inflate-by').val());
            this.actualEndmill = parseFloat($('#com-chilipeppr-widget-eagle .actual-endmill-size').val());
            this.refresh();
            if (callback) callback();
        },
        //threePathEndMill: null,
        //threePathDeflatedActual: null,
        threePathEndMillArr: [],
        threePathInflatedActualArr: [],
        threePathDeflatedActualArr: [],
        //pathEndMill: null,
        //pathDeflatedActual: null,
        pathEndMillArr: [],
        pathEndMillHolesArr: [],
        pathInflatedActualArr: [],
        pathDeflatedActualArr: [],
        refresh: function() {
            // refresh the 3d view

            // remove old mill path and inflated path
            //this.sceneRemove(this.threePathEndMill);
            this.threePathEndMillArr.forEach(function(p) {
                this.sceneRemove(p);
            }, this);
            //this.sceneRemove(this.threePathDeflatedActual);
            this.threePathDeflatedActualArr.forEach(function(p) {
                this.sceneRemove(p);
            }, this);
            this.threePathInflatedActualArr.forEach(function(p) {
                this.sceneRemove(p);
            }, this);

            // now reset arrays since they're useless now that
            // we removed them and will regenerate below
            this.threePathEndMillArr = [];
            this.threePathDeflatedActualArr = [];
            this.threePathInflatedActualArr = [];
            this.pathEndMillArr = [];
            this.pathEndMillHolesArr = [];
            this.pathInflatedActualArr = [];
            this.pathDeflatedActualArr = [];

            // let's create an object array instead so we can keep track of inflated paths
            // and original non-inflated paths
            this.pathUberArr = [];

            // create new paths
            /*
            this.pathEndMill = this.getInflatePath(this.pathsUnion, this.inflateMillPathBy);
            this.threePathEndMill = this.drawClipperPaths(this.pathEndMill, this.colorMill, 0.8);
            */

            // double check that there are no "inside" mills meaning a path that is inside
            // another one. if so, we need to reverse inflate those


            // create new endmill path on a per unique signal basis
            // so that they can overlap without union'ing
            var ctr = 0;
            this.pathsUnion.forEach(function(path) {
                //console.log("creating endmill path for:", path);
                // if this is a hole, inflate the other way
                var p;

                var pathUber = {
                    orig: [],
                    inflated: [],
                    isHole: false,
                };

                // check for holes and handle differently
                if (this.pathsUnionHoles[ctr]) {
                    console.warn("there is a hole on this path:", path);
                    this.drawClipperPaths([path], 0xff0000, 0.9, 2);
                    //p = this.getInflatePath([path], this.inflateMillPathBy * -1);
                    p = this.getInflatePath([path], 0);

                    if (p.length > 1) {
                        console.warn("somehow got multiple paths inflating negative on the endmill path. could happen so ensure you watch for it later. p:", p);
                    } else if (p.length == 0) {
                        console.warn("got a hole and ended up with no path after inflating. we deflate holes, so does not surprise me it disappeared.");
                    }

                    this.pathEndMillHolesArr.push(p);

                    pathUber.orig = path;
                    pathUber.inflated = p;
                    pathUber.isHole = true;
                    this.pathUberArr.push(pathUber);

                } else {
                    // else do normal paths
                    p = this.getInflatePath([path], this.inflateMillPathBy);

                    if (p.length > 1) {
                        this.drawClipperPaths([path], 0x00ff0, 0.9, 3);
                        this.drawClipperPaths(p, 0xff0000, 0.9, 4);

                        // get longest path, toss hole
                        var maxIndex = 0;
                        var maxLen = 0;
                        for (var lcv = 0; lcv < p.length; lcv++) {
                            if (p[lcv].length > maxLen) {
                                maxLen = p[lcv].length;
                                maxIndex = lcv;
                            }
                        }
                        this.pathEndMillArr.push(p[maxIndex]);

                        console.error("somehow got multiple paths inflating the endmill path. we took the longest path and tossed the holes. index used:", maxIndex, " cuz it had ", maxLen, " array elements. the whole array had p:", p);


                    } else if (p.length == 0) {
                        console.error("got no path back after inflating the endmill path. should not happen. p:", p);
                    } else {
                        this.pathEndMillArr.push(p[0]);

                        pathUber.orig = path;
                        pathUber.inflated = p[0];
                        this.pathUberArr.push(pathUber);
                    }
                }
                //console.log("inflated path p:", p);

                /*
                if (p.length == 1)
                    this.pathEndMillArr.push(p[0]);
                else
                    this.pathEndMillArr.push(p);
                */

                /*
                p.forEach(function(pSub) {
                    this.pathEndMillArr.push(pSub);
                }, this);
                */
                //var tp = this.drawClipperPaths(p, this.colorMill, 0.8);
                //this.threePathEndMillArr.push(tp);
                ctr++;
            }, this);

            //console.log("pathUberArr:", this.pathUberArr);

            // now do magic wand
            var isMagicWand = $('#com-chilipeppr-widget-eagle .magic-wand-active').is(':checked');

            // new code. attempt to use intersectObjects technique where we
            // take each line segment of a path, find its ray, raycast to see
            // if intersects with any other path
            // to speed things up, let's get intersect candidates first by
            // just seeing if the bounding boxes overlap at all. that will
            // at least narrow it down for us. then do a full line intersect test
            if (isMagicWand) {
                var pathsWithOverlapRemoved = this.getMagicWandPaths(this.pathUberArr);
                //var pathsWithOverlapRemoved = this.getRaycastIntersections(this.pathEndMillArr);
                console.log("isMagicWand. pathsWithOverlapRemoved:", pathsWithOverlapRemoved);
                this.pathEndMillArr = pathsWithOverlapRemoved;
                return;
            }

            // old code using clipper diff/union technique which didn't work
            // also tried doing normals on objects to average deflate, but didn't work
            if (false) {
            if (isMagicWand) {
                // now do Lyric line trending
                //this.lyricTrend(this.pathEndMillArr);
                var overlapsRemoved = this.getPathsWithOverlapRemoved(this.pathEndMillArr);
                this.pathEndMillArr = overlapsRemoved;
                //var tp = this.drawClipperPaths(overlapsRemoved, this.colorMill, 0.8);
                //this.threePathEndMillArr.push(tp);
            } else {
                if (this.threeLyric.length > 0)
                    this.lyricTrendRemove();
            }
            }

            if (false) {
            //if (isMagicWand) {
                var threshold = parseFloat($('#com-chilipeppr-widget-eagle .magic-wand-size').val());
                console.log("user wants magic wand. threshold:", threshold);
                //this.magicWand(this.pathEndMillArr, threshold);
                var that = this;
                this.magicWandWebWorker(this.pathEndMillArr, threshold, function(data) {
                    // callback from web worker
                    console.log("got callback from web worker. data:", data);
                    // show pts in UI
                    $('#com-chilipeppr-widget-eagle .magic-wand-ctr').text(data.ptsWanded);
                    // update this.pathEndMillArr with new data
                    data.path.forEach(function(mwi) {
                        this.pathEndMillArr[mwi.pt1Index.i][mwi.pt1Index.j] = mwi.newPt1;
                        this.pathEndMillArr[mwi.pt2Index.i][mwi.pt2Index.j] = mwi.newPt2;
                    }, that);
                    //that.pathEndMillArr = data.path;
                    that.refreshDrawPathEndMill();
                });

            } else {
                // draw endmill path immediately
                this.refreshDrawPathEndMill();
            }
        },
        pathAvgCache: [], // a cache to store generated paths for certain settings
        pathWasDrawnByAlgorithm: false, // whether our sub algorithm drew the paths or not
        getMagicWandPaths: function(pathUberArr) {

            //console.log("getMagicWandPaths. pathUberArr:", pathUberArr);

            // New Approach - Raycasting

            // We need to

            // the pathUberArr objects will get modified in this call and a new avgPath
            // property will get added to each one
            this.getAvgViaRaycast(pathUberArr);

            // loop thru the avgPaths and return as final set of avg paths
            var finalAvgPaths = [];
            for (var i = 0; i < pathUberArr.length; i++) {
                var mainPath = pathUberArr[i];
                if (mainPath.avgPath !== undefined)
                    finalAvgPaths.push(mainPath.avgPath);
                else
                    finalAvgPaths.push(mainPath.orig);
            }
            return finalAvgPaths;

        },
        getAvgViaRaycast: function(pathUberArr) {

            console.log("getAvgViaRaycast. pathUberArr:", pathUberArr);

            var size = this.inflateMillPathBy;

            // we have to build a three.js object of lines for absolutely every single
            // point in the entire structure of paths. this is a heavy object, but is
            // needed for three.js's
            var group = new THREE.Group();
            for (var i = 0; i < pathUberArr.length; i++) {
                var mainPath = pathUberArr[i];
                mainPath.avgPath = ClipperLib.JS.Clone(mainPath.orig); // clone

                // generate a test path of individual three.js lines
                mainPath.groupOfLines = this.getThreeJsGroupOfLinesForPath(mainPath.avgPath);
                group.add(mainPath.groupOfLines);

                // also generate a normals array for each mainPath
                // create normals for each pt on mainPath
                // each pt gets 2 normals, one on left for incoming line and one
                // on right for outgoing line
                var normalsArr = [];
                for (var ptIndex = 0; ptIndex < mainPath.orig.length; ptIndex++) {
                    var pt = mainPath.orig[ptIndex];
                    var normals = this.getNormals(ptIndex, mainPath.orig);

                    //console.log("normals:", normals);
                    //var ah1 = this.drawNormal(normals.n1, pt, size, 0xff0000, 0.9, 0);
                    //var ah2 = this.drawNormal(normals.n2, pt, size, 0x00ff00, 0.9, 0);
                    //console.log("ah1:", ah1);

                    // figure out inflate point for normal 1
                    var iPt = {};
                    iPt.dir = new THREE.Vector3(normals.n1.X, normals.n1.Y, 0);
                    iPt.origin = new THREE.Vector3(pt.X, pt.Y, 0);
                    iPt.distance = size;
                    // figure out the final inflate position
                    iPt.arrowHelper = new THREE.ArrowHelper( iPt.dir, iPt.origin, iPt.distance, 0xffff00 );
                    //this.sceneAdd(iPt.arrowHelper);
                    iPt.arrowHelper.updateMatrixWorld();
                    var vector = iPt.arrowHelper.line.geometry.vertices[1].clone();
                    vector.applyMatrix4( iPt.arrowHelper.line.matrixWorld );
                    iPt.inflatePt = vector;
                    //console.log("about to create particle for final inflate pt:", iPt.inflatePt);
                    var particle = this.getParticle(iPt.inflatePt.x, iPt.inflatePt.y, iPt.inflatePt.z, 0x0000ff);
                    //this.sceneAdd(particle);
                    normals.n1.iPt = iPt;

                    // figure out inflate point for normal 2
                    var iPt = {};
                    iPt.dir = new THREE.Vector3(normals.n2.X, normals.n2.Y, 0);
                    iPt.origin = new THREE.Vector3(pt.X, pt.Y, 0);
                    iPt.distance = size;
                    // figure out the final inflate position
                    iPt.arrowHelper = new THREE.ArrowHelper( iPt.dir, iPt.origin, iPt.distance, 0xffff00 );
                    //this.sceneAdd(iPt.arrowHelper);
                    iPt.arrowHelper.updateMatrixWorld();
                    var vector = iPt.arrowHelper.line.geometry.vertices[1].clone();
                    vector.applyMatrix4( iPt.arrowHelper.line.matrixWorld );
                    iPt.inflatePt = vector;
                    //console.log("about to create particle for final inflate pt:", iPt.inflatePt);
                    var particle = this.getParticle(iPt.inflatePt.x, iPt.inflatePt.y, iPt.inflatePt.z, 0x0000ff);
                    //this.sceneAdd(particle);
                    normals.n2.iPt = iPt;

                    normalsArr.push(normals);
                }
                mainPath.normals = normalsArr;

            }

            // debug: draw group of groups
            //this.sceneAdd(group);

            // loop thru mainPaths
            for (var i = 0; i < pathUberArr.length; i++) {
                if (i > 0) continue;
                var mainPath = pathUberArr[i];
                mainPath.intersectPtsArr = [];

                // DEBUG: draw mainPath
                this.drawClipperPaths([mainPath.orig], 0x0000ff, 0.8);

                // generate intersect points
                group.remove(mainPath.groupOfLines); // remove self from test
                for (var ptIndex = 0; ptIndex < mainPath.orig.length; ptIndex++) {
                    var pt = mainPath.orig[ptIndex];
                    var normals = mainPath.normals[ptIndex];

                    // see if the normals for this path intersects anything
                    var rc1 = this.getIntersection(pt, normals.n1, group, size * 2, 0x0000ff);
                    var rc2 = this.getIntersection(pt, normals.n2, group, size * 2, 0x000099);

                    if (rc1.length > 0) {
                        console.log("rc1:", rc1);
                        // just use the closest point, so 1st item in array
                        var iPt = rc1[0];
                        iPt.normalNum = 1;
                        iPt.normal = normals.n1;
                        iPt.origin = new THREE.Vector3(pt.X, pt.Y, 0);
                        iPt.dir = new THREE.Vector3(iPt.normal.X, iPt.normal.Y, 0);
                        iPt.mainPathIndex = i;
                        iPt.mainPathPtIndex = ptIndex;

                        // figure out the final inflate position
                        iPt.arrowHelper = new THREE.ArrowHelper( iPt.dir, iPt.origin, iPt.distance / 2, 0xff0000 );
                        this.sceneAdd(iPt.arrowHelper);
                        iPt.arrowHelper.updateMatrixWorld();
                        var vector = iPt.arrowHelper.line.geometry.vertices[1].clone();
                        vector.applyMatrix4( iPt.arrowHelper.line.matrixWorld );
                        iPt.inflatePt = vector;
                        console.log("about to create particle for final inflate pt:", iPt.inflatePt);
                        var particle = this.getParticle(iPt.inflatePt.x, iPt.inflatePt.y, iPt.inflatePt.z, 0x0000ff);
                        this.sceneAdd(particle);

                        mainPath.intersectPtsArr.push(iPt);

                        // record if we have to override the normal for this because
                        // it needs to be shortened
                        normals.n1.override = true;
                        normals.n1.iPt = iPt;
                    } else {
                        // add this normal anyway but with full inflate length because
                        // it did not intersect, so we want full path

                    }

                    if (rc2.length > 0) {
                        var iPt = rc2[0];
                        iPt.normalNum = 2;
                        iPt.normal = normals.n2;
                        iPt.origin = new THREE.Vector3(pt.X, pt.Y, 0);
                        iPt.dir = new THREE.Vector3(iPt.normal.X, iPt.normal.Y, 0);
                        iPt.mainPathIndex = i;
                        iPt.mainPathPtIndex = ptIndex;
                        // figure out the final inflate position
                        iPt.arrowHelper = new THREE.ArrowHelper( iPt.dir, iPt.origin, iPt.distance / 2, 0xff0000 );
                        iPt.arrowHelper.updateMatrixWorld();
                        var vector = iPt.arrowHelper.line.geometry.vertices[1].clone();
                        vector.applyMatrix4( iPt.arrowHelper.line.matrixWorld );
                        iPt.inflatePt = vector;
                        console.log("about to create particle for final inflate pt:", iPt.inflatePt);
                        var particle = this.getParticle(iPt.inflatePt.x, iPt.inflatePt.y, iPt.inflatePt.z, 0x0000ff);
                        this.sceneAdd(particle);
                        this.sceneAdd(iPt.arrowHelper);
                        mainPath.intersectPtsArr.push(iPt);

                        // record if we have to override the normal for this because
                        // it needs to be shortened
                        normals.n2.override = true;
                        normals.n2.iPt = iPt;

                    }

                }
                group.add(mainPath.groupOfLines); // add self back

                // generate further intersect points
                // now look at the inverse situation, see if any other path
                // intersects us, cuz if it does we have to add a waypoint so
                // we get a good final shape
                for (var iInv = 0; iInv < pathUberArr.length; iInv++) {
                    if (iInv == i) continue; // skip ourselves
                    var comparePath = pathUberArr[iInv];

                    for (var ptIndex = 0; ptIndex < comparePath.orig.length; ptIndex++) {
                        var pt = comparePath.orig[ptIndex];
                        var normals = comparePath.normals[ptIndex];

                        // see if the normals for this path intersects anything
                        var rc1 = this.getIntersection(pt, normals.n1, mainPath.groupOfLines, size * 2, 0xff0000);
                        var rc2 = this.getIntersection(pt, normals.n2, mainPath.groupOfLines, size * 2, 0xff0000);
                        if (rc1.length > 0) {
                            var iPt = rc1[0];
                            iPt.normalNum = 1;
                            iPt.normal = normals.n1;
                            iPt.origin = new THREE.Vector3(pt.X, pt.Y, 0);
                            iPt.dir = new THREE.Vector3(iPt.normal.X, iPt.normal.Y, 0);
                            iPt.comparePathIndex = iInv;
                            iPt.comparePathPtIndex = ptIndex;
                            // figure out the final inflate position
                            iPt.arrowHelper = new THREE.ArrowHelper( iPt.dir, iPt.origin, iPt.distance / 2, 0xff0000 );
                            this.sceneAdd(iPt.arrowHelper);
                            iPt.arrowHelper.updateMatrixWorld();
                            var vector = iPt.arrowHelper.line.geometry.vertices[1].clone();
                            vector.applyMatrix4( iPt.arrowHelper.line.matrixWorld );
                            iPt.inflatePt = vector;
                            console.log("about to create particle for final inflate pt:", iPt.inflatePt);
                            var particle = this.getParticle(iPt.inflatePt.x, iPt.inflatePt.y, iPt.inflatePt.z, 0x0000ff);
                            this.sceneAdd(particle);

                            mainPath.intersectPtsArr.push(iPt);
                        }
                        if (rc2.length > 0) {
                            var iPt = rc2[0];
                            iPt.normalNum = 2;
                            iPt.normal = normals.n2;
                            iPt.origin = new THREE.Vector3(pt.X, pt.Y, 0);
                            iPt.dir = new THREE.Vector3(iPt.normal.X, iPt.normal.Y, 0);
                            iPt.comparePathIndex = iInv;
                            iPt.comparePathPtIndex = ptIndex;
                            // figure out the final inflate position
                            iPt.arrowHelper = new THREE.ArrowHelper( iPt.dir, iPt.origin, iPt.distance / 2, 0xff0000 );
                            this.sceneAdd(iPt.arrowHelper);
                            iPt.arrowHelper.updateMatrixWorld();
                            var vector = iPt.arrowHelper.line.geometry.vertices[1].clone();
                            vector.applyMatrix4( iPt.arrowHelper.line.matrixWorld );
                            iPt.inflatePt = vector;
                            console.log("about to create particle for final inflate pt:", iPt.inflatePt);
                            var particle = this.getParticle(iPt.inflatePt.x, iPt.inflatePt.y, iPt.inflatePt.z, 0x0000ff);
                            this.sceneAdd(particle);

                            mainPath.intersectPtsArr.push(iPt);
                        }

                    }
                }

                // we now have all our intersectPts
                console.log("mainPath.intersectPtsArr:", mainPath.intersectPtsArr);

                // create a particle for each intersectPt so we can use intersectObject on it
                mainPath.particles = new THREE.Group();
                for (var j = 0; j < mainPath.intersectPtsArr.length; j++) {
                    var iPt = mainPath.intersectPtsArr[j];
                    console.log("iPt:", iPt);

                    var particle, x, y;

                    // if this is a hit point from an opposing comparePath, swap origins
                    if ('mainPathIndex' in iPt) {
                        // this is an intersect that originated on the mainPath
                        x = iPt.origin.X;
                        y = iPt.origin.Y;
                        particle = this.getParticle(x, y, 0, 0x0000ff);
                    } else {
                        // this is an intersect created from a comparePath line
                        x = iPt.point.x;
                        y = iPt.point.y;
                        particle = this.getParticle(x, y, 0, 0xff0000);
                    }
                    this.sceneAdd( particle );
                    console.log("just added particle:", particle);

                    var intParticle = particle.clone();
                    intParticle.userData.iPt = iPt;
                    mainPath.particles.add(intParticle);
                    iPt.particle = particle;
                }

                // draw normals

                // remove duplicates

                // work our way back around each point now, but for each line
                // after each point, see if any of the intersectPts fall on that
                // line, and if they do add that point to the final list
                var actualZ = 1.01;
                var clipperPath = [];
                for (var iPtCtr = 0; iPtCtr < mainPath.normals.length; iPtCtr++) {
                    var iPtCtr2 = iPtCtr + 1;
                    if (iPtCtr2 > mainPath.normals.length - 1) iPtCtr2 = 0;
                    var inflPt1Normal = mainPath.normals[iPtCtr];
                    var inflPt2Normal = mainPath.normals[iPtCtr2];

                    var pt1 = new THREE.Vector3(mainPath.orig[iPtCtr].X, mainPath.orig[iPtCtr].Y, 0);
                    var pt2 = new THREE.Vector3(mainPath.orig[iPtCtr2].X, mainPath.orig[iPtCtr2].Y, 0);

                    // this region of code figures out if there are any new points
                    // on this line that we should add
                    /*
                    // get direction for pt2
                    var dir = pt2.clone();
                    dir.sub(pt1);
                    dir.normalize();
                    var arrowHelper = new THREE.ArrowHelper( dir, pt1, 0.2, 0x00ff00 );
                    arrowHelper.position.setZ(0.1);
                    this.sceneAdd(arrowHelper);

                    var far = pt1.distanceTo(pt2);

                    var rc = new THREE.Raycaster( pt1, dir, 0, far);
                    rc.params.PointCloud.threshold = 0.001;
                    //console.log("raycaster:", rc);
                    var rcr = rc.intersectObject(mainPath.particles, true);
                    console.log("particles found on this line segment. rcr:", rcr);
                    for (var ri = 0; ri < rcr.length; ri++) {
                        var pPt = rcr[ri];

                        if (pPt.distance == 0) continue;
                        var p = this.getParticle(pPt.point.x, pPt.point.y, 0.1, 0x00ff00);
                        this.sceneAdd(p);

                        // show the avg path pt for this


                    }
                    */

                    var inflPt1N1, inflPt1N2, inflPt2N1, inflPt2N2;
                    var origPt1, origPt2;

                    // we are now trying to figure out the inflate point for the line
                    // there are 2 scenarios, one where we just use the standard inflated
                    // point off the normal figured out earlier
                    // the other scenario is if we had to shorten the normal because it
                    // would intersect with opposing paths
                    //console.log("about to work on inflPt1Normal:", inflPt1Normal, "and inflPt2Normal:", inflPt2Normal);
                    origPt1 = mainPath.orig[iPtCtr];
                    var origPt1V = new THREE.Vector3(origPt1.X, origPt1.Y, 0);
                    if (inflPt1Normal.n1.override) {
                        // we need to use shortened point
                        console.log("using shortened point for Normal1:", inflPt1Normal);
                        inflPt1N1 = inflPt1Normal.n1.iPt.inflatePt.clone();
                    } else {
                        // we need to use standard point
                        inflPt1N1 = inflPt1Normal.n1.iPt.inflatePt.clone();
                    }
                    if (inflPt1Normal.n2.override) {
                        // we need to use shortened point
                        console.log("using shortened point for Normal2:", inflPt1Normal);
                        inflPt1N2 = inflPt1Normal.n2.iPt.inflatePt.clone();
                    } else {
                        // we need to use standard point
                        inflPt1N2 = inflPt1Normal.n2.iPt.inflatePt.clone();
                    }
                    origPt2 = mainPath.orig[iPtCtr2];
                    var origPt2V = new THREE.Vector3(origPt2.X, origPt2.Y, 0);

                    if (inflPt2Normal.n1.override) {
                        // we need to use shortened point
                        console.log("using shortened point for pt2 Normal1:", inflPt2Normal);
                        inflPt2N1 = inflPt2Normal.n1.iPt.inflatePt.clone();
                    } else {
                        // we need to use standard point
                        inflPt2N1 = inflPt2Normal.n1.iPt.inflatePt.clone();
                    }
                    if (inflPt2Normal.n2.override) {
                        // we need to use shortened point
                        console.log("using shortened point for pt2 Normal2:", inflPt2Normal);
                        inflPt2N2 = inflPt2Normal.n2.iPt.inflatePt.clone();
                    } else {
                        // we need to use standard point
                        inflPt2N2 = inflPt2Normal.n2.iPt.inflatePt.clone();
                    }

                    // debug draw
                    var lineMat = new THREE.LineBasicMaterial({
                        color: 0xff0000,
                        transparent: true,
                        opacity: 0.99
                    });
                    var lineGeo = new THREE.Geometry();
                    lineGeo.vertices.push(inflPt1N1);
                    lineGeo.vertices.push(inflPt1N2);
                    lineGeo.vertices.push(inflPt2N1);
                    lineGeo.vertices.push(inflPt2N2);
                    //actualZ += 0.01;
                    var linePath = new THREE.Line(lineGeo, lineMat);
                    this.sceneAdd(linePath);

                    // add these points to a clipperPath so we can do a union
                    clipperPath.push({X:inflPt1N1.x, Y:inflPt1N1.y});
                    clipperPath.push({X:inflPt1N2.x, Y:inflPt1N2.y});
                    clipperPath.push({X:inflPt2N1.x, Y:inflPt2N1.y});
                    clipperPath.push({X:inflPt2N2.x, Y:inflPt2N2.y});

                }
                var pathTest = this.getUnionOfClipperPaths([clipperPath]);
                this.drawClipperPaths(pathTest, 0x0000ff, 0.9, 0.3);

                // if we got here, the distance of the normal is a problem
                // so we basically need to divide the length in half and
                // make that the normal we use
                var dist = iPt.distance / 2;


            }

        },
        getParticle: function(x, y, z, color) {
            var geometry = new THREE.Geometry();

            var vertex = new THREE.Vector3();
            vertex.x = x;
            vertex.y = y;
            vertex.z = z;

            geometry.vertices.push( vertex );

            var material = new THREE.PointCloudMaterial( {
                color: color ? color : 0xff0000,
                transparent: true,
                opacity: 0.2,
                size: 0.1
            } );

            var particle = new THREE.PointCloud( geometry, material );

            return particle;
        },
        debugz: 0.001,
        debugCtr: 0,
        getIntersection: function(origin, dir, threeObj, far, color) {
            //console.log("getIntersection. origin:", origin, "dir:", dir);
            origin = new THREE.Vector3(origin.X, origin.Y, 0);
            dir = new THREE.Vector3(dir.X, dir.Y, 0);
            //console.log("as threejs Vector2. origin:", origin, "dir:", dir);
            var rc = new THREE.Raycaster( origin, dir, 0.0001, far);
            rc.linePrecision = 0.0001;
            var rcr = rc.intersectObject(threeObj, true);

            // remove distance NaN
            var rArr = [];
            var ctr = 0;
            rcr.forEach(function(rcrItem) {
                if (!isNaN(rcrItem.distance)) {
                    ctr++;
                    //if (ctr > 1) return;
                    // we have a valid intersect
                    rArr.push(rcrItem);
                    // debug draw
                    //this.drawParticle(rcrItem.point.x, rcrItem.point.y, this.debugz, color, 0.9, 0.2);

                    if (color == 0x0000ff)
                        console.log("intersect pt:", rcrItem);
                }
            }, this);

            // re-sort by distance
            rArr.sort(function compare(a, b) {
                if (a.distance < b.distance) {
                    return -1;
                }
                if (a.distance > b.distance) {
                    return 1;
                }
                // a must be equal to b
                return 0;
            });

            // debug. draw particles.
            if (rArr.length > 0) {
                var rcrItem = rArr[0];
                //this.drawParticle(rcrItem.point.x, rcrItem.point.y, this.debugz, color, 0.9, 0.2);
            }

            return rArr;
        },
        getIntersectionOld: function(origin, dir, threeObj) {
            console.log("getIntersection. origin:", origin, "dir:", dir);

            if (this.debugCtr == 2) {
                this.drawParticle(origin.x, origin.y, this.debugz, 0x0000ff, 0.1, 0.2);
                this.drawNormal({X:dir.x, Y:dir.y}, {X:origin.x,Y:origin.y}, 10.1, 0xff0000, 0.2, this.debugz);
            }

            var rc = new THREE.Raycaster( origin, dir);
            rc.linePrecision = 0.0001;
            //rc.linePrecision = 2;

            // loop thru all lines, but don't compare to ones where
            // our point is in the line
            var rcrs = [];
            //console.log("about to loop thru threeObj.children:", threeObj.children);
            var debugLineOffset = 0;
            for (var i = 0; i < threeObj.children.length; i++) {
                var line = threeObj.children[i];
                //console.log("line:", line, "line.geometry.vertices:", line.geometry.vertices, "origin:", origin);
                var isRemoveFromCompare = false;
                line.geometry.vertices.forEach(function(pt) {
                    //console.log("comparing pt:", pt, "to origin:", origin);
                    if (pt.x == origin.x && pt.y == origin.y) {
                        //console.log("found match, so will skip comparing this line for intersectObject");
                        isRemoveFromCompare = true;
                    }
                });
                if (isRemoveFromCompare) continue;

                if (this.debugCtr == 2) {
                    var line2 = line.clone();
                    line2.position.setZ(this.debugz + debugLineOffset);
                    this.sceneAdd(line2);
                    debugLineOffset += 0.01;
                }

                var rcr = rc.intersectObject(line, true);
                if (rcr.length > 0) {
                    rcr.forEach(function(rc) {
                        rcrs.push(rc);

                        // double check if these really intersect
                        if (this.debugCtr == 2) {
                        var lineObj = rc.object.clone();
                        var rc2 = new THREE.Raycaster( origin, dir, 0.001, 1000);
                        var ri = rc2.intersectObject(lineObj);
                        if (ri.length == 0) {
                            console.warn("we had an intersect, but a double check says no???");
                        } else {
                            console.warn("we double checked intersect and it looks good. ri:", ri);
                        }
                        }

                        //if (rc.distance > 0) {
                        if (this.debugCtr == 2) {
                            console.log("rc:", rc);
                            var line3 = rc.object.clone();
                            var mat = rc.object.material.clone();
                            mat.color = 0xff0000;
                            line3.material = mat;
                            line3.position.setZ(this.debugz + debugLineOffset);
                            this.sceneAdd(line3);

                            debugLineOffset += 0.01;
                        }
                        //}
                    }, this);
                }
            }

            //var rcr = rc.intersectObject(threeObj, true);
            console.log("rcrs:", rcrs);
            // use closest intersection
            var obj = null;
            if (rcrs.length == 0) {
                // there was no intersection
                console.warn("no intersection");
            } else {
                obj = rcrs[0];
                //that.drawParticle(obj.point.x, obj.point.y, obj.point.z, hex, 0.9, 0.02);
                // now take half the distance to average
                //newDelta = (obj.distance * scale) / -2;
            }

            var objs = [];
            var clipperPath = [{X: origin.x, Y: origin.y}];
            var minDist = 100000;
            var finalObj = null;
            rcrs.forEach(function(obj) {
                if (obj.distance < minDist && obj.distance > 0) {
                    //objs.unshift(obj);
                    finalObj = obj;
                    minDist = obj.distance;
                    //this.drawParticle(obj.point.x, obj.point.y, obj.point.z, 0xff0000, 0.2, 0.02);
                    clipperPath.push({X:obj.point.x, Y:obj.point.y});
                }
            }, this);
            //this.drawClipperPaths([clipperPath], 0xff0000, 0.9, 1, 0.0, false);
            //console.log("rcr:", objs);
            this.debugz += 0.1;
            //this.debugCtr++;
            return finalObj; //objs;
        },
        getThreeJsGroupOfLinesForPath: function(overlapPath, z) {

            // Pass in array of paths

            var group = new THREE.Group();
            var actualZ = z ? z : 0;

            var lineMat = new THREE.LineBasicMaterial({
                color: 0x00ffff,
                transparent: true,
                opacity: 0.5
            });
            var lineMat2 = new THREE.LineBasicMaterial({
                color: 0xff0000,
                transparent: true,
                opacity: 0.5
            });

            var zdebug = 0.1;
            for (var j = 0; j < overlapPath.length; j++) {

                var j2 = j + 1;
                if (j2 > overlapPath.length - 1) j2 = 0;

                var lineGeo = new THREE.Geometry();
                lineGeo.vertices.push(new THREE.Vector3(overlapPath[j].X, overlapPath[j].Y, actualZ));
                lineGeo.vertices.push(new THREE.Vector3(overlapPath[j2].X, overlapPath[j2].Y, actualZ));
                var linePath = new THREE.Line(lineGeo, lineMat);

                // for debug
                /*
                var linePath2 = new THREE.Line(lineGeo, lineMat2);
                linePath2.position.setZ(zdebug);
                this.sceneAdd(linePath2);
                zdebug += 0.01;
                */

                group.add(linePath);
            }

            return group;
        },
        getNormals: function(index, path) {
            // return 2 normals for the point index passed in
            // the normals are for the line coming into the point and
            // the line going out of the point
            var pt = path[index];

            var pt1index = index - 1;
            if (pt1index < 0) pt1index = path.length - 1;
            var pt2index = index;
            var pt1 = path[pt1index];
            var pt2 = path[pt2index];
            var normal1 = this.getUnitNormal(pt1, pt2);


            var pt1index = index;
            var pt2index = index + 1;
            if (pt2index > path.length - 1) pt2index = 0;
            var pt1 = path[pt1index];
            var pt2 = path[pt2index];
            var normal2 = this.getUnitNormal(pt1, pt2);

            var normals = {n1: normal1, n2: normal2};

            normals.n1.dir = new THREE.Vector3(normals.n1.X, normals.n1.Y, 0);
            normals.n2.dir = new THREE.Vector3(normals.n2.X, normals.n2.Y, 0);

            normals.origin = new THREE.Vector3(pt.X, pt.Y, 0);

            return normals;

        },
        getUnitNormal: function(pt1, pt2) {
            var dx = (pt2.X - pt1.X);
            var dy = (pt2.Y - pt1.Y);
            if ((dx == 0) && (dy == 0))
                return {X:0, Y:0};
            var f = 1 / Math.sqrt(dx * dx + dy * dy);
            dx *= f;
            dy *= f;
            return { X: dy * 1, Y: -dx * 1};
        },
        drawNormal: function(normal, origin, size, color, opacity, z) {
            // draw the normal
            if (!size) size = 1;
            if (!z) z = 0;
            if (!color) color = 0xffff00;
            if (!opacity) opacity = 0.99;
            var dir = new THREE.Vector3( normal.X, normal.Y, 0 );
            var origin = new THREE.Vector3( origin.X, origin.Y, z );
            var length = size;
            var hex = color;

            var arrowHelper = new THREE.ArrowHelper( dir, origin, length, hex );
            //console.log(arrowHelper);
            arrowHelper.children.forEach(function(obj) {
                obj.material.transparent = true;
                obj.material.opacity = opacity;
            });
            this.threePathEndMillArr.push(arrowHelper);
            this.sceneAdd( arrowHelper );
            return arrowHelper;
        },

        getRaycastIntersections: function(paths) {

            console.log("getRaycastIntersections. paths:", paths);

            // make a new array that mathches our path array but has super objects
            // for each path and the path candidates to compare to. the candidates
            // run through an initial filter on their boundingboxes. that gets us to say
            // 10% of the paths potentially overlapping. if they overlap
            // we consider them a candidate.
            // then we do an additional filter to see if the path truly/really overlaps
            // by doing a full union operation. if we get,
            // do an object for each array item of:
            // { origPath: (original path passed in),
            //   compareTo: [(all other paths other than this one) {
            //       origIndex: (original index of this path),
            //       path: (point array)
            //   }]
            // }
            var pathsWithCompare = this.getComparePathArray(paths);

            // we now have a gorgeous super object array with each main path
            // and the paths to compare to. note that we'll get a double comparison
            // on everything because 2 overlapping paths will process with path 1 as main
            // and then later with path 1 as the compareTo, so we could make this more efficient
            // by not doing the work twice later on



            // Old Approach - Deflating and looking for intersects
            if (false) {
            // check if the average path for this inflateBy has already been
            // generated and is in the memory cache
            if (this.pathAvgCache[this.inflateMillPathBy] !== undefined) {
                // it is in the cache, use it
                pathsWithCompare = this.pathAvgCache[this.inflateMillPathBy];
                this.pathWasDrawnByAlgorithm = false;

            } else {
                // generate it. long/slow process
                // for now just send in one mainPath
                //this.getAveragedOverlapPathsForEachMainPath([pathsWithCompare[13]]);
                //this.getAveragedOverlapPathsForEachMainPath([pathsWithCompare[3]]);
                //this.getAveragedOverlapPathsForEachMainPath(pathsWithCompare);
                this.getAveragedOverlapPathsForEachMainPathWithPause(pathsWithCompare);
                this.pathWasDrawnByAlgorithm = true;
                // store it in cache
                this.pathAvgCache[this.inflateMillPathBy] = pathsWithCompare;
            }

            // loop thru averaged paths and return as final set of paths
            var finalAvgPaths = [];
            for (var i = 0; i < pathsWithCompare.length; i++) {
                var mainPath = pathsWithCompare[i];
                finalAvgPaths.push(mainPath.avgPath);
            }
            }

            return finalAvgPaths;
            //return paths;
        },
        getAveragedOverlapPathsForEachMainPathWithPause: function(pathsWithCompare) {
            var i = 0;
            var that = this;
            var f = function() {
                var path = pathsWithCompare[i];
                that.getAveragedOverlapPathsForEachMainPath([pathsWithCompare[i]]);
                i++;
                if (i < pathsWithCompare.length)
                    setTimeout(f, 2000);
            }
            f();
        },
        gaopfempZ: 0.0, // debug z height for draw
        getAveragedOverlapPathsForEachMainPath: function(pathsWithCompare) {

            // Passed in:
            /*
            [Object]
                0: Object
                avgPath: Array[265]
                boundingBox: ClipperLib.IntRect
                compareTo: Array[21]
                origPath: Array[265]
            */


            console.log("getAveragedOverlapPathsForEachMainPath. pathsWithCompare:", pathsWithCompare);

            // We get super path object array
            // We will insert a new property called avgPath to
            // the mainPath which should have the lines averaged
            // where there is overlap
            for (var i = 0; i < pathsWithCompare.length; i++) {
                var mainPath = pathsWithCompare[i];
                mainPath.avgPath = ClipperLib.JS.Clone(mainPath.origPath); // clone
                //JSON.parse(JSON.stringify(mainPath.origPath)); //slice(0); // clone it
                for (var i2 = 0; i2 < mainPath.compareTo.length; i2++) {
                    // index 2 has problems. it's the one that splits into
                    // multiple intersects as it deflates
                    //if (i2 != 2) continue;
                    // index 6 has problems too. it is a multi overlap path
                    // from the start
                    //if (i2 > 7) continue;
                    //if (i2 != 4 && i2 != 7) continue;
                    // index 6 has the dual path issue
                    //if (i2 != 6) continue;
                    //if (i2 != 8) continue;
                    // make avgPath be newly returned avgPath and pass that
                    // new avgPath in each time so it gets averaged for each
                    // overlap until we're done. we'll finish with a nicely
                    // adjusted mainPath for each overlap
                    var comparePath = mainPath.compareTo[i2].path;
                    var intersectPolys = mainPath.compareTo[i2].intersectionPolys;
                    //mainPath.avgPath = this.getAveragedOverlapPath(mainPath.avgPath, comparePath, intersectPolys);
                    // we have to make each superObj be only one path folks
                    // we could end up with multiple intersects, so need to make sure
                    // we do only one at a time. in our test cases we're only getting 1 path
                    // but i know we'll get multiple here
                    if (intersectPolys.m_Childs.length > 1) {
                        console.log("got more than 1 intersectPoly child, so fortunately we made a loop to deal with this.");
                    }

                    // loop on intersectPoly paths. only do one path at time so can splice
                    // into mainPath at end of each loop
                    for (var ipCtr = 0; ipCtr < intersectPolys.m_Childs.length; ipCtr++) {
                        var intersectPath = intersectPolys.m_Childs[ipCtr];
                        var intersectPoly = new ClipperLib.PolyTree();
                        intersectPoly.AddChild(intersectPath);

                        var superObj = {
                            mainPath: mainPath.avgPath,
                            comparePath: comparePath,
                            // inflate the poly test to ensure all points are inside it
                            // because i found that the intersect pts don't ALWAYS perfectly
                            // fall inside
                            //intersectPolysForTest: this.inflatePolys(intersectPolys, 0.001),
                            //intersectPolysForTest: this.getPolytreeIntersectionOfClipperPaths(
                            //    mainPath.origPath, comparePath),
                            intersectPolysForTest: intersectPoly,
                            ptPair: null,
                            deflateBy: -0.005
                        };
                        /*
                        console.log("sometimes getting weird intersect poly:", superObj.intersectPolysForTest);
                        this.drawClipperPolys(superObj.intersectPolysForTest, 0x0000ff, 0.29, this.gaopfempZ + 0.05);
                        */

                        // inflate intersectPolysForTest
                        this.inflatePolys(superObj.intersectPolysForTest, 0.001);

                        //this.drawClipperPolys(superObj.intersectPolysForTest, 0x0000ff, 0.99, this.gaopfempZ + 0.1);
                        /*
                        // DEBUG: draw mainPath and overlapPath (full long ass paths)
                        this.drawClipperPaths([superObj.mainPath], 0x00ff00, 0.99, this.gaopfempZ, 0.0 );
                        //this.gaopZ += 0.5;
                        this.drawClipperPaths([superObj.comparePath], 0xff0000, 0.99, this.gaopfempZ + 0.00);
                        //this.graopZ += 0.5;
                        this.drawClipperPolys(superObj.intersectPolysForTest, 0x0000ff, 0.99, this.gaopfempZ + 0.05);
                        */


                        // get the ptPair for this
                        var intersectPairsArr = this.getAllIntersectPairs(superObj.mainPath, superObj.comparePath, superObj.intersectPolysForTest.m_Childs);
                        if (intersectPairsArr.length > 1) {
                            console.error("we should never get here at this point because we isolated each intersectTestPoly and that should yield ONLY ONE ptPair! more than 1 intersectPair");
                        }
                        superObj.ptPair = intersectPairsArr[0];
                        superObj.origPtPair = intersectPairsArr[0];

                        console.log("about to start recursion on superObj:", superObj);

                        // DEBUG: draw origPtPair we are starting with
                        //this.drawClipperPaths([[superObj.ptPair.pt1, superObj.ptPair.pt2]], 0xff00ff, 0.99, this.gaopfempZ, 0.5 );

                        // DEBUG: reset debug z for recursive calls each time
                        this.graopZ = 1.0;

                        // this call modifies the superObj as opposed to returning a new one
                        try {
                            this.getRecursiveAveragedOverlapPath( superObj );
                        } catch (ex) {
                            console.error("outer", ex.message);
                            // draw the path where the error was and move on
                            var tp = this.drawClipperPaths([mainPath.avgPath], 0xff0000, 0.99, 0, 0.0 );
                            this.threePathEndMillArr.push(tp);
                            continue;
                        }

                        console.log("superObj after recursing thru deflate with our final lines inside the intersectPolysForTest obj. superObj:", superObj);

                        // DEBUG. Draw the line
                        //this.drawClipperPaths([superObj.line], 0x00ffff, 0.99, this.gaopfempZ, 0, false);

                        // now splice in the line to the mainPath
                        // THIS IS AN AMAZING MOMENT. It has taken 4 weeks to get here.
                        var startIndex = superObj.origPtPair.pt1.mainPathIndex;
                        var endIndex = superObj.origPtPair.pt2.mainPathIndex;

                        console.log("about to splice startIndex:", startIndex, "endIndex:", endIndex, "len of mainPath prior:", superObj.mainPath.length, "len of line:", superObj.line.length, "expected length afterwards:", superObj.mainPath.length + superObj.line.length - (endIndex - startIndex));
                        //if (endIndex > startIndex) {
                        if (superObj.origPtPair.pt2.didAllSubsequentPtsOnMainPathFallInPoly == false) {
                            // this line goes across the boundary of index 0
                            // so, what we should do is simply make the endIndex be startIndex
                            // but chop off the array elements prior to startIndex, so that
                            // startIndex is element 0
                            console.log("this line crosses path end/start boundary");

                            //console.log("new startIndex:", startIndex, "endIndex:", endIndex, "len of mainPath after chopping front off:", superObj.mainPath.length, "len of line:", superObj.line.length, "expected length afterwards:", superObj.mainPath.length + superObj.line.length - (endIndex - startIndex));
                            // delete to end of array
                            superObj.mainPath.splice(startIndex + 1); //, superObj.mainPath.length - startIndex );
                            // delete front of array (WARNING: this could create winding order problems)
                            // could possibly re-run thru ClipperJS to fix
                            superObj.mainPath.splice(0, endIndex + 1);
                            this.insertArrayAt(superObj.mainPath, startIndex + 1, superObj.line);

                        } else {

                            superObj.mainPath.splice(startIndex + 1, endIndex - startIndex );
                            this.insertArrayAt(superObj.mainPath, startIndex + 1, superObj.line);
                        }
                        mainPath.avgPath = superObj.mainPath;
                        console.log("actual length after splice:", mainPath.avgPath.length);

                        // DEBUG: draw the spliced path
                        //this.drawClipperPaths([mainPath.avgPath], 0x0000ff, 0.99, this.gaopfempZ - 0.2, 0.0 );
                        this.gaopfempZ += -1.0;
                    } // loop for intersectTestPolys
                } // loop for mainPath

                // this is so satisfying drawing this final path it's not even funny
                // probably single hardest problem i've worked on in computer science to date
                var tp = this.drawClipperPaths([mainPath.avgPath], 0x0000ff, 0.8, 0, 0.0 );
                //var tp = this.drawClipperPaths(this.pathEndMillArr, this.colorMill, 0.8);
                this.threePathEndMillArr.push(tp);
            }

        },
        insertArrayAt: function(array, index, arrayToInsert) {
            Array.prototype.splice.apply(array, [index, 0].concat(arrayToInsert));
            return array;
        },
        inflatePolys: function(polys, inflateBy) {

            var polynode = polys.GetFirst();
            while (polynode) {
                //do stuff with polynode here
                //console.log("polynode:", polynode);
                var inflatePath = this.getInflatePath([polynode.m_polygon], inflateBy);
                polynode.m_polygon = inflatePath[0];
                //console.log("polynode after inflate:", polynode);
                polynode = polynode.GetNext();
            }
            return polys;
        },
        drawClipperPolys: function(polys, color, opacity, z) {
            var polynode = polys.GetFirst();
            while (polynode) {
                //do stuff with polynode here
                //console.log("polynode:", polynode);

                // DEBUG: draw intersectPath
                this.drawClipperPaths([polynode.m_polygon], color, opacity, z);
                polynode = polynode.GetNext();
            }
        },
        graopZ: 0.0, // debug z start value
        getRecursiveAveragedOverlapPath: function(superObj) {

            console.group("getRecursiveAveragedOverlapPath");
            console.log("getRecursiveAveragedOverlapPath. superObj:", superObj);
            /*
            getRecursiveAveragedOverlapPath

            Passed in: {
                comparePath: Array[101]
                intersectPolys: ClipperLib.PolyTree
                    m_Childs: Array[2]
                        0: ClipperLib.PolyNode
                            m_polygon: Array[12]
                            ptPair: {pt1:{x: , y: }, pt2:{x: , y: }}
                        1: ClipperLib.PolyNode
                            m_polygon: Array[25]
                            ptPair: {pt1:{x: , y: }, pt2:{x: , y: }}
                mainPath: Array[201],
                deflateBy: -0.1
            }

            Here's how it works. We know we were just passed a mainPath and a
            comparePath. We know that a comparePath can have multiple overlaps
            and in fact we need to expect that we ABSOLUTELY will get multiple
            overlaps. For example, if you have a signal wire for +5V you get it
            branching all over the whole circuit board. When you inflate the path
            per the user picking an inflate number like 0.5mm, you will surely
            get a ton of overlapPaths and each overlapPath will likely zigzag
            around and have multiple overlaps. So, in this recursive call, we
            have to:
            1) Deflate the mainPath and comparePath by -0.005 (something precise enough
                to get a nice set of points to create curves as we deflate)
            2) Add -0.005 to deflateBy in superObj.
            3) Test if any intersects and save those at ptPairs for later
            4) If no intersects return (no need to return superObj)
            5) Call recursively with cloned superObj
                1) Deflate the mainPath and comparePath by .deflateBy (-0.005)
                2) Add -0.005 to deflateBy in superObj.
                3) Test if any intersects and save those at ptPairs for later
                4) If no intersects return (no need to return superObj)
                5) Call recursively with superObj
                    1) Deflate the mainPath and comparePath
                    2) Add -0.005 to deflateBy in superObj.
                    3) Test if any intersects and save those at ptPairs for later
                    4) If no intersects return (no need to return superObj)
                    5) -- Call recursive ends

                6) Get return. We see it is null.
                7) We have a ptPair stored in memory. See which intersectPoly it
                    is inside of. Add it to the poly in an array. [ptPair]
                8) Return.
            6) Get return.
            7) We have a ptPair stored in memory. See which intersectPoly it
                is inside of. Add it to the poly in an array. [ptPair, ptPair]
            */

            // DEBUG: draw everything in this recursive layer in it's own z layer for
            // visualization
            /*
            this.graopZ += 1.0;

            // DEBUG: draw everything passed in
            this.drawClipperPaths([superObj.mainPath], 0x00ff00, 0.39, this.graopZ, 0.0 );
            this.drawClipperPaths([superObj.comparePath], 0xff0000, 0.39, this.graopZ + 0.05);
            */
            /*
            this.graopZ += 1.0;
            // intersectTest
            this.drawClipperPolys(superObj.intersectPolysForTest, 0x0000ff, 0.39, this.graopZ + 0.1);
            // ptPair
            var line = [superObj.ptPair.pt1, superObj.ptPair.pt2];
            console.log("drawing line:", line);
            this.drawClipperPaths([line], 0x00ffff, 0.99, this.graopZ + 0.15, 0, false);
            */

            // deflate both paths (deflateBy is negative)
            var dMainPaths = this.getInflatePath([superObj.mainPath], superObj.deflateBy);
            var dComparePaths = this.getInflatePath([superObj.comparePath], superObj.deflateBy);

            //console.log("dMainPaths:", dMainPaths);

            // DEBUG: draw mainPath and overlapPath (full long ass paths)
            /*
            this.drawClipperPaths(dMainPaths, 0x00ff00, 0.99, this.graopZ );
            //this.gaopZ += 0.5;
            this.drawClipperPaths(dComparePaths, 0xff0000, 0.99, this.graopZ + 0.05);
            //this.graopZ += 0.5;
            */

            if (dMainPaths.length > 1) {
                console.error("got multiple paths on delfate of mainPath");
                //console.groupEnd();
                //return;
                //throw new Error("got multiple paths on delfate of mainPath");
            }
            if (dComparePaths.length > 1) {
                console.error("got multiple paths on delfate of comparePath");
                console.groupEnd();
                return;
            }

            var dMainPath = dMainPaths[0];
            var dComparePath = dComparePaths[0];
            console.log("dMainPath.length:", dMainPath.length, "dComparePath.length:", dComparePath.length);

            // get the intersectPolys for this layer
            var thisLayerintersectPolysForTest = this.getPolytreeIntersectionOfClipperPaths(
                dMainPath, dComparePath);
            console.log("thisLayerintersectPolysForTest:", thisLayerintersectPolysForTest);
            // inflate intersectPolysForTest
            this.inflatePolys(thisLayerintersectPolysForTest, 0.001);


            // DEBUG: draw the intersect polys for this layer
            //this.drawClipperPolys(thisLayerintersectPolysForTest, 0x0000ff, 0.99, this.graopZ + 0.2);
            // Find intersect pairs
            var intersectPairsArr = this.getAllIntersectPairs(dMainPath, dComparePath, thisLayerintersectPolysForTest.m_Childs);
            console.log("intersectPairsArr:", intersectPairsArr);

            if (intersectPairsArr.length == 0) {
                // we got no intersects, return up the chain
                superObj.line = [superObj.ptPair.pt1, superObj.ptPair.pt2];
                console.log("returning cuz got no intersects. superObj:", superObj);
                console.groupEnd();
                return;
            }

            // our number of intersectTestPolys should match the number of intersectPairs
            // we have. if they don't we have a problem.
            if (intersectPairsArr.length != thisLayerintersectPolysForTest.m_Childs.length) {
                console.error("we should never get a different count of ptPairs and intersectTestPaths. intersectPairsArr:", intersectPairsArr, "thisLayerintersectPolysForTest:", thisLayerintersectPolysForTest);
                throw new Error("we should never get a different count of ptPairs and intersectTestPaths. intersectPairsArr:", intersectPairsArr, "thisLayerintersectPolysForTest:", thisLayerintersectPolysForTest);
                return;
            }

            // toss points that don't match the intersectPolyTest for this superObj
            var cleanIntersectPairsArr = [];
            for (var i = 0; i < intersectPairsArr.length; i++) {
                var ptPair = intersectPairsArr[i];
                var index = this.getWhichIntersectPolyThisPtPairIsInside(ptPair, superObj.intersectPolysForTest.m_Childs);
                if (index != null) cleanIntersectPairsArr.push(ptPair);
            }
            intersectPairsArr = cleanIntersectPairsArr;



            // we need to isolate the intersect paths and ptPairs that are relevant to this layer
            // as we isolate create a newSuperObj for each one
            var newSuperObjs = [];
            for (var i = 0; i < intersectPairsArr.length; i++) {
                var ptPair = intersectPairsArr[i];
                var index = this.getWhichIntersectPolyThisPtPairIsInside(ptPair, thisLayerintersectPolysForTest.m_Childs);
                //var index = this.getWhichIntersectPolyThisPtPairIsInside(ptPair, superObj.intersectPolysForTest.m_Childs);
                if (index == null) {
                    console.error("problem. our ptPair should absolutely fit inside one of the intersectTestPolys. ptPair:", ptPair, "thisLayerintersectPolysForTest.m_Childs:", thisLayerintersectPolysForTest.m_Childs);
                    return;
                }
                var intersectPolyForTest = thisLayerintersectPolysForTest.m_Childs[index];

                var newSuperObj = {
                    mainPath: superObj.mainPath,
                    comparePath: superObj.comparePath,
                    intersectPolysForTest: new ClipperLib.PolyTree(),
                    ptPair: ptPair,
                    origPtPair: superObj.origPtPair,
                    deflateBy: superObj.deflateBy + -0.01
                }
                newSuperObj.intersectPolysForTest.AddChild(intersectPolyForTest);


                newSuperObjs.push(newSuperObj);
                console.log("newSuperObj:", newSuperObj);

            }

            /*
            // make sure order of ptPair is correct, meaning we want it to follow
            // the winding order of our mainPath. the ptPair.pt1/pt2 could come back
            // in incorrect order because it's just blindly found along the path, but
            // order for us is a big deal and there were issues when the ptPair crossed
            // the start/end boundary of the mainPath
            for (var i = 0; i < newSuperObjs.length; i++) {
                var newSuperObj = newSuperObjs[i];
                var ptPair = newSuperObj.ptPair;
                var testPoly = superObj.intersectPolysForTest;
                this.fixOrderOfPtPair(ptPair, testPoly, dMainPath);
            }
            */


            // DEBUG: draw intersectTest
            /*
            for (var i = 0; i < newSuperObjs.length; i++) {
                var newSuperObj = newSuperObjs[i];
                console.log("newSuperObj:", newSuperObj);
                // DEBUG: draw the intersect polys for this layer
                this.drawClipperPolys(newSuperObj.intersectPolysForTest, 0x0000ff, 0.99, this.graopZ + 0.1);
            }
            */


            // DEBUG: draw a line between each ptPair
            /*
            var offset = 0.15;
            intersectPairsArr.forEach(function(ptPair) {
                this.drawClipperPaths([[ptPair.pt1, ptPair.pt2]], 0x00ffff, 0.9, this.graopZ + offset, 0, false);
                offset += 0.05;
            }, this);
            */

            // If we get here, there were intersects
            // Reduce deflateBy
            //superObj.deflateBy += -0.01;


            // Before recursing down, let's show debug info for what we just figured out
            // DEBUG: draw everything passed in
            /*
            for (var i = 0; i < newSuperObjs.length; i++) {
                var newSuperObj = newSuperObjs[i];
                this.graopZ += 0.25;
                this.drawClipperPaths([newSuperObj.mainPath], 0x00ff00, 0.49, this.graopZ );
                this.drawClipperPaths([newSuperObj.comparePath], 0xff0000, 0.89, this.graopZ + 0.05);
                // intersectTest
                this.drawClipperPolys(newSuperObj.intersectPolysForTest, 0x0000ff, 0.99, this.graopZ + 0.1);
                // ptPair
                var line = [newSuperObj.ptPair.pt1, newSuperObj.ptPair.pt2];
                console.log("drawing line:", line);
                this.drawClipperPaths([line], 0x00ffff, 0.99, this.graopZ + 0.15, 0, false);
            }
            */

            // exit at finding two intersects
            //if (newSuperObjs.length > 1) return;

            // Call myself recursively for each intersectPoly calculated in this
            // layer. Most of the time it'll be just one intersectPoly, but as
            // we deflate we often can get 2 or more
            //newSuperObjs.reverse();
            for (var i = 0; i < newSuperObjs.length; i++) {
                var newSuperObj = newSuperObjs[i];

                this.getRecursiveAveragedOverlapPath(newSuperObj);

            }

            // build our line from this layer
            // when merging multiple newSuperObjs, we have to make sure winding is correct
            // so make sure to sort the newSuperObjs by distance from the mainPathIndex
            if (newSuperObjs.length > 1) {
                console.warn("we have a gluing/winding situation on our hands. which newSuperObj is closer to the mainPathIndex???. newSuperObjs:", newSuperObjs);
                for (var i = 0; i < newSuperObjs.length; i++) {
                    var newSuperObj = newSuperObjs[i];
                    // calc distance
                    console.log("mainPathIndex:", newSuperObj.origPtPair.pt1.mainPathIndex);
                    newSuperObj.distToMainPathIndex = this.lineDistance2d( newSuperObj.ptPair.pt1, superObj.origPtPair.pt1 );
                }
                console.log("after resorting newSuperObjs:", newSuperObjs);

                newSuperObjs.sort(function(a, b) {
                    if (a.distToMainPathIndex > b.distToMainPathIndex) {
                        return 1;
                    }
                    if (a.distToMainPathIndex < b.distToMainPathIndex) {
                        return -1;
                    }
                    // a must be equal to b
                    return 0;
                });
                /*
                var nsoa = [];
                for (var i = 0; i < newSuperObjs.length; i++) {
                    var newSuperObj = newSuperObjs[i];
                    var dist = newSuperObj.distToMainPathIndex;
                    for (var i2 = 0; i2 < newSuperObjs.length; i2++) {
                        if (i == i2) continue; // skip myself
                        var newSuperObj2 = newSuperObjs[i2];
                        var dist2 = newSuperObj2.distToMainPathIndex;
                        if (dist > dist2)
                    }
                    */
            }

            var line = [];
            line.push(superObj.ptPair.pt1);
            for (var i = 0; i < newSuperObjs.length; i++) {
                //if ('line' in newSuperObj) {
                    var newSuperObj = newSuperObjs[i];
                    for (var i2 = 0; i2 < newSuperObj.line.length; i2++) {
                        line.push(newSuperObj.line[i2]);
                    }
                //}
            }
            line.push(superObj.ptPair.pt2);
            superObj.line = line;

            // DEBUG: draw the line we are returning
            this.graopZ += 0.5;
            var line = superObj.line;
            //this.drawClipperPaths([line], 0xff0000, 0.29, this.graopZ, 0.01, false);
            var orientation = ClipperLib.Clipper.Orientation(line);
            console.log("orientation:", orientation);

            console.log("returning superObj:", superObj);
            console.groupEnd();

            return;

        },
        getWhichIntersectPolyThisPtPairIsInside: function(ptPair, intersectPolys) {
            // Do a pointInPolygon search to see which of the intersectPolys both points
            // in the ptPair are inside of
            for (var i = 0; i < intersectPolys.length; i++) {
                var poly = intersectPolys[i].m_polygon;
                // intersectPathInflatedForTest
                var inpoly = ClipperLib.Clipper.PointInPolygon(ptPair.pt1, poly);
                var inpoly2 = ClipperLib.Clipper.PointInPolygon(ptPair.pt2, poly);
                //console.log("intersectPathInflatedForTest inpoly:", inpoly);
                if (inpoly != 0 && inpoly2 != 0) {
                    // points were in this poly
                    return i;
                }
            }
            return null;
        },
        getWhichIntersectPolyThisPtIsInside: function(pt, intersectPolys) {
            // Do a pointInPolygon search to see which of the intersectPolys both points
            // in the ptPair are inside of
            for (var i = 0; i < intersectPolys.length; i++) {
                var poly = intersectPolys[i].m_polygon;
                // intersectPathInflatedForTest
                var inpoly = ClipperLib.Clipper.PointInPolygon(pt, poly);
                //var inpoly2 = ClipperLib.Clipper.PointInPolygon(ptPair.pt2, poly);
                //console.log("intersectPathInflatedForTest inpoly:", inpoly);
                if (inpoly != 0) {
                    // point was in this poly
                    return i;
                }
            }
            return null;
        },
        isPointInPoly: function(pt, poly) {
            console.log("isPointInPoly. pt:", pt, "poly:", poly);
            var inpoly = ClipperLib.Clipper.PointInPolygon(pt, poly);
            if (inpoly != 0) {
                return true;
            }
            return false;
        },
        gaipZ: 0.01, // debug z for getAllIntersectPairs
        gaipColor: 1, //
        getAllIntersectPairs: function(mainPath, overlapPath, testPoly) {
            // Loops through all lines on mainPath and compares to
            // all lines on overlapPath
            // It creates ptPairs into an array [ptPair, ptPair]
            // We know we'll ALWAYS get 2 points for each intersection given
            // the nature of our polygons and our deflating

            var intersectionPoints = [];

            // loop through each line on mainPath and compare to each line on compare path
            // for an intersection
            var bothOnLineCtr = 0;
            var ptNumber = 1; // should be a 1 or 2
            var ptNumber1Poly = null;
            var didAllPriorPtsOnMainPathFallInPoly = null;
            var priorPtsOnPolyTest = [];
            var jail = null; // a holding variable if we get one item out of order
            //var testPoly2;

            var ptsPerPoly = [];

            // store equality pairs for deduping
            var equalityPairs = [];

            for (var i = 0; i < mainPath.length; i++) {
                var mPt1 = mainPath[i];
                var mPt2Index = (i + 1 < mainPath.length) ? i + 1 : 0;
                var mPt2 = mainPath[mPt2Index]; // loop to front
                var line = [mPt1, mPt2];

                // DEBUG: draw the line in mainPath we're checking
                /*
                var color;
                if (this.gaipColor == 1) color = 0x00ff00;
                else color = 0xff0000;
                this.gaipColor++; if (this.gaipColor == 3) this.gaipColor = 1;
                this.drawClipperPaths([line], color, 0.99, this.gaipZ, 0, false);
                */
                //this.gaipZ += 0.01;

                // once we have found an intersect pt, start testing if they
                // fell inside the testPoly
                /*
                if (ptNumber == 2) {
                    // we are in test mode
                    var lastPtItem = intersectionPoints[intersectionPoints.length-1];
                    //var isInPoly = this.isPointInPoly(mPt1, testPoly2);
                    var whichPoly = this.getWhichIntersectPolyThisPtIsInside(mPt1, testPoly);
                    var result = {mpIndex:i, polyIndex:whichPoly};
                    //console.log("in ptNumber2 test mode. result:", result);
                    if (whichPoly != lastPtItem.whichIntersectPoly) {
                        lastPtItem.didAllSubsequentPtsOnMainPathFallInPoly = false;
                    } else if (lastPtItem.didAllSubsequentPtsOnMainPathFallInPoly == null) {
                        lastPtItem.didAllSubsequentPtsOnMainPathFallInPoly = true;
                    }
                    lastPtItem.subsequentPtsOnPolyTest.push(result);

                }
                */

                // loop thru compare path lines
                for (var i2 = 0; i2 < overlapPath.length; i2++) {
                    var cPt1 = overlapPath[i2];
                    var cPt2Index = (i2 + 1 < overlapPath.length) ? i2 + 1 : 0;
                    var cPt2 = overlapPath[cPt2Index]; // loop to front
                    var line2 = [cPt1, cPt2];

                    // see if line1 and line2 intersect
                    var lineIntRes = this.checkLineIntersection(line, line2);
                    if (lineIntRes.onLine1 || lineIntRes.onLine2) {
                        //console.log("lineIntRes:", lineIntRes);
                    }

                    if (lineIntRes.equality) {
                        console.log("got an equality from this intersect test. lineIntRes:", lineIntRes);
                    }

                    if ((lineIntRes.onLine1 && lineIntRes.onLine2) || lineIntRes.equality) {
                        //console.log("lineIntRes:", lineIntRes);
                        // this is an intersecting point on the overlapping paths

                        //this.drawParticle(lineIntRes.x, lineIntRes.y, this.gaopZ - 0.195, 0xff0000, 0.2, 0.35);
                        //this.drawParticle(lineIntRes.x, lineIntRes.y, 0.01, 0xff0000, 0.2, 0.35);
                        //this.gaopZ += 0.5;
                        bothOnLineCtr++;

                        // now that we have an intersection, let's perhaps store this
                        var pt = {X:lineIntRes.x, Y:lineIntRes.y};
                        var whichPoly = this.getWhichIntersectPolyThisPtIsInside(pt, testPoly);

                        var ptItem = {
                            X: lineIntRes.x,
                            Y: lineIntRes.y,
                            mainPathIndex: i,
                            whichIntersectPoly: whichPoly,
                            ptNumber: ptNumber,
                            didAllSubsequentPtsOnMainPathFallInPoly: null,
                            subsequentPtsOnPolyTest: [] //priorPtsOnPolyTest
                        };

                        if (lineIntRes.equality) {
                            // this intersect was determined by an equality
                            var id = "X:" + lineIntRes.x + "Y:" + lineIntRes.y;
                            if (id in equalityPairs) {
                                // key already in there, no need to do again
                                console.log("this equality pair already in array");
                                continue;
                            } else {
                                equalityPairs[id] = ptItem;
                            }
                        }

                        if (whichPoly == null) {
                            console.log("found an intersect pt (will delete):", ptItem);
                            console.log("got a point not in our test poly, so skip it. probably in a situation where there are multiple overlaps on mainPath from comparePath.");
                            continue;
                        }

                        // categorize this point by the poly it is inside of because
                        // we are after 2 intersect pts per intersectTestPoly
                        if (!(ptItem.whichIntersectPoly in ptsPerPoly))
                            ptsPerPoly[ptItem.whichIntersectPoly] = [];
                        var ptPerPoly = ptsPerPoly[ptItem.whichIntersectPoly];
                        //if (!Array.isArray(ptPerPoly)) ptPerPoly = [];
                        ptPerPoly.push(ptItem);

                        /*
                        // ISSUE: Have not found a situation yet where a pair of intersection points
                        // cross a start/end boundary but there's multiple paths found and
                        // we end up with a weird order. if that's the case we could get a ptPair
                        // that is offset really weird, so test for that
                        if (ptNumber == 2) {
                            var lastPtItem = intersectionPoints[intersectionPoints.length-1];
                            if (lastPtItem.whichIntersectPoly != ptItem.whichIntersectPoly) {
                                console.warn("we finally found our situation where a ptPair crosses a start/end boundary but there are multiple intersect paths and we did not get a nice mathced set of intersection points one afte the other. please fix me!!! ptItem1:", lastPtItem, "ptItem2:", ptItem);

                                // let's just put this point at end of whole sequence
                                // so hold in jail until then
                                jail = lastPtItem;
                                // remove it off the array
                                intersectionPoints.pop();
                                //skipPush = true;
                                // make the current next pt be as if it was a ptNumber 1
                                ptNumber = 1;
                                ptItem.ptNumber = 1;
                            }
                        }

                        // start test mode if the current point is point 1, cuz point 2 is end
                        // of ptPair sequence (possibly)
                        if (ptNumber == 1) {

                            //didAllSubsequentPtsOnMainPathFallInPoly = null;
                            //ptNumber1Poly = ptItem.whichIntersectPoly;
                            //priorPtsOnPolyTest = [];
                            ptItem.subsequentPtsOnPolyTest = []; //priorPtsOnPolyTest;
                            //testPoly2 = testPoly[ptItem.whichIntersectPoly];
                        }
                        */
                        //ptNumber++;
                        //if (ptNumber == 3) ptNumber = 1;
                        console.log("found an intersect pt:", ptItem);
                        //intersectionPoints.push(ptItem);

                    }
                }

            }
            //console.log("bothOnLineCtr:", bothOnLineCtr);
            console.log("ptsPerPoly at end of looping and before sorting:", ptsPerPoly);

            // now push the ptsPerPoly into the intersectionPts array
            for (var i = 0; i < ptsPerPoly.length; i++) {
                var poly = ptsPerPoly[i];
                for (var i2 = 0; i2 < poly.length; i2++) {
                    var pt = poly[i2];

                    intersectionPoints.push(pt);
                }
            }

            // now we need to test if the pt on mainPath after pt

            // WARNING. NOT SO SURE THIS LOGIC WILL WORK
            // sort intersection points by whichIntersectPoly
            /*if (jail != null) {
                console.log("we had an item in jail. now pushing it to end of array");
                intersectionPoints.push(jail);
            }*/
            if (equalityPairs.length > 0) {
                equalityPairs.forEach(function(pt) {
                    intersectionPoints.push(pt);
                }, this);
            }

            console.log("before assembling ptPairs, here's our array:", intersectionPoints);


            // collapse intersectionPoints to ptPair array
            var ptPairArr = [];
            for (var i = 0; i < intersectionPoints.length - 1; i += 2) {

                var ptPair = {
                    pt1: intersectionPoints[i],
                    pt2: intersectionPoints[i+1]
                };

                // WARNING: do double check for future potential problems. make sure
                // that whichIntersectPoly is equal on both points
                if (ptPair.pt1.whichIntersectPoly != ptPair.pt2.whichIntersectPoly) {
                    console.error("WARNING. PROBLEM. ptPair.pt1 does not have same intersectPoly as ptPair.pt2:", ptPair);
                }

                // do some correction on making sure we return these points based on distance
                // to the lowest mainPathIndex to make sure these intersects return in the
                // correct winding order
                // this seems to only happen when we're on the same line for both intersects
                // so only compare if mainPathIndex was the same
                if (ptPair.pt1.mainPathIndex == ptPair.pt2.mainPathIndex) {
                    // we need to correct
                    //console.log("doing test to see if pt1 is in correct winding order to pt2");
                    var distPt1ToOrigPt1 = this.lineDistance2d( ptPair.pt1, mainPath[ptPair.pt1.mainPathIndex] );
                    ptPair.pt1.distToOrigPt1 = distPt1ToOrigPt1;
                    var distPt2ToOrigPt1 = this.lineDistance2d( ptPair.pt2, mainPath[ptPair.pt1.mainPathIndex] );
                    ptPair.pt2.distToOrigPt1 = distPt2ToOrigPt1;
                    //console.log("distPt1ToOrigPt1:", distPt1ToOrigPt1, "distPt2ToOrigPt1:", distPt2ToOrigPt1);
                    if (distPt1ToOrigPt1 > distPt2ToOrigPt1) {
                        console.log("swapping ptPairs cuz distance of pt1 to origPt1 was greater than to pt2. distPt1ToOrigPt1:", distPt1ToOrigPt1, "distPt2ToOrigPt1:", distPt2ToOrigPt1);
                        var tmpPt = ptPair.pt1;
                        ptPair.pt1 = ptPair.pt2;
                        ptPair.pt2 = tmpPt;
                    }
                } else {

                    // now we need to do a test for didAllSubsequentPtsOnMainPathFallInPoly
                    // however, we have to generate this data
                    var startIndex = ptPair.pt1.mainPathIndex + 1;
                    var endIndex = ptPair.pt2.mainPathIndex;
                    console.log("about to test for didAllSubsequentPtsOnMainPathFallInPoly. startIndex:", startIndex, "endIndex:", endIndex);
                    if (startIndex > endIndex) {
                        console.error("startIndex should not be greater than endIndex. startIndex:", startIndex, "endIndex:", endIndex, "ptPair:", ptPair);
                    }

                    var lastPtItem = ptPair.pt1; //intersectionPoints[intersectionPoints.length-1];
                    //var isInPoly = this.isPointInPoly(mPt1, testPoly2);
                    for (var iPtCtr = startIndex; iPtCtr < endIndex; iPtCtr++) {
                        var mPt1 = mainPath[iPtCtr];
                        var whichPoly = this.getWhichIntersectPolyThisPtIsInside(mPt1, testPoly);
                        var result = {mpIndex:iPtCtr, polyIndex:whichPoly};
                        console.log("in ptNumber2 test mode. result:", result);
                        if (whichPoly != lastPtItem.whichIntersectPoly) {
                            lastPtItem.didAllSubsequentPtsOnMainPathFallInPoly = false;
                            break;
                        } else if (lastPtItem.didAllSubsequentPtsOnMainPathFallInPoly == null) {
                            lastPtItem.didAllSubsequentPtsOnMainPathFallInPoly = true;
                            break;
                        }
                        lastPtItem.subsequentPtsOnPolyTest.push(result);
                    }

                    if (!ptPair.pt1.didAllSubsequentPtsOnMainPathFallInPoly) {

                        // do an additional check if we crossed the boundary of the end/start of
                        // the path array. we can look to see if the calculation of
                        // "didAllSubsequentPtsOnMainPathFallInPoly" and if it is false, then we know
                        // to swap
                        //console.log("yup, see if need to swap ptPair.pt1:", ptPair.pt1, "ptPair.pt2:", ptPair.pt2);

                        // swap positions
                        var tmpPt = ptPair.pt1;
                        ptPair.pt1 = ptPair.pt2;
                        ptPair.pt2 = tmpPt;
                        console.log("yup, swapped ptPair.pt1:", ptPair.pt1, "ptPair.pt2:", ptPair.pt2);
                    }
                }

                ptPairArr.push(ptPair);

            }

            // let's sort these ptPairs to the lowest mainPathIndex
            ptPairArr.sort(function(a, b) {
                if (a.pt1.mainPathIndex > b.pt1.mainPathIndex) {
                    return 1;
                }
                if (a.pt1.mainPathIndex < b.pt1.mainPathIndex) {
                    return -1;
                }
                // a must be equal to b
                return 0;
            });

            // let's also sort stuff on same mainPathIndexes by dist
            ptPairArr.sort(function(a, b) {
                if (a.pt1.mainPathIndex == b.pt1.mainPathIndex && a.pt1.distToOrigPt1 > b.pt1.distToOrigPt1) {
                    return 1;
                }
                if (a.pt1.mainPathIndex == b.pt1.mainPathIndex && a.pt1.distToOrigPt1 < b.pt1.distToOrigPt1) {
                    return -1;
                }
                // a must be equal to b
                return 0;
            });

            // let's sort the ptPair too
            // make sure ptPair's are in correct order too
            /*
            var newPtPairArr = [];
            var lastMpIndex = -1;
            for (var i = 0; i < ptPairArr.length - 1; i += 2) {
                var ptPair = ptPairArr[i];
                if (ptPair.pt1.mainPathIndex == lastMpIndex) {
                    console.error("we have the same main path index. must order");
                }
                var lastMpIndex = ptPair.pt1.mainPathIndex;
            }
            */

            //console.log("awesome ptPairArr:", ptPairArr);
            return ptPairArr;

        },
        gaopZ: 5.0,
        getAveragedOverlapPath: function(mainPath, overlapPath, intersectPolys) {
            var retPath = [];

            // WARNING: the overlapPath could create multiple overlaps on the mainPath
            // that's why we get the intersectPolys passed in
            // we have to account for which intersections we figure out below belong to
            // which intersectPoly. we keep track of that in intersectPaths with the actual
            // intersectPath that we can then see if the intersect point lies inside that polygon
            // if it does we know how to match it up
            console.log("getAveragedOverlapPath."); // mainPath:", mainPath, "overlapPath:", overlapPath);

            // DEBUG: draw mainPath and overlapPath (full long ass paths)
            this.drawClipperPaths([mainPath], 0x00ff00, 0.99, this.gaopZ);
            //this.gaopZ += 0.5;
            this.drawClipperPaths([overlapPath], 0xff0000, 0.99, this.gaopZ);
            //this.gaopZ += 0.5;

            console.log("intersectPolys:", intersectPolys);
            var intersectPaths = [];
            var polynode = intersectPolys.GetFirst();
            while (polynode) {
                //do stuff with polynode here
                console.log("polynode:", polynode);

                // DEBUG: draw intersectPath
                this.drawClipperPaths([polynode.m_polygon], 0xff0000, 0.2, this.gaopZ + 0.1);
                //this.gaopZ += 0.5;
                var ip = {
                    intersectPath:polynode.m_polygon,
                    intersectPathInflatedForTest: null,
                    firstIntersectionPt1: null,
                    firstIntersectionPt2: null,
                    overlapPath: overlapPath
                };
                ip.intersectPathInflatedForTest = this.getInflatePath([ClipperLib.JS.Clone(polynode.m_polygon)], 0.05)[0],
                intersectPaths.push(ip);

                polynode = polynode.GetNext();
            }

            var firstIntersectionPoints = [];
            var intersectSectionPairs = []; // is an uber array of the pair of matching points inside an individual intersect region, i.e. the start/end points on the mainPath and the comparePath

            // loop through each line on mainPath and compare to each line on compare path
            // for an intersection
            var onLine1Ctr = 0;
            var onLine2Ctr = 0;
            var bothOnLineCtr = 0;
            var startPushingPtIndexesMainPath = false;
            var startPushingPtIndexesComparePath = false;
            var indexesMainPath = [];
            var indexesComparePath = [];
            for (var i = 0; i < mainPath.length; i++) {
                var mPt1 = mainPath[i];
                var mPt2Index = (i + 1 < mainPath.length) ? i + 1 : 0;
                var mPt2 = mainPath[mPt2Index]; // loop to front
                var line = [mPt1, mPt2];

                // should we push this index, i.e. are we in pushing mode
                if (startPushingPtIndexesMainPath) {
                    indexesMainPath.push([i,mPt2Index]);
                    //startPushingPtIndexesMainPath = false;
                }

                // loop thru compare path lines
                for (var i2 = 0; i2 < overlapPath.length; i2++) {
                    var cPt1 = overlapPath[i2];
                    var cPt2Index = (i2 + 1 < overlapPath.length) ? i2 + 1 : 0;
                    var cPt2 = overlapPath[cPt2Index]; // loop to front
                    var line2 = [cPt1, cPt2];
                    // see if line1 and line2 intersect
                    var lineIntRes = this.checkLineIntersection(line, line2);
                    //console.log("lineIntRes:", lineIntRes);
                    if (lineIntRes.onLine1) onLine1Ctr++;
                    if (lineIntRes.onLine2) onLine2Ctr++;

                    if (startPushingPtIndexesComparePath) {
                        indexesComparePath.push([i2,cPt2Index]);
                    }

                    if (lineIntRes.onLine1 && lineIntRes.onLine2) {
                        console.log("lineIntRes:", lineIntRes);
                        // this is an intersecting point on the overlapping paths
                        // so we need to add this as the start/end of our averaged path
                        // AWESOME THAT WE GOT HERE FINALLY (Only took weeks of on and off work)
                        //this.drawParticle(lineIntRes.x, lineIntRes.y, this.gaopZ - 0.45, 0xff0000, 0.2, 0.35);
                        //this.gaopZ += 0.5;
                        bothOnLineCtr++;

                        // now that we have an intersection, let's perhaps store this
                        firstIntersectionPoints.push({
                            lineIntRes:lineIntRes,
                            x: lineIntRes.x,
                            y: lineIntRes.y,
                            mainLine: line,
                            compareLine: line2,
                            mainPtIndex1: i,
                            mainPtIndex2: mPt2Index,
                            comparePtIndex1: i2,
                            comparePtIndex2: cPt2Index
                        });

                        // let's start pushing indexes until we hit our 2nd intersection
                        if (startPushingPtIndexesComparePath == false) {
                            startPushingPtIndexesMainPath = true;
                            startPushingPtIndexesComparePath = true;
                            // push first pair when we find our first intersection
                            // all subsequent pairs will get pushed at top of for loop
                            // until we decide to stop
                            indexesMainPath.push([i,mPt2Index]);
                            indexesComparePath.push([i2,cPt2Index]);
                        } else {
                            startPushingPtIndexesMainPath = false;
                            startPushingPtIndexesComparePath = false;

                            // add to the intersectSectionPairs array
                            intersectSectionPairs.push({
                                intersectPt1: firstIntersectionPoints[firstIntersectionPoints.length - 2],
                                intersectPt2: firstIntersectionPoints[firstIntersectionPoints.length - 1],
                                indexArrMainPath: indexesMainPath,
                                indexArrComparePath: indexesComparePath
                            });

                            // reset index arrays for next time thru loop
                            indexesMainPath = [];
                            indexesComparePath = [];
                        }

                    }
                }
            }
            console.log("bothOnLineCtr:", bothOnLineCtr, "onLine1Ctr:", onLine1Ctr, "onLine2Ctr:", onLine2Ctr);

            console.log("awesome intersectSectionPairs:", intersectSectionPairs);

            // We now know where our intersections are at
            // This is a big deal because we know start and end array indexes in the main path
            // and compare path, which means we can now make our deflate offset line intersections
            // be even more efficient because we don't have to compare all lines, but rather just
            // the lines from the start to end indexes of both main and compare paths!
            var opacity = 0.1;
            firstIntersectionPoints.forEach(function(pt) {
                console.log("firstIntersectionPoints pt:", pt);
                //this.drawParticle(pt.lineIntRes.x, pt.lineIntRes.y, this.gaopZ - 0.55, 0xff0000, opacity, 0.45);
                //opacity += 0.3;

                // see what intersectPath this point fits inside of
                // so that we know how/where to categorize for finished product
                intersectPaths.forEach(function(ip) {
                    var inpoly = ClipperLib.Clipper.PointInPolygon({X:pt.x, Y:pt.y}, ip.intersectPath);
                    console.log("inpoly:", inpoly);
                    if (inpoly != 0) {
                        // point was in this poly
                        if (ip.firstIntersectionPt1 == null) ip.firstIntersectionPt1 = pt;
                        else if (ip.firstIntersectionPt2 == null) ip.firstIntersectionPt2 = pt;
                        else console.error("should not get here in firstIntersectionPoints test of where this point lies. pt:", pt, "ip:", ip);
                    }
                    // intersectPathInflatedForTest
                    var inpoly = ClipperLib.Clipper.PointInPolygon({X:pt.x, Y:pt.y}, ip.intersectPathInflatedForTest);
                    console.log("intersectPathInflatedForTest inpoly:", inpoly);
                    if (inpoly != 0) {
                        // point was in this poly
                        if (ip.firstIntersectionViaInflateTestPt1 == null)
                            ip.firstIntersectionViaInflateTestPt1 = pt;
                        else if (ip.firstIntersectionViaInflateTestPt2 == null)
                            ip.firstIntersectionViaInflateTestPt2 = pt;
                        else console.error("should not get here in firstIntersectionPoints test of where this point lies. pt:", pt, "ip:", ip);
                    }
                },this);

            }, this);

            // when we get here, we have a beautifully created intersectPaths array where
            // we have all our overlap intersectPaths with the start/end point of each and
            // enough data to do the mainPath and overlapPath deflate, with subsequent intersect
            // finding to reduce the path until no intersects occur so we can build our average line
            console.log("beautiful intersectPaths:", intersectPaths);

            // DEBUG: draw debug of intersectPaths
            if (false) {
            intersectPaths.forEach(function(ip) {
                // draw pt 1 and 2 of intersect
                var pt1 = ip.firstIntersectionViaInflateTestPt1;
                var pt2 = ip.firstIntersectionViaInflateTestPt2;
                this.drawParticle(pt1.x, pt1.y, this.gaopZ - 0.45, 0x0000ff, 0.2, 0.35);
                this.drawParticle(pt2.x, pt2.y, this.gaopZ - 0.45, 0x0000ff, 0.8, 0.35);

                // For Point 1
                // draw mainPath start/end
                var pt1mp1 = mainPath[pt1.mainPtIndex1];
                var pt1mp2 = mainPath[pt1.mainPtIndex2];
                //console.log("mainPath pt1:", pt1, "pt2:", pt2);
                this.drawParticle(pt1mp1.X, pt1mp1.Y, this.gaopZ - 1.45, 0x00ff00, 0.2, 0.35);
                this.drawParticle(pt1mp2.X, pt1mp2.Y, this.gaopZ - 1.45, 0x00ff00, 0.8, 0.35);

                // draw comparePath start/end
                var pt1cp1 = overlapPath[pt1.comparePtIndex1];
                var pt1cp2 = overlapPath[pt1.comparePtIndex2];
                //console.log("overlapPath pt1:", pt1, "pt2:", pt2);
                this.drawParticle(pt1cp1.X, pt1cp1.Y, this.gaopZ - 0.95, 0xff0000, 0.2, 0.35);
                this.drawParticle(pt1cp2.X, pt1cp2.Y, this.gaopZ - 0.95, 0xff0000, 0.8, 0.35);

                // For Point 2
                // draw mainPath start/end
                var pt2mp1 = mainPath[pt2.mainPtIndex1];
                var pt2mp2 = mainPath[pt2.mainPtIndex2];
                //console.log("mainPath pt2:", pt1, "pt2:", pt2);
                this.drawParticle(pt2mp1.X, pt2mp1.Y, this.gaopZ - 1.25, 0x00ff00, 0.2, 0.35);
                this.drawParticle(pt2mp2.X, pt2mp2.Y, this.gaopZ - 1.25, 0x00ff00, 0.8, 0.35);

                // draw comparePath start/end
                var pt2cp1 = overlapPath[pt2.comparePtIndex1];
                var pt2cp2 = overlapPath[pt2.comparePtIndex2];
                console.log("overlapPath pt1:", pt1, "pt2:", pt2);
                this.drawParticle(pt2cp1.X, pt2cp1.Y, this.gaopZ - 0.75, 0xff0000, 0.2, 0.35);
                this.drawParticle(pt2cp2.X, pt2cp2.Y, this.gaopZ - 0.75, 0xff0000, 0.8, 0.35);

            }, this);
            }

            // now normalize the data for both points for each intersectPath
            // this will essentially give us the range to work with
            intersectPaths.forEach(function(ip) {
                var pt1 = ip.firstIntersectionViaInflateTestPt1;
                var pt2 = ip.firstIntersectionViaInflateTestPt2;
                //ip.mainPtIndexMin = Math.min(pt1.mainPtIndex1, pt1.mainPtIndex2, pt2.mainPtIndex1, pt2.mainPtIndex2);
                //ip.mainPtIndexMax = pt2.mainPtIndex2;
                //ip.comparePtIndexMin = pt1.compare;


                /* Recursive call to now build a line based on an uber object
                The idea in the recursive call is to pass in the mainPath and the isolated
                version of the intersect path, i.e. the version based on the "intersection"
                so that it is a small object for efficiency (but used the inflated by 0.0001
                one so we are safe that it encompasses the
                Also pass a line in, which is based on the pt1/pt2 figured out from where
                the path intersects occurred. this line will get new points added to it between
                the start/end points as we recursively work our way in.
                So, for example, we send in a line with 10,10 and 20,20 as start/end.
                The recursive call does:
                1) It deflates both the mainPath and isolatedComparePath by 0.01
                2) It looks for the start/end intersect points on mainPath, i.e. it finds 10.1,10.1
                   and 19.9, 19.9
                   a) If it finds that there are 4 or 6 or 8 intersect points, it knows that multiple
                      paths were created during the deflate. If so, it recursively calls this
                      same process to figure

                3) It inserts those inside the line, i.e. [[10,10] [10.1,10.1], [19.9,19.9], [20,20]]
                4) If there was no intersect, i.e. the defalte caused no overlap, then it returns
                   the line up the recursive chain
                */
                var uber = {
                    mainPath: mainPath,
                    overlapPath: overlapPath,
                    isolatedComparePath: ip.intersectPathInflatedForTest,
                    line: [{x:pt1.x, y:pt1.y, start: true, pt1: pt1 },
                           {x:pt2.x, y:pt2.y, end: true, pt2: pt2}],
                    steps: 0
                }

                var finalUberLine = this.recursivelyInsertLinePts(uber);
                ip.finalUberLine = finalUberLine;
                console.log("finalUberLine:", finalUberLine);
                console.log("the uber at end of recursion:", uber);

                // DEBUG: draw uber line
                var finalClipperLine = [];
                ip.finalUberLine.forEach(function(pt) {
                    finalClipperLine.push({X: pt.x, Y: pt.y});
                }, this);
                this.drawClipperPaths([finalClipperLine], 0xff00ff, 0.99, this.gaopZ, 0.0, false);

            }, this);

            // DEBUG: for next time in, shift debug z up
            this.gaopZ += 0.5;

            console.log("final intersectPaths:", intersectPaths);

            //overlapPath.forEach(function(pt) {
            //    var pt = {X: pt.X, Y: pt.Y};
            //    retPath.push(pt);
            //});
            return mainPath;


        },
        recurseZ: 8.0,
        recursivelyInsertLinePts: function(uber) {

            console.log("recursivelyInsertLinePts. uber:", uber);
            /*
            The recursive call does:
                1) It deflates both the mainPath and isolatedComparePath by 0.01
                2) It looks for the start/end intersect points on mainPath, i.e. it finds 10.1,10.1
                   and 19.9, 19.9
                   a) If it finds that there are 4 or 6 or 8 intersect points, it knows that multiple
                      paths were created during the deflate. If so, it recursively calls this
                      same process to figure

                3) It inserts those inside the line, i.e. [[10,10] [10.1,10.1], [19.9,19.9], [20,20]]
                4) If there was no intersect, i.e. the defalte caused no overlap, then it returns
                   the line up the recursive chain
            */

            // increment steps
            uber.steps++;

            // now deflate the mainPath and overlapPath by increments until no intersection
            var deflateByPrecision = -0.005; // the more precision, the more points generated
            var mainPaths = this.getInflatePath([uber.mainPath], deflateByPrecision);
            // overlapPath
            //var isolatedComparePaths = this.getInflatePath([uber.isolatedComparePath], deflateByPrecision);
            var overlapPaths = this.getInflatePath([uber.overlapPath], deflateByPrecision);
            // WARNING: uber.isolatedComparePaths could result in multiple paths
            // if so recursively call this method
            // It is likely impossible that the mainPath would produce more than one path
            // given the nature of the original inflate, thus the averaging
            if (mainPaths.length > 1) {
                console.error("deflating uber.mainPath should NOT have produced more than 1 path");
                return uber;
            }
            // since we should only have one mainPath, reset our uber to be our deflated mainPath
            uber.mainPath = mainPaths[0];

            // DEBUG: draw mainPath deflated
            //this.drawClipperPaths([uber.mainPath], 0x0000ff, 0.99, this.recurseZ);
            //this.recurseZ += 0.5;

            //isolatedComparePaths.forEach(function(isolatedComparePath) {
            //for (var i = 0; i < isolatedComparePaths.length; i++) {
            for (var i = 0; i < overlapPaths.length; i++) {
                // we likely only have 1 path in here 99% of the time, but just in case

                //uber.isolatedComparePath = isolatedComparePaths[i];
                uber.overlapPath = overlapPaths[i];

                // DEBUG: draw isolatedComparePath deflated
                this.drawClipperPaths([uber.overlapPath], 0x00ffff, 0.99, this.recurseZ);
                //this.drawClipperPaths([uber.isolatedComparePath], 0x00ffff, 0.99, this.recurseZ);
                this.recurseZ += 0.5;

                // find the intersection points
                //var ptPair = this.findStartEndPointsOnMainPathLineIntersectFromOverlapPath(uber.mainPath, uber.isolatedComparePath);
                var ptPair = this.findStartEndPointsOnMainPathLineIntersectFromOverlapPath(uber.mainPath, uber.overlapPath);

                if (ptPair.length == 0) {
                    // we hit the dead end of deflating. whatever our line is, is what it's
                    // going to be.
                    console.log("hit end of recursive call. returning. uber.line:", uber.line, "uber:", uber);
                    continue;
                }

                // continue on with recursion if we get here
                var pt1 = ptPair[0];
                var pt2 = ptPair[1];

                // insert ptPair into middle of line array
                var len = uber.line.length;
                var halflen = len / 2;
                var newline = [];
                newline = newline.concat(uber.line.slice(0,halflen));
                newline.push(pt1);
                newline.push(pt2);
                newline = newline.concat(uber.line.slice(halflen));
                uber.line = newline;

                // we now have our new deflated intersect points in the line
                // call ourselves recursively again until we get a return
                uber.line = this.recursivelyInsertLinePts(uber);

            }

            // when we get here our uber.line is good to go
            //console.log("returning uber.line:", uber.line);
            return uber.line;
        },
        findStartEndPointsOnMainPathLineIntersectFromOverlapPath: function(mainPath, overlapPath) {

            var intersectionPoints = [];

            // loop through each line on mainPath and compare to each line on compare path
            // for an intersection
            var onLine1Ctr = 0;
            var onLine2Ctr = 0;
            var bothOnLineCtr = 0;
            for (var i = 0; i < mainPath.length; i++) {
                var mPt1 = mainPath[i];
                var mPt2Index = (i + 1 < mainPath.length) ? i + 1 : 0;
                var mPt2 = mainPath[mPt2Index]; // loop to front
                var line = [mPt1, mPt2];
                // loop thru compare path lines
                for (var i2 = 0; i2 < overlapPath.length; i2++) {
                    var cPt1 = overlapPath[i2];
                    var cPt2Index = (i2 + 1 < overlapPath.length) ? i2 + 1 : 0;
                    var cPt2 = overlapPath[cPt2Index]; // loop to front
                    var line2 = [cPt1, cPt2];
                    // see if line1 and line2 intersect
                    var lineIntRes = this.checkLineIntersection(line, line2);
                    //console.log("lineIntRes:", lineIntRes);
                    if (lineIntRes.onLine1) onLine1Ctr++;
                    if (lineIntRes.onLine2) onLine2Ctr++;
                    if (lineIntRes.onLine1 && lineIntRes.onLine2) {
                        console.log("lineIntRes:", lineIntRes);
                        // this is an intersecting point on the overlapping paths
                        // so we need to add this as the start/end of our averaged path
                        // AWESOME THAT WE GOT HERE FINALLY (Only took weeks of on and off work)
                        //this.drawParticle(lineIntRes.x, lineIntRes.y, this.gaopZ - 0.45, 0xff0000, 0.2, 0.35);
                        //this.gaopZ += 0.5;
                        bothOnLineCtr++;

                        // now that we have an intersection, let's perhaps store this
                        intersectionPoints.push({
                            lineIntRes:lineIntRes,
                            x: lineIntRes.x,
                            y: lineIntRes.y,
                            mainLine: line,
                            compareLine: line2,
                            mainPtIndex1: i,
                            mainPtIndex2: mPt2Index,
                            comparePtIndex1: i2,
                            comparePtIndex2: cPt2Index
                        });
                    }
                }
            }
            console.log("bothOnLineCtr:", bothOnLineCtr, "onLine1Ctr:", onLine1Ctr, "onLine2Ctr:", onLine2Ctr);

            return intersectionPoints;

        },
        checkLineIntersection: function(line1, line2) {
            var line1StartX, line1StartY, line1EndX, line1EndY, line2StartX, line2StartY, line2EndX, line2EndY;
            line1StartX = line1[0].X;
            line1StartY = line1[0].Y;
            line1EndX = line1[1].X;
            line1EndY = line1[1].Y;
            line2StartX = line2[0].X;
            line2StartY = line2[0].Y;
            line2EndX = line2[1].X;
            line2EndY = line2[1].Y;



            // if the lines intersect, the result contains the x and y of the intersection (treating the lines as infinite) and booleans for whether line segment 1 or line segment 2 contain the point
            var denominator, a, b, numerator1, numerator2, result = {
                x: null,
                y: null,
                onLine1: false,
                onLine2: false,
                line1: line1,
                line2: line2
            };

            // check if any points are equal and consider that an intersect
            if (line1StartX == line2StartX && line1StartY == line2StartY) {
                result.line1StartAndLine2StartEqual = true;
                result.equality = true;
            }
            if (line1StartX == line2EndX && line1StartY == line2EndY) {
                result.line1StartAndLine2EndEqual = true;
                result.equality = true;
            }
            if (line1EndX == line2StartX && line1EndY == line2StartY) {
                result.line1EndAndLine2StartEqual = true;
                result.equality = true;
            }
            if (line1EndX == line2EndX && line1EndY == line2EndY) {
                result.line1EndAndLine2EndEqual = true;
                result.equality = true;
            }

            denominator = ((line2EndY - line2StartY) * (line1EndX - line1StartX)) - ((line2EndX - line2StartX) * (line1EndY - line1StartY));
            if (denominator == 0) {
                return result;
            }
            a = line1StartY - line2StartY;
            b = line1StartX - line2StartX;
            numerator1 = ((line2EndX - line2StartX) * a) - ((line2EndY - line2StartY) * b);
            numerator2 = ((line1EndX - line1StartX) * a) - ((line1EndY - line1StartY) * b);
            a = numerator1 / denominator;
            b = numerator2 / denominator;

            // if we cast these lines infinitely in both directions, they intersect here:
            result.x = line1StartX + (a * (line1EndX - line1StartX));
            result.y = line1StartY + (a * (line1EndY - line1StartY));
            /*
            // it is worth noting that this should be the same as:
            x = line2StartX + (b * (line2EndX - line2StartX));
            y = line2StartX + (b * (line2EndY - line2StartY));
            */
            // if line1 is a segment and line2 is infinite, they intersect if:
            if (a > 0 && a < 1) {
                result.onLine1 = true;
            }
            // if line2 is a segment and line1 is infinite, they intersect if:
            if (b > 0 && b < 1) {
                result.onLine2 = true;
            }
            // if line1 and line2 are segments, they intersect if both of the above are true
            return result;
        },
        getIntersectionOfRayToLineGroup: function(origin, dir, threeObj) {
            console.log("getIntersection. origin:", origin);

            if (this.debugCtr == 2) {
                this.drawParticle(origin.x, origin.y, this.debugz, 0x0000ff, 0.1, 0.2);
                this.drawNormal({X:dir.x, Y:dir.y}, {X:origin.x,Y:origin.y}, 10.1, 0xff0000, 0.2, this.debugz);
            }

            var rc = new THREE.Raycaster( origin, dir);
            rc.linePrecision = 0.0001;
            //rc.linePrecision = 2;

            // loop thru all lines, but don't compare to ones where
            // our point is in the line
            var rcrs = [];
            //console.log("about to loop thru threeObj.children:", threeObj.children);
            var debugLineOffset = 0;
            for (var i = 0; i < threeObj.children.length; i++) {
                var line = threeObj.children[i];
                //console.log("line:", line, "line.geometry.vertices:", line.geometry.vertices, "origin:", origin);
                var isRemoveFromCompare = false;
                line.geometry.vertices.forEach(function(pt) {
                    //console.log("comparing pt:", pt, "to origin:", origin);
                    if (pt.x == origin.x && pt.y == origin.y) {
                        //console.log("found match, so will skip comparing this line for intersectObject");
                        isRemoveFromCompare = true;
                    }
                });
                if (isRemoveFromCompare) continue;

                if (this.debugCtr == 2) {
                    var line2 = line.clone();
                    line2.position.setZ(this.debugz + debugLineOffset);
                    this.sceneAdd(line2);
                    debugLineOffset += 0.01;
                }

                var rcr = rc.intersectObject(line, false);
                if (rcr.length > 0) {
                    rcr.forEach(function(rc) {
                        rcrs.push(rc);

                        // double check if these really intersect
                        if (this.debugCtr == 2) {
                        var lineObj = rc.object.clone();
                        var rc2 = new THREE.Raycaster( origin, dir, 0.001, 1000);
                        var ri = rc2.intersectObject(lineObj);
                        if (ri.length == 0) {
                            console.warn("we had an intersect, but a double check says no???");
                        } else {
                            console.warn("we double checked intersect and it looks good. ri:", ri);
                        }
                        }

                        //if (rc.distance > 0) {
                        if (this.debugCtr == 2) {
                            console.log("rc:", rc);
                            var line3 = rc.object.clone();
                            var mat = rc.object.material.clone();
                            mat.color = 0xff0000;
                            line3.material = mat;
                            line3.position.setZ(this.debugz + debugLineOffset);
                            this.sceneAdd(line3);

                            debugLineOffset += 0.01;
                        }
                        //}
                    }, this);
                }
            }

            //var rcr = rc.intersectObject(threeObj, true);
            console.log("rcrs:", rcrs);
            // use closest intersection
            var obj = null;
            if (rcrs.length == 0) {
                // there was no intersection
                console.warn("no intersection");
            } else {
                obj = rcrs[0];
                //that.drawParticle(obj.point.x, obj.point.y, obj.point.z, hex, 0.9, 0.02);
                // now take half the distance to average
                //newDelta = (obj.distance * scale) / -2;
            }

            var objs = [];
            var clipperPath = [{X: origin.x, Y: origin.y}];
            var minDist = 100000;
            var finalObj = null;
            rcrs.forEach(function(obj) {
                if (obj.distance < minDist && obj.distance > 0) {
                    //objs.unshift(obj);
                    finalObj = obj;
                    minDist = obj.distance;
                    //this.drawParticle(obj.point.x, obj.point.y, obj.point.z, 0xff0000, 0.2, 0.02);
                    clipperPath.push({X:obj.point.x, Y:obj.point.y});
                }
            }, this);
            //this.drawClipperPaths([clipperPath], 0xff0000, 0.9, 1, 0.0, false);
            //console.log("rcr:", objs);
            this.debugz += 0.1;
            //this.debugCtr++;
            return finalObj; //objs;
        },
        getIntersectPathObjects: function(overlapPath, z) {

            var group = new THREE.Group();
            var actualZ = z ? z : 0;

            var lineMat = new THREE.LineBasicMaterial({
                color: 0x00ffff,
                transparent: true,
                opacity: 0.5
            });
            var lineMat2 = new THREE.LineBasicMaterial({
                color: 0xff0000,
                transparent: true,
                opacity: 0.5
            });

            zdebug = 0.1;
            for (var j = 0; j < overlapPath.length; j++) {

                var j2 = j + 1;
                if (j2 > overlapPath.length - 1) j2 = 0;

                var lineGeo = new THREE.Geometry();
                lineGeo.vertices.push(new THREE.Vector3(overlapPath[j].X, overlapPath[j].Y, actualZ));
                lineGeo.vertices.push(new THREE.Vector3(overlapPath[j2].X, overlapPath[j2].Y, actualZ));
                var linePath = new THREE.Line(lineGeo, lineMat);

                // for debug
                /*
                var linePath2 = new THREE.Line(lineGeo, lineMat2);
                linePath2.position.setZ(zdebug);
                this.sceneAdd(linePath2);
                zdebug += 0.01;
                */

                group.add(linePath);
            }

            return group;
        },

        debugComparePathArray: function(pathsWithCompare) {
            var z = 1.0;
            var pathsNotNeedingAveraging = 0;
            var pathsNeedingAveraging = 0;
            pathsWithCompare.forEach(function(mainPath) {
                this.drawClipperPaths([mainPath.origPath], 0x0000ff, 0.9, z);
                z += 0.25;
                var comparePaths = mainPath.compareTo;
                if (comparePaths.length > 0) pathsNeedingAveraging++;
                else pathsNotNeedingAveraging++;
                comparePaths.forEach(function(cp) {
                    this.drawClipperPaths([cp.path], 0xff0000, 0.9, z);
                    z += 0.25;
                }, this);
                z += 1.0;
            }, this);
            console.log("pathsNeedingAveraging:", pathsNeedingAveraging, "pathsNotNeedingAveraging:", pathsNotNeedingAveraging);
        },
        getComparePathArray: function(paths) {

            var newPaths = []; // = paths.slice(0);

            var totalIntersectingBoundingBoxes = 0;
            var totalIntersectingTrue = 0;
            var totalIntersectingPolys = 0;

            var z = 1.0;
            for (var i = 0; i < paths.length; i++) {

                // put this path on the main array
                var orig = {
                    origPath: paths[i].slice(0), // clone
                    boundingBox: ClipperLib.Clipper.GetBounds([paths[i]]),
                    compareTo: []
                };
                //if (i == 0)
                //z += 1.5;
                //this.drawBoundingBox(orig.boundingBox, 0xff0000, z);
                newPaths[i] = orig;

                // now add the compareTo paths. we'll add all right now.
                // but we will drop paths later that don't have bounding box
                // match, so calc bounding box.
                for (var i2 = 0; i2 < paths.length; i2++) {
                    if (i2 == i) continue;
                    var compTo = {
                        origIndex: i2,
                        path: paths[i2], // do not clone
                        boundingBox: ClipperLib.Clipper.GetBounds([paths[i2]]),
                        boundingIntersect: false,
                        trueIntersect: false,
                        intersectionPolys: null,
                    };

                    compTo.boundingIntersect = this.isOverlapBoundingBoxViaUnion(orig.boundingBox, compTo.boundingBox, z);

                    if (compTo.boundingIntersect) {
                        //newPaths[i].compareTo.push(compTo);
                        totalIntersectingBoundingBoxes++;
                        //z += 0.25;

                        // let's now make sure there's a real intersect
                        compTo.trueIntersect = this.isOverlapExactViaUnion(orig.origPath, compTo.path);
                        if (compTo.trueIntersect) {
                            newPaths[i].compareTo.push(compTo);
                            totalIntersectingTrue++;
                            //this.drawBoundingBox(compTo.boundingBox, 0x00ff00, z);

                            // calculate the intersection paths
                            compTo.intersectionPolys = this.getPolytreeIntersectionOfClipperPaths(orig.origPath, compTo.path);
                            totalIntersectingPolys += compTo.intersectionPolys.m_Childs.length;
                        }
                    }
                }
            }

            console.log("newpaths super array:", newPaths);
            console.log("totalIntersectingBoundingBoxes:", totalIntersectingBoundingBoxes);
            console.log("totalIntersectingTrue:", totalIntersectingTrue);
            console.log("totalIntersectingPolys:", totalIntersectingPolys);
            return newPaths;
        },
        zDebugCtr: 1.0,
        isOverlapExactViaUnion: function(path1, path2) {

            var pathTest = this.getPolytreeUnionOfClipperPaths([path1, path2]);
            //this.drawClipperPaths(pathTest, 0x00ff00, 0.99, z);
            //console.log("union paths:", pathTest);
            if (pathTest.m_Childs.length == 2) {
                // there are still 2 polygons. so no overlap
                return false;
            }
            if (pathTest.m_Childs.length == 1) {
                // there is 1 polygon, so there was clearly overlap
                return true;
            }

            console.error("should not get here on isOverlapExactViaUnion. pathTest:", pathTest);
            this.drawClipperPaths([path1], 0x0000ff, 0.99, this.zDebugCtr);
            this.zDebugCtr += 0.25;
            this.drawClipperPaths([path2], 0x00ff00, 0.99, this.zDebugCtr);
            this.zDebugCtr += 0.25;
            this.drawClipperPaths(pathTest, 0xff0000, 0.99, this.zDebugCtr);
            this.zDebugCtr += 1.5;

            return false;

        },
        getPolytreeUnionOfClipperPaths: function (subj_paths) {
            //console.log("getPolytreeUnionOfClipperPaths");
            var cpr = new ClipperLib.Clipper();
            var scale = 100000;
            ClipperLib.JS.ScaleUpPaths(subj_paths, scale);
            cpr.AddPaths(subj_paths, ClipperLib.PolyType.ptSubject, true);
            var subject_fillType = ClipperLib.PolyFillType.pftNonZero;
            var clip_fillType = ClipperLib.PolyFillType.pftNonZero;
            //var solution_paths = new ClipperLib.Paths();
            var solution_poly = new ClipperLib.PolyTree();
            cpr.Execute(ClipperLib.ClipType.ctUnion, solution_poly, subject_fillType, clip_fillType);
            //console.log(JSON.stringify(solution_paths));
            //console.log("solution:", solution_paths);
            // scale back down
            ClipperLib.JS.ScaleDownPaths(solution_poly, scale);
            ClipperLib.JS.ScaleDownPaths(subj_paths, scale);
            return solution_poly;
        },
        getPolytreeIntersectionOfClipperPaths: function (subj_path, diff_path) {
            //console.log("getPolytreeIntersectionOfClipperPaths");
            var cpr = new ClipperLib.Clipper();
            var scale = 100000;
            ClipperLib.JS.ScaleUpPath(subj_path, scale);
            ClipperLib.JS.ScaleUpPath(diff_path, scale);
            cpr.AddPath(subj_path, ClipperLib.PolyType.ptSubject, true);
            cpr.AddPath(diff_path, ClipperLib.PolyType.ptClip, true);
            var subject_fillType = ClipperLib.PolyFillType.pftNonZero;
            var clip_fillType = ClipperLib.PolyFillType.pftNonZero;
            //var solution_paths = new ClipperLib.Paths();
            var solution_poly = new ClipperLib.PolyTree();
            cpr.Execute(ClipperLib.ClipType.ctIntersection, solution_poly, subject_fillType, clip_fillType);
            //console.log(JSON.stringify(solution_paths));
            //console.log("solution:", solution_paths);
            // scale back down
            for(var i = 0; i < solution_poly.m_Childs.length; i++) {
                ClipperLib.JS.ScaleDownPath(solution_poly.m_Childs[i].m_polygon, scale);
            }
            ClipperLib.JS.ScaleDownPath(subj_path, scale);
            ClipperLib.JS.ScaleDownPath(diff_path, scale);
            return solution_poly;
        },
        isOverlapBoundingBoxViaUnion: function(box, box2, z) {
            var path1 = [
                {X:box.left, Y:box.bottom},
                {X:box.right, Y:box.bottom},
                {X:box.right, Y:box.top},
                {X:box.left, Y:box.top}
            ];
            var path2 = [
                {X:box2.left, Y:box2.bottom},
                {X:box2.right, Y:box2.bottom},
                {X:box2.right, Y:box2.top},
                {X:box2.left, Y:box2.top}
            ];
            var pathTest = this.getUnionOfClipperPaths([path1, path2]);
            //this.drawClipperPaths(pathTest, 0x00ff00, 0.99, z);
            //console.log("union paths:", pathTest);
            if (pathTest.length == 2) {
                // there are still 2 boxes. good to go.
                return false;
            }
            if (pathTest.length == 1) {
                // there is 1 box, so there was clearly overlap
                return true;
            }
            console.error("should not get here on isOverlapBoundingBoxViaUnion. pathTest:", pathTest);
            return false;

        },

        overlapMinkowski: function(box, box2, z) {
            var path1 = [
                {X:box.left, Y:box.bottom},
                {X:box.right, Y:box.bottom},
                {X:box.right, Y:box.top},
                {X:box.left, Y:box.top}
            ];
            var path2 = [
                {X:box2.left, Y:box2.bottom},
                {X:box2.right, Y:box2.bottom},
                {X:box2.right, Y:box2.top},
                {X:box2.left, Y:box2.top}
            ];
            var pathTest = ClipperLib.Clipper.MinkowskiSum(path1, path2, true)
            this.drawClipperPaths(pathTest, 0x00ff00, 0.99, z);
            console.log("minkowski paths:", pathTest);
            if (pathTest.length == 2) {
                // there are still 2 boxes. good to go.
                return false;
            }
            if (pathTest.length == 1) {
                // there is 1 box, so there was clearly overlap
                return true;
            }
            console.error("should not get here on isOverlapBoundingBoxViaUnion. pathTest:", pathTest);
            return false;
        },
        // Returns true if two rectangles (l1, r1) and (l2, r2) overlap
        doOverlap: function(box1, box2) {
            /*
            l1: Top Left coordinate of first rectangle.
            r1: Bottom Right coordinate of first rectangle.
            l2: Top Left coordinate of second rectangle.
            r2: Bottom Right coordinate of second rectangle.
            */
            //Point l1, Point r1, Point l2, Point r2
            var l1 = {x:box1.left, y:box1.top};
            var r1 = {x:box1.right, y:box1.bottom};
            var l2 = {x:box2.left, y:box2.top};
            var r2 = {x:box2.right, y:box2.bottom};
            console.log(l1, r1, r2, l2);

            // If one rectangle is on left side of other
            if (l1.x > r2.x || l2.x > r1.x)
                return false;

            // If one rectangle is above other
            if (l1.y < r2.y || l2.y < r1.y)
                return false;

            return true;
        },
        checkRectOverlap: function(box, box2) {
            var rect1 = [
                [box.left, box.bottom],
                [box.right, box.top]
            ];
            var rect2 = [
                [box2.left, box2.bottom],
                [box2.right, box2.top]
            ];

            /*
             * Each array in parameter is one rectangle
             * in each array, there is an array showing the co-ordinates of two opposite corners of the rectangle
             * Example:
             * [[x1, y1], [x2, y2]], [[x3, y3], [x4, y4]]
             */

            //Check whether there is an x overlap
            if ((rect1[0][0] < rect2[0][0] && rect2[0][0] < rect1[1][0]) //Event that x3 is inbetween x1 and x2
                || (rect1[0][0] < rect2[1][0] && rect2[1][0] < rect1[1][0]) //Event that x4 is inbetween x1 and x2
                || (rect2[0][0] < rect1[0][0] && rect1[1][0] < rect2[1][0])) {  //Event that x1 and x2 are inbetween x3 and x4
                console.log("we found intersect on x");
                //Check whether there is a y overlap using the same procedure
                if ((rect1[0][1] < rect2[0][1] && rect2[0][1] < rect1[1][1]) //Event that y3 is between y1 and y2
                    || (rect1[0][1] < rect2[1][1] && rect2[1][1] < rect1[1][1]) //Event that y4 is between y1 and y2
                    || (rect1[0][1] < rect2[1][1] && rect2[1][1] < rect1[1][1])) { //Event that y1 and y2 are between y3 and y4
                    console.log("we found intersect on y as well");
                    return true;
                }
            }
            return false;
        },
        rectanglesIntersect: function( a, b ) {
            //float minAx, float minAy, float maxAx, float maxAy,
            //float minBx, float minBy, float maxBx, float maxBy ) {
            var aRightOfB = (a.left < b.right) ? true : false; //minAx > maxBx;
            var aLeftOfB = (a.right > b.left) ? true : false; //maxAx < minBx;
            var aBelowB = (a.top < b.bottom) ? true : false; //maxAy < minBy;
            var aAboveB = (a.bottom > b.top) ? true : false; //minAy > maxBy;
            console.log("intersects?", aRightOfB, aLeftOfB, aBelowB, aAboveB);

            if (aRightOfB || aLeftOfB) {
                console.log("x's intersect");
                if (aBelowB || aAboveB) {
                    console.log("y's intersect too");
                    return true;
                }
            }
            /*
            Cond1. If A's left edge is to the right of the B's right edge, - then A is Totally to right Of B
            Cond2. If A's right edge is to the left of the B's left edge, - then A is Totally to left Of B
            Cond3. If A's top edge is below B's bottom edge, - then A is Totally below B
            Cond4. If A's bottom edge is above B's top edge, - then A is Totally above B

            if (RectA.X1 < RectB.X2 &&
                RectA.X2 > RectB.X1 &&
                RectA.Y1 < RectB.Y2 &&
                RectA.Y2 > RectB.Y1)
            */

            //var isAnyIntersect;
            //if ( aLeftOfB || aRightOfB || aAboveB || aBelowB ) {
            //    isAnyIntersect = true;
            //}
            //if ( !aLeftOfB && !aRightOfB && !aAboveB && !aBelowB ) {
            //    isAnyIntersect = true;
            //}
            //return isAnyIntersect;
            return false;
        },
        drawBoundingBox: function(box, color, z) {
            var path = [
                {X:box.left, Y:box.bottom},
                {X:box.right, Y:box.bottom},
                {X:box.right, Y:box.top},
                {X:box.left, Y:box.top}
            ];
            this.drawClipperPaths([path], color, 0.99, z);
        },
        refreshDrawPathEndMill: function() {
            console.log("refreshDrawPathEndMill()");

            // Draw the actual milling paths (this may be done in an earlier method now like getAveragedOverlapPaths, so that it draws as it generates)
            if (this.pathWasDrawnByAlgorithm == false) {
                // we need to draw it
                var tp = this.drawClipperPaths(this.pathEndMillArr, this.colorMill, 0.8);
                this.threePathEndMillArr.push(tp);
            }

            //var pathEndMill = this.getInflatePath(pathsUnion, this.endmillSize);
            //console.log("pathEndMill:", pathEndMill);
            //var skipArr = [[{X:48,Y:10},{X:58,Y:10},{X:58,Y:18},{X:48,Y:18},{X:48,Y:10}]];

            //var pathDiff = this.getDiffOfClipperPaths(pathEndMill, skipArr);
            //this.drawClipperPaths(pathDiff, this.colorMill, 0.8);

            // now draw the last step which is the actual path
            this.refreshDrawPathActualMilling();
            console.log("DONE refreshDrawPathEndMill()");
        },
        refreshDrawPathActualMilling: function() {

            // draw cyan actual endmill lines
            console.log("refreshDrawPathActualMilling() about to draw cyan lines");
            var isShow = $('#com-chilipeppr-widget-eagle .show-actual').is(':checked');
            if (isShow) {
                var inflateBy = this.actualEndmill / 2;
                //var pathInflatedActual = this.getInflatePath(pathEndMill, inflateBy);

                var isSolid = $('#com-chilipeppr-widget-eagle .show-actual-asmesh').is(':checked');


                // loop thru all this.pathEndMillArr and deflate
                var group = new THREE.Object3D();
                this.pathEndMillArr.forEach(function(path) {

                    // deflate path
                    var pDeflate = this.getInflatePath( [path], inflateBy * -1 );
                    this.pathDeflatedActualArr.push(pDeflate);

                    if (!isSolid) {
                        var threePDeflate = this.drawClipperPaths( pDeflate, 0x00ffff, 0.6);
                        this.threePathDeflatedActualArr.push( threePDeflate);
                    }

                    // inflate path
                    var pInflate = this.getInflatePath( [path], inflateBy );
                    this.pathInflatedActualArr.push(pInflate);
                    if (!isSolid) {
                        var threePInflate = this.drawClipperPaths( pInflate, 0x00ffff, 0.6);
                        this.threePathInflatedActualArr.push( threePInflate);
                    }

                    // if asking for solid view of this, we must
                    // union the deflated path with the inflated path
                    // and then draw as mesh
                    if (isSolid) {
                        //var solidPath = this.getUnionOfClipperPaths([pInflate[0], pDeflate[0]]);
                        //console.log("solidPath:", solidPath);
                        //if (solidPath.length > 1) console.warn("when unionizing the deflated and inflated, we should still only get one final path for making a solid. we got more. length:", solidPath.length);
                        var threeSolidPath = this.createClipperPathsAsMesh(pInflate, 0x00ffff, 0.2, pDeflate);
                        //this.sceneAdd(threeSolidPath);
                        group.add(threeSolidPath);
                        // use deflated arr to store so we can
                        // remove next time into this method
                        //this.threePathDeflatedActualArr.push( threeSolidPath);
                    }

                }, this);

                if (isSolid) {
                    this.sceneAdd(group);
                    this.threePathDeflatedActualArr.push( group );
                }
                /*
                this.pathDeflatedActual = this.getInflatePath(this.pathEndMill, inflateBy * -1);
                this.threePathDeflatedActual = this.drawClipperPaths(this.pathDeflatedActual, 0x00ffff, 0.6);
                */

                //this.drawClipperPaths(pathInflatedActual, 0x00ffff, 0.6);
                /*
                this.pathEndMill.forEach(function(path) {
                    var p = this.getInflatePath([path], inflateBy);
                    this.pathInflatedActualArr.push(p);
                    this.threePathInflatedActualArr.push( this.drawClipperPaths(p, 0x00ffff, 0.6) );
                }, this);
                */
            }
            console.log("DONE refreshDrawPathActualMilling()");
        },
        // Returns new paths with the overlap of other paths removed
        getPathsWithOverlapRemoved: function(paths) {

            var retNewPaths = [];

            // this array will contain the path of overlap paths for each original path with it's
            // index matching the original paths for later lookup
            var perPathOverlapPaths = [];
            var perPathModifiedOrigPath = [];

            // for debug, let's draw the paths passed in
            //this.drawClipperPaths(paths, 0xff0000, 0.99, 3);
            var z = 3;
            /*
            paths.forEach(function(p) {
                this.drawClipperPaths([p], 0xff0000, 0.99, z);
                z += 1;
            }, this);
            */

            // create new path with self removed
            for (var i = 0; i < paths.length; i++) {
                var pathOfSelf = paths[i];
                var pathWithSelfRemoved = [];
                for (var i2 = 0; i2 < paths.length; i2++) {
                    if (i == i2) continue;
                    pathWithSelfRemoved.push(paths[i2]);
                }

                // for debug, draw each path with self removed
                //this.drawClipperPaths(pathWithSelfRemoved, 0xff0000, 0.9, z);
                //z += 15;

                // get intersections of this new path with self removed
                var intersectPathsWithSelfRemoved = this.getIntersectionOfClipperPaths([pathOfSelf], pathWithSelfRemoved);
                //var intersectPathsWithSelfRemoved = this.getIntersectionOfClipperPaths( pathWithSelfRemoved, [pathOfSelf]);

                // inflate intersections to ensure we get clean clipping of original path
                var inflatedIntersectPathsWithSelfRemoved = this.getInflatePath(intersectPathsWithSelfRemoved, 0.001);

                // remove intersect paths from this self original path
                console.log("long operation. working on index:", i, " of ", paths.length, "pathOfSelf:", [pathOfSelf]);
                var modifiedOrigPaths = this.getDiffOfClipperPaths([pathOfSelf], inflatedIntersectPathsWithSelfRemoved);

                if (modifiedOrigPaths.length > 1) {
                    console.warn("we got more than 1 path when we modified the original path. that should not happen. we will toss the smaller paths. modifiedOrigPaths:", modifiedOrigPaths);
                    // draw it for debug
                    this.drawClipperPaths([pathOfSelf], 0x0000ff, 0.9, 3);
                    this.drawClipperPaths(modifiedOrigPaths, 0xff0000, 0.9, 3.5);

                    //return;
                }
                if (modifiedOrigPaths.length == 0) {
                    console.error("really bad. we got 0 paths when we modified the original path. that should not happen. modifiedOrigPaths:", modifiedOrigPaths);
                    this.drawClipperPaths([pathOfSelf], 0x0000ff, 0.9, 3);
                    this.drawClipperPaths(modifiedOrigPaths, 0xff0000, 0.9, 3.5);
                    //return;
                }
                perPathModifiedOrigPath.push(modifiedOrigPaths[0]);

                perPathOverlapPaths.push(inflatedIntersectPathsWithSelfRemoved);


                /*
                if (i < 2) {
                    //this.drawClipperPaths([pathOfSelf], 0x0000ff, 0.9, z);
                    this.drawClipperPaths(intersectPathsWithSelfRemoved, 0xff0000, 0.9, z);
                    //this.drawClipperPaths(modifiedOrigPaths, 0xff00ff, 0.9, z + 0.5);
                    z += 5;
                }
                */

            }

            // for debug, let's draw the new modified original path and the overlap paths for
            // that layer

            /*
            console.log("paths:", paths, "perPathModifiedOrigPath:", perPathModifiedOrigPath, "perPathOverlapPaths:", perPathOverlapPaths);
            for (var index = 0; index < paths.length; index++) {
                console.log("drawing path layer i:", index);
                this.drawClipperPaths([paths[index]], 0xff0000, 0.9, z);
                this.drawClipperPaths([perPathModifiedOrigPath[index]], 0xff00ff, 0.9, z + 0.5);
                this.drawClipperPaths(perPathOverlapPaths[index], 0x00ff00, 0.9, z + 1.0);
                z += 5;
            }
            */

            // draw a mesh area for the overlap
            for (var index = 0; index < paths.length; index++) {
                var mesh = this.createClipperPathsAsMesh(perPathOverlapPaths[index], 0xff0000, 0.1);
                this.sceneAdd(mesh);
            }

            var finalModPaths = this.getPathsWithAveragedOverlaps(paths, perPathModifiedOrigPath, perPathOverlapPaths, true);
            retNewPaths = finalModPaths;
            //retNewPaths = perPathModifiedOrigPath;
            return retNewPaths;
        },
        getPathsWithAveragedOverlaps: function(origPaths, modPaths, overlapPaths, debug) {
            var retPaths = [];
            retPaths = modPaths;

            // Pass in our main paths and identically indexed overlap paths
            // Returns: an object with an indentically indexed set of two arrays
            // array 1: adjoining points
            // array 2: nonadjoining points
            var adjoinPts = this.getAdjoiningAndNonAdjoiningPointsForAPathAndOverlap(modPaths, overlapPaths, true);
            console.log("adjoinPts:", adjoinPts, "modPaths:", modPaths, "overlapPaths:", overlapPaths);

            // draw this overlap shape using the three.js shape object
            // because it has some nice features to try things
            var z = 2.5;
            for (var i = 0; i < modPaths.length; i++) {
                //if (i > 3) continue; // only draw a couple
                var modPath = modPaths[i];
                var adjPts = adjoinPts.adjoining[i];
                var nonAdjPts = adjoinPts.non[i];

                for (var opi = 0; opi < overlapPaths[i].length; opi++) {

                    // Try to do an averaging offset by modifying Clipper
                    var overlapPath = overlapPaths[i][opi];
                    console.log("trying to average modPath:", JSON.stringify(modPath), " and overlapPath:", JSON.stringify(overlapPath));
                    //this.drawClipperPaths([overlapPath], 0x00ff00, 0.9, z - 0.1);
                    //debugger;
                    var testOp = this.getInflateVisualizePath([overlapPath], -0.1, z, adjPts, nonAdjPts);
                    this.drawClipperPaths(testOp, 0xff0000, 0.9, z + 0.1);
                }
                z += 2;
            }

            return retPaths;
        },
        getInflateVisualizePath: function(paths, delta, z, adjPts, nonAdjPts) {

            this.modifyClipper();

            var scale = 10000;
            ClipperLib.JS.ScaleUpPaths(paths, scale);
            var miterLimit = 2;
            var arcTolerance = 10;
            var co = new ClipperLib.ClipperOffset(miterLimit, arcTolerance);
            //debugger;
            co.cpVisualize = true;

            co.AddPaths(paths, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);
            //var delta = 0.0625; // 1/16 inch endmill
            var offsetted_paths = new ClipperLib.Paths();
            co.ExecuteOffsetAverage(offsetted_paths, delta * scale, z, adjPts, nonAdjPts);

            // scale back down
            ClipperLib.JS.ScaleDownPaths(offsetted_paths, scale);
            ClipperLib.JS.ScaleDownPaths(paths, scale);
            return offsetted_paths;

        },
        intersectPoint: function(edge1, edge2) {
            //ClipperLib.Clipper.prototype.IntersectPoint
            //InitEdge2 InitEdge2 = function (e, polyType)
        },
        pointInPath: function(pt, path) {
            // check if a point is in this path
            for (var i = 0; i < path.length; i++) {
                var pt2 = path[i];
                if (pt.X == pt2.X && pt.Y == pt2.Y) return true;
            }
            return false;
        },
        isClipperModded: false,
        modifyClipper: function() {
            if (this.isClipperModded) return;
            var that = this;
            //var z = 2;
            var scale = 10000;
            ClipperLib.ClipperOffset.prototype.DoRound2 = function (j, k)
            {
                var a = Math.atan2(this.m_sinA,
                                   this.m_normals[k].X * this.m_normals[j].X + this.m_normals[k].Y * this.m_normals[j].Y);
                var steps = ClipperLib.Cast_Int32(ClipperLib.ClipperOffset.Round(this.m_StepsPerRad * Math.abs(a)));
                var X = this.m_normals[k].X,
                    Y = this.m_normals[k].Y,
                    X2;
                for (var i = 0; i < steps; ++i)
                {
                    this.m_destPoly.push(new ClipperLib.IntPoint(
                        ClipperLib.ClipperOffset.Round(this.m_srcPoly[j].X + X * this.m_delta),
                        ClipperLib.ClipperOffset.Round(this.m_srcPoly[j].Y + Y * this.m_delta)));
                    X2 = X;
                    X = X * this.m_cos - this.m_sin * Y;
                    Y = X2 * this.m_sin + Y * this.m_cos;
                }
                this.m_destPoly.push(new ClipperLib.IntPoint(
                    ClipperLib.ClipperOffset.Round(this.m_srcPoly[j].X + this.m_normals[j].X * this.m_delta),
                    ClipperLib.ClipperOffset.Round(this.m_srcPoly[j].Y + this.m_normals[j].Y * this.m_delta)));
            };
            ClipperLib.ClipperOffset.prototype.OffsetPointAsAverageOnIntersect = function (j, k, jointype, z)
            {
                //debugger;
                this.m_sinA = (this.m_normals[k].X * this.m_normals[j].Y - this.m_normals[j].X * this.m_normals[k].Y);
                if (this.m_sinA < 0.00005 && this.m_sinA > -0.00005)
                    return k;
                else if (this.m_sinA > 1)
                    this.m_sinA = 1.0;
                else if (this.m_sinA < -1)
                    this.m_sinA = -1.0;

                // project the normal to see if it intersects

                // draw the normal for now
                var material = new THREE.LineBasicMaterial({
                    color: 0x0000ff,
                    transparent: true,
                    opacity: 0.5
                });
                var geometry = new THREE.Geometry();
                var ptOnOrig = {
                    X: this.m_srcPoly[j].X,
                    Y: this.m_srcPoly[j].Y
                }
                // project 1 unit (1mm equivalent)
                var ptProject = {
                    X: this.m_srcPoly[j].X + this.m_normals[k].X * (scale * -0.1),
                    Y: this.m_srcPoly[j].Y + this.m_normals[k].Y * (scale * -0.1)
                }
                geometry.vertices.push(new THREE.Vector3(ptOnOrig.X / scale, ptOnOrig.Y / scale, z));
                geometry.vertices.push(new THREE.Vector3(ptProject.X / scale, ptProject.Y / scale, z));
                var line = new THREE.Line(geometry, material);
                that.sceneAdd(line);
                //that.drawParticle(ptOnOrig.X / scale, ptOnOrig.Y / scale, z - 0.1, 0xff0000, 0.2, 0.02);

                // draw the normal
                var dir = new THREE.Vector3( this.m_normals[k].X *-1, this.m_normals[k].Y * -1, 0 );
                var origin = new THREE.Vector3( ptOnOrig.X / scale, ptOnOrig.Y / scale, z );
                var length = 0.1;
                var hex = 0x0000ff;
                var hex = 0xffffff;
                var hexStep = (hex - 10) / this.m_normals.length;
                var hex = hexStep * k;

                var arrowHelper = new THREE.ArrowHelper( dir, origin, length, hex );
                that.sceneAdd( arrowHelper );

                // create raycaster
                //debugger;
                var rc = new THREE.Raycaster( origin, dir, 0.00001 );
                var rcr = rc.intersectObjects(this.m_linesForIntersect);
                console.log("rcr:", rcr);
                var newDelta;
                // use closest intersection
                if (rcr.length == 0) {
                    // there was no intersection
                    newDelta = -1;
                } else {
                    var obj = rcr[0];
                    that.drawParticle(obj.point.x, obj.point.y, obj.point.z, hex, 0.9, 0.02);
                    // now take half the distance to average
                    newDelta = (obj.distance * scale) / -2;
                }

                // use the furthest away intersection
                /*
                if (rcr.length > 0) {
                    var obj = rcr[rcr.length-1];
                    that.drawParticle(obj.point.x, obj.point.y, obj.point.z, hex, 0.9, 0.02);
                } else {
                    console.warn("no intersection for this point normal");
                }
                */
                //rcr.forEach(function(obj) {
                //    that.drawParticle(obj.point.x, obj.point.y, obj.point.z, 0xff0000, 0.2, 0.02);
                //}, this);



                //var testDelta = -0.1;
                //this.m_srcPoly[j].X + this.m_normals[k].X * testDelta;
                // scale the delta from 1 to 0 to 1
                //debugger;
                /*
                var halfLen = this.m_srcPoly.length / 2;
                // we want 1st index at 1
                var scaler = j / halfLen;
                var newDeltaMult = Math.abs(1 - scaler);
                //this.m_delta = newDelta * this.;
                var newDelta = newDeltaMult * this.m_delta;
                */

                if (this.m_sinA * this.m_delta < 0)
                {
                    // point 1
                    var pt1 = new ClipperLib.IntPoint(
                        ClipperLib.ClipperOffset.Round(
                            this.m_srcPoly[j].X + this.m_normals[k].X * newDelta ),
                        ClipperLib.ClipperOffset.Round(
                            this.m_srcPoly[j].Y + this.m_normals[k].Y * newDelta ));
                    this.m_destPoly.push( pt1 );

                    // draw the normal
                    /*
                    var dir = new THREE.Vector3( this.m_normals[k].X *-1, this.m_normals[k].Y * -1, 0 );
                    var origin = new THREE.Vector3( this.m_srcPoly[j].X / scale, this.m_srcPoly[j].Y / scale, z );
                    var length = 1;
                    var hex = 0xffff00;

                    var arrowHelper = new THREE.ArrowHelper( dir, origin, length, hex );
                    that.sceneAdd( arrowHelper );
                    */

                    // point 2
                    this.m_destPoly.push(new ClipperLib.IntPoint(this.m_srcPoly[j]));

                    // point 3
                    this.m_destPoly.push( new ClipperLib.IntPoint(
                        ClipperLib.ClipperOffset.Round(
                            this.m_srcPoly[j].X + this.m_normals[j].X * newDelta),
                        ClipperLib.ClipperOffset.Round(
                            this.m_srcPoly[j].Y + this.m_normals[j].Y * newDelta )));
                }
                else {
                    //console.warn("should not get here in OffsetPoint2. jointype:", jointype);
                    switch (jointype)
                    {
                        case ClipperLib.JoinType.jtMiter:
                            console.warn("doing miter");
                            {
                                var r = 1 + (this.m_normals[j].X * this.m_normals[k].X + this.m_normals[j].Y * this.m_normals[k].Y);
                                if (r >= this.m_miterLim)
                                    this.DoMiter(j, k, r);
                                else
                                    this.DoSquare(j, k);
                                break;
                            }
                        case ClipperLib.JoinType.jtSquare:
                            console.warn("doing square");
                            this.DoSquare(j, k);
                            break;
                        case ClipperLib.JoinType.jtRound:
                            //console.warn("doing round");
                            this.DoRound2(j, k);
                            break;
                    }
                }

                k = j;
                return k;
            };
            ClipperLib.ClipperOffset.prototype.DoOffsetAverage = function (path, z, adjPts, nonAdjPts)
            {
                // path is the path of points that we'll see if an intersection
                // occurs on
                this.m_destPolys = new Array();
                this.m_delta = -1000; new Array(); // create a delta for each point
                this.m_linesForIntersect = [];

                // figure out whether to use adjPts or nonAdjPts
                // we want to average the points on the side that has more points
                var ptsToAvg;
                var ptsStatic;
                if (adjPts.length > nonAdjPts.length) {
                    ptsToAvg = adjPts;
                    ptsStatic = nonAdjPts;
                } else {
                    ptsToAvg = nonAdjPts;
                    ptsStatic = adjPts;
                }
                console.log("ptsStatic:", ptsStatic);

                // create intersect line out of the static points
                // create three.js object to find intersects
                // but only find intersects on the ptsStatic line
                /*
                var lineMat = new THREE.LineBasicMaterial({
                    color: 0x00ffff,
                    transparent: true,
                    opacity: 0.5
                });
                var actualZ = z;
                for (var j = 0; j < ptsStatic.length - 1; j++) {
                    var lineGeo = new THREE.Geometry();

                    lineGeo.vertices.push(new THREE.Vector3(ptsStatic[j].X / scale, ptsStatic[j].Y / scale, actualZ));
                    lineGeo.vertices.push(new THREE.Vector3(ptsStatic[j+1].X / scale, ptsStatic[j+1].Y / scale, actualZ));
                    var linePath = new THREE.Line(lineGeo, lineMat);
                    this.m_linesForIntersect.push(linePath);
                    that.sceneAdd(linePath);
                }
                // close it by connecting last point to 1st point
                var lineGeo = new THREE.Geometry();
                lineGeo.vertices.push(new THREE.Vector3(ptsStatic[ptsStatic.length - 1].X / scale, ptsStatic[ptsStatic.length - 1].Y / scale, actualZ));
                lineGeo.vertices.push(new THREE.Vector3(ptsStatic[0].X / scale, ptsStatic[0].Y / scale, actualZ));
                var linePath = new THREE.Line(lineGeo, lineMat);
                this.m_linesForIntersect.push(linePath);
                that.sceneAdd(linePath);
                */

                // loop thru each outer path (there should only be one btw)
                if (this.m_polyNodes.ChildCount() > 1) {
                    console.warn("doing avg offset, we should only have one path to work with.");
                }
                var lineMat = new THREE.LineBasicMaterial({
                    color: 0x00ffff,
                    transparent: true,
                    opacity: 0.5
                });

                for (var i = 0; i < this.m_polyNodes.ChildCount(); i++)
                {
                    var node = this.m_polyNodes.Childs()[i];
                    this.m_srcPoly = node.m_polygon;

                    // create three.js object to find intersects
                    // but only find intersects on the ptsStatic line
                    var ptsfi = []; // points for intersect
                    console.log("about to compare this.m_srcPoly to ptsStatic. ptsStatic:", ptsStatic, "this.m_srcPoly:", this.m_srcPoly);
                    for (var j = 0; j < this.m_srcPoly.length; j++) {
                        var pt = this.m_srcPoly[j];
                        if (that.pointInPath(pt, ptsStatic)) {
                            console.log("yes, pt:", pt, "was in ptsStatic:", ptsStatic);
                        } else {
                            console.log("no, pt:", pt, "was not in ptsStatic:", ptsStatic);
                            ptsfi.push(pt);
                        }
                    }

                    //for (var j = 0; j < this.m_srcPoly.length - 1; j++) {
                    for (var j = 0; j < ptsfi.length - 1; j++) {
                        var lineGeo = new THREE.Geometry();
                        var actualZ = z;
                        lineGeo.vertices.push(new THREE.Vector3(ptsfi[j].X / scale, ptsfi[j].Y / scale, actualZ));
                        lineGeo.vertices.push(new THREE.Vector3(ptsfi[j+1].X / scale, ptsfi[j+1].Y / scale, actualZ));
                        var linePath = new THREE.Line(lineGeo, lineMat);
                        this.m_linesForIntersect.push(linePath);
                        that.sceneAdd(linePath);
                    }
                    // DO NOT close it by connecting last point to 1st point
                    var lineGeo = new THREE.Geometry();
                    lineGeo.vertices.push(new THREE.Vector3(this.m_srcPoly[this.m_srcPoly.length - 1].X / scale, this.m_srcPoly[this.m_srcPoly.length - 1].Y / scale, actualZ));
                    lineGeo.vertices.push(new THREE.Vector3(this.m_srcPoly[0].X / scale, this.m_srcPoly[0].Y / scale, z));
                    var linePath = new THREE.Line(lineGeo, lineMat);
                    //this.m_linesForIntersect.push(linePath);
                    //that.sceneAdd(linePath);


                    var len = this.m_srcPoly.length;
                    this.m_destPoly = new Array();
                    this.m_deltaArr = new Array();

                    //build m_normals ...
                    this.m_normals.length = 0;
                    //this.m_normals.set_Capacity(len);

                    // generate a normal for each line
                    for (var j = 0; j < len - 1; j++) {
                        this.m_normals.push(
                            ClipperLib.ClipperOffset.GetUnitNormal(
                                this.m_srcPoly[j], this.m_srcPoly[j + 1]));
                    }

                    // normals are built now
                    // with a closed path, we have to also calculate a normal
                    // for the last point in the array back to the first point
                    if (node.m_endtype == ClipperLib.EndType.etClosedLine ||
                        node.m_endtype == ClipperLib.EndType.etClosedPolygon)
                        this.m_normals.push(
                            ClipperLib.ClipperOffset.GetUnitNormal(
                                this.m_srcPoly[len - 1], this.m_srcPoly[0]));
                    else
                        console.warn("should not get here");

                    // now calculate the differing offsets for each point
                    // because the offset is calculated by projecting the normal
                    // onto an intersecting line on the opposite side of the closed
                    // path. then we half that length to get the offset


                    // now that we have our normals, we can calculate the offset
                    if (node.m_endtype == ClipperLib.EndType.etClosedPolygon)
                    {
                        var k = len - 1;

                        var y;
                        var delta = -1000;
                        if (this.ArcTolerance <= 0)
                            y = ClipperLib.ClipperOffset.def_arc_tolerance;
                        else if (this.ArcTolerance > Math.abs(delta) * ClipperLib.ClipperOffset.def_arc_tolerance)
                            y = Math.abs(delta) * ClipperLib.ClipperOffset.def_arc_tolerance;
                        else
                            y = this.ArcTolerance;

                        var steps = 3.14159265358979 / Math.acos(1 - y / Math.abs(delta));
                        this.m_sin = Math.sin(ClipperLib.ClipperOffset.two_pi / steps);
                        this.m_cos = Math.cos(ClipperLib.ClipperOffset.two_pi / steps);
                        this.m_StepsPerRad = steps / ClipperLib.ClipperOffset.two_pi;
                        this.m_sin = -this.m_sin;

                        //debugger;

                        // calculate the offset for each point
                        // this call actually creates 3 points in the output
                        // it generates a point for
                        // 1) the normal on the line coming into the point
                        // 2) the point itselt
                        // 3) the normal on the line coming out of the point
                        // this creates a triangle that is ordered as a hole
                        // so that later on a union is done and the holes disappear
                        // leaving a final shape
                        for (var j = 0; j < len; j++) {
                            k = this.OffsetPointAsAverageOnIntersect(j, k, node.m_jointype, z);
                        }

                        this.m_destPolys.push(this.m_destPoly);
                    } else {
                        console.warn("should not get here either");
                    }
                }

            };
            ClipperLib.ClipperOffset.prototype.ExecuteOffsetAverage = function ()
            {
                console.group("ExecuteOffsetAverage");
                var a = arguments,
                    ispolytree = a[0] instanceof ClipperLib.PolyTree;
                if (!ispolytree) // function (solution, delta)
                {
                    var solution = a[0],
                        delta = a[1];
                    var z = a[2];
                    var adjPts = a[3];
                    var nonAdjPts = a[4];
                    ClipperLib.Clear(solution);
                    this.FixOrientations();
                    this.DoOffsetAverage(delta, z, adjPts, nonAdjPts);
                    //this.DoOffset2(delta);

                    // visualize the m_destPolys
                    //ClipperLib.JS.ScaleDownPaths(this.m_destPolys, scale);
                    //that.drawClipperPaths(this.m_destPolys, 0x0000ff, 0.9, z, 0.005, false, true /* addDirArrowHelper */);
                    //ClipperLib.JS.ScaleUpPaths(this.m_destPolys, scale);

                    //z += 2;

                    //now clean up 'corners' ...
                    var clpr = new ClipperLib.Clipper(0);
                    clpr.AddPaths(this.m_destPolys, ClipperLib.PolyType.ptSubject, true);
                    if (delta > 0)
                    {
                        console.warn("should not get here");
                        clpr.Execute(ClipperLib.ClipType.ctUnion, solution, ClipperLib.PolyFillType.pftPositive, ClipperLib.PolyFillType.pftPositive);
                    }
                    else
                    {
                        var r = ClipperLib.Clipper.GetBounds(this.m_destPolys);
                        var outer = new ClipperLib.Path();
                        outer.push(new ClipperLib.IntPoint(r.left - 10, r.bottom + 10));
                        outer.push(new ClipperLib.IntPoint(r.right + 10, r.bottom + 10));
                        outer.push(new ClipperLib.IntPoint(r.right + 10, r.top - 10));
                        outer.push(new ClipperLib.IntPoint(r.left - 10, r.top - 10));

                        // visualize the outer
                        //ClipperLib.JS.ScaleDownPath(outer, scale);
                        //that.drawClipperPaths([outer], 0x00ffff, 0.9, z + 0.05);
                        //ClipperLib.JS.ScaleUpPath(outer, scale);

                        clpr.AddPath(outer, ClipperLib.PolyType.ptSubject, true);
                        clpr.ReverseSolution = true;
                        clpr.Execute(ClipperLib.ClipType.ctUnion, solution, ClipperLib.PolyFillType.pftNegative, ClipperLib.PolyFillType.pftNegative);
                        //clpr.Execute(ClipperLib.ClipType.ctUnion, solution, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
                        if (solution.length > 0)
                            solution.splice(0, 1);
                    }
                    //console.log(JSON.stringify(solution));
                }
                else // function (polytree, delta)
                {
                    console.warn("should not get here in execute2");
                }
                console.groupEnd();
            };

            this.isClipperModded = true;
        },
        getPathsWithAveragedOverlapsOld: function(origPaths, modPaths, overlapPaths, debug) {
            var retPaths = [];
            retPaths = modPaths;

            // here's the hard part. how do you average each overlap?

            // for debug, draw main modified path and then overlap path in diff color
            // on diff layers to visualize
            if (debug) {
                var z = 2;
                for (var i = 0; i < modPaths.length; i++) {
                    //if (i > 3) continue; // only draw a couple
                    // draw modPath
                    this.drawClipperPaths([modPaths[i]], 0xff0000, 0.3, z);
                    // draw overlaps
                    this.drawClipperPaths(overlapPaths[i], 0x0000ff, 0.9, z);
                    z += 2;
                }
            }

            /*
            // Pass in our main paths and identically indexed overlap paths
            // Returns: an object with an indentically indexed set of two arrays
            // array 1: adjoining points
            // array 2: nonadjoining points
            var adjoinPts = this.getAdjoiningAndNonAdjoiningPointsForAPathAndOverlap(modPaths, overlapPaths, true);

            console.log("adjoinPts:", adjoinPts);

            // now that we have adjoining and non-adjoining points, let's try a technique
            // where we 1) loop through each non-adjoining point 2) find it's nearest adjoining
            // point and 3) average the distance between those two points and 4) slide in the
            // other point by half that distance along that line

            // add nearest point array to correspond with non-adjoining poitns
            adjoinPts.nearestAdjToNon = []
            // loop thru modPaths
            var z = 2;
            for ( var i = 0; i < modPaths.length; i++ ) {
                var modPath = modPaths[i];
                var adjPts = adjoinPts.adjoining[i];
                var nonPts = adjoinPts.non[i];
                adjoinPts.nearestAdjToNon[i] = [];
                for ( var ni = 0; ni < nonPts.length; ni++ ) {
                    var npt = nonPts[ni];
                    // we have our non-adjoining point
                    // find closest adjoining point
                    var nearestAdjPtIndex = this.getIndexOfClosestPointInPath(npt, adjPts);
                    var nearestAdjPt = adjPts[nearestAdjPtIndex];
                    console.log("found nearest point for non-adjacent point to adjacent point. nearestAdjPt:", nearestAdjPt, "non-adjacent point npt:", npt);
                    //this.drawClipperPaths([[npt, nearestAdjPt]], 0x00ff00, 0.9, z, 0, false);
                    adjoinPts.nearestAdjToNon[i].push(nearestAdjPt);
                }

                var nearestAdjToNon = adjoinPts.nearestAdjToNon[i];
                // see if the non-adjacent side has more points. if it does just pull those
                // in towards the adjacent side. if the adjacent side has more points, we need to
                // pull those closer to non-adjacent and then do a diff.
                if (nonPts.length > adjPts.length) {
                    // cool. this one is easier. the non-adjacent side has more points. we
                    // can average those and pull them in.
                    for ( var ni = 0; ni < nonPts.length; ni++ ) {
                        var npt = nonPts[ni];
                        var napt = nearestAdjToNon[ni];
                        if (npt.X > napt.X) npt.X = npt.X - ((npt.X - napt.X) / 2);
                        else if (npt.X < napt.X) npt.X = napt.X - ((napt.X - npt.X) / 2);
                        if (npt.Y > napt.Y) npt.Y = npt.Y - ((npt.Y - napt.Y) / 2);
                        else if (npt.Y < napt.Y) npt.Y = napt.Y - ((napt.Y - npt.Y) / 2);
                        this.drawClipperPaths([[npt, napt]], 0x00ff00, 0.9, z, 0, false);

                    }
                }


                z += 2;
            }
            */



            // draw this overlap shape using the three.js shape object
            // because it has some nice features to try things
            var z = 2.5;
            for (var i = 0; i < modPaths.length; i++) {
                //if (i > 3) continue; // only draw a couple

                for (var opi = 0; opi < overlapPaths[i].length; opi++) {

                    // Try to do an averaging offset by modifying Clipper
                    var overlapPath = overlapPaths[i][opi];
                    //debugger;
                    var testOp = this.getInflatePath([overlapPath], -0.1);
                    this.drawClipperPaths(testOp, 0xff0000, 0.9, z);

                    //var shapePts = [];

                    var opShape = new THREE.Shape();

                    var firstPt;
                    for (var opi2 = 0; opi2 < overlapPaths[i][opi].length; opi2++) {
                        var pt = overlapPaths[i][opi][opi2];
                        console.log("adding overlapPath pt:", pt);
                        if (opi2 == 0) {
                            firstPt = pt;
                            opShape.moveTo( pt.X, pt.Y );
                        } else {
                            opShape.lineTo( pt.X, pt.Y );
                        }
                        //shapePts.push( new THREE.Vector2 ( pt.X, pt.Y ) );
                    }
                    //shapePts.pop();
                    //if (shapePts.length > 0) {
                    //var pt = overlapPaths[i][opi][0];
                    //console.log("adding overlapPath final closing pt:", pt);
                    // close path
                    opShape.lineTo( firstPt.X, firstPt.Y );
                    //shapePts.push( new THREE.Vector2 ( pt.X, pt.Y ) );

                    //var opShape = new THREE.Shape( shapePts );
                    var points = opShape.createPointsGeometry();
                    //var spacedPoints = opShape.createSpacedPointsGeometry( 100 );

                    // flat shape
                    var geometry = new THREE.ShapeGeometry( opShape );
                    var material = new THREE.LineBasicMaterial( {
                        color: 0xff0000,
                        transparent: true,
                        opacity: 0.8
                    });
                    //var line = new THREE.Line( geometry, material );
                    //line.position.setZ( z );
                    //console.log("adding shape line for overlap area. line:", line);
                    //this.sceneAdd(line);

                    /*
                    var mesh = THREE.SceneUtils.createMultiMaterialObject( geometry, [ new THREE.MeshLambertMaterial( { color: 0x0000ff, transparent: true, opacity: 0.1 } ), new THREE.MeshBasicMaterial( { color: 0x000000, wireframe: true, transparent: true } ) ] );
               mesh.position.setZ( z + 0.5);

                    this.obj3dmeta.scene.add (new THREE.FaceNormalsHelper( mesh, 10 ));
                    this.obj3dmeta.scene.add (new THREE.VertexNormalsHelper( mesh, 10 ));
                    */
                    //this.sceneAdd( mesh );

                    //this.sceneAdd(new THREE.VertexNormalsHelper( mesh, 10 ));
                    points.faces.push( new THREE.Face3( 0, 1, 2 ) );
                    console.log("linePts before calculating normals:", points);
                    points.computeFaceNormals();
                    points.computeVertexNormals();
                    console.log("linePts after calculating normals:", points);
                    var linePts = new THREE.Line( points, material );
                    linePts.position.setZ( z + 1.0 );
                    //scene.add( new THREE.FaceNormalsHelper( mesh, 10 ) );
               //linePts.add( new THREE.VertexNormalsHelper( points, 10 ) );

                    /*
               var helper = new THREE.WireframeHelper( mesh );
               helper.material.depthTest = false;
               helper.material.opacity = 0.25;
               helper.material.transparent = true;
               scene.add( helper );

               scene.add( new THREE.BoxHelper( mesh ) );
                    */
                    //this.sceneAdd(linePts);

                    /*
                    var shape = opShape;

                    var extrudeSettings = {
                        amount: 0.2,
                        bevelSize: -0.1,
                        bevelThickness: 0.05
                    }; // bevelSegments: 2, steps: 2 , bevelSegments: 5, bevelSize: 8, bevelThickness:5
                    extrudeSettings.bevelEnabled = false;

                    //extrudeSettings.bevelSegments = 2;
                    //extrudeSettings.steps = 2;

                    var geometry = new THREE.ExtrudeGeometry( shape, extrudeSettings );

                    var opMesh = new THREE.Mesh( geometry, new THREE.MeshBasicMaterial( { color: 0x0000ff, wireframe: true, transparent: true, opacity: 0.2 } ) );

                    opMesh.position.setZ( z + 1.5 );
                    opMesh.geometry.computeFaceNormals();
                    opMesh.geometry.computeVertexNormals();
                    this.obj3dmeta.scene.add(opMesh);
                    vhelper1 = new THREE.VertexNormalsHelper( opMesh, 0.2, 0xff0000 );
                    this.obj3dmeta.scene.add( vhelper1 );
                    console.log("vhelper1:", vhelper1);
                    vhelper1.update();
                    */

                    /*
               var mesh = THREE.SceneUtils.createMultiMaterialObject( geometry, [ new THREE.MeshLambertMaterial( { color: 0x0000ff, transparent: true, opacity: 0.1 } ), new THREE.MeshBasicMaterial( { color: 0x000000, wireframe: true, transparent: true } ) ] );
               //mesh.position.set( x, y, z - 75 );
               //mesh.rotation.set( rx, ry, rz );
               //mesh.scale.set( s, s, s );
                    mesh.position.setZ( z + 1.5);
                    this..add( new THREE.FaceNormalsHelper( mesh, 10 ) );
               mesh.add( new THREE.VertexNormalsHelper( mesh, 10 ) );
               this.sceneAdd( mesh );
                    */

                    //}

                }
                z += 2;

            }


            // for debug, let's rejoin the overlap
            /*
            var rejoinedModPaths = [];
            var z = 5;
            for (var i = 0; i < modPaths.length; i++) {
                // we need to inflate to get an overlap so the union works
                //var inflOverlapPaths = this.getInflatePath(overlapPaths[i], 0.001);
                //this.drawClipperPaths(inflOverlapPaths, 0xff00ff, 0.9, z);
                var allPaths = [modPaths[i]];
                allPaths = allPaths.concat(overlapPaths[i]);
                var rmp = this.getUnionOfClipperPaths(allPaths);
                //var rmp = this.getUnionOfClipperPaths(overlapPaths[i], [modPaths[i]]);
                console.log("rmp:", rmp, "orig modPath:", [modPaths[i]], "allPaths:", allPaths, "overlapPaths:", overlapPaths[i]);
                if (rmp.length > 1) console.warn("unioned rejoinedModPath had more than one path");
                rejoinedModPaths.push(rmp[0]);
                z += 5;
            }

            // draw the rejoined mod paths
            //this.drawClipperPaths(rejoinedModPaths, 0xff0000, 0.9, 5);
            var z = 5;
            rejoinedModPaths.forEach(function(p) {
                this.drawClipperPaths([p], 0xff0000, 0.9, z);
                z += 5;
            }, this);
            */

            return retPaths;
        },
        // Must pass in indentically indexed arrays
        getAdjoiningAndNonAdjoiningPointsForAPathAndOverlap: function(mainPaths, overlapPaths, debug) {
            // we will return two arrays with the same amount of indexes
            // find the edge adjoining the main path
            var overlapPathsAdjoiningEdgePoints = [];
            var overlapPathsNonAdjoiningEdgePoints = [];
            for (var i = 0; i < mainPaths.length; i++) {
                var mp = mainPaths[i];
                var op = overlapPaths[i];
                overlapPathsAdjoiningEdgePoints[i] = [];
                overlapPathsNonAdjoiningEdgePoints[i] = [];
                // find where points on overlap path match/don't match modpath
                for (var oi = 0; oi < op.length; oi++) {
                    var curOverlapPath = op[oi];
                    // loop thru points on this overlap path
                    for (var pi = 0; pi < curOverlapPath.length; pi++) {
                        var pt = curOverlapPath[pi];
                        if (this.getIsPointOnPath(pt, mp)) {
                            overlapPathsAdjoiningEdgePoints[i].push(pt);
                        } else {
                            overlapPathsNonAdjoiningEdgePoints[i].push(pt);
                        }
                    }
                }
            }
            console.log("overlapPathsAdjoiningEdgePoints:", overlapPathsAdjoiningEdgePoints, "overlapPathsNonAdjoiningEdgePoints:", overlapPathsNonAdjoiningEdgePoints);

            // we now know what points are on the edge of the main path
            // we also know what points are not on the edge so we can pull those in

            // for debug, let's draw particles over adjoining and non-adjoining
            if (debug) {
                var z = 2;
                //var z = 0.0;
                for (var i = 0; i < mainPaths.length; i++) {
                    //if (i > 3) continue; // only draw a couple
                    var curOp = overlapPathsAdjoiningEdgePoints[i];
                    var curOpNon = overlapPathsNonAdjoiningEdgePoints[i];
                    console.log("working on overlapPathsAdjoiningEdgePoints. curOp:", curOp);
                    for (var i2 = 0; i2 < curOp.length; i2++) {
                        // we are into our point array, draw particles
                        var pt = curOp[i2];
                        //console.log("drawing particle for pt:", pt);

                        this.drawParticle(pt.X, pt.Y, z, 0xff0000, 0.2, 0.1);
                    }
                    console.log("working on overlapPathsNonAdjoiningEdgePoints. curOpNon:", curOpNon);
                    for (var i2 = 0; i2 < curOpNon.length; i2++) {
                        // we are into our point array, draw particles
                        var pt = curOpNon[i2];
                        //console.log("drawing particle for pt:", pt);

                        this.drawParticle(pt.X, pt.Y, z, 0x00ff00, 0.2, 0.1);
                    }
                    z += 2;
                }
            }
            return { adjoining: overlapPathsAdjoiningEdgePoints, non: overlapPathsNonAdjoiningEdgePoints };
        },
        getIsPointOnPath: function(pt, path) {
            var ret = false;
            for (var i = 0; i < path.length; i++) {
                var pt2 = path[i];
                if (pt.X == pt2.X && pt.Y == pt2.Y) {
                    ret = true;
                    i = path.length; // to cancel for
                }
            }
            return ret;
        },
        threeLyric: [],
        lyricTrendRemove: function() {
            // remove old
            this.threeLyric.forEach(function(threeItem) {
                this.sceneRemove(threeItem);
            }, this);
            this.threeLyric = [];
        },
        lyricTrend: function(paths) {
            console.group("lyricTrend");
            // find all overlaps
            // loop thru each path item and see if overlaps with others
            // if it does, average the paths and return the new path

            //debugger;
            this.lyricTrendRemove();

            var defltMult = [50,25,15,10,8,6,5,4,3,2,1.5,1.25,1.125,1.115,1.100,1.050,1.01,1.001, 1.0001, 1.00001];
            //defltMult = defltMult.reverse();

            var xorPathZ = 0;
            var resPathZ = 5;
            var finalPathZ = 0.1;
            var alreadyMatched = {};

            // this will hold the new average lines we have to add to our modified paths
            // that have had an intersection removed to make room for the new average line
            var newAvgLinesToAddToAPath = {};

            // keep track of paths to remove out of the final milling paths
            // these are paths that are on the inside of other paths and should not get milled
            var pathsToRemoveFromFinal = [];

            // loop thru all paths (we're likely given the entire pcb board)
            for(var i = 0; i < paths.length; i++) {
                var curPath = paths[i];

                // compare the path to ALL other paths. this is processor intensive.
                // if the path intersects with another, we got work to do to average the paths
                for (var i2 = 0; i2 < paths.length; i2++) {
                    if (i2 == i) continue; // skip ourselves

                    // see if we already had a match on this pair, cuz
                    // we'll get two matches as we loop thru the for loop
                    // meaning we'll get a double match on path1 to path2 and
                    // then the second (double) on path2 to path1, which we don't
                    // want to happen
                    if (alreadyMatched[i + ":" + i2] || alreadyMatched[i2 + ":" + i]) {
                        console.log("already matched");
                        continue;
                    }

                    // record that we got a match here
                    alreadyMatched[i + ":" + i2] = true;

                    var compPath = paths[i2];
                    var resPath = this.getIntersectionOfClipperPaths([curPath], [compPath]);
                    console.log("resPath:", resPath);

                    // this var will hold the new averaged points that we calculate
                    // we'll have to add this to each path
                    var ptsOfNewAvgLineArr = [];

                    // if there is a resulting intersection path, we know these signals overlap
                    // in that case we have to do the hard work of averaging that overlap
                    // to get a milling center line. this is NOT easy, but we need to do it to
                    // be the best pcb milling conversion tool out there.
                    if (resPath.length > 0) {
                    //if (false) {
                        console.log("we found an overlap at i:", i, "i2:", i2);



                        // there was an overlap.
                        // we could have, and likely will, end up with multiple paths
                        var ctrResPathIndex = 0;
                        resPath.forEach(function(ip) {

                            console.log("working on intersection path:", ip);

                            // we need to inflate the ip path a tiny tiny tiny bit just to make
                            // sure we get ok overlap on our xor operations
                            var ipTinyInflate = this.getInflatePath([ip], 0.001);
                            if (ipTinyInflate.length > 1) console.error("ipTinyInflate had more than 1 path. should not happen!!! ipTinyInflate:", ipTinyInflate);
                            var ipTinyInflate = ipTinyInflate[0];
                            //var threeItem = this.drawClipperPaths(ipTinyInflate, 0xff00ff, 0.99, resPathZ);
                            //this.threeLyric.push(threeItem);
                            //ip = ipTinyInflate[0];

                            // sample preview the resPath ip (intersection path)
                            //var threeItem = this.drawClipperPaths([ip], 0xff0000, 0.99, resPathZ);
                            //resPathZ += 0.5;
                            //this.threeLyric.push(threeItem);

                            // let's try an approach where we see where these two paths
                            // intersect eachother. they will intersect on a line, not
                            // on a point, so we need to calculate their intersections
                            // wish the clipperjs library did this for us
                            /*
                            var ctr1 = 0;
                            curPath.forEach(function(pt1) {
                                var ctr2 = 0;
                                compPath.forEach(function(pt2) {
                                    var nextPt1 = (ctr1 + 1) >= curPath.length ? curPath[0] : curPath[ctr1 + 1];
                                    var nextPt2 = (ctr2 + 1) >= compPath.length ? compPath[0] : compPath[ctr2 + 1];
                                    var isIntersect = this.getIntersectionPointOfTwoLines(pt1.X, pt1.Y, nextPt1.X, nextPt1.Y, pt2.X, pt2.Y, nextPt2.X, nextPt2.Y);

                                    //console.log("isIntersect:", isIntersect);
                                    if (isIntersect.intersect == 2) {
                                        console.log("found isIntersect:", isIntersect);
                                        // yay! we have an intersection.
                                        // draw particle for debug
                                        var threeParticle = this.drawParticle(isIntersect.x, isIntersect.y, 0.1, 0xff0000, 0.99);
                                        this.threeLyric.push(threeParticle);
                                    }

                                    ctr2++;
                                }, this);
                                ctr1++;
                            }, this);
                            */

                            // let's try an approach where we average the points
                            // along the new shape. we need the start/end points
                            // first which is the points closest (matching) the
                            // points in the Xor of the two paths

                            //var xorPath1 = this.getXorOfClipperPaths([curPath], [ip]);
                            //var xorPath2 = this.getXorOfClipperPaths([compPath], [ip]);
                            //var xorPath1 = this.getXorOfClipperPaths([curPath], [ipTinyInflate]);
                            //var xorPath2 = this.getXorOfClipperPaths([compPath], [ipTinyInflate]);
                            //var xorPath1 = this.getDiffOfClipperPaths([curPath], [ipTinyInflate]);
                            //var xorPath2 = this.getDiffOfClipperPaths([compPath], [ipTinyInflate]);
                            var xorPath1 = this.getDiffOfClipperPaths([curPath], [ip]);
                            //curPath = xorPath1[0];
                            var xorPath2 = this.getDiffOfClipperPaths([compPath], [ip]);
                            //compPath = xorPath2[0];

                            //xorPathZ -= 1.0;
                            //var threeItem = this.drawClipperPaths(xorPath1, 0xff0000, 0.99, xorPathZ);
                            //this.threeLyric.push(threeItem);
                            //xorPathZ -= 0.1;
                            //var threeItem = this.drawClipperPaths(xorPath2, 0x00ff00, 0.99, xorPathZ);
                            //this.threeLyric.push(threeItem);

                            // where any points are equal is our start/end point
                            if (xorPath1.length > 1) {
                                console.error("xorPath1 got more than one path. should not happen. xorPath1:", xorPath1);
                                // this can happen when there is an inside path cutting out, so
                                // i think we can safely ignore because we are just trying
                                // to find out where to average a path for a center line mill
                                // and an inside cut doesn't need to be averaged.
                                pathsToRemoveFromFinal.push({i:i, i2:i, curPath: curPath, compPath: compPath, ip: ip, xorPath1: xorPath1});
                                //return;
                                xorPathZ += 2.5;
                                this.drawClipperPaths(xorPath1, 0xff0000, 0.99, xorPathZ);


                                // let's use the smaller of the paths, which will be the 2nd path
                                //xorPath1 = [xorPath1[1]];
                            }
                            if (xorPath2.length > 1) {
                                console.error("xorPath2 got more than one path. should not happen. xorPath2:", xorPath2);
                                pathsToRemoveFromFinal.push({i:i, i2:i, curPath: curPath, compPath: compPath, ip: ip, xorPath2: xorPath2 });
                                xorPathZ += 2.5;
                                this.drawClipperPaths(xorPath2, 0xff0000, 0.99, xorPathZ);
                                //return;
                                // let's use the smaller of the paths, which will be the 2nd path
                                //xorPath2 = [xorPath2[1]];
                            }

                            if (xorPath1.length == 0) {
                                console.warn("xorPath1 is empty.");
                                return;
                            }
                            if (xorPath2.length == 0) {
                                console.warn("xorPath2 is empty.");
                                return;
                            }
                            var ptsEqualArr = this.getEqualPointsFromTwoPaths(xorPath1[0], xorPath2[0]);
                            console.log("got ptsEqualArr:", ptsEqualArr);

                            // draw the points for debug purposes
                            var newPts = [];
                            ptsEqualArr.forEach(function(ptPair) {
                                this.drawParticle(ptPair.pt1.X, ptPair.pt1.Y, 0.0);
                                newPts.push({X:ptPair.pt1.X, Y:ptPair.pt1.Y, ptPair:ptPair});
                            }, this);

                            // double check that the matching points also exist in the ip path
                            var ptsEqualArr2 = this.getEqualPointsFromTwoPaths(newPts, ip);
                            console.log("got ptsEqualArr2:", ptsEqualArr);

                            // draw the points for debug purposes
                            ptsEqualArr2.forEach(function(ptPair) {
                                this.drawParticle(ptPair.pt1.X, ptPair.pt1.Y, 0.01, 0x00ff00);
                            }, this);

                            // we tend to get more than two points due to the xor'ing operation
                            // so to figure out what the true start/end is of each shape, we want
                            // to see what point is brand new in the ip path vs what was in the
                            // original curPath or compPath. we should be able to merge curPath
                            // and compPath into one array. then compare equal points on the ip path
                            // and the points on the ip path that are new is our start/end point
                            // WARNING. i believe there's a chance we could have the start/end be
                            // a point that did exist before
                            var ptsFinalArr = [];
                            if (ptsEqualArr.length > 2) {
                                console.log("we got more equal points than we wanted. ptsEqualArr:", ptsEqualArr);
                                // see which of these points exists on either of curPath or compPath
                                // because whichever ones do, we toss them
                                // merge curPath and compPath
                                var curCompPath = curPath.concat(compPath);
                                ptsEqualArr.forEach(function(ptPair) {
                                    //var didPtsMatch = this.getEqualPointsFromTwoPaths([ptPair.pt1], ip);
                                    var didPtsMatch = [];
                                    var isMatch = false;
                                    curCompPath.some(function(ptOnOrigPaths) {
                                        if (ptPair.pt1.X == ptOnOrigPaths.X && ptPair.pt1.Y == ptOnOrigPaths.Y) {
                                            //didPtsMatch.push(ptOnOrigPaths);
                                            isMatch = true;
                                            return true; // breaks loop
                                        }
                                    }, this);

                                    if (isMatch) {
                                        // yes, points matched, that means they're no good
                                        //console.log("points did match. toss em.",ptPair.pt1, ip);
                                    } else {

                                        console.log("points did not match, so this point is a new one which means its a start/end", ptPair.pt1, ip);
                                        ptsFinalArr.push(ptPair.pt1);
                                    }
                                }, this);
                                console.log("final set of points that should be exact start/end. ptsFinalArr:", ptsFinalArr);
                                // draw for debug purposes
                                ptsFinalArr.forEach(function(pt) {
                                    //var pt = ptsFinalArr[0];
                                    this.drawParticle(pt.X, pt.Y, 0.02, 0x00ffff, 0.99);
                                }, this);

                                // if we get a situation where we did not find a new point
                                // then we are in rough shape. throw a console error
                                if (ptsFinalArr.length < 2) {
                                    console.error("uh oh. we could not determine the start/end point of the overlapping path. this is because a rare case happened where the start/end was an exact point on one of the overlapping paths. we are going to randomly pick the furthest two points.");
                                    // if at leaset we got one point that was new, that's not so bad
                                    // lets at least use that data
                                    // actually, just use furthestpoints
                                    var arr = [];
                                    ptsEqualArr.forEach(function(ptPair) {
                                        arr.push({X:ptPair.pt1.X, Y:ptPair.pt1.Y});
                                    });
                                    var furthestPoints = this.getFurthestPointPair(arr);
                                    furthestPoints.forEach(function(pt) {
                                        ptsFinalArr.push(pt);
                                    });
                                }
                            } else {
                                // just use the original two points we found cuz they're good
                                ptsEqualArr.forEach(function(ptPair) {
                                    ptsFinalArr.push(ptPair.pt1);
                                });
                            }

                            // draw for debug purposes
                            ptsFinalArr.forEach(function(pt) {
                                this.drawParticle(pt.X, pt.Y, 0.04, 0xff00ff, 0.99);
                            }, this);

                            // show it
                            //var threeItem = this.drawClipperPaths(ip, 0xff0000, 0.99, 0.1);
                            //this.threeLyric.push(threeItem);

                            var ptAvg = [];
                            var ptAvgClipperPt1 = [];
                            var ptAvgClipperPt2 = [];

                            // push original furthestPoint
                            var furthestPoints = this.getFurthestPointPair(ip);
                            console.log("orignal path furthestPoints:", furthestPoints);
                            ptAvg.push(furthestPoints);
                            ptAvgClipperPt1.push(furthestPoints.pt1);
                            ptAvgClipperPt2.push(furthestPoints.pt2);

                            // lets also deflate to visualize
                            // deflate by delfMult arr
                            for (var dctr = 0; dctr < defltMult.length; dctr++) {
                                var deflNum = defltMult[dctr];
                                var deflateBy = (this.inflateMillPathBy / deflNum) * -1
                                var resDeflPath = this.getInflatePath([ip], deflateBy);
                                if (resDeflPath.length > 0) {
                                    console.log("there was a path after deflating the overlap by N:", deflNum, "resDeflPath.length:", resDeflPath.length);
                                    if (resDeflPath.length > 1) {
                                        console.warn("got multiple paths on deflate:", resDeflPath);
                                    }
                                    var z = (dctr * 0.1) + 0.5;
                                    //var threeDefl = this.drawClipperPaths(resDeflPath, 0xff0000, 0.2, z);
                                    //this.threeLyric.push(threeDefl);

                                    // loop thru the defalted path (could be multiple paths)
                                    resDeflPath.forEach(function(dp) {
                                        var furthestPoints = this.getFurthestPointPair(dp);
                                        console.log("furthestPoints:", furthestPoints);
                                        // draw the furthest points
                                        //this.drawParticle(furthestPoints.pt1.X, furthestPoints.pt1.Y, z);
                                        //this.drawParticle(furthestPoints.pt2.X, furthestPoints.pt2.Y, z);
                                        //var threeLine = this.drawClipperPaths([[furthestPoints.pt1, furthestPoints.pt2]], 0x00ff00, 0.99, z + 0.05, 0, false);

                                        // add pts to array
                                        ptAvg.push(furthestPoints);
                                        ptAvgClipperPt1.push(furthestPoints.pt1);
                                        ptAvgClipperPt2.push(furthestPoints.pt2);
                                        //this.threeLyric.push(threeLine);
                                    }, this);
                                } else {
                                    // since we got no path on the deflate, we're done
                                    // make for loop exit
                                    console.log("forcing exit of deflate loop to not waste processor time.");
                                    dctr = defltMult.length;
                                }
                            }

                            // we now have all points to draw our
                            // averaged line
                            // they're in 2 arrays and we have
                            // to splice together

                            var pts = ptAvgClipperPt2.reverse();
                            pts.forEach(function(pt) {
                                ptAvgClipperPt1.push(pt);
                            });
                            // we know last point is good, so remove it
                            var lastPt = ptAvgClipperPt1.pop();

                            var ptsByDist = this.getPointsSortedByDist(ptAvgClipperPt1);
                            ptsByDist.push(lastPt);
                            console.log("about to draw averaged path:", ptsByDist);
                            //var threeSortedLine = this.drawClipperPaths([ptsByDist], 0x00ffff, 0.99, 0, 0.0, false);
                            //this.threeLyric.push(threeSortedLine);

                            // WOW. We finally have our new line points
                            //ptsOfNewAvgLineArr.push(ptsByDist);
                            if (newAvgLinesToAddToAPath[i] === undefined) newAvgLinesToAddToAPath[i] = [];
                            if (newAvgLinesToAddToAPath[i2] === undefined) newAvgLinesToAddToAPath[i2] = [];
                            newAvgLinesToAddToAPath[i].push(ptsByDist);
                            newAvgLinesToAddToAPath[i2].push(ptsByDist);

                            // we should now have a good line that is the average
                            // of the intersecting mill paths. the task now is
                            // to combine that line into the path and clip it so
                            // we get our endmill right in the middle. to do this
                            // we have to match up where our new line matches a
                            // point on each signal mill path. we should have two
                            // matching vertices for that, however, in some cases
                            // we won't so we'll have to artificially figure that
                            // out. the way to do that is to Xor the two paths
                            // and see which points match on the Xor. those two
                            // points will be our end caps for the new line.
                            //this.getXorOfClipperPaths(



                            ctrResPathIndex++;

                        }, this);



                    } // if respath.length statement

                    if (resPath.length > 0) {

                        resPath.forEach(function(ip) {
                            // remove this from the full original path
                            var newIp = this.getInflatePath([ip], 0.001, ClipperLib.JoinType.jtSquare);
                            //var newIp = [ip];
                            var newPath1 = this.getDiffOfClipperPaths([paths[i]], newIp);
                            if (newPath1.length > 1) {
                                for (var index = 1; index < newPath1.length; index++) {
                                    this.drawClipperPaths(newPath1[index], 0xff0000, 0.99, finalPathZ);
                                    finalPathZ += 0.5;
                                }
                            }
                            // now add our new average line
                            //var newAvgPath1 = this.getUnionOfClipperPaths(newPath1, [ptsOfNewAvgLine]);
                            /*
                            if (newAvgLinesToAddToAPath[i] === undefined) newAvgLinesToAddToAPath[i] = [];
                            if (newAvgLinesToAddToAPath[i2] === undefined) newAvgLinesToAddToAPath[i2] = [];
                            newAvgLinesToAddToAPath[i].push(ptsOfNewAvgLineArr);
                            newAvgLinesToAddToAPath[i2].push(ptsOfNewAvgLineArr);
                            */
                            //var threeSortedLine = this.drawClipperPaths([ptsByDist], 0x00ffff, 0.99, 0, 0.0, false);
                            paths[i] = newPath1[0]; //[]; //newAvgPath1[0]; //newPath1[0];
                            var newPath2  = this.getDiffOfClipperPaths([paths[i2]], newIp);
                            if (newPath2.length > 1) {
                                for (var index = 1; index < newPath2.length; index++) {
                                    this.drawClipperPaths(newPath2[index], 0x00ff00, 0.99, finalPathZ);
                                    finalPathZ += 0.5;
                                }
                            }
                            paths[i2] = newPath2[0];
                        }, this);
                    }

                    if (false) { //if (resPath.length > 0) {
                        var newResPath = this.getInflatePath(resPath, 0.1);
                        var newResPath = resPath;
                        var newCurPath = this.getDiffOfClipperPaths([curPath], newResPath);
                        this.drawClipperPaths(newCurPath, 0xff0000, 0.99, finalPathZ);
                        //finalPathZ += 0.5;
                        console.log("previous curPath:", [curPath], "newCurPath:", newCurPath);
                        //curPath = newCurPath[0];
                        //paths[i] = curPath;
                        var newCompPath = this.getDiffOfClipperPaths([compPath], newResPath);
                        this.drawClipperPaths(newCompPath, 0x00ff00, 0.99, finalPathZ);
                        finalPathZ += 1;
                        //compPath = newCompPath[0];
                        //paths[i2] = compPath;
                    }
                    //this.drawClipperPaths([compPath], 0xff0000, 0.99, finalPathZ);

                } // i2 loop
            } // i loop

            // wow. damn. ok. we now have new paths in the paths[] arr that have the
            // intersections removed. we also have nice lines that need to get inserted
            // into the paths for each path now
            // find the point in the path that is closest to the start/end of ptsOfNewAvgLine
            //ptsOfNewAvgLine
            console.log("newAvgLinesToAddToAPath:", newAvgLinesToAddToAPath);

            for (var key in newAvgLinesToAddToAPath) {
                var avgPaths = newAvgLinesToAddToAPath[key];
                var mainPath = paths[key];
                console.log("key:", key, "mainPath:", mainPath, "avgPaths:", avgPaths);
                // loop thru each line to add
                avgPaths.forEach(function(ap) {
                    // find closest point in mainPath to the start of
                    console.log("concatting ap:", ap);
                    //this.drawClipperPaths([ap], 0xff0000, 0.99, 0, 0, false);
                    var startPt = ap[0];
                    var endPt = ap[ap.length-1];
                    var indexOfClosestToStart = this.getIndexOfClosestPointInPath(startPt, mainPath);
                    var indexOfClosestToEnd = this.getIndexOfClosestPointInPath(endPt, mainPath);
                    var spt = mainPath[indexOfClosestToStart];
                    var ept = mainPath[indexOfClosestToEnd];
                    this.drawParticle(spt.X, spt.Y, 0, 0xff0000, 0.5, 1);
                    this.drawParticle(ept.X, ept.Y, 0, 0xff00ff, 0.5, 1);
                    var len = indexOfClosestToEnd - indexOfClosestToStart;
                    console.log("len:", len, "indexOfClosestToStart:", indexOfClosestToStart, "indexOfClosestToEnd:", indexOfClosestToEnd);
                    /*
                    if (len > 0) {
                        // remove points in mainPath that are between these indexes
                        mainPath.splice(indexOfClosestToStart, indexOfClosestToEnd - indexOfClosestToStart);
                        var ctr = 0;
                        ap.forEach(function(pt) {
                            mainPath.splice(indexOfClosestToStart + ctr, 0, pt);
                            ctr++;
                        },this);

                    } else {
                        mainPath.splice(indexOfClosestToEnd, indexOfClosestToStart - indexOfClosestToEnd);
                        var ctr = 0;
                        ap.forEach(function(pt) {
                            mainPath.splice(indexOfClosestToEnd + ctr, 0, pt);
                            ctr++;
                        },this);
                    }
                    */
                    //mainPath.concat(ap);
                }, this);

                //console.log("appended mainPath:", mainPath);
                paths[key] = mainPath;
            }

            // see if there were any inside paths we want to remove
            //console.log("pathsToRemoveFromFinal:", pathsToRemoveFromFinal);

            console.groupEnd();
        },
        getIndexOfClosestPointInPath: function(point, path) {
            var minDist = 100000.0;
            var index = null;
            for (var i = 0; i < path.length; i++) {

                var pt2 = path[i];
                var dist = this.lineDistance2d( point, pt2 );
                if (dist < minDist) {
                    minDist = dist;
                    // store index of closest pt
                    index = i;
                }
            }
            return index;

        },
        getIntersectionPointOfTwoLines: function(x1, y1, x2, y2, x3, y3, x4, y4) {

            var DONT_INTERSECT = 0;
            var COLLINEAR = 1;
            var DO_INTERSECT = 2;

            var a1, a2, b1, b2, c1, c2;
            var r1, r2 , r3, r4;
            var denom, offset, num;

            // Compute a1, b1, c1, where line joining points 1 and 2
            // is "a1 x + b1 y + c1 = 0".
            a1 = y2 - y1;
            b1 = x1 - x2;
            c1 = (x2 * y1) - (x1 * y2);

            // Compute r3 and r4.
            r3 = ((a1 * x3) + (b1 * y3) + c1);
            r4 = ((a1 * x4) + (b1 * y4) + c1);

            // Check signs of r3 and r4. If both point 3 and point 4 lie on
            // same side of line 1, the line segments do not intersect.
            if ((r3 != 0) && (r4 != 0) && this.same_sign(r3, r4)){
                return { intersect: DONT_INTERSECT };
            }

            // Compute a2, b2, c2
            a2 = y4 - y3;
            b2 = x3 - x4;
            c2 = (x4 * y3) - (x3 * y4);

            // Compute r1 and r2
            r1 = (a2 * x1) + (b2 * y1) + c2;
            r2 = (a2 * x2) + (b2 * y2) + c2;

            // Check signs of r1 and r2. If both point 1 and point 2 lie
            // on same side of second line segment, the line segments do
            // not intersect.
            if ((r1 != 0) && (r2 != 0) && (this.same_sign(r1, r2))){
                return { intersect: DONT_INTERSECT };
            }

            //Line segments intersect: compute intersection point.
            denom = (a1 * b2) - (a2 * b1);

            if (denom == 0) {
                return { intersect: COLLINEAR, denom: denom };
            }

            if (denom < 0){
                offset = -denom / 2;
            }
            else {
                offset = denom / 2 ;
            }

            // The denom/2 is to get rounding instead of truncating. It
            // is added or subtracted to the numerator, depending upon the
            // sign of the numerator.
            num = (b1 * c2) - (b2 * c1);
            var x;
            if (num < 0){
                x = (num - offset) / denom;
            }
            else {
                x = (num + offset) / denom;
            }

            num = (a2 * c1) - (a1 * c2);
            var y;
            if (num < 0){
                y = ( num - offset) / denom;
            }
            else {
                y = (num + offset) / denom;
            }

            // lines_intersect
            return { intersect: DO_INTERSECT, x: x, y: y };
        },
        same_sign: function(a, b){

            return (( a * b) >= 0);
        },
        getEqualPointsFromTwoPaths: function(path1, path2) {
            var ret = []; //{ptIndex: [], pt: null, pt2Index: null, pt2: null, isMoreThan2EqualPoints: false};
            // there could be more than two equal points, so warning
            for (var i = 0; i < path1.length; i++) {
                var pt1 = path1[i];
                for (var i2 = 0; i2 < path2.length; i2++) {
                    var pt2 = path2[i2];
                    if (pt1.X == pt2.X && pt1.Y == pt2.Y) {
                        // we have a match
                        ret.push({indexPath1: i, indexPath2: i2, pt1:pt1, pt2:pt2});
                    }
                }
            }
            return ret;
        },
        getPointsSortedByDist: function(pts) {
            // take a list of points and sort by distance
            // the pts[] array must have start point in first position
            var p = [];
            var ptStart = pts[0];
            p.push(ptStart);
            pts.shift(); // remove start point from array
            // loop thru 2nd point to end
            while (pts.length > 0) {
                //var pt = pts[i];
                var minDist = 100000.0;
                var index = null;
                // loop thru other points to find closest
                for (var i = 0; i < pts.length; i++) {

                    var pt2 = pts[i];
                    var dist = this.lineDistance2d( ptStart, pt2 );
                    if (dist < minDist) {
                        minDist = dist;
                        // store index of closest pt
                        index = i;
                    }
                }
                // we now have the closest point by index
                p.push(pts[index]);
                // remove this item from array
                pts.splice(index,1);
            }
            return p;
        },
        drawParticle: function(x, y, z, color, opacity, size) {
            var geometry = new THREE.Geometry();

            var vertex = new THREE.Vector3();
            vertex.x = x;
            vertex.y = y;
            vertex.z = z;

            geometry.vertices.push( vertex );

            var material = new THREE.PointCloudMaterial( {
                color: color ? color : 0xff0000,
                transparent: true,
                opacity: opacity ? opacity : 0.2,
                size: size ? size : 0.05
            } );

            var particle = new THREE.PointCloud( geometry, material );

            this.sceneAdd( particle );
            //console.log("just added particle:", particle);
            return particle;

        /*
            var particleMaterial = new THREE.ParticleBasicMaterial({
                color: color ? color : 0x000000,
                transparent: true,
                opacity: opacity ? opacity : 0.5,
                size: 20
            });
            var particle = new THREE.Sprite( particleMaterial );
            particle.position.set(x, y, z );
            //particle.scale.x = particle.scale.y = 16;
            this.sceneAdd( particle );
            return particle;
            */
        },
        dirtyPts: {}, // stores points we already averaged, so they don't get averaged twiced
        magicWandWebWorker: function(paths, threshold, callback) {
            // Build a worker from an anonymous function body
            var blobURL = URL.createObjectURL(
                new Blob([
                    '(',
                    this.magicWandInline.toString(),
                    ')()' ],
                         { type: 'application/javascript' }
                        )
            );

            // Start the worker.
            worker = new Worker( blobURL );
            console.log("created worker at blobURL:", blobURL);
            worker.onmessage = function(e) {
                //console.log("Received in main thread: " + e.data);
                // eval it
                console.log("about to json parse e.data: ", e.data);
                var result = $.parseJSON(e.data);
                //console.log("worker.onmessage. result:", result);
                if (result.cmd == "progressMagicWand") {
                    console.log("we got a progress indicator:", result.data);
                } else if (result.cmd == "resultMagicWand") {
                    console.log("we got final result from magicWand:", result.data);
                    callback(result.data);
                } else {
                    console.log("got back cmd from worker we did not understand.");
                }
            }
            //worker.postMessage("console.log('this was evaled inside worker');");
            var msg = "postMessage(JSON.stringify(mw.magicWand(" + JSON.stringify(paths) + ", " + threshold + ")));";
            //console.log("about to post code to webworker. msg:", msg);
            worker.postMessage(msg);
            // Won't be needing this anymore
            URL.revokeObjectURL( blobURL );
        },
        magicWandInline: function() {

            self.onmessage = function(e) {
                //console.log('this is a console msg from worker:', e);
                console.log('this is a console msg from worker. e.length:', e.data.length);
                //console.log('evaling e.data:', e.data);
                //console.log('mw:', mw);
                eval(e.data);
            };
            //postMessage('i am running');
            var mw = {
                paths: null,
                threshold: null,
                magicWand: function(paths, threshold) {
                    // we will iterate through each path and compare
                    // against the other paths. we'll measure the distance
                    // and if it is within our length we will average the
                    // points in both paths
                    //return;
                    console.group("magicWand");

                    // return obj
                    var ret = {
                        path: [],
                        dirtyPts: null,
                        ptsWanded: 0
                    }

                    //if (paths === undefined || paths == null)
                    //    paths = this.paths;
                    //if (threshold === undefined || threshold == null)
                    //    threshold = this.threshold;
                    this.dirtyPts = {};
                    var halfThresh = threshold / 2;

                    console.log("about to execute magicWand. paths.length:", paths.length, "threshold:", threshold);

                    // do on X axis, then Y axis
                    var ctr = 0;
                    for(var i = 0; i < paths.length; i++) {
                        postMessage( JSON.stringify({
                            cmd:"progressMagicWand",
                            data: {
                                i:i,
                                percent: i/paths.length,
                                total: paths.length
                            }
                        }));
                        for(var j = 0; j < paths[i].length; j++) {
                            var pt = paths[i][j];

                            // now get closest point to this point
                            // from the other paths
                            var closestPt = this.getClosestPointIndexBruteForce({i:i, j:j}, paths);

                            // see if closestPt is within our distance
                            // threshold, cuz if not toss it out
                            if (closestPt.minDist <= threshold) {
                                //console.log("we got a point close enough to this one to analyze it.");

                                this.dirtyPts[closestPt.i+":"+closestPt.j] = true;
                                //console.log("added this pt to dirtyPts:", this.dirtyPts);
                                var pt2 = paths[closestPt.i][closestPt.j];

                                var origPt1 = {X:pt.X, Y:pt.Y};
                                var origPt2 = {X:pt2.X, Y:pt2.Y};

                                // we have a point within range
                                //console.log("we have two points close enough together to magic wand them. pt:", pt, "pt2:", pt2);
                                ctr++;
                                var distX = Math.abs(pt.X - pt2.X);
                                var distY = Math.abs(pt.Y - pt2.Y);

                                // we are going to do two types
                                // of averaging. if dist is half of threshold
                                // then average to make pts match
                                // but if greater than half of threshold,
                                // just do 50% average
                                var shiftX = distX / 2;
                                var shiftY = distY / 2;
                                /*
                        if (closestPt.minDist > halfThresh) {
                            //console.log("got a halfThresh. closestPt.minDist:", closestPt.minDist, "halfThresh", halfThresh);
                            shiftX = distX / 4;
                            shiftY = distY / 4;
                        }
                        */
                                if (pt.X > pt2.X) {
                                    //console.log("pt.X was greater, so subtracting from pt.X and adding to pt2.x");
                                    pt.X = pt.X - shiftX;
                                    pt2.X = pt2.X + shiftX;
                                } else if (pt2.X > pt.X) {
                                    //console.log("pt2.X was greater, so subtracting from pt2.X and adding to pt.x");
                                    pt2.X = pt2.X - shiftX;
                                    pt.X = pt.X + shiftX;
                                } else {
                                    //console.log("pt.X was equal to pt2.X so leaving alone, they're averaged");
                                }

                                if (pt.Y > pt2.Y) {
                                    //console.log("pt.Y was greater, so subtracting from pt.Y and adding to pt2.Y");
                                    pt.Y = pt.Y - shiftY;
                                    pt2.Y = pt2.Y + shiftY;
                                } else if (pt2.Y > pt.Y) {
                                    //console.log("pt2.X was greater, so subtracting from pt2.X and adding to pt.x");
                                    pt2.Y = pt2.Y - shiftY;
                                    pt.Y = pt.Y + shiftY;
                                } else {
                                    //console.log("pt.X was equal to pt2.X so leaving alone, they're averaged");
                                }

                                //console.log("new two points after magic wand them. pt:", pt, "pt2:", pt2);

                                // we now have our new point
                                // store it
                                ret.path.push({
                                    pt1Index: {i:i, j:j},
                                    pt2Index: {i: closestPt.i,
                                               j: closestPt.j},
                                    origPt1: origPt1,
                                    origPt2: origPt2,
                                    newPt1: pt,
                                    newPt2: pt2
                                });

                            }
                        }
                    }

                    console.log("we magic wanded N pts:", ctr);
                    //$('#com-chilipeppr-widget-eagle .magic-wand-ctr').text(ctr);
                    ret.dirtyPts = this.dirtyPts;
                    ret.ptsWanded = ctr;
                    console.groupEnd();
                    return {cmd: "resultMagicWand", data: ret};
                },
                getClosestPointIndexBruteForce: function(pointIndex, paths) {
                    var minDist = 100000.0;
                    var closestPair = {i:null, j:null, minDist:null};
                    var p = paths[pointIndex.i][pointIndex.j];
                    for (var i = 0; i < paths.length; i++) {
                        if (pointIndex.i == i) {
                            //console.log("we need to ignore our own path, so continuing to next i. i:", i, "pointIndex.i:", pointIndex);
                            continue;
                        }
                        for (var j = 0; j < paths[i].length; j++) {

                            // see if we already averaged, if so, continue
                            if (this.dirtyPts[i+":"+j]) {
                                //console.log("found dirty pt. skipping.", i+":"+j);
                                continue;
                            }
                            var q = paths[i][j];
                            var dist = this.lineDistance2d( p, q );
                            if (dist < minDist) {
                                minDist = dist;
                                // store index of closest pt
                                closestPair.i = i;
                                closestPair.j = j;
                            }
                        }
                    }
                    closestPair.minDist = minDist;
                    return closestPair;
                },
                lineDistance2d: function( point1, point2 ) {
                    var xs = 0;
                    var ys = 0;

                    xs = point2.X - point1.X;
                    xs = xs * xs;

                    ys = point2.Y - point1.Y;
                    ys = ys * ys;

                    return Math.sqrt( xs + ys );
                },
            };

        },
        magicWand: function(paths, threshold) {
            // we will iterate through each path and compare
            // against the other paths. we'll measure the distance
            // and if it is within our length we will average the
            // points in both paths
            //return;
            console.group("magicWand");
            this.dirtyPts = {};
            var halfThresh = threshold / 2;

            // do on X axis, then Y axis
            var ctr = 0;
            for(var i = 0; i < paths.length; i++) {
                for(var j = 0; j < paths[i].length; j++) {
                    var pt = paths[i][j];

                    // now get closest point to this point
                    // from the other paths
                    var closestPt = this.getClosestPointIndexBruteForce({i:i, j:j}, paths);

                    // see if closestPt is within our distance
                    // threshold, cuz if not toss it out
                    if (closestPt.minDist <= threshold) {
                        //console.log("we got a point close enough to this one to analyze it.");

                        //this.dirtyPts[closestPt.i+":"+closestPt.j] = true;
                        //console.log("added this pt to dirtyPts:", this.dirtyPts);

                        var pt2 = paths[closestPt.i][closestPt.j];
                        // we have a point within range
                        //console.log("we have two points close enough together to magic wand them. pt:", pt, "pt2:", pt2);
                        ctr++;
                        var distX = Math.abs(pt.X - pt2.X);
                        var distY = Math.abs(pt.Y - pt2.Y);

                        // we are going to do two types
                        // of averaging. if dist is half of threshold
                        // then average to make pts match
                        // but if greater than half of threshold,
                        // just do 50% average
                        var shiftX = distX / 2;
                        var shiftY = distY / 2;
                        /*
                        if (closestPt.minDist > halfThresh) {
                            //console.log("got a halfThresh. closestPt.minDist:", closestPt.minDist, "halfThresh", halfThresh);
                            shiftX = distX / 4;
                            shiftY = distY / 4;
                        }
                        */
                        if (pt.X > pt2.X) {
                            //console.log("pt.X was greater, so subtracting from pt.X and adding to pt2.x");
                            pt.X = pt.X - shiftX;
                            pt2.X = pt2.X + shiftX;
                        } else if (pt2.X > pt.X) {
                            //console.log("pt2.X was greater, so subtracting from pt2.X and adding to pt.x");
                            pt2.X = pt2.X - shiftX;
                            pt.X = pt.X + shiftX;
                        } else {
                            //console.log("pt.X was equal to pt2.X so leaving alone, they're averaged");
                        }

                        if (pt.Y > pt2.Y) {
                            //console.log("pt.Y was greater, so subtracting from pt.Y and adding to pt2.Y");
                            pt.Y = pt.Y - shiftY;
                            pt2.Y = pt2.Y + shiftY;
                        } else if (pt2.Y > pt.Y) {
                            //console.log("pt2.X was greater, so subtracting from pt2.X and adding to pt.x");
                            pt2.Y = pt2.Y - shiftY;
                            pt.Y = pt.Y + shiftY;
                        } else {
                            //console.log("pt.X was equal to pt2.X so leaving alone, they're averaged");
                        }

                        //console.log("new two points after magic wand them. pt:", pt, "pt2:", pt2);

                    }
                }
            }

            console.log("we magic wanded N pts:", ctr);
            $('#com-chilipeppr-widget-eagle .magic-wand-ctr').text(ctr);
            console.groupEnd();
        },
        getFurthestPointPair: function(path) {
            var maxDist = -1;
            var furthestPair = {pt1Index: null, pt1: null, pt2Index: null, pt2: null, maxDist: null};

            // loop thru all points
            for (var i = 0; i < path.length; i++) {

                var pt1 = path[i];

                // now compare pt1 to all points (except self)
                for (var i2 = 0; i2 < path.length; i2++) {

                    // don't bother comparing to ourself
                    if (i == i2) {
                        continue;
                    }

                    var pt2 = path[i2];

                    var dist = this.lineDistance2d( pt1, pt2 );
                    if (dist > maxDist) {
                        maxDist = dist;
                        // store index of closest pt
                        furthestPair.pt1Index = i;
                        furthestPair.pt2Index = i2;
                        furthestPair.pt1 = pt1;
                        furthestPair.pt2 = pt2;
                    }
                }
            }
            furthestPair.maxDist = maxDist;
            return furthestPair;
        },
        getFurthestPointIndexBruteForce: function(pointIndex, paths) {
            var maxDist = -100000.0;
            var furthestPair = {i:null, j:null, maxDist:null};
            var p = paths[pointIndex.i][pointIndex.j];
            for (var i = 0; i < paths.length; i++) {
                if (pointIndex.i == i) {
                    //console.log("we need to ignore our own path, so continuing to next i. i:", i, "pointIndex.i:", pointIndex);
                    continue;
                }
                for (var j = 0; j < paths[i].length; j++) {

                    // see if we already averaged, if so, continue
                    if (this.dirtyPts[i+":"+j]) {
                        //console.log("found dirty pt. skipping.", i+":"+j);
                        continue;
                    }
                    var q = paths[i][j];
                    var dist = this.lineDistance2d( p, q );
                    if (dist > maxDist) {
                        maxDist = dist;
                        // store index of closest pt
                        furthestPair.i = i;
                        furthestPair.j = j;
                    }
                }
            }
            furthestPair.maxDist = maxDist;
            return furthestPair;
        },
        getClosestPointIndexBruteForce: function(pointIndex, paths) {
            var minDist = 100000.0;
            var closestPair = {i:null, j:null, minDist:null};
            var p = paths[pointIndex.i][pointIndex.j];
            for (var i = 0; i < paths.length; i++) {
                if (pointIndex.i == i) {
                    //console.log("we need to ignore our own path, so continuing to next i. i:", i, "pointIndex.i:", pointIndex);
                    continue;
                }
                for (var j = 0; j < paths[i].length; j++) {

                    // see if we already averaged, if so, continue
                    if (this.dirtyPts[i+":"+j]) {
                        //console.log("found dirty pt. skipping.", i+":"+j);
                        continue;
                    }
                    var q = paths[i][j];
                    var dist = this.lineDistance2d( p, q );
                    if (dist < minDist) {
                        minDist = dist;
                        // store index of closest pt
                        closestPair.i = i;
                        closestPair.j = j;
                    }
                }
            }
            closestPair.minDist = minDist;
            return closestPair;
        },
        lineDistance2d: function( point1, point2 ) {
            var xs = 0;
            var ys = 0;

            xs = point2.X - point1.X;
            xs = xs * xs;

            ys = point2.Y - point1.Y;
            ys = ys * ys;

            return Math.sqrt( xs + ys );
        },
        raycaster: null,
        projector: null, // = new THREE.Projector();
        arrowHelper: null,
        intersectObjects: [], // contains three.js objects that we want to detect on mouse movement in the 3d viewer
        renderArea: null, // cache for renderarea dom element
        infoArea: null, // store dom that shows info
        infoSignalArea: null,
        lastIntersect: null, // last obj we showed info for
        hidePopupsElem: null, // quick access to hide checkbox
        setupMouseOver: function () {
            this.raycaster = new THREE.Raycaster();
            //this.projector = new THREE.Projector();
            $('#com-chilipeppr-widget-3dviewer-renderArea').mousemove(this.onMouseOver.bind(this));
            //$('#com-chilipeppr-widget-3dviewer-renderArea').click(this.onMouseOver.bind(this));
            this.renderArea = $('#com-chilipeppr-widget-3dviewer-renderArea');
            this.infoArea = $('.com-chilipeppr-widget-eagle-info');
            this.infoArea.prependTo(this.renderArea);
            this.infoSignalArea = $('.com-chilipeppr-widget-eagle-info-signal');
            this.infoSignalArea.prependTo(this.renderArea);
            this.hidePopupsElem = $('#com-chilipeppr-widget-eagle .popups-hide');
            var that = this;
            this.hidePopupsElem.change(function(evt) {
                if (that.hidePopupsElem.is(":checked")) {
                    // hide
                    that.deactivateMouseMove();
                } else {
                    // unhide
                    that.reactivateMouseMove();
                }
            });

        },
        reactivateMouseMove: function() {
            // add mouseover event
            console.log("reactivateMouseMove");
            $('#com-chilipeppr-widget-3dviewer-renderArea').mousemove(this.onMouseOver.bind(this));
        },
        deactivateMouseMove: function() {
            console.log("deactivateMouseMove");
            // remove mouseover event
            $('#com-chilipeppr-widget-3dviewer-renderArea').unbind("mousemove");
            this.hidePopups();
        },
        hidePopups: function() {

            console.log("hiding popups and resetting opacities");
            this.infoSignalArea.addClass('hidden');
            this.infoArea.addClass('hidden');

            // reset opacities
            if (this.lastIntersect != null) {
                console.log("lastIntersect:", this.lastIntersect);
                // also reset opacity for other items we hilited
                if (this.lastIntersectOtherMaterials != null) {
                    //console.log("lastIntersectOtherMaterials:", this.lastIntersectOtherMaterials);
                    this.lastIntersectOtherMaterials.forEach(function(material) {
                        material.opacity = material.opacityBackup;
                    });
                    this.lastIntersectOtherMaterials = [];
                }
                this.lastIntersect.object.material.opacity = this.lastIntersect.object.material.opacityBackup;
            }
        },
        lastIntersectOtherMaterials: [], // array to hold materials modified by mouseover so we can reset them later to normal opacity
        onMouseOver: function (event) {

            if(this.hidePopupsElem.is(":checked"))
                return;

            //console.log("onMouseOver. evt:", event);
            //return;
            //if (!event.ctrlKey) return;
            //event.preventDefault();

            //this.obj3dmeta.widget.scene.updateMatrixWorld();

            //this.obj3dmeta.widget.renderer.clear();


            // wake animation so we see the results
            this.obj3dmeta.widget.wakeAnimate();
            //camera.aspect = window.innerWidth / window.innerHeight;
            //this.obj3dmeta.camera.updateProjectionMatrix();
            //this.obj3dmeta.scene.updateMatrixWorld();

            var vector = new THREE.Vector3();
            //console.log("x/y coords:", event.clientX, event.clientY, window.innerWidth, window.innerHeight);

            //mouseVector.x = 2 * (e.clientX / containerWidth) - 1;
            //mouseVector.y = 1 - 2 * ( e.clientY / containerHeight );

            var containerWidth = this.renderArea.innerWidth();
            var containerHeight = this.renderArea.innerHeight();
            //var containerWidth = window.innerWidth;
            //var containerHeight = window.innerHeight;

            //console.log("conainer w/h", containerWidth, containerHeight);

            //this.obj3dmeta.widget.renderer.setSize( containerWidth, containerHeight );
            var x = event.clientX;
            var y = event.clientY;
            vector.set((event.clientX / containerWidth) * 2 - 1, -(event.clientY / containerHeight) * 2 + 1, 0.5);
            //console.log("this.renderArea", this.renderArea);
            //vector.set( ( event.clientX / this.renderArea.innerWidth ) * 2 - 1, - ( event.clientY / this.renderArea.innerHeight ) * 2 + 1, 0.5 );
            //console.log("vector after setting", vector);
            //vector.unproject( this.obj3dmeta.camera );
            // manual unproject
            var matrix = new THREE.Matrix4();
            //matrix.identity();
            //console.log("default matrix:", matrix);
            //console.log("camera projectionMatrix:", this.obj3dmeta.camera.projectionMatrix);
            var matrixInverse = matrix.getInverse(this.obj3dmeta.camera.projectionMatrix);
            //console.log("matrixInverse:", matrixInverse);
            matrix.multiplyMatrices(this.obj3dmeta.camera.matrixWorld, matrixInverse);
            //console.log("matrix after multiply:", matrix);
            vector.applyProjection(matrix);
            // Unproject the vector
            //this.projector.unprojectVector(vector, this.obj3dmeta.camera);
            //console.log("vector after unprojecting", vector);
            //console.log("vector:", vector);

            vector.sub(this.obj3dmeta.camera.position);
            //console.log("vector after subtracing camera pos:", vector);
            vector.normalize();
            //console.log("vector after normalize:", vector);
            //this.raycaster.set( this.obj3dmeta.camera.position, vector );
            this.raycaster.ray.set(this.obj3dmeta.camera.position, vector);
            //console.log("raycaster.ray:", this.raycaster.ray);
            //console.log("origin:", this.raycaster.ray.origin);
            //console.log("direction:", this.raycaster.ray.direction);

            // add an arrow to represent click
            /*
            var dir = this.raycaster.ray.direction.clone(); //new THREE.Vector3( 1, 0, 0 );
            var origin = this.raycaster.ray.origin.clone(); //new THREE.Vector3( 0, 0, 0 );
            var length = 10;
            var hex = 0x000000;

            this.sceneRemove( this.arrowHelper);
            this.arrowHelper = new THREE.ArrowHelper( dir, origin, length, hex );
            this.sceneAdd( this.arrowHelper );
            */

            //var intersects = raycaster.intersectObjects( objects );
            //console.log("objects:", this.obj3dmeta.scene.children);
            //var intersects = this.raycaster.intersectObjects( this.obj3dmeta.scene.children, true );
            //console.log("testing intersect on:", this.intersectObjects);
            var intersects = this.raycaster.intersectObjects(this.intersectObjects, true);

            // reset last object
            if (this.lastIntersect != null) {
                // also reset opacity for other items we hilited
                if (this.lastIntersectOtherMaterials != null) {
                    this.lastIntersectOtherMaterials.forEach(function(material) {
                        material.opacity = material.opacityBackup;
                    });
                    this.lastIntersectOtherMaterials = [];
                }
                this.lastIntersect.object.material.opacity = this.lastIntersect.object.material.opacityBackup;
            }

            if (intersects.length > 0) {
                console.log("we got intersection on N objects:", intersects);
                //var that = this;
                //intersects.forEach(function(obj) {
                var obj = intersects[0];
                if (obj != this.lastIntersect) {
                    this.lastIntersect = obj;
                    //if ('elemKey' in obj.object.userData) {
                    console.log("intersect obj:", obj.object.userData);
                    //console.log("conainer w/h", containerWidth, containerHeight);
                    //console.log("onMouseOver. evt:", event);
                    //this.renderArea.prepend('<div style="position:absolute;top:' + y + 'px;left:' + x + 'px;" >' + obj.object.userData.elemKey + '</div>');
                    //console.log("found smd");
                    //obj.object.material.color.setHex( Math.random() * 0xffffff );
                    x += 30;
                    //y += 30;


                    var ud = obj.object.userData;
                    if (!('type' in ud)) {
                        // we found this thru recursion, go to parent
                        // to get userData
                        ud = obj.object.parent.userData;
                    }

                    // figure out signal name for this element that was moused over
                    var signalKey = "";
                    if (ud.type == "smd") {
                        signalKey = ud.elem.padSignals[ud.smd.name];
                    } else if (ud.type == "pad") {
                        signalKey = ud.elem.padSignals[ud.pad.name];
                    } else if (ud.type == "via") {
                        signalKey = ud.name;
                    } else if (ud.type == "signal") {
                        signalKey = ud.name;
                    } else {
                        console.error("got ud.type that we did not recognize. ud:", ud);
                    }
                    console.log("signalKey:", signalKey);


                    // update opacity for ALL smds/pads/vias/wires for this signal
                    // we use shared materials across all smds/pads/vias/wires
                    // so u only have to change the opacity once on each type
                    // now also find ALL other items in this signal
                    //var signalKey = ud.name;
                    var signal = this.clipperBySignalKey[signalKey];
                    console.log("signal:", signal);

                    var opacity = 0.6;
                    if (!obj.object.material.opacityBackup)
                        obj.object.material.opacityBackup = obj.object.material.opacity;
                    if (signal.smds && signal.smds.length > 0) {
                        signal.smds.forEach(function(smd) {
                            var material = smd.threeObj.material;
                            if (!material.opacityBackup) material.opacityBackup = material.opacity;
                            material.opacity = opacity;
                            this.lastIntersectOtherMaterials.push(material);
                        }, this);
                    }
                    if (signal.pads && signal.pads.length > 0) {
                        signal.pads.forEach(function(pad) {
                            var material = pad.threeObj.material;
                            if (!material.opacityBackup) material.opacityBackup = material.opacity;
                            material.opacity = opacity;
                            this.lastIntersectOtherMaterials.push(material);
                        }, this);
                    }
                    if (signal.vias && signal.vias.length > 0) {
                        var material = signal.vias[0].threeObj.material;
                        if (!material.opacityBackup) material.opacityBackup = material.opacity;
                        material.opacity = opacity;
                        this.lastIntersectOtherMaterials.push(material);
                    }
                    if (signal.wire && signal.wire.threeObj) {

                        if (signal.wire.threeObj instanceof THREE.Mesh) {
                            var material = signal.wire.threeObj.material;
                            if (!material.opacityBackup) material.opacityBackup = material.opacity;
                            material.opacity = opacity;
                            this.lastIntersectOtherMaterials.push(material);
                        } else {
                            signal.wire.threeObj.children.forEach(function(wire) {
                                var material = wire.material;
                                if (!material.opacityBackup) material.opacityBackup = material.opacity;
                                material.opacity = opacity;
                                this.lastIntersectOtherMaterials.push(material);
                            }, this);
                        }
                    }


                    // now do specific stuff just for this item that was moused
                    // over, including making it's opacity darker than the rest of
                    // the signal items we already hilited
                    // see what type object
                    if (ud.type == "smd" || ud.type == "pad") {

                        this.infoArea.find('.info-package').text(ud.pkg.name);
                        this.infoArea.find('.info-elem-name').text(ud.elem.name);
                        this.infoArea.find('.info-elem-value').text(ud.elem.value);
                        //this.infoArea.find('.row-pad').removeClass("hidden");

                        // Add checkbox if dispenser == on
                        if($('#com-chilipeppr-widget-eagle .dispenser-active').is(':checked')){
                           this.infoArea.find('.info-elem-dispenser').removeClass('hidden');
                           this.infoArea.find('.ignore-in-dispenser').change(function(e){
                              ud['ignoreInDispenser'] = (this.checked ? true : false);
                           });
                        }else{
                           this.infoArea.find('.info-elem-dispenser').addClass('hidden');
                        }


                        this.infoSignalArea.addClass('hidden');
                        this.infoArea.removeClass('hidden');
                        this.infoArea.css('left', x + "px").css('top', y + "px");

                        if (ud.type == "smd") {
                            this.infoArea.find('.info-title').text("SMD Pad");
                            this.infoArea.find('.info-pad').text(ud.smd.name + " (of " + ud.pkg.smds.length + " smds)");
                            var sigName = ud.elem.padSignals[ud.smd.name];
                            if (sigName === undefined || sigName == null) sigName = "undefined";
                            this.infoArea.find('.info-signal').text(sigName);
                            this.infoArea.find('.info-layer').text(ud.smd.layer);
                        } else {
                            this.infoArea.find('.info-title').text("Pad");
                            this.infoArea.find('.info-pad').text(ud.pad.name + " (of " + ud.pkg.pads.length + " pads)");
                            var sigName = ud.elem.padSignals[ud.pad.name];
                            if (sigName === undefined || sigName == null) sigName = "undefined";
                            this.infoArea.find('.info-signal').text(sigName);
                            this.infoArea.find('.info-layer').text("Top Copper");
                        }

                    } else if (ud.type == "signal") {
                        console.log("mo on signal wire:", ud);
                        this.infoSignalArea.find('.info-title').text("Signal");
                        this.infoSignalArea.find('.info-signal').text(ud.name);
                        this.infoSignalArea.find('.info-layer').text(ud.layer.name);
                        this.infoSignalArea.find('.info-wirecnt').text(ud.layerWires.length);
                        this.infoSignalArea.find('.info-vias').text("-");
                        this.infoArea.addClass('hidden');
                        this.infoSignalArea.removeClass('hidden');
                        this.infoSignalArea.css('left', x + "px").css('top', y + "px");

                    } else if (ud.type == "via") {
                        console.log("via:", ud);
                        this.infoSignalArea.find('.info-title').text("Via");
                        this.infoSignalArea.find('.info-signal').text(ud.name);
                        this.infoSignalArea.find('.info-layer').text(ud.via.layers);
                        this.infoSignalArea.find('.info-wirecnt').text("-");
                        this.infoSignalArea.find('.info-vias').text(ud.layerVias.length);
                        this.infoArea.addClass('hidden');
                        this.infoSignalArea.removeClass('hidden');
                        this.infoSignalArea.css('left', x + "px").css('top', y + "px");
                    }

                    obj.object.material.opacity = 0.8;
                }
            } else {
                // hide info area

                this.infoArea.addClass('hidden');
                this.infoSignalArea.addClass('hidden');
            }

        },
        findBestEndMillSize: function (pathsUnion) {
            // this trick iterates thru some endmill sizes to find the inflated
            // path that produces the same amount of paths that we started with
            // as an example, if we inflate too much we get overlap into other
            // paths and will get a reduced set.
            var endmills = [0.0, 0.1, 0.15, 0.2, 0.25, 0.285, 0.3, 0.4, 0.5, 0.8, 1.0];
            var pathsToStart = pathsUnion.length;
            var isFinding = true;
            var emIndex = endmills.length - 1;
            while (isFinding) {
                // start with largest endmill first
                var delta = endmills[emIndex];
                var pathEndMill = this.getInflatePath(pathsUnion, delta);
                console.log("pathEndMill for endmill size:", delta, pathEndMill);
                if (pathEndMill.length == pathsToStart) {
                    console.log("this endmill produces same amount of paths. good. we're done.");
                    isFinding = false;
                } else {
                    console.log("this endmill does not produce same amount of paths. endmill is too big. searching next endmill...");
                    emIndex--;
                }
            }
            console.log("found our endmill to use. size:", delta);
            return delta;
        },
        findBestEndMillSizeLowestFirst: function (pathsUnion) {
            // this trick iterates thru some endmill sizes to find the inflated
            // path that produces the same amount of paths that we started with
            // as an example, if we inflate too much we get overlap into other
            // paths and will get a reduced set.
            var endmills = [0.0, 0.01, 0.05, 0.1, 0.105, 0.106, 0.107, 0.108, 0.109, 0.11, 0.12, 0.125, 0.13, 0.135, 0.14, 0.15, 0.175, 0.2, 0.25, 0.285, 0.3, 0.4, 0.5, 0.8, 1.0];
            var pathsToStart = pathsUnion.length;
            console.log("starting with N array items:", pathsToStart);
            var isFinding = true;
            var emIndex = 0;
            while (isFinding) {
                // start with smallest endmill first
                var delta = endmills[emIndex];
                var pathEndMill = this.getInflatePath(pathsUnion, delta);
                console.log("this is the inflated path for endmill size:", delta, "it has N array itmes:", pathEndMill.length, "array elems:", pathEndMill);
                if (pathEndMill.length == pathsToStart) {
                    console.log("this endmill produces same amount of paths. good. this endmill will work.", delta);
                    isFinding = true;
                    emIndex++;
                    if (emIndex > endmills.length - 1) {
                        console.log("ran out of endmills to try.");
                        isFinding = false;
                        delta = null;
                    }
                } else {
                    console.log("this endmill does not produce same amount of paths. endmill is too big. done searching.", delta, pathEndMill);
                    delta = endmills[emIndex - 1];
                    isFinding = false;
                }
            }
            console.log("found our endmill to use. size:", delta);
            return delta;
        },
        drawUnionOfSignalWiresAndElements: function (layer) {
            // draw clipper elements union'ized
            if (!layer) {
                return;
            }
            var layerNumber = layer.number;

            var paths = this.getClipperPaths();

            console.log("paths to unionize:", paths);
            this.drawClipperPaths2();
            this.drawUnionOfClipperPaths(paths);
        },
        getClipperPaths: function () {
            console.log("getClipperPaths");
            // TODO: handle top/bottom. top only handled for now
            var paths = [];
            for (var key in this.clipperSignalWires) {
                //console.log("clipperSignalWires:", key);
                paths.push(this.clipperSignalWires[key]);
            }

            /*
            for (var key in this.clipperElements) {
                console.log("clipperElements:", key);
                paths.push(this.clipperElements[key]);
            }
            */

            this.clipperSmds.forEach(function (d) {
                //console.log("clipperSmds:", d);
                paths.push(d);
            }, this);

            this.clipperPads.forEach(function (d) {
                //console.log("clipperPads:", d);
                paths.push(d);
            }, this);

            this.clipperVias.forEach(function (d) {
                //console.log("clipperPads:", d);
                paths.push(d);
            }, this);

            return paths;
        },
        drawClipperPaths2Old: function () {
            var paths = this.getClipperPaths();
            var scale = 1;
            var that = this;
            for (var i = 0; i < paths.length; i++) {
                var lineUnionGeo = new THREE.Geometry();
                for (var j = 0; j < paths[i].length; j++) {
                    lineUnionGeo.vertices.push(new THREE.Vector3(paths[i][j].X / scale, paths[i][j].Y / scale, 0));
                }
                // close it by connecting last point to 1st point
                lineUnionGeo.vertices.push(new THREE.Vector3(paths[i][0].X / scale, paths[i][0].Y / scale, 0));

                var lineUnionMat = new THREE.LineBasicMaterial({
                    color: 0x00ffff,
                    transparent: true,
                    opacity: 0.5
                });
                var lineUnion = new THREE.Line(lineUnionGeo, lineUnionMat);
                lineUnion.position.set(-20, -20, 0);
                that.sceneAdd(lineUnion);
            }

        },

        // THIS SECTION OF CODE IS UTILITY METHODS FOR WORKING WITH CLIPPER.JS

        getXorOfClipperPaths: function (subj_paths, clip_paths) {
            //console.log("getXorOfClipperPaths");
            var cpr = new ClipperLib.Clipper();
            var scale = 10000;
            ClipperLib.JS.ScaleUpPaths(subj_paths, scale);
            ClipperLib.JS.ScaleUpPaths(clip_paths, scale);
            cpr.AddPaths(subj_paths, ClipperLib.PolyType.ptSubject, true);
            cpr.AddPaths(clip_paths, ClipperLib.PolyType.ptClip, true);
            var clipType = ClipperLib.ClipType.ctXor;
            var subject_fillType = ClipperLib.PolyFillType.pftNonZero;
            var clip_fillType = ClipperLib.PolyFillType.pftNonZero;
            var solution_paths = new ClipperLib.Paths();
            cpr.Execute(clipType, solution_paths, subject_fillType, clip_fillType);

            ClipperLib.JS.ScaleDownPaths(solution_paths, scale);
            ClipperLib.JS.ScaleDownPaths(clip_paths, scale);
            ClipperLib.JS.ScaleDownPaths(subj_paths, scale);
            return solution_paths;
        },
        getIntersectionOfClipperPaths: function (subj_paths, clip_paths) {
            //console.log("getIntersectionOfClipperPaths");
            var cpr = new ClipperLib.Clipper();
            var scale = 10000;
            ClipperLib.JS.ScaleUpPaths(subj_paths, scale);
            ClipperLib.JS.ScaleUpPaths(clip_paths, scale);
            cpr.AddPaths(subj_paths, ClipperLib.PolyType.ptSubject, true);
            cpr.AddPaths(clip_paths, ClipperLib.PolyType.ptClip, true);
            var clipType = ClipperLib.ClipType.ctIntersection;
            var subject_fillType = ClipperLib.PolyFillType.pftNonZero;
            var clip_fillType = ClipperLib.PolyFillType.pftNonZero;
            var solution_paths = new ClipperLib.Paths();
            cpr.Execute(clipType, solution_paths, subject_fillType, clip_fillType);

            ClipperLib.JS.ScaleDownPaths(solution_paths, scale);
            ClipperLib.JS.ScaleDownPaths(clip_paths, scale);
            ClipperLib.JS.ScaleDownPaths(subj_paths, scale);
            return solution_paths;
        },
        getDiffOfClipperPaths: function (subj_paths, clip_paths) {
            //console.log("getDiffOfClipperPaths");
            var cpr = new ClipperLib.Clipper();
            var scale = 10000;
            ClipperLib.JS.ScaleUpPaths(subj_paths, scale);
            ClipperLib.JS.ScaleUpPaths(clip_paths, scale);
            cpr.AddPaths(subj_paths, ClipperLib.PolyType.ptSubject, true);
            cpr.AddPaths(clip_paths, ClipperLib.PolyType.ptClip, true);
            var clipType = ClipperLib.ClipType.ctDifference;
            var subject_fillType = ClipperLib.PolyFillType.pftNonZero;
            var clip_fillType = ClipperLib.PolyFillType.pftNonZero;
            var solution_paths = new ClipperLib.Paths();
            cpr.Execute(clipType, solution_paths, subject_fillType, clip_fillType);

            ClipperLib.JS.ScaleDownPaths(solution_paths, scale);
            ClipperLib.JS.ScaleDownPaths(clip_paths, scale);
            ClipperLib.JS.ScaleDownPaths(subj_paths, scale);
            return solution_paths;
        },
        getAllPathsAsOuterOrientation: function(subj_paths) {
            var sol_path = [];
            subj_paths.forEach(function(path) {
                if (ClipperLib.Clipper.Orientation(path)) {
                    // we're fine. this is in outer mode
                    sol_path.push(path);
                } else {
                    // we should reverse it
                    sol_path.push(path.reverse());
                }
            });
            return sol_path;
        },
        getUnionOfClipperPaths: function (subj_paths) {
            //console.log("getUnionOfClipperPaths");
            var cpr = new ClipperLib.Clipper();
            var scale = 100000;
            ClipperLib.JS.ScaleUpPaths(subj_paths, scale);
            cpr.AddPaths(subj_paths, ClipperLib.PolyType.ptSubject, true);
            var subject_fillType = ClipperLib.PolyFillType.pftNonZero;
            var clip_fillType = ClipperLib.PolyFillType.pftNonZero;
            var solution_paths = new ClipperLib.Paths();
            cpr.Execute(ClipperLib.ClipType.ctUnion, solution_paths, subject_fillType, clip_fillType);
            //console.log(JSON.stringify(solution_paths));
            //console.log("solution:", solution_paths);
            // scale back down
            for (var i = 0; i < solution_paths.length; i++) {
                for (var j = 0; j < solution_paths[i].length; j++) {
                    solution_paths[i][j].X = solution_paths[i][j].X / scale;
                    solution_paths[i][j].Y = solution_paths[i][j].Y / scale;
                }
            }
            ClipperLib.JS.ScaleDownPaths(subj_paths, scale);
            return solution_paths;
        },
        drawUnionOfClipperPaths: function (subj_paths) {
            var that = this;
            var solution_paths = this.getUnionOfClipperPaths(subj_paths);

            for (var i = 0; i < solution_paths.length; i++) {
                var lineUnionGeo = new THREE.Geometry();
                for (var j = 0; j < solution_paths[i].length; j++) {
                    lineUnionGeo.vertices.push(new THREE.Vector3(solution_paths[i][j].X, solution_paths[i][j].Y, 0));
                }
                // close it by connecting last point to 1st point
                lineUnionGeo.vertices.push(new THREE.Vector3(solution_paths[i][0].X, solution_paths[i][0].Y, 0));

                var lineUnionMat = new THREE.LineBasicMaterial({
                    color: 0x0000ff,
                    transparent: true,
                    opacity: 0.5
                });
                var lineUnion = new THREE.Line(lineUnionGeo, lineUnionMat);
                lineUnion.position.set(0, -20, 0);
                that.sceneAdd(lineUnion);
            }
        },
        drawClipperPaths: function (paths, color, opacity, z, zstep, isClosed, isAddDirHelper) {
            console.log("drawClipperPaths");
            var lineUnionMat = new THREE.LineBasicMaterial({
                color: color,
                transparent: true,
                opacity: opacity
            });

            if (z === undefined || z == null)
                z = 0;

            if (zstep === undefined || zstep == null)
                zstep = 0;

            if (isClosed === undefined || isClosed == null)
                isClosed = true;

            var group = new THREE.Object3D();

            for (var i = 0; i < paths.length; i++) {
                var lineUnionGeo = new THREE.Geometry();
                for (var j = 0; j < paths[i].length; j++) {
                    var actualZ = z;
                    if (zstep != 0) actualZ += zstep * j;
                    lineUnionGeo.vertices.push(new THREE.Vector3(paths[i][j].X, paths[i][j].Y, actualZ));

                    // does user want arrow helper to show direction
                    if (isAddDirHelper) {
                        /*
                        var pt = { X: paths[i][j].X, Y: paths[i][j].Y, Z: actualZ };
                        var ptNext;
                        if (j + 1 >= paths[i].length)
                            ptNext = {X: paths[i][0].X, Y: paths[i][0].Y, Z: actualZ };
                        else
                            ptNext = {X: paths[i][j+1].X, Y: paths[i][j+1].Y, Z: actualZ };
                        // x2-x1,y2-y1
                        var dir = new THREE.Vector3( ptNext.X - pt.X, ptNext.Y - pt.Y, ptNext.Z - pt.Z );
                        var origin = new THREE.Vector3( pt.X, pt.Y, pt.Z );
                        var length = 0.1;
                        var hex = 0xff0000;

                        var arrowHelper = new THREE.ArrowHelper( dir, origin, length, hex );
                        group.add( arrowHelper );
                        */
                    }
                }
                // close it by connecting last point to 1st point
                if (isClosed) lineUnionGeo.vertices.push(new THREE.Vector3(paths[i][0].X, paths[i][0].Y, z));


                var lineUnion = new THREE.Line(lineUnionGeo, lineUnionMat);
                //lineUnion.position.set(0,-20,0);
                group.add(lineUnion);
            }
            this.sceneAdd(group);
            return group;
        },
        createClipperPathsAsMesh: function (paths, color, opacity, holePath) {
            //console.log("createClipperPathsAsMesh. paths:", paths, "holePath:", holePath);
            if(color === undefined)
               color = this.colorDimension;
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

        },
        getInflatePath: function (paths, delta, joinType) {
            var scale = 10000;
            ClipperLib.JS.ScaleUpPaths(paths, scale);
            var miterLimit = 2;
            var arcTolerance = 10;
            joinType = joinType ? joinType : ClipperLib.JoinType.jtRound
            var co = new ClipperLib.ClipperOffset(miterLimit, arcTolerance);
            co.AddPaths(paths, joinType, ClipperLib.EndType.etClosedPolygon);
            //var delta = 0.0625; // 1/16 inch endmill
            var offsetted_paths = new ClipperLib.Paths();
            co.Execute(offsetted_paths, delta * scale);

            // scale back down
            for (var i = 0; i < offsetted_paths.length; i++) {
                for (var j = 0; j < offsetted_paths[i].length; j++) {
                    offsetted_paths[i][j].X = offsetted_paths[i][j].X / scale;
                    offsetted_paths[i][j].Y = offsetted_paths[i][j].Y / scale;
                }
            }
            ClipperLib.JS.ScaleDownPaths(paths, scale);
            return offsetted_paths;

        },

        // THIS SECTION IS FOR WORKING ON THE DIMENSION OF THE BOARD

        clipperDimension: [], // holds clipper formatted dimension
        getDimensionWires: function () {
            var layerNumber = this.eagle.eagleLayersByName['Dimension'].number;

            // dimension is wires on layer 20
            var wires = [];
            for (var pkgKey in this.eagle.packagesByName) {

                if ('wires' in this.eagle.packagesByName[pkgKey]) {
                    // yes, there's wires
                    for (var i = 0; i < this.eagle.packagesByName[pkgKey].wires.length; i++) {
                        var wire = this.eagle.packagesByName[pkgKey].wires[i];
                        if (wire.layer == layerNumber) {
                            // we have a dimension
                            //console.log("found a wire:", wire);
                            wires.push(wire);
                        }
                    }
                }
            }
            for (var plainWireKey in this.eagle.plainWires) {
                if (this.eagle.plainWires[plainWireKey].length > 0) {
                    // yes, there's wires in this array
                    for (var i = 0; i < this.eagle.plainWires[plainWireKey].length; i++) {
                        var wire = this.eagle.plainWires[plainWireKey][i];
                        if (wire.layer == layerNumber) {
                            // we have a dimension
                            wires.push(wire);
                        }
                    }
                }
            }

            // build clipper dimension format
            this.clipperDimension = [];
            for (var i = 0; i < wires.length; i++) {
                var wire = wires[i];
                //console.log("clipper appending wire:", wire);
                this.clipperDimension.push({
                    X: wire.x1,
                    Y: wire.y1
                });
                this.clipperDimension.push({
                    X: wire.x2,
                    Y: wire.y2
                });
            }

            //for (var signalKey in this.eagle.signalItems) {
            //}
            return wires;
        },
        draw3dDimension: function (endmillSize) {
            console.log("draw3dDimension", this.eagle);
            var wires = this.getDimensionWires();
            var color = this.colorDimension;

            var lineMat = new THREE.LineBasicMaterial({
                color: color,
                transparent: true,
                opacity: this.opacityDimension
            });

            var lineGeo = new THREE.Geometry();

            for (var i = 0; i < wires.length; i++) {
                var wire = wires[i];
                //console.log("working on wire:", wire);

                lineGeo.vertices.push(new THREE.Vector3(wire.x1, wire.y1, 0));
                lineGeo.vertices.push(new THREE.Vector3(wire.x2, wire.y2, 0));

            }
            // now close the line by pushing first vertices
            if (wires.length > 0) {
                lineGeo.vertices.push(new THREE.Vector3(wires[0].x1, wires[0].y1, 0));
            }

            var line = new THREE.Line(lineGeo, lineMat);
            this.sceneAdd(line);

            // get the inflated milling area
            var dimMillPath = this.getInflatePath([this.clipperDimension], endmillSize);
            //console.log("about to draw clipper inflated path for dimension:", dimMillPath);
            //var threeDim = this.drawClipperPaths(dimMillPath, this.colorMill, 0.8);
            //return threeDim;
            return null;
        },

        // UTILITY METHOD TO GENERATE A THREE.JS STROKE FOR A LINE
        // i.e. this takes a line with start/end and creates a stroked line with
        // a round end and returns a three.js object

        addStrokeCapsToLine: function (x1, y1, x2, y2, width, capType) {

            var cap = capType != null ? capType : "round";

            // we are given a line with two points. to stroke and cap it
            // we will draw the line in THREE.js and then shift x1/y1 to 0,0
            // for the whole line
            // then we'll rotate it to 3 o'clock
            // then we'll shift it up on x to half width
            // we'll create new vertexes on -x for half width
            // we then have a drawn rectangle that's the stroke
            // we'll add a circle at the start and end point for the cap
            // then we'll unrotate it
            // then we'll unshift it
            var group = new THREE.Object3D();

            var lineGeo = new THREE.Geometry();
            lineGeo.vertices.push(new THREE.Vector3(x1, y1, 0));
            lineGeo.vertices.push(new THREE.Vector3(x2, y2, 0));
            var lineMat = new THREE.LineBasicMaterial({
                color: this.colorSignal,
                transparent: true,
                opacity: this.opacitySignal
            });
            var line = new THREE.Line(lineGeo, lineMat);

            // shift to make x1/y1 zero
            line.position.set(x1 * -1, y1 * -1, 0);
            //line.updateMatrixWorld();
            group.add(line);

            // figure out angle to rotate to 0 degrees
            var x = x2 - x1;
            var y = y2 - y1;
            var theta = Math.atan2(-y, x);
            group.rotateZ(theta);

            // get our new xy coords for start/end of line
            //line.updateMatrixWorld();
            group.updateMatrixWorld();
            var v1 = line.localToWorld(line.geometry.vertices[0].clone());
            var v2 = line.localToWorld(line.geometry.vertices[1].clone());
            //console.log("v1,v2", v1, v2);

            // draw rectangle along line. apply width to y axis.
            var wireGrp = new THREE.Object3D();

            var rectGeo = new THREE.Geometry();
            rectGeo.vertices.push(new THREE.Vector3(v1.x, v1.y - width / 2, 0));
            rectGeo.vertices.push(new THREE.Vector3(v2.x, v1.y - width / 2, 0));
            rectGeo.vertices.push(new THREE.Vector3(v2.x, v1.y + width / 2, 0));
            rectGeo.vertices.push(new THREE.Vector3(v1.x, v1.y + width / 2, 0));
            rectGeo.vertices.push(new THREE.Vector3(v1.x, v1.y - width / 2, 0));
            var rectLines = new THREE.Line(rectGeo, lineMat);
            wireGrp.add(rectLines);
            //rectLines.position.set(x1 * -1, y1 * -1, 0);
            //group.add(rectLines);

            // now add circle caps
            if (cap == "round") {
                var radius = width / 2;
                var segments = 16;
                var circleGeo = new THREE.CircleGeometry(radius, segments);
                // Remove center vertex
                circleGeo.vertices.shift();
                var circle = new THREE.Line(circleGeo, lineMat);
                // clone the circle
                var circle2 = circle.clone();

                // shift left (rotate 0 is left/right)
                var shiftX = 0; //radius * -1;
                var shiftY = 0;
                circle.position.set(shiftX + v1.x, shiftY + v1.y, 0);
                wireGrp.add(circle);

                // shift right
                var shiftX = 0; //radius * 1;
                var shiftY = 0;
                circle2.position.set(shiftX + v2.x, shiftY + v2.y, 0);
                wireGrp.add(circle2);
            }

            // now reverse rotate
            wireGrp.rotateZ(-theta);

            // unshift postion
            wireGrp.position.set(x1 * 1, y1 * 1, 0);

            //this.sceneAdd(wireGrp);

            // now simplify via Clipper
            var subj_paths = [];
            wireGrp.updateMatrixWorld();
            var lineCtr = 0;
            wireGrp.children.forEach(function (line) {
                //console.log("line in group:", line);
                subj_paths.push([]);
                line.geometry.vertices.forEach(function (v) {
                    //line.updateMatrixWorld();
                    //console.log("pushing v onto clipper:", v);
                    var vector = v.clone();
                    var vec = line.localToWorld(vector);
                    subj_paths[lineCtr].push({
                        X: vec.x,
                        Y: vec.y
                    });
                }, this);
                lineCtr++;
            }, this);

            var sol_paths = this.getUnionOfClipperPaths(subj_paths);
            //this.drawClipperPaths(sol_paths, this.colorSignal, 0.8);
            //this.sceneAdd(group);
            return sol_paths;

        },

        // THIS SECTION TURNS THE BRD FILE INTO A USABLE JAVASCRIPT OBJECT
        // THAT IS STRUCTED BY THE SIGNAL NAME AND EACH SIGNAL CONTAINS ALL
        // ELEMENTS FOR THAT SIGNAL

        // It also draws the basic Three.js objects for smds,pads,vias,wires.

        // the mondo object contains the whole structure of the board
        // with objects for each key item. the main index is the signal name, i.e.
        // GND, +5V, etc.
        clipperBySignalKey: [],
        clipperBySignalKeyItem: {
            wires: [],
            polys: [],
            vias: [],
            smds: [],
            pads: [],
        },
        clipperSignalWires: [], // holds clipper formatted paths
        clipperSignalPolys: [], // holds clipper formatted polygons
        draw3dVias: function (layersName) {
            if (!layersName) return;
            var that = this;
            console.group("draw3dVias");
            //console.log("this.signalItems:", this.eagle.signalItems);

            for (var signalKey in this.eagle.signalItems) {

                var signalLayers = this.eagle.signalItems[signalKey];
                var layerItems = signalLayers[layersName];
                if (!layerItems) {
                    continue;
                }
                var layerVias = layerItems['vias'] || [];
                //console.log("layerVias:", layerVias);

                // create mondo storage
                if (this.clipperBySignalKey[signalKey] === undefined)
                    this.clipperBySignalKey[signalKey] = {};
                this.clipperBySignalKey[signalKey].vias = [];

                // create mesh version
                var viaMat = new THREE.MeshBasicMaterial({
                    color: this.colorVia,
                    transparent: true,
                    opacity: this.opacityVia,
                    side: THREE.DoubleSide,
                    depthWrite: false
                });
                var lineMat = new THREE.LineBasicMaterial({
                    color: this.colorVia,
                    transparent: true,
                    opacity: 0.99
                });

                layerVias.forEach(function (via) {
                    //console.log("generating circle for via:", via);

                    // save all drills for vias
                    // Most exists only drills with diameter 1.0 0.9 0.8 ...
                    var drill = via.drill.toFixed(1);
                    if(that.drillVias[drill] === undefined)
                        that.drillVias[drill] = [];
                    that.drillVias[drill].push({
                        X: via.x.toFixed(4),
                        Y: via.y.toFixed(4),
                        D: via.drill.toFixed(4)
                    });


                    var viashape = "round";
                    if ('shape' in via) viashape = via.shape;

                    var radius = via.drill; //(via.drill * 2) / 2;
                    var segments = 32;
                    if (viashape == "octagon") segments = 8;

                    viaGeo = new THREE.CircleGeometry(radius, segments);
                    // Remove center vertex
                    viaGeo.vertices.shift();
                    //viaGeo.vertices.pop();

                    var line = that.drawCircle(via.x, via.y, via.drill/2, that.colorHole);
                    line.rotateZ(Math.PI / 8);
                    this.sceneAdd(line);

                    // Create shape with hole
                    var shape = new THREE.Shape();

                    // Add outside circle to via
                    var ptCtr = 0;

                    viaGeo.vertices.forEach(function (pt) {
                        //console.log("pt on via:", pt);
                        if (ptCtr == 0) shape.moveTo(pt.x, pt.y);
                        else shape.lineTo(pt.x, pt.y);
                        ptCtr++;
                    }, this);
                    //console.log("shape", shape);
                    //var pt = viaGeo.vertices[0];
                    //shape.lineTo(pt.X, pt.y);

                    // Create hole inside
                    radius = via.drill / 2;
                    segments = 32;

                    holeGeo = new THREE.CircleGeometry(radius, segments);
                    // Remove center vertex
                    holeGeo.vertices.shift();

                    var hole = new THREE.Path();

                    var ptCtr = 0;
                    holeGeo.vertices.forEach(function (pt) {
                        if (ptCtr == 0) hole.moveTo(pt.x, pt.y);
                        else hole.lineTo(pt.x, pt.y);
                        ptCtr++;
                    }, this);
                    shape.holes.push(hole);

                    // create mesh for the via
                    var geometry = new THREE.ShapeGeometry( shape );
                    var mesh = new THREE.Mesh(geometry, viaMat );

                    // move shape to correct position
                    mesh.position.set(via.x, via.y, 0);
                    mesh.rotateZ(Math.PI / 8);

                    mesh.userData["type"] = "via";
                    mesh.userData["via"] = via;
                    mesh.userData["name"] = signalKey;
                    mesh.userData["layerVias"] = layerVias;
                    this.sceneAdd(mesh);

                    // add that these get detected during
                    // mouseover
                    this.intersectObjects.push(mesh);

                    // add to via object
                    via["threeObj"] = mesh;

                    // add clipper path
                    var clipperPath = [];
                    line.updateMatrixWorld();
                    line.geometry.vertices.forEach(function(v) {
                        var vector = v.clone();
                        var vec = line.localToWorld(vector);
                        clipperPath.push({X: vec.x, Y: vec.y});
                    }, this);
                    this.clipperVias.push(clipperPath);

                    // add to mondo object
                    this.clipperBySignalKey[signalKey].vias.push({
                        clipper: clipperPath,
                        via: via,
                        threeObj: mesh
                    });

                }, this)

            }
            console.log("this.clipperBySignalKey[]:", this.clipperBySignalKey);
            console.groupEnd();

        },
        draw3dSignalWires: function (layer) {
            //debugger;
            if (!layer) {
                return;
            }

            console.group("draw3dSignalWires");
            console.log("layer:", layer);

            var layerNumber = layer.number;

            var lineCap = 'round';
            // user may override the round cap, so take into account

            // contains all paths for each individual signal
            // so we can join them at the end
            var signalArr = [];

            for (var signalKey in this.eagle.signalItems) {

                var signalLayers = this.eagle.signalItems[signalKey],
                    layerItems = signalLayers[layer.number];
                if (!layerItems) {
                    continue;
                }
                //console.log("layerItems:", layerItems);
                var layerWires = layerItems['wires'] || [];

                console.log("layerWires:", layerWires);

                // create mondo storage
                if (this.clipperBySignalKey[signalKey] === undefined)
                    this.clipperBySignalKey[signalKey] = {};
                this.clipperBySignalKey[signalKey].layer = layer;
                this.clipperBySignalKey[signalKey].wire = {};

                var that = this;

                // per signal wire centipede
                var centipede = [];

                var scale = 10000;
                var that = this;

                layerWires.forEach(function (wire) {
                    //console.log("drawing wires. wire:", wire);

                    // use new util function
                    var sol_paths = that.addStrokeCapsToLine(wire.x1, wire.y1, wire.x2, wire.y2, wire.width);
                    //that.drawClipperPaths(sol_paths, that.colorSignal, 0.2);

                    //console.log("about to add sol_paths to centipede:", sol_paths);
                    centipede.push(sol_paths[0]);
                    wire.clipper = sol_paths[0];

                });

                // merge centipede array of signals into single object
                // do a union with Clipper.js
                var sol_paths = this.getUnionOfClipperPaths(centipede);
                //this.drawClipperPaths(sol_paths, this.colorSignal, 0.2);

                // we can get holes in sol_paths. it's rare but if a user created
                // their board in such a way that they created a circle with their
                // wires, we get a hole here. that means we need to separate those
                // out before asking Three.js to draw the shape because it's not smart
                // enough to look at winding order of the paths like Clipper.js is
                var sol_pathsOuter = [];
                var sol_pathsHoles = [];
                sol_paths.forEach(function(path) {
                    if (ClipperLib.Clipper.Orientation(path)) {
                        sol_pathsOuter.push(path);
                    } else {
                        sol_pathsHoles.push(path);
                    }
                }, this);
                // debug draw
                if (sol_pathsHoles.length > 0) {
                    console.log("Found signal wire path with holes:", sol_pathsHoles, "paths:", sol_pathsOuter, "signalKey:", signalKey);
                    //this.drawClipperPaths(sol_pathsOuter, 0x0000ff, 0.99, 0);
                    //this.drawClipperPaths(sol_pathsHoles, 0xff0000, 0.99, 0);
                }

                // remove holes from each path even though that's redundant
                // Three.js seems to handle this ok as when it calculates triangles
                // it just sees the hole is nowhere near the triangles and moves on
                var mesh = this.createClipperPathsAsMesh(sol_pathsOuter, this.colorSignal, this.opacitySignal, sol_pathsHoles);
                // slide signal wire down a tinge on z
                // to make rendering prettier
                mesh.position.set(0,0,-0.00001);
                this.sceneAdd(mesh);

                // add userData for intersect
                mesh.userData.type = "signal";
                mesh.userData.name = signalKey;
                //mesh.userData.wire = wire;
                mesh.userData.signalKey = signalKey;
                mesh.userData.layerWires = layerWires;
                mesh.userData.signalLayers = signalLayers;
                mesh.userData.layerItems = layerItems;
                mesh.userData.layer = layer;
                //mesh.computeFaceNormals();
                //console.log("just added signal mesh to intersectObjects. mesh:", mesh);
                this.intersectObjects.push(mesh);

                // create record of this union'ed signal wire
                var ctr = 0;
                sol_paths.forEach(function (path) {
                    that.clipperSignalWires[signalKey + "-" + ctr] = path;
                    ctr++;
                });

                // add to mondo object
                this.clipperBySignalKey[signalKey].wire = {
                    clipper: sol_paths,
                    wires: layerWires,
                    threeObj: mesh
                };

            }
            console.log("final list of clipper signal wires:", this.clipperSignalWires);
            console.log("this.clipperBySignalKey[]:", this.clipperBySignalKey);
            console.groupEnd();
        },
        draw3dSignalPolygons: function (layer) {

            if (!layer) {
                return;
            }

            console.group("draw3dSignalPolygons");
            console.log("layer:", layer);

            var layerNumber = layer.number;

            // contains all paths for each individual polygon
            // so we can join them at the end
            var polyArr = [];

            for (var signalKey in this.eagle.signalItems) {

                var signalLayers = this.eagle.signalItems[signalKey],
                    layerItems = signalLayers[layer.number];
                if (!layerItems) {
                    continue;
                }
                //console.log("layerItems:", layerItems);
                var layerPolys = layerItems['polygons'] || [];

                if (layerPolys.length == 0) continue;
                console.log("layerPolys:", layerPolys);

                // create mondo storage
                if (this.clipperBySignalKey[signalKey] === undefined)
                    this.clipperBySignalKey[signalKey] = {};
                this.clipperBySignalKey[signalKey].layer = layer;
                //this.clipperBySignalKey[signalKey].polys = [];

                var that = this;

                // centipede is not the right reference here, but
                // if the user did multiple polygon pours for this signalKey,
                // i.e. GND, then we want all of these to act like one
                // clipper path with multiple polygons
                var centipede = [];

                if (layerPolys.length > 1) {
                    //console.error("have more than one polygon in a signal. need to test this. layerPolys:", layerPolys);
                }

                layerPolys.forEach(function (poly) {
                    console.log("drawing polys. poly:", poly);

                    var clipperPoly = [];

                    poly.vertices.forEach(function(v) {
                        clipperPoly.push({X:v.x, Y:v.y});
                    });

                    // store in eagle obj for retrieval from mondo object
                    // later
                    poly.clipper = clipperPoly;

                    // not sure if merging these will work if multiple
                    // polys in one signal with different ranks,
                    // will have to test
                    centipede.push(clipperPoly);

                });
                console.log("poly centipede:", centipede);

                // merge centipede array of signals into single object
                // do a union with Clipper.js
                var sol_paths = this.getUnionOfClipperPaths(centipede);
                //this.drawClipperPaths(sol_paths, this.colorSignal, 0.2);
                var mesh = this.createClipperPathsAsMesh(sol_paths, this.colorSignal, this.opacitySignal * 0.6);
                // slide signal wire down a tinge on z
                // to make rendering prettier
                mesh.position.set(0,0,0.00001);
                this.sceneAdd(mesh);

                // add userData for intersect
                mesh.userData.type = "poly";
                mesh.userData.name = signalKey;
                //mesh.userData.wire = wire;
                mesh.userData.signalKey = signalKey;
                mesh.userData.layerWires = layerPolys;
                mesh.userData.signalLayers = signalLayers;
                mesh.userData.layerItems = layerItems;
                mesh.userData.layer = layer;
                //mesh.computeFaceNormals();
                //console.log("just added signal mesh to intersectObjects. mesh:", mesh);
                //this.intersectObjects.push(mesh);

                // create record of this union'ed signal wire
                var ctr = 0;
                sol_paths.forEach(function (path) {
                    that.clipperSignalPolys[signalKey + "-" + ctr] = path;
                    ctr++;
                });

                // add to mondo object
                this.clipperBySignalKey[signalKey].poly = {
                    clipper: sol_paths,
                    polys: layerPolys,
                    threeObj: mesh
                };

            }
            console.log("final list of clipper signal polys:", this.clipperSignalPolys);
            console.log("clipperBySignalKey:", this.clipperBySignalKey);
            console.groupEnd();
        },
        clipperElements: [], // holds clipper formatted paths
        clipperPads: [], // subset of elements (pads)
        clipperSmds: [], // subset of elements (smds)
        clipperVias: [], // subset of elements (vias)
        drillPads: {}, // save all pad drill vectors
        drillVias: {}, // save all via drill vectors
        draw3dElements: function (layer) {

            if (!layer) return;

            console.group("draw3dElements");

            var that = this;

            for (var elemKey in this.eagle.elements) {
                var elem = this.eagle.elements[elemKey];
                console.log("working on element:", elem);

                // store clipper formatted points for this element
                //this.clipperElements[elemKey] = [];

                var pkg = this.eagle.packagesByName[elem.pkg];
                var rotMat = elem.matrix;

                // loop thru smds
                var padCtr = 0;
                var smdgroup = new THREE.Object3D();

                // insert smdgroup three.js obj into pkg
                //pkg["threeObj"] = smdgroup;
                elem["threeObj"] = {};
                elem["threeObj"]["smdgroup"] = smdgroup;
                elem["threeObj"]["smds"] = {};

                // CALCULATING SMDS

                pkg.smds.forEach(function (smd) {

                    console.log("drawing smd:", smd);
                    var layerNum = smd.layer;

                    /*
                    if (elem.mirror) {
                        console.log("mirror, since this elem is mirrored, we're getting the mirrorLayer from the eagle object. layerNum prior:", layerNum);
                        layerNum = this.eagle.mirrorLayer(layerNum);
                        console.log("mirror layerNum after:", layerNum);
                    }
                    */

                    if (layer.number != layerNum) {
                        return;
                    }

                    var lineGeo = new THREE.Geometry();
                    var w2 = smd.dx / 2;
                    var h2 = smd.dy / 2;
                    lineGeo.vertices.push(new THREE.Vector3(w2 * -1, h2 * -1, 0));
                    lineGeo.vertices.push(new THREE.Vector3(w2, h2 * -1, 0));
                    lineGeo.vertices.push(new THREE.Vector3(w2, h2, 0));
                    lineGeo.vertices.push(new THREE.Vector3(w2 * -1, h2, 0));
                    // close it by connecting last point to 1st point
                    lineGeo.vertices.push(new THREE.Vector3(w2 * -1, h2 * -1, 0));

                    var lineMat = new THREE.LineBasicMaterial({
                        color: that.colorSignal,
                        transparent: true,
                        opacity: 0.2
                    });
                    var line = new THREE.Line(lineGeo, lineMat);

                    // do smd as mesh instead
                    lineMat = new THREE.MeshBasicMaterial({
                        color: that.colorSignal,
                        transparent: true,
                        opacity: 0.2,
                        side: THREE.DoubleSide,
                        //overdraw: false,
                        //polygonOffset: true,
                        depthWrite: false
                    });
                    //lineMat.side = THREE.DoubleSided;
                    var holes = [];
                    var triangles = THREE.Shape.Utils.triangulateShape(lineGeo.vertices, holes);

                    for (var i = 0; i < triangles.length; i++) {

                        lineGeo.faces.push(new THREE.Face3(triangles[i][0], triangles[i][1], triangles[i][2]));

                    }
                    //lineGeo.faces.push( new THREE.Face3( 0, 1, 2 ) );
                    lineGeo.computeFaceNormals();
                    line = new THREE.Mesh(lineGeo, lineMat);

                    // add smd mesh to be found on mouse movements
                    this.intersectObjects.push(line);

                    // rotate
                    // now that the smd is drawn, apply its individual
                    // rotation
                    if ('rot' in smd && smd.rot != null) {
                        var rot = parseInt(smd.rot.replace(/R/i, ""));
                        //console.log("will rotate individual smd by deg:", rot);
                        if (rot > 0) {
                            var r = (Math.PI / 180) * rot;
                            //console.log("we are rotating individual smd by radians:", r);
                            var axis = new THREE.Vector3(0, 0, 1);
                            that.rotateAroundObjectAxis(line, axis, r);
                        }
                    }

                    // set smd's x/y
                    line.position.set(smd.x, smd.y, 0);
                    line.userData["smdName"] = smd.name;
                    line.userData["smd"] = smd;
                    //line.userData["elemKey"] = elemKey;
                    line.userData["elem"] = elem;
                    //line.userData['pkgKey'] = elem.pkg;
                    line.userData['pkg'] = pkg;
                    line.userData["type"] = "smd";
                    //console.log("adding smd line with userData:", line);

                    // add this three.js obj to smd
                    //smd["threeObj"] = line;
                    elem["threeObj"]["smds"][smd.name] = line;

                    smdgroup.add(line);
                    //that.sceneAdd(line);
                    //group.add(line);

                    padCtr++;

                }, this);

                // now rotate and position the smdgroup
                //smdgroup
                if ('rot' in elem && elem.rot != null) {
                    var rot = parseInt(elem.rot.replace(/R/i, ""));
                    //console.log("will rotate pkg smd by deg:", rot);
                    if (rot > 0) {
                        var r = (Math.PI / 180) * rot;
                        //console.log("we are rotating pkg smd by radians:", r);
                        var axis = new THREE.Vector3(0, 0, 1);
                        that.rotateAroundObjectAxis(smdgroup, axis, r);
                    }
                }

                // see if smd group is mirrored
                //console.log("checking if elem is mirrored. elem:", elem);
                if (elem.mirror) {
                    //console.log("smdgroup elem is mirrored");
                    var mS = (new THREE.Matrix4()).identity();
                    //set -1 to the corresponding axis
                    mS.elements[0] = -1;
                    //mS.elements[5] = -1;
                    //mS.elements[10] = -1;

                    smdgroup.applyMatrix(mS);
                    //mesh.applyMatrix(mS);
                    //object.applyMatrix(mS);
                }

                // set position
                smdgroup.position.set(elem.x, elem.y, 0);
                that.sceneAdd(smdgroup);

                // store as a clipper path for later union'ing
                var temparr = [];
                // store clipper union'ed smds into elem
                elem["threeObj"]["smdsClipperFmt"] = {};
                smdgroup.updateMatrixWorld();
                var lineCtr = 0;
                smdgroup.children.forEach(function (line) {
                    //console.log("line in group:", line);
                    temparr[lineCtr] = [];
                    line.geometry.vertices.forEach(function (v) {
                        //line.updateMatrixWorld();
                        //console.log("pushing v onto clipper:", v);
                        var vector = v.clone();
                        //vector.applyMatrix( group.matrixWorld );
                        var vec = line.localToWorld(vector);
                        if (!(elemKey + "-" + lineCtr in this.clipperElements)) this.clipperElements[elemKey + "-" + lineCtr] = [];
                        this.clipperElements[elemKey + "-" + lineCtr].push({
                            X: vec.x,
                            Y: vec.y
                        });
                        temparr[lineCtr].push({
                            X: vec.x,
                            Y: vec.y
                        });
                        elem["threeObj"]["smdsClipperFmt"][line.userData.smd.name] = temparr[lineCtr];

                    }, this);

                    // push onto mondo object, which is sorted by signal name
                    // so we're pushing an smd into an alternate hierarchy
                    var ud = line.userData;
                    var signalKey = ud.elem.padSignals[ud.smd.name];
                    // add to mondo object
                    if (this.clipperBySignalKey[signalKey] === undefined)
                        this.clipperBySignalKey[signalKey] = {};
                    if (this.clipperBySignalKey[signalKey].smds === undefined)
                        this.clipperBySignalKey[signalKey].smds = [];
                    var clipperPath = temparr[lineCtr];
                    // remove last point because it closes the object, but on clipper
                    // paths it assumes to close the polygon
                    clipperPath.pop();
                    this.clipperBySignalKey[signalKey].smds.push({
                        clipper: temparr[lineCtr],
                        smd: ud.smd,
                        threeObj: line,
                        threeObjSmdGroup: smdgroup
                    });

                    lineCtr++;
                }, this);

                // draw temp union of smd
                temparr.forEach(function (d) {
                    this.clipperSmds.push(d);

                }, this);

                //this.clipperSmds.push(temparr);
                //console.log("just stored clipperSmds:", this.clipperSmds);
                /*
                console.log("temparr:", temparr);
                var sol_paths = this.getUnionOfClipperPaths(temparr);
                var infl_path = this.getInflatePath(sol_paths, 0.1);
                this.drawClipperPaths(infl_path, 0x00ffff, 1.0);
                */

                // CALCULATING PADS

                // do pads
                var padgroup = new THREE.Object3D();
                elem["threeObj"]["padgroup"] = padgroup;
                elem["threeObj"]["pads"] = {};
                elem["threeObj"]["padsAsLines"] = {};
                elem["threeObj"]["padsAsMesh"] = {};

                pkg.pads.forEach(function (pad) {
                    console.log("working on pad for layer. pad:", pad, "layer:", layer);

                    // pads are circles by default, but could be squares or octagons
                    var group = new THREE.Object3D();
                    //var groupMesh = new THREE.Object3D();

                    elem["threeObj"]["padsAsLines"][pad.name] = group;

                    elem["threeObj"]["padsAsMesh"][pad.name] = null;

                    if (pad.shape == "square") {

                        // check if diameter is there. if not create assumption
                        if (pad.diameter == null || isNaN(pad.diameter)) {
                            //console.warn("found pad without diameter. pad:", pad);
                            // base assumption on drill width
                            if (pad.drill && pad.drill > 0) {
                                // we have something to base our size on
                                pad.diameter = pad.drill * 2;
                            } else {
                                console.error("no way to determine pad size for pad:", pad);
                            }
                        }

                        var lineGeo = new THREE.Geometry();
                        var w = pad.diameter / 2;

                        lineGeo.vertices.push(new THREE.Vector3(0 - w, 0 - w, 0));
                        lineGeo.vertices.push(new THREE.Vector3(0 + w, 0 - w, 0));
                        lineGeo.vertices.push(new THREE.Vector3(0 + w, 0 + w, 0));
                        lineGeo.vertices.push(new THREE.Vector3(0 - w, 0 + w, 0));
                        // close it by connecting last point to 1st point
                        lineGeo.vertices.push(new THREE.Vector3(0 - w, 0 - w, 0));

                        var lineMat = new THREE.LineBasicMaterial({
                            color: that.colorPad,
                            transparent: true,
                            opacity: 0.2
                        });
                        var line = new THREE.Line(lineGeo, lineMat);
                        group.add(line);


                    } else if (pad.shape == "octagon") {

                        // use circle geometry shortcut, but create only 8 segments
                        //console.log("generating octagon via circle. pad:", pad);

                        // check if diameter is there. if not create assumption
                        if (pad.diameter == null || isNaN(pad.diameter)) {
                            //console.warn("found pad without diameter. pad:", pad);
                            // base assumption on drill width
                            if (pad.drill && pad.drill > 0) {
                                // we have something to base our size on
                                pad.diameter = pad.drill * 2;
                            } else {
                                console.error("no way to determine pad size for pad:", pad);
                            }
                        }

                        var radius = pad.diameter / 2;
                        var segments = 8; // not 1 extra for center vertex
                        var material = new THREE.LineBasicMaterial({
                            color: that.colorPad,
                            transparent: true,
                            opacity: 0.2
                        });
                        var geometry = new THREE.CircleGeometry(radius, segments, Math.PI / 8, Math.PI * 2);

                        // Remove center vertex
                        geometry.vertices.shift();

                        var lineCircle = new THREE.Line(geometry, material);

                        group.add(lineCircle);


                    } else if (pad.shape == "long") {

                        //debugger;
                        // the long pad height is 3x diameter of drill
                        // the width is 2x diam of drill
                        // unless the user specified the diameter (then use that)
                        //var group = new THREE.Object3D();

                        var lineMat = new THREE.LineBasicMaterial({
                            color: that.colorPad,
                            transparent: true,
                            opacity: 0.2
                        });

                        var dia = pad.diameter;
                        if (!dia > 0) {
                            // no diam. using auto
                            dia = pad.drill * 1.5;
                        }
                        var w = dia; // width of square and circles

                        // could draw circle top, circle bottom, then square, then do union
                        var radius = dia / 2;
                        var segments = 24;
                        var circleGeo = new THREE.CircleGeometry(radius, segments);
                        // Remove center vertex
                        circleGeo.vertices.shift();

                        var circle = new THREE.Line(circleGeo, lineMat);
                        // clone the circle
                        var circle2 = circle.clone();

                        // shift left (rotate 0 is left/right)
                        var shiftX = radius * -1;
                        //shiftX = shiftX + pad.x;
                        var shiftY = 0;
                        //shiftY = shiftY + pad.y;
                        circle.position.set(shiftX, shiftY, 0);
                        group.add(circle);
                        // shift right
                        var shiftX = radius * 1;
                        //shiftX = shiftX + pad.x;
                        var shiftY = 0;
                        //shiftY = shiftY + pad.y;
                        circle2.position.set(shiftX, shiftY, 0);
                        group.add(circle2);

                        // add a square to middle
                        var lineGeo = new THREE.Geometry();
                        w = w / 2;
                        lineGeo.vertices.push(new THREE.Vector3(0 - w, 0 - w, 0));
                        lineGeo.vertices.push(new THREE.Vector3(0 + w, 0 - w, 0));
                        lineGeo.vertices.push(new THREE.Vector3(0 + w, 0 + w, 0));
                        lineGeo.vertices.push(new THREE.Vector3(0 - w, 0 + w, 0));
                        // close it by connecting last point to 1st point
                        lineGeo.vertices.push(new THREE.Vector3(0 - w, 0 - w, 0));
                        var line = new THREE.Line(lineGeo, lineMat);
                        //group.position.set(pad.x, pad.y, 0);
                        group.add(line);

                    } else {
                        //console.log("generating circle. pad:", pad);

                        if (isNaN(pad.diameter)) {
                            //console.log("no diam specified. use auto formula");
                            pad.diameter = pad.drill * 2;
                        }
                        var radius = pad.diameter / 2,
                            segments = 32,
                            material = new THREE.LineBasicMaterial({
                                color: that.colorPad,
                                transparent: true,
                                opacity: 0.2
                            }),
                            geometry = new THREE.CircleGeometry(radius, segments);

                        // Remove center vertex
                        geometry.vertices.shift();

                        // shift to xy pos
                        var lineCircle = new THREE.Line(geometry, material);
                        //lineCircle.position.set(pad.x, pad.y, 0);

                        //lineCircle.rotateX(90);

                        //that.sceneAdd( lineCircle );
                        group.add(lineCircle);
                    }


                    // now draw the drill as dimension (not as standalone)
                    /*
                    var radius = pad.drill / 2;
                    var segments = 24;
                    var circleGeo = new THREE.CircleGeometry(radius, segments);
                    circleGeo.vertices.shift(); // remove center vertex
                    var drillMat = new THREE.LineBasicMaterial({
                        color: that.colorHole,
                    });
                    var drillLine = new THREE.Line(circleGeo, drillMat);
                    drillLine.position.set(elem.x + pad.x, elem.y + pad.y, 0);
                    drillLine.userData["type"] = "drill";

                    group.add(drillLine);
                    //that.sceneAdd(drillLine);
                    */

                    // now that the pad is drawn, apply its individual
                    // rotation
                    if ('rot' in pad && pad.rot != null) {
                        var rot = parseInt(pad.rot.replace(/R/i, ""));
                        //console.log("will rotate individual pad by deg:", rot);
                        if (rot > 0) {
                            var r = (Math.PI / 180) * rot;
                            //console.log("we are rotating individual pad by radians:", r);
                            var axis = new THREE.Vector3(0, 0, 1);
                            that.rotateAroundObjectAxis(group, axis, r);
                        }
                    }

                    // set pad's x/y
                    group.position.set(pad.x, pad.y, 0);

                    // set some userData on group for this pad
                    group.userData["type"] = "pad";
                    group.userData["elem"] = elem;
                    group.userData["pkg"] = pkg;
                    group.userData["pad"] = pad;

                    // ok, finally add to padgroup
                    padgroup.add(group);

                });

                // now position the pads for the element's pos, mirror, and rotation

                // see if padgroup rotated
                if (elem.rot.match(/R(\d+)/i)) {
                    // there is a rotation
                    var rotTxt = RegExp.$1;
                    var rot = parseInt(rotTxt);
                    console.log("padgroup: will rotate pad by deg:", rot);
                    if (rot > 0) {
                        var r = (Math.PI / 180) * rot;
                        //console.log("we are rotating by radians:", r);
                        var axis = new THREE.Vector3(0, 0, 1);
                        that.rotateAroundObjectAxis(padgroup, axis, r);
                    }
                }

                // see if pad group is mirrored
                //console.log("checking if pad elem is mirrored. elem:", elem);
                if (elem.mirror) {
                    //console.log("padgroup:  elem is mirrored. elem:", elem, "pkg:", pkg);
                    var mS = (new THREE.Matrix4()).identity();
                    //set -1 to the corresponding axis
                    mS.elements[0] = -1;
                    //mS.elements[5] = -1;
                    //mS.elements[10] = -1;

                    padgroup.applyMatrix(mS);
                    //mesh.applyMatrix(mS);
                    //object.applyMatrix(mS);
                }


                // set padgroup's x/y
                padgroup.position.set(elem.x, elem.y, 0);
                //that.sceneAdd(padgroup);

                // Now convert the Three.js drawn padgroup to a Clipper path
                // so we can do cool stuff like inflate/deflate and union/intersect
                // it. To convert we need to updateMatrixWorld() for three.js to calculate
                // all the absolute coordinates for us.

                // add to Clipper list for later union'ing
                //console.log("group vertices:", padgroup);
                padgroup.updateMatrixWorld();
                var temparr = [];
                var padCtr = 0;
                var lineCtr = 0;
                padgroup.children.forEach(function (group) {
                    group.updateMatrixWorld();

                    // store the vertices into this mesh
                    // array. we'll union them and then
                    // create a mesh. then subtract the drill
                    var meshArr = [];
                    var meshHoleArr = [];
                    var meshCtr = 0;

                    group.children.forEach(function (line) {
                        //console.log("line in group:", line);
                        temparr[lineCtr] = [];
                        var firstMeshPt = null;
                        var firstMeshHolePt = null;
                        meshArr[meshCtr] = [];

                        // Get absolute coordinates from drill hole
                        // in an element
                        if( line.position.x == 0 ){ // only middle point holes
                           var vector = new THREE.Vector3();
                           vector.setFromMatrixPosition( line.matrixWorld  );
                           // Most exists only drills with diameter 1.0 0.9 0.8 ...
                           var drill = line.parent.userData.pad.drill;
                           var shape = line.parent.userData.pad.shape;
                           if(this.drillPads[drill.toFixed(1)] === undefined)
                               this.drillPads[drill.toFixed(1)] = [];
                           this.drillPads[drill.toFixed(1)].push({
                               X: vector.x.toFixed(4),
                               Y: vector.y.toFixed(4),
                               D: drill.toFixed(4)
                           });
                           // New routine to draw a cirlce in threed
                           this.sceneAdd( this.drawCircle(vector.x, vector.y, drill/2, this.colorHole ) );
                           // drill hole --> end
                         }

                        line.geometry.vertices.forEach(function (v) {
                            //console.log("pushing v onto clipper:", v);
                            var vector = v.clone();
                            //vector.applyMatrix( group.matrixWorld );
                            var vec = line.localToWorld(vector);
                            if (!(elemKey + "-" + lineCtr in this.clipperElements))
                              this.clipperElements[elemKey + "-" + lineCtr] = [];

                            this.clipperElements[elemKey + "-" + lineCtr].push({
                                X: vec.x,
                                Y: vec.y
                            });
                            temparr[lineCtr].push({
                                X: vec.x,
                                Y: vec.y
                            });
                            //elem["threeObj"]["pads"]
                            var ptxy = {
                                X: vec.x,
                                Y: vec.y
                            };
                            if (line.userData.type == "drill") {

                                meshHoleArr.push(ptxy);
                                if (firstMeshHolePt == null) firstMeshHolePt = ptxy;
                            } else {
                                meshArr[meshCtr].push(ptxy);
                                if (firstMeshPt == null) firstMeshPt = ptxy;
                            }
                        }, this);
                        meshCtr++;
                        // close the mesh and the hole
                        //if (firstMeshPt != null) meshArr.push(firstMeshPt);
                        //if (firstMeshHolePt != null) meshHoleArr.push(firstMeshHolePt);

                        lineCtr++;
                    }, this);

                    //console.log("creating pad mesh for pad:");
                    var shape = new THREE.Shape();

                    // create a mesh for each group
                    //var lineGeo = new THREE.Geometry();
                    // we need to union the mesh first cuz it
                    // could have sub-components like on long pads
                    var sol_paths = this.getUnionOfClipperPaths(meshArr);
                    var clipperOuterPath = sol_paths[0];
                    //console.log("unionized mesh pts for meshArr:", sol_paths);
                    var ptCtr = 0;
                    sol_paths[0].forEach(function (pt) {
                        if (ptCtr == 0) shape.moveTo(pt.X, pt.Y);
                        else shape.lineTo(pt.X, pt.Y);
                        //lineGeo.vertices.push(new THREE.Vector3(pt.X, pt.Y, 0));
                        ptCtr++;
                    }, this);
                    //lineGeo.vertices.pop();
                    // add first pt to close shape
                    //lineGeo.vertices.push(new THREE.Vector3(sol_paths[0][0].X, sol_paths[0][0].Y, 0));

                    /*
                    var lineMat = new THREE.LineBasicMaterial({
                        color: that.colorDimension,
                        transparent: true,
                        opacity: 0.5
                    });
                    var lines = new THREE.Line(lineGeo, lineMat);
                    */
                    //this.sceneAdd(lines);

                    //var holeGeo = new THREE.Geometry();
                    var hole = new THREE.Path();
                    // console.log("about to calc holes. meshHoleArr:", meshHoleArr);

                    if (meshHoleArr.length > 0) {
                        var sol_paths = this.getUnionOfClipperPaths([meshHoleArr]);
                        //console.log("unionized mesh pts for meshHoleArr:", sol_paths);
                        var ptCtr = 0;
                        //var revArr = sol_paths[0].reverse();
                        sol_paths[0].forEach(function (pt) {
                            //holeGeo.vertices.push(new THREE.Vector3(pt.X, pt.Y, 0));
                            if (ptCtr == 0) hole.moveTo(pt.X, pt.Y);
                            else hole.lineTo(pt.X, pt.Y);
                            ptCtr++;
                        }, this);
                        shape.holes.push(hole);
                    }
                    //holeGeo.vertices.pop(); // remove last duplicate
                    // add first pt to close hole
                    //if (meshHoleArr.length > 0)
                    //    holeGeo.vertices.push(new THREE.Vector3(meshHoleArr[0].X, meshHoleArr[0].Y, 0));
                    //var holeLines = new THREE.Line(holeGeo, lineMat);
                    //this.sceneAdd(holeLines);

                    // create mesh version
                    var meshMat = new THREE.MeshBasicMaterial({
                        color: that.colorPad,
                        transparent: true,
                        opacity: 0.2,
                        side: THREE.DoubleSide,
                        depthWrite: false // so don't get rendering artifacts
                    });
                    //lineMat.side = THREE.DoubleSided;
                    //var holes = [];

                    /*
                    console.log("about to triangulate pad mesh - holes. pad:", lineGeo, "holes:", holeGeo);
                    var triangles = THREE.Shape.Utils.triangulateShape(lineGeo.vertices, [holeGeo.vertices]);
                    console.log("triangles after calculating pad and remove holes:", triangles);
                    for (var i = 0; i < triangles.length; i++) {

                        lineGeo.faces.push(new THREE.Face3(triangles[i][0], triangles[i][1], triangles[i][2]));

                    }
                    //lineGeo.faces.push( new THREE.Face3( 0, 1, 2 ) );
                    lineGeo.computeFaceNormals();
                    var mesh = new THREE.Mesh(lineGeo, meshMat);
                    */

                    // using shape instead
                    var geometry = new THREE.ShapeGeometry( shape );
                    //var material = new THREE.MeshBasicMaterial({color:0xffccff, side:2, overdraw:true} );
                    var mesh = new THREE.Mesh(geometry, meshMat );

                    // we now have a mesh representation of this
                    // pad. let's save it for later use.
                    //console.log("done working on pad mesh:", mesh);
                    elem["threeObj"]["padsAsMesh"][group.userData.pad.name] = mesh;
                    mesh.userData["type"] = "pad";
                    mesh.userData["elem"] = group.userData.elem;
                    mesh.userData["pkg"] = group.userData.pkg;
                    mesh.userData["pad"] = group.userData.pad;
                    this.sceneAdd(mesh);

                    // add that these get detected during
                    // mouseover
                    this.intersectObjects.push(mesh);

                    // push onto mondo object, which is sorted by signal name
                    // so we're pushing an smd into an alternate hierarchy
                    var ud = mesh.userData;
                    var signalKey = ud.elem.padSignals[ud.pad.name];
                    // add to mondo object
                    if (this.clipperBySignalKey[signalKey] === undefined)
                        this.clipperBySignalKey[signalKey] = {};
                    if (this.clipperBySignalKey[signalKey].pads === undefined)
                        this.clipperBySignalKey[signalKey].pads = [];
                    this.clipperBySignalKey[signalKey].pads.push({
                        clipper: clipperOuterPath,
                        pad: ud.pad,
                        threeObj: mesh,
                        threeObjPadGroup: padgroup
                    });

                }, this);

                // draw temp union of padgroup
                temparr.forEach(function (d) {
                    this.clipperPads.push(d);
                }, this);
                /*
                console.log("padgroup temparr:", temparr);
                var sol_paths = this.getUnionOfClipperPaths(temparr);
                var infl_path = this.getInflatePath(sol_paths, 0.1);
                this.drawClipperPaths(infl_path, 0x00ffff, 1.0);
                */

                // so far wires in a pkg are for tPlace and tDocu, not
                // for milling, so not an important part to solve
                pkg.wires.forEach(function (wire) {
                    var layerNum = wire.layer;

                    if (elem.mirror) {
                        layerNum = this.eagle.mirrorLayer(layerNum);
                    }
                    if (layer.number != layerNum) {
                        return;
                    }
                    //console.log("pkg wire:", wire);

                    var x1 = elem.x + rotMat[0] * wire.x1 + rotMat[1] * wire.y1,
                        y1 = elem.y + rotMat[2] * wire.x1 + rotMat[3] * wire.y1,
                        x2 = elem.x + rotMat[0] * wire.x2 + rotMat[1] * wire.y2,
                        y2 = elem.y + rotMat[2] * wire.x2 + rotMat[3] * wire.y2;

                    var lineGeo = new THREE.Geometry();
                    lineGeo.vertices.push(new THREE.Vector3(x1, y1, 0));
                    lineGeo.vertices.push(new THREE.Vector3(x2, y2, 0));

                    // close it by connecting last point to 1st point
                    //lineGeo.vertices.push(new THREE.Vector3(x1, y1, 0));
                    if (!color) var color = 0xff0000;
                    var lineMat = new THREE.LineBasicMaterial({
                        color: color,
                        transparent: true,
                        opacity: 0.5
                    });
                    var line = new THREE.Line(lineGeo, lineMat);
                    that.sceneAdd(line);

                }, this);


                /*
                var smashed = elem.smashed,
                    textCollection = smashed ? elem.attributes : pkg.texts; //smashed : use element attributes instead of package texts
                for (var textIdx in textCollection) {
                    var text = textCollection[textIdx];
                    var layerNum = text.layer;
                    if ((!elem.smashed) && (elem.mirror)) {
                        layerNum = this.mirrorLayer(layerNum);
                    }
                    if (layer.number != layerNum) { continue; }

                    var content = smashed ? null : text.content,
                        attribNameF = smashed ? text.name : ((text.content.indexOf('>') == 0) ? text.content.substring(1) : null);
                    if (attribName == "NAME")  { content = elem.name;  }
                    if (attribName == "VALUE") { content = elem.value; }
                    if (!content) { continue; }

                    var x = smashed ? text.x : (elem.x + rotMat[0]*text.x + rotMat[1]*text.y),
                        y = smashed ? text.y : (elem.y + rotMat[2]*text.x + rotMat[3]*text.y),
                        rot = smashed ? text.rot : elem.rot,
                        size = text.size;

                    //rotation from 90.1 to 270 causes Eagle to draw labels 180 degrees rotated with top right anchor point
                    var degrees  = parseFloat(rot.substring((rot.indexOf('M')==0) ? 2 : 1)),
                        flipText = ((degrees > 90) && (degrees <=270)),
                        textRot  = this.matrixForRot(rot),
                        fontSize = 10;

                    ctx.save();
                    ctx.fillStyle = color;
                    ctx.font = ''+fontSize+'pt vector'; //Use a regular font size - very small sizes seem to mess up spacing / kerning
                    ctx.translate(x,y);
                    ctx.transform(textRot[0],textRot[2],textRot[1],textRot[3],0,0);
                    var scale = size / fontSize;
                    ctx.scale(scale,-scale);
                    if (flipText) {
                        var metrics = ctx.measureText(content);
                        ctx.translate(metrics.width,-fontSize); //Height is not calculated - we'll use the font's 10pt size and hope it fits
                        ctx.scale(-1,-1);
                    }
                    ctx.fillText(content, 0, 0);
                    ctx.restore();
                }
                */
            }
            console.log("final list of clipper elements:", this.clipperElements);
            console.log("this.eagle.elements with all threeObjs and clipperPaths", this.eagle.elements);
            console.log("this.clipperBySignalKey", this.clipperBySignalKey);

            console.groupEnd();
        },
        // Rotate an object around an arbitrary axis in object space
        rotObjectMatrix: null,
        rotateAroundObjectAxis: function (object, axis, radians) {
            rotObjectMatrix = new THREE.Matrix4();
            rotObjectMatrix.makeRotationAxis(axis.normalize(), radians);

            // old code for Three.JS pre r54:
            // object.matrix.multiplySelf(rotObjectMatrix);      // post-multiply
            // new code for Three.JS r55+:
            object.matrix.multiply(rotObjectMatrix);

            // old code for Three.js pre r49:
            // object.rotation.getRotationFromMatrix(object.matrix, object.scale);
            // old code for Three.js r50-r58:
            // object.rotation.setEulerFromRotationMatrix(object.matrix);
            // new code for Three.js r59+:
            object.rotation.setFromRotationMatrix(object.matrix);
        },

        rotWorldMatrix: null,
        // Rotate an object around an arbitrary axis in world space
        rotateAroundWorldAxis: function (object, axis, radians) {
            rotWorldMatrix = new THREE.Matrix4();
            rotWorldMatrix.makeRotationAxis(axis.normalize(), radians);

            // old code for Three.JS pre r54:
            //  rotWorldMatrix.multiply(object.matrix);
            // new code for Three.JS r55+:
            rotWorldMatrix.multiply(object.matrix); // pre-multiply

            object.matrix = rotWorldMatrix;

            // old code for Three.js pre r49:
            // object.rotation.getRotationFromMatrix(object.matrix, object.scale);
            // old code for Three.js pre r59:
            // object.rotation.setEulerFromRotationMatrix(object.matrix);
            // code for r59+:
            object.rotation.setFromRotationMatrix(object.matrix);
        },
        drawCircle: function (x, y, radius, color){
            // draw a hole
            var segments = 32,
                material = new THREE.LineBasicMaterial( { color: color } ),
                geometry = new THREE.CircleGeometry( radius, segments );
            // Remove center vertex
            geometry.vertices.shift();

            var circle = new THREE.Line( geometry, material );
            circle.position.set(x, y, 0);

            return circle;
        },
        drawSphere: function (x, y, radius, color){
            console.log("Sqhere position and color: ", x, y, color);
            var segments = 16;
            var material = new THREE.MeshBasicMaterial( {
                     color: color,
                     wireframe : false,
                     transparent: true,
                     opacity: 0.5
                  } ),
                geometry = new THREE.SphereGeometry( radius, segments, segments, 0, Math.PI*2, 0, Math.PI/2); // HalfSphere

            var mesh = new THREE.Mesh( geometry, material ) ;
            mesh.position.set(x, y, 0);
            mesh.rotateX(Math.PI / 2); // 90 degrees
            return mesh;
        },
        drawSquare: function (x1, y1, x2, y2) {

            var square = new THREE.Geometry();

            //set 4 points
            square.vertices.push(new THREE.Vector3(x1, y2, 0));
            square.vertices.push(new THREE.Vector3(x1, y1, 0));
            square.vertices.push(new THREE.Vector3(x2, y1, 0));
            square.vertices.push(new THREE.Vector3(x2, y2, 0));

            //push 1 triangle
            square.faces.push(new THREE.Face3(0, 1, 2));

            //push another triangle
            square.faces.push(new THREE.Face3(0, 3, 2));

            //return the square object with BOTH faces
            return square;
        },
        mySceneGroup: null,
        sceneReAddMySceneGroup: function() {
            if (this.obj3d && this.mySceneGroup) {
                this.obj3d.add(this.mySceneGroup);
            }
            this.obj3dmeta.widget.wakeAnimate();
        },
        sceneRemoveMySceneGroup: function() {
            if (this.obj3d && this.mySceneGroup) {
                this.obj3d.remove(this.mySceneGroup);
            }
            this.obj3dmeta.widget.wakeAnimate();
        },
        sceneAdd: function (obj) {
            //chilipeppr.publish("/com-chilipeppr-widget-3dviewer/sceneadd", obj);

            // this method of adding puts us in the object that contains rendered Gcode
            // that's one option, but when we send gcode to workspace we get overwritten
            // then
            //this.obj3d.add(obj);

            // let's add our Eagle BRD content outside the scope of the Gcode content
            // so that we have it stay while the Gcode 3D Viewer still functions
            if (this.mySceneGroup == null) {
                this.mySceneGroup = new THREE.Group();
                this.obj3d.add(this.mySceneGroup);
            }
            this.mySceneGroup.add(obj);
            //this.obj3dmeta.scene.add(obj);

            this.obj3dmeta.widget.wakeAnimate();
        },
        sceneRemove: function (obj) {
            //chilipeppr.publish("/com-chilipeppr-widget-3dviewer/sceneremove", obj);
            //this.obj3d.remove(obj);
            //this.obj3dmeta.scene.remove(obj);
            if (this.mySceneGroup != null)
                this.mySceneGroup.remove(obj);
            this.obj3dmeta.widget.wakeAnimate();
        },
        draw: function (e) {
            this.eagle.draw();
        },
        onDropped: function (data, info) {
            console.log("onDropped. len of file:", data.length, "info:", info);
            // we have the data
            // double check it's a board file, cuz it could be gcode
            if (data.match(/<!DOCTYPE eagle SYSTEM "eagle.dtd">/i)) {

                // check that there's a board tag
                if (data.match(/<board>/i)) {
                    console.log("we have an eagle board file!");

                    localStorage.setItem('com-chilipeppr-widget-eagle-lastDropped', data);
                    localStorage.setItem('com-chilipeppr-widget-eagle-lastDropped-info', JSON.stringify(info));
                    this.fileInfo = info;
                    console.log("saved brd file to localstorage");
                    this.open(data, info);
                } else {
                    console.log("looks like it is an eagle generated file, but not a board file. sad.");
                    chilipeppr.publish('/com-chilipeppr-elem-flashmsg/flashmsg', "Looks like you dragged in an Eagle CAD file, but it contains no board tag. You may have dragged in a schematic instead. Please retry with a valid board file.");
                }

                // now, we need to return false so no other widgets see this
                // drag/drop event because they won't know how to handle
                // an Eagle Brd file
                return false;
            } else {
                if (info.name.match(/.brd$/i)) {
                    // this looks like an Eagle brd file, but it's binary
                    chilipeppr.publish('/com-chilipeppr-elem-flashmsg/flashmsg', "Error Loading Eagle BRD File", "Looks like you dragged in an Eagle BRD file, but it seems to be in binary. You can open this file in Eagle and then re-save it to a new file to create a text version of your Eagle BRD file.", 15 * 1000);
                    return false;
                } else {
                    console.log("we do not have an eagle board file. sad.");
                }
            }
        },
        onDragOver: function () {
            console.log("onDragOver");
            $('#com-chilipeppr-widget-eagle').addClass("panel-primary");
        },
        onDragLeave: function () {
            console.log("onDragLeave");
            $('#com-chilipeppr-widget-eagle').removeClass("panel-primary");
        },
        isVidLoaded: false,
        lazyLoadTutorial: function () {
            // lazy load tutorial tab youtube vid
            //var isVidLoaded = false;
            var that = this;
            $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
                //e.target // activated tab
                console.log("tab activated. e.target:", $(e.target));
                if ($(e.target).text() == 'Tutorial') {
                    // lazy load
                    console.log("we are on tutorial tab");
                    if (!that.isVidLoaded) {
                        console.log("lazy loading vid cuz not loaded");
                        that.isVidLoaded = true;
                        $('#eagle-tutorial').html('<iframe style="width:100%;" class="" src="//www.youtube.com/embed/T2h7hagVfnA" frameborder="0" allowfullscreen></iframe>');
                    }
                }
                //e.relatedTarget // previous tab
            })

        },
        options: null,
        setupUiFromLocalStorage: function () {
            // read vals from cookies
            var options = localStorage.getItem('com-chilipeppr-widget-eagle-options');

            if (options) {
                options = $.parseJSON(options);
                console.log("just evaled options: ", options);
            } else {
                options = {
                    showBody: true,
                    port: null,
                    z: 1.0
                };
            }

            this.options = options;
            console.log("options:", options);

            // show/hide body
            if (options.showBody) {
                this.showBody();
            } else {
                this.hideBody();
            }

        },
        saveOptionsLocalStorage: function () {
            //var options = {
            //    showBody: this.options.showBody
            //};
            var options = this.options;

            var optionsStr = JSON.stringify(options);
            console.log("saving options:", options, "json.stringify:", optionsStr);
            // store cookie
            localStorage.setItem('com-chilipeppr-widget-eagle-options', optionsStr);
        },
        showBody: function (evt) {
            $('#com-chilipeppr-widget-eagle .panel-body').removeClass('hidden');
            //$('#com-chilipeppr-widget-eagle .panel-footer').removeClass('hidden');
            $('#com-chilipeppr-widget-eagle .hidebody span').addClass('glyphicon-chevron-up');
            $('#com-chilipeppr-widget-eagle .hidebody span').removeClass('glyphicon-chevron-down');
            if (!(evt == null)) {
                this.options.showBody = true;
                this.saveOptionsLocalStorage();
            }
            $(window).trigger('resize');
        },
        hideBody: function (evt) {
            $('#com-chilipeppr-widget-eagle .panel-body').addClass('hidden');
            //$('#com-chilipeppr-widget-eagle .panel-footer').addClass('hidden');
            $('#com-chilipeppr-widget-eagle .hidebody span').removeClass('glyphicon-chevron-up');
            $('#com-chilipeppr-widget-eagle .hidebody span').addClass('glyphicon-chevron-down');
            if (!(evt == null)) {
                this.options.showBody = false;
                this.saveOptionsLocalStorage();
            }
            $(window).trigger('resize');
        },
        btnSetup: function () {

            // chevron hide body
            var that = this;
            $('#com-chilipeppr-widget-eagle .hidebody').click(function (evt) {
                console.log("hide/unhide body");
                if ($('#com-chilipeppr-widget-eagle .panel-body').hasClass('hidden')) {
                    // it's hidden, unhide
                    that.showBody(evt);
                } else {
                    // hide
                    that.hideBody(evt);
                }
            });

            $('#com-chilipeppr-widget-eagle .btn-toolbar .btn').popover({
                delay: 500,
                animation: true,
                placement: "auto",
                trigger: "hover",
                container: 'body'
            });

            // refresh btn
            $('#com-chilipeppr-widget-eagle .btn-refresh').click(this.onRefresh.bind(this));

        },
        statusEl: null, // cache the status element in DOM
        status: function (txt) {
            console.log("status. txt:", txt);
            if (this.statusEl == null) this.statusEl = $('#com-chilipeppr-widget-eagle-status');
            var len = this.statusEl.val().length;
            if (len > 30000) {
                console.log("truncating status area text");
                this.statusEl.val(this.statusEl.val().substring(len - 5000));
            }
            this.statusEl.val(this.statusEl.val() + txt + "\n");
            this.statusEl.scrollTop(
            this.statusEl[0].scrollHeight - this.statusEl.height());
        },
        forkSetup: function () {
            var topCssSelector = '#com-chilipeppr-widget-eagle';

            $(topCssSelector + ' .panel-title').popover({
                title: this.name,
                content: this.desc,
                html: true,
                delay: 200,
                animation: true,
                trigger: 'hover',
                placement: 'auto'
            });

            var that = this;
            chilipeppr.load("http://fiddle.jshell.net/chilipeppr/zMbL9/show/light/", function () {
                require(['inline:com-chilipeppr-elem-pubsubviewer'], function (pubsubviewer) {
                    pubsubviewer.attachTo($('#com-chilipeppr-widget-eagle .panel-heading .dropdown-menu'), that);
                });
            });

        },
    }
});

var p = function (o) {
    console.log(o)
}
// -----------------------
// --- ENUMS, DEFAULTS ---
// -----------------------

EagleCanvas.LayerId = {
    'BOTTOM_COPPER': 1,
        'BOTTOM_SILKSCREEN': 2,
        'BOTTOM_DOCUMENTATION': 3,
        'DIM_BOARD': 4,
        'TOP_COPPER': 5,
        'TOP_SILKSCREEN': 6,
        'TOP_DOCUMENTATION': 7,
        'VIAS': 8,
        'OUTLINE': 9,
        'PADS': 10
}

EagleCanvas.LARGE_NUMBER = 99999;

EagleCanvas.prototype.scale = 25;
EagleCanvas.prototype.minScale = 2.5;
EagleCanvas.prototype.maxScale = 250;
EagleCanvas.prototype.minLineWidth = 0.05;
EagleCanvas.prototype.boardFlipped = false;
EagleCanvas.prototype.dimBoardAlpha = 0.7;

// -------------------
// --- CONSTRUCTOR ---
// -------------------

function EagleCanvas(canvasId) {
    this.canvasId = canvasId;

    this.visibleLayers = {};
    this.visibleLayers[EagleCanvas.LayerId.BOTTOM_COPPER] = false;
    this.visibleLayers[EagleCanvas.LayerId.BOTTOM_SILKSCREEN] = false;
    this.visibleLayers[EagleCanvas.LayerId.BOTTOM_DOCUMENTATION] = false;
    this.visibleLayers[EagleCanvas.LayerId.DIM_BOARD] = true;
    this.visibleLayers[EagleCanvas.LayerId.TOP_COPPER] = true;
    this.visibleLayers[EagleCanvas.LayerId.TOP_SILKSCREEN] = true;
    this.visibleLayers[EagleCanvas.LayerId.TOP_DOCUMENTATION] = true;
    this.visibleLayers[EagleCanvas.LayerId.VIAS] = true;
    //this.visibleLayers[EagleCanvas.LayerId.PADS]                 = true;
    this.visibleLayers[EagleCanvas.LayerId.OUTLINE] = true;

    this.renderLayerOrder = [];
    this.renderLayerOrder.push(EagleCanvas.LayerId.BOTTOM_DOCUMENTATION);
    this.renderLayerOrder.push(EagleCanvas.LayerId.BOTTOM_SILKSCREEN);
    this.renderLayerOrder.push(EagleCanvas.LayerId.BOTTOM_COPPER);
    this.renderLayerOrder.push(EagleCanvas.LayerId.DIM_BOARD);
    this.renderLayerOrder.push(EagleCanvas.LayerId.OUTLINE);
    this.renderLayerOrder.push(EagleCanvas.LayerId.TOP_COPPER);
    this.renderLayerOrder.push(EagleCanvas.LayerId.VIAS);
    //this.renderLayerOrder.push(EagleCanvas.LayerId.PADS);
    this.renderLayerOrder.push(EagleCanvas.LayerId.TOP_SILKSCREEN);
    this.renderLayerOrder.push(EagleCanvas.LayerId.TOP_DOCUMENTATION);

    this.reverseRenderLayerOrder = [];
    this.reverseRenderLayerOrder.push(EagleCanvas.LayerId.TOP_DOCUMENTATION);
    this.reverseRenderLayerOrder.push(EagleCanvas.LayerId.TOP_SILKSCREEN);
    this.reverseRenderLayerOrder.push(EagleCanvas.LayerId.TOP_COPPER);
    this.reverseRenderLayerOrder.push(EagleCanvas.LayerId.DIM_BOARD);
    this.reverseRenderLayerOrder.push(EagleCanvas.LayerId.OUTLINE);
    this.reverseRenderLayerOrder.push(EagleCanvas.LayerId.BOTTOM_COPPER);
    //this.reverseRenderLayerOrder.push(EagleCanvas.LayerId.PADS);
    this.reverseRenderLayerOrder.push(EagleCanvas.LayerId.VIAS);
    this.reverseRenderLayerOrder.push(EagleCanvas.LayerId.BOTTOM_SILKSCREEN);
    this.reverseRenderLayerOrder.push(EagleCanvas.LayerId.BOTTOM_DOCUMENTATION);

    this.layerRenderFunctions = {};

    this.layerRenderFunctions[EagleCanvas.LayerId.BOTTOM_COPPER] = function (that, ctx) {
        that.drawSignalWires(that.eagleLayersByName['Bottom'], ctx);
        that.drawElements(that.eagleLayersByName['Bottom'], ctx);
    }

    this.layerRenderFunctions[EagleCanvas.LayerId.BOTTOM_SILKSCREEN] = function (that, ctx) {
        that.drawElements(that.eagleLayersByName['bNames'], ctx);
        that.drawElements(that.eagleLayersByName['bValues'], ctx);
        that.drawElements(that.eagleLayersByName['bPlace'], ctx);
    }

    this.layerRenderFunctions[EagleCanvas.LayerId.BOTTOM_DOCUMENTATION] = function (that, ctx) {
        that.drawElements(that.eagleLayersByName['bKeepout'], ctx);
        that.drawElements(that.eagleLayersByName['bDocu'], ctx);
    }

    this.layerRenderFunctions[EagleCanvas.LayerId.TOP_COPPER] = function (that, ctx) {
        that.drawSignalWires(that.eagleLayersByName['Top'], ctx);
        that.drawElements(that.eagleLayersByName['Top'], ctx);
    }

    this.layerRenderFunctions[EagleCanvas.LayerId.TOP_SILKSCREEN] = function (that, ctx) {
        that.drawElements(that.eagleLayersByName['tNames'], ctx);
        that.drawElements(that.eagleLayersByName['tValues'], ctx);
        that.drawElements(that.eagleLayersByName['tPlace'], ctx);
    }

    this.layerRenderFunctions[EagleCanvas.LayerId.TOP_DOCUMENTATION] = function (that, ctx) {
        that.drawElements(that.eagleLayersByName['tKeepout'], ctx);
        that.drawElements(that.eagleLayersByName['tDocu'], ctx);
    }

    this.layerRenderFunctions[EagleCanvas.LayerId.DIM_BOARD] = function (that, ctx) {
        that.dimCanvas(ctx, that.dimBoardAlpha);
    }

    this.layerRenderFunctions[EagleCanvas.LayerId.VIAS] = function (that, ctx) {
        that.drawSignalVias('1-16', ctx, '#0b0');
        //that.drawSignalVias('18-18',ctx, '#0b0');
    }

    this.layerRenderFunctions[EagleCanvas.LayerId.PADS] = function (that, ctx) {
        that.drawPads(ctx, '#0b0');
    }

    this.layerRenderFunctions[EagleCanvas.LayerId.OUTLINE] = function (that, ctx) {
        that.drawPlainWires(that.eagleLayersByName['Dimension'], ctx);
    }

    this.layerRenderFunctions[EagleCanvas.LayerId.BOTTOM_COPPER] = function (that, ctx) {
        that.drawSignalWires(that.eagleLayersByName['Bottom'], ctx);
        that.drawElements(that.eagleLayersByName['Bottom'], ctx);
    }

    this.hitTestFunctions = {};

    this.hitTestFunctions[EagleCanvas.LayerId.BOTTOM_COPPER] = function (that, x, y) {
        return that.hitTestElements(that.eagleLayersByName['Bottom'], x, y) || that.hitTestSignals(that.eagleLayersByName['Bottom'], x, y);
    }

    this.hitTestFunctions[EagleCanvas.LayerId.TOP_COPPER] = function (that, x, y) {
        return that.hitTestElements(that.eagleLayersByName['Top'], x, y) || that.hitTestSignals(that.eagleLayersByName['Top'], x, y);
    }


}


// -------------------------
// --- GENERIC ACCESSORS ---
// -------------------------

/** sets an element id to which the drawing should be initially scaled */
EagleCanvas.prototype.setScaleToFit = function (elementId) {
    this.scaleToFitId = elementId;
}

EagleCanvas.prototype.getScale = function (scale) {
    return this.scale;
}

/** sets the scale factor, triggers resizing and redrawing */
EagleCanvas.prototype.setScale = function (scale) {
    this.scale = scale;
    var canvas = document.getElementById(this.canvasId);
    canvas.width = scale * this.nativeSize[0];
    canvas.height = scale * this.nativeSize[1];
    this.draw();
}


/** Returns whether a given layer is visible or not */
EagleCanvas.prototype.isLayerVisible = function (layerId) {
    return this.visibleLayers[layerId] ? true : false;
}

/** Turns a layer on or off */
EagleCanvas.prototype.setLayerVisible = function (layerId, on) {
    if (this.isLayerVisible(layerId) == on) {
        return;
    }
    this.visibleLayers[layerId] = on ? true : false;
    this.draw();
}

/** Returns whether the board is flipped (bottom at fromt) or not */
EagleCanvas.prototype.isBoardFlipped = function () {
    return this.boardFlipped;
}

/** Turns top or bottom to the front */
EagleCanvas.prototype.setBoardFlipped = function (flipped) {
    if (this.boardFlipped == flipped) {
        return;
    }
    this.boardFlipped = flipped ? true : false;
    this.draw();
}

EagleCanvas.prototype.setHighlightedItem = function (item) {
    this.highlightedItem = item;
    this.draw();
}

// ---------------
// --- LOADING ---
// ---------------

EagleCanvas.prototype.loadURL = function (url, cb) {
    this.url = url;
    var request = new XMLHttpRequest(),
        self = this;
    request.open('GET', this.url, true);
    request.onreadystatechange = function () {
        if (request.readyState == 4) {
            self.loadText(request.responseText);
            cb(self)
        }
    };
    request.send(null);
};

EagleCanvas.prototype.loadText = function (text) {
    this.text = text;
    var parser = new DOMParser();
    this.boardXML = parser.parseFromString(this.text, "text/xml");
    this.parse();
    this.nativeBounds = this.calculateBounds();
    this.nativeSize = [this.nativeBounds[2] - this.nativeBounds[0], this.nativeBounds[3] - this.nativeBounds[1]];
    this.scaleToFit();
}


// ---------------
// --- PARSING ---
// ---------------

EagleCanvas.prototype.parse = function () {
    console.group("Eagle Parse");
    // store by eagle name
    this.eagleLayersByName = {};
    // store by eagle number
    this.layersByNumber = {};

    var layers = this.boardXML.getElementsByTagName('layer');
    for (var layerIdx = 0; layerIdx < layers.length; layerIdx++) {
        var layerDict = this.parseLayer(layers[layerIdx]);
        this.eagleLayersByName[layerDict.name] = layerDict;
        this.layersByNumber[layerDict.number] = layerDict;
    }

    this.elements = {};
    var elements = this.boardXML.getElementsByTagName('element');
    for (var elementIdx = 0; elementIdx < elements.length; elementIdx++) {
        var elemDict = this.parseElement(elements[elementIdx])
        this.elements[elemDict.name] = elemDict;
    }

    this.signalItems = {};
    //hashmap signal name -> hashmap layer number -> hashmap 'wires'->wires array, 'vias'->vias array
    var signals = this.boardXML.getElementsByTagName('signal');
    for (var sigIdx = 0; sigIdx < signals.length; sigIdx++) {
        var signal = signals[sigIdx];
        var name = signal.getAttribute('name');
        var signalLayers = {};
        this.signalItems[name] = signalLayers;

        var wires = signal.getElementsByTagName('wire');
        for (var wireIdx = 0; wireIdx < wires.length; wireIdx++) {
            var wireDict = this.parseWire(wires[wireIdx]);
            var layer = wireDict.layer;
            if (!(signalLayers[layer])) signalLayers[layer] = {};
            var layerItems = signalLayers[layer];
            if (!(layerItems['wires'])) layerItems['wires'] = [];
            var layerWires = layerItems['wires'];
            layerWires.push(wireDict);
        }

        var vias = signal.getElementsByTagName('via');
        for (var viaIdx = 0; viaIdx < vias.length; viaIdx++) {
            var viaDict = this.parseVia(vias[viaIdx]);
            var layers = viaDict.layers;
            if (!(signalLayers[layers])) signalLayers[layers] = {};
            var layerItems = signalLayers[layers];
            if (!(layerItems['vias'])) layerItems['vias'] = [];
            var layerVias = layerItems['vias'];
            layerVias.push(viaDict);
        }


        var contacts = signal.getElementsByTagName('contactref');
        for (var contactIdx = 0; contactIdx < contacts.length; contactIdx++) {
            var contact = contacts[contactIdx];
            var elemName = contact.getAttribute('element');
            var padName = contact.getAttribute('pad');
            var elem = this.elements[elemName];
            if (elem) {
                elem.padSignals[padName] = name;
                // check if @ sign in name cuz then
                // you have to create a redundant pad signal cuz this is one of
                // those special Eagle tricks that lets you connect multiple smd
                // pads to one signal
                if (padName.match(/@/)) {
                    padName.match(/(.+)@/);
                    var newPadName = RegExp.$1;
                    elem.padSignals[newPadName] = name;
                }
            }
        }

        // Get polygon pours
        var polygons = signal.getElementsByTagName('polygon');
        if (polygons.length > 0)
            console.log("polygons:", polygons);
        for (var polyIdx = 0; polyIdx < polygons.length; polyIdx++) {
            var polygon = polygons[polyIdx];
            var polyDict = this.parsePoly(polygon);

            // push this polygon to the layer array, and then the polygons group for
            // that layer
            var layer = polyDict.layer;
            if (!(signalLayers[layer])) signalLayers[layer] = {};
            var layerItems = signalLayers[layer];
            if (!(layerItems['polygons'])) layerItems['polygons'] = [];
            var layerPolys = layerItems['polygons'];
            layerPolys.push(polyDict);
        }
    }

    this.packagesByName = {};
    var packages = this.boardXML.getElementsByTagName('package');
    for (var packageIdx = 0; packageIdx < packages.length; packageIdx++) {
        var pkg = packages[packageIdx];
        var packageName = pkg.getAttribute('name');

        var packageSmds = [];
        var smds = pkg.getElementsByTagName('smd');
        for (var smdIdx = 0; smdIdx < smds.length; smdIdx++) {
            var smd = smds[smdIdx];
            packageSmds.push(this.parseSmd(smd));
        }

        var packagePads = [];
        var pads = pkg.getElementsByTagName('pad');
        for (var padIdx = 0; padIdx < pads.length; padIdx++) {
            var pad = pads[padIdx];
            packagePads.push(this.parsePad(pad));
        }

        // need to add rectangles as well

        var packageWires = [];
        var bbox = [EagleCanvas.LARGE_NUMBER, EagleCanvas.LARGE_NUMBER, -EagleCanvas.LARGE_NUMBER, -EagleCanvas.LARGE_NUMBER];
        var wires = pkg.getElementsByTagName('wire');
        for (var wireIdx = 0; wireIdx < wires.length; wireIdx++) {
            var wire = wires[wireIdx];
            var wireDict = this.parseWire(wire);
            if (wireDict.x1 < bbox[0]) {
                bbox[0] = wireDict.x1;
            }
            if (wireDict.x1 > bbox[2]) {
                bbox[2] = wireDict.x1;
            }
            if (wireDict.y1 < bbox[1]) {
                bbox[1] = wireDict.y1;
            }
            if (wireDict.y1 > bbox[3]) {
                bbox[3] = wireDict.y1;
            }
            if (wireDict.x2 < bbox[0]) {
                bbox[0] = wireDict.x2;
            }
            if (wireDict.x2 > bbox[2]) {
                bbox[2] = wireDict.x2;
            }
            if (wireDict.y2 < bbox[1]) {
                bbox[1] = wireDict.y2;
            }
            if (wireDict.y2 > bbox[3]) {
                bbox[3] = wireDict.y2;
            }
            packageWires.push(wireDict);
        }
        if ((bbox[0] >= bbox[2]) || (bbox[1] >= bbox[3])) {
            bbox = null;
        }
        var packageTexts = [],
            texts = pkg.getElementsByTagName('text');
        for (var textIdx = 0; textIdx < texts.length; textIdx++) {
            var text = texts[textIdx];
            packageTexts.push(this.parseText(text));
        }

        var packageDict = {
            'pads': packagePads,
            'smds': packageSmds,
            'wires': packageWires,
                'texts': packageTexts,
            'bbox': bbox,
            'name' : packageName
        };
        this.packagesByName[packageName] = packageDict;
    }

    this.plainWires = {};
    var plains = this.boardXML.getElementsByTagName('plain'); //Usually only one
    for (var plainIdx = 0; plainIdx < plains.length; plainIdx++) {
        var plain = plains[plainIdx],
            wires = plain.getElementsByTagName('wire');
        for (var wireIdx = 0; wireIdx < wires.length; wireIdx++) {
            var wire = wires[wireIdx],
                wireDict = this.parseWire(wire),
                layer = wireDict.layer;
            if (!this.plainWires[layer]) this.plainWires[layer] = [];
            this.plainWires[layer].push(wireDict);
        }
    }

    console.log("Final objects after parse", this);
    console.groupEnd();
}

EagleCanvas.prototype.parseSmd = function (smd) {
    var smdX = parseFloat(smd.getAttribute('x')),
        smdY = parseFloat(smd.getAttribute('y')),
        smdDX = parseFloat(smd.getAttribute('dx')),
        smdDY = parseFloat(smd.getAttribute('dy'));

    return {
        'x1': smdX - 0.5 * smdDX,
        'y1': smdY - 0.5 * smdDY,
        'x2': smdX + 0.5 * smdDX,
        'y2': smdY + 0.5 * smdDY,
        'x': smdX,
        'y': smdY,
        'dx': smdDX,
        'dy': smdDY,
        'rot': smd.getAttribute('rot'),
        'name': smd.getAttribute('name'),
        'layer': smd.getAttribute('layer')
    };
}

EagleCanvas.prototype.parseVia = function (via) {
    return {
        'x': parseFloat(via.getAttribute('x')),
        'y': parseFloat(via.getAttribute('y')),
        'drill': parseFloat(via.getAttribute('drill')),
        'layers': via.getAttribute('extent'),
        'shape': via.getAttribute('shape')
    };
}

EagleCanvas.prototype.parsePad = function (pad) {
    // put pads in Top and Bottom layer artificially
    return {
        'x': parseFloat(pad.getAttribute('x')),
        'y': parseFloat(pad.getAttribute('y')),
        'drill': parseFloat(pad.getAttribute('drill')),
        'diameter': parseFloat(pad.getAttribute('diameter')),
        'shape': pad.getAttribute('shape'),
        'rot': pad.getAttribute('rot'),
        'name': pad.getAttribute('name')
    };
}

EagleCanvas.prototype.parseWire = function (wire) {
    var width = parseFloat(wire.getAttribute('width'));
    if (width <= 0.0) width = this.minLineWidth;

    return {
        'x1': parseFloat(wire.getAttribute('x1')),
            'y1': parseFloat(wire.getAttribute('y1')),
            'x2': parseFloat(wire.getAttribute('x2')),
            'y2': parseFloat(wire.getAttribute('y2')),
            'width': width,
            'layer': parseInt(wire.getAttribute('layer'))
    };
}

EagleCanvas.prototype.parsePoly = function (poly) {
    var width = parseFloat(poly.getAttribute('width'));
    if (width <= 0.0) width = this.minLineWidth;

    // Polygons look like this
    /*
    <polygon width="0.254" layer="16" rank="2">
    <vertex x="0" y="0"/>
    <vertex x="71.12" y="0"/>
    <vertex x="71.12" y="54.61"/>
    <vertex x="0" y="54.61"/>
    </polygon>
    */
    var vertices = [];
    var vertexElems = poly.getElementsByTagName('vertex');
    for (var vertIdx = 0; vertIdx < vertexElems.length; vertIdx++) {
        var vertexElem = vertexElems[vertIdx];
        var vertex = {
            x: parseFloat(vertexElem.getAttribute('x')),
            y: parseFloat(vertexElem.getAttribute('y')),
            curve: parseFloat(vertexElem.getAttribute('curve'))
        };
        vertices.push(vertex);
    }

    return {
        'width': width,
        'layer': parseInt(poly.getAttribute('layer')),
        'rank': parseInt(poly.getAttribute('rank')),
        'thermals': poly.getAttribute('thermals'),
        'pour': poly.getAttribute('pour'),
        'vertices': vertices
    };
}

EagleCanvas.prototype.parseText = function (text) {
    var content = text.textContent;
    if (!content) content = "";
    return {
        'x': parseFloat(text.getAttribute('x')),
            'y': parseFloat(text.getAttribute('y')),
            'size': parseFloat(text.getAttribute('size')),
            'layer': parseInt(text.getAttribute('layer')),
            'font': text.getAttribute('font'),
            'content': content
    };
}

EagleCanvas.prototype.parseElement = function (elem) {
    var elemRot = elem.getAttribute('rot') || "R0",
        elemMatrix = this.matrixForRot(elemRot);

    var attribs = {},
    elemAttribs = elem.getElementsByTagName('attribute');
    for (var attribIdx = 0; attribIdx < elemAttribs.length; attribIdx++) {

        var elemAttrib = elemAttribs[attribIdx],
            attribDict = {},
            name = elemAttrib.getAttribute('name');

        if (name) {
            attribDict.name = name;
            if (elemAttrib.getAttribute('x')) {
                attribDict.x = parseFloat(elemAttrib.getAttribute('x'));
            }
            if (elemAttrib.getAttribute('y')) {
                attribDict.y = parseFloat(elemAttrib.getAttribute('y'));
            }
            if (elemAttrib.getAttribute('size')) {
                attribDict.size = parseFloat(elemAttrib.getAttribute('size'));
            }
            if (elemAttrib.getAttribute('layer')) {
                attribDict.layer = parseInt(elemAttrib.getAttribute('layer'));
            }
            attribDict.font = elemAttrib.getAttribute('font');

            var rot = elemAttrib.getAttribute('rot');
            if (!rot) {
                rot = "R0";
            }
            attribDict.rot = rot;
            attribs[name] = attribDict;
        }
    }

    // since elements can reference packages, lets just get a copy of
    // the package data as well and stick it in this element
    var pkgName = elem.getAttribute('package');
    if (pkgName) {
        console.log("this element references a pkg. elem:", elem, "pkgName:", pkgName);
        var pkg = null;
    }

    return {
        'pkg': elem.getAttribute('package'),
            'name': elem.getAttribute('name'),
            'value': elem.getAttribute('value'),
            'x': parseFloat(elem.getAttribute('x')),
            'y': parseFloat(elem.getAttribute('y')),
            'rot': elemRot,
            'matrix': elemMatrix,
            'mirror': elemRot.indexOf('M') == 0,
            'smashed': elem.getAttribute('smashed') && (elem.getAttribute('smashed').toUpperCase() == 'YES'),
            'attributes': attribs,
            'padSignals': {} //to be filled later
    };
};

EagleCanvas.prototype.parseLayer = function (layer) {
    return {
        'name': layer.getAttribute('name'),
            'number': parseInt(layer.getAttribute('number')),
            'color': parseInt(layer.getAttribute('color'))
    };
}

// ---------------
// --- DRAWING ---
// ---------------

EagleCanvas.prototype.draw = function () {
    var canvas = document.getElementById(this.canvasId),
        ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.save();

    ctx.transform(this.scale * (this.boardFlipped ? -1.0 : 1.0),
    0,
    0, -this.scale,
    0,
    ctx.canvas.height);
    ctx.translate((this.boardFlipped ? -this.nativeBounds[2] : -(this.nativeBounds[0])), -this.nativeBounds[1]);

    var layerOrder = this.boardFlipped ? this.reverseRenderLayerOrder : this.renderLayerOrder;
    for (var layerKey in layerOrder) {
        var layerId = layerOrder[layerKey];
        if (!this.visibleLayers[layerId]) {
            continue
        };
        this.layerRenderFunctions[layerId](this, ctx);
    }

    ctx.restore();
}

EagleCanvas.prototype.drawPlainWires = function (layer, ctx) {
    if (!layer) {
        return;
    }

    ctx.lineCap = 'round';
    ctx.strokeStyle = this.layerColor(layer.color);

    var layerWires = this.plainWires[layer.number] || [];
    layerWires.forEach(function (wire) {
        ctx.beginPath();
        ctx.moveTo(wire.x1, wire.y1);
        ctx.lineTo(wire.x2, wire.y2);
        ctx.lineWidth = wire.width;
        ctx.stroke();
    })
}

EagleCanvas.prototype.drawSignalWires = function (layer, ctx) {
    if (!layer) {
        return;
    }
    var layerNumber = layer.number;

    ctx.lineCap = 'round';

    for (var signalKey in this.signalItems) {

        var highlight = (this.highlightedItem && (this.highlightedItem.type == 'signal') && (this.highlightedItem.name == signalKey));
        var color = highlight ? this.highlightColor(layer.color) : this.layerColor(layer.color);
        ctx.strokeStyle = color;


        var signalLayers = this.signalItems[signalKey],
            layerItems = signalLayers[layer.number];
        if (!layerItems) {
            continue;
        }
        var layerWires = layerItems['wires'] || [];
        layerWires.forEach(function (wire) {
            ctx.beginPath();
            ctx.moveTo(wire.x1, wire.y1);
            ctx.lineTo(wire.x2, wire.y2);
            ctx.lineWidth = wire.width;
            ctx.stroke();
        })
    }
}

EagleCanvas.prototype.drawSignalVias = function (layersName, ctx, color) {
    if (!layersName) return;

    ctx.strokeStyle = color;

    for (var signalKey in this.signalItems) {
        var signalLayers = this.signalItems[signalKey],
            layerItems = signalLayers[layersName];
        if (!layerItems) {
            continue;
        }
        var layerVias = layerItems['vias'] || [];
        layerVias.forEach(function (via) {
            ctx.beginPath();
            ctx.arc(via.x, via.y, 0.75 * via.drill, 0, 2 * Math.PI, false);
            ctx.lineWidth = 0.5 * via.drill;
            ctx.stroke();
        })
    }
}

EagleCanvas.prototype.drawPads = function (ctx, color) {

    ctx.strokeStyle = color;
    console.log("drawPads...");

    var that = this;
    $.each(this.packagesByName, function (key, obj) {
        //console.log("pkg. obj:", obj, "key:", key);
        var package = that.packagesByName[key];
        //console.log("package:", package);
        $.each(obj.pads, function (indx, pad) {
            console.log("pad:", pad);
            ctx.beginPath();
            ctx.arc(pad.x, pad.y, 0.75 * pad.drill, 0, 2 * Math.PI, false);
            ctx.lineWidth = pad.diameter - pad.drill;
            ctx.stroke();
        });
    });
    /*
    for (var key in this.) {
        var signalLayers = this.signalItems[signalKey],
            layerItems = signalLayers[layersName];
        if (!layerItems) {continue;}
        var layerVias = layerItems['vias'] || [];
        layerVias.forEach(function(via) {
            ctx.beginPath();
            ctx.arc(via.x, via.y, 0.75 * via.drill, 0, 2 * Math.PI, false);
            ctx.lineWidth = 0.5 * via.drill;
            ctx.stroke();
        })
    }
    */
}

EagleCanvas.prototype.drawElements = function (layer, ctx) {
    if (!layer) return;

    for (var elemKey in this.elements) {
        var elem = this.elements[elemKey];

        var highlight = (this.highlightedItem && (this.highlightedItem.type == 'element') && (this.highlightedItem.name == elem.name));
        var color = highlight ? this.highlightColor(layer.color) : this.layerColor(layer.color);

        var pkg = this.packagesByName[elem.pkg];
        var rotMat = elem.matrix;
        pkg.smds.forEach(function (smd) {
            var layerNum = smd.layer;
            if (elem.mirror) {
                layerNum = this.mirrorLayer(layerNum);
            }
            if (layer.number != layerNum) {
                return;
            }
            //Note that rotation might be not axis aligned, so we have do transform all corners
            var x1 = elem.x + rotMat[0] * smd.x1 + rotMat[1] * smd.y1, //top left
                y1 = elem.y + rotMat[2] * smd.x1 + rotMat[3] * smd.y1,
                x2 = elem.x + rotMat[0] * smd.x2 + rotMat[1] * smd.y1, //top right
                y2 = elem.y + rotMat[2] * smd.x2 + rotMat[3] * smd.y1,
                x3 = elem.x + rotMat[0] * smd.x2 + rotMat[1] * smd.y2, //bottom right
                y3 = elem.y + rotMat[2] * smd.x2 + rotMat[3] * smd.y2,
                x4 = elem.x + rotMat[0] * smd.x1 + rotMat[1] * smd.y2, //bottom left
                y4 = elem.y + rotMat[2] * smd.x1 + rotMat[3] * smd.y2;

            var padName = smd.name,
                signalName = elem.padSignals[padName],
                highlightPad = (this.highlightedItem && (this.highlightedItem.type == 'signal') && (this.highlightedItem.name == signalName));

            ctx.fillStyle = highlightPad ? this.highlightColor(layer.color) : color;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineTo(x3, y3);
            ctx.lineTo(x4, y4);
            ctx.closePath();
            ctx.fill();
        }, this);

        // do pads
        /*
        pkg.pads.forEach(function(pad) {
            console.log("working on pad for layer. pad:", pad, "layer:", layer);
        });
        */

        pkg.wires.forEach(function (wire) {
            var layerNum = wire.layer;
            if (elem.mirror) {
                layerNum = this.mirrorLayer(layerNum);
            }
            if (layer.number != layerNum) {
                return;
            }
            var x1 = elem.x + rotMat[0] * wire.x1 + rotMat[1] * wire.y1,
                y1 = elem.y + rotMat[2] * wire.x1 + rotMat[3] * wire.y1,
                x2 = elem.x + rotMat[0] * wire.x2 + rotMat[1] * wire.y2,
                y2 = elem.y + rotMat[2] * wire.x2 + rotMat[3] * wire.y2;
            ctx.beginPath();
            ctx.lineWidth = wire.width;
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = color;
            ctx.stroke();
        }, this)

        var smashed = elem.smashed,
            textCollection = smashed ? elem.attributes : pkg.texts; //smashed : use element attributes instead of package texts
        for (var textIdx in textCollection) {
            var text = textCollection[textIdx];
            var layerNum = text.layer;
            if ((!elem.smashed) && (elem.mirror)) {
                layerNum = this.mirrorLayer(layerNum);
            }
            if (layer.number != layerNum) {
                continue;
            }

            var content = smashed ? null : text.content,
                attribName = smashed ? text.name : ((text.content.indexOf('>') == 0) ? text.content.substring(1) : null);
            if (attribName == "NAME") {
                content = elem.name;
            }
            if (attribName == "VALUE") {
                content = elem.value;
            }
            if (!content) {
                continue;
            }

            var x = smashed ? text.x : (elem.x + rotMat[0] * text.x + rotMat[1] * text.y),
                y = smashed ? text.y : (elem.y + rotMat[2] * text.x + rotMat[3] * text.y),
                rot = smashed ? text.rot : elem.rot,
                size = text.size;

            //rotation from 90.1 to 270 causes Eagle to draw labels 180 degrees rotated with top right anchor point
            var degrees = parseFloat(rot.substring((rot.indexOf('M') == 0) ? 2 : 1)),
                flipText = ((degrees > 90) && (degrees <= 270)),
                textRot = this.matrixForRot(rot),
                fontSize = 10;

            ctx.save();
            ctx.fillStyle = color;
            ctx.font = '' + fontSize + 'pt vector'; //Use a regular font size - very small sizes seem to mess up spacing / kerning
            ctx.translate(x, y);
            ctx.transform(textRot[0], textRot[2], textRot[1], textRot[3], 0, 0);
            var scale = size / fontSize;
            ctx.scale(scale, -scale);
            if (flipText) {
                var metrics = ctx.measureText(content);
                ctx.translate(metrics.width, -fontSize); //Height is not calculated - we'll use the font's 10pt size and hope it fits
                ctx.scale(-1, -1);
            }
            ctx.fillText(content, 0, 0);
            ctx.restore();
        }
    }
}

EagleCanvas.prototype.dimCanvas = function (ctx, alpha) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,' + alpha + ')'
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
};

// -------------------
// --- HIT TESTING ---
// -------------------

EagleCanvas.prototype.hitTest = function (x, y) {
    var canvas = document.getElementById(this.canvasId);
    //Translate screen to model coordinates
    x = x / this.scale;
    y = (canvas.height - y) / this.scale;
    y += this.nativeBounds[1];
    x = this.boardFlipped ? (this.nativeBounds[2] - x) : (x + this.nativeBounds[0]);

    var layerOrder = (this.boardFlipped) ? this.reverseRenderLayerOrder : this.renderLayerOrder;
    for (var i = layerOrder.length - 1; i >= 0; i--) {
        var layerId = layerOrder[i];
        if (!this.visibleLayers[layerId]) {
            continue;
        }
        var hitTestFunc = this.hitTestFunctions[layerId];
        if (!hitTestFunc) {
            continue;
        }
        var hit = hitTestFunc(this, x, y);
        if (hit) {
            return hit;
        }
    }
    return null;
}

EagleCanvas.prototype.hitTestElements = function (layer, x, y) {
    if (!layer) {
        return;
    }

    for (var elemKey in this.elements) {
        var elem = this.elements[elemKey],
            pkg = this.packagesByName[elem.pkg];

        var rotMat = elem.matrix;

        var bbox = pkg.bbox;
        if (bbox) {
            var layerNum = this.eagleLayersByName['Top'].number;
            if (elem.mirror) layerNum = this.mirrorLayer(layerNum);
            if (layer.number != layerNum) continue;
            var x1 = elem.x + rotMat[0] * bbox[0] + rotMat[1] * bbox[1], //top left
                y1 = elem.y + rotMat[2] * bbox[0] + rotMat[3] * bbox[1],
                x2 = elem.x + rotMat[0] * bbox[2] + rotMat[1] * bbox[1], //top right
                y2 = elem.y + rotMat[2] * bbox[2] + rotMat[3] * bbox[1],
                x3 = elem.x + rotMat[0] * bbox[2] + rotMat[1] * bbox[3], //bottom right
                y3 = elem.y + rotMat[2] * bbox[2] + rotMat[3] * bbox[3],
                x4 = elem.x + rotMat[0] * bbox[0] + rotMat[1] * bbox[3], //bottom left
                y4 = elem.y + rotMat[2] * bbox[0] + rotMat[3] * bbox[3];
            if (this.pointInRect(x, y, x1, y1, x2, y2, x3, y3, x4, y4)) {
                return {
                    'type': 'element',
                    'name': elem.name
                };
            }
        }

        for (var smdIdx in pkg.smds) {
            var smd = pkg.smds[smdIdx];
            var layerNum = smd.layer;
            if (elem.mirror) layerNum = this.mirrorLayer(layerNum);
            if (layer.number != layerNum) continue;
            var x1 = elem.x + rotMat[0] * smd.x1 + rotMat[1] * smd.y1, //top left
                y1 = elem.y + rotMat[2] * smd.x1 + rotMat[3] * smd.y1,
                x2 = elem.x + rotMat[0] * smd.x2 + rotMat[1] * smd.y1, //top right
                y2 = elem.y + rotMat[2] * smd.x2 + rotMat[3] * smd.y1,
                x3 = elem.x + rotMat[0] * smd.x2 + rotMat[1] * smd.y2, //bottom right
                y3 = elem.y + rotMat[2] * smd.x2 + rotMat[3] * smd.y2,
                x4 = elem.x + rotMat[0] * smd.x1 + rotMat[1] * smd.y2, //bottom left
                y4 = elem.y + rotMat[2] * smd.x1 + rotMat[3] * smd.y2;
            if (this.pointInRect(x, y, x1, y1, x2, y2, x3, y3, x4, y4)) {
                var padName = smd.name;
                if (padName) {
                    var signalName = elem.padSignals[padName];
                    if (signalName) {
                        return {
                            'type': 'signal',
                            'name': signalName
                        };
                    }
                }
                return {
                    'type': 'element',
                    'name': elem.name
                };
            }
        }
    }
    return null;
}

EagleCanvas.prototype.hitTestSignals = function (layer, x, y) {
    for (var signalName in this.signalItems) {
        var signalLayers = this.signalItems[signalName];
        if (!signalLayers) {
            continue;
        }
        var layerItems = signalLayers[layer.number];
        if (!layerItems) {
            continue;
        }
        var layerWires = layerItems['wires'];
        if (!layerWires) {
            continue;
        }
        for (var wireIdx in layerWires) {
            var wire = layerWires[wireIdx],
                x1 = wire.x1,
                y1 = wire.y1,
                x2 = wire.x2,
                y2 = wire.y2,
                width = wire.width;
            if (this.pointInLine(x, y, x1, y1, x2, y2, width)) {
                return {
                    'type': 'signal',
                    'name': signalName
                };
            }
        }
    }
    return null;
}

EagleCanvas.prototype.pointInLine = function (x, y, x1, y1, x2, y2, width) {
    var width2 = width * width;

    if (((x - x1) * (x - x1) + (y - y1) * (y - y1)) < width2) {
        return true;
    } //end 1
    if (((x - x2) * (x - x2) + (y - y2) * (y - y2)) < width2) {
        return true;
    } //end 2

    var length2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    if (length2 <= 0) {
        return false;
    }

    var s = ((y - y1) * (y2 - y1) - (x - x1) * (x1 - x2)) / length2; // s = param of line p1..p2 (0..1)
    if ((s >= 0) && (s <= 1)) { //between p1 and p2
        var px = x1 + s * (x2 - x1),
            py = y1 + s * (y2 - y1);
        if (((x - px) * (x - px) + (y - py) * (y - py)) < width2) {
            return true; //end 2
        }
    }
    return false;
}

EagleCanvas.prototype.pointInRect = function (x, y, x1, y1, x2, y2, x3, y3, x4, y4) {
    //p1..p4 in clockwise or counterclockwise order
    //Do four half-area tests
    return (((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) >= 0) && (((x - x1) * (x4 - x1) + (y - y1) * (y4 - y1)) >= 0) && (((x - x3) * (x2 - x3) + (y - y3) * (y2 - y3)) >= 0) && (((x - x3) * (x4 - x3) + (y - y3) * (y4 - y3)) >= 0);
}


// --------------------
// --- COMMON UTILS ---
// --------------------

EagleCanvas.prototype.colorPalette = [
    [0, 0, 0],
    [35, 35, 141],
    [35, 141, 35],
    [35, 141, 141],
    [141, 35, 35],
    [141, 35, 141],
    [141, 141, 35],
    [141, 141, 141],
    [39, 39, 39],
    [0, 0, 180],
    [0, 180, 0],
    [0, 180, 180],
    [180, 0, 0],
    [180, 0, 180],
    [180, 180, 0],
    [180, 180, 180]
];

EagleCanvas.prototype.layerColor = function (colorIdx) {
    var rgb = this.colorPalette[colorIdx];
    return 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')';
}

EagleCanvas.prototype.highlightColor = function (colorIdx) {
    var rgb = this.colorPalette[colorIdx];
    return 'rgb(' + (rgb[0] + 50) + ',' + (rgb[1] + 50) + ',' + (rgb[2] + 50) + ')';
}

EagleCanvas.prototype.matrixForRot = function (rot) {
    var flipped = (rot.indexOf('M') == 0),
        degreeString = rot.substring(flipped ? 2 : 1),
        degrees = parseFloat(degreeString),
        rad = degrees * Math.PI / 180.0,
        flipSign = flipped ? -1 : 1,
        matrix = [flipSign * Math.cos(rad), flipSign * -Math.sin(rad), Math.sin(rad), Math.cos(rad)];
    return matrix;
}

EagleCanvas.prototype.mirrorLayer = function (layerIdx) {
    if (layerIdx == 1) {
        return 16;
    } else if (layerIdx == 16) {
        return 1;
    }
    var name = this.layersByNumber[layerIdx].name,
        prefix = name.substring(0, 1);
    if (prefix == 't') {
        var mirrorName = 'b' + name.substring(1),
            mirrorLayer = this.eagleLayersByName[mirrorName];
        if (mirrorLayer) {
            return mirrorLayer.number;
        }
    } else if (prefix == 'b') {
        var mirrorName = 't' + name.substring(1),
            mirrorLayer = this.eagleLayersByName[mirrorName];
        if (mirrorLayer) {
            return mirrorLayer.number;
        }
    }
    return layerIdx;
}

EagleCanvas.prototype.calculateBounds = function () {
    var minX = EagleCanvas.LARGE_NUMBER,
        minY = EagleCanvas.LARGE_NUMBER,
        maxX = -EagleCanvas.LARGE_NUMBER,
        maxY = -EagleCanvas.LARGE_NUMBER;
    //Plain elements
    for (var layerKey in this.plainWires) {
        var lines = this.plainWires[layerKey];
        for (var lineKey in lines) {
            var line = lines[lineKey],
                x1 = line.x1,
                x2 = line.x2,
                y1 = line.y1,
                y2 = line.y2,
                width = line.width;
            if (x1 - width < minX) {
                minX = x1 - width;
            }
            if (x1 + width > maxX) {
                maxX = x1 + width;
            }
            if (x2 - width < minX) {
                minX = x2 - width;
            }
            if (x2 + width > maxX) {
                maxX = x2 + width;
            }
            if (y1 - width < minY) {
                minY = y1 - width;
            }
            if (y1 + width > maxY) {
                maxY = y1 + width;
            }
            if (y2 - width < minY) {
                minY = y2 - width;
            }
            if (y2 + width > maxY) {
                maxY = y2 + width;
            }
        }
    }

    //Elements
    for (var elemKey in this.elements) {
        var elem = this.elements[elemKey];
        var pkg = this.packagesByName[elem.pkg];
        var rotMat = elem.matrix;
        for (var smdIdx in pkg.smds) {
            var smd = pkg.smds[smdIdx],
                x1 = elem.x + rotMat[0] * smd.x1 + rotMat[1] * smd.y1,
                y1 = elem.y + rotMat[2] * smd.x1 + rotMat[3] * smd.y1,
                x2 = elem.x + rotMat[0] * smd.x2 + rotMat[1] * smd.y2,
                y2 = elem.y + rotMat[2] * smd.x2 + rotMat[3] * smd.y2;
            if (x1 < minX) {
                minX = x1;
            }
            if (x1 > maxX) {
                maxX = x1;
            }
            if (x2 < minX) {
                minX = x2;
            }
            if (x2 > maxX) {
                maxX = x2;
            }
            if (y1 < minY) {
                minY = y1;
            }
            if (y1 > maxY) {
                maxY = y1;
            }
            if (y2 < minY) {
                minY = y2;
            }
            if (y2 > maxY) {
                maxY = y2;
            }
        }
        for (var wireIdx in pkg.wires) {
            var wire = pkg.wires[wireIdx],
                x1 = elem.x + rotMat[0] * wire.x1 + rotMat[1] * wire.y1,
                y1 = elem.y + rotMat[2] * wire.x1 + rotMat[3] * wire.y1,
                x2 = elem.x + rotMat[0] * wire.x2 + rotMat[1] * wire.y2,
                y2 = elem.y + rotMat[2] * wire.x2 + rotMat[3] * wire.y2,
                width = wire.width;
            if (x1 - width < minX) {
                minX = x1 - width;
            }
            if (x1 + width > maxX) {
                maxX = x1 + width;
            }
            if (x2 - width < minX) {
                minX = x2 - width;
            }
            if (x2 + width > maxX) {
                maxX = x2 + width;
            }
            if (y1 - width < minY) {
                minY = y1 - width;
            }
            if (y1 + width > maxY) {
                maxY = y1 + width;
            }
            if (y2 - width < minY) {
                minY = y2 - width;
            }
            if (y2 + width > maxY) {
                maxY = y2 + width;
            }
            if (x1 < minX) {
                minX = x1;
            }
            if (x1 > maxX) {
                maxX = x1;
            }
            if (x2 < minX) {
                minX = x2;
            }
            if (x2 > maxX) {
                maxX = x2;
            }
            if (y1 < minY) {
                minY = y1;
            }
            if (y1 > maxY) {
                maxY = y1;
            }
            if (y2 < minY) {
                minY = y2;
            }
            if (y2 > maxY) {
                maxY = y2;
            }
        }
    }
    return [minX, minY, maxX, maxY];
}

EagleCanvas.prototype.scaleToFit = function (a) {
    if (!this.scaleToFitId) {
        return;
    }
    var fitElement = document.getElementById(this.scaleToFitId);
    if (!fitElement) {
        return;
    }
    var fitWidth = fitElement.offsetWidth,
        fitHeight = fitElement.offsetHeight,
        scaleX = fitWidth / this.nativeSize[0],
        scaleY = fitHeight / this.nativeSize[1],
        scale = Math.min(scaleX, scaleY);
    scale *= 0.9;
    this.minScale = scale / 10;
    this.maxScale = scale * 10;
    this.setScale(scale);
}
