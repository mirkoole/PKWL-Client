/**
* Plugin Name: Public-Key-Web-Login (PKWL)
* Author: Mirko Oleszuk
* URI: http://www.codepunks.net
* License: The MIT License (MIT)
*/


/**
* get hostname, print it to the form using the chrome api
*/
function getHostname(){
  try {
    // async call: get url of the active tab
    chrome.tabs.query({'active':true}, function(tabs){

      // parse hostname from url string via dom js function
      var parser = document.createElement('a');

      // set url of active tab as parser href to access the hostname, protocol, etc. via parser.*
      parser.href = tabs[0].url;

      // set hostname as headline
      document.getElementById('hostname').innerHTML = parser.hostname;

    });
  } catch(e) {
    console.log("ERROR: This plugin is not running in chrome!");
    // this code does not run in chromes plugin sandbox
  }
}


/**
* save hostname, username and keyid to the database
*/
function saveButtonClick(){
  // read data from form
  var hostname = document.getElementById('hostname').innerHTML; 
  var username = document.getElementById('username').value;
  var keyid    = document.getElementById('keys').value;

  // check for valid input
  if(hostname == ""){
    log("Please provide a hostname!");
    return false;
  }

  if(username == ""){
    log("Please provide a username!");
    return false;
  }

  if(keyid == 0){
    log("Please select a key!");
    return false;
  }

  // save configuration to database
  pkwl.addHost(hostname, username, keyid);

  log("Configuration saved!");
}


/**
* Init
*/
function bodyLoad(){
  // register events
  document.getElementById("GenerateKeyButton").addEventListener("click", generateKeyButtonClick, false);
  document.getElementById("SaveButton").addEventListener("click", saveButtonClick, false);
  document.getElementById("keys").addEventListener("change", getKeyData, false);

  // init db
  pkwl.initDatabase();

  // getAllObjects(table, outputmode, preselection, searchterm, resultid){
  pkwl.getAllObjects("keys", "keyname-only", "", "", "keys");

  // get current hostname and write it into the html form
  getHostname();
}

/**
* Run my function bodyLoad() after Document Object Model (DOM) has been loaded
* useCapture = false (default)
*/
document.addEventListener("DOMContentLoaded", bodyLoad, false);