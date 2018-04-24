var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
 /*  io.emit('chat message', "User is connected");
  socket.on('disconnect', function(){
    io.emit('chat message', "User is disconnected");
  }); */

  socket.on('chat message', function(msg){
    socket.broadcast.emit('chat message', `${msg.user} : ${msg.message}`);
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
});