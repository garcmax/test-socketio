'use strict';
	
// The sumerian object can be used to access Sumerian engine
// types.
//
/* global sumerian */
	
// Called when play mode starts.
//
function setup(args, ctx) {
    ctx.socket = io("https://sumerian-maxou.ddns.net");
	ctx.socket.on('chat', function(msg){
        console.log(msg);
    });
}
	
// Called on every render frame, after setup(). When used in a 
// ScriptAction, this function is called only while the state 
// containing the action is active.
//
// For the best performance, remove this function if it is not 
// used.
//
function update(args, ctx) {
   
}
	
// Called when play mode stops.
//
function cleanup(args, ctx) {
	ctx.socket.close();
}

// Defines script parameters.
//
var parameters = [];
