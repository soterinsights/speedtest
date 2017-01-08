var http = require('http');
var url = require("url");
var fs = require("fs");
var _config = require("./config.json");

var opts = {
    url: [],
    "limits": _config.limits,
    "port": _config.port || 8080,
    "ip": _config.ip || "0.0.0.0"
};

//'/download', '/upload', '/ip', '/conf'
opts.url.push({target: '/download', cb: function(req, res) {
    var max = parseInt(url.parse(req.url,true).query.size);
    if(typeof(max) == 'undefined' || max > opts.limits.maxDownloadSize || max % 1 != 0) {
        res.writeHead(500);
        res.end("The number "+ (typeof(max) == 'undefined' || max > opts.limits.maxDownloadSize || max % 1 != 0) +", it's too big or NaN!");
        return;
    }

    res.writeHead(200, {'Content-length': max});
    var b = new Buffer(1024);
    b.fill(0x0);
    for(var i = 0; i < max; i += 1024) {
        res.write((max - i >= 1024)?b:b.slice(0,max%1024));
    }
    res.end();
}});

opts.url.push({target: '/upload', cb: function(req, res) {
    res.end();
}});

opts.url.push({target: '/ip', cb: function(req, res) {
    var ip_headers = ['x-real-ip', 'x-forwarded-for', 'HTTP_X_FORWARDED_FOR'];
    var res_ips = {remote_ip: req.connection.remoteAddress};
    for(var i in ip_headers) {
        if(req.headers[ip_headers[i]]) res_ips[ip_headers[i]] = req.headers[ip_headers[i]];
    }
    res.end(JSON.stringify(res_ips));
}});

opts.url.push({target: '/conf', cb: function(req, res) {
    res.writeHead(200,{
        "Content-Type": "application/json"
    });
    res.end(JSON.stringify(opts.limits));
}});

opts.url.push({target: /^.*/g, cb: function(req, res) {
    var tfile = url.parse(req.url).pathname.replace(/\/\.\.\//g, "/./");
    //todo fix for reverse proxy when not using / (that is http://host/somepath/speed.html)
    if(tfile.replace("//","/") == "/") {
        tfile = "/speed.html";
    }
    try {
        var stats = fs.lstatSync("./html" + tfile); // throws if path doesn't exist
    } catch (e) {
        console.log(e);
        res.writeHead(404, {'Content-Type': 'text/plain'});
        res.end("404: file not found or more likely, you're trying to go somewhere you can't.");
        return;
    }

    var s = fs.createReadStream("./html" + tfile);
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
        "Content-type": file_types[tfile.substring(tfile.lastIndexOf(".")+1)] || "text/plain"
    });
    s.pipe(res);
}});

var file_types = {
    js: "application/javascript",
    html: "text/html"
};

var httpd = http.createServer(function(req, res) {
    
    //force close of long lasting requests. Hax?
    var reqtimeout = setTimeout((function(){
        this.res.end();
    }).bind({res: res}), _config.ultimateTimeout);
    
    var uploadsize = 0;
    req.body = new Buffer(0);
    req.on("data", function(d) {
        uploadsize += d.length;
        if(uploadsize > opts.limits.maxUploadSize) {
            //Kill it! Kill it with fire!
            req.connection.destroy();
        }
        req.body = Buffer.concat([req.body, d], (req.body.length + d.length));
    });
    
    var route = null;
    var urlpath = url.parse(req.url.replace("//","/")).pathname;
    opts.url.forEach(function(cv) {
        if(route)
            return;
        else if(typeof cv.target == 'string' && cv.target == urlpath)
            route = cv;
        else if(cv.target instanceof RegExp && cv.target.test(urlpath))
            route = cv;
    });
    if(route == null) {
        route = opts.url[opts.url.length-1];
    }
    req.on('end', function() {
        clearTimeout(reqtimeout);
        route.cb.call(this, req, res);
    });
    if(req.resume) req.resume();
});
httpd.listen(opts.port, opts.ip);
