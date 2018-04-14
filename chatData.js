var mongoose = require('mongoose');

var chatSchema = mongoose.Schema;

var chatSchema = new mongoose.Schema({
    nick: String,
    msg:  String,
    room: String,
    type: String, 
    created: {type: Date, default: Date.now()}
});

var chatData = mongoose.model('chatData', chatSchema );

module.exports = chatData;