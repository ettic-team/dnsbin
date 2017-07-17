var dnsd = require('dnsd')
var ws 	= require("nodejs-websocket")
var crypto = require('crypto');
var fs 	= require('fs');
var map = {};
var target_domain = "zhack.ca";
var prefixes = [".d.", ".i.", ".o."];

function data2ip (data) {
    var ip = "";
    ip += (data[0] || "\x00").charCodeAt(0) + ".";
    ip += (data[1] || "\x00").charCodeAt(0) + ".";
    ip += (data[2] || "\x00").charCodeAt(0) + ".";
    ip += (data[3] || "\x00").charCodeAt(0);
    return ip;
}

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

var server = ws.createServer(function (conn) {
    try {
        var token;

        crypto.randomBytes(10, function(err, buffer) {
            try {
                token = buffer.toString('hex');
                map[token] = {"connection" : conn, "buffer" : "" };
                conn.sendText(JSON.stringify({"type" : "token", "data" : token }));
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

}).listen(8001);

dnsd.createServer(function(req, res) {

    try {
        var domain = res.question[0].name;
	
        if (domain.endsWith(prefixes[0] + target_domain)) {
            domain = domain.substring(0, domain.length - (prefixes[0] + target_domain).length);
            parts = domain.split(".");
            id = parts[parts.length - 1];
            content = parts.slice(0, parts.length - 1).join(".");
        
            if (map[id]) {
                map[id]["connection"].sendText(JSON.stringify({"type" : "request", "data" : content }));
            }

            fs.appendFile("log.txt", "Data request : " + domain + "\n", function (err) {});
        } else if (domain.endsWith(prefixes[1] + target_domain)) {
            domain = domain.substring(0, domain.length - (prefixes[1] + target_domain));
            parts = domain.split(".");
            id = parts[parts.length - 1];
            fs.appendFile("log.txt", "Input request : " + domain + "\n", function (err) {});

            if (map[id]) {
                buffer = map[id]["buffer"];

                res.answer.push({ name: res.question[0].name, type:'CNAME', data: bin2hex(buffer.substr(0, 30)) + "." +  bin2hex(buffer.substr(30, 30))  + prefixes[2] + target_domain, 'ttl': 0 })
                res.end();

                map[id]["buffer"] = buffer.substr(60);
                map[id]["connection"].sendText(JSON.stringify({"type" : "dataconsumed", "data" : map[id]["buffer"].length }));
                return;
            }
        } else {
            fs.appendFile("log.txt", "No match ! " + domain + "\n", function (err) {});
        }   

        // Always return localhost
        res.end('127.0.0.1');
    } catch (e) {
    
    }

}).listen(53, '0.0.0.0')

console.log("Started !");
