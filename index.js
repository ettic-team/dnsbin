var dnsd = require('dnsd')
var ws = require("nodejs-websocket")
var crypto = require('crypto');
var map = {};

var server = ws.createServer(function (conn) {
    try {
        var token;

        crypto.randomBytes(10, function(err, buffer) {
            try {
                var token = buffer.toString('hex');
                map[token] = conn;
                conn.sendText(JSON.stringify({"type" : "token", "data" : token + ".d.zhack.ca"}));
            } catch (e) {

            }
        });

        conn.on("close", function (code, reason) {
            try {
                delete map[token];
            } catch (e) {

            } 
        });
    } catch (e) {
    
    }

}).listen(8001);

dnsd.createServer(function(req, res) {

    try {
        var domain = res.question[0].name;

        if (domain.endsWith(".d.zhack.ca")) {
            domain = domain.substring(0, domain.length - 11);
            parts = domain.split(".");
            id = parts[parts.length - 1];
            content = parts.slice(0, parts.length - 1).join(".");
        
            if (map[id]) {
                map[id].sendText(JSON.stringify({"type" : "request", "data" : content }));
            }
        }    

        // Always return localhost
        res.end('127.0.0.1');
    } catch (e) {
    
    }

}).listen(53, '0.0.0.0')

console.log("Started !");
