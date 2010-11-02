# node-zoneinfo

A collection of tools for dealing with tzinfo database in node.js

# Usage

	var fs = require("fs");
	var tz = require("./lib/zoneinfo");
	
	var parser = new tz.parser();
	
	parser.onMagic = function(tzinfo) {
		console.log("magic:\n" + JSON.stringify(tzinfo, null, "\t"));
	};
	
	parser.onHeader = function(tzinfo) {
		console.log("header:\n" + JSON.stringify(tzinfo, null, "\t"));
	};
	
	parser.onBody = function(tzinfo) {
		console.log("body:\n" + JSON.stringify(tzinfo, null, "\t"));
	};
	
	var zonefile = process.ARGV[2];
	
	var log = fs.createReadStream(zonefile, {
		"flags": "r",
		"encoding": null,
		"mode": 0755,
		"bufferSize": fs.statSync(zonefile).size
	});
	
	log.addListener("data", function(buffer, start, end) {
		parser.execute(buffer, start, end);
	});

# More Info

- http://en.wikipedia.org/wiki/Tz_database
- http://www.twinsun.com/tz/tz-link.htm
- http://linux.about.com/library/cmd/blcmdl5_tzfile.htm
