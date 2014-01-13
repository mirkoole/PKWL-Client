/**
* Plugin Name: Public-Key-Web-Login (PKWL)
* Author: Mirko Oleszuk
* URI: http://www.codepunks.net
* License: The MIT License (MIT)
*/


/**
* increase this number on changes of the database structure to run upgrade scripts
*/
var dbversion = 1;

var pkwl = {

  initDatabase: function(){
    console.log("OK: pkwl.initDatabase() called!");

    // api call to create/open database
    var openrequest = indexedDB.open('pkwl', dbversion);

    // this event is fired when the db does not exist or the structure has changed
    openrequest.onupgradeneeded = function(){
      console.log("OK: DB-event 'onupgradeneeded' called!");

      var db = this.result;
      var store;
      var index;

      // check if table exists
      if(!db.objectStoreNames.contains('hosts')){
        // create table
        store = db.createObjectStore('hosts', {
          keypath: 'id',
          autoIncrement: true
        });
        // create index on column name
        index = store.createIndex("by_hostname", "hostname", {unique: false});
      }

      if(!db.objectStoreNames.contains('keys')){
        store = db.createObjectStore('keys', {
          keypath: 'id',
          autoIncrement: true
        });
      }
    };
  },

  /**
  * table = target-table
  * item  = item to insert
  */
  insertIntoDB: function(table, item){
    //console.log("OK: insertIntoDB() called! table = ", table, " item = ", item);

    // open connection to db
    var openrequest = indexedDB.open('pkwl', dbversion);

    // connection established
    openrequest.onsuccess = function(){
      var db          = this.result;
      var trans       = db.transaction([table], 'readwrite');
      var store       = trans.objectStore(table);
      var putrequest  = store.put(item);

      // is called when data-insert succeeded
      putrequest.onsuccess = function(e){
        //console.log("OK: putrequest.onsuccess: ", e.target.result);
      };

      // is called if data-insertion failed
      putrequest.onerror = function(e){
        // this event fires on duplicate entrys
        console.log("ERROR: putrequest.onerror = ", e);
      };
    };

    // is called when db cannot be read
    openrequest.onerror = function(e){
      console.log("ERROR: openrequest.onerror = ", e);
    };
  },

  /**
  * add given parameter to hosts-table
  */
  addHost: function(hostname, username, keyid){
    var item = {
      hostname: hostname,
      name:     username,
      keyid:    keyid
    };
    pkwl.insertIntoDB("hosts", item);
  },

  /**
  * add given key data to keys-table
  */
  addKey: function(name, n, e, d, p, q){
    var item = {
      name: name,
      n:    n,
      e:    e,
      d:    d,
      p:    p,
      q:    q
    };
    pkwl.insertIntoDB("keys", item);
  },

  /**
  * returns all objects from given table
  * and stores it into resultid
  * table         = which table to use
  * outputmode    = which values to print
  * preselection  = preselect an <option> in select box
  * searchterm    = searchterm
  * resultid      = id where results are stored
  */
  getAllObjects: function(table, outputmode, preselection, searchterm, resultid){

    // empty the html field to write into
    if(preselection != ""){
      document.getElementById(resultid).innerHTML = "";
    }

    // open connection to db
    var openrequest = indexedDB.open('pkwl', dbversion);

    // connection to db established
    openrequest.onsuccess = function(){

      var db          = this.result;
      var trans       = db.transaction([table], 'readwrite');
      var store       = trans.objectStore(table);

      // init a cursor for search
      var request     = store.openCursor();
      
      // used to decide whether we should redirect the user to the "new host"-page
      var foundHost   = false;

      // we found a result
      request.onsuccess = function(event){

        var cursor = event.target.result;
        if(cursor){

          // re-init output
          var output;

          switch(outputmode){

            // "username"
            case "username-only":
                                  // print only available usernames
                                  if(cursor.value.hostname == searchterm){
                                    // write result to <select>-field
                                    output = '<option value="' + cursor.value.name + '" selected="">' + cursor.value.name + '</option>';

                                    // remember that we found at least one matching host
                                    foundHost = true;
                                  }
                                    
                                  break;

            // "keyname"
            case "keyname-only":
                                  output = '<option value="' + cursor.key + '"';

                                  // pre-select result
                                  if(preselection == cursor.value.name){
                                    output += ' selected=""';
                                  }

                                  output += '>' + cursor.value.name + '</option>';
                                  break;

            // "hostname / username"
            case "hostname-username":
                                  output = '<option value="' + cursor.key + '">' + cursor.value.hostname + ' / ' + cursor.value.name +'</option>';
                                  break;

          }

          // append <option> to <select>-output
          document.getElementById(resultid).innerHTML += output;

          // get next item
          cursor.continue();

        } else {
          // finished looping through results

          // if we have no result at the popup page -> redirect to "add new host"-page
          if(self.location.pathname == "/html/popup.html" && foundHost == false ){
            self.location = "/html/host_new.html";
          }
        }
      }
    }
  },

  /**
  * return key numbers via keyid
  */
  getKey: function(keyid, callback){
    //console.log("OK: pkwl.getKey(", keyid, ") called!");

    // request connection to db
    var openrequest = indexedDB.open('pkwl', dbversion);

    // if connection has been established
    openrequest.onsuccess = function(){

      // convert string to int (base 10)
      keyid = parseInt(keyid, 10);

      var db    = this.result;
      var tx      = db.transaction(["keys"], "readonly");
      var store   = tx.objectStore("keys");
      var request = store.get(keyid);

      request.onsuccess = function(){
        // return result via callback function
        callback(request.result);
      };
    };
  },

  /**
  * return id of key for given host- and username
  */
  getKeyID: function(hostname, username, callback){
    //console.log("OK: pkwl.getKeyID(", hostname, username, ") called!");

    // request connection to db
    var openrequest = indexedDB.open('pkwl', dbversion);

    // if connection has been established
    openrequest.onsuccess = function(){

      var db    = this.result;
      var tx    = db.transaction(["hosts"], "readonly");
      var store = tx.objectStore("hosts");

      var index = store.index("by_hostname");

      var request = store.openCursor();

      request.onsuccess = function(event){

        var cursor = event.target.result;

        if(cursor){

          if(cursor.value.hostname == hostname && cursor.value.name == username){
            // return result via callback function
            callback(cursor.value.keyid);
          }

          // get next result
          cursor.continue();
        }
      };

      request.onerror = function(){
        console.log("ERROR: No matching hostname found.");
        log("ERROR: No matching hostname found.");
      };
    };
  },

  /**
  * use id to delete an entry from given table
  */
  deleteID: function(table, id){

    var openrequest = indexedDB.open('pkwl', dbversion);

    openrequest.onsuccess = function(){

      var db = this.result;
      var tx = db.transaction([table], "readwrite");
      var store = tx.objectStore(table);

      var deleterequest = store.delete(id);

      deleterequest.onsuccess = function(){
        console.log("OK: Item deleted!");
      };

      deleterequest.onerror = function(e){
        console.log("ERROR: Delete failed: ", e);
      };
    };
  }
};


/**
* print a simple and short message to the user
*/
function log(msg){
  document.getElementById("MessageLog").innerHTML = msg;
}
