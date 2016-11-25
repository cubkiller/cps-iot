var http = require("http").createServer(handler); //on request - handler
var io = require("socket.io").listen(http); //socket library
var fs = require("fs");
var firmata = require("firmata");

var board = new firmata.Board("/dev/ttyACM0", function(){// ACM (Abstract Control Model) for serial communication with Arduino (could be USB)
    board.pinMode(0, board.MODES.ANALOG); //enabling analog pin 0
});


 function handler(req, res){ // http.createServer([requestListener]) | The requestListener is a function which is automatically added to the 'request' event.
    fs.readFile(__dirname + "/Untitled6.html",
    function (err, data) {
        if (err){
            res.writeHead(500, {"content-type": "text/plain"});
            return res.end("error loading html page");
        }
        res.writeHead(200);
        res.end(data);
    });
        

}
var desiredValue = 0;

http.listen(8080);//listen on port 8080.listen(8080, "172.16.22.146"); //listen on port 8080
var sendValueViaSocket = function(){}; //var for sending messages via socket

board.on("ready", function (){
board.analogRead(0, function(value){
    desiredValue = value; //continious read of analog pin 0
})
io.sockets.on("connection", function(socket) {
    socket.emit("messageToClient", "Server Connected, brd OK");
    
    setInterval(sendValues, 40, socket); // 40ms trigger func sendValue
    
});//end of sockets.on


});//end of board.on

function sendValues (socket){
    socket.emit("ClientReadValues", 
    {
        "desiredValue" : desiredValue    
    });
}