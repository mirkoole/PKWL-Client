/**
* Plugin Name: Public-Key-Web-Login (PKWL)
* Author: Mirko Oleszuk
* URI: http://www.codepunks.net
* License: The MIT License (MIT)
*/


/**
* Global Vars for the RSA-Key
*/
var name;
var n;
var e;
var d;
var p;
var q;


/**
* generateKey()
*
* starts the rsa-key-generation process of the forge-lib
*/
function generateKey(){
  console.log("OK: generating new key...");

  // key size in bit
  var bits = 2048;

  // public exponent
  var publicexpontent = 0x10001;

  // save starttime
  var start = new Date().getTime();

  // generate an RSA key pair
  var keypair = forge.pki.rsa.generateKeyPair(bits, publicexpontent);

  // calc runtime
  var end = new Date().getTime();
  var runtime = (end - start)/1000;
  console.log("OK: Key Generation Runtime: " + runtime + "s");

  // copy numbers from key
  n = keypair.privateKey.n;
  e = keypair.privateKey.e;
  d = keypair.privateKey.d;

  // convert dec to hex
  n = n.toString(16);
  e = e.toString(16);
  d = d.toString(16);
}


/**
* starts generation of a new key, saves it to the database and selects it automatically
*/
function generateKeyButtonClick(){

  name = document.getElementById("new_key_name").value;

  if(name == ""){
    log("Please provide a name for your key!");
    return;
  }

  // generate a new key
  generateKey();

  // save the new key to db
  pkwl.addKey(name, n, e, d);

  // reload the key-<select> field and pre-select our new key
  // getAllObjects(table, outputmode, preselection, searchterm, resultid){
  pkwl.getAllObjects("keys", "keyname-only", name, "", "keys");

  log("New Key generated!")

  // print the public key
  document.getElementById("publickey").value = n;

  // clear the name input field
  document.getElementById("new_key_name").value = "";
}


/**
* imports key from input fields to database
*/
function importKeyButtonClick(){
  // read data from form
  name  = document.getElementById("import_name").value;
  n     = document.getElementById("import_n").value;
  e     = document.getElementById("import_e").value;
  d     = document.getElementById("import_d").value;

  // check for empty fields
  if(name == "" || n == "" || e == "" || d == ""){
    log("Please fill out all fields!");
    return;
  }

  // disable button to avoid double imports
  document.getElementById("ImportKeyButton").disabled = true;
  document.getElementById("ImportKeyButton").value = "Please Wait...";

  // insert new key to db
  pkwl.addKey(name, n, e, d);

  // getAllObjects(table, outputmode, preselection, searchterm, resultid){
  pkwl.getAllObjects("keys", "keyname-only", name, "", "keys");

  log("Key has been added!");

  // clear input fields
  document.getElementById("import_name").value = "";
  document.getElementById("import_n").value = "";
  document.getElementById("import_e").value = "";
  document.getElementById("import_d").value = "";

  // re-enable button
  document.getElementById("ImportKeyButton").disabled = false;
  document.getElementById("ImportKeyButton").value = "Import Key";
}

/**
* deletes selected key
*/
function deleteKeyButtonClick(){
  // read keyid from form
  var id = document.getElementById("keys").value;

  // check for valid id
  if(id == 0){
    log("Please select a key!")
    return;
  }

  // safety question
  // bug in chrome displays the confirm box behind the plugin window
  // and making it impossible to click "ok" or "cancel"
  /*
  if(!confirm("Do you really want to delete this key?")){
    return;
  }
  */
  
  // disable button to avoid accidentially deletion of more keys
  document.getElementById("DeleteKeyButton").disabled = true;
  document.getElementById("DeleteKeyButton").value = "Please Wait...";

  // the leading plus converts keyid from string to int
  pkwl.deleteID("keys", +id);

  // reload keys
  // getAllObjects(table, outputmode, preselection, searchterm, resultid){
  pkwl.getAllObjects("keys", "keyname-only", "reload", "", "keys");

  // re-enable delete key
  document.getElementById("DeleteKeyButton").disabled = false;
  document.getElementById("DeleteKeyButton").value = "Delete Key";

  // clear public key field to avoid confusion
  document.getElementById("publickey").value = "";
}


/**
* queries the key
*/
function getKeyData(){
  // read keyid from form
  var keyid = document.getElementById("keys").value;

  // check id
  if(keyid == 0) return;

  // query key from db
  pkwl.getKey(keyid, function(returnedkey){
    var key = returnedkey;

    // write values to form
    document.getElementById("publickey").value = key.n;
  });
}

/**
* Init
*/
function bodyLoad(){
  // register events
  document.getElementById("GenerateKeyButton").addEventListener("click", generateKeyButtonClick, false);
  document.getElementById("keys").addEventListener("change", getKeyData, false);

  // initdb and getAllObjects already done in host_new.js
  if(self.location.pathname == "/html/key_management.html"){
    // register these events only on key_management page
    document.getElementById("ImportKeyButton").addEventListener("click", importKeyButtonClick, false);
    document.getElementById("DeleteKeyButton").addEventListener("click", deleteKeyButtonClick, false);

    // init db
    pkwl.initDatabase();

    // get all keys
    // getAllObjects(table, outputmode, preselection, searchterm, resultid){
    pkwl.getAllObjects("keys", "keyname-only", "", "", "keys");
  }
}

/**
* Run my function bodyLoad() after Document Object Model (DOM) has been loaded
* useCapture = false (default)
*/
document.addEventListener("DOMContentLoaded", bodyLoad, false);