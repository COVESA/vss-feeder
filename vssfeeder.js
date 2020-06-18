// Copyright (C) 2020 TietoEVRY
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var net = require('net');

var xpath = require('xpath')
	, dom = require('xmldom').DOMParser;

var client = new net.Socket();

client.connect(5678, '10.0.2.2', function() {
	console.log('Connected! Subscribing.');
	client.write('<?xml version="1.0" encoding="UTF-8"?>\n');
	client.write('<Message><Event Name="EstablishConnection"/>\n');
	client.write('</Message>\n');
});

const sqlite3 = require("sqlite3")
const dbPath = "/usr/shared/db/opends.db";
let sqlite_db = new sqlite3.Database(dbPath, (err) => {
	if (err) {
		return console.error(err.message);
	}
	console.log('Connected to the opends database.');
});

let values_mapping = new Map();
values_mapping.set('drivetrain.internalCombustionEngine.engine.speed', '/Message/Event/root/thisVehicle/exterior/engineCompartment/engine/Properties/actualRpm');
values_mapping.set('speed', '/Message/Event/root/thisVehicle/physicalAttributes/Properties/speed');
values_mapping.set('drivetrain.transmission.gear', '/Message/Event/root/thisVehicle/exterior/gearUnit/Properties/currentGear');
values_mapping.set('drivetrain.fuelsystem.tankCapacity', '/Message/Event/root/thisVehicle/exterior/fueling/fuelType/tank/Properties/maxAmount');
values_mapping.set('drivetrain.fuelSystem.level', '/Message/Event/root/thisVehicle/exterior/fueling/fuelType/tank/Properties/actualAmount');
values_mapping.set('drivetrain.fuelsystem.instantConsumption', '/Message/Event/root/thisVehicle/exterior/fueling/fuelType/tank/Properties/currentConsumption');
createSchema(sqlite_db);

client.setEncoding('utf-8');
client.on('data', function(data) {
	var doc = new dom().parseFromString(data);
	var query = sqlite_db.prepare("REPLACE INTO vss_data (key, value, timestamp) VALUES(?, ?," + Date.now() + ");");
	for (let [key, value] of values_mapping) {
		query.run(key, xpath.select("string(" + value + ")", doc));
		console.log(key + ": " + xpath.select("string(" + value + ")", doc));
	}
});

client.on('close', function() {
	sqlite_db.close((err) => {
		if (err) {
			console.error(err.message);
		}
		console.log('Opends database connection closed.');
	});
	console.log('Connection closed');
});

function createSchema(db) {
	var query = `CREATE TABLE IF NOT EXISTS vss_data (
					key TEXT PRIMARY KEY NOT NULL UNIQUE,
					value TEXT,
					timestamp TEXT NOT NULL
				   );`;
	db.exec(query, (err) => {
		if (err) {
			return console.error(err.message);
		}
		console.log('Schema created.');
	});
	query = `CREATE TABLE IF NOT EXISTS vss_schema_version (
			  major INTEGER NOT NULL,
			  minor INTEGER NOT NULL,
			  patch INTEGER NOT NULL
			);`;
	db.exec(query, (err) => {
		if (err) {
			return console.error(err.message);
		}
		console.log('Schema created.');
	});
	query = "INSERT OR REPLACE INTO vss_data (key, value, timestamp) VALUES(?, ?," + Date.now() + ");";
	for (let [key, value] of values_mapping) {
		db.run(query, [key, ""])
	}
}
