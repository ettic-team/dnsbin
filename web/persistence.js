var sqlite3   = require('sqlite3');
var config    = require('./config');
var fs        = require('fs');

var db = new sqlite3.Database(config.sqliteDatabase);

// Make sure the table are initialized
db.serialize(function() {
	db.run("CREATE TABLE IF NOT EXISTS requests (master TEXT, data TEXT, timestamp INTEGER); ");
	db.run("CREATE TABLE IF NOT EXISTS identity (master TEXT, subdomain TEXT, timestamp INTEGER); ");
	db.run("CREATE INDEX IF NOT EXISTS req_master ON requests (master); ");
	db.run("CREATE INDEX IF NOT EXISTS ident_master ON identity (master); ");
	db.run("CREATE INDEX IF NOT EXISTS ident_subdomain ON identity (subdomain); ");
});

function storeSubdomainRequest(subdomain, data) {
	db.each("SELECT master FROM identity WHERE subdomain = ?; ", subdomain, function (err, row) {
		if (err) {
			return;
		}

		if (row["master"]) {
			db.run("INSERT INTO requests VALUES (?, ?, ?); ", row["master"], data, new Date().getTime());
		}
	});
}

function createIdentity(master, subdomain) {
	db.run("INSERT INTO identity VALUES (?, ?, ?); ", master, subdomain, new Date().getTime());
}

function restoreFromMaster(master, callback) {
	db.all("SELECT subdomain FROM identity WHERE master = ?", master, function (err, rows) {
		if (err || rows.length == 0) {
			callback({"err" : "Master token not found !", "data" : []});
			return;
		}

		var subdomain = rows[0]["subdomain"];

		db.all("SELECT data FROM requests WHERE master = ? ORDER BY timestamp ASC", master, function (err, rows) {
			if (err) {
				callback({"err" : "Error while finding existing request. " + err, "data" : []});
				return;
			}

			callback({"err" : null, "data" : rows, "subdomain" : subdomain });
		});
	});
	
}

exports.storeSubdomainRequest = storeSubdomainRequest;
exports.createIdentity = createIdentity;
exports.restoreFromMaster = restoreFromMaster;