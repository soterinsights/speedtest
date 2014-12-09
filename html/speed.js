var node = new function() {};
node.inherits = function(ctor, superCtor) {
  ctor.super_ = superCtor;
  ctor.prototype = Object.create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
};
node.EventEmitter = function() {this._eventemitter = {}};
node.EventEmitter.prototype.on = function(eventname, callback, _type) {
  if(typeof this._eventemitter == 'undefined') this._eventemitter = {};
  _type = _type || 'on';
  if(typeof this._eventemitter[eventname] === 'undefined') this._eventemitter[eventname] = {};

  this._eventemitter[eventname][callback.toString()] = {callback: callback, type: _type};
  return this;
};

node.EventEmitter.prototype.once = function(eventname, callback) {
  return this.on(eventname, callback, 'once');
};

node.EventEmitter.prototype.emit = function(eventname) {
  if(typeof this._eventemitter == 'undefined') this._eventemitter = {};
  var self = this;
  var _args = [];
  for(var i = 1; i < arguments.length; i++) {
    _args.push(arguments[i]);
  }
  if(typeof this._eventemitter[eventname] == 'undefined') return this;
  var keys = Object.keys(this._eventemitter[eventname]);

  keys.filter(function(v) {
      return self._eventemitter[eventname][v].rm != true;
    })
    .forEach(function(v) {
      var o = self._eventemitter[eventname][v];
      if(o.type === 'once') v.rm = true;

      o.callback.apply(self, _args);
    });
  keys.forEach(function(v) {
    var o = self._eventemitter[eventname][v];
    if(o.type == 'once' && o.rm == true)
      delete self._eventemitter[eventname][v];
  });
  return this;
};

var testresult = function(_id, _direction) {
  this.id = _id || Date.now();
  this.direction = _direction || 'up'
  this.dp = [];
  this.last = null;
  this.first = null;
  this.complete = false;
}
testresult.prototype.adddp = function(_dp) {
  var dp = JSON.parse(JSON.stringify(_dp));
  dp._dpadded = Date.now();
  this.dp.push(dp);
  this.last = dp;

  if(this.first == null)
    this.first = dp;
}

var createresultcollection = function(results) {
  //opts.instanceResults from completed test instance.
  
  var ro = {
    up: {
        results: []
        ,first: null
        ,last: null
        ,stats: {
          slow: null
          ,average: null
          ,mean: null
          ,fast: null
        }
        ,runningTime: 0
      }
    ,down: {
        results: []
        ,first: null
        ,last: null
        ,stats: {
          slow: null
          ,average: null
          ,mean: null
          ,fast: null
        }
        ,runningTime: 0
      }
    ,complete: true
    ,runningTime: 0
    ,startTime: 0
  };
  //opts.instanceResults;
  var directions = {};
  var k = Object.keys(results).filter(function(v) { return /[0-9]+:[0-9]+/.test(v); });
  k.forEach(function(v) {
    var vo = results[v];
    var d = vo.direction;
    directions[d] = 1;
    if(!ro[d].first) ro[d].first = results[v];
    if(!ro[d].last) ro[d].last = results[v];
    if(!ro[d].stats.slow) ro[d].stats.slow = results[v];
    //if(!ro.stats.average) ro.stats.average = results[v];
    if(!ro[d].stats.mean) ro[d].stats.mean = results[v];
    if(!ro[d].stats.fast) ro[d].stats.fast = results[v];
    
    if(!ro.startTime) ro.startTime = vo.first.startTime;
    if(!ro.endTime) ro.endTime = vo.last.endTime;

    if(results[v].first.endTime < ro[d].first.first.endTime) ro[d].first = results[v];
    if(results[v].last.endTime < ro[d].last.last.endTime) ro[d].last = results[v];

    if(ro[d].stats.slow.last.speed.Bps > results[v].last.speed.Bps) ro[d].stats.slow = results[v];
    if(ro[d].stats.fast.last.speed.Bps < results[v].last.speed.Bps) ro[d].stats.fast = results[v];

    if(ro.startTime > vo.first.startTime) ro.startTime = vo.first.startTime;
    if(ro.endTime > vo.last.endTime) ro.startTime = vo.last.endTime;

    ro[d].runningTime += vo.last.runningTime;
    ro[d].results.push(vo);
  });

  Object.keys(directions).forEach(function(d) {
    var speedsort = k.map(function(v) { return results[v].id; });
    
    speedsort.sort(function(a,b) {
      return results[a].last.speed.Bps - results[b].last.speed.Bps;
    });

    //ro[d].stats.mean = ro[d].results[Math.floor(speedsort.length/2)];

    ro[d].runningTime = ro[d].last.last.endTime - ro[d].first.first.startTime;

    ro.runningTime += ro[d].runningTime;
  });
  

  return ro;
};

