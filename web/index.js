// NodeJS dependencies
var dnsd      = require('dnsd');
var ws        = require("nodejs-websocket");
var crypto    = require('crypto');
var fs        = require('fs');

// Configuration & Custom module
var config = require('./config');
var persistence = require('./persistence');
var map = {};

function bin2hex (d) {
    var hex, i;

    if (d == "") { 
        return "00"; 
    }

    var result = "";
    for (i=0; i<d.length; i++) {
        hex = d.charCodeAt(i).toString(16);
        result += ("0" + hex).slice(-2);
    }

    return result
}

function logData(message) {
    if (config.logFile) {
        fs.appendFile(config.logFile, "[" + (new Date().toString()) + "] " + message, function (err) {
            if (err) {
                console.error("Failed to log message ! " + err);
            }
        });
    }
}

var server = ws.createServer(function (conn) {
    try {
        var token;
        var master;

        crypto.randomBytes(20, function(err, buffer) {
            // If the token variable is already defined, this means 
            // a restore as already happened.
            if (token) {
                return;
            }

            try {
                token  = buffer.toString('hex').substr(0,  20);
                master = buffer.toString('hex').substr(20, 20);

                map[token] = {
                    "connection" : conn, 
                    "buffer" : "" 
                };

                conn.sendText(JSON.stringify({
                    "type" : "token", 
                    "master" : master, 
                    "data" : token 
                }));
                
                persistence.createIdentity(master, token);

                logData("Token assignment '" + token + "' with IP '" + conn.socket.remoteAddress + "' \n");
            } catch (e) {

            }
        });

        conn.on("text", function (data) {
            try {
                data = JSON.parse(data);

                // When the attribute text is defined, the client is sending data for the in/out request.
                if (data.text) {
                    if (map[token]["buffer"].length + data.text.length > 2048) {
                        map[token]["connection"].sendText(JSON.stringify({
                            "type":"error", 
                            "data" : "Maximum buffering is 2048 bytes."
                        }));
                        return;
                    }
                    map[token]["buffer"] += data.text;
                }

                // When the attribute restore is defined, the client is trying to restore the previously 
                // saved data from a master token.
                if (data.restore && data.master) {
                    persistence.restoreFromMaster(data.master, function (data) {
                        // If the restore was succesful we readd the information to the map so 
                        // that the connection that receive real-time data.
                        if (!data.err) {
                            token = data.subdomain;

                            map[token] = {
                                "connection" : conn, 
                                "buffer" : "" 
                            };
                        }

                        data["type"] = "restore";
                        conn.sendText(JSON.stringify(data));
                    });
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
            // Dissect the request domain name to extract the data and generated id
            // Format looks like : [data].[id].d.zhack.ca
            domain = domain.substring(0, domain.length - domainWithPrefixStandard.length);
            parts = domain.split(".");
            id = parts[parts.length - 1];
            content = parts.slice(0, parts.length - 1).join(".");
        
            // Persistence to allow restore from the UI.
            persistence.storeSubdomainRequest(id, content);

            // Send real time data if the client is still connected.
            if (map.hasOwnProperty(id) && map[id]) {
                map[id]["connection"].sendText(JSON.stringify({
                    "type" : "request", 
                    "data" : content 
                }));
            }

            logData("Data request : " + domain +  " (IP : " + req.connection.remoteAddress + ")\n");
        
        } else if (domain.endsWith(domainWithPrefixIn)) {
            // Dissect the request domain name to extract the data and generated id
            // Format looks like : [data].[id].i.zhack.ca
            domain = domain.substring(0, domain.length - domainWithPrefixIn.length);
            parts = domain.split(".");
            id = parts[parts.length - 1];
            
            logData("Input request : " + domain + " (IP : " + req.connection.remoteAddress + ")\n");

            // In and out request are only supported in real-time, no restore is done here.
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
                map[id]["connection"].sendText(JSON.stringify({
                    "type" : "dataconsumed", 
                    "data" : map[id]["buffer"].length 
                }));
                return;
            }
        
        } else {
            // Unrecognized request (it's usually DNS scanner that looks for open DNS).
            logData("No match ! " + domain  +  " (IP : " + req.connection.remoteAddress + ")\n");
        }   

        // Always return localhost
        res.end('127.0.0.1');
    } catch (e) {
    
    }

}).listen(53, '0.0.0.0');

console.log("Started !");
