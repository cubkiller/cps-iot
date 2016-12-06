var http = require("http").createServer(handler); // handler will be the function with req, res as in previous example, just separated
var io = require("socket.io").listen(http); // socket.io for permanent connection between server and client
var fs = require("fs"); // variable fo "file system", i.e. fs
var firmata = require("firmata"); // make pins on Arduin oaccesible via serial-USB communication
var sendValueViaSocket = function() {}; // function to send message over socket
var sendStaticMsgViaSocket = function() {}; // function to send static message over socket
	 function handler(req, res) { // function with request and response, that is used in the first line of this example
     fs.readFile(__dirname + "/Untitled16.html",
      function (err, data){
          if (err) {
              res.writeHead(500, {"Content-Type": "text/plain"});
              return res.end("Error loading html page.");
	          }
      res.writeHead(200);
      res.end(data);
	      })
	  }
var desiredValue = 0; // variable for desired value (reference value or input)
var actualValue = 0; // variable for actual value (output value)
 // PID Algorithm variables
var Kp = 0.55; // proportional factor
var Ki = 0.008; // integral factor
var Kd = 0.15; // differential factor
var pwm = 0;
var pwmLimit = 110;
var lastPWM = 0; // to check, weather pwm has changed, not to call it all the time
var err = 0; // variable for second pid implementation
var errSum = 0; // sum of errors
var dErr = 0; // difference of error
var lastErr = 0; // to keep the value of previous error
var controlAlgorithmStartedFlag = 0; // flag in global scope to see weather ctrlAlg has been started
var intervalCtrl; // var for setInterval in global space
var readAnalogPin0Flag = 1; // for reading the pin if pot is driver
var KpE = 0; // multiplication of Kp x error
var KiIedt = 0; // multiplication of Ki x integral of error
var KdDe_dt = 0; // multiplication of Kd x differential of error i.e.e Derror/dt
var errSumAbs = 0; // sum of absolute errors as performance measure
var parametersStore ={}; // variable for json structure of parameters
var errAbs = 0; // absolute error
var errLast = 0;


