/**
* Plugin Name: Public-Key-Web-Login (PKWL)
* Author: Mirko Oleszuk
* URI: http://www.codepunks.net
* License: The MIT License (MIT)
*/

var popup = {

  /**
  * enable/disable login button
  * @param msg string sets value of login button and disables it
  * if empty button gets enabled
  */
  buttonReset: function(msg){

    if(undefined === msg){
      document.getElementById('LoginButton').value = "Login";
      document.getElementById('LoginButton').disabled = false;
    } else {
      document.getElementById('LoginButton').value = msg;
      document.getElementById('LoginButton').disabled = true;      
    }

  },

  /**
  * sends xml request to given hostname with the parameter username
  * and returns result from server via callback function
  */
  handleXMLRequest: function(hostname, data, callback){

    try {
      // create a new xml http request
      var xhr = new XMLHttpRequest();

      // get protocol string ("http:", "https:")
      var protocol = document.getElementById('protocol').value;

      // open request
      xhr.open("POST", protocol + "//" + hostname, true);

      // set header
      xhr.setRequestHeader("Content-type",    "application/x-www-form-urlencoded");

      // result received
      xhr.onreadystatechange = function(){
        
        if( xhr.readyState == 4 && xhr.status == 200 ){

          // save response
          var result = xhr.responseText;

          // return result via callback (still unescaped here, be careful!)
          callback(result);
        }
      }

      // send the request
      xhr.send(data);

    } catch(e) {

      // message the user about the error      
      console.log("ERROR: XMLHttpRequest not supported! Pleas update your client!", e);
      log("ERROR: XMLHttpRequest not supported! Pleas update your client!");

      // re-enable button
      popup.buttonReset();
    }
  },

  /**
  * get data from html and form
  * query key from db
  * send auth-request, handle tlp, handle decryption, handle cookies
  */
  auth: function(){
    //console.log("OK: popup.auth() called!");

    // get vars from form
    var hostname = document.getElementById('hostname').innerHTML;
    var username = document.getElementById('username').value;

    // redirect to new host page
    if(username == ""){
      self.location = '/html/host_new.html';
    }

    // show loading infos
    popup.buttonReset("Please wait...");

    // query id of key
    pkwl.getKeyID(hostname, username, function(keyid){
      //console.log("RET: getKeyID(", hostname, username, ") = ", keyid);

      if(!keyid){
        console.log("ERROR: No key found! (getKeyID)");
        log("ERROR: No key found! Please associate a key with this hostname and username!");
        popup.buttonReset();
        return;
      }

      // get the actual key numbers
      pkwl.getKey(keyid, function(returnedkey){        
        //console.log("RET: getKey(", keyid, ") = ", returnedkey);

        if(!returnedkey){
          console.log("ERROR: No key found! (getKey)");
          log("ERROR: No key found! Please associate a key with this hostname and username!");
          popup.buttonReset();
          return;
        }

        // key management
        var bits = 2048;

        // set internal precision, keysize in byte + bonus (see RSA/BigInt.js)
        setMaxDigits(bits / 8 + 32);

        // object RSAKeyPair(private exponent, public exponent, modulus)
        // e and d switch places here, because we want to encrypt with the private key
        // so that the server can decrypt with the public key
        var key = new RSAKeyPair(returnedkey.e, returnedkey.d, returnedkey.n);

        // build xml request data
        var xmldata = "pkwl_action=auth&pkwl_username=" + username;

        // request tlp from server
        popup.handleXMLRequest(hostname, xmldata, function(result){
          //console.log("OK: TLP received:", result);

          // handle result
          switch(result){

            case "ERROR-INVALID-ACTION":
                    console.log("ERROR: INVALID ACTION");
                    log("ERROR: Invalid action.");
                    popup.buttonReset();
                    return;

            case "ERROR-INVALID-USER":
                    console.log("ERROR: INVALID USER");
                    log("ERROR: The selected username does not exist on the website or hasn't uploaded a public-key!");
                    popup.buttonReset();
                    return;

            case "ERROR-NO-PUBLICKEY":
                    console.log("ERROR: SERVER HAS NO PUBLIC-KEY");
                    log("ERROR: Please add a public-key to your account.");
                    popup.buttonReset();
                    return;
          }

          // handle input
          var data      = result.split(";");
          var n         = data[0];
          var t         = data[1];

          // solve puzzle
          var solution = SolPuzzle(t, n);

          // build xml request data
          var xmldata = "";
          xmldata += "pkwl_action=" + "auth";
          xmldata += "&pkwl_username=" + username;
          xmldata += "&pkwl_solution=" + solution;

          // send data to server
          popup.handleXMLRequest(hostname, xmldata, function(result){
            //console.log("OK: Received Cookie Data", result);

            // handle the xmlrequest result
            switch(result){

              case "ERROR-INVALID-ACTION": 
                log("ERROR: Action invalid.");
                popup.buttonReset();
                return;
              
              case "ERROR-NO-PUBLICKEY":  
                log("No public-key found! Please upload a public-key to your account");
                popup.buttonReset();
                return;

              case "ERROR-TLP-INVALID":
                log("ERROR: TLP invalid. Please try again.");
                popup.buttonReset();
                return;

              case "ERROR-TLP-EXPIRED":
                log("ERROR: TLP expired. Please try again.");
                popup.buttonReset();
                return;
            }

            // handle input
            var ciphertext = result.split(";");

            // decrypt data and concat to string
            var plaintext = "";
            for(var i = 0; i < ciphertext.length; i++){
              plaintext += decryptedString(key, ciphertext[i]);
            }

            // parse cookiestring
            var cookiedata = plaintext.split(";");
            for(var i = 0; i < cookiedata.length; i++){

              try {
                
                // parse cookie content
                var c = cookiedata[i].split(",");
                c[0] = document.getElementById('protocol').value + "//" + c[0];
                c[4] = parseInt(c[4]);

                // set cookie via chrome api
                chrome.cookies.set({ url: c[0], name: c[1], value: c[2], path: c[3], expirationDate: c[4], httpOnly: true }, function(cookie){
                  //console.log("OK: Cookie set!");
                });

              } catch(e){
                
                console.log("ERROR: Could not decrypt data!");
                log("ERROR: Could not decrypt data! Did you use the correct key?");
                popup.buttonReset();
                return;

              }
            }

            // call chrome tabs api for reloading
            chrome.tabs.query({'active':true}, function(tabs){

              // reload the active tab
              chrome.tabs.reload();

              // close plugin window
              window.close();

            });
          });
        });
      });
    });
  },

  /**
  * init call
  * get hostname
  * query saved hostnames
  */
  init: function(){
    //console.log("OK: pkwl.init() called!");
    try {
      // get active tab url
      chrome.tabs.query({'active':true}, function(tabs){
       
        // parse hostname from url string via dom js function
        var parser = document.createElement('a');

        // set url of active tab as parser href to access the hostname, protocol, etc. via parser.*
        parser.href = tabs[0].url;

        // set hostname as headline
        document.getElementById('hostname').innerHTML = parser.hostname;

        // save protocol for later use when requesting tlp
        document.getElementById('protocol').value = parser.protocol;

        // getAllObjects(table, outputmode, preselection, searchterm, resultid){
        pkwl.getAllObjects("hosts", "username-only", "", parser.hostname, "username");

      });
    } catch(e){
      // not running chrome
      console.log("ERROR: This plugin is not running in chrome!");
    }
  }
};

/**
* Init
*/
function bodyLoad(){
  // register events
  document.getElementById("LoginButton").addEventListener("click", popup.auth, false);

  // init database
  pkwl.initDatabase();

  // init popup
  popup.init();
};


/**
* SolPuzzle() solves given puzzle
* @param t timeslotvar
* @param n = p*q
*/
function SolPuzzle(t, n){
  // bigInt  str2bigInt(s,b,n,m)    //return a bigInt for number represented in string s in base b with at least n bits and m array elements
  var n   = str2bigInt(n, 10, 0);
  var s   = int2bigInt(2, 10, 0);
  var two = int2bigInt(2, 10, 0);
  for(i = 0; i < t; i++){
    s = powMod(s, two, n);
  }
  return bigInt2str(s,10);
}


/**
* Run my function bodyLoad() after Document Object Model (DOM) has been loaded
* useCapture = false (default)
*/
document.addEventListener("DOMContentLoaded", bodyLoad, false);
