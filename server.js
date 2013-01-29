require('./array_prototype');

// contains all configuration-info of this project
var properties = require('./properties');

var serverMethods = require('./server_methods');
var mongodb = require('./mongodb');

var invitationMailer = require('./mailer');

// websocket-server and clients
var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({ port: properties.serverPort });

// to hold all user-connections
var sockets = [];



wss.on('connection', function(ws) {
    
    
    if( serverMethods.isValidOrigin(ws) ){
      serverMethods.trace('client connected','');
      sockets.push(ws);
    }
    else{
      serverMethods.trace('client not accepted: ',ws.upgradeReq.headers.origin);
      return;
    }
    
    
    /* message-kinds (from client to server): */
    //// register (new User or Guest) -> { subject: 'init', url: 'www.example.at/#...' }
    //// spd/ice -> { subject: 'sdp/ice', chatroomHash: '...', userHash: '...', destinationHash: '...', spd or ice: Object }
    
    /* message-kinds (from server to client): */
    //// register (new User or Guest) error-property is optional -> { subject: 'init', chatroomHash: '...', userHash: '...', guestIds: [{id '...'},...], error: '...' }
    //// spd/ice -> { subject: 'sdp/ice', chatroomHash: '...', userHash: '...', spd or ice: Object }
    
    /* information-kinds: */
    // new user: { subject: 'participant-join', chatroomHash: '...', newUserHash: '...' }
    // use leaves: { subject: 'participant-leave', chatroomHash: '...', newUserHash: '...' }
    
    /* e-mail invitations */
    //// { subject: 'mail', chatroomHash: '...', userHash: '...', mail: { from: '...', to: '...', subject: '...', text: 'Hello World', html: '<b>Hello World</b>' } }
    
    

    ws.on('message', function(message) {
      
      try{
        message = JSON.parse(message);
        serverMethods.trace('message got', message);
      }
      catch(e){
        serverMethods.trace('message is non-JSON:',e);
        return;
      }
      
      switch(message.subject){
        case 'init': 
          
          var newUser = sockets[sockets.length-1];
          serverMethods.setupNewUser(newUser, message.url);
          break;
          
        case 'sdp': 
          
          mongodb.searchForChatroomEntry(
            { hash: message.chatroomHash },
            function(rooms){ // check whether chatroomHash and User-ID's exist 
              var room = rooms[0];
              
              if( room && room.hash == message.chatroomHash && room.users.getObject({ id: message.userHash }) && room.users.getObject({ id: message.destinationHash }) ){
                serverMethods.clients[message.destinationHash].send(JSON.stringify({
                  subject: 'sdp',
                  chatroomHash: message.chatroomHash, 
                  userHash: message.userHash, 
                  sdp: message.sdp 
                }));
                
              }
            }
          );
          
          break;
        
        case 'ice':
          
          mongodb.searchForChatroomEntry(
            { hash: message.chatroomHash },
            function(rooms){ // check whether chatroomHash and User-ID's exist 
              var room = rooms[0];
              
              if( room.users.getObject({ id: message.userHash }) && room.users.getObject({ id: message.destinationHash }) ){
                console.log('ice', room);
                serverMethods.clients[message.destinationHash].send(JSON.stringify({ 
                  subject: 'ice',
                  chatroomHash: message.chatroomHash, 
                  userHash: message.userHash, 
                  ice: message.ice 
                }));
                
              }
            }
          );
          
          break;
          
        case 'mail': 
          mongodb.searchForChatroomEntry(
            { hash: message.chatroomHash },
            function(rooms){ // check whether chatroomHash and User-ID exist 
              var room = rooms[0];
              
              if( room && room.hash == message.chatroomHash && room.users.getObject({ id: message.userHash }) ){
                invitationMailer.sendMail({ 
                  from: message.from, 
                  to: message.to, 
                  subject: message.subject, 
                  text: message.text, 
                  html: message.html 
                });
              }
            }
          );
          break;
          
        case 'participant-leave':
          serverMethods.informOtherClientsOfChatroom(message.roomHash, message.userHash, 'participant-leave');
          break;  
          
        default:
          serverMethods.trace('message doesn\'t have an allowed subject property:','');
          return;
      };

    });
    
    ws.on('close', function(){});
});
