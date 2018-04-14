var http = require('http');
var express = require("express");
var path = require('path');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
 
var app= express();
var chatData = require("./chatData");
var db, webServer;

webServer = http.createServer(app).listen(8080);
webServer.listen(8080, function () {
    console.log('listening on http://localhost:8080');
});
var io = require('socket.io').listen(webServer);

var ejsLayouts = require('express-ejs-layouts');
app.set('view engine','ejs');
app.use(ejsLayouts);

// parse application/json
app.use(bodyParser.json());
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

//css ve js dosyaları için 
app.use("/public", express.static(__dirname + '/public'));

app.set('views',path.join(__dirname,'./views'));

// db ile mongoDB ye bağlanıyoruz.
mongoose.connect('mongodb://localhost/chatData');
db = mongoose.connection;
//handle mongo error
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
  // we're connected!
  console.log('we are connected Mongo !');
});


app.get('/',function(req,res){
    res.render('go');
});


var socketCount=0 ,users = {},socketList={};
var rooms = ["Node.js", "Socket", "Mongo"];
var alan,durum;
var defaultRoom = 'general';
var usernames = {};


io.on('connection', function (socket){
    //Yeni bir soket açıldı
    socketCount++;
    
    console.log('Yeni kullanıcı girişi');

    //1- 
    socket.on('init_user', function (data, callback) {
        //Kullanıcı varsa false dön 
        //login.ejs de false datasını yakala ve girişe izin verme
        if (data in users) {
            console.log("bu nick zaten var " +  data);
            callback(false);
        } else {
            socket.nickname = data;
            socketList[socket.nickname] = {"id":socket.id, "name":socket.nickname};
            users[socket.nickname] = socket.nickname;
            userListYenile();
            sendOldMessage('general'); 
            durum=true;
            callback(true);
                
        }
    });
    //Aktif listemizi yeniler
    function userListYenile(){
        //Yeni kullanıcıyı diğer tüm kullanıcılara gönderin.
        //socket.broadcast.emit('username', Object.keys(users));
        // Yeni kullanıcı kendinide görebilirir
        io.emit('username', Object.keys(users));
    }
    //1-Kullanıcı mesaj attı şuanlık callback yok
    socket.on('new_message', function (data, callback) {
        var newMsg = new chatData({
            nick: socket.nickname,
            msg: data,
            room:defaultRoom,
            type:"broadcast"
        });
        newMsg.save(function (err) {
            if(err) throw err;
            io.emit('general_message', {
                nick: socket.nickname,
                msg: data,
                room:defaultRoom,
                type:"broadcast"
            });
        });
        
    });
   
     //3-Kullanıcı özel mesaj attı 
     socket.on('new_private_message', function (data, callback) {
        alan=data[0];
        gonderen=data[2];
        var newMsg = new chatData({
            nick: socket.nickname,
            msg: data[1],
            room:alan,
            type:"p2p"
        });
        if (data[0] in socketList) {
            if( gonderen == alan){
                callback("Same");
                return;
            }
            callback(true);
            socket.partnerId=socketList[alan].id;
            partnerSocket = io.sockets.connected[socket.partnerId];
            
            newMsg.save(function (err) {
                if(err) throw err;
                //İlk mesaj atana dönen sonuç
                socket.emit('private_message', {
                    nick: socket.nickname,
                    msg: data[1],
                    room:alan,
                    type:"p2p"
                });
                // Mesaj alana dönen sonuç karşı 
                partnerSocket.emit('private_message', {
                    nick: socket.nickname,
                    msg: data[1],
                    room:alan,
                    type:"p2p"
                });
                
            });
        }
        else{
            callback(true);
            newMsg.save(function (err) {
                if(err) throw err;
                socket.emit('private_message', {
                    nick: socket.nickname,
                    msg: data[1],
                    room:alan,
                    type:"p2p"
                });
            });
            //callback(false); return;
        }
       
    });

    //1- ve 3- Bir soket bağlantısı gittiğinde
    socket.on('disconnect', function () {
        console.log(socketList);
        
            console.log(socketList);
            io.emit('user_disconnect', socket.nickname);
            if (!socket.nickname) return;
            delete users[socket.nickname];
            delete socketList[socket.nickname];
            console.log(socketList);
            userListYenile();

            delete usernames[socket.username];
            io.sockets.emit('update_users', usernames);
            if (socket.username !== undefined) {
                socket.broadcast.emit('update_chat', socket.room, socket.username + ' has disconnected');
                socket.leave(socket.room);
            }
        
    });
    

    

    
    
    //2- Yeni Room oluşturuldu.
    socket.on('create_room', function (data,callback) {
        //var new_room = ("" + Math.random()).substring(2, 7);
        var new_room = data;
        if (rooms.indexOf(new_room) > -1) {
            console.log("bu room zaten var " +  data);
            callback(false);
        }
        else{
            rooms.push(new_room);
            console.log(rooms)
            data.room = new_room;
            socket.emit('update_chat', new_room, 'Your room is ready, invite someone using this ID:' + new_room);
            socket.emit('room_created', data);
            sendOldMessage(new_room);
            callback(true);
        }
        
    });

    //2- Odaya kullanıcı ekleme
    socket.on('add_user', function (data) {
        var username = data[1];
        var room = data[0];
        if (rooms.indexOf(room) != -1) {
            console.log("Grup var");
            socket.username = username;
            socket.room = room;
            usernames[username] = username;
            socket.join(room);
            socket.emit('update_chat', room, 'You are connected. Start chatting');
            socket.broadcast.to(room).emit('update_chat', room, username + ' has connected to this room');
            sendOldMessage(room);
        } else {
            console.log("Grup var");
            socket.emit('update_chat', 'SERVER_FALSE', 'Please enter valid code.');
        }
    });
    //2- Mesaj alma
    socket.on('send_chat', function (data) {
        var oda = data[0];var message= data[1];
        console.log(message);
        var newMsg = new chatData({
            nick: socket.username,
            msg: message,
            room:oda,
            type:"group"
        });
        newMsg.save(function (err) {
            if(err) throw err;
            io.sockets.in(socket.room).emit('group_chat', {
                nick: socket.username,
                msg: message,
                room:oda,
                type:"group"
            });
        });
        
        
    });
     
    function sendOldMessage(data){
        
        if(data=='general'){
            chatData.find({},function (err,docs) {
                if(err) throw err;
                socket.emit('old_messages',docs);
            });
        }
        else{
            chatData.find({room:data},function (err,docs) {
                if(err) throw err;
                    socket.emit('old_room_messages',docs);
            });
        }
       
    }
});







