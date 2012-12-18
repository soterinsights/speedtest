var http = require('http');
var url = require("url");
var fs = require("fs");


var opts = {
	"url": ["/","/download","/upload","/jquery.js","/speed.html","/jquery.ajax-progress.js","/ip","/conf"]
	,limits: {
		downloadStartSize: 1
		,uploadStartSize: 1
		,maxUploadSize: 20
		,downloadSizeModifier: 1.5
		,uploadSizeModifier: 1
		,maxDownloadSize: 50
		,maxUploadSize: 20
		,maxDownloadTime: 30
		,maxUploadTime: 20
		//,maxDownloadInterations: -1
		,maxUploadInterations: 5
	}
	,"port": 8080
};
var file_types = {
	js: "application/javascript"
	,html: "text/html"
}
httpd = http.createServer(function(req, res) {
	var datachunks = "";
	var uploadsize = 0;
	req.on("data", function(d) {
		switch(opts.url.indexOf(url.parse(req.url.replace("//","/")).pathname)) {
			case 2: //upload
				//datachunks += d;
				
				uploadsize += d.length;
				if(uploadsize > opts.limits.maxUploadSize * 1024*1024) {
					//console.log("upload too big: " + uploadsize);
					req.connection.destroy();
				}
				//console.log("dsize: " + uploadsize);
				break;
		}
	});
	//http://thecodinghumanist.com/blog/archives/2011/5/6/serving-static-files-from-node-js
	req.on('end', function() {
		switch(opts.url.indexOf(url.parse(req.url.replace("//","/")).pathname)) {
			/*case 0:
				res.writeHead(301, {'Location': "./speed.html"});
				res.end();
				break;*/
			case 1: //download
				var max = url.parse(req.url,true).query.size;
				//if(typeof(max) == 'undefined') { max = 1; }
				if(typeof(max) == 'undefined' || max > opts.limits.maxDownloadSize) {
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
				var max = url.parse(req.url,true).query.size;
				//console.log("upload target size: " + max);
				//console.log("upload actual size: " + uploadsize);
				//res.write("upload..prepared for X MB!\r\n");
				res.end();
				break;
			case 0:
			case 3:
			case 4:
			case 5:
				var tfile = url.parse(req.url).pathname;
				
				//fix for reverse proxy when not using / (that is http://host/somepath/speed.html)
				if(tfile.replace("//","/") == "/") {
					tfile = "/speed.html";
				}
				
				try {
				stats = fs.lstatSync("."+tfile); // throws if path doesn't exist
			  } catch (e) {
			  console.log(e);
				res.writeHead(404, {'Content-Type': 'text/plain'});
				res.write('404 Not Found\n');
				res.end("404: file not found or more likely, you're trying to go somewhere you can't.");
				return;
			  }
				var s = fs.createReadStream("." + tfile);
				res.on("end", function() { s.destroy(); });
				s.on('error', function (e) {
					console.log(req.url);
					console.log(tfile);
					console.log(e);
					res.writeHead(404, {'Content-Type': 'text/plain'});
					res.end("404: file not found or more likely, you're trying to go somewhere you cannot go.");
				});
				s.once('fd', function() {
					res.statusCode = 400;
				});
				res.writeHead(200, {
					"Content-type": (file_types[tfile.substring(tfile.lastIndexOf(".")+1)] != null)?file_types[tfile.substring(tfile.lastIndexOf(".")+1)]:"text/plain"
				});
				s.pipe(res);
				break;
			case 6:
				res.end(req.connection.remoteAddress);
				break;
			case 7:
				res.end(JSON.stringify(opts.limits));
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
