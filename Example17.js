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
    fs.readFile(__dirname + "/Untitled12.html",
    function (err, data) {
        if (err){
            res.writeHead(500, {"content-type": "text/plain"});
            return res.end("error loading html page");
        }
        res.writeHead(200);
        res.end(data);
    });
        

}

var factor = 0.2; // proportional factor that determines the speed of aproaching toward desired value
var desiredValue = 0;
var actualValue = 0; // variable for actual value (output value)
// PID Algorithm variables
var Kp = 0.55; // proportional factor
var Ki = 0.008; // integral factor
var Kd = 0.15; // differential factor

http.listen(8080);//listen on port 8080.listen(8080, "172.16.22.146"); //listen on port 8080
var sendValueViaSocket = function(){}; //var for sending messages via socket
var sendStaticMsgViaSocket = function() {}; // function to send static message over socket
var controlAlgorithmStartedFlag = 0; // flag in global scope to see weather ctrlAlg has been started
var intervalCtrl; // var for setInterval in global space
var pwm = 0;
var pwmLimit = 254;

var err = 0; // variable for second pid implementation
var errSum = 0; // sum of errors
var dErr = 0; // difference of error
var lastErr = 0; // to keep the value of previous error

board.on("ready", function (){

board.analogRead(0, function(value){
    desiredValue = value; //continious read of analog pin 0
})
board.analogRead(1, function(value) {
    actualValue = value; // continuous read of pin A1
})

io.sockets.on("connection", function(socket) {
    socket.emit("messageToClient", "Server Connected, brd OK");
    socket.emit("staticMsgToClient", "Server connected, board ready.")
        setInterval(sendValues, 40, socket); // 40ms trigger func sendValue
    
    socket.on("sendPWM", function(pwm){
        board.analogWrite(3,pwm);

        socket.emit("messageToClient", "PWM set to: " + pwm);        
    });

socket.on("startControlAlgorithm", function(numberOfControlAlgorithm){
         startControlAlgorithm(numberOfControlAlgorithm);
});
     sendValueViaSocket = function (value) {
         io.sockets.emit("messageToClient", value);
     }
     
     sendStaticMsgViaSocket = function (value) {
         io.sockets.emit("staticMsgToClient", value);
     }
    
socket.on("stopControlAlgorithm", function(){
    stopControlAlgorithm();
});
    
});//end of sockets.on

});//end of board.on


 function controlAlgorithm (parameters) {
     if (parameters.ctrlAlgNo == 1) {
         pwm = parameters.pCoeff*(desiredValue-actualValue);
         if(pwm > pwmLimit) {pwm = pwmLimit}; // to limit the value for pwm / positive
         if(pwm < -pwmLimit) {pwm = -pwmLimit}; // to limit the value for pwm / negative
         if (pwm > 0) {board.digitalWrite(2,1); board.digitalWrite(4,0);}; // določimo smer če je > 0
         if (pwm < 0) {board.digitalWrite(2,0); board.digitalWrite(4,1);}; // določimo smer če je < 0
         board.analogWrite(3, Math.abs(pwm));
         console.log(Math.round(pwm));
     }
     if (parameters.ctrlAlgNo == 2) {
	          err = desiredValue - actualValue; // error
	          errSum += err; // sum of errors, like integral
	          dErr = err - lastErr; // difference of error
         pwm = parameters.Kp1*err + parameters.Ki1*errSum + parameters.Kd1*dErr;
	          lastErr = err; // save the value for the next cycle
	          if(pwm > pwmLimit) {pwm = pwmLimit}; // to limit the value for pwm / positive
	          if(pwm < -pwmLimit) {pwm = -pwmLimit}; // to limit the value for pwm / negative
	          if (pwm > 0) {board.digitalWrite(2,1); board.digitalWrite(4,0);}; // določimo smer če je > 0
	          if (pwm < 0) {board.digitalWrite(2,0); board.digitalWrite(4,1);}; // določimo smer če je < 0
     board.analogWrite(3, Math.abs(pwm));        
     }
};

function sendValues (socket){
    socket.emit("ClientReadValues", 
    {
        "desiredValue" : desiredValue,
        "actualValue": actualValue,
        "pwm" : pwm
    });
}

function startControlAlgorithm (parameters) {
	      if (controlAlgorithmStartedFlag == 0) {
	          controlAlgorithmStartedFlag = 1; // set flag that the algorithm has started
         intervalCtrl = setInterval(function() {controlAlgorithm(parameters); }, 30); // na 30ms klic
         console.log("Control algorithm " + parameters.ctrlAlgNo + " started");
         sendStaticMsgViaSocket("Control algorithm " + parameters.ctrlAlgNo + " started | " + json2txt(parameters));
	      }
	  };





function stopControlAlgorithm () {
    clearInterval(intervalCtrl); // clear the interval of control algorihtm
    board.analogWrite(3,0); // write 0 on pwm pin to stop the motor
    controlAlgorithmStartedFlag = 0; // set flag that the algorithm has stopped
          pwm = 0; // set pwm to 0
     console.log("ctrlAlg STOPPED");
     sendStaticMsgViaSocket("Stop");
};


function json2txt(obj) // function to print out the json names and values
 {
   var txt = '';
   var recurse = function(_obj) {
     if ('object' != typeof(_obj)) {
       txt += ' = ' + _obj + '\n';
     }
     else {
       for (var key in _obj) {
         if (_obj.hasOwnProperty(key)) {
           txt += '.' + key;
           recurse(_obj[key]);
         } 
       }
     }
   };
   recurse(obj);
   return txt;
 }