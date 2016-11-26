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
    board.pinMode(0, board.MODES.ANALOG); //enabling analog pin 0
    board.pinMode(1, board.MODES.ANALOG); // analog pin 1
});


 function handler(req, res){ // http.createServer([requestListener]) | The requestListener is a function which is automatically added to the 'request' event.
    fs.readFile(__dirname + "/Untitled9.html",
    function (err, data) {
        if (err){
            res.writeHead(500, {"content-type": "text/plain"});
            return res.end("error loading html page");
        }
        res.writeHead(200);
        res.end(data);
    });
        

}

var factor = 0.1; // proportional factor that determines the speed of aproaching toward desired value
var desiredValue = 0;
var actualValue = 0; // variable for actual value (output value)
http.listen(8080);//listen on port 8080.listen(8080, "172.16.22.146"); //listen on port 8080
var sendValueViaSocket = function(){}; //var for sending messages via socket

board.on("ready", function (){

board.analogRead(0, function(value){
    desiredValue = value; //continious read of analog pin 0
})
startControlAlgorithm();
board.analogRead(1, function(value) {
    actualValue = value; // continuous read of pin A1
})

io.sockets.on("connection", function(socket) {
    socket.emit("messageToClient", "Server Connected, brd OK");
        setInterval(sendValues, 40, socket); // 40ms trigger func sendValue
    
    socket.on("sendPWM", function(pwm){
        board.analogWrite(3,pwm);

        socket.emit("messageToClient", "PWM set to: " + pwm);        
    });

    
});//end of sockets.on

});//end of board.on

function sendValues (socket){
    socket.emit("ClientReadValues", 
    {
        "desiredValue" : desiredValue,
        "actualValue": actualValue
    });
}

function controlAlgorithm () {
    var pwm = factor*(desiredValue-actualValue);
    if(pwm > 255) {pwm = 255}; // to limit the value for pwm / positive
    if(pwm < -255) {pwm = -255}; // to limit the value for pwm / negative
    if (pwm > 0) {board.digitalWrite(2,1); board.digitalWrite(4,0);}; // določimo smer če je > 0
    if (pwm < 0) {board.digitalWrite(2,0); board.digitalWrite(4,1);}; // določimo smer če je < 0
    board.analogWrite(3, Math.abs(pwm));
};

function startControlAlgorithm () {
    setInterval(function() {controlAlgorithm(); }, 30); // na 30ms call
    console.log("Control algorithm started")
};
