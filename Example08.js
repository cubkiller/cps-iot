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
    fs.readFile(__dirname + "/Untitled4.html",
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
var sendValueViaSocket = function(){}; //var for sending messages via socket

board.on("ready", function (){

io.sockets.on("connection", function(socket) {
    socket.emit("messageToClient", "Server Connected, brd OK");
    sendValueViaSocket = function (value){
        io.sockets.emit("messageToClient", value);
        
    };

    
});//end of sockets.on

var timeout = false;
var sensivity = 25;
var last_sent = null;
var last_value = null;
board.digitalRead(2, function(value) { // this happens many times on digital input change of state 0->1 or 1->0
    if (timeout !== false) { // if timeout below has been started (on unstable input 0 1 0 1) clear it
	   clearTimeout(timeout); // clears timeout until digital input is not stable i.e. timeout = false
    }
    timeout = setTimeout(function() { // this part of code will be run after 50 ms; if in-between input changes above code clears it
        console.log("Timeout set to false");
        timeout = false;
        if (last_value != last_sent) { // to send only on value change
        	if (value == 0) {
                console.log("LED OFF");
                board.digitalWrite(13, board.LOW);
                console.log("value = 0, LED OFF");
            }
            else if (value == 1) {
                console.log("LED ON");
                board.digitalWrite(13, board.HIGH);
                console.log("value = 1, LED lit");
            }
            sendValueViaSocket( "Value = " + value);
        }

        last_sent = last_value;
    }, 25); // execute after 50ms
                
    last_value = value; // this is read from pin 2 many times per s
                
}); // end board.digitalRead on pin 2

});//end of board.on