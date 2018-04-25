/* var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
  io.emit('chat message', "User is connected");
  socket.on('disconnect', function(){
    io.emit('chat message', "User is disconnected");
  }); 

  socket.on('chat', function(msg){
    socket.broadcast.emit('chat', `${msg.user} : ${msg.message}`);
  });

  socket.on('typing', function(msg){
    if (msg.typing) {
      socket.broadcast.emit('typing', `${msg.user} is typing...`);
    } else {
      socket.broadcast.emit('typing', '');
    }
  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
}); */

var socket = require('socket.io-client')('https://poc.viseo.io', {path: '/demo-02/socket.io'});
socket.on('sumerian', function(msg){
  console.log(msg);
});