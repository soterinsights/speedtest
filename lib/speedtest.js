var http = require('http');
var url = require("url");
var fs = require("fs");
//var _config = require("../bin/config.json");


var st = function(conf) {
  var self = this;
  this.conf = conf;
  this.opts = {
    "url": ["/","/download","/upload","/jquery.js","/speed.html","/jquery.ajax-progress.js","/ip","/conf","/speed.js"]
    ,"limits": this.conf.limits
    ,"port": this.conf.port || 8080
    ,"ip": this.conf.ip || "0.0.0.0"
  };
  this.file_types = {
    js: "application/javascript"
    ,html: "text/html"
  }
  this.httpd = http.createServer(function(req, res) {
    req.resume();
    var datachunks = "";
    var uploadsize = 0;
    var act;
    try {
      act = url.parse(req.url.replace("//","/")).pathname.match(/\/([^\/]+)(\/|)/i)[1].toLowerCase();
    } catch(e) {
      act = "speed.html";
    }
    
    if(act == 'upload') {
      req.on("data", function(d) {
        uploadsize += d.length;
        if(uploadsize > self.opts.limits.maxUploadSize) {
          //Kill it! Kill it with fire!
          req.connection.destroy();
        }
      });
      return;
    }
    
    //http://thecodinghumanist.com/blog/archives/2011/5/6/serving-static-files-from-node-js
    req.on('end', function() {
      if(act == 'download') { // Download generator
        var max = parseInt(url.parse(req.url,true).query.size);
        if(typeof(max) == 'undefined' || max > self.opts.limits.maxDownloadSize || max % 1 != 0) {
          res.writeHead(500);
          res.end("The number "+ (typeof(max) == 'undefined' || max > self.opts.limits.maxDownloadSize || max % 1 != 0) +", it's too big or NaN!");
          return;
        }
        res.writeHead(200, {'Content-length': max});
        var b = new Buffer(1024);
        b.fill(0x1337);
        for(var i = 0; i < max; i += 1024) {
          res.write((max - i >= 1024)?b:b.slice(0,max%1024));
        }
        res.end();
      } else if(act == 'conf') { //configurations
        res.writeHead(200,{
          "Content-Type": "application/json"
        });
        res.end(JSON.stringify(self.opts.limits));
      } else if(act == 'ip') { // IP addresses
        var vips = {
          ip: req.connection.remoteAddress
        };
        self.conf.ipheaders.forEach(function(v) {
          if(req.headers[v]) vips[v] = req.headers[v];
        });
        res.writeHead(200,{
          "Content-Type": "application/json"
        });
        res.end(JSON.stringify(vips));
      } else { // All valid docs in /html
        console.log("action: %s", act);
        try {
          stats = fs.lstatSync("./html/"+act); // throws if path doesn't exist
          var s = fs.createReadStream("./html/" + act);
          res.on("end", function() { s.destroy(); });
          s.on('error', function (e) {
            res.writeHead(404, {'Content-Type': 'text/plain'});
            res.end("404: file not found or more likely, you're trying to go somewhere you cannot go.");
          });
          s.once('fd', function() {
            res.statusCode = 400;
          });
          res.writeHead(200, {
            "Content-type": self.file_types[act.substring(act.lastIndexOf(".")+1)] || "text/plain"
          });
          s.pipe(res);
        } catch (e) {
          console.log(e);
          res.writeHead(404, {'Content-Type': 'text/plain'});
          res.end("404b: file not found or more likely, you're trying to go somewhere you can't.");
          return;
        }
      }
      
      return;
      //end new code;
    });
  });
};
st.prototype.start = function() {
  this.httpd.listen(this.opts.port, this.opts.ip);
}
st.prototype.stop = function() {
  this.httpd.close();
};

module.exports = st;