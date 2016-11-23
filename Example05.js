var http = require("http").createServer(handler); //on request - handler
var io = require("socket.io").listen(http); //socket library
var fs = require("fs");
var firmata = require("firmata");

var board = new firmata.Board("/dev/ttyACM0", function(){// ACM (Abstract Control Model) for serial communication with Arduino (could be USB)
    board.pinMode(13, board.MODES.OUTPUT); // Configures the specified pin to behave either as an input or an output.
});

 function handler(req, res){ // http.createServer([requestListener]) | The requestListener is a function which is automatically added to the 'request' event.
    fs.readFile(__dirname + "/Untitled2.html",
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


io.sockets.on("connection", function(socket) {
    socket.on("commandToArduino", function(commandNo){
        if (commandNo == 0) {
            board.digitalWrite(13, board.LOW); // write LOW on pin 13
        }
        if (commandNo == "1") {
            board.digitalWrite(13, board.HIGH); // write HIGH on pin 13
        }
        if (commandNo == "2") {
            board.digitalWrite(8, board.LOW); // write LOW on pin 8
        }
        if (commandNo == "3") {
            board.digitalWrite(8, board.HIGH); // write HIGH on pin 8
        }        
    });
});