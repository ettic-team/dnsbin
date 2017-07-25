// NodeJS dependencies
var dnsd      = require('dnsd')
var ws        = require("nodejs-websocket")
var crypto    = require('crypto');
var fs        = require('fs');

// Configuration
var config = require('./config')
var map = {};

function bin2hex (d) {
    var hex, i;

    if (d == "") { return "00"; }

    var result = "";
    for (i=0; i<d.length; i++) {
        hex = d.charCodeAt(i).toString(16);
        result += ("0"+hex).slice(-2);
    }

    return result
}

function logData(message) {
    fs.appendFile(config.logFile, "[" + (new Date().toString()) + "] " + message, function (err) {
        console.error("Failed to log message ! ");    
    });
}

var server = ws.createServer(function (conn) {
    try {
        var token;

        crypto.randomBytes(10, function(err, buffer) {
            try {
                token = buffer.toString('hex');
                map[token] = {"connection" : conn, "buffer" : "" };
                conn.sendText(JSON.stringify({"type" : "token", "data" : token }));
                logData("Token assignment '" + token + "' with IP '" + conn.socket.remoteAddress + "' \n");
            } catch (e) {

            }
        });

        conn.on("text", function (data) {
              try {
                  data = JSON.parse(data);
                  if (data.text) {
                      if (map[token]["buffer"].length + data.text.length > 2048) {
                          map[token]["connection"].sendText(JSON.stringify({"type":"error", "data" : "Maximum buffering is 2048 bytes."}));
                          return;
                      }
                      map[token]["buffer"] += data.text;
                  }
              } catch (e) {}
        })

        conn.on("close", function (code, reason) {
            try {
                delete map[token];
            } catch (e) {

            } 
        });
    } catch (e) {
    
    }

}).listen(config.websocketPort);

dnsd.createServer(function(req, res) {

    try {
        var domain = res.question[0].name;

        var domainWithPrefixStandard = config.prefixes["standard"] + config.targetDomain;
        var domainWithPrefixIn       = config.prefixes["in"] + config.targetDomain;
        var domainWithPrefixOut      = config.prefixes["out"] + config.targetDomain;

        if (domain.endsWith(domainWithPrefixStandard)) {
            domain = domain.substring(0, domain.length - domainWithPrefixStandard.length);
            parts = domain.split(".");
            id = parts[parts.length - 1];
            content = parts.slice(0, parts.length - 1).join(".");
        
            if (map.hasOwnProperty(id) && map[id]) {
                map[id]["connection"].sendText(JSON.stringify({
                    "type" : "request", 
                    "data" : content 
                }));
            }

            logData("Data request : " + domain +  " (IP : " + req.connection.remoteAddress + ")\n");
        
        } else if (domain.endsWith(domainWithPrefixIn)) {
            domain = domain.substring(0, domain.length - domainWithPrefixIn.length);
            parts = domain.split(".");
            id = parts[parts.length - 1];
            logData("Input request : " + domain + " (IP : " + req.connection.remoteAddress + ")\n");

            if (map.hasOwnProperty(id) && map[id]) {
                buffer = map[id]["buffer"];

                res.answer.push({ 
                    name: res.question[0].name, 
                    type:'CNAME', 
                    data: bin2hex(buffer.substr(0, 30)) + "." +  bin2hex(buffer.substr(30, 30))  + domainWithPrefixOut, 
                    'ttl': 0 
                });
                res.end();

                map[id]["buffer"] = buffer.substr(60);
                map[id]["connection"].sendText(JSON.stringify({"type" : "dataconsumed", "data" : map[id]["buffer"].length }));
                return;
            }
        
        } else {
            logData("No match ! " + domain  +  " (IP : " + req.connection.remoteAddress + ")\n");
        }   

        // Always return localhost
        res.end('127.0.0.1');
    } catch (e) {
    
    }

}).listen(53, '0.0.0.0')

console.log("Started !");
