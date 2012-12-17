var http = require('http');
var url = require("url");
var fs = require("fs");


var opts = {
	"url": ["/","/download","/upload","/jquery.js","/speed.html","/jquery.ajax-progress.js","/ip"]
	,maxSize: 50
	,"port": 8080
};

httpd = http.createServer(function(req, res) {
	req.on("data", function(d) {
		
	});
	//http://thecodinghumanist.com/blog/archives/2011/5/6/serving-static-files-from-node-js
	req.on('end', function() {
		switch(opts.url.indexOf(url.parse(req.url.replace("//","/")).pathname)) {
			case 0:
				res.writeHead(301, {'Location': "./speed.html"});
				res.end();
				break;
			case 1: //download
				var max = url.parse(req.url,true).query.size;
				//if(typeof(max) == 'undefined') { max = 1; }
				if(typeof(max) == 'undefined' || max > opts.maxSize) {
					res.writeHead(500);
					res.end("It's too big or NaN!");
					break;
				}
				res.writeHead(200, {'Content-length': (1024*1024*max)});
				//res.write("download..prepare for X MB!\r\n");
				var b = new Buffer(1024);
				b.fill(0x0);
				//console.log(max);
				for(var i = 0; i < 1024*max; i++) {
					res.write(b);
				}
				res.end();
				break;
			case 2:
				res.write("upload..prepared for X MB!\r\n");
				res.end();
				break;
			case 3:
			case 4:
			case 5:
				try {
				stats = fs.lstatSync("."+url.parse(req.url).pathname); // throws if path doesn't exist
			  } catch (e) {
			  console.log(e);
				res.writeHead(404, {'Content-Type': 'text/plain'});
				res.write('404 Not Found\n');
				res.end("404: file not found or more likely, you're trying to go somewhere you can't.");
				return;
			  }
				var s = fs.createReadStream("." + url.parse(req.url).pathname);
				res.on("end", function() { s.destroy(); });
				s.on('error', function (e) {
					console.log(req.url);
					console.log(e);
					res.writeHead(404, {'Content-Type': 'text/plain'});
					res.end("404: file not found or more likely, you're trying to go somewhere you can't.");
				});
				s.once('fd', function() {
					res.statusCode = 400;
					
				});
				s.pipe(res);s
				break;
			case 6:
				res.end(req.connection.remoteAddress);
				break;
			default:
				res.writeHead(400);
				//res.statusCode = 400
				res.write("fail");
				res.end();
		}
	});
	//
});
httpd.listen(opts.port);