var speedtest = (function() {
  var st = function() {
    this.test = {};
  };
  var state = {
    allresults: ko.observableArray()
    ,currenttest: ko.observable()
    ,conf: {
      builtin: true
    }
    ,upload_data: []
    ,createdataInterval: null
  };

  state.currenttest.extend({ notify: 'always'});

  node.inherits(st, node.EventEmitter);
  st.prototype.downtests = function(start, _id, _opts, oncomplete) {
    
    var self = this;

    var opts = {};
    if(_opts && typeof _opts == 'function') oncomplete = _opts;
    if(_opts && typeof _opts == 'object') opts = _opts;

    opts.upload = opts.upload || false;
    opts.restInterval =  opts.restInterval || $("#restInterval").val();
    opts.events = ((opts.events && opts.events.emit) ? opts.events : null) || (function() {
      var tmp = function() {};
      node.inherits(tmp, node.EventEmitter);
      return new tmp();
    })();
    var _startTime = Date.now();

    if(start > state.conf.maxDownloadSize()) {
      if(typeof oncomplete == 'function') self.once(oncomplete);
      if(!opts.upload) { 
        var ro = createresultcollection(opts.instanceResults);
        self.emit('complete', ro);
        state.allresults.unshift(ro);
      }
      else self.uptests(opts.upload, _id, opts, oncomplete);

      return;
    }

    var tro = new testresult([_id, Date.now(), start].join(':'), 'down');
    opts.instanceResults = opts.instanceResults || {};
    opts.instanceResults[tro.id] = tro;

    var testconn = $.ajax({
      url: './download?size=' + start
      ,progress: function(e) {
        var p = ((e.loaded/e.total) * 100).toFixed(2);
        var addi = {
          percent: p
          ,i: e.loaded
          ,size: e.total || start
          ,startTime: _startTime
          ,endTime: Date.now()
          ,speed: {}
        };
        addi.runningTime = addi.endTime - addi.startTime;

        addi.speed.Bps = (addi.i/(addi.runningTime/1000));
        addi.speed.KBps = (addi.speed.Bps/1024).toFixed(2);
        addi.speed.MBps = (addi.speed.Bps/1024/1024).toFixed(2);

        addi.speed.bps = addi.speed.Bps*8;
        addi.speed.Kbps = (addi.speed.bps/1024).toFixed(2);
        addi.speed.Mbps = (addi.speed.bps/1024/1024).toFixed(2);
        addi.speed.bitrate = (function () {
          if(addi.speed.Bps < 1024) return addi.speed.Kbps + "b";
          if(addi.speed.Bps >= 1024 && addi.speed.Bps < 1048576) return addi.speed.Kbps + "Kb";
          if(addi.speed.Bps >= 1048576 && addi.speed.Bps < 1073741824) return addi.speed.Mbps + "Mb";
        })();
        addi.speed.byterate = addi.speed.bitrate.toUpperCase();

        addi.friendlySize = (function () {
          if(addi.size < 1024) return addi.size + "b";
          if(addi.size >= 1024 && addi.size < 1048576) return (addi.size/1024) + "KB";
          if(addi.size >= 1048576 && addi.size < 1073741824) return (addi.size/1048576) + "MB";
        })();

        tro.adddp(addi);
        opts.events.emit('progress', p, addi, tro);
      }
    }); // end init ajax

    testconn.error(function() {
      tro.error = "An error occured";
      self.emit('error', tro);
      opts.events.emit('error', tro);
    })
    testconn.done(function() {
      tro.complete = true;
    });
    
    testconn.always(function() {
      self.emit('testcomplete', tro.error, tro);
      opts.events.emit('testcomplete', tro.error, tro);
      var newstart = start * state.conf.downloadSizeModifier();
      setTimeout(self.downtests.bind(self, newstart, _id, opts, oncomplete), opts.restInterval);
    });
  };

  st.prototype.uptests = function(start, _id, _opts, oncomplete) {
    var self = this;

    var opts = {};
    if(_opts && typeof _opts == 'function') oncomplete = _opts;
    else if(_opts && typeof _opts == 'object') opts = _opts;

    opts.restInterval =  opts.restInterval || state.conf.restInterval(); //$("#restInterval").val();
    opts.maxUploadIterations = opts.maxUploadIterations || state.conf.maxUploadIterations();
    opts.uploadIterations = opts.uploadIterations || 0;
    opts.events = ((opts.events && opts.events.emit) ? opts.events : null) || (function() {
      var tmp = function() {};
      node.inherits(tmp, node.EventEmitter);
      return new tmp();
    })();

    var _startTime = Date.now();

    if(start > state.conf.maxUploadSize() || opts.uploadIterations >= opts.maxUploadIterations) {
      var ro = createresultcollection(opts.instanceResults);

      if(typeof oncomplete == 'function') self.once(oncomplete);
      
      self.emit('complete', ro);
      state.allresults.unshift(ro);
      return;
    }

    var tro = new testresult([_id, Date.now(), start].join(':'), 'up');
    opts.instanceResults = opts.instanceResults || {};
    opts.instanceResults[tro.id] = tro;
    
    //size the upload data correctly.
    if(state.upload_data.length > start) {
        state.upload_data = state.upload_data.slice(0, start);
    }
    for(var i = 0; state.upload_data.length < start; i++) {
        state.upload_data.push(0);
    }

    var testconn = $.ajax('./upload?size=' + start, {
        type: "post"
        ,processData: false
        ,contentType: "image/png"
        ,headers: {}
        ,progress: function(e) {
          var p = ((e.loaded/e.total) * 100).toFixed(2);
          var addi = {
            percent: p
            ,i: e.loaded
            ,size: e.total || start
            ,startTime: _startTime
            ,endTime: Date.now()
            ,speed: {}
          };
          addi.runningTime = addi.endTime - addi.startTime;

          addi.speed.Bps = (addi.i/(addi.runningTime/1000));
          addi.speed.KBps = (addi.speed.Bps/1024).toFixed(2);
          addi.speed.MBps = (addi.speed.Bps/1024/1024).toFixed(2);

          addi.speed.bps = addi.speed.Bps*8;
          addi.speed.Kbps = (addi.speed.bps/1024).toFixed(2);
          addi.speed.Mbps = (addi.speed.bps/1024/1024).toFixed(2);
          addi.speed.bitrate = (function () {
            if(addi.speed.Bps < 1024) return addi.speed.Kbps + "b";
            if(addi.speed.Bps >= 1024 && addi.speed.Bps < 1048576) return addi.speed.Kbps + "Kb";
            if(addi.speed.Bps >= 1048576 && addi.speed.Bps < 1073741824) return addi.speed.Mbps + "Mb";
          })();
          addi.speed.byterate = addi.speed.bitrate.toUpperCase();

          addi.friendlySize = (function () {
            if(addi.size < 1024) return addi.size + "b";
            if(addi.size >= 1024 && addi.size < 1048576) return (addi.size/1024) + "KB";
            if(addi.size >= 1048576 && addi.size < 1073741824) return (addi.size/1048576) + "MB";
          })();

          tro.adddp(addi);
          opts.events.emit('progress', p, addi, tro);
        }
        ,data: state.upload_data.join("")
    }).error(function() {
      tro.error = "An error occured";
      self.emit('error', tro);
      opts.events.emit('error', tro);
    }).done(function() {
      tro.complete = true;
      self.emit('testcomplete', tro.error, tro);
      opts.events.emit('testcomplete', tro.error, tro);
      var newstart = start * state.conf.uploadSizeModifier();
      opts.uploadIterations++;
      setTimeout(self.uptests.bind(self, newstart, _id, opts, oncomplete), opts.restInterval);
    }).always(function() {
    });
  }; //end uptest

  var sti = new st();
  state.st = sti;
  ko.applyBindings(state);
  return state;
})();

$(document).ready(function() {
    try {
        $.get("./ip", function(res) {
            $("#remoteip").text(res)
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
                speedtest.conf[prop] = ko.observable(conf[prop]);
            }
            setTimeout(function() {
              //$('button')[1].click();
            }, 500);
        }, 'json');
    } catch(e) {
        
    }
});