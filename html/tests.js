var testInstance = function() {
    
}

testInstance.prototype.run = function(kind, bsize, opts) {
    var o = ({
        download: {
            url: "./download?size={bsize}"
            ,opts: {
                
            }
        }
        ,upload: {
            url: "./upload?size={bsize}"
            ,opts: {
                type: "post"
                ,processData: false
                ,contentType: "image/png"
                ,headers: {}
            }
        }
    })[kind];
    
    o.opts.progress = function(e) {
        //var curspeed =  (e.loaded/(((new Date()).getTime() - start.getTime())))/1000
        //r.ActualSize = e.total;
        //r.Loaded = e.loaded;
    }
    
    $.ajax(u, o.opts)
}

testInstance.prototype.gauntlet = function(kind, start, end, opts) {
    var vopts = {
        mod: opts.mod || 2
        ,timeout: opts.timeout || 60
        
    }
}