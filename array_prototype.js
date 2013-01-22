﻿Array.prototype.broadcast = function(socket,message){
  for(var s=0; s < this.length; s++){
    if(socket !== this[s] && this[s].readyState == 1) // first not same socket that the message is sent from and socket must be open
      this[s].send(message);
  }
};

// search for { hash: '...' users:[...]} and returns true if array contains Object
// first param can look like { hash: '123' }
// second param can look like 'hash'
Array.prototype.containsObject = function(obj,property){
  for(var prop in this){
    for(var innerProp in this[prop])
        if(this[prop][innerProp] == obj[property])
            return true;
  }
  return false;
};


// search for { hash: '...' users:[...]} and returns it
// param can look like { hash: '123' }
Array.prototype.getObject = function(obj){
  for(var prop in this){
    for(var innerProp in this[prop])
        if(this[prop][innerProp] == obj[innerProp])
            return this[prop];
  }
  return null;
};