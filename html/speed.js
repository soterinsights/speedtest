
var progressWidth = 500;
var lock = false;
var test_start = null;
var test_down_results = [];
var test_up_results = [];
var current_test = null;

var test_interval = null;
var test_fail = false;
var xreq;
var ko_func = function () {
    this.ko_test_results = ko.observableArray();
}
var ko_obj = new ko_func();
    /*
    [
        {
            kind: upload || download
            ,id: 39812 
            ,items: [
                {
                    friendlySize: 1.00MB
                    ,bytes: 1048576
                    ,ms: 1000
                    ,mbps: 99.00Mbps
                }
            ]
        }
    ]
    */
function addTest(kind) {
    var t = {
        kind: kind
        ,id: Date.now()
        ,items: ko.observableArray()
    };
    ko_obj.ko_test_results.push(t);
    return t;
}

function addTestResult(kind, testid, timespan, numbytes, rec) {
    for(var i = 0; i < ko_obj.ko_test_results().length; i++) {
        if(ko_obj.ko_test_results()[i].id != testid) { continue; }
        var fb_pf = "bytes";
        if(numbytes > 1024) fb_pf = "KB";
        if(numbytes > 1048576) fb_pf = "MB";
        if(numbytes > 1073741824) fb_pf = "GB";
        
        ko_obj.ko_test_results()[i].items.unshift({
            friendlySize: ((numbytes/({"bytes": 1, KB: 1024, MB: 1048576, GB: 1073741824})[fb_pf]).toPrecision(3).toString() + fb_pf)
            ,bytes: numbytes
            ,ms: timespan
            ,mbps: (((numbytes/(timespan/1000))/1048576)*8).toPrecision(3)
        });
        
        return;
    }
    if(rec === null) {
        addTest(kind)
        addTestResult(kind,testid,timespan,numbytes, 1);
    }
}

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
            }
        }, 'json');
        $("#jswarning").toggle();
        $("#mainbod").toggle();
    } catch(e) {
        
    }
    try {
        ko.applyBindings(ko_obj)
    } catch(e){
        console.log(e);
    }
});
function clearresults() {
    $("#result").html("");
}
function stoptests() {
    try {
        xreq.abort();
    } catch(e) {}
}
function rundowntests(target_size, last_test, runupload) {
    
    runupload = runupload || false;
    if(test_down_results != null && test_down_results.length > 0) {
        var slowest, fastest, average = null;
        for(var i = 0; i < test_down_results.length; i++) {
            slowest = (slowest == null || test_down_results[i].MBps < slowest.MBps) ? test_down_results[i] : slowest;
            fastest = (fastest == null || test_down_results[i].MBps > fastest.MBps) ? test_down_results[i] : fastest;
            average += test_down_results[i].MBps;
        }
        $("#stat_download_slowest span").text((slowest.MBps*8).toFixed(2) + "Mbps ("+(slowest.TargetSize/1024/1024).toFixed(2)+"MB)");
        $("#stat_download_fastest span").text((fastest.MBps*8).toFixed(2) + "Mbps ("+(fastest.TargetSize/1024/1024).toFixed(2)+"MB)")
        $("#stat_download_average span").text(((average/test_down_results.length)*8).toFixed(2) + "Mbps");
        $("#uploadStartSize").val(Math.round((fastest.TargetSize/8> $("#maxUploadSize").val())? $("#maxUploadSize").val():fastest.TargetSize/8));
    }
    
    if(test_fail == true || target_size > $("#maxDownloadSize").val() || (last_test != null && last_test.Diff > $("#maxDownloadTime").val()* 1000)) {
        
        //end of all things;
        var ttime = ((new Date()).getTime() -test_start.getTime());
        //$("#current").html("");
        //$("#result").append("<p>Finished download tests in "+ ttime/1000 + "s</p>");
        
        test_start = null;
        current_test = null;
        test_down_results = [];
        test_fail = false;
        if(runupload) {
            runuptests($('#uploadStartSize').val(), null);
        }
        return;
    }
    
    
    if(test_start == null) {
        test_start = new Date();
        current_test = addTest('download');
    }
    
    //$("#current").html("Running "+(target_size/1024/1024).toFixed(2) +"MB download test <span id=\"currentper\"></span>");
    //$("#current").append("<div style='border-left: 0px green; border-right: "+progressWidth+"px transparent; width:0px; height:15px;'></div>");
    var r = {}; //results
    var start = new Date();
    xreq = $.ajax('./download?size=' + target_size, {
        progress: function(e) {
            var curspeed =  (e.loaded/(((new Date()).getTime() - start.getTime())))/1000
            r.ActualSize = e.total;
            r.Loaded = e.loaded;
            //$("#currentper").html(Math.ceil((e.loaded/e.total)*100).toString() + "% @ "+Math.round(curspeed*8*100)/100+"Mbps ("+Math.round(e.loaded/1024)+"/"+e.total/1024+"KB)");
            //$("#current div:first").css('border-left', Math.ceil((e.loaded/e.total)*100*(progressWidth/100)).toString() +"px solid green");
            //$("#current div:first").css('border-right', (progressWidth-Math.ceil((e.loaded/e.total)*100*(progressWidth/100))).toString() +"px solid red");
            
        }
    }).error(function(e) {
        console.log(e);
        test_fail = true;
    }).done(function() {
        var end = new Date();
        
        r.Start = start;
        r.End = end;
        r.Diff = end.getTime() - start.getTime();
        var MBps = ((target_size)/(r.Diff/1000));
        r.MBps = MBps/1024/1024;
        r.TargetSize = target_size;
        test_down_results.push(r);
        
        //$('#result').append("<p>"+(target_size/1024/1024).toFixed(2) +"MB in "+r.Diff+"s @ "+(r.MBps*8).toFixed(2)+"Mbps ("+r.MBps.toFixed(2)+"MBps)</p>");
        
        addTestResult('download', current_test.id, r.Diff, target_size);
        
        setTimeout(rundowntests.bind({}, Math.ceil(target_size*$('#downloadSizeModifier').val()), r, runupload), $("#restInterval").val());
    }).always(function() {
        clearInterval(test_interval);
        test_interval = null;
    });
}
var upload_data = [];
var createdataInterval = null;
function runuptests(target_size, last_test) {
    //var d = [];
    
    if(test_start == null) {
        test_start = new Date();
    }
    
    if(test_fail == true || test_up_results.length >= parseInt($("#maxUploadInterations").val()) || target_size > parseInt($("#maxUploadSize").val()) || (last_test != null && last_test.Diff != null && last_test.Diff > parseInt($("#maxUploadTime").val())*1000)) {
        var ttime = ((new Date()).getTime() -test_start.getTime());
        //("#current").html("");
        //$("#result").append("<p>Finished upload tests in "+ ttime/1000 + "s</p>");
        test_up_results = [];
        test_fail = false;
        return;
    }
    
    if(test_up_results.length > 0) {
        var slowest, fastest, average = null;
        
        for(var i = 0; i < test_up_results.length; i++) {
            slowest = (slowest == null || test_up_results[i].MBps < slowest.MBps) ? test_up_results[i] : slowest;
            fastest = (fastest == null || test_up_results[i].MBps > fastest.MBps) ? test_up_results[i] : fastest;
            average += test_up_results[i].MBps;
        }
        
        //$("#stat_upload_slowest span").text(Math.round(slowest.MBps*8*100)/100 + "Mbps ("+slowest.TargetSize/1024/1024+"MB)");
        //$("#stat_upload_fastest span").text(Math.round(fastest.MBps*8*100)/100 + "Mbps ("+fastest.TargetSize/1024/1024+"MB)")
        //$("#stat_upload_average span").text(Math.round((average/test_up_results.length)*8*100)/100 + "Mbps");
    }
    
    if(upload_data.length > target_size) {
        upload_data = upload_data.slice(0, target_size);
    }
    for(var i = 0; upload_data.length < target_size; i++) {
        upload_data.push(0);
    }
    if(createdataInterval == null) {
         createdataInterval = setInterval(function() {
            if(upload_data.length >= target_size) {
                clearInterval(createdataInterval);
                createdataInterval = null;
                
                //$("#current").html("Running "+(target_size/1024/1024).toFixed(2) +"MB upload test <span id=\"currentper\"></span>");
                //$("#current").append("<div style='border-left: 0px green; border-right: "+progressWidth+"px transparent; width:0px; height:15px;'></div>");
                var r = {};
                var start = new Date();
                xreq = $.ajax('./upload?size=' + target_size, {
                    type: "post"
                    ,processData: false
                    ,contentType: "image/png"
                    ,headers: {}
                    ,progress: function(e) {
                        var curspeed =  (e.loaded/(((new Date()).getTime() - start.getTime())))/1000
                        r.ActualSize = e.total;
                        r.Loaded = e.loaded;
                        //$("#currentper").html(Math.ceil((e.loaded/e.total)*100).toString() + "% @ "+Math.round(curspeed*8*100)/100+"Mbps ("+Math.round(e.loaded/1024)+"/"+e.total/1024+"KB)");
                        //$("#current div:first").css('border-left', Math.ceil((e.loaded/e.total)*100*(progressWidth/100)).toString() +"px solid green");
                        //$("#current div:first").css('border-right', (progressWidth-Math.ceil((e.loaded/e.total)*100*(progressWidth/100))).toString() +"px solid red");
                    }
                    ,data: upload_data.join("")
                }).error(function() {
                    test_fail = true;
                }).done(function() {
                    var end = new Date();
                    r.Start = start;
                    r.End = end;
                    r.Diff = end.getTime() - start.getTime();
                    var MBps = ((target_size)/(r.Diff))/1000;
                    r.MBps = MBps;
                    r.TargetSize = target_size;
                    test_up_results.push(r);
                    //$('#result').append("<p>"+(target_size/1024/1024).toFixed(2) +"MB in "+(r.Diff).toFixed(2)+"s @ "+(MBps*8).toFixed(2)+"Mbps ("+MBps.toString().substring(0,5)+"MBps)</p>");
                }).always(function() {
                    //runuptests(Math.round(target_size*$("#uploadSizeModifier").val()), r);
                    setTimeout(runuptests.bind({}, Math.ceil(target_size*$('#uploadSizeModifier').val()), r), $("#restInterval").val());
                });
            }
        }, 10);
    }
}

function togglesettings() {
    $("#config").toggle(500);
}

function expandshortcodes(str) {
    //replace M K, etc with appropriate bytes
    //mega
    var res = 0;
    try {
        var meg = str.match(/([0-9\.]+)m/i);
        res += parseFloat(meg[1])*1024*1024;
    } catch(e){}
    
    //kilo
    try {
        var meg = str.match(/([0-9\.]+)k/i);
        res += parseFloat(meg[1])*1024;
    } catch(e){}
    
    //byte
    try {
        var meg = str.match(/([0-9\.]+)b/i);
        res += parseFloat(meg[1]);
    } catch(e){}
    try {
        var meg = str.match(/([0-9\.]+)$/i);
        res += parseFloat(meg[1]);
    } catch(e){}
    return res;
}