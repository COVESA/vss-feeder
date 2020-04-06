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

const adapter = new FileSync('db.json')
const db = low(adapter)

// TODO Database schema should be generated from vspec
db.defaults({
	"Vehicle": {
	  "VersionVSS": {
		"Major": 2,
		"Minor": 0,
		"Patch": 0
	  },
	  "Drivetrain": {
		"InternalCombustionEngine": {
		  "Engine": {
			"Speed": {}
		  }
		},
		"Transmission": {
		  "Gear": {}
		},
		"FuelSystem": {
		  "TankCapacity": {},
		  "Level": {},
		  "InstantConsumption": {}
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
			var maxAmount = fuelproperties.maxAmount;
			var actualAmount = fuelproperties.actualAmount;
			var currentConsumption = fuelproperties.currentConsumption;
			var currentGear = exterior.gearUnit[0].Properties[0].currentGear[0];
		
			db.set('Vehicle.Drivetrain.InternalCombustionEngine.Engine.Speed', rpmValue)
			.set('Vehicle.Drivetrain.FuelSystem.TankCapacity', maxAmount)
			.set('Vehicle.Drivetrain.FuelSystem.Level',actualAmount/maxAmount*100)
			.set('Vehicle.Drivetrain.FuelSystem.InstantConsumption', currentConsumption)
			.set("Vehicle.Drivetrain.Transmission.Gear", currentGear)
			.write();
		}
	});
});

client.on('close', function() {
	console.log('Connection closed');
});

