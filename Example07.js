var http = require("http").createServer(handler); //on request - handler
var io = require("socket.io").listen(http); //socket library
var fs = require("fs");
var firmata = require("firmata");

var board = new firmata.Board("/dev/ttyACM0", function(){// ACM (Abstract Control Model) for serial communication with Arduino (could be USB)
    board.pinMode(13, board.MODES.OUTPUT); // Configures the specified pin to behave either as an input or an output.
    console.log("Enabling Push Button on pin 2");
    board.pinMode(2, board.MODES.INPUT);
});


 function handler(req, res){ // http.createServer([requestListener]) | The requestListener is a function which is automatically added to the 'request' event.
    fs.readFile(__dirname + "/Untitled3.html",
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
var sendValueViaSocket; //var for sending messages via socket

board.on("ready", function (){

io.sockets.on("connection", function(socket) {
    socket.emit("messageToClient", "Server Connected, brd OK");
    sendValueViaSocket = function (value){
        io.sockets.emit("messageToClient", value);
        
    };

    
});//end of sockets.on

board.digitalRead(2, function (value){
    if (value == 0) {
            console.log("LED OFF");
            board.digitalWrite(13, board.LOW);
            sendValueViaSocket(0);

        }
        else if (value == 1) {
            console.log("LED ON");
            board.digitalWrite(13, board.HIGH);
            sendValueViaSocket(1);
        }
});//end of board.digitalread

});//end of board.on