"use strict";

var canvas;
var gl;
var program;
var size;

var numTimesToSubdivide = 4;

var index = 0;

var pointsArray = [];
var normalsArray = [];

var va = vec4(0.0, 0.0, -1.0, 1);
var vb = vec4(0.0, 0.942809, 0.333333, 1);
var vc = vec4(-0.816497, -0.471405, 0.333333, 1);
var vd = vec4(0.816497, -0.471405, 0.333333, 1);

var clickX;
var clickY;
var offsetX;
var offsetY;

var near = -10;
var far = 10;
var radius = 1.5;
var theta  = 0.0;
var phi    = 0.0;
var dr = 5.0 * Math.PI/180.0;

var left = -3.0;
var right = 3.0;
var ytop =3.0;
var bottom = -3.0;

var lightPosition = vec4(1.0, 1.0, 1.0, 0.0 );
var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0 );
var lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );

var materialAmbient = vec4( 1.0, 0.0, 1.0, 1.0 );
var materialDiffuse = vec4( 1.0, 0.8, 0.0, 1.0 );
var materialSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );
var materialShininess = 20.0;

var ctm;
var ambientColor, diffuseColor, specularColor;

var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;

var normalMatrix, normalMatrixLoc;

var eye;
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);

function translateY(vector, translateAmountY){
    var x = vector[0],
        y = vector[1],
        z = vector[2]

    return [x, y - translateAmountY, z]
}

function translateX(vector, translateAmountX){
    var x = vector[0],
        y = vector[1],
        z = vector[2]

    return [x + translateAmountX, y, z]
}

function click(mouse){
    clickX = (-1 + 2 * mouse.clientX/canvas.width);
    clickY = (-1 + 2 *(canvas.height - mouse.clientY)/canvas.height);
    offsetX = 0 + clickX;
    offsetY = 0 + clickY;
    makeSphere()
}

function triangle(a, b, c) {

     pointsArray.push(a);
     pointsArray.push(b);
     pointsArray.push(c);

     // normals are vectors

     normalsArray.push(vec4(a[0],a[1], a[2], 0.0));
     normalsArray.push(vec4(b[0],b[1], b[2], 0.0));
     normalsArray.push(vec4(c[0],c[1], c[2], 0.0));

     index += 3;

}

function divideTriangle(a, b, c, count) {
    if ( count > 0 ) {

        var ab = mix( a, b, 0.5);
        var ac = mix( a, c, 0.5);
        var bc = mix( b, c, 0.5);

        ab = normalize(ab, true);
        ac = normalize(ac, true);
        bc = normalize(bc, true);

        divideTriangle( a, ab, ac, count - 1 );
        divideTriangle( ab, b, bc, count - 1 );
        divideTriangle( bc, c, ac, count - 1 );
        divideTriangle( ab, bc, ac, count - 1 );
    }
    else {
        triangle( a, b, c );
    }
}

function tetrahedron(a, b, c, d, n) {
    divideTriangle(a, b, c, n);
    divideTriangle(d, c, b, n);
    divideTriangle(a, d, b, n);
    divideTriangle(a, c, d, n);
}

window.onload = function init() {

    canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );

    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    window.addEventListener("mousedown", click);
}

function makeSphere() {
    var ambientProduct = mult(lightAmbient, materialAmbient);
    var diffuseProduct = mult(lightDiffuse, materialDiffuse);
    var specularProduct = mult(lightSpecular, materialSpecular);

    tetrahedron(va, vb, vc, vd, numTimesToSubdivide);

    var nBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW );

    var vNormal = gl.getAttribLocation( program, "vNormal" );
    gl.vertexAttribPointer( vNormal, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vNormal);

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation( program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );
    normalMatrixLoc = gl.getUniformLocation( program, "normalMatrix" );

    gl.uniform4fv( gl.getUniformLocation(program,
       "ambientProduct"),ambientProduct );
    gl.uniform4fv( gl.getUniformLocation(program,
       "diffuseProduct"),diffuseProduct );
    gl.uniform4fv( gl.getUniformLocation(program,
       "specularProduct"), specularProduct );
    gl.uniform4fv( gl.getUniformLocation(program,
       "lightPosition"), lightPosition );
    gl.uniform1f( gl.getUniformLocation(program,
       "shininess"),materialShininess );

    render(true, 0);
}

function clearCanvas(){
    pointsArray = [];
    normalsArray = [];
    render(true, 0);
}

function render(clear, x) {
    if(clear){
        gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }

    eye = vec3(radius*Math.sin(theta)*Math.cos(phi),
        radius*Math.sin(theta)*Math.sin(phi), radius*Math.cos(theta));

    modelViewMatrix = lookAt(eye, at , up);
    projectionMatrix = ortho(left, right, bottom, ytop, near, far);

    // normal matrix only really need if there is nonuniform scaling
    // it's here for generality but since there is
    // no scaling in this example we could just use modelView matrix in shaders

    normalMatrix = mat3(
        modelViewMatrix[0], modelViewMatrix[1], modelViewMatrix[2],
        modelViewMatrix[4], modelViewMatrix[5], modelViewMatrix[6],
        modelViewMatrix[8], modelViewMatrix[9], modelViewMatrix[10]
    );

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, modelViewMatrix );
    gl.uniformMatrix4fv(projectionMatrixLoc, false, projectionMatrix );
    gl.uniformMatrix3fv(normalMatrixLoc, false, normalMatrix );

    for( var i=0; i<index; i+=3)
        gl.drawArrays( gl.TRIANGLES, i, 3);

    window.requestAnimFrame(render);
}
