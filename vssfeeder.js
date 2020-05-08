// Copyright (C) 2020 TietoEVRY
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var net = require('net');

var client = new net.Socket();

var parseString = require('xml2js').parseString;

client.connect(5678, '127.0.0.1', function() {
	console.log('Connected! Subscribing.');
	client.write('<?xml version="1.0" encoding="UTF-8"?>\n');
	client.write('<Message><Event Name="EstablishConnection"/>\n');
	client.write('</Message>\n');
});

const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')

const adapter = new FileSync('/usr/shared/db/db.json')
const db = low(adapter)

// TODO Database schema should be generated from vspec
db.defaults({
	"vehicle": {
	  "versionVSS": {
		"major": 2,
		"minor": 0,
		"patch": 0
	  },
	  "drivetrain": {
		"internalCombustionEngine": {
		  "engine": {
			"speed": {}
		  }
		},
		"transmission": {
		  "gear": {}
		},
		"fuelSystem": {
		  "tankCapacity": {},
		  "level": {},
		  "instantConsumption": {}
		}
	  }
	}
  })
  .write()

client.on('data', function(data) {
	parseString(data, function (err, result) {
		if (result.Message.Event[0].$.Name == "SubscribedValues") {
			// TODO Make those 2 values system mapped more generically
			var exterior = result.Message.Event[0].root[0].thisVehicle[0].exterior[0];
			var rpmValue = exterior.engineCompartment[0].engine[0].Properties[0].actualRpm[0];
			var fuelproperties = exterior.fueling[0].fuelType[0].tank[0].Properties[0];
			var maxAmount = fuelproperties.maxAmount[0];
			var actualAmount = fuelproperties.actualAmount;
			var currentConsumption = fuelproperties.currentConsumption;
			var currentGear = exterior.gearUnit[0].Properties[0].currentGear[0];
		
			db.set('vehicle.drivetrain.internalCombustionEngine.engine.speed', rpmValue)
			.set('vehicle.drivetrain.fuelSystem.tankCapacity', maxAmount)
			.set('vehicle.drivetrain.fuelSystem.level',Math.floor(actualAmount / maxAmount * 100))
			.set('vehicle.drivetrain.fuelSystem.instantConsumption', currentConsumption)
			.set("vehicle.drivetrain.transmission.gear", currentGear)
			.write();
		}
	});
});

client.on('close', function() {
	console.log('Connection closed');
});

