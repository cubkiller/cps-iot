var http = require("http").createServer(handler); //on request - handler
var io = require("socket.io").listen(http); //socket library
var fs = require("fs");
var firmata = require("firmata");

var board = new firmata.Board("/dev/ttyACM0", function(){// ACM (Abstract Control Model) for serial communication with Arduino (could be USB)
    board.pinMode(2, board.MODES.INPUT); // direction of DC motor
    board.pinMode(3, board.MODES.PWM); // PWM of motor i.e. speed of rotation
    board.pinMode(4, board.MODES.OUTPUT); // direction DC motor
    board.digitalWrite(2,1); // initialization of digital pin 2 to rotate Left on start
    board.digitalWrite(4,0); // initialization of digital pin 2 to rotate Left on start
});


 function handler(req, res){ // http.createServer([requestListener]) | The requestListener is a function which is automatically added to the 'request' event.
    fs.readFile(__dirname + "/Untitled8.html",
    function (err, data) {
        if (err){
            res.writeHead(500, {"content-type": "text/plain"});
            return res.end("error loading html page");
        }
        res.writeHead(200);
        res.end(data);
    });
        

}

http.listen(8080);//listen on port 8080.listen(8080, "172.16.22.146"); //listen on port 8080

board.on("ready", function (){

io.sockets.on("connection", function(socket) {
    socket.emit("messageToClient", "Server Connected, brd OK");
    
    socket.on("sendPWM", function(pwm){
        board.analogWrite(3,pwm);

        socket.emit("messageToClient", "PWM set to: " + pwm);        
    });
    
    socket.on("left", function(value){
        board.digitalWrite(2,value.AIN1);
        board.digitalWrite(4,value.AIN2);
        socket.emit("messageToClient", "Direction: left");
    });
    
    socket.on("right", function(value){
        board.digitalWrite(2,value.AIN1);
        board.digitalWrite(4,value.AIN2);
        socket.emit("messageToClient", "Direction: right");
    });
    
   socket.on("stop", function(value){
        board.analogWrite(3,value);
        socket.emit("messageToClient", "Stop");
    });
    
});//end of sockets.on

});//end of board.on
