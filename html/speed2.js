$(document).ready(function() {
  $("#jswarning").toggle();
  $("#mainbod").toggle();
  
  datab = new (function() {
    this.ipaddresses = ko.observable()
    //,confops: ko.observableArray();
    this.runningtest = ko.observableArray();
    this.rantests = ko.observableArray()
  })();
  
    ko.applyBindings(datab);
  /*setInterval(function() {
  }, 1000);*/
  
  $.get("./ip", function(res) {
    //$("#remoteip").text(res)
    var l = [];
    for(var i in res) {
      l.push(res[i]);
    }
    datab.ipaddresses(l.join(','));
  });
  $.get("./conf", null, function(conf) {
    for(var prop in conf) {
      var pi = $(document.createElement('div'));
      var ni = $(document.createElement('input')).attr('type', 'text').attr('id', prop).attr('value', conf[prop]);
      var li = $(document.createElement('label')).text(prop).attr("for", prop);
      ni.blur(function(ob) {
          $(ob.target).val(expandshortcodes($(ob.target).val()));
      });

      pi.append(li);
      pi.append(ni);
      $("#config").append(pi);
    }
  }, 'json');
  
  $('#newDownTest').click(function() {
    console.log("testing if we should star ta test");
    if(datab.rantests().length == 0 || !datab.rantests()[0]()._download.running) {
      console.log("creating a new test set");
      
      var ntest = new tests("tst" + Date.now())
      var nko = ko.observable(ntest);
      datab.rantests.unshift(nko);
      ntest.setKO(nko).testDone(function(err, t){
        //running test
        nko.valueHasMutated();
      }).complete(function(err, t) {
        console.log("test " + ntest + " complete");
        nko.valueHasMutated();
      }).down();
    }
    
  })
  
  var testResult = function(id, totalBytes) {
    var self = this;
    this.id = id;
    this.direction = "";
    this.bytes = totalBytes;
    this.bytesloaded = 0;
    Object.defineProperty(self, "_p", {enumerable:false, writable:true});
    self._p = { start: 0, end: 0 };
    self.__defineSetter__("start", function(val) {
      if((/^[0-9]+$/).test(val)) {
        self._p.start = val;
      } else {
        self._p.start = Date.parse(val);
      }
    });
    self.__defineGetter__("start", function() {
      return self._p.start;
    });
    self.__defineSetter__("end", function(val) {
      if((/^[0-9]+$/).test(val)) {
        self._p.end = val;
      } else {
        self._p.end = Date.parse(val);
      }
    });
    self.__defineGetter__("end", function() {
      return self._p.end;
    });
    
    self.__defineGetter__("time", (function() {
      if(this.end == 0) return 0;
      return this.end - this.start;
    }).bind(self));
    self.__defineGetter__("progress", (function() {
      try {
        return parseInt((this.bytesloaded/this.bytes)*10000)/100;
      } catch(e) {}
      return 0;
    }).bind(self));
    self.__defineGetter__("human", (function() {
      if(this.bytes == 0) return "0 bytes";
      if(this.bytes > 1073741824) return (parseInt((this.bytes/1073741824)*100)/100).toString() + "GB"; //GB
      if(this.bytes > 1048576) return (parseInt((this.bytes/1048576)*100)/100).toString() + "MB"; //MB
      if(this.bytes > 1024) return (parseInt((this.bytes/1024)*100)/100).toString() + "KB"; //KB
      return this.bytes.toString() + " bytes";
    }).bind(self));
  };
  var tests = function(id) {
    var self = this;
    this.id = id;
    this._download = {
      sizes: []
      ,results: [] //ko.observableArray() //ko.observable();???
      ,current: -1
      ,running: false
      ,complete: false
      ,speedpoints: []
    };
    
    //console.log("setting up sizes to test");
    for(var i = parseInt($('#downloadStartSize').val()); i < parseInt($('#maxDownloadSize').val()) || self._download.sizes > 15; i *= parseFloat($('#downloadSizeModifier').val())) {
      //console.log("adding %s bytes to try", i);
      self._download.sizes.push(i);
    }
  };
  tests.prototype.toString = function() { return this.id + ':' + Date.now(); }
  tests.prototype.setKO = function(v) {
    this._ko = v;
    return this;
  }
  tests.prototype.testDone = function(callback) {
    this._testDone = callback;
    return this;
  };
  tests.prototype.complete = function(callback) {
    this._complete = callback;
    return this;
  };
  tests.prototype.down = function() {
    var self = this;
    if(self._download.current == -1) {
      self._download.current = 0;
      self._download.running = true;
    }
    var ind = self._download.current;
    if(typeof self._download.results[ind] == 'undefined') self._download.results.push(new testResult(self._download.sizes[ind], self._download.sizes[ind]));
    
    var thisrun = self._download.results[ind];
    thisrun.start = Date.now();
    $.ajax('./download?size=' + thisrun.bytes, {
      progress: function(e) {
        var curspeed =  (e.loaded/((Date.now() - thisrun.start)))/1000
        self._download.speedpoints.push(curspeed);
        thisrun.bytesloaded = e.loaded;
        if(self._ko) self._ko.valueHasMutated();
      }
    }).error(function(e) {
        self._download.running = false;
    }).done(function() {
      if(self._testDone) self._testDone(null, thisrun);
      thisrun.end = Date.now();
      if(thisrun.time < parseInt($('#maxDownloadTime').val())*1000 && self._download.running && self._download.current+1 < self._download.sizes.length) {
        self._download.current++;
        setTimeout(self.down.bind(self), 50);
      } else {
        self._download.complete = true;
        self._download.running = false;
        if(self._complete) self._complete(null, self);
      }
    });
    return this;
  };
});