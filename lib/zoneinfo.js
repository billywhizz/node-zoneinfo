var fs = require("fs");

/*
more info:
http://en.wikipedia.org/wiki/Tz_database
http://www.twinsun.com/tz/tz-link.htm
http://linux.about.com/library/cmd/blcmdl5_tzfile.htm
*/

var constants = {
	"state": {
		"MAGIC": 0,
		"RESERVED": 1,
		"HEADER": 2,
		"BODY": 3
	},
	"general": {
		"MAGIC_LEN": 4,
		"RESERVED_LEN": 16,
		"HEADER_LEN": 24
	}
}

function parseInt (buffer, offset, size) {
	switch (size) {
		case 1:
			return buffer[offset++];
		case 2:
			return (buffer[offset++] << 8) + buffer[offset++];
		case 4:
			return (buffer[offset++] << 24) + (buffer[offset++] << 16) + (buffer[offset++] << 8)  + buffer[offset++];
		case 8:
			return (buffer[offset++] << 56) + (buffer[offset++] << 48) + (buffer[offset++] << 40) + (buffer[offset++] << 32) + (buffer[offset++] << 24) + (buffer[offset++] << 16) + (buffer[offset++] << 8)  + buffer[offset++];
	}
}

function Parser(options) {
	var _parser = this;
	var loc = 0;
	var pos = 0;
	var bodylength = 0;
	var _magic = new Buffer(constants.general.MAGIC_LEN);
	var _header = new Buffer(constants.general.HEADER_LEN);
	var _body = null;
	var message = {};
	
	_parser.reset = function() {
		loc = 0;
		pos = 0;
		_parser.state = constants.state.MAGIC;
		bodylength = 0;
	}

	_parser.state = constants.state.MAGIC;
	
	_parser.execute = function(buffer, start, end) {
		if(!start) start = 0;
		if(!end) end = buffer.length;
		pos = start;
		while (pos < end) {
			switch(_parser.state) {
				case constants.state.MAGIC:
					if(loc == constants.general.MAGIC_LEN - 1) {
						_magic[loc++] = buffer[pos];
						message = {
							"magic": _magic.toString()
						}
						if(_parser.onMagic) _parser.onMagic(message);
						_parser.state = constants.state.RESERVED;
						loc = 0;
					}
					else {
						_magic[loc++] = buffer[pos];
					}
					pos++;
					break;
				case constants.state.RESERVED:
					if(loc == constants.general.RESERVED_LEN - 1) {
						_parser.state = constants.state.HEADER;
						loc = 0;
					}
					else {
						loc++;
					}
					pos++;
					break;
				case constants.state.HEADER:
					if(loc == constants.general.HEADER_LEN - 1) {
						message.header = {};
						_header[loc++] = buffer[pos];
						message.header.ttisgmtcnt = parseInt(_header, 0, 4);
						message.header.ttisstdcnt = parseInt(_header, 4, 4);
						message.header.leapcnt = parseInt(_header, 8, 4);
						message.header.timecnt = parseInt(_header, 12, 4);
						message.header.typecnt = parseInt(_header, 16, 4);
						message.header.charcnt = parseInt(_header, 20, 4);
						if(_parser.onHeader) _parser.onHeader(message);
						bodylength = (message.header.timecnt * 4) + (message.header.timecnt) + (message.header.typecnt * 6) + message.header.charcnt + (message.header.leapcnt * 4) + message.header.ttisstdcnt + message.header.ttisgmtcnt;
						_body = new Buffer(bodylength);
						_parser.state = constants.state.BODY;
						loc = 0;
					}
					else {
						_header[loc++] = buffer[pos];
					}
					pos++;
					break;
				case constants.state.BODY:
					if(loc == bodylength - 1) {
						loc = 0;
						message.body = {};
						if(message.header.timecnt > 0) {
							message.body.transitions = [];
							message.body.locals = [];
						}
						if(message.header.typecnt > 0) {
							message.body.types = [];
						}
						if(message.header.leapcnt > 0) {
							message.body.leaps = [];
						}
						if(message.header.ttisstdcnt > 0) {
							message.body.walls = [];
						}
						if(message.header.ttisgmtcnt > 0) {
							message.body.utcs = [];
						}
						for(var i=0; i< message.header.timecnt; i++) {
							message.body.transitions.push(parseInt(_body, loc, 4));
							loc += 4;
						}
						for(var i=0; i< message.header.timecnt; i++) {
							message.body.locals.push(parseInt(_body, loc, 1));
							loc ++;
						}
						for(var i=0; i< message.header.typecnt; i++) {
							var type = {
								"gmtoff": parseInt(_body, loc+=4, 4),
								"isdst": parseInt(_body, loc++, 1),
								"abbrind": parseInt(_body, loc++, 1)
							}
							message.body.types.push(type);
						}
						if(message.header.charcnt > 0) {
							message.body.abbrevs = _body.slice(loc, loc + message.header.charcnt).toString();
							loc += message.header.charcnt;
						}
						for(var i=0; i< message.header.leapcnt; i++) {
							var leap = {};
							leap.time = parseInt(_body, loc+=4, 4);
							leap.total = parseInt(_body, loc+=4, 4);
							message.body.leaps.push(leap);
						}
						for(var i=0; i< message.header.ttisstdcnt; i++) {
							message.body.walls.push(parseInt(_body, loc, 1));
							loc ++;
						}
						for(var i=0; i< message.header.ttisgmtcnt; i++) {
							message.body.utcs.push(parseInt(_body, loc, 1));
							loc ++;
						}
						if(_parser.onBody) _parser.onBody(message);
						_parser.state = constants.state.MAGIC;
					}
					else {
						_body[loc++] = buffer[pos];
					}
					pos++;
					break;
			}
		}
	}	
}

exports.parser = Parser;
exports.constants = constants;