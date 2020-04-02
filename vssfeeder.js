var net = require('net');

var client = new net.Socket();

var parseString = require('xml2js').parseString;


client.connect(5678, '127.0.0.1', function() {
	console.log('Connected! Subscribing.');
	client.write('<?xml version="1.0" encoding="UTF-8"?>\n');
	client.write('<Message><Event Name="EstablishConnection"/>\n');
	client.write('</Message>\n');
});

client.on('data', function(data) {
	parseString(data, function (err, result) {
		if (result.Message.Event[0].$.Name == "SubscribedValues") {
			console.log(result.Message.Event[0].root[0].thisVehicle[0].exterior[0].engineCompartment[0].engine[0].Properties[0].actualRpm[0]);
		}
	});
});

client.on('close', function() {
	console.log('Connection closed');
});

