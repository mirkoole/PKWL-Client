/**
* Plugin Name: Public-Key-Web-Login (PKWL)
* Author: Mirko Oleszuk
* URI: http://www.codepunks.net
* License: The MIT License (MIT)
*/


/**
* delete selected host
*/
function deleteButtonClick(){
  // get id from form
  var id = document.getElementById("hosts").value;

  // check for valid id
  if(id == 0){
    log("Please select a host!")
    return;
  }

  // safety question
  /*
  // bug in chrome displays the confirm box behind the plugin window
  // and making it impossible to click "ok" or "cancel"
  if(!confirm("Do you really want to delete this host configuration?")){
    return;
  }
  */

  // disable button to avoid accidentially deleting more data
  document.getElementById("DeleteButton").disabled = true;
  document.getElementById("DeleteButton").value = "Please Wait...";

  // the leading plus converts the id from string to int
  pkwl.deleteID("hosts", +id);

  // reload <select>-field
  // getAllObjects(table, outputmode, preselection, searchterm, resultid){
  pkwl.getAllObjects("hosts", "hostname-username", "reload", "", "hosts");

  // re-enable delete key
  document.getElementById("DeleteButton").disabled = false;
  document.getElementById("DeleteButton").value = "Delete Key";
}


/**
* Init
*/
function bodyLoad(){
  // register events
  document.getElementById("DeleteButton").addEventListener("click", deleteButtonClick, false);

  // init db
  pkwl.initDatabase();

  // query all objects: table, mode, item to pre-select
  // getAllObjects(table, outputmode, preselection, searchterm, resultid){
  pkwl.getAllObjects("hosts", "hostname-username", "", "", "hosts");

}


/**
* Run my function bodyLoad() after Document Object Model (DOM) has been loaded
* useCapture = false (default)
*/
document.addEventListener("DOMContentLoaded", bodyLoad, false);