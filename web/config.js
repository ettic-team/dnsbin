// The domain name on which you have configured your DNS setup.
var targetDomain     = "zhack.ca";

// Websocket URI that the client will use to connect
var websocketUrl     = "ws://dns1.zhack.ca:8001/dnsbin";

// Subdomain used for the service.
var prefixes         = { 
	"standard" : ".d.", 
	"in"       : ".i.", 
	"out"      : ".o." 
};

// Where the logs are stored, use undefined or null if you don't want any log.
var logFile          = "log.txt";

// Port used for the websocket communication. If you wish to change this value to 
// something else than the default 8001, make sure to change it in the index.html 
// page too.
var websocketPort    = 8001;

// Use ":memory:" if you don't want to store data on disk (recommended when testing)
// Otherwise specify a filename
var sqliteDatabase   = ":memory:"; 

// Maximum of entry stored in the database. Once the limit is reached older entry 
// will be deleted.
var sqliteMaxEntry   = 100000;

// Polyfill for when this file is loaded in the browser.
if (!window.exports) {
	exports = {};
}

exports.targetDomain = targetDomain;
exports.prefixes = prefixes;
exports.logFile = logFile;
exports.websocketPort = websocketPort;
exports.sqliteDatabase = sqliteDatabase;
exports.websocketUrl = websocketUrl;