http.listen(8080); // determine on which port to listen (8080)
console.log("Starting the system"); // print the message to the console
var board = new firmata.Board("/dev/ttyACM0", function(){ // ACM Abstract Control Model for serial communication with Arduino (could be USB)
	      console.log("Connecting to Arduino");
	      board.pinMode(0, board.MODES.ANALOG); // analog pin 0
          board.pinMode(1, board.MODES.ANALOG); // analog pin 1
	      board.pinMode(2, board.MODES.OUTPUT); // direction of DC motor
	      board.pinMode(3, board.MODES.PWM); // PWM of motor i.e. speed of rotation
	      board.pinMode(4, board.MODES.OUTPUT); // direction DC motor
	  });
	 
	  board.on("ready", function() {
	 
	  board.analogRead(0, function(value) {
	      if (readAnalogPin0Flag == 1) desiredValue = value; // continuous read of pin A0
	  });
	 
	  board.analogRead(1, function(value) {
	      actualValue = value; // continuous read of pin A1
	  });
	 
	  io.sockets.on('connection', function(socket) {  // from bracket ( onward, we have an argument of the function on -> at 'connection' the argument is transfered i.e. function(socket)
	 
	      socket.emit("messageToClient", "Server connected, board ready.");
	      socket.emit("staticMsgToClient", "Server connected, board ready.")
	 
	      setInterval(sendValues, 40, socket); // na 40ms we send message to client
	 
	      socket.on("startControlAlgorithm", function(numberOfControlAlgorithm){
	          startControlAlgorithm(numberOfControlAlgorithm);
	               });
  
     socket.on("sendPosition", function(position){
         readAnalogPin0Flag = 0; // to stop reading from pin 0
         desiredValue = position; // now the desired value from the GUI takes control
         socket.emit("messageToClient", "Position set to: position.")
	      });
	 
	      socket.on("stopControlAlgorithm", function(){
	          stopControlAlgorithm();
	      });
	 
	      sendValueViaSocket = function (value) {
	          io.sockets.emit("messageToClient", value);
      }
	 
	      sendStaticMsgViaSocket = function (value) {
	          io.sockets.emit("staticMsgToClient", value);
	      }
 
	  });
	 
  });
	 
	  function controlAlgorithm (parameters) {
	      if (parameters.ctrlAlgNo == 1) {
	          pwm = parameters.pCoeff*(desiredValue-actualValue);
	          errAbs = Math.abs(desiredValue-actualValue);
	          errSumAbs += errAbs;
	          if(pwm > pwmLimit) {pwm = pwmLimit}; // to limit the value for pwm / positive
	          if(pwm < -pwmLimit) {pwm = -pwmLimit}; // to limit the value for pwm / negative
	          if (pwm > 0) {board.digitalWrite(2,1); board.digitalWrite(4,0);}; // določimo smer če je > 0
	          if (pwm < 0) {board.digitalWrite(2,0); board.digitalWrite(4,1);}; // določimo smer če je < 0
	          board.analogWrite(3, Math.round(Math.abs(pwm)));
	          console.log(Math.round(pwm));
	      }
	      if (parameters.ctrlAlgNo == 2) {
	          err = desiredValue - actualValue; // error
	          errSum += err; // sum of errors, like integral
         errAbs = Math.abs(err);
         errSumAbs += errAbs;
          dErr = err - lastErr; // difference of error
         // for sending to client we put the parts to global scope
         KpE=parameters.Kp1*err;
         KiIedt=parameters.Ki1*errSum;
         KdDe_dt=parameters.Kd1*dErr;
         pwm = KpE + KiIedt + KdDe_dt; // above parts are used
	          lastErr = err; // save the value for the next cycle
	          if(pwm > pwmLimit) {pwm = pwmLimit}; // to limit the value for pwm / positive
          if(pwm < -pwmLimit) {pwm = -pwmLimit}; // to limit the value for pwm / negative
	          if (pwm > 0) {board.digitalWrite(2,1); board.digitalWrite(4,0);}; // določimo smer če je > 0
	          if (pwm < 0) {board.digitalWrite(2,0); board.digitalWrite(4,1);}; // določimo smer če je < 0
	                  board.analogWrite(3, Math.abs(pwm));        
     }
      if (parameters.ctrlAlgNo == 3) {
         err = desiredValue - actualValue; // error as difference between desired and actual val.
         errSum += err; // sum of errors | like integral
         errAbs = Math.abs(err);
         errSumAbs += errAbs;
         dErr = err - lastErr; // difference of error
         pwm = parameters.Kp2*err+parameters.Ki2*errSum+parameters.Kd2*dErr; // PID expression
         console.log(parameters.Kp2 + "|" + parameters.Ki2 + "|" + parameters.Kd2);
         lastErr = err; // save the value of error for next cycle to estimate the derivative
         if (pwm > pwmLimit) {pwm =  pwmLimit}; // to limit pwm values
         if (pwm < -pwmLimit) {pwm = -pwmLimit}; // to limit pwm values
         if (pwm > 0) {board.digitalWrite(2,1); board.digitalWrite(4,0);}; // direction if > 0
         if (pwm < 0) {board.digitalWrite(2,0); board.digitalWrite(4,1);}; // direction if < 0
	          board.analogWrite(3, Math.abs(pwm));  
	              }
     if (parameters.ctrlAlgNo == 4) {
         errLast = err;
         err = desiredValue - actualValue; // error
         errSum += err; // sum of errors, like integral
         errAbs = Math.abs(err);
         errSumAbs += errAbs;
         dErr = err - lastErr; // difference of error
         // for sending to client we put the parts to global scope
         KpE=parameters.Kp3*err;
         KiIedt=parameters.Ki3*errSum;
         KdDe_dt=parameters.Kd3*dErr;
         console.log(parameters.Ki3 + " " + 254/parameters.Ki3 + " " + errSum)
         if(errSum > 254/parameters.Ki3)
             errSum = 254/parameters.Ki3;
         if(errSum < -254/parameters.Ki3)
             errSum = -254/parameters.Ki3;
         if(err*errLast < 0)
             errSum = 0;
             pwm = KpE + KiIedt + KdDe_dt; // above parts are used
             lastErr = err; // save the value for the next cycle
         if(pwm > pwmLimit) {pwm = pwmLimit}; // to limit the value for pwm / positive
         if(pwm < -pwmLimit) {pwm = -pwmLimit}; // to limit the value for pwm / negative
         if (pwm > 0) {board.digitalWrite(2,1); board.digitalWrite(4,0);}; // določimo smer če je > 0
         if (pwm < 0) {board.digitalWrite(2,0); board.digitalWrite(4,1);}; // določimo smer če je < 0
         board.analogWrite(3, Math.abs(pwm));    
         console.log("algorithm 4 444");
	      }
	  };
	 
  function sendValues (socket) {
	      socket.emit("clientReadValues",
	      { // json notation between curly braces
      "desiredValue": desiredValue,
      "actualValue": actualValue,
        "pwm": pwm,
        "err": err,
        "errSum": errSum,
     "dErr": dErr,
     "KpE": KpE,
     "KiIedt": KiIedt,
     "KdDe_dt": KdDe_dt	 ,
     "errSumAbs": errSumAbs,
     "errAbs": errAbs
     });
 
     
     
	  };
	  function startControlAlgorithm (parameters) {
	      if (controlAlgorithmStartedFlag == 0) {
	          controlAlgorithmStartedFlag = 1; // set flag that the algorithm has started
	          intervalCtrl = setInterval(function() {controlAlgorithm(parameters); }, 30); // na 30ms klic
	          console.log("Control algorithm " + parameters.ctrlAlgNo + " started");
	          sendStaticMsgViaSocket("Control algorithm " + parameters.ctrlAlgNo + " started | " + json2txt(parameters));
	          parametersStore = parameters; // store to report back to the client on algorithm stop
      }
	  };
	 
	  function stopControlAlgorithm () {
	      clearInterval(intervalCtrl); // clear the interval of control algorihtm
	      board.analogWrite(3,0); // write 0 on pwm pin to stop the motor
	      sendStaticMsgViaSocket("Control algorithm " + parametersStore.ctrlAlgNo + " stopped | " + json2txt(parametersStore) + " | errSumAbs = " + errSumAbs);
	      controlAlgorithmStartedFlag = 0; // set flag that the algorithm has stopped
	      pwm = 0; // set pwm to 0
	      err = 0; // error
	      errSum = 0; // sum of errors, like integral
	      dErr = 0; // difference of error
	      KpE = 0;
	      KiIedt = 0;
	      KdDe_dt = 0;
	      errSumAbs = 0;
	      errLast = 0;
	      parametersStore = {}; // empty temporary json object to report at controAlg stop
	      console.log("ctrlAlg STOPPED");
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