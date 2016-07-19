/*

    AUTHOR:  John Lauer

*/

function createScene(element) {


  var canvas = !! window.CanvasRenderingContext2D;
  var webgl = ( function () { try { return !! window.WebGLRenderingContext && !! document.createElement( 'canvas' ).getContext( 'experimental-webgl' ); } catch( e ) { return false; } } )();

  if (webgl) {
    $('#console').append('<hr><p class="pf" style="color: green;"><b>WebGL detected!</b><br> Continuing with best Laserweb 3D Viewer Experience</p><hr>');
    $('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());

    renderer = new THREE.WebGLRenderer({
        autoClearColor: true
    });

  } else if (canvas) {

    $('#console').append('<hr><p class="pf" style="color: red;"><b>CRITICAL ERROR:  No WebGL Support!</b><br> Laserweb may not work on this computer! Try another computer with WebGL support</p><br><u>Try the following:</u><br><ul><li>In the Chrome address bar, type: <b>chrome://flags</b> [Enter]</li><li>Enable the <b>Override software Rendering</b></li><li>Restart Chrome and try again</li></ul>Sorry! :(<hr>');
    $('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());

    $( "#noWebGL" ).append('<div style=" margin: auto;"><h1>No WebGL Support found!</h1></div><b>CRITICAL ERROR:</b><br> Laserweb may not work on this computer! <br>Try another computer with WebGL support</p><br><u>Try the following:</u><br><ul><li>In the Chrome address bar, type: <b>chrome://flags</b> [Enter]</li><li>Enable the <b>Override software Rendering</b></li><li>Restart Chrome and try again</li></ul>Sorry! :(<hr>');
  };

    // renderer setup
    renderer = new THREE.WebGLRenderer({
        autoClearColor: true
    });

    renderer.setClearColor(0xffffff, 1);  // Background color of viewer
    renderer.setSize(element.width(), (element.height() -30 ));
    element.append(renderer.domElement);
    renderer.clear();

    // scene
    var scene = new THREE.Scene();

    // lighting
    var directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
    directionalLight.position.set( 0, 1, 0 );
    scene.add( directionalLight );

    // camera
    var fov = 45,
        aspect = element.width() / element.height(),
        near = 1,
        far = 12000;
    camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.z = 525;
    camera.position.x = 0;
    camera.position.y = 0;
	scene.add(camera);


	// Disabling mouse
    controls = new THREE.TrackballControls(camera, renderer.domElement);
    controls.noPan = false;
    controls.noZoom = false;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 1;
    controls.rotateSpeed = 1;



    // render
    function render() {
        controls.update();
        renderer.render(scene, camera);
        requestAnimationFrame(render);
    }


    render();

// fix controls if window is resized.
  $(window).on('resize', function() {
    renderer.setSize(element.width(), element.height());
    camera.aspect = element.width() / element.height();
    camera.updateProjectionMatrix();
    controls.screen.width = window.innerWidth;
    controls.screen.height = window.innerHeight;
    controls.reset();
  });





    return scene;
}